# Requirements: FocusFlow

**Defined:** 2026-02-07
**Core Value:** Users must receive accurate, real-time awareness of when they're losing focus through webcam-based eye and head tracking

## v1 Requirements

Requirements for initial hackathon demo. Each maps to roadmap phases.

### Webcam Detection

- [ ] **DETECT-01**: User can grant webcam permissions with clear privacy messaging
- [ ] **DETECT-02**: System displays "video never leaves your device" privacy indicator
- [ ] **DETECT-03**: System detects face presence in webcam feed in real-time
- [ ] **DETECT-04**: System tracks eye gaze direction using Human.js iris tracking
- [ ] **DETECT-05**: System tracks head pose (yaw, pitch, roll) using Human.js
- [ ] **DETECT-06**: System handles webcam permission denied/dismissed gracefully with helpful error messages
- [ ] **DETECT-07**: System maintains >15 FPS detection rate without UI lag

### Focus Scoring

- [ ] **SCORE-01**: System computes focus score (0-100) from eye gaze + head pose data
- [ ] **SCORE-02**: Focus score uses time-windowed algorithm (5-10 second windows, not per-frame)
- [ ] **SCORE-03**: Focus score includes hysteresis to prevent rapid fluctuations
- [ ] **SCORE-04**: User sees live focus score displayed prominently
- [ ] **SCORE-05**: Visual feedback changes (color, animation) when focus drops
- [ ] **SCORE-06**: Focus score sensitivity is tunable for demo adjustments

### Performance & Monitoring

- [ ] **PERF-01**: System monitors and displays current FPS rate
- [ ] **PERF-02**: System monitors WebGL tensor count to detect memory leaks
- [ ] **PERF-03**: System disposes tensors explicitly to prevent browser crashes
- [ ] **PERF-04**: Detection loop runs at 200ms intervals (5 Hz), not max framerate
- [ ] **PERF-05**: System validates 30-minute sustained session without crashes

### AI Coaching

- [ ] **COACH-01**: System generates contextual coaching text using Gemini 2.5 Flash API
- [ ] **COACH-02**: System converts coaching text to speech using ElevenLabs Flash v2.5
- [ ] **COACH-03**: System speaks voice nudges through audio playback
- [ ] **COACH-04**: System enforces 30-second minimum cooldown between nudges
- [ ] **COACH-05**: System pre-caches 20-30 common nudge audio clips for instant playback
- [ ] **COACH-06**: System falls back to browser SpeechSynthesis if ElevenLabs fails
- [ ] **COACH-07**: System implements escalation tiers (gentle → medium → direct)
- [ ] **COACH-08**: System never nudges during first 60 seconds of session
- [ ] **COACH-09**: System never nudges when focus score is actively recovering
- [ ] **COACH-10**: Nudge trigger-to-playback latency is <2 seconds

### Session Management

- [ ] **SESSION-01**: User can start a focus session with one click
- [ ] **SESSION-02**: User can pause and resume session
- [ ] **SESSION-03**: User can end session manually
- [ ] **SESSION-04**: System displays session timer (elapsed time)
- [ ] **SESSION-05**: System displays current session metrics (focused time, distraction count)
- [ ] **SESSION-06**: System shows session summary after session ends (total time, avg score, focused %)
- [ ] **SESSION-07**: System tracks focus streak (consecutive days with sessions)
- [ ] **SESSION-08**: System stores session history with timestamps
- [ ] **SESSION-09**: User can view past session timeline
- [ ] **SESSION-10**: System tracks personal bests (longest focus, highest score)

### User Interface

- [ ] **UI-01**: User sees animated focus score ring (SVG circular progress)
- [ ] **UI-02**: User sees focus score sparkline chart (Framer Motion)
- [ ] **UI-03**: User sees stat cards for session metrics
- [ ] **UI-04**: User sees visual nudge indicator during voice playback
- [ ] **UI-05**: Interface is responsive and works on desktop browsers (Chrome/Edge)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Multiplayer

- **MULTI-01**: User can create multiplayer study room with unique code
- **MULTI-02**: User can join existing room using code
- **MULTI-03**: User sees live leaderboard ranked by focus score
- **MULTI-04**: User sees peer score cards with real-time updates
- **MULTI-05**: Room supports 2-5 concurrent participants
- **MULTI-06**: System broadcasts score updates via Socket.io
- **MULTI-07**: System supports collaborative group goals
- **MULTI-08**: System handles disconnect/reconnect gracefully

### Mobile & Deployment

- **DEPLOY-01**: Application runs on DigitalOcean with Docker
- **DEPLOY-02**: Application has public URL with SSL
- **DEPLOY-03**: Mobile-responsive design for tablet/phone

