# Pitfalls Research

**Domain:** Webcam-based focus tracking and AI productivity coaching (browser application)
**Researched:** 2026-02-07
**Confidence:** MEDIUM-HIGH (verified against official docs, GitHub issues, and multiple community sources)

## Critical Pitfalls

### Pitfall 1: WebGL Memory Leak Crashes During Long Sessions

**What goes wrong:**
Human.js runs on TensorFlow.js with the WebGL backend. WebGL textures are NOT garbage collected by JavaScript -- they must be explicitly disposed. Running face detection in a `requestAnimationFrame` loop without proper tensor cleanup causes the browser tab to crash after 15-20 minutes. This is the exact duration of a target focus session, meaning the app will crash during demos.

**Why it happens:**
TensorFlow.js allocates GPU memory for intermediate tensors during each inference pass. Developers call `human.detect()` in a loop and assume JavaScript GC handles cleanup. It does not. The browser cannot even report available VRAM accurately, so TF.js guesses -- and guesses wrong under sustained load.

**How to avoid:**
- Call `tf.engine().startScope()` before each detection frame and `tf.engine().endScope()` after.
- Alternatively, use `human.detect()` which should handle internal tensor disposal, but monitor `tf.memory().numTensors` every 100 frames -- if the count climbs steadily, tensors are leaking.
- Reduce detection frequency: detect every 2nd or 3rd video frame instead of every frame. The visual difference is negligible but memory pressure halves or thirds.
- Set `config.filter.enabled = true` to let Human.js skip detection on unchanged frames.

**Warning signs:**
- `tf.memory().numTensors` increasing over time (log it to console every 30 seconds during dev).
- Browser tab memory in Task Manager climbing past 500MB.
- Chrome DevTools Performance tab showing increasing GPU process memory.
- Tab crash or "Aw, Snap!" after 10-20 minutes of continuous use.

**Phase to address:**
Phase 1 (Core Webcam Pipeline) -- must be validated before any other feature depends on sustained detection.

---

### Pitfall 2: Enabling All Human.js Modules Tanks Frame Rate Below Usable Threshold

**What goes wrong:**
Human.js with all modules enabled (face detection + face mesh + iris tracking + body pose + hand tracking + emotion + age/gender) drops to ~10-20 FPS on laptops and ~10 FPS on phones. A focus scoring app running at 10 FPS feels laggy and the detection results are jittery. Worse, the main thread blocks during inference, causing the entire UI to stutter -- score ring animations freeze, timers skip, buttons become unresponsive.

**Why it happens:**
Developers enable everything in Human.js config because "more data = better focus scoring." Each additional module adds inference time. The modules compound -- face geometry + iris detection together are the most expensive combination. At a hackathon, the temptation is to enable it all and optimize later. There is no later.

**How to avoid:**
- Only enable what you actually use for focus scoring: `face.enabled`, `face.mesh.enabled` (for head pose), `face.iris.enabled` (for gaze direction). Disable everything else: `body.enabled = false`, `hand.enabled = false`, `gesture.enabled = false`, `emotion.enabled = false`.
- Run Human.js detection in a Web Worker (`human.warmup()` then `human.detect()` in worker thread) to keep the main thread free for UI rendering.
- Target 640x480 input resolution, not the webcam's native 1080p. Human.js input preprocessing will handle scaling, but feeding it less data is faster.
- Set `config.face.detector.maxDetected = 1` since you only need the user's face.

**Warning signs:**
- FPS counter drops below 15 during testing.
- UI animations stutter or freeze during detection.
- Score updates feel delayed or jumpy.

**Phase to address:**
Phase 1 (Core Webcam Pipeline) -- performance budget must be established before building the scoring algorithm on top.

---

### Pitfall 3: Focus Score Algorithm Produces Unacceptable False Positives

**What goes wrong:**
The focus score marks the user as "distracted" when they are actually focused. Common triggers: looking at a second monitor, reading a physical notebook, briefly glancing away to think, adjusting glasses, scratching their face, taking a sip of water. The user gets an AI coaching nudge telling them to focus while they are already deeply focused. This destroys trust in the product instantly.

