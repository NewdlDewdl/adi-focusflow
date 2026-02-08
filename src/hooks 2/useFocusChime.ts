"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Configuration for the focus chime alert system.
 */
export interface ChimeConfig {
  /** Points below baseline to trigger chime (default: 2) */
  dropThreshold: number;
  /** @deprecated Recovery is now threshold-based using instantScore, not delta-based */
  recoveryAmount: number;
  /** Interval between chime plays in milliseconds (default: 1500 = 1.5s) */
  chimeIntervalMs: number;
}

const DEFAULT_CHIME_CONFIG: ChimeConfig = {
  dropThreshold: 2, // Trigger after 2 points lost (adjusted for slower score changes)
  recoveryAmount: 1, // Unused: recovery is now threshold-based via instantScore
  chimeIntervalMs: 1500, // Play every 1.5 seconds (faster succession)
};

/**
 * React hook that plays an audio chime when focus score drops significantly
 * and continues until the user recovers focus.
 *
 * Logic:
 * 1. Track a "baseline" score (the highest recent score)
 * 2. When score drops more than dropThreshold below baseline, start chiming
 * 3. When score increases by recoveryAmount from the low point, stop chiming
 * 4. Reset baseline when user is back in good focus
 *
 * @param score - Current display focus score (0-100, monotonically decreasing)
 * @param instantScore - Real-time instant score for recovery detection (0-100, fluctuates)
 * @param config - Optional configuration overrides
 * @returns Object with chimeCount (total chimes played in current session)
 */
export function useFocusChime(
  score: number,
  instantScore: number,
  config: Partial<ChimeConfig> = {}
): { chimeCount: number; reset: () => void } {
  const fullConfig = { ...DEFAULT_CHIME_CONFIG, ...config };

  const baselineScoreRef = useRef(score); // Highest recent score
  const lowestScoreRef = useRef(score); // Lowest point during drop
  const isChimingRef = useRef(false); // Whether chime is currently active
  const chimeIntervalRef = useRef<NodeJS.Timeout | null>(null); // Interval timer
  const audioContextRef = useRef<AudioContext | null>(null); // Web Audio context
  const chimeCountRef = useRef(0); // Total chimes played in current distraction session
  const recentInstantScoresRef = useRef<number[]>([]); // Rolling buffer for instant score averaging
  const startTimeRef = useRef<number>(Date.now()); // When the hook was initialized
  const WARMUP_PERIOD_MS = 12000; // Don't trigger chimes for first 12 seconds (10s calibration + 2s buffer)

  /**
   * Generate and play a pleasant chime sound using Web Audio API.
   * Creates a two-tone bell-like sound.
   */
  const playChime = () => {
    try {
      // Lazy-init audio context (must be created after user interaction)
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const ctx = audioContextRef.current;
      const now = ctx.currentTime;

      // Create oscillator for first tone (higher pitch)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 800; // Hz
      osc1.type = "sine";
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Create oscillator for second tone (lower pitch, slight delay)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 600; // Hz
      osc2.type = "sine";
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.2, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.6);

      // Increment chime counter
      chimeCountRef.current += 1;
      console.log("[useFocusChime] Chime played (count:", chimeCountRef.current, ")");
    } catch (error) {
      console.error("[useFocusChime] Failed to play chime:", error);
    }
  };

  /**
   * Start the repeating chime interval.
   */
  const startChiming = () => {
    if (isChimingRef.current) return;

    console.log("[useFocusChime] Starting chime (score dropped below threshold)");
    isChimingRef.current = true;

    // Play immediately
    playChime();

    // Then repeat on interval
    chimeIntervalRef.current = setInterval(() => {
      playChime();
    }, fullConfig.chimeIntervalMs);
  };

  /**
   * Stop the repeating chime interval.
   */
  const stopChiming = () => {
    if (!isChimingRef.current) return;

    console.log("[useFocusChime] Stopping chime (score recovered, total chimes:", chimeCountRef.current, ")");
    isChimingRef.current = false;

    if (chimeIntervalRef.current) {
      clearInterval(chimeIntervalRef.current);
      chimeIntervalRef.current = null;
    }

    // Reset chime count when user recovers
    chimeCountRef.current = 0;
  };

  // Main logic: detect score drops and recoveries
  useEffect(() => {
    // Check if we're still in warmup period
    const timeElapsed = Date.now() - startTimeRef.current;
    const inWarmup = timeElapsed < WARMUP_PERIOD_MS;

    // Track instant score in rolling buffer for recovery averaging
    recentInstantScoresRef.current.push(instantScore);
    if (recentInstantScoresRef.current.length > 15) {
      recentInstantScoresRef.current.shift(); // Keep last 15 readings (~3 seconds at 5 Hz)
    }
    const avgInstant = recentInstantScoresRef.current.reduce((a, b) => a + b, 0) / recentInstantScoresRef.current.length;

    // Update baseline if score is higher and we're not currently in a drop
    if (!isChimingRef.current && score > baselineScoreRef.current) {
      if (Math.random() < 0.05) { // Log 5% of updates to reduce spam
        console.log(`[useFocusChime] Baseline updated: ${baselineScoreRef.current} -> ${score}`);
      }
      baselineScoreRef.current = score;
      lowestScoreRef.current = score;
    }

    // Check if score has dropped significantly below baseline
    const dropAmount = baselineScoreRef.current - score;

    if (Math.random() < 0.02) { // Log 2% of checks to reduce spam
      console.log(`[useFocusChime] Score=${score}, Baseline=${baselineScoreRef.current}, Drop=${dropAmount}, Threshold=${fullConfig.dropThreshold}, Chiming=${isChimingRef.current}, Warmup=${inWarmup}, AvgInstant=${avgInstant.toFixed(1)}`);
    }

    // Don't trigger chimes during warmup period
    if (!inWarmup && dropAmount >= fullConfig.dropThreshold && !isChimingRef.current) {
      // Start chiming
      lowestScoreRef.current = score;
      startChiming();
    }

    // If chiming, track the lowest point during the drop
    if (isChimingRef.current && score < lowestScoreRef.current) {
      lowestScoreRef.current = score;
    }

    // Recovery: use average instant score instead of display score
    // Display score is monotonically decreasing and can never recover,
    // so we check if the user is actually focused again via instant score
    if (isChimingRef.current) {
      const RECOVERY_THRESHOLD = 55; // Higher than 45 distraction threshold for hysteresis
      if (avgInstant >= RECOVERY_THRESHOLD) {
        stopChiming();
        baselineScoreRef.current = score;
        lowestScoreRef.current = score;
      }
    }
  }, [score, instantScore, fullConfig.dropThreshold]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopChiming();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  /**
   * Reset chime state for a new session.
   * Stops any active chiming, resets baseline and counters.
   * Does NOT close the AudioContext (it's reusable).
   */
  const reset = useCallback(() => {
    stopChiming();
    baselineScoreRef.current = 100;
    lowestScoreRef.current = 100;
    chimeCountRef.current = 0;
    recentInstantScoresRef.current = [];
    startTimeRef.current = Date.now(); // Reset warmup period
  }, []);

  return { chimeCount: chimeCountRef.current, reset };
}
