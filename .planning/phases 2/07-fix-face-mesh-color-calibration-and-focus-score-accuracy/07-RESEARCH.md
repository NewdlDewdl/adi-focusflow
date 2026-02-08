# Phase 7: Fix Face Mesh Color Calibration and Focus Score Accuracy - Research

**Researched:** 2026-02-08
**Domain:** Focus scoring algorithm, face mesh color mapping, Human.js gaze data interpretation, hysteresis/dead-zone design
**Confidence:** HIGH

## Summary

This phase addresses five interrelated bugs in the face mesh color system and focus scoring pipeline. After deep analysis of the existing codebase, the root causes are clear and the fixes are well-scoped. The issues fall into two categories: (1) **color mapping corrections** in `WebcamView.tsx` -- changing calibration colors from gray to blue/purple and ensuring post-calibration starts green, and (2) **scoring algorithm redesign** in `useFocusScore.ts` and `focus-algorithm.ts` -- replacing the current premature-decay model with a proper time-windowed, hysteresis-protected, monotonically-decreasing score.

The current scoring pipeline has three critical flaws causing premature score decay. First, `computeInstantFocusScore()` produces scores well below 100 even when looking directly at the camera because Human.js gaze data is inherently noisy (gaze strength is typically 0.3-0.7 even when looking straight ahead, and bearing fluctuates +/-15 degrees). This means the average instant score during focused usage sits around 60-80, not near 100. Second, the unfocused threshold is set at `avgInstantScore < 60`, which is too close to the natural "looking at camera" baseline of 60-80, causing false decays. Third, the 3-second timer evaluates the rolling average against this threshold, but does not require sustained deviation before penalizing.

The fix requires: (1) widening the "focused" dead zone so normal head/eye movements when looking at the camera never trigger score decay, (2) requiring 3+ consecutive seconds of sustained below-threshold readings before any score penalty (not just a single 3-second sample), (3) making the score strictly monotonically decreasing (score NEVER increases once it drops), and (4) recalibrating the instant score formula to better handle the noisy gaze data from Human.js.

**Primary recommendation:** Implement a dead-zone-based scoring model where the instant score must stay below a "distracted" threshold (e.g., average < 45) for 3+ consecutive seconds before the displayed score decreases by 1 point, the score never recovers when the user returns to focus, and the color mapping uses blue/purple for calibration and green-to-red for post-calibration states.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @vladmandic/human | ^3.3.6 | Face/gaze detection, mesh drawing | Already installed; provides gaze.bearing, gaze.strength, rotation.angle for scoring |
| React | 19.1.0 | Component rendering, hooks | Already installed; useFocusScore hook manages scoring state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| framer-motion | ^12.33.0 | FocusScoreRing animation | Already installed; NOT used for canvas color changes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom instant score formula | ML-based attention classifier | Overkill for hackathon; rule-based with proper thresholds is sufficient |
| Per-frame gaze analysis | Fixation-based windowed analysis | Fixation detection adds complexity; time-averaging over 3s windows achieves similar noise reduction |

**Installation:**
```bash
# No new dependencies required -- all libraries already installed
```

## Architecture Patterns

### Existing File Structure (What Changes)
```
src/
├── components/
│   └── detection/
│       └── WebcamView.tsx          # CHANGE: calibration color from gray to blue/purple
├── hooks/
│   └── useFocusScore.ts            # CHANGE: scoring algorithm rewrite (major)
└── lib/
    └── focus-algorithm.ts           # CHANGE: instant score formula, threshold tuning
```

