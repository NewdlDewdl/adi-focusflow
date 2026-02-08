# Project Research Summary

**Project:** FocusForce - AI-Powered Focus Tracking with Voice Coaching
**Domain:** Real-time webcam-based attention tracking and productivity coaching
**Researched:** 2026-02-07
**Confidence:** HIGH

## Executive Summary

FocusForce is a real-time webcam-based focus tracking application that uses computer vision to detect user attention and provides AI-generated voice coaching nudges when distraction is detected. Research shows this represents a unique market position—no existing competitor combines real-time physical attention detection (via gaze tracking and head pose) with immediate AI voice coaching. The product sits between passive analytics tools (Rize, RescueTime) that report after-the-fact, and social accountability tools (Focusmate, StudyTogether) that rely on human presence rather than objective measurement.

The recommended technical approach centers on `@vladmandic/human` v3.2.1 as the ML backbone running entirely client-side via WebGL, eliminating privacy concerns while achieving 5-15 FPS detection rates sufficient for real-time feedback. The architecture separates concerns cleanly: Next.js 15 handles the client-side detection and UI, while a standalone Express 5 + Socket.io server manages multiplayer rooms and API orchestration for Gemini 2.5 Flash (coaching text generation) and ElevenLabs Flash v2.5 (text-to-speech). This separation is deliberate—Next.js App Router doesn't support persistent WebSocket lifecycles, making a dedicated WebSocket server non-negotiable for multiplayer features.

The primary technical risks are WebGL memory leaks causing browser crashes during 15-20 minute sessions (the exact target session length), false positive distraction detection eroding user trust, and API latency making voice nudges feel delayed or out-of-sync. Prevention requires explicit tensor disposal in the detection loop, time-windowed scoring algorithms with grace periods, and aggressive nudge caching with browser SpeechSynthesis fallbacks. The research identifies these as Phase 1 and Phase 3 concerns that must be validated before proceeding to multiplayer complexity.

## Key Findings

### Recommended Stack

The stack centers on proven, battle-tested technologies with a single bleeding-edge exception: `@vladmandic/human` v3.2.1, which is both the centerpiece and the most critical dependency.

**Core technologies:**
- **@vladmandic/human v3.2.1**: Client-side face detection, gaze tracking, head pose estimation, and emotion analysis via TensorFlow.js 4.17.0 (bundled). Released Feb 2025. This is the make-or-break component—provides face mesh, iris tracking, and rotation angles in a unified API without calibration. Eliminates the need to stitch together multiple ML libraries or deal with WebGazer.js's noisy calibration flow.
- **Next.js 15.x + React 19.x**: Meta-framework for frontend. App Router for routing, but webcam processing is pure client-side (no SSR involvement). Chosen because it's specified in PROJECT.md and provides excellent TypeScript + Tailwind integration out of the box.
- **Express 5.x + Socket.io 4.8.x**: Separate backend server for real-time bidirectional communication. Express 5 is now npm default (stable since March 2025) with promise-based error handling. Socket.io handles room management, score broadcasting, and nudge relay with built-in reconnection logic.
- **@google/genai v1.40.0**: Unified Gemini SDK (GA since May 2025) for coaching text generation. The old `@google/generative-ai` package is officially deprecated with support ended Aug 2025—using it would be a critical mistake. Gemini 2.5 Flash provides sub-second responses at free-tier friendly rates.
- **@elevenlabs/elevenlabs-js v2.x**: Official ElevenLabs SDK for text-to-speech. Use `eleven_flash_v2_5` model specifically for ~75ms latency vs. 2-5x slower for standard models. This latency difference is the gap between nudges feeling responsive vs. disjointed.
- **Tailwind CSS v4.x**: Utility-first CSS. v4.0 released Jan 2025 with 5x faster builds and CSS-native approach. Targets Chrome 111+ which aligns with desktop Chrome/Edge constraint from PROJECT.md.

