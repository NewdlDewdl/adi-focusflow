# Project State: FocusFlow

**Last Updated:** 2026-02-08
**Current Phase:** Phase 7 - Fix Face Mesh Color Calibration and Focus Score Accuracy (Plan 1 of 2 complete)
**Status:** Focus scoring algorithm fixed, face mesh color calibration next

## Current Milestone

**Milestone:** Core Demo Loop (Phases 1-3) + Session Management (Phase 4) + Bug Fixes (Phase 7)
**Status:** Phase 7 in progress (1/2 plans complete)
**Progress:** 3/6 phases complete, phase 7 plan 1 done
**Progress bar:** ██████████████░░░░░░ (Phase 7: 1/2 plans)

## Recent Changes (Last 7 Days)

### 2026-02-08
- **Plan 07-01 Complete:** Fix Focus Score Algorithm
  - Fixed gaze bearing to measure deviation from 90-degree center (GAZE_CENTER_DEG=90)
  - Rebalanced weights: head=0.6, gaze=0.2, face=0.2
  - Applied gazeStrength floor of 0.5 when face detected (displacement metric fix)
  - Widened gazeThresholdDeg from 25 to 30
  - Implemented sustained distraction timer: 1s eval interval, 3 consecutive seconds required
  - Score strictly monotonically decreasing (no recovery code path)
  - Reduced console logging to score-change-only events

- **Plan 04-02 Complete:** Session UI Controls & DetectionProvider Integration
  - SessionControls component with idle CTA, running/paused control bar, wall-clock timer, live metrics
  - SessionTimeline Recharts AreaChart with gradient fill, focus threshold reference line
  - SessionSummary overlay with stats grid, timeline chart, personal best callout
  - Session page rewritten as client component orchestrating idle/running/ended states
  - DetectionProvider accepts session lifecycle props (sessionPhase, onTick, onDistraction)
  - beforeunload navigation guard during active sessions
  - Dashboard data refresh pattern for Plan 04-03 consumption

- **Plan 04-01 Complete:** Session Management Foundation
  - useSessionManager hook with useReducer state machine
  - Session types, localStorage persistence, streak calculation, personal bests
  - Reset functions on useFocusScore, useFocusChime, useAICoaching

- **Phase 3 Complete:** AI Coaching Nudges fully implemented
  - Coaching engine with state machine (timing, escalation, recovery)
  - Gemini 2.5 Flash integration for contextual coaching text
  - ElevenLabs Flash v2.5 TTS with server-side caching
  - NudgeIndicator component with tier-colored styling

### 2026-02-07
- **Phase 2 Complete:** Focus Scoring & Visualization

## Active Work

**Current:** Phase 7 - Fix Face Mesh Color Calibration (Plan 07-02 next)
**Last Completed:** 07-01-PLAN.md (Fix Focus Score Algorithm)
**Next:** Plan 07-02 (Face mesh color calibration: blue/purple during calibration, green-to-red post-calibration)
**Blocked:** None

## Technical Debt

- [ ] Add proper error boundaries for React components
- [ ] Implement retry logic for API failures (Gemini, ElevenLabs)
- [ ] Add E2E tests for coaching pipeline
- [ ] Optimize tensor memory usage in long sessions (>1 hour)
- [ ] Add loading states for API calls

## Known Issues

- [x] ~~Score decreases prematurely when looking at camera~~ (FIXED in 07-01: gaze center, weight rebalance, sustained distraction)
- [ ] Calibration progress bar animation can lag on slower devices
- [ ] SpeechSynthesis onend sometimes doesn't fire (10s timeout mitigates this)
- [ ] Chime recovery logic may need updating for monotonic score model (see 07-RESEARCH.md pitfall 6)

## Environment Status

**Development:**
- Next.js 15 with Turbopack
- Human.js detection running at ~5 FPS
- Gemini API integrated (requires GEMINI_API_KEY)
- ElevenLabs TTS integrated (requires ELEVENLABS_API_KEY)
- All builds passing

**API Keys Required:**
- `GEMINI_API_KEY` - Google AI Studio
- `ELEVENLABS_API_KEY` - ElevenLabs

## Metrics