### Advanced Features

- **ADV-01**: Calendar integration for auto-scheduling sessions
- **ADV-02**: Customizable voice personas for coaching
- **ADV-03**: Team/organization dashboards
- **ADV-04**: Spotify playlist integration

## v1 Stretch Goals

Optional features if time permits after core is complete.

### Blockchain Rewards

- [ ] **BLOCK-01**: User can connect Phantom wallet
- [ ] **BLOCK-02**: System mints FOCUS tokens on Solana devnet after session
- [ ] **BLOCK-03**: System awards 1 token per 5 minutes of focused time
- [ ] **BLOCK-04**: System applies bonus multipliers for high scores (>80)
- [ ] **BLOCK-05**: System applies 3x multiplier for active streaks
- [ ] **BLOCK-06**: System gracefully degrades when Solana devnet is unavailable

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Continuous webcam recording/playback | Privacy nightmare, massive liability, storage costs |
| Website/app blocking | Different problem space; FocusFlow detects and coaches, doesn't restrict |
| Global public leaderboards | Encourages gaming, toxic comparison; room-scoped only in v2 |
| Complex achievement badges (50+) | Over-engineered gamification causes burnout |
| Calendar integration | Different problem space (when to study vs staying focused) |
| Background music/ambient sounds | Users already have Spotify; out of scope |
| OAuth/social login | Email/password or session storage sufficient for hackathon |
| Video/screen recording | Privacy concerns, storage complexity |
| Mobile native apps | Web-first for hackathon; mobile later |
| Second monitor detection | Too complex; focus on single-screen users |
| Browser tab tracking | Different distraction model; webcam is the differentiator |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DETECT-01 | Phase 1 | Pending |
| DETECT-02 | Phase 1 | Pending |
| DETECT-03 | Phase 1 | Pending |
| DETECT-04 | Phase 1 | Pending |
| DETECT-05 | Phase 1 | Pending |
| DETECT-06 | Phase 1 | Pending |
| DETECT-07 | Phase 1 | Pending |
| PERF-01 | Phase 1 | Pending |
| PERF-02 | Phase 1 | Pending |
| PERF-03 | Phase 1 | Pending |
| PERF-04 | Phase 1 | Pending |
| PERF-05 | Phase 1 | Pending |
| SCORE-01 | Phase 2 | Pending |
| SCORE-02 | Phase 2 | Pending |
| SCORE-03 | Phase 2 | Pending |
| SCORE-04 | Phase 2 | Pending |
| SCORE-05 | Phase 2 | Pending |
| SCORE-06 | Phase 2 | Pending |
| UI-01 | Phase 2 | Pending |
| UI-02 | Phase 2 | Pending |
| UI-03 | Phase 2 | Pending |
| COACH-01 | Phase 3 | Pending |
| COACH-02 | Phase 3 | Pending |
| COACH-03 | Phase 3 | Pending |
| COACH-04 | Phase 3 | Pending |
| COACH-05 | Phase 3 | Pending |
| COACH-06 | Phase 3 | Pending |
| COACH-07 | Phase 3 | Pending |
| COACH-08 | Phase 3 | Pending |
| COACH-09 | Phase 3 | Pending |
| COACH-10 | Phase 3 | Pending |
| UI-04 | Phase 3 | Pending |
| SESSION-01 | Phase 4 | Pending |
| SESSION-02 | Phase 4 | Pending |
| SESSION-03 | Phase 4 | Pending |
| SESSION-04 | Phase 4 | Pending |
| SESSION-05 | Phase 4 | Pending |
| SESSION-06 | Phase 4 | Pending |
| SESSION-07 | Phase 4 | Pending |
| SESSION-08 | Phase 4 | Pending |
| SESSION-09 | Phase 4 | Pending |
| SESSION-10 | Phase 4 | Pending |
| UI-05 | Phase 4 | Pending |
| BLOCK-01 | Phase 5 (Stretch) | Pending |
| BLOCK-02 | Phase 5 (Stretch) | Pending |
| BLOCK-03 | Phase 5 (Stretch) | Pending |
| BLOCK-04 | Phase 5 (Stretch) | Pending |
| BLOCK-05 | Phase 5 (Stretch) | Pending |
| BLOCK-06 | Phase 5 (Stretch) | Pending |

**Coverage:**
- v1 must-have requirements: 43 total
- Mapped to phases: 43/43
- v1 stretch requirements: 6 total
- Mapped to phases: 6/6 (Phase 5)
- Unmapped: 0

---
*Requirements defined: 2026-02-07*
*Last updated: 2026-02-07 after roadmap creation*