**Critical version dependencies:**
- Human.js bundles TensorFlow.js 4.17.0 internally—do NOT install @tensorflow/tfjs separately (causes version conflicts)
- Socket.io client and server versions must match on major.minor (both 4.8.x)
- Express 5 requires Node.js ≥ 18

**What NOT to use:**
- `@google/generative-ai` (deprecated, support ended)
- `react-webcam` (unmaintained, last update 2+ years ago)
- `WebGazer.js` (requires calibration, no head pose, noisier than Human.js)
- `face-api.js` (abandoned, Human.js is the successor by the same author)

### Expected Features

Based on competitive analysis across Centered, Focusmate, StudyTogether, Forest, Rize, and 10+ other productivity tools, the feature landscape divides into three tiers.

**Must have (table stakes):**
- Session timer with start/stop/pause — every focus tool has this; users need session boundaries
- Live focus score (0-100) — if you claim to track focus, it must be visible in real-time or users won't trust it
- Visual distraction feedback — users need immediate awareness when focus drops (color shift, animation)
- Session summary stats — total time, focused time, distraction count, average score (payoff moment)
- Camera permission flow with privacy messaging — webcam access triggers anxiety; "video never leaves your device" messaging is critical
- Nudge cooldown (30s minimum) — rapid notifications are the #1 complaint across productivity tools

**Should have (competitive advantage):**
- **Webcam-based attention detection** — this is the core differentiator. No mainstream consumer focus app does real-time gaze + head pose tracking. Centered detects tab switches; Forest detects phone usage; Focusmate uses social accountability. None use actual webcam ML inference.
- **AI voice coaching nudges (Gemini + ElevenLabs)** — Centered uses text nudges; no competitor uses spoken coaching. Voice is harder to ignore and feels more like a coach than a notification.
- **Multiplayer focus rooms with leaderboard** — StudyTogether and StudyStream have rooms, but leaderboards rank time-in-room, not actual attention. FocusFlow can rank by verified focus score, which is more meaningful.
- **Contextual nudge escalation** — gentle nudge at 10s distraction, medium at 30s, direct at 60s+ (mirrors how real coaches behave)
- **Focus streak tracking** — proven retention mechanic (Duolingo saw 116% jump in referrals from streaks)

**Defer to v2+ (explicitly NOT building for v1):**
- Website/app blocking — scope creep, not the product's job (detect and coach, don't restrict)
- Continuous webcam recording/playback — privacy nightmare, massive liability
- Public global leaderboards — encourages gaming, toxic comparison; room-scoped only
- Complex achievement systems (50+ badges) — over-engineering gamification
- Calendar integration — different problem space (when to study vs. staying focused)
- Background music/ambient sounds — users already have Spotify; out of scope

### Architecture Approach

The architecture follows a strict client-server separation with all ML inference on the client to preserve privacy and minimize latency. The client runs a requestAnimationFrame-based detection loop at 5 FPS (200ms intervals) processing webcam frames through Human.js, computing focus scores locally, and emitting only numeric scores to the server via Socket.io. The server is stateless regarding ML—it receives scores, manages room state, triggers nudge generation when thresholds + cooldowns align, and broadcasts updates.

**Major components:**

1. **Client-Side Detection Pipeline (Human.js + Custom Hook)** — Webcam access via native getUserMedia (no react-webcam dependency), Human.js configured with only face detection + mesh + iris enabled (body/hand/gesture/emotion disabled for performance), throttled detection loop at 200ms intervals, pure function for score computation from gaze bearing + head pose angles. This runs at ~50ms per detection frame on modern GPUs, leaving 150ms headroom for UI rendering. All processing client-side means video never leaves the device.

2. **Real-Time Communication Layer (Socket.io Client/Server)** — Separate Express server on port 3001 (Next.js on 3000) specifically because Next.js custom servers break HMR and serverless optimization. Socket.io manages room membership, broadcasts score deltas (not full state) to reduce payload size, and relays AI-generated nudges. Room state is an in-memory Map for the hackathon (MongoDB optional). Reconnection logic is built into Socket.io by default.