### Pattern 1: Dead-Zone Scoring with Sustained Distraction Requirement
**What:** The "focused" state has a wide dead zone where normal head/eye movements do not affect the score. Only sustained deviation below a "distracted" threshold, lasting 3+ consecutive seconds, triggers a score penalty.
**When to use:** Every scoring evaluation cycle in `useFocusScore.ts`.
**Why:** Human.js gaze data is noisy. Gaze bearing fluctuates +/-15 degrees and strength varies 0.3-0.7 even when looking straight at the camera. A tight threshold (like the current 60) causes false decays. A wide dead zone (threshold at ~45) absorbs this noise.
**Example:**
```typescript
// Core scoring state machine
const DISTRACTED_THRESHOLD = 45; // Average instant score below this = distracted
const SUSTAINED_SECONDS = 3;      // Must be distracted for this long before penalty
const EVAL_INTERVAL_MS = 1000;     // Check every 1 second

// In the evaluation loop:
const avgInstantScore = getRecentAverage(); // average of last ~10 instant scores

if (avgInstantScore < DISTRACTED_THRESHOLD) {
  consecutiveDistractedSecondsRef.current += 1;
} else {
  consecutiveDistractedSecondsRef.current = 0; // Reset on focus return
}

// Only penalize after sustained distraction
if (consecutiveDistractedSecondsRef.current >= SUSTAINED_SECONDS) {
  // Decrease score by 1 per evaluation interval while distracted
  newScore = Math.max(0, currentScore - 1);
}
// NEVER increase score -- it is monotonically decreasing
```

### Pattern 2: Monotonically Decreasing Score (No Recovery)
**What:** Once the score decreases, it never increases. When the user returns focus, the score simply stops decreasing and holds at its current level.
**When to use:** In the score update logic of `useFocusScore.ts`.
**Why:** The phase requirements explicitly state: "When user looks back after looking away, score should stop decreasing but remain at current level (no recovery)."
**Example:**
```typescript
// The score update is simple: only decrease, never increase
let newScore = currentScoreRef.current;
if (isDistracted && sustainedLongEnough) {
  newScore = Math.max(0, currentScoreRef.current - 1);
}
// No else branch to increase -- score stays where it is
currentScoreRef.current = newScore;
```

### Pattern 3: Calibration-Aware Color Mapping
**What:** During calibration, the face mesh uses a blue-to-purple gradient. After calibration, it starts green (score=100) and transitions through yellow, orange, and red as score decreases.
**When to use:** In the `getTargetRGB()` function in `WebcamView.tsx`.
**Why:** The current implementation uses gray during calibration, which does not match the desired visual experience. Blue/purple communicates "system initializing" more clearly.
**Example:**
```typescript
function getTargetRGB(score: number, isCalibrated: boolean): RGB {
  // During calibration: blue-purple gradient
  if (!isCalibrated) return [120, 80, 220]; // Purple-blue

  // Post-calibration: score-based green-to-red
  if (score >= 75) {
    const t = (score - 75) / 25;
    return lerpRGB([234, 179, 8], [34, 197, 94], t); // yellow -> green
  }
  if (score >= 50) {
    const t = (score - 50) / 25;
    return lerpRGB([249, 115, 22], [234, 179, 8], t); // orange -> yellow
  }
  if (score >= 25) {
    const t = (score - 25) / 25;
    return lerpRGB([239, 68, 68], [249, 115, 22], t); // red -> orange
  }
  return [185, 28, 28]; // dark red for < 25
}
```

### Anti-Patterns to Avoid
- **Using raw instant score for decay decisions:** The instant score is noisy (frame-to-frame variance of 10-20 points). Always use a rolling average over multiple frames.
- **Symmetric hysteresis (equal drop and recover thresholds):** This phase requires asymmetric behavior: easy to decay (3s sustained distraction), impossible to recover (score never goes up).
- **Per-frame score updates:** Updating the displayed score on every detection frame (~5 FPS) causes jitter. The 3-second evaluation window is correct; the fix is to require sustained distraction before penalizing within that window.
- **Relying on gaze strength alone for focus detection:** Gaze strength from Human.js is the normalized distance of iris from eye center, not a confidence metric. It is typically low (0.3-0.5) even during focused gaze. Head pose (yaw/pitch) is the more reliable signal.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Face mesh rendering colors | Custom WebGL shader | `human.draw.options.color` | Already works; just change the input color values |
| Gaze noise filtering | Custom Kalman filter | Rolling average of last 10 instant scores (~2s at 5Hz) | Simple averaging is sufficient given the 3s sustained threshold |
| Score persistence across frames | Complex state machine | Simple ref-based counter (`consecutiveDistractedSecondsRef`) | The logic is just a counter with threshold; no need for a full FSM |
| Color interpolation | HSL color space math | RGB linear interpolation (`lerpRGB`) | Already implemented and working; RGB lerp is fine for this gradient |

