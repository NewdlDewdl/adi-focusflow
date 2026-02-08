---
phase: 02-focus-scoring-visualization
plan: 02
subsystem: scoring
tags: [focus-score, ema, hysteresis, algorithm, react-hook, typescript]

# Dependency graph
requires:
  - phase: 01-webcam-detection-pipeline
    provides: DetectionResult type and useHumanDetection hook producing face/gaze data
provides:
  - Pure focus scoring functions (computeInstantFocusScore, applyEMA, applyHysteresis, extractFocusInput)
  - useFocusScore React hook consuming DetectionResult and producing smoothed 0-100 score with history
  - DEFAULT_FOCUS_CONFIG with tunable scoring parameters
  - FocusInput, FocusConfig, EMAState types
affects: [02-focus-scoring-visualization/plan-03, session-management, sensitivity-controls]

# Tech tracking
tech-stack:
  added: []
  patterns: [pure-function-plus-hook, ema-smoothing, hysteresis-stabilization, ref-based-state-for-perf]

key-files:
  created:
    - src/lib/focus-algorithm.ts
    - src/hooks/useFocusScore.ts
  modified: []

key-decisions:
  - "Asymmetric hysteresis: dropThreshold=8, recoverThreshold=5 (harder to drop, easier to recover -- matches user expectation)"
  - "EMA state and displayed score stored in refs (not useState) to avoid unnecessary re-renders in the scoring pipeline"
  - "MAX_HISTORY_LENGTH=300 entries for sparkline (~60s at 5Hz detection rate)"

patterns-established:
  - "Pure function + hook: scoring algorithm in lib/ with zero React deps, React lifecycle managed in hooks/"
  - "EMA + hysteresis pipeline: instant score -> EMA smoothing -> hysteresis stabilization -> displayed score"

# Metrics
duration: 2min
completed: 2026-02-08
---

# Phase 2 Plan 2: Focus Scoring Algorithm Summary

**Weighted head-pose + gaze + face-presence scoring algorithm with EMA smoothing and hysteresis stabilization, exposed via useFocusScore hook**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-08T02:47:15Z
- **Completed:** 2026-02-08T02:49:23Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Pure focus scoring algorithm computing 0-100 score from head pose (yaw/pitch), gaze (bearing/strength), and face presence with configurable weights
- EMA smoothing (alpha=0.15, ~7s effective window at 5Hz) prevents per-frame score jumps
- Asymmetric hysteresis (drop=8, recover=5) prevents rapid oscillation around boundary values
- useFocusScore hook ready for consumption by visualization components, with rolling 60s history buffer and runtime config updates

## Task Commits

Each task was committed atomically:

1. **Task 1: Create focus scoring algorithm (pure functions)** - `9f40f27` (feat)
2. **Task 2: Create useFocusScore hook** - `f53b373` (feat)

## Files Created/Modified
- `src/lib/focus-algorithm.ts` - Pure scoring functions: extractFocusInput, computeInstantFocusScore, applyEMA, applyHysteresis, types, and DEFAULT_FOCUS_CONFIG
- `src/hooks/useFocusScore.ts` - React hook consuming DetectionResult, producing smoothed score + rolling history for sparkline

## Decisions Made
- Asymmetric hysteresis thresholds (drop=8, recover=5): score is harder to drop than to recover, matching the user expectation that brief glances away should not punish the score
- EMA state and displayed score stored in useRef (not useState) to avoid triggering unnecessary re-renders during the high-frequency scoring pipeline
- History capped at 300 entries (60 seconds of data at 5Hz) -- sufficient for sparkline visualization without unbounded memory growth

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Focus scoring pipeline complete and ready for Plan 03 (Score visualization UI: SVG ring, sparkline, stat cards)
- useFocusScore returns { score, history, config, updateConfig } which maps directly to the visualization component props
- Scoring parameters are tunable at runtime via updateConfig for SCORE-06 sensitivity control

## Self-Check: PASSED

- FOUND: src/lib/focus-algorithm.ts
- FOUND: src/hooks/useFocusScore.ts
- FOUND: commit 9f40f27
- FOUND: commit f53b373

---
*Phase: 02-focus-scoring-visualization*
*Completed: 2026-02-08*
