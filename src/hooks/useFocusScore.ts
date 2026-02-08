"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { DetectionResult } from "@/lib/detection-types";
import {
  computeInstantFocusScore,
  applyEMA,
  applyHysteresis,
  extractFocusInput,
  DEFAULT_FOCUS_CONFIG,
  type FocusConfig,
  type EMAState,
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
} {
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<{ time: number; score: number }[]>([]);
  const [config, setConfig] = useState<FocusConfig>({
    ...DEFAULT_FOCUS_CONFIG,
    ...configOverrides,
  });

  // Use refs for EMA state and displayed score to avoid re-render cycles
  const emaRef = useRef<EMAState>({ value: 0, initialized: false });
  const displayedScoreRef = useRef(0);

  // Process each new detection result through the scoring pipeline
  useEffect(() => {
    if (!result) return;

    // 1. Extract normalized input from raw detection
    const input = extractFocusInput(result);

    // 2. Compute raw instant score
    const instant = computeInstantFocusScore(input, config);

    // 3. Apply EMA smoothing
    const { score: smoothed, state: newEmaState } = applyEMA(
      instant,
      emaRef.current,
      config.emaAlpha
    );
    emaRef.current = newEmaState;

    // 4. Apply hysteresis to prevent rapid oscillation
    const displayed = applyHysteresis(
      smoothed,
      displayedScoreRef.current,
      config
    );
    displayedScoreRef.current = displayed;

    // 5. Update React state
    setScore(displayed);

    // 6. Append to rolling history (capped at MAX_HISTORY_LENGTH)
    setHistory((prev) => {
      const next = [...prev, { time: Date.now(), score: displayed }];
      return next.length > MAX_HISTORY_LENGTH
        ? next.slice(-MAX_HISTORY_LENGTH)
        : next;
    });
  }, [result, config]);

  // Merge partial config updates without resetting EMA state
  const updateConfig = useCallback((partial: Partial<FocusConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  return { score, history, config, updateConfig };
}
