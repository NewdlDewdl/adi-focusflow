# Roadmap: FocusFlow

## Overview

FocusFlow delivers an AI-powered focus coaching tool in six phases following a strict validation-before-expansion sequence. The webcam detection pipeline must be proven stable before scoring consumes it, scoring must be trustworthy before coaching reacts to it, and the full solo experience must work before session persistence adds polish. Each phase delivers a coherent, independently verifiable capability that unblocks the next. Blockchain rewards are a stretch goal attempted only after the core demo loop is complete, followed by visual polish enhancements.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Webcam Detection Pipeline** - Stable, performant webcam-based face/gaze/pose detection with explicit memory management
- [x] **Phase 2: Focus Scoring & Visualization** - Real-time 0-100 focus score from detection data with animated visual feedback
- [ ] **Phase 3: AI Coaching Nudges** - Context-aware voice coaching triggered by sustained distraction with cooldown and escalation
- [ ] **Phase 4: Session Management** - Complete session lifecycle with metrics, history, streaks, and responsive UI
- [ ] **Phase 5: Blockchain Rewards (Stretch)** - Solana devnet token minting as optional gamification layer
- [ ] **Phase 6: Polish & Visual Enhancements** - Dynamic face mesh color feedback and UI refinements
- [ ] **Phase 7: Fix Face Mesh Color Calibration and Focus Score Accuracy** - Correct calibration gradient (blue/purple), post-calibration baseline (green with yellow/orange/red misalignment feedback), and fix premature score decreases
- [ ] **Phase 8: Warm Theme UI Migration** - Migrate warm theme visual design (color palette, gradients, glass morphism, typography) from /warm to main page while preserving video detection
- [ ] **Phase 9: Warm Interactive Elements & Testing** - Add Navigation tabs, Analytics toggle, and comprehensive E2E testing for warm theme

## Phase Details

### Phase 1: Webcam Detection Pipeline
**Goal**: Users see stable, real-time face and gaze tracking running in their browser without crashes or lag
**Depends on**: Nothing (first phase)
**Requirements**: DETECT-01, DETECT-02, DETECT-03, DETECT-04, DETECT-05, DETECT-06, DETECT-07, PERF-01, PERF-02, PERF-03, PERF-04, PERF-05
**Success Criteria** (what must be TRUE):
  1. User can grant webcam permission with a clear pre-permission screen explaining that video never leaves the device, and sees a persistent privacy indicator during use
  2. User sees their face detected in real-time with visible gaze direction and head pose data overlaid on the video feed
  3. User can observe the current FPS rate displayed in a monitoring panel and it stays above 15 FPS during normal use
  4. Application runs for 30 continuous minutes without crashing, freezing, or accumulating memory (tensor count stays flat)
  5. User who denies or dismisses webcam permission sees a clear, helpful error message with instructions to recover
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md -- Project scaffold, Human.js config, webcam permission flow with privacy UI
- [ ] 01-02-PLAN.md -- Detection loop, webcam view with face/gaze/pose canvas overlay
- [ ] 01-03-PLAN.md -- Performance monitoring panel, tensor leak detection, 30-minute stability verification

### Phase 2: Focus Scoring & Visualization
**Goal**: Users see a live, trustworthy focus score that responds to real attention changes without false alarms
**Depends on**: Phase 1
**Requirements**: SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05, SCORE-06, UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. User sees a live 0-100 focus score displayed prominently in an animated circular ring that updates in real-time
  2. User who looks away briefly (1-2 seconds) sees no score change, while sustained look-away (8-10+ seconds) causes a gradual score decline with visual color/animation changes
  3. User sees a sparkline chart showing focus score trend over the session and stat cards summarizing current metrics
  4. User (or demo operator) can adjust scoring sensitivity through a tunable control to calibrate for different environments
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md -- Install dependencies, UI primitives (cn, Button), Hero landing page with routing
- [ ] 02-02-PLAN.md -- Focus scoring algorithm (pure functions) and useFocusScore hook
- [ ] 02-03-PLAN.md -- Score visualization (ring, sparkline, stat cards, sensitivity slider) wired to live data

### Phase 3: AI Coaching Nudges
**Goal**: Users receive timely, contextual voice coaching when distracted, with natural audio that feels helpful rather than annoying
**Depends on**: Phase 2
**Requirements**: COACH-01, COACH-02, COACH-03, COACH-04, COACH-05, COACH-06, COACH-07, COACH-08, COACH-09, COACH-10, UI-04
**Success Criteria** (what must be TRUE):
  1. User who is distracted for a sustained period hears a spoken coaching nudge through their speakers within 2 seconds of the trigger threshold
  2. User never receives a nudge during the first 60 seconds of a session, never receives nudges closer than 30 seconds apart, and never receives a nudge while their focus score is actively recovering
  3. User experiences escalating nudge intensity (gentle to medium to direct) across consecutive distraction events within a session
  4. User sees a visual nudge indicator on screen during voice playback
  5. Application continues delivering nudges (via browser speech fallback) even when ElevenLabs API is unavailable or quota is exhausted
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md -- Coaching engine (timing/escalation logic), Gemini API route, ElevenLabs upgrade with caching
- [x] 03-02-PLAN.md -- Rewrite useAICoaching hook, NudgeIndicator component, wire into DetectionProvider