3. **AI Coaching Pipeline (Sequential: Gemini → ElevenLabs)** — Server-side only (API keys never exposed to client). Cooldown-gated: checks last nudge timestamp before proceeding. Sequential pipeline: Gemini generates 6-word coaching text (~500ms), ElevenLabs converts to speech (~500-1500ms), audio returned as base64 MP3 via Socket.io emit. Total latency budget: 1-3 seconds from trigger to playback, which is acceptable because coaching nudges feel natural with slight delay (not frame-critical like score updates).

**Key architectural patterns:**
- **Client-only ML detection loop** — all inference in browser via WebGL, no server round-trip for video
- **Score-then-emit** — client computes score and sends only the number, server relays/broadcasts
- **Cooldown-gated nudge pipeline** — expensive API calls protected by 30s minimum cooldown

**Anti-patterns avoided:**
- Sending video frames to server (latency + privacy violation)
- Running detection at 60 FPS (memory pressure, UI jank)
- Embedding Socket.io in Next.js custom server (couples build/dev, breaks HMR)
- Generating nudges on client (exposes API keys)

### Critical Pitfalls

Research identified 6 critical pitfalls with the highest impact on hackathon success. The first two will cause immediate failure during demos if not addressed in Phase 1.

1. **WebGL Memory Leak Crashes During Long Sessions** — TensorFlow.js WebGL tensors are not garbage collected automatically. Running `human.detect()` in a loop without explicit tensor disposal causes browser tab crashes after 15-20 minutes, which is the exact target session duration. Prevention: call `tf.engine().startScope()` / `endScope()` around detection, or monitor `tf.memory().numTensors` every 100 frames to verify no leak. Reduce detection to 5 FPS (not every frame) to lower memory pressure. Set `config.filter.enabled = true` to skip unchanged frames. Validation: run 30-minute session, tensor count must stay flat.

2. **Enabling All Human.js Modules Tanks Frame Rate Below Usable** — Human.js with all modules (face + body + hand + emotion + age/gender) drops to 10 FPS on laptops. Below 15 FPS, the UI feels laggy and users perceive the detection as broken. Main thread blocks during inference, causing score ring animations to freeze. Prevention: only enable face.enabled + face.mesh.enabled + face.iris.enabled. Disable body, hand, gesture, emotion. Set `face.detector.maxDetected = 1` (single user). Use 640x480 input resolution, not native 1080p. Run detection in Web Worker if needed. Validation: FPS must stay above 15 on demo hardware.

3. **Focus Score Algorithm Produces Unacceptable False Positives** — Naive scoring treats "eyes not centered" as binary distraction. Users get nudged while genuinely focused but looking at a second monitor, reading a notebook, or thinking. False positives destroy trust instantly. Prevention: time-windowed scoring over 5-10 second windows (not per-frame), define distraction as sustained look-away (>8-10s) or rapid alternation patterns, use hysteresis (score decays gradually, not cliff-drop), make threshold tunable. Validation: test with 3+ team members doing real work; false positive rate must be <20%.

4. **getUserMedia Permission Handling Breaks First-Time UX** — User denies camera, or permissions were previously blocked, or Safari behaves differently than Chrome, and the app shows a black screen with no error. Developers test with permissions already granted and never experience the broken flow. Prevention: show pre-permission explanation screen, catch errors by `error.name` with browser-specific messages, use `navigator.permissions.query({ name: 'camera' })` to check state before requesting, add `playsinline` + `muted` attributes for iOS. Validation: test denied/dismissed flows on Chrome, Firefox, Safari.