**Key insight:** The existing infrastructure (instant score calculation, rolling average, 3-second timer, color lerping, Human.js draw API) is all correct. The bugs are in the *parameters* and *logic flow*, not the *architecture*. The fixes are primarily about adjusting thresholds, adding a sustained-distraction counter, removing recovery logic, and changing color constants.

## Common Pitfalls

### Pitfall 1: Gaze Data Noise Causing False Distraction Detection
**What goes wrong:** User is looking directly at the camera but instant focus score fluctuates between 55-85 instead of staying near 100.
**Why it happens:** Human.js gaze tracking uses iris landmark positions relative to eye corners. The bearing value (in radians, 0-PI range) fluctuates +/-15 degrees frame-to-frame due to micro-movements and detection noise. The strength value (normalized iris offset) typically reads 0.3-0.7 even during direct gaze. The current formula `gazeDirectionScore * gazeStrength` compresses the gaze sub-score down to ~0.3-0.5 even at perfect alignment, dragging the weighted total down.
**How to avoid:** Two approaches (use both): (1) Reduce gaze weight from 0.4 to 0.2 and increase head pose weight from 0.5 to 0.6, since head pose is the more reliable signal. (2) Lower the "distracted" threshold from 60 to 45 so that normal gaze noise (instant scores of 55-80) stays safely in the "focused" zone.
**Warning signs:** Score decreasing during the first 30 seconds even when user stares at camera.

### Pitfall 2: Calibration Progress vs. Calibration Quality
**What goes wrong:** Calibration completes after 50 frames regardless of whether the user was actually looking at the camera.
**Why it happens:** The current calibration is a simple frame counter (`calibrationFrameCountRef.current++`). It does not validate that the user's face was detected or that they were looking at the camera.
**How to avoid:** Only count calibration frames where `input.faceDetected === true`. Optionally, require the instant score to be above a minimum threshold during calibration.
**Warning signs:** Calibration completes but the score immediately starts dropping because the "calibrated" baseline was captured during poor face detection.

### Pitfall 3: Color Indicator Badge Showing Wrong Color
**What goes wrong:** The DOM-based color indicator badge (top-left) uses `getFocusColors()` which still uses the old gray calibration color, while the canvas mesh uses the new blue/purple calibration color from `getTargetRGB()`.
**Why it happens:** There are two separate color mapping functions: `getFocusColors()` for DOM elements and `getTargetRGB()` for canvas rendering. Both need to be updated in sync.
**How to avoid:** Update both `getTargetRGB()` and `getFocusColors()` to use the same blue/purple calibration color.
**Warning signs:** Color indicator badge shows gray while mesh shows blue/purple.

### Pitfall 4: Instant Score vs. Display Score Confusion for Colors
**What goes wrong:** Face mesh color is driven by `instantScore` (real-time, noisy) while the FocusScoreRing shows `displayScore` (3-second averaged). When the user looks at the camera, the mesh might flash colors while the ring stays steady.
**Why it happens:** Phase 6 changed the mesh to use `instantScore` for "real-time color changes." But the instant score is inherently noisy (10-20 point variance frame-to-frame).
**How to avoid:** Use the smoothed/display score (not instant) for the mesh color after calibration. The lerping system already provides smooth visual transitions. During calibration, the mesh should always be blue/purple regardless of score.
**Warning signs:** Mesh color flickering between yellow and green while the score ring shows a steady 100.

### Pitfall 5: Score Evaluation Timing Drift
**What goes wrong:** The 3-second evaluation timer drifts because it uses `Date.now()` comparisons in a useEffect that runs on every detection result (~5 Hz), and the timer only resets when the threshold is exceeded.
**Why it happens:** `lastScoreUpdateRef.current = now` is only set when `shouldUpdateScore` is true (every 3s). But the detection frames arrive at ~200ms intervals, so the actual time between evaluations varies by up to 200ms.
**How to avoid:** This is acceptable for a hackathon demo. The 200ms jitter is imperceptible. Do not over-engineer with setInterval or requestAnimationFrame -- the current approach is fine, just fix the threshold logic.
**Warning signs:** None visible to user -- this is a non-issue in practice.