**Why it happens:**
Naive focus scoring treats "eyes not looking at screen" or "face turned away" as binary distraction signals. Real focus is not staring at a screen without blinking. Knowledge workers look away to think, reference physical materials, use multiple monitors, and fidget while concentrating. A strict gaze-locked-to-center model has a ~40-60% false positive rate in realistic conditions.

**How to avoid:**
- Use a time-windowed scoring model, not per-frame classification. Aggregate gaze and head pose data over 5-10 second windows. A single 2-second glance away should not trigger a score drop.
- Define "distraction" as sustained look-away (>8-10 seconds continuously) or rapid alternating attention (looking at phone, then screen, then phone pattern).
- Build in a "grace period" hysteresis: score can only drop if the distraction pattern persists beyond a threshold. Score should decay gradually, not cliff-drop.
- Test with real users doing real work, not staring at a test screen. During hackathon dev, have team members use it while coding and note every false trigger.
- Make the threshold tunable (sensitivity slider in UI) so demo judges can adjust if the environment causes issues.

**Warning signs:**
- Users report feeling "nagged" or "watched."
- Score drops when user is clearly engaged but not staring at center screen.
- Distraction count climbs faster than expected during genuine work sessions.

**Phase to address:**
Phase 2 (Focus Scoring Algorithm) -- but must be iterated against real usage in Phase 3 (AI Coaching Integration) when nudges are triggered.

---

### Pitfall 4: getUserMedia Permission Handling Breaks the First-Time User Experience

**What goes wrong:**
The user opens the app and either (a) sees a browser permission dialog they don't understand and dismiss/deny, (b) previously denied camera access and now the app silently fails with no explanation, or (c) is on Safari/iOS where permissions work differently and the video element never plays. The app shows a black screen or an infinite loader with no actionable error.

**Why it happens:**
Developers test in Chrome with permissions already granted and never experience the first-time or denied-permission flows. Browser differences are significant:
- Firefox throws `NotAllowedError`, Chrome throws `PermissionDeniedError` -- different error names for the same thing.
- Safari throws `OverconstrainedError` when no camera exists (Chrome/Firefox throw `NotFoundError`).
- Chrome has `PermissionDismissedError` when the user closes the dialog without choosing -- Firefox does not.
- iOS Safari requires `playsinline` and `muted` attributes on the video element or it will not display the stream.
- HTTPS is mandatory -- getUserMedia is undefined on HTTP pages.

**How to avoid:**
- Show a pre-permission screen explaining why the camera is needed BEFORE calling `getUserMedia()`. This dramatically increases grant rates.
- Catch errors by `error.name` and display specific, actionable messages for each: "Camera blocked -- click the camera icon in your address bar to allow access."
- Use `navigator.permissions.query({ name: 'camera' })` to check permission state before requesting, and show the right UI state (prompt vs. denied vs. granted).
- Test on Safari, Firefox, and Chrome. Test the "denied" flow. Test with no camera connected. Test on HTTPS.
- Add `playsinline`, `muted`, and `autoplay` attributes to the video element for iOS compatibility.

**Warning signs:**
- Black screen on first load during demo.
- Works on your machine but not on the demo machine.
- No error messages visible when camera access fails.

**Phase to address:**
Phase 1 (Core Webcam Pipeline) -- this is the literal first thing the user experiences. If it breaks, nothing else matters.

---

### Pitfall 5: AI Coaching Nudges Become Annoying Instead of Helpful

**What goes wrong:**
The voice nudge system triggers too frequently, at bad times, with generic messages that feel robotic and patronizing. Users mute the app or close it entirely. The 30-second cooldown from the plan is too short for some situations and too long for others. During a demo, the nudges fire during transitions or pauses that are not real distractions, making the product look broken.

**Why it happens:**
The nudge system is coupled directly to the focus score threshold without contextual awareness. Score drops to 60 -> fire nudge. Score recovers to 80 then drops to 60 again -> fire another nudge 30 seconds later. There is no concept of session phase, user behavior pattern, or escalation. The system treats every threshold crossing the same way.

