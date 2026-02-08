"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { DetectionResult } from "@/lib/detection-types";
import {
  computeInstantFocusScore,
  extractFocusInput,
  DEFAULT_FOCUS_CONFIG,
  type FocusConfig,
} from "@/lib/focus-algorithm";

/** Maximum history entries (~60 seconds at 5 Hz detection rate) */
const MAX_HISTORY_LENGTH = 300;

/** Average instant score below this threshold = distracted */
const DISTRACTED_THRESHOLD = 65;

/** Must be distracted this many consecutive evaluations before score drops */
const SUSTAINED_SECONDS_REQUIRED = 3;

/** Evaluate distraction every 1 second (not every 3 seconds) */
const EVAL_INTERVAL_MS = 1000;

/**
 * React hook that consumes DetectionResult frames and produces a
 * monotonically-decreasing focus score (0-100) with rolling history for
 * sparkline visualization.
 *
 * Pipeline per frame:
 *   DetectionResult -> extractFocusInput -> computeInstantFocusScore
 *                   -> rolling average -> sustained distraction check
 *                   -> monotonic decrease only
 *
 * Score only decreases after 3+ consecutive seconds of sustained
 * below-threshold readings. Score NEVER increases once it drops.
 *
 * EMA state and displayed score are stored in refs to avoid unnecessary
 * re-renders. The config is updatable at runtime for sensitivity tuning.
 */