### Pitfall 6: Chime System Interacting with No-Recovery Score
**What goes wrong:** The `useFocusChime` hook has recovery logic that resets the baseline when the user "recovers." But with the no-recovery score model, the score never increases, so the chime never stops.
**Why it happens:** The chime system was designed for a score that can increase. With a monotonically decreasing score, the recovery condition (`score - lowestScoreRef.current >= recoveryAmount`) can never be satisfied once the score starts dropping.
**How to avoid:** Modify the chime recovery logic to use the *instant score* (not the display score) for recovery detection. When the average instant score returns above the distracted threshold, stop chiming even though the display score stays flat.
**Warning signs:** Continuous chiming after user refocuses.

## Code Examples

Verified patterns from codebase analysis and Human.js documentation:

### Current Instant Score Calculation (Shows the Problem)
```typescript
// Source: src/lib/focus-algorithm.ts lines 117-152
// Problem: gazeScore = gazeDirectionScore * gazeStrength
// When looking at camera: gazeStrength ~ 0.3-0.7, gazeBearing ~ +/-15deg
// So gazeDirectionScore ~ 0.4-1.0, gazeScore ~ 0.12-0.7
// With gazeWeight=0.4: gaze contribution = 0.05-0.28 out of 0.40 max
// This drags total score to 60-80 even during perfect focus

const gazeDirectionScore = Math.max(0, 1 - Math.abs(input.gazeBearingDeg) / config.gazeThresholdDeg);
const gazeScore = gazeDirectionScore * input.gazeStrength;
// FIX: Clamp gazeStrength minimum to 0.5 when face is detected, or reduce gazeWeight
```

### Human.js Gaze Value Interpretation
```typescript
// Source: human/src/face/angles.ts (calculateGaze function)
// bearing: angle in radians, range [0, PI], computed from iris offset relative to eye center
//          ~PI/2 (90deg) = looking straight ahead, deviations = looking away
// strength: normalized distance of iris from eye center, range [0, boxWidth/2]
//           NOT a confidence metric -- it's a displacement metric
//           Low values (0.1-0.3) = looking near center
//           High values (0.5+) = looking far from center

// CRITICAL INSIGHT: bearing ~= PI/2 when focused, deviates when looking away
// The current code uses Math.abs(gazeBearingDeg) as distance from 0,
// but 0 is NOT "looking at camera" -- ~90deg is "looking at camera"
// This means the formula needs to measure deviation from ~90deg, not from 0deg
```

### Recommended Instant Score Fix
```typescript
// Fix the gaze sub-score to properly handle bearing center at ~PI/2
const GAZE_CENTER_DEG = 90; // bearing ~= 90deg when looking straight
const gazeDeviationDeg = Math.abs(input.gazeBearingDeg - GAZE_CENTER_DEG);
const gazeDirectionScore = Math.max(0, 1 - gazeDeviationDeg / config.gazeThresholdDeg);

// De-emphasize gazeStrength since it's displacement, not confidence
// When face is detected, use a floor of 0.5 for gazeStrength
const effectiveStrength = input.faceDetected ? Math.max(0.5, input.gazeStrength) : 0;
const gazeScore = gazeDirectionScore * effectiveStrength;
```