**How to avoid:**
- Implement escalation tiers: (1) visual indicator only (score ring turns yellow), (2) subtle text nudge after 15+ seconds of sustained low score, (3) voice nudge only after 30+ seconds of sustained distraction with no self-correction. Most "distractions" self-correct without intervention.
- Make the cooldown adaptive: increase cooldown after each consecutive nudge (30s -> 60s -> 120s). Reset when the user sustains focus for 2+ minutes.
- Never nudge during the first 60 seconds of a session (user is settling in).
- Never nudge when the score is recovering (trending upward even if below threshold).
- Give the user a "snooze" or "I'm thinking" button to temporarily suppress nudges.

**Warning signs:**
- Multiple nudges within a 2-minute window.
- Users report feeling annoyed rather than coached.
- Demo audience reacts negatively to nudge timing.

**Phase to address:**
Phase 3 (AI Coaching Integration) -- but the escalation logic must be designed before integrating Gemini + ElevenLabs, not after.

---

### Pitfall 6: Gemini + ElevenLabs API Latency Makes Voice Nudges Feel Delayed

**What goes wrong:**
The pipeline is: detect distraction -> call Gemini for coaching text -> call ElevenLabs for TTS audio -> play audio. Each API call adds latency. Gemini Flash: 500ms-2s. ElevenLabs: 300ms-1s (with Flash v2.5 at ~75ms, but non-streaming adds overhead). Total pipeline: 1-4 seconds from distraction detection to voice. By the time the nudge plays, the user may have already refocused, making the nudge confusing and disruptive.

**Why it happens:**
Sequential API calls to two external services. Network variability at a hackathon venue (shared WiFi with hundreds of attendees). No fallback for when either API is slow or down. Free tier rate limits on Gemini (2.5 Flash: 10 RPM, 250 RPD on free tier as of Jan 2026) mean the app can hit limits during sustained testing.

**How to avoid:**
- Pre-generate a bank of 20-30 coaching nudge texts and TTS audio clips at app startup or build time. Use pre-cached nudges for the immediate response, then async-generate a personalized one as a follow-up.
- Use ElevenLabs streaming API with Flash v2.5 model for lowest latency when generating live.
- Implement a local fallback: browser `SpeechSynthesis` API for TTS if ElevenLabs is slow/down. It sounds worse but responds instantly.
- Cache Gemini responses: many distraction contexts produce similar coaching text. Cache by distraction-type buckets.
- Call Gemini and ElevenLabs in parallel where possible (pre-generate audio for multiple candidate nudges).

**Warning signs:**
- Noticeable pause between distraction detection and voice playback.
- 429 rate limit errors in console from Gemini or ElevenLabs.
- Nudges arriving after the user has already refocused.