5. **AI Coaching Nudges Become Annoying Instead of Helpful** — Nudges fire too frequently, at bad times, with generic robotic messages. 30s cooldown is too short for some situations. During demos, nudges fire during transitions that aren't real distractions. Prevention: implement escalation tiers (visual → text → voice), adaptive cooldown (30s → 60s → 120s after consecutive nudges), never nudge in first 60s of session, never nudge when score is recovering, add "snooze" button. Validation: 20-minute session should have <5 nudges for typical focus work.

6. **Gemini + ElevenLabs API Latency Makes Nudges Feel Delayed** — Sequential pipeline (detect → Gemini ~500ms → ElevenLabs ~500-1500ms) totals 1-4 seconds. By the time audio plays, user may have refocused, making the nudge confusing. Free tier rate limits (Gemini 2.5 Flash: 10 RPM) can be hit during testing. Prevention: pre-generate 20-30 common nudge audio clips for instant response, use ElevenLabs streaming API with Flash v2.5 model, fall back to browser SpeechSynthesis if quota exceeded, cache Gemini responses by distraction-type buckets. Validation: trigger-to-playback must be <2s on venue-like WiFi.

## Implications for Roadmap

Based on dependency analysis across the research, the roadmap should follow a strict validation-before-expansion sequence. The architecture and pitfalls both point to the same critical path: webcam detection must work reliably before anything depends on it.

### Phase 1: Core Webcam Detection Pipeline
**Rationale:** Human.js is the foundation everything depends on. If face detection, gaze tracking, or head pose fails, none of the downstream features (scoring, nudges, multiplayer) work. This must be validated first with sustained 30-minute sessions proving no crashes and >15 FPS performance.

**Delivers:**
- Webcam access via getUserMedia with permission flow and privacy messaging
- Human.js integration with optimized config (face + mesh + iris only, body/hand/gesture disabled)
- Detection loop at 200ms intervals with explicit tensor disposal
- Raw detection data display (gaze angles, head pose, face presence)
- Performance monitoring (FPS, tensor count, memory usage)