### Recommended Score Update Logic
```typescript
// Replace the current 3-second timer scoring with sustained-distraction model

const DISTRACTED_THRESHOLD = 45;
const SUSTAINED_SECONDS_REQUIRED = 3;
const EVAL_INTERVAL_MS = 1000; // Check every second

// State refs
const consecutiveDistractedRef = useRef(0); // Count of consecutive distracted evaluations
const lastEvalTimeRef = useRef(Date.now());

// In the useEffect processing detection results:
const now = Date.now();
const timeSinceLastEval = now - lastEvalTimeRef.current;

if (timeSinceLastEval >= EVAL_INTERVAL_MS) {
  lastEvalTimeRef.current = now;

  const avgInstant = getRecentAverage();

  if (avgInstant < DISTRACTED_THRESHOLD) {
    consecutiveDistractedRef.current += 1;
  } else {
    consecutiveDistractedRef.current = 0; // Reset -- user is focused
  }

  // Only penalize after sustained distraction
  if (consecutiveDistractedRef.current >= SUSTAINED_SECONDS_REQUIRED) {
    const newScore = Math.max(0, currentScoreRef.current - 1);
    currentScoreRef.current = newScore;
    setScore(newScore);
    // Append to history...
  }
  // NOTE: No else branch -- score NEVER increases
}
```

### Recommended Calibration Color
```typescript
// Blue/purple gradient for calibration phase
function getTargetRGB(score: number, isCalibrated: boolean): RGB {
  if (!isCalibrated) return [100, 80, 220]; // Blue-purple

  // Post-calibration: green at 100, transitions to red at 0
  // (same gradient as before, just starting from green)
  if (score >= 75) {
    const t = (score - 75) / 25;
    return lerpRGB([234, 179, 8], [34, 197, 94], t); // yellow -> green
  }
  // ... rest unchanged
}

// Also update getFocusColors() for the DOM badge:
function getFocusColors(score: number, isCalibrated: boolean) {
  if (!isCalibrated) {
    return {
      primary: 'rgba(100, 80, 220, 0.8)',   // blue-purple
      secondary: 'rgba(140, 120, 255, 0.9)', // lighter blue-purple
    };
  }
  // ... rest unchanged
}
```

### Recommended FocusConfig Adjustments
```typescript
export const DEFAULT_FOCUS_CONFIG: FocusConfig = {
  headPoseWeight: 0.6,      // UP from 0.5 -- head pose is most reliable signal
  gazeWeight: 0.2,          // DOWN from 0.4 -- gaze data is noisy
  facePresenceWeight: 0.2,  // UP from 0.1 -- face not detected = definitely distracted
  yawThresholdDeg: 30,      // KEEP -- 30deg yaw is clearly looking away
  pitchThresholdDeg: 25,    // KEEP -- 25deg pitch is clearly looking up/down
  gazeThresholdDeg: 30,     // UP from 25 -- wider tolerance for noisy gaze data
  emaAlpha: 0.15,           // KEEP -- not used in new model but keep for compatibility
  dropThreshold: 8,         // KEEP -- not used in new model but keep for compatibility
  recoverThreshold: 5,      // KEEP -- not used in new model but keep for compatibility
};
```

## State of the Art

| Old Approach (Current) | New Approach (Phase 7) | Why Change | Impact |
|------------------------|----------------------|------------|--------|
| Gray mesh during calibration | Blue/purple mesh during calibration | Matches design spec; communicates "initializing" more clearly | Visual fix only |
| Gaze bearing measured from 0deg | Gaze bearing measured from 90deg center | Human.js bearing is centered at ~PI/2 when looking straight; 0deg is NOT center | Eliminates major source of false low scores |
| gazeWeight=0.4, headPoseWeight=0.5 | gazeWeight=0.2, headPoseWeight=0.6 | Head pose is far more reliable than gaze for webcam-based tracking | Reduces noise impact on score |
| Score decreases if 3s avg < 60 | Score decreases only after 3+ consecutive seconds of avg < 45 | Previous threshold too close to natural "focused" baseline; no sustained requirement | Eliminates premature score decay |
| Score can stay flat OR decrease | Score can ONLY decrease (monotonic) | Phase requirement: no recovery | Matches spec; simpler mental model |
| Chime recovery based on display score | Chime recovery based on instant score avg | Display score never increases, so chime would never stop | Prevents infinite chiming |

**Critical discovery:** The most impactful bug is that `gazeBearingDeg` is used as an absolute angle from 0, but Human.js computes bearing as `(atan2(eyeDiff) + PI/2) % PI`, meaning ~90 degrees (PI/2 radians) represents "looking straight ahead." The current code treats 0 degrees as center, causing the gaze sub-score to be artificially low during focused gaze.