**Phase Completion:**
- Phase 1: Not started (3 plans)
- Phase 2: Complete (3/3 plans, 2026-02-07)
- Phase 3: Complete (2/2 plans, 2026-02-08)
- Phase 4: In progress (2/3 plans, 2026-02-08)
- Phase 5: Not started (stretch goal)
- Phase 6: Not started (polish/enhancements)
- Phase 7: In progress (1/2 plans, 2026-02-08)

**Code Stats:**
- Total commits: ~25+
- Active files: ~35
- API routes: 3 (coaching/generate, coaching/precache, elevenlabs/speak)
- React hooks: 6 (useWebcamPermission, useHumanDetection, useFocusScore, useFocusChime, useAICoaching, useSessionManager)
- Components: ~18 (added SessionControls, SessionTimeline, SessionSummary)

## Next Steps

1. **Plan 07-02:** Face Mesh Color Calibration - blue/purple during calibration, green-to-red post-calibration
2. **Plan 04-03:** Session History & Streaks - SessionHistory list, StreakBadge, PersonalBests, pre-session dashboard
3. **Phase 4 UAT:** End-to-end session lifecycle verification

## Dependencies

**External Services:**
- Google Gemini API (text generation)
- ElevenLabs API (voice synthesis)
- Browser SpeechSynthesis (fallback)

**Browser Requirements:**
- Chrome/Edge (primary targets)
- Webcam permission required
- WebGL for TensorFlow.js

## Roadmap Evolution

### Phases Added
- **[2026-02-08]** Phase 7: Fix Face Mesh Color Calibration and Focus Score Accuracy - addresses critical bugs in color feedback and score stability

## Decisions Log

### Recent Decisions
1. **[2026-02-08]** GAZE_CENTER_DEG=90: Human.js gaze bearing centered at PI/2 radians, deviation measured from center
2. **[2026-02-08]** gazeStrength floored at 0.5 when face detected (displacement metric, not confidence)
3. **[2026-02-08]** Weights rebalanced: head=0.6, gaze=0.2, face=0.2 (head pose most reliable)
4. **[2026-02-08]** DISTRACTED_THRESHOLD=45 (safe distance from natural focused baseline of 70-95)
5. **[2026-02-08]** EVAL_INTERVAL_MS=1000 with SUSTAINED_SECONDS_REQUIRED=3 (1s evals, 3s sustained before penalty)
6. **[2026-02-08]** DetectionProvider only mounted during running/paused phase (dynamic import saves resources when idle)
7. **[2026-02-08]** Score changes always call onTick; reducer guards on phase=running (paused ticks ignored)
8. **[2026-02-08]** Timer state lives inside SessionControls only (avoids re-rendering entire tree)
9. **[2026-02-08]** Dashboard data refreshed on mount and after dismiss (immediate freshness for 04-03)
10. **[2026-02-08]** useReducer for session state machine (no new dependency, predictable transitions)
11. **[2026-02-08]** localStorage for session persistence (data < 100KB, no IndexedDB needed)
12. **[2026-02-08]** Sessions under 60s not persisted (prevents accidental starts polluting history)
13. **[2026-02-08]** Snapshots downsampled to 120 points for storage (one per ~30s for 60-min session)
14. **[2026-02-08]** Reset functions preserve calibration and audio cache (expensive to regenerate)
15. **[2026-02-08]** Phase 6 added: Polish & Visual Enhancements - dynamic face mesh color based on focus score
16. **[2026-02-08]** Focus score only decreases (no increase) - simpler "survival mode"
17. **[2026-02-08]** Escalation persists across session (resets only on sustained high focus)
18. **[2026-02-08]** Pre-cache audio on session start (fire-and-forget, non-blocking)
19. **[2026-02-07]** Head pose weighted higher than gaze (70% vs 20%) - reliability over accuracy

### Historical Decisions
- Chose Human.js over MediaPipe (browser-native, no backend)
- Chose Next.js App Router over Pages (modern, streaming)
- Chose ElevenLabs Flash v2.5 over Turbo (latency: 75ms vs 450ms)
- Chose Gemini 2.5 Flash over GPT-4 (cost, caching, performance)

## Session Continuity

**Last session:** 2026-02-08
**Stopped at:** Completed 07-01-PLAN.md
**Resume:** .planning/phases/07-fix-face-mesh-color-calibration-and-focus-score-accuracy/07-02-PLAN.md

---
*Updated: 2026-02-08*
*Status: Phase 7 In Progress (1/2 plans complete)*