**Phase to address:**
Phase 3 (AI Coaching Integration) -- the pre-caching strategy should be designed before any API integration begins.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-coded focus score thresholds | Ship fast, tune later | Every environment needs different thresholds; demo at venue vs. home lighting differ wildly | Only if exposed as config/env vars, never as magic numbers in code |
| Polling webcam at max frame rate | Simplest implementation | Battery drain on laptops, thermal throttling drops performance mid-session | Never -- always throttle to 10-15 FPS for detection |
| Storing webcam frames on server for analysis | Offloads compute from client | Massive privacy liability, bandwidth cost, latency | Never for this app -- all detection must be client-side |
| In-memory session storage (no DB) | No MongoDB setup needed | All data lost on server restart; fine for hackathon | Acceptable for hackathon demo only; plan.md already accounts for this with in-memory fallback |
| Skipping Web Worker for Human.js | Simpler code, no message passing | Main thread blocks during inference, UI freezes | Acceptable for MVP if frame rate stays above 15 FPS; must fix post-MVP |
| Single shared Gemini API key | Fast to deploy | Rate limits hit faster with multiple concurrent users in multiplayer | Acceptable for hackathon; unacceptable for production |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Human.js + Webcam | Not awaiting `human.load()` and `human.warmup()` before first detection; first frame takes 3-5s to process cold | Call `load()` + `warmup()` during the pre-session UI (while showing loading screen). First real detection will be at normal speed. |
| Gemini 2.5 Flash API | Sending full conversation context on every nudge request, burning through TPM quota | Send minimal context: current focus score, distraction duration, session phase, streak count. Keep prompts under 200 tokens. |
| ElevenLabs TTS | Using `eleven_monolingual_v1` or `multilingual_v2` for real-time nudges | Use `eleven_flash_v2_5` -- it is specifically optimized for low-latency (~75ms). Monolingual/Multilingual models are 2-5x slower. |
| ElevenLabs TTS | Requesting full audio file then playing | Use streaming endpoint with chunked audio playback. Start playing first chunk while remaining chunks download. |
| Socket.io Rooms | Not cleaning up event listeners on disconnect; orphaned listeners accumulate | Remove all listeners in the `disconnect` handler. Use `socket.removeAllListeners()` or track and remove individually. |
| Socket.io Rooms | Broadcasting full state on every focus score update | Send only deltas (userId + newScore + timestamp). Let clients maintain local state and merge updates. |
| Solana Devnet | Assuming devnet is always available and fast | Devnet has outages and congestion. Token minting should be fire-and-forget with retry queue, never blocking the focus session UX. |
| Solana Devnet | Not handling wallet connection rejection | User may not have Phantom installed or may reject connection. Always show a "skip blockchain" path. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Running Human.js at native webcam resolution (1080p/4K) | 5-10 FPS, laptop fan spins up, thermal throttling after 5 min | Force input to 640x480 via `getUserMedia` constraints: `{ video: { width: 640, height: 480 } }` | Immediately on any non-gaming laptop |
| Sending focus score updates via Socket.io on every detection frame | Server overwhelmed, leaderboard flickers, bandwidth saturated on venue WiFi | Throttle to 1 update per second. Batch scores client-side and send average. | At 4+ users in a room with 15 FPS detection |
| Calling Gemini API on every distraction detection | 429 errors within minutes, free tier quota exhausted in one demo session | Only call when distraction is sustained (>10s) AND no nudge was sent recently AND the nudge cache is empty | After ~10-15 rapid distraction events on free tier |
| Storing base64 TTS audio in Socket.io messages | Message size balloons (30KB+ per nudge), Socket.io transport degrades | Generate TTS on the client side via direct ElevenLabs call, or serve audio via HTTP endpoint with URL reference in socket message | At 3+ concurrent users receiving nudges |
| No detection frame skipping | CPU pegged at 100%, battery drains, device throttles | Use `config.filter.enabled = true` in Human.js (skips detection on visually unchanged frames) and throttle `requestAnimationFrame` to 10-15 FPS detection rate | Immediately on any device during sustained use |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Sending webcam frames to backend for processing | Massive privacy violation; users did not consent to video leaving their device; potential legal liability | All face detection and focus scoring MUST run client-side via Human.js. Only scores (numbers) should be sent to the server. Never transmit video frames, face mesh data, or images. |
| Exposing Gemini/ElevenLabs API keys in frontend code | Keys stolen, quota burned by attackers, financial liability on paid tiers | API calls to Gemini and ElevenLabs must go through your backend. Frontend sends score/context to your server; server calls external APIs. |
| No privacy indicator when webcam is active | Users feel surveilled, erodes trust; some jurisdictions require visible recording indicators | Show a clear, persistent "camera active" indicator. Provide an obvious way to pause/stop the camera. Show what data is being captured (just focus score, not video). |
| Multiplayer rooms exposing other users' personal data | Leaking email, wallet address, or session details to room participants | Room broadcasts should only contain: username, focus score, session duration. Never include wallet addresses, emails, or detailed analytics. |
| Storing focus session data without user consent | Potential GDPR/privacy law violation even for a hackathon project | Show a brief consent prompt before first session. Store minimal data. Provide data deletion option. For hackathon: clearly state data is temporary and not shared. |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No onboarding for camera positioning | User holds laptop at weird angle, face is partially out of frame, detection fails silently | Show a camera preview with a face-position guide overlay (oval outline where face should be). Don't start the session until face is properly detected. |
| Focus score displayed as raw number without context | "Is 72 good? Bad? What should I aim for?" User has no reference frame | Show score with color coding (green/yellow/red zones), trend arrow (improving/declining), and session average comparison. Add labels: "Deep Focus", "Moderate", "Distracted". |
| Multiplayer leaderboard showing real-time score fluctuations | Anxiety-inducing; scores flicker constantly; feels like being watched and judged | Smooth score display with 5-10 second rolling average. Update leaderboard positions every 15-30 seconds, not on every score change. |
| Voice nudge plays without visual warning | Startling; user has headphones in a quiet library; embarrassing | Show a brief visual indicator 1-2 seconds before voice plays. Allow mute. Reduce volume gradually if user is wearing headphones (use AudioContext gain). |
| No way to pause or temporarily disable tracking | User needs to take a call, get coffee, stretch -- all counted as "distraction" | Pause button that stops detection and freezes the score. Resume resumes the session timer. Paused time excluded from metrics. |
| Session ends abruptly with no summary | User finishes and sees nothing; no sense of accomplishment or progress | Show a session summary screen: total focused time, average score, distraction count, improvement vs. last session, streak status. This is the payoff moment. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Webcam pipeline:** Often missing proper cleanup on component unmount -- stream tracks keep running (green camera LED stays on). Verify `stream.getTracks().forEach(t => t.stop())` is called on unmount.
- [ ] **Focus scoring:** Often missing handling of face-not-detected state. Verify: what happens when the user covers camera, walks away, or is in too-dark lighting? Score should hold/pause, not spike to 0 or 100.
- [ ] **Voice nudges:** Often missing audio context resume after user interaction. Verify: browsers require a user gesture before `AudioContext` can play audio. First nudge will be silent if `AudioContext` isn't resumed on a click/tap.
- [ ] **Multiplayer rooms:** Often missing cleanup when room creator disconnects. Verify: room state is cleaned up server-side, other participants are notified, no orphaned rooms accumulate in memory.
- [ ] **Solana integration:** Often missing wallet not-installed state. Verify: what happens when Phantom isn't installed? App should degrade gracefully, not crash.
- [ ] **Session persistence:** Often missing recovery from browser tab refresh. Verify: if user refreshes mid-session, is the session lost? Consider `sessionStorage` for state recovery.
- [ ] **Demo resilience:** Often missing handling of poor venue conditions (bad lighting, noisy WiFi, low battery). Verify: app works with laptop webcam in fluorescent-lit conference room with congested WiFi.
- [ ] **Mobile/responsive:** Often missing responsive layout for the demo screen. Verify: if judges view on a phone or different screen size, does the layout break?

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| WebGL memory leak crash | LOW | Catch errors in detection loop, call `tf.disposeVariables()`, restart detection. Show "Recalibrating..." to user rather than error. Auto-recover in < 2 seconds. |
| False positive nudge storm | LOW | Add emergency cooldown: if 3+ nudges in 2 minutes, auto-increase threshold by 10 points and extend cooldown to 120s. Show "Adjusting sensitivity..." message. |
| getUserMedia permission denied | MEDIUM | Show clear recovery instructions with browser-specific screenshots. Provide a "demo mode" with simulated webcam data for when camera cannot be accessed. |
| Gemini/ElevenLabs API down or rate limited | LOW | Fall back to pre-cached nudge bank + browser SpeechSynthesis. Log API failures but never surface them to the user. App should feel the same with or without live API. |
| Socket.io disconnection mid-session | LOW | Auto-reconnect with exponential backoff (Socket.io does this by default). Queue focus updates locally and replay on reconnect. Show subtle "reconnecting..." indicator. |
| Solana devnet outage | LOW | Queue token rewards locally. Mint in batch when devnet recovers. Never block the focus experience for blockchain failures. Show "Rewards pending..." rather than errors. |
| Laptop thermal throttling | MEDIUM | Detect frame rate drop (< 10 FPS sustained). Auto-reduce detection frequency and disable expensive modules. Show "Power saving mode" indicator. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| WebGL memory leak | Phase 1: Core Webcam Pipeline | Run 30-minute sustained session; monitor `tf.memory().numTensors` -- must stay flat |
| Module overload killing FPS | Phase 1: Core Webcam Pipeline | Benchmark with only needed modules; FPS must stay above 15 on target demo hardware |
| Focus score false positives | Phase 2: Focus Scoring Algorithm | Test with 3+ team members doing real work; false positive rate must be < 20% |
| getUserMedia permission failures | Phase 1: Core Webcam Pipeline | Test denied/dismissed flows on Chrome, Firefox, Safari; all show actionable error UI |
| Notification fatigue | Phase 3: AI Coaching Integration | Run 20-minute session; count nudges. More than 5 in 20 minutes = too many for typical focus work |
| API latency for voice nudges | Phase 3: AI Coaching Integration | Time from distraction detection to audio playback must be < 2 seconds; test on venue-like WiFi |
| Multiplayer sync issues | Phase 4: Multiplayer Rooms | Test with 4+ concurrent users; leaderboard updates within 2 seconds; no stale scores |
| Solana devnet failures | Phase 5: Blockchain Rewards | Token minting failures must not affect focus session UX; test with devnet RPC endpoint down |
| Privacy/trust erosion | Phase 1: Core Webcam Pipeline | Privacy indicator visible at all times; "what data leaves your device" explanation accessible in 1 click |
| Demo environment brittleness | All Phases (final integration test) | Full rehearsal on actual demo hardware, at venue, with venue WiFi, 30 minutes before presentation |