## Open Questions

1. **Exact blue/purple color for calibration**
   - What we know: The requirement says "blue/purple gradient." The exact RGB values are not specified.
   - What's unclear: Whether this is a single solid color or a gradient that changes during calibration.
   - Recommendation: Use a single blue-purple color `[100, 80, 220]` for simplicity. Can add gradient progression (darker to lighter purple as calibration progresses) later if desired.

2. **Distracted threshold tuning (45 vs. other values)**
   - What we know: The current threshold of 60 is too high. Analysis of the formula shows "looking at camera" typically produces instant scores of 55-85 with the current weights.
   - What's unclear: After fixing the gaze bearing center issue and rebalancing weights, the "focused" baseline will shift upward (likely to 70-90). The distracted threshold will need empirical tuning.
   - Recommendation: Start with threshold at 45 after the gaze fix, test manually, adjust. Expose the threshold as a tunable parameter.

3. **Whether calibration should validate face quality**
   - What we know: Current calibration is just a 50-frame counter.
   - What's unclear: Whether we should require face detection during calibration frames.
   - Recommendation: At minimum, only count frames where `input.faceDetected === true`. This is a small change with significant quality improvement.

4. **Calibration progress bar color**
   - What we know: The progress bar currently uses `from-blue-500 to-blue-400` Tailwind classes.
   - What's unclear: Whether this should change to match the blue/purple mesh color.
   - Recommendation: The progress bar is already blue, which is consistent with the new blue/purple mesh. Keep as-is or adjust to `from-purple-500 to-blue-400` for a subtle gradient match.

5. **FocusScoreRing color should match mesh color scheme**
   - What we know: `FocusScoreRing.tsx` has its own color logic (green >= 70, yellow >= 40, red < 40). The mesh uses a different gradient (green 75-100, yellow 50-75, orange 25-50, red < 25).
   - What's unclear: Whether these should be aligned.
   - Recommendation: Align the ring thresholds with the mesh thresholds for consistency. The ring should use: green >= 75, yellow >= 50, orange >= 25, red < 25.

## Sources

### Primary (HIGH confidence)
- Codebase: `src/hooks/useFocusScore.ts` -- current scoring pipeline with 3-second timer, rolling average, and instant score
- Codebase: `src/lib/focus-algorithm.ts` -- `computeInstantFocusScore()`, `extractFocusInput()`, weight/threshold configuration
- Codebase: `src/components/detection/WebcamView.tsx` -- `getTargetRGB()`, `getFocusColors()`, `lerpRGB()`, draw options
- Codebase: `src/components/detection/DetectionProvider.tsx` -- prop threading, calibration state management
- Codebase: `src/hooks/useFocusChime.ts` -- chime trigger/recovery logic
- Codebase: `src/components/scoring/FocusScoreRing.tsx` -- ring color thresholds
- [Human.js FaceResult TypeDoc](https://vladmandic.github.io/human/typedoc/interfaces/FaceResult.html) -- rotation.gaze.bearing/strength types
- [Human.js angles.ts source](https://github.com/vladmandic/human/blob/main/src/face/angles.ts) -- gaze calculation: bearing = (atan2(eyeDiff) + PI/2) % PI, strength = normalized iris offset

### Secondary (MEDIUM confidence)
- [Human.js DrawOptions TypeDoc](https://vladmandic.github.io/human/typedoc/interfaces/DrawOptions.html) -- draw configuration options
- [Human.js GitHub](https://github.com/vladmandic/human) -- general library documentation

### Tertiary (LOW confidence)
- None -- all findings verified against codebase and official source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies; all changes are to existing files
- Architecture: HIGH -- scoring algorithm redesign is well-understood from code analysis; patterns are straightforward
- Pitfalls: HIGH -- identified from direct code inspection and Human.js source code analysis; gaze bearing center issue verified in angles.ts
- Color mapping: HIGH -- simple constant changes in existing functions

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable -- no dependency changes expected)
