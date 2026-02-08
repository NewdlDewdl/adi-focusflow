/**
 * Pure focus scoring functions -- zero React dependencies.
 *
 * Converts raw Human.js detection data (head pose, gaze, face presence)
 * into a 0-100 focus score with EMA smoothing and hysteresis protection.
 */

import type { DetectionResult } from "@/lib/detection-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Human.js gaze bearing is centered at ~PI/2 radians (~90 degrees) when
 * looking straight ahead, NOT at 0 degrees. gazeBearingDeg values from
 * extractFocusInput represent deviation from this center (0 = at camera).
 */
export const GAZE_CENTER_DEG = 90;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Normalized input extracted from a DetectionResult frame */
export interface FocusInput {
  yawDeg: number; // Head yaw in degrees (0 = centered)
  pitchDeg: number; // Head pitch in degrees (0 = centered)
  gazeBearingDeg: number; // Gaze deviation from center in degrees (0 = looking at camera)
  gazeStrength: number; // Gaze strength/confidence (0-1)
  faceDetected: boolean; // Whether a face was detected this frame
}

/** Tunable scoring parameters */
export interface FocusConfig {
  // Signal weights (should sum to 1.0)
  headPoseWeight: number;
  gazeWeight: number;
  facePresenceWeight: number;

  // Thresholds: beyond this angle the sub-score drops to 0
  yawThresholdDeg: number;
  pitchThresholdDeg: number;
  gazeThresholdDeg: number;

  // EMA smoothing factor (lower = smoother, higher = more responsive)
  emaAlpha: number;

  // Hysteresis band widths
  dropThreshold: number; // Points below current to trigger score drop
  recoverThreshold: number; // Points above current to trigger score recovery
}

/** Exponential moving average state */
export interface EMAState {
  value: number;
  initialized: boolean;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_FOCUS_CONFIG: FocusConfig = {
  headPoseWeight: 0.6, // Head pose is the most reliable signal
  gazeWeight: 0.2, // Gaze data is noisy, reduce its impact
  facePresenceWeight: 0.2, // Face not detected = definitely distracted
  yawThresholdDeg: 30,
  pitchThresholdDeg: 25,
  gazeThresholdDeg: 30, // Wider tolerance for noisy gaze data
  emaAlpha: 0.15, // Kept for backward compatibility
  dropThreshold: 8, // Kept for backward compatibility
  recoverThreshold: 5, // Kept for backward compatibility
};

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Extract a FocusInput from a raw DetectionResult.
 *
 * Converts Human.js radian values to degrees and takes the absolute value
 * of gaze bearing (looking left or right is equally "distracted").
 */
export function extractFocusInput(result: DetectionResult | null): FocusInput {
  if (!result || result.faces.length === 0) {
    return {
      yawDeg: 0,
      pitchDeg: 0,
      gazeBearingDeg: 0,
      gazeStrength: 0,
      faceDetected: false,
    };
  }

  const face = result.faces[0];

  if (!face.rotation) {
    return {
      yawDeg: 0,
      pitchDeg: 0,
      gazeBearingDeg: 0,
      gazeStrength: 0,
      faceDetected: true, // Face exists but no rotation data
    };
  }

  const bearingDeg = (face.rotation.gaze.bearing * 180) / Math.PI;

  return {
    yawDeg: (face.rotation.angle.yaw * 180) / Math.PI,
    pitchDeg: (face.rotation.angle.pitch * 180) / Math.PI,
    gazeBearingDeg: Math.abs(bearingDeg - GAZE_CENTER_DEG),
    gazeStrength: face.rotation.gaze.strength,
    faceDetected: true,
  };
}

/**
 * Compute an instantaneous focus score (0-100) from a single frame.
 *
 * Combines three weighted sub-scores:
 * - Head pose: how centered is the head (yaw + pitch)
 * - Gaze: how centered is the gaze direction, scaled by gaze strength
 * - Face presence: binary (1 if face detected, 0 if not)
 *
 * Pure function -- no side effects.
 */
export function computeInstantFocusScore(
  input: FocusInput,
  config: FocusConfig = DEFAULT_FOCUS_CONFIG
): number {
  if (!input.faceDetected) return 0;

  // Head pose sub-score: average of yaw and pitch scores
  const yawScore = Math.max(
    0,
    1 - Math.abs(input.yawDeg) / config.yawThresholdDeg
  );
  const pitchScore = Math.max(
    0,
    1 - Math.abs(input.pitchDeg) / config.pitchThresholdDeg
  );
  const headPoseScore = (yawScore + pitchScore) / 2;

  // Gaze sub-score: direction score scaled by effective gaze strength.
  // gazeStrength from Human.js is a displacement metric (NOT confidence):
  // low values (0.1-0.3) = looking near center, high values = looking away.
  // Apply a floor of 0.5 when face is detected to prevent suppression
  // of the direction score during focused gaze.
  const gazeDirectionScore = Math.max(
    0,
    1 - Math.abs(input.gazeBearingDeg) / config.gazeThresholdDeg
  );
  const effectiveStrength = input.faceDetected
    ? Math.max(0.5, input.gazeStrength)
    : 0;
  const gazeScore = gazeDirectionScore * effectiveStrength;

  // Face presence sub-score: binary
  const faceScore = input.faceDetected ? 1 : 0;

  // Weighted combination
  const raw =
    headPoseScore * config.headPoseWeight +
    gazeScore * config.gazeWeight +
    faceScore * config.facePresenceWeight;

  // Scale to 0-100 and clamp
  return Math.min(100, Math.max(0, Math.round(raw * 100)));
}

/**
 * Apply exponential moving average smoothing to a new instant score.
 *
 * On the first call (state not yet initialized), the instant score is used
 * directly. Subsequent calls blend the new score into the running average
 * using: smoothed = alpha * instant + (1 - alpha) * previous.
 *
 * Returns the smoothed score (rounded) and updated EMA state.
 */
export function applyEMA(
  instantScore: number,
  state: EMAState,
  alpha: number
): { score: number; state: EMAState } {
  if (!state.initialized) {
    return {
      score: instantScore,
      state: { value: instantScore, initialized: true },
    };
  }

  const smoothed = alpha * instantScore + (1 - alpha) * state.value;
  return {
    score: Math.round(smoothed),
    state: { value: smoothed, initialized: true },
  };
}

/**
 * Apply hysteresis to prevent rapid score oscillation.
 *
 * The displayed score only changes when the smoothed score deviates
 * significantly from the current displayed score:
 * - Drops when smoothed falls below displayed - dropThreshold
 * - Recovers when smoothed rises above displayed + recoverThreshold
 * - Otherwise holds the current displayed score
 *
 * Asymmetric thresholds mean the score is harder to drop than to recover,
 * matching user expectations (brief glances away should not punish).
 */
export function applyHysteresis(
  smoothedScore: number,
  displayedScore: number,
  config: FocusConfig
): number {
  const diff = smoothedScore - displayedScore;

  if (diff < -config.dropThreshold) {
    // Significant drop -- update displayed score
    return smoothedScore;
  }
  if (diff > config.recoverThreshold) {
    // Significant recovery -- update displayed score
    return smoothedScore;
  }

  // Within hysteresis band -- keep current displayed score
  return displayedScore;
}
