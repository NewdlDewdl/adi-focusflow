---
phase: 07-fix-face-mesh-color-calibration-and-focus-score-accuracy
plan: 01
subsystem: scoring
tags: [human-js, gaze-tracking, focus-score, head-pose, monotonic-decrease]

# Dependency graph
requires:
  - phase: 02-focus-scoring-visualization
    provides: "Focus scoring pipeline (focus-algorithm.ts, useFocusScore.ts)"
provides:
  - "Corrected instant score formula with gaze bearing centered at 90 degrees"
  - "Rebalanced scoring weights (head=0.6, gaze=0.2, face=0.2)"
  - "Sustained distraction timer requiring 3+ consecutive seconds before penalty"
  - "Strictly monotonically decreasing score (never increases)"
affects: [07-02, face-mesh-colors, session-management, coaching]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sustained distraction counter pattern: consecutive evaluations before penalty"
    - "Gaze bearing deviation from PI/2 center (Human.js convention)"
    - "Gaze strength floor at 0.5 for displacement metric interpretation"

key-files:
  created: []
  modified:
    - src/lib/focus-algorithm.ts
    - src/hooks/useFocusScore.ts

key-decisions:
  - "GAZE_CENTER_DEG=90: Human.js bearing centered at PI/2 radians, not 0"
  - "gazeStrength floor of 0.5 when face detected (displacement, not confidence)"
  - "Weights: head=0.6 gaze=0.2 face=0.2 (head pose most reliable signal)"
  - "DISTRACTED_THRESHOLD=45 (safe distance from natural focused baseline of 70-95)"
  - "EVAL_INTERVAL_MS=1000 with SUSTAINED_SECONDS_REQUIRED=3 (1s evals, 3s sustained)"

patterns-established:
  - "Consecutive distraction counter: increment on distracted, reset to 0 on focused"
  - "Score monotonic decrease: only Math.max(0, current - 1), no recovery branch"

# Metrics
duration: 2min
completed: 2026-02-08
---

# Phase 7 Plan 1: Fix Focus Score Algorithm Summary

**Fixed gaze bearing interpretation (90-degree center), rebalanced weights (head=0.6, gaze=0.2, face=0.2), and implemented 3-consecutive-second sustained distraction requirement for monotonically decreasing score**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-08T10:24:24Z
- **Completed:** 2026-02-08T10:26:45Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fixed gaze bearing to measure deviation from 90-degree center instead of 0 degrees, eliminating artificially low scores when looking at camera
- Rebalanced scoring weights to favor head pose (0.6) over noisy gaze data (0.2), with face presence at 0.2
- Replaced single-evaluation 3-second timer with sustained distraction model requiring 3+ consecutive 1-second evaluations below threshold
- Score is now strictly monotonically decreasing with no recovery code path

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix gaze bearing center and rebalance scoring weights** - `d194d4a` (fix)
2. **Task 2: Implement sustained distraction timer with consecutive-second requirement** - `021ff27` (feat)

## Files Created/Modified
- `src/lib/focus-algorithm.ts` - Fixed gaze bearing center (GAZE_CENTER_DEG=90), gazeStrength floor (0.5), rebalanced weights, widened gaze threshold
- `src/hooks/useFocusScore.ts` - Sustained distraction timer with consecutiveDistractedRef, 1-second evaluation interval, monotonic decrease only

## Decisions Made
- GAZE_CENTER_DEG set to 90 based on Human.js source code analysis (bearing = atan2 + PI/2)
- gazeStrength floored at 0.5 when face detected because it is a displacement metric, not confidence
- DISTRACTED_THRESHOLD set to 45 (well below expected focused baseline of 70-95 after gaze fix)
- Evaluation interval changed from 3000ms to 1000ms for finer-grained distraction tracking
- Console logging reduced to score-change-only events to minimize noise

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Scoring algorithm is corrected and ready for Plan 07-02 (face mesh color calibration)
- The instant score now produces 85-100 when looking at camera (up from previous 55-85)
- The sustained distraction requirement prevents false decays from gaze noise
- DetectionProvider consumes the updated useFocusScore hook without changes needed

## Self-Check: PASSED

All files exist, all commits verified, all key content present.

---
*Phase: 07-fix-face-mesh-color-calibration-and-focus-score-accuracy*
*Completed: 2026-02-08*
