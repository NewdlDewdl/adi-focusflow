# Roadmap: FocusFlow

## Overview

FocusFlow delivers an AI-powered focus coaching tool in five phases following a strict validation-before-expansion sequence. The webcam detection pipeline must be proven stable before scoring consumes it, scoring must be trustworthy before coaching reacts to it, and the full solo experience must work before session persistence adds polish. Each phase delivers a coherent, independently verifiable capability that unblocks the next. Blockchain rewards are a stretch goal attempted only after the core demo loop is complete.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Webcam Detection Pipeline** - Stable, performant webcam-based face/gaze/pose detection with explicit memory management
- [ ] **Phase 2: Focus Scoring & Visualization** - Real-time 0-100 focus score from detection data with animated visual feedback
- [ ] **Phase 3: AI Coaching Nudges** - Context-aware voice coaching triggered by sustained distraction with cooldown and escalation
- [ ] **Phase 4: Session Management** - Complete session lifecycle with metrics, history, streaks, and responsive UI
- [ ] **Phase 5: Blockchain Rewards (Stretch)** - Solana devnet token minting as optional gamification layer

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
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: Focus Scoring & Visualization
**Goal**: Users see a live, trustworthy focus score that responds to real attention changes without false alarms
**Depends on**: Phase 1
**Requirements**: SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05, SCORE-06, UI-01, UI-02, UI-03
**Success Criteria** (what must be TRUE):
  1. User sees a live 0-100 focus score displayed prominently in an animated circular ring that updates in real-time
  2. User who looks away briefly (1-2 seconds) sees no score change, while sustained look-away (8-10+ seconds) causes a gradual score decline with visual color/animation changes
  3. User sees a sparkline chart showing focus score trend over the session and stat cards summarizing current metrics
  4. User (or demo operator) can adjust scoring sensitivity through a tunable control to calibrate for different environments
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

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
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

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
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

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

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Webcam Detection Pipeline | 0/TBD | Not started | - |
| 2. Focus Scoring & Visualization | 0/TBD | Not started | - |
| 3. AI Coaching Nudges | 0/TBD | Not started | - |
| 4. Session Management | 0/TBD | Not started | - |
| 5. Blockchain Rewards (Stretch) | 0/TBD | Not started | - |