## Sources

- [vladmandic/human GitHub - Performance Wiki](https://github.com/vladmandic/human/wiki/Performance) -- Human.js FPS benchmarks and module performance (MEDIUM confidence)
- [vladmandic/human GitHub - Discussions](https://github.com/vladmandic/human/discussions/317) -- Real-time face recognition performance tuning (MEDIUM confidence)
- [TensorFlow.js GitHub Issue #4309](https://github.com/tensorflow/tfjs/issues/4309) -- Facemesh WebGL crash after 15-18 minutes (HIGH confidence, verified bug report)
- [TensorFlow.js GitHub Issue #1440](https://github.com/tensorflow/tfjs/issues/1440) -- Texture cache memory leak documentation (HIGH confidence)
- [Common getUserMedia() Errors - Addpipe Blog](https://blog.addpipe.com/common-getusermedia-errors/) -- Browser-specific error handling reference (HIGH confidence)
- [MDN getUserMedia() documentation](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) -- Official API reference (HIGH confidence)
- [ElevenLabs Latency Optimization Docs](https://elevenlabs.io/docs/developers/best-practices/latency-optimization) -- Flash v2.5 latency benchmarks (HIGH confidence, official docs)
- [ElevenLabs Models Documentation](https://elevenlabs.io/docs/overview/models) -- Model comparison for latency (HIGH confidence, official docs)
- [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits) -- Free tier RPM/RPD limits (HIGH confidence, official docs)
- [Socket.io Common Pitfalls - MoldStud](https://moldstud.com/articles/p-common-pitfalls-when-using-socketio-and-how-to-avoid-them-essential-tips-for-developers) -- Socket.io race conditions and memory leaks (MEDIUM confidence)
- [Socket.io GitHub Issues #1862, #2866, #3358](https://github.com/socketio/socket.io/issues/1862) -- Documented race conditions (HIGH confidence, verified issues)
- [MagicBell - Alert Fatigue](https://www.magicbell.com/blog/alert-fatigue) -- Notification fatigue research and UX patterns (MEDIUM confidence)
- [TermsFeed - Privacy Policy for Camera Apps](https://www.termsfeed.com/blog/privacy-policy-apps-camera-access/) -- GDPR and privacy requirements for camera access (MEDIUM confidence)
- [WebGazer.js - Brown HCI](https://webgazer.cs.brown.edu/) -- Browser-based eye tracking calibration challenges (MEDIUM confidence)

---
*Pitfalls research for: Webcam-based focus tracking and AI productivity coaching*
*Researched: 2026-02-07*
