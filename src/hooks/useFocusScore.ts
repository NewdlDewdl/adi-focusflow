"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { DetectionResult } from "@/lib/detection-types";
import {
  computeInstantFocusScore,
  extractFocusInput,
  updateGazeCalibration,
  DEFAULT_FOCUS_CONFIG,
  type FocusConfig,
  type GazeCalibration,
} from "@/lib/focus-algorithm";

/** Maximum history entries (~60 seconds at 5 Hz detection rate) */
const MAX_HISTORY_LENGTH = 300;

/**
 * React hook that consumes DetectionResult frames and produces a smoothed,
 * hysteresis-protected focus score (0-100) with rolling history for sparkline
 * visualization.
 *
 * Pipeline per frame:
 *   DetectionResult -> extractFocusInput -> computeInstantFocusScore
 *                   -> applyEMA -> applyHysteresis -> displayed score
 *
 * EMA state and displayed score are stored in refs to avoid unnecessary
 * re-renders. The config is updatable at runtime for sensitivity tuning.
 */
export function useFocusScore(
  result: DetectionResult | null,
  configOverrides?: Partial<FocusConfig>
): {
  score: number;
  history: { time: number; score: number }[];
  config: FocusConfig;
  updateConfig: (partial: Partial<FocusConfig>) => void;
  isCalibrated: boolean;
  calibrationProgress: number; // 0-100
  reset: () => void;
} {
  const [score, setScore] = useState(100); // Start at 100
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
  const lastScoreUpdateRef = useRef(Date.now()); // Last time score was incremented/decremented
  const recentInstantScoresRef = useRef<number[]>([]); // Track recent instant scores for averaging

  // Gaze calibration state - auto-calibrates over first 100 frames
  const gazeCalibrationRef = useRef<GazeCalibration>({
    offsetDeg: 0,
    isCalibrated: false,
    minBearingSeen: Infinity,
    frameCount: 0,
  });

  // Process each new detection result through the NEW 3-second timer scoring pipeline
  useEffect(() => {
    if (!result) return;

    // 1. Extract normalized input from raw detection (with calibration)
    const input = extractFocusInput(result, gazeCalibrationRef.current);

    // 2. Update gaze calibration (auto-calibrates over first 50 frames)
    const previousCalibration = gazeCalibrationRef.current;
    gazeCalibrationRef.current = updateGazeCalibration(input, gazeCalibrationRef.current);

    // Update target progress based on actual backend frames (50 frames = 100%)
    const newTargetProgress = Math.min(100, (gazeCalibrationRef.current.frameCount / 50) * 100);
    const oldTarget = targetProgressRef.current;
    targetProgressRef.current = newTargetProgress;

    // Debug log when target changes
    if (oldTarget !== newTargetProgress) {
      console.log(`[Calibration] Frame ${gazeCalibrationRef.current.frameCount}/50, Target: ${newTargetProgress.toFixed(1)}%, Face: ${input.faceDetected}, Gaze strength: ${input.gazeStrength.toFixed(2)}`);
    }

    if (!previousCalibration.isCalibrated && gazeCalibrationRef.current.isCalibrated) {
      setIsCalibrated(true);
      console.log('[useFocusScore] Calibration complete! Progress: 100%');
    }

    // 3. Compute raw instant score (0-100)
    const instant = computeInstantFocusScore(input, config);

    // 4. Track recent instant scores for averaging (helps reduce noise)
    recentInstantScoresRef.current.push(instant);
    if (recentInstantScoresRef.current.length > 10) {
      recentInstantScoresRef.current.shift(); // Keep only last 10 scores (~2 seconds at 5 Hz)
    }

    // 5. Calculate average of recent instant scores
    const avgInstantScore = recentInstantScoresRef.current.reduce((a, b) => a + b, 0) / recentInstantScoresRef.current.length;

    // 6. Check if 3 seconds have passed since last score update
    const now = Date.now();
    const timeSinceLastUpdate = now - lastScoreUpdateRef.current;
    const shouldUpdateScore = timeSinceLastUpdate >= 3000; // 3 seconds

    if (shouldUpdateScore) {
      // Determine if user is "unfocused" based on average instant score
      // Threshold: below 70 = unfocused (score decreases)
      // At or above 70 = focused (score stays the same)
      const isUnfocused = avgInstantScore < 70;

      let newScore = currentScoreRef.current;
      if (isUnfocused) {
        newScore = Math.max(0, currentScoreRef.current - 1); // Decrease by 1, floor at 0
        console.log(`[Score Update] Instant: ${instant.toFixed(1)}, Avg: ${avgInstantScore.toFixed(1)}, UNFOCUSED - Score: ${currentScoreRef.current} -> ${newScore}`);
      } else {
        // Focused - score stays the same
        console.log(`[Score Update] Instant: ${instant.toFixed(1)}, Avg: ${avgInstantScore.toFixed(1)}, FOCUSED - Score stays at ${currentScoreRef.current}`);
      }

      currentScoreRef.current = newScore;
      lastScoreUpdateRef.current = now;

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
    lastScoreUpdateRef.current = Date.now();
    recentInstantScoresRef.current = [];
    setScore(100);
    setHistory([]);
  }, []);

  return { score, history, config, updateConfig, isCalibrated, calibrationProgress, reset };
}