export function useFocusScore(
  result: DetectionResult | null,
  configOverrides?: Partial<FocusConfig>
): {
  score: number;
  instantScore: number; // Real-time instant score for visual feedback
  alignmentScore: number; // Real-time alignment score for mesh colors
  history: { time: number; score: number }[];
  config: FocusConfig;
  updateConfig: (partial: Partial<FocusConfig>) => void;
  isCalibrated: boolean;
  calibrationProgress: number; // 0-100
  reset: () => void;
} {
  const [score, setScore] = useState(100); // Start at 100
  const [instantScore, setInstantScore] = useState(100); // Real-time instant score
  const [alignmentScore, setAlignmentScore] = useState(100); // Real-time alignment score
  const [history, setHistory] = useState<{ time: number; score: number }[]>([]);
  const [config, setConfig] = useState<FocusConfig>({
    ...DEFAULT_FOCUS_CONFIG,
    ...configOverrides,
  });
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  // For smooth progress bar animation
  const targetProgressRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Use refs for score state and timer to avoid re-render cycles
  const currentScoreRef = useRef(100); // Current score (start at 100)
  const lastEvalTimeRef = useRef(Date.now()); // Last evaluation timestamp
  const recentInstantScoresRef = useRef<number[]>([]); // Track recent instant scores for averaging
  const consecutiveDistractedRef = useRef(0); // Count of consecutive distracted evaluations

  // Calibration frame counter (for progress tracking)
  const calibrationFrameCountRef = useRef(0);

  // Process each new detection result through the NEW 3-second timer scoring pipeline
  useEffect(() => {
    if (!result) return;

    // 1. Extract normalized input from raw detection
    const input = extractFocusInput(result);

    // 2. Update calibration progress (simple frame counter for now)
    calibrationFrameCountRef.current++;
    const newTargetProgress = Math.min(100, (calibrationFrameCountRef.current / 50) * 100);
    const oldTarget = targetProgressRef.current;
    targetProgressRef.current = newTargetProgress;

    // Debug log when target changes
    if (oldTarget !== newTargetProgress) {
      console.log(`[Calibration] Frame ${calibrationFrameCountRef.current}/50, Target: ${newTargetProgress.toFixed(1)}%, Face: ${input.faceDetected}`);
    }

    if (!isCalibrated && calibrationFrameCountRef.current >= 50) {
      setIsCalibrated(true);
      console.log('[useFocusScore] Calibration complete! Progress: 100%');
    }

    // 3. Compute raw instant score (0-100)
    const instant = computeInstantFocusScore(input, config);

    // Compute alignment score (0-100) based on current head position
    // This is for visual feedback only, separate from accumulated focus score
    const alignmentScore = instant; // Use the instant score as alignment

    // DEBUG: Log alignment every 20 frames to diagnose color issues
    if (calibrationFrameCountRef.current % 20 === 0 && isCalibrated) {
      console.log(`[Alignment] score=${alignmentScore.toFixed(0)}, yaw=${input.yawDeg.toFixed(1)}°, pitch=${input.pitchDeg.toFixed(1)}°, gazeBearing=${input.gazeBearingDeg.toFixed(1)}°`);
    }

    // Update instant score for real-time visual feedback (colors)
    setInstantScore(instant);
    setAlignmentScore(alignmentScore);

    // 4. Track recent instant scores for averaging (helps reduce noise)
    recentInstantScoresRef.current.push(instant);
    if (recentInstantScoresRef.current.length > 10) {
      recentInstantScoresRef.current.shift(); // Keep only last 10 scores (~2 seconds at 5 Hz)
    }

    // 5. Evaluate every EVAL_INTERVAL_MS (1 second)
    const now = Date.now();
    const timeSinceLastEval = now - lastEvalTimeRef.current;

    if (timeSinceLastEval >= EVAL_INTERVAL_MS) {
      lastEvalTimeRef.current = now;

      // Calculate average of recent instant scores
      const avgInstantScore =
        recentInstantScoresRef.current.reduce((a, b) => a + b, 0) /
        recentInstantScoresRef.current.length;

      // Track consecutive distracted evaluations
      if (avgInstantScore < DISTRACTED_THRESHOLD) {
        consecutiveDistractedRef.current += 1;
      } else {
        // User is focused -- reset the distraction counter
        consecutiveDistractedRef.current = 0;
      }

      // Only penalize after sustained distraction (3+ consecutive seconds)
      if (consecutiveDistractedRef.current >= SUSTAINED_SECONDS_REQUIRED) {
        const newScore = Math.max(0, currentScoreRef.current - 1);
        currentScoreRef.current = newScore;

        console.log(
          `[Score] Eval: avg=${avgInstantScore.toFixed(0)}, consecutive=${consecutiveDistractedRef.current}/${SUSTAINED_SECONDS_REQUIRED}, score=${newScore}`
        );

        // Update React state
        setScore(newScore);

        // Append to rolling history
        setHistory((prev) => {
          const next = [...prev, { time: Date.now(), score: newScore }];
          return next.length > MAX_HISTORY_LENGTH
            ? next.slice(-MAX_HISTORY_LENGTH)
            : next;
        });
      }
      // NOTE: No else branch -- score NEVER increases
    }
  }, [result, config]);

  // Smooth progress bar animation - interpolate to target
  useEffect(() => {
    let currentDisplayed = 0;

    const animate = () => {
      const target = targetProgressRef.current;
      const diff = target - currentDisplayed;

      // If close to target, snap to it
      if (Math.abs(diff) < 0.5) {
        currentDisplayed = target;
      } else {
        // Move smoothly towards target (increment by ~1% per frame)
        const increment = diff > 0 ? 1 : -1;
        currentDisplayed += increment;
      }

      setCalibrationProgress(currentDisplayed);

      // Continue animation until displayed progress reaches 100%
      if (currentDisplayed < 100) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        console.log('[Calibration Animation] Complete at 100%');
      }
    };

    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Merge partial config updates without resetting EMA state
  const updateConfig = useCallback((partial: Partial<FocusConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  /**
   * Reset score state for a new session.
   * Does NOT reset calibration -- the webcam is still running and
   * calibration carries over between sessions.
   */
  const reset = useCallback(() => {
    currentScoreRef.current = 100;
    lastEvalTimeRef.current = Date.now();
    recentInstantScoresRef.current = [];
    consecutiveDistractedRef.current = 0;
    setScore(100);
    setInstantScore(100);
    setAlignmentScore(100);
    setHistory([]);
  }, []);

  return { score, instantScore, alignmentScore, history, config, updateConfig, isCalibrated, calibrationProgress, reset };
}