**Addresses:**
- Table stakes: camera permission flow
- Critical pitfalls: WebGL memory leak (#1), module overload (#2), getUserMedia failures (#4)

**Avoids:** Building any feature that consumes detection results before proving detection is stable. No scoring algorithm, no UI beyond raw data display, no networking.

**Research flag:** Standard pattern (Human.js has extensive docs). Skip `/gsd:research-phase`.

---

### Phase 2: Focus Scoring Algorithm
**Rationale:** Once detection is proven stable, the scoring algorithm converts raw ML results into actionable 0-100 scores. This phase must validate against real usage to tune thresholds and prevent false positives before any coaching system depends on the score.

**Delivers:**
- Pure function: `computeFocusScore(result: HumanResult): number`
- Time-windowed scoring over 5-10 second windows (not per-frame binary)
- Hysteresis for score decay (gradual drop, not cliff)
- Tunable sensitivity threshold (for demo adjustments)
- Score visualization (animated ring, color zones, trend arrows)

**Uses:** Human.js result structure (rotation.angle.yaw/pitch/roll, rotation.gaze.bearing/strength)

**Addresses:**
- Table stakes: live focus score, visual distraction feedback
- Critical pitfall: false positive detection (#3)

**Avoids:** Integrating AI coaching or any nudge system until the score is validated as trustworthy. No server communication yet.

**Research flag:** Needs validation during planning. Run `/gsd:research-phase` on "focus scoring algorithm tuning" to establish threshold baselines from real testing.

---

### Phase 3: AI Coaching Integration
**Rationale:** With stable detection and validated scoring, the coaching pipeline adds the "wow factor" for demos. Sequential dependency: Gemini generates text, ElevenLabs converts to audio. This phase introduces external API dependencies and network latency, requiring aggressive caching and fallback strategies.

**Delivers:**
- Gemini nudge generation service (6-word coaching prompts)
- ElevenLabs TTS service (Flash v2.5 model for <2s latency)
- Nudge trigger logic with 30s cooldown and escalation tiers
- Pre-cached nudge bank (20-30 common nudges for instant response)
- Browser SpeechSynthesis fallback for API failures
- Audio playback with volume control and visual warning

**Uses:** Express backend for API orchestration, Socket.io for nudge relay to client

**Implements:** Cooldown-gated nudge pipeline from architecture

**Addresses:**
- Table stakes: nudge cooldown
- Differentiator: AI voice coaching
- Critical pitfalls: notification fatigue (#5), API latency (#6)

**Avoids:** Multiplayer complexity—validate solo coaching experience first before introducing room broadcast logic.

**Research flag:** Standard integration (both APIs have official SDKs). Skip `/gsd:research-phase`. Use pre-caching and fallbacks from pitfall research.

---

### Phase 4: Multiplayer Focus Rooms
**Rationale:** With solo mode proven, multiplayer reuses the same detection + scoring pipeline but adds Socket.io room management and broadcast logic. This is high complexity (real-time sync + multiple concurrent users) and should only be attempted when the core experience is bulletproof.

**Delivers:**
- Room creation/join API (Express routes)
- Socket.io room management with score broadcasting
- Live leaderboard UI (room-scoped, focus-score-ranked)
- Peer score cards (username + score + session duration)
- Room cleanup on disconnect

**Uses:** Socket.io rooms, in-memory room state Map

**Implements:** Score-then-emit pattern (client computes, server broadcasts deltas)

**Addresses:**
- Differentiator: multiplayer focus rooms with verified scores
- Differentiator: live leaderboard

**Avoids:** Building group goals or collaborative features until basic rooms are stable. No blockchain integration yet (different phase).

**Research flag:** Moderate complexity. Consider `/gsd:research-phase` on "Socket.io room scaling patterns" if targeting >5 concurrent users during demo.

---

### Phase 5: Session Persistence & Analytics
**Rationale:** Once core loop (detect → score → nudge → multiplayer) is proven, add data persistence for streak tracking and session history. This is polish, not core value.

**Delivers:**
- MongoDB or in-memory session storage (config-driven)
- Session summary view (total time, avg score, distraction count, focused %)
- Focus streak tracking (consecutive days with sessions)
- Session history timeline (when focus dropped during session)

**Uses:** MongoDB with Mongoose or in-memory Map fallback

**Addresses:**
- Table stakes: session summary
- Differentiator: focus streak tracking, distraction timeline

**Avoids:** Over-engineering analytics. Keep it simple: streaks, session count, personal bests. No 50-badge achievement system.

**Research flag:** Standard CRUD. Skip `/gsd:research-phase`.

---

### Phase 6: Blockchain Rewards (Optional)
**Rationale:** Solana integration for sponsor track points. This should be fire-and-forget—blockchain failures must never block the focus experience. Defer to final phase if time permits.

**Delivers:**
- Solana wallet connection (Phantom integration)
- Token minting on session completion (devnet)
- Retry queue for failed mints
- Graceful degradation ("rewards pending") when devnet is down

**Uses:** Solana web3.js or similar SDK

**Addresses:** Sponsor track requirement (Solana)

**Avoids:** Making blockchain core to the UX. "Skip blockchain" path required.

**Research flag:** High complexity, niche domain. Run `/gsd:research-phase` on "Solana token minting from Node.js" before implementation.

---

### Phase Ordering Rationale

The ordering follows a strict dependency chain discovered in research:

1. **Detection must work before scoring** — Can't compute focus from gaze/pose data if detection crashes or is too slow
2. **Scoring must be validated before coaching** — False positives in scoring cause nudge fatigue; must be tuned first
3. **Coaching must work in solo before multiplayer** — Multiplayer amplifies any coaching bugs across N users
4. **Core loop before persistence** — No point storing session data if the core experience doesn't work
5. **Blockchain last** — Fire-and-forget, never blocks core UX

**Grouping logic:**
- Phases 1-3 are the minimum viable demo (detect → score → coach)
- Phase 4 is the multiplayer "wow moment" (only if time permits)
- Phases 5-6 are polish and sponsor points (defer if needed)

**How this avoids pitfalls:**
- Phase 1 addresses pitfalls #1, #2, #4 (stability and performance)
- Phase 2 addresses pitfall #3 (false positives)
- Phase 3 addresses pitfalls #5, #6 (nudge quality and latency)
- Each phase validates its concerns before the next phase depends on it

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (Focus Scoring):** Run `/gsd:research-phase` on "focus detection threshold tuning" — research shows false positive prevention requires real-world testing to establish baselines. The scoring function is domain-specific with no one-size-fits-all thresholds.
- **Phase 4 (Multiplayer):** Consider `/gsd:research-phase` on "Socket.io room scaling" if planning for >5 concurrent users during demo — research shows performance traps at scale (broadcast frequency, message payload size).
- **Phase 6 (Blockchain):** Run `/gsd:research-phase` on "Solana token minting from Node.js" — niche domain with sparse full-stack documentation; most Solana examples are frontend-only.

**Phases with standard patterns (skip research):**
- **Phase 1 (Webcam Detection):** Human.js has extensive official docs, GitHub wiki, and 3.2k stars. Integration pattern is well-documented.
- **Phase 3 (AI Coaching):** Both Gemini and ElevenLabs have official SDKs with TypeScript support and example code. Standard REST API integration.
- **Phase 5 (Session Persistence):** Standard CRUD with Mongoose or in-memory Map. No novel patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core technologies verified via npm, official docs, GitHub releases. Human.js v3.2.1 confirmed bundling TensorFlow.js 4.17.0. Next.js 15, Express 5, Socket.io 4.8.x are current stable. @google/genai v1.40.0 is the official GA SDK (old package deprecated). Version compatibility matrix validated. |
| Features | MEDIUM | Based on competitive analysis across 15+ products (Centered, Focusmate, StudyTogether, Forest, Rize). Webcam-based focus detection is a niche with few direct competitors, so some extrapolation from adjacent categories. Table stakes and differentiators are clear, but anti-features list is opinionated (deliberately NOT building certain requested features). |
| Architecture | HIGH | Patterns verified via official Socket.io Next.js guide, Human.js performance wiki, TensorFlow.js docs. Client-side ML detection is the only viable approach (verified via latency + privacy research). Separation of Next.js and Socket.io servers is non-negotiable per Next.js architecture constraints. Component responsibilities and data flows are standard for real-time ML web apps. |
| Pitfalls | MEDIUM-HIGH | Pitfalls #1 and #2 (WebGL memory leak, FPS degradation) verified via TensorFlow.js GitHub issues (#4309, #1440) and Human.js discussions. Pitfalls #3-#6 based on UX research, API docs, and community reports. Confidence is lower on exact false positive rate thresholds (requires real-world testing). Recovery strategies are informed by official docs but not all tested in this specific stack combination. |

**Overall confidence:** HIGH

The stack, architecture, and critical pitfalls are all grounded in official documentation, verified GitHub releases, and active community sources. The main uncertainty is in feature prioritization (some competitive extrapolation) and exact scoring thresholds (requires validation during implementation). The research provides a clear technical path with actionable prevention strategies for known failure modes.

### Gaps to Address

**Focus scoring thresholds:** Research identifies that time-windowed scoring with hysteresis prevents false positives, but exact angle thresholds (e.g., "yaw > X radians = distraction") require testing with real users. The scoring function structure is clear, but the magic numbers need tuning during Phase 2. Recommendation: start with permissive thresholds (yaw > 0.8 radians ~45°, pitch > 0.7 radians ~40°) and tighten based on false positive rate observed during team testing.

**Nudge escalation timing:** Research shows 30s cooldown is table stakes, but adaptive escalation (when to go from gentle to direct) lacks hard data. The 10s/30s/60s escalation tiers are informed by notification fatigue research but not validated for this specific use case. Recommendation: make escalation timing tunable via environment variables during Phase 3 so it can be adjusted during demos without code changes.

**Human.js performance on demo hardware:** Research provides FPS benchmarks from the Human.js wiki (30-100ms per frame on modern GPUs), but "modern GPU" is vague. The demo laptop may be older or thermally constrained. Recommendation: benchmark detection loop on actual demo hardware during Phase 1 validation. If FPS drops below 15, reduce resolution or disable face.mesh (keep only face.detector + face.iris for gaze).

**Socket.io payload size at scale:** Research identifies that broadcasting scores at 5 FPS across N users scales poorly (5 FPS × N users = 5N messages/sec), but the breakpoint is unclear. Recommendation: if multiplayer targets >4 concurrent users, throttle broadcasts to 1 update/sec and send rolling averages instead of instantaneous scores (reduces message frequency and smooths jitter).

**ElevenLabs free tier quotas:** Research confirms Flash v2.5 model exists and is low-latency, but exact free tier character limits weren't verified. If demos hit quota limits, the pre-cached nudge bank + SpeechSynthesis fallback should activate automatically. Recommendation: monitor ElevenLabs API responses for 429 errors during Phase 3 and expand cached nudge bank if needed.

## Sources

### Primary (HIGH confidence)
- **@vladmandic/human GitHub releases** — v3.2.1 (Feb 2025), bundled TFJS 4.17.0, full TypeScript definitions
- **@vladmandic/human Wiki** — Config, Result structure, Performance benchmarks, Backend comparison (HumanGL 6s warmup vs WebGL 22s)
- **Next.js 15 blog post** — React 19 support, App Router features, stable release
- **Express 5.1 release announcement** — Now default on npm, promise-based error handling, path-to-regexp@8.x
- **Socket.io npm** — v4.8.3 current stable (Dec 2025), room/namespace docs
- **Tailwind CSS v4 blog** — v4.0 release (Jan 2025), 5x faster builds, CSS-native approach
- **@google/genai npm** — v1.40.0 published Feb 2026, official GA Gemini SDK
- **deprecated-generative-ai-js GitHub** — Explicit deprecation notice, migration instructions to @google/genai
- **ElevenLabs Latency Optimization Docs** — Flash v2.5 benchmarks (~75ms), streaming API usage
- **Gemini API Rate Limits** — Free tier limits (10 RPM, 250 RPD for 2.5 Flash as of Jan 2026)
- **TensorFlow.js GitHub Issues #4309, #1440** — WebGL memory leak documentation, texture cache crashes after 15-18 minutes
- **MDN getUserMedia documentation** — Browser API reference, HTTPS requirement, permission model

### Secondary (MEDIUM confidence)
- **Centered, Focusmate, StudyTogether, Forest, Rize websites** — Feature analysis, competitive positioning
- **Human.js GitHub Discussion #479** — Student focus detection approach using gaze + head pose
- **Socket.io Common Pitfalls (MoldStud)** — Race conditions, memory leaks, event listener cleanup
- **WebGazer.js validation study (PMC)** — Calibration requirement, accuracy limitations
- **Addpipe Blog: Common getUserMedia Errors** — Browser-specific error handling reference
- **MagicBell: Alert Fatigue** — Notification fatigue research, cooldown UX patterns
- **Gamification Psychology (BadgeOS, Plotline)** — Streak mechanics, retention data, burnout risks

### Tertiary (LOW confidence)
- **Wisp CMS: Socket.io architecture for Next.js** — Next.js + Socket.io separation rationale (community guide, not official)
- **Roboflow: Eye Tracking in Browser** — Browser-based gaze tracking challenges (blog post, not peer-reviewed)
- **TermsFeed: Privacy for Camera Apps** — GDPR requirements for webcam access (legal guide, not legal advice)

---
*Research completed: 2026-02-07*
*Ready for roadmap: yes*