### Phase 4: Session Management
**Goal**: Users can run complete focus sessions with start/pause/end lifecycle, review their performance afterward, and track progress over time
**Depends on**: Phase 3
**Requirements**: SESSION-01, SESSION-02, SESSION-03, SESSION-04, SESSION-05, SESSION-06, SESSION-07, SESSION-08, SESSION-09, SESSION-10, UI-05
**Success Criteria** (what must be TRUE):
  1. User can start a focus session with one click, see an elapsed timer, pause/resume, and end the session manually
  2. User sees live session metrics during the session (focused time, distraction count) and a comprehensive summary after ending (total time, average score, focused percentage)
  3. User can view past sessions in a timeline showing when focus dropped during each session, along with personal bests (longest focus streak, highest score)
  4. User's focus streak (consecutive days with sessions) is tracked and displayed, with session history persisting across browser sessions
  5. Interface works correctly on desktop Chrome and Edge browsers with a responsive layout
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md -- Session types, storage layer, state machine hook, reset functions for existing hooks
- [ ] 04-02-PLAN.md -- Session controls, timeline chart, summary overlay, page rewrite with lifecycle integration
- [ ] 04-03-PLAN.md -- Pre-session dashboard (history, streak, personal bests), responsive layout verification

### Phase 5: Blockchain Rewards (Stretch)
**Goal**: Users earn token rewards on Solana devnet for focused work, with the blockchain layer never blocking the core focus experience
**Depends on**: Phase 4
**Requirements**: BLOCK-01, BLOCK-02, BLOCK-03, BLOCK-04, BLOCK-05, BLOCK-06
**Success Criteria** (what must be TRUE):
  1. User can connect their Phantom wallet and see it linked to their FocusFlow session
  2. User receives FOCUS tokens on Solana devnet after completing a session, calculated at 1 token per 5 minutes of focused time with bonus multipliers for high scores and active streaks
  3. Application shows "rewards pending" and continues functioning normally when Solana devnet is unavailable, with automatic retry when connectivity returns
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: Polish & Visual Enhancements
**Goal**: Users see their face mesh visualization change color in real-time based on their focus score, providing immediate visual feedback as a polish enhancement
**Depends on**: Phase 5
**Requirements**: VISUAL-01, VISUAL-02, UI-06
**Success Criteria** (what must be TRUE):
  1. User sees the face mesh gradient change color dynamically based on focus score (0-25: red, 25-50: orange, 50-75: yellow, 75-100: green)
  2. Stacked text metrics (to the right of face mesh) are only visible during calibration and are automatically removed once calibration is complete
  3. Color transitions are smooth and provide clear visual feedback without being distracting
**Plans**: 1 plan

Plans:
- [ ] 06-01-PLAN.md -- Smooth color lerp, conditional metrics hiding, console.log cleanup

### Phase 7: Fix Face Mesh Color Calibration and Focus Score Accuracy

**Goal**: Fix critical issues with face mesh visualization and focus scoring to provide accurate, reliable feedback
**Depends on**: Phase 6
**Requirements**: SCORE-01, SCORE-02, SCORE-03, SCORE-05, SCORE-06
**Success Criteria** (what must be TRUE):
  1. During calibration, face mesh shows blue/purple gradient (not gray)
  2. After calibration, face mesh starts green (score=100) and transitions through yellow, orange, red as score decreases
  3. Score stays at 100 when user looks directly at camera for 30+ seconds
  4. Score only decreases after 3+ consecutive seconds of sustained distraction
  5. Score never increases once it has dropped (monotonically decreasing)
  6. Chime stops when user refocuses, despite display score staying flat
**Plans:** 2 plans

Plans:
- [ ] 07-01-PLAN.md -- Fix gaze bearing center, rebalance scoring weights, implement sustained distraction timer
- [ ] 07-02-PLAN.md -- Fix calibration/post-calibration colors, fix chime recovery for monotonic score

### Phase 8: Warm Theme UI Migration

**Goal**: Transform the main landing page (localhost:3000) to use the warm beige theme from /warm while preserving all video detection functionality
**Depends on**: Phase 7
**Requirements**: UI styling migration
**Success Criteria** (what must be TRUE):
  1. Landing page displays warm beige/cream background (#FDFBF7) with animated gradient blobs
  2. Glass morphism effects applied to UI cards with backdrop-blur
  3. Typography uses serif font for headings with warm color palette (coral/terracotta accents)
  4. All text uses dark brown (#43302B) with good contrast
  5. Video detection system remains completely untouched and functional
  6. Playwright tests verify video detection integrity after theme migration
**Plans**: 1 plan

Plans:
- [ ] 08-01-PLAN.md -- Create warm theme CSS module, update Hero component, migrate color palette, add animations and glass effects

### Phase 9: Warm Interactive Elements & Testing

**Goal**: Complete warm theme migration by adding navigation tabs and analytics toggle with comprehensive E2E testing
**Depends on**: Phase 8
**Requirements**: Interactive UI components
**Success Criteria** (what must be TRUE):
  1. Navigation tabs (Solo/Multiplayer/Dashboard) display with glass morphism at top center
  2. Analytics toggle positioned at top left with warm green active state
  3. All interactive elements use warm theme colors with hover effects
  4. Comprehensive Playwright test suite verifies entire warm theme integration
  5. Video detection remains completely functional
**Plans**: 1 plan

Plans:
- [ ] 09-01-PLAN.md -- Create Navigation and AnalyticsToggle components, add comprehensive E2E tests

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Webcam Detection Pipeline | 0/3 | Planned | - |
| 2. Focus Scoring & Visualization | 3/3 | ✓ Complete | 2026-02-07 |
| 3. AI Coaching Nudges | 2/2 | ✓ Complete | 2026-02-08 |
| 4. Session Management | 0/3 | Planned | - |
| 5. Blockchain Rewards (Stretch) | 0/TBD | Not started | - |
| 6. Polish & Visual Enhancements | 0/TBD | Not started | - |
| 7. Fix Face Mesh Color Calibration and Focus Score Accuracy | 0/2 | Not started | - |
| 8. Warm Theme UI Migration | 0/1 | Planned | - |
| 9. Warm Interactive Elements & Testing | 0/1 | Planned | - |
