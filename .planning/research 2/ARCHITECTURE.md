# Architecture Research

**Domain:** Real-time webcam-based focus tracking and productivity coaching
**Researched:** 2026-02-07
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
BROWSER (Client)                                     SERVER (Node.js/Express)
+---------------------------------------------------+  +----------------------------+
|                                                   |  |                            |
|  +-------------+      +---------------------+    |  |  +-----------------------+  |
|  | Webcam Feed |----->| Human.js Detection  |    |  |  | Socket.io Server      |  |
|  +-------------+      | (face, gaze, body)  |    |  |  | - Room management     |  |
|                        +----------+----------+    |  |  | - Score broadcasting  |  |
|                                   |               |  |  | - Nudge relay         |  |
|                        +----------v----------+    |  |  +----------+------------+  |
|                        | Focus Score Engine  |    |  |             |               |
|                        | (scoring algorithm) |    |  |  +----------v------------+  |
|                        +----------+----------+    |  |  | REST API              |  |
|                                   |               |  |  | - Session CRUD        |  |
|                     +-------------+-------------+ |  |  | - Room CRUD           |  |
|                     |             |             | |  |  | - Nudge generation    |  |
|          +----------v--+  +------v------+  +---v-+--+--+----------+------------+  |
|          | UI Renderer |  | Socket.io   |  |         |  |                         |
|          | - Score ring|  | Client      |  |         |  |  +-------------------+  |
|          | - Charts    |  | - emit score|  |         |  |  | Gemini API Service|  |
|          | - Metrics   |  | - recv nudge|  |         |  |  | (coaching text)   |  |
|          +-------------+  +------+------+  |         |  |  +-------------------+  |
|                                  |         |         |  |                         |
|          +----------+    +-------v------+  |         |  |  +-------------------+  |
|          | Audio API |<--| Nudge Player |  |         |  |  | ElevenLabs Service|  |
|          | (playback)|   | (TTS audio)  |  |         |  |  | (TTS audio gen)   |  |
|          +----------+    +--------------+  |         |  |  +-------------------+  |
|                                            |         |  |                         |
+---------------------------------------------------+  |  +-------------------+    |
                                             |         |  | MongoDB / In-Memory|    |
                                             +-------->+  +-------------------+    |
                                          Socket.io    |                            |
                                          connection   +----------------------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Webcam Capture** | Access camera via getUserMedia, deliver video frames | HTML5 `<video>` + `navigator.mediaDevices.getUserMedia()` |
| **Human.js Detection** | Run ML models on video frames: face detection, gaze tracking, body pose, emotion | `@vladmandic/human` with WebGL backend, configured for face+body+gesture |
| **Focus Score Engine** | Convert raw detection data into a 0-100 focus score | Pure function: gaze direction + face presence + head pose + emotion weights |
| **UI Renderer** | Display focus score, metrics, charts, session state | React components with Framer Motion animations, Recharts sparklines |
| **Socket.io Client** | Emit focus scores to server, receive nudges and room updates | `socket.io-client` singleton with reconnection handling |
| **Nudge Player** | Receive TTS audio from server, play through Web Audio API | Base64 audio decode to AudioBuffer, or `<audio>` element with blob URL |
| **Socket.io Server** | Manage rooms, broadcast scores, relay nudges | `socket.io` attached to Express HTTP server |
| **REST API** | CRUD for sessions, rooms, user profiles | Express routes with JSON responses |
| **Gemini Service** | Generate short coaching nudges from focus context | `@google/generative-ai` SDK, system prompt constraining to 6 words |
| **ElevenLabs Service** | Convert coaching text to speech audio | ElevenLabs REST API, `eleven_turbo_v2` model, return base64 MP3 |
| **Data Store** | Persist sessions, readings, user data | MongoDB with Mongoose, in-memory Map fallback for demo |

## Recommended Project Structure

```
focusflow/
├── frontend/                   # Next.js 15 application
│   ├── app/                    # App Router pages
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Landing / home
│   │   ├── session/
│   │   │   └── page.tsx        # Solo focus session
│   │   └── room/
│   │       └── [code]/
│   │           └── page.tsx    # Multiplayer room
│   ├── components/
│   │   ├── focus/              # Focus tracking UI
│   │   │   ├── FocusScoreRing.tsx
│   │   │   ├── AnimatedScore.tsx
│   │   │   ├── StatCards.tsx
│   │   │   └── WebcamView.tsx
│   │   ├── room/               # Multiplayer UI
│   │   │   ├── RoomLobby.tsx
│   │   │   ├── RoomLeaderboard.tsx
│   │   │   └── PeerScoreCard.tsx
│   │   └── nudge/              # Coaching nudge UI
│   │       └── VoiceNudgeIndicator.tsx
│   ├── hooks/
│   │   ├── useHumanDetection.ts  # Human.js webcam loop
│   │   ├── useFocusScore.ts      # Score computation
│   │   ├── useFocusSession.ts    # Session lifecycle
│   │   ├── useSocket.ts          # Socket.io connection
│   │   └── useRoom.ts            # Room state management
│   ├── lib/
│   │   ├── human-config.ts       # Human.js configuration
│   │   ├── focus-algorithm.ts    # Score calculation logic
│   │   ├── socket.ts             # Socket.io client singleton
│   │   └── audio.ts              # Audio playback utilities
│   └── package.json
│
├── backend/                    # Express + Socket.io server
│   ├── src/
│   │   ├── server.ts           # Express + Socket.io entry
│   │   ├── routes/
│   │   │   ├── sessions.ts     # Session endpoints
│   │   │   └── rooms.ts        # Room endpoints
│   │   ├── services/
│   │   │   ├── gemini.ts       # Gemini nudge generation
│   │   │   ├── elevenlabs.ts   # TTS audio generation
│   │   │   └── focus.ts        # Server-side focus logic
│   │   ├── socket/
│   │   │   ├── handlers.ts     # Socket event handlers
│   │   │   └── rooms.ts        # Room management logic
│   │   ├── models/             # MongoDB schemas (optional)
│   │   │   ├── Session.ts
│   │   │   ├── User.ts
│   │   │   └── Reading.ts
│   │   └── store/
│   │       └── memory.ts       # In-memory data store fallback
│   └── package.json
│
└── package.json                # Root workspace config
```

### Structure Rationale

- **Separate frontend/backend packages:** The frontend (Next.js) and backend (Express+Socket.io) run as independent processes. This is deliberate -- Next.js App Router does not natively support persistent WebSocket connections. A separate Express server owns the Socket.io lifecycle. Both run on localhost during development and can be combined or deployed independently.
- **hooks/ for detection loop:** The webcam processing loop (`useHumanDetection`) is the performance-critical path. Isolating it as a custom hook lets it manage its own `requestAnimationFrame` lifecycle, cleanup, and frame throttling without coupling to UI rendering.
- **lib/ for pure logic:** `focus-algorithm.ts` is a pure function with no side effects -- takes detection results, returns a score. This makes it testable and replaceable without touching the detection or UI layers.
- **services/ on backend:** Each external API (Gemini, ElevenLabs) gets its own service module. This isolates API keys, retry logic, and response formatting. If an API changes or you swap providers, one file changes.
- **store/ with memory fallback:** MongoDB is optional. The `memory.ts` store implements the same interface as the Mongoose models but uses in-memory Maps. This lets the demo run without any database setup.

## Architectural Patterns

### Pattern 1: Client-Side ML Detection Loop

**What:** All webcam ML inference (face detection, gaze tracking, body pose) runs entirely in the browser using Human.js with WebGL backend. No video frames are sent to the server.
**When to use:** Always -- this is the only viable pattern for real-time webcam processing at interactive frame rates.
**Trade-offs:** Depends on client hardware (GPU), but eliminates network latency entirely. Privacy-preserving since video never leaves the device.

**Example:**
```typescript
// useHumanDetection.ts
const human = new Human({
  backend: 'webgl',
  modelBasePath: '/models/',
  face: { enabled: true, mesh: { enabled: true }, iris: { enabled: true },
          emotion: { enabled: true }, description: { enabled: false } },
  body: { enabled: true, modelPath: 'movenet-lightning.json' },
  hand: { enabled: false },
  gesture: { enabled: true },
});

const DETECT_INTERVAL_MS = 200; // ~5 detections/sec, not every frame

function useHumanDetection(videoRef: RefObject<HTMLVideoElement>) {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let running = true;
    const detect = async () => {
      if (!running || !videoRef.current) return;
      const res = await human.detect(videoRef.current);
      setResult(res);
      setTimeout(() => requestAnimationFrame(detect), DETECT_INTERVAL_MS);
    };
    detect();
    return () => { running = false; };
  }, [videoRef]);

  return result;
}
```

### Pattern 2: Score-Then-Emit (Client Computes, Server Relays)

**What:** The focus score is computed entirely on the client from Human.js results. The client emits only the numeric score (not raw detection data) to the server via Socket.io. The server decides whether to generate a nudge and broadcasts scores to room participants.
**When to use:** For all focus score updates. This minimizes network payload and keeps the server stateless regarding ML inference.
**Trade-offs:** Server cannot verify score accuracy (client could cheat). Acceptable for a hackathon demo -- not for production.

**Example:**
```typescript
// Client: emit score
socket.emit('focus:update', {
  sessionId: session.id,
  score: 72,
  timestamp: Date.now(),
});

// Server: handle score, decide on nudge, broadcast
socket.on('focus:update', async (data) => {
  // Store reading
  store.addReading(data.sessionId, data.score, data.timestamp);

  // Broadcast to room if multiplayer
  const room = store.getRoomBySession(data.sessionId);
  if (room) {
    io.to(room.code).emit('room:broadcast', {
      userId: socket.userId,
      score: data.score,
    });
  }

  // Check if nudge needed (score below threshold + cooldown expired)
  if (data.score < 40 && nudgeCooldownExpired(data.sessionId)) {
    const nudgeText = await geminiService.generateNudge(data.score, context);
    const audioBase64 = await elevenlabsService.speak(nudgeText);
    socket.emit('focus:nudge', { text: nudgeText, audio: audioBase64 });
  }
});
```

### Pattern 3: Cooldown-Gated Nudge Pipeline

**What:** Nudge generation is expensive (two API calls: Gemini + ElevenLabs). A cooldown timer (30 seconds minimum) prevents rapid-fire nudges. The pipeline is: low score detected -> check cooldown -> generate text (Gemini) -> generate audio (ElevenLabs) -> emit to client.
**When to use:** Every time a nudge trigger fires.
**Trade-offs:** 1-3 second latency from trigger to audio playback due to API calls. Acceptable because nudges are not frame-critical -- a 2-second delay in a coaching message feels natural.

**Example:**
```typescript
// Server-side nudge pipeline
const NUDGE_COOLDOWN_MS = 30_000;
const lastNudge = new Map<string, number>();

async function maybeNudge(sessionId: string, score: number, context: any) {
  const last = lastNudge.get(sessionId) || 0;
  if (Date.now() - last < NUDGE_COOLDOWN_MS) return null;
  if (score >= 50) return null; // Only nudge when focus is low

  lastNudge.set(sessionId, Date.now());

  // Sequential: text first, then audio from that text
  const text = await geminiService.generateNudge(score, context);
  const audio = await elevenlabsService.textToSpeech(text);

  return { text, audio };
}
```

## Data Flow

### Primary Detection Loop (Hot Path - ~5 Hz)

```
Webcam <video>
    |
    | getUserMedia stream
    v
Human.js detect()
    |
    | Result { face[], body[], gesture[], performance }
    v
Focus Score Engine (pure function)
    |
    | score: number (0-100)
    |
    +----> UI Renderer (React state update -> re-render score ring, metrics)
    |
    +----> Socket.io Client emit('focus:update', { score, timestamp })
                |
                v
           Socket.io Server
                |
                +----> Room broadcast (if multiplayer)
                |
                +----> Nudge pipeline (if score < threshold + cooldown expired)
                            |
                            v
                       Gemini API -> coaching text
                            |
                            v
                       ElevenLabs API -> audio base64
                            |
                            v
                       Socket.io emit('focus:nudge') -> Client
                            |
                            v
                       Audio playback (Web Audio API / <audio>)
```

### Session Lifecycle (Cold Path - user-initiated)

```
User clicks "Start Session"
    |
    v
POST /api/sessions/start -> creates session record -> returns sessionId
    |
    v
Socket.io connect + join session channel
    |
    v
Detection loop starts (hot path above)
    |
    ... (session active, scores streaming) ...
    |
    v
User clicks "End Session"
    |
    v
POST /api/sessions/end -> calculates summary stats -> returns session report
    |
    v
Socket.io disconnect from session channel
    |
    v
Display session summary (total time, avg score, distraction count, focused %)
```

### Multiplayer Room Flow

```
Host creates room:
    POST /api/rooms/create -> returns { code: "ABCD" }
    Socket.io join("room:ABCD")

Participant joins:
    POST /api/rooms/join { code: "ABCD" } -> returns room state
    Socket.io join("room:ABCD")

During session:
    Each participant emits focus:update with their score
    Server broadcasts to room:ABCD -> all clients update leaderboard

Room state is managed server-side:
    Map<roomCode, { participants: [{ userId, username, score, lastUpdate }] }>
```

### Key Data Flows

1. **Detection -> Score -> Display (client-only, ~200ms cycle):** The hot path. Video frame enters Human.js, result comes out, score is computed, UI updates. This must complete in under 200ms to feel real-time. No network involved.
2. **Score -> Server -> Room broadcast (~50ms added):** Score is emitted to server via Socket.io, server broadcasts to room. Low-latency because Socket.io uses WebSockets (no HTTP overhead per message). The score payload is tiny (~50 bytes).
3. **Low score -> Nudge pipeline -> Audio (~1-3s):** The slow path, intentionally. Two sequential API calls (Gemini ~500ms, ElevenLabs ~500-1500ms). The cooldown ensures this happens at most once per 30 seconds. Latency is acceptable because coaching nudges feel natural with a brief delay.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-5 users (hackathon demo) | Single Express server, in-memory data store, no database needed. All connections on localhost. This is the target. |
| 5-50 users (classroom) | Add MongoDB for persistence. Single server still handles this. Rate limit Gemini/ElevenLabs API calls per room. |
| 50-500 users (school deployment) | Redis adapter for Socket.io to enable horizontal scaling. Move nudge generation to a background job queue. Consider caching common nudge responses. |
| 500+ users | Separate Socket.io and REST servers. CDN for Human.js model files. Gemini/ElevenLabs behind a queue with rate limiting. This scale is out of scope. |

### Scaling Priorities

1. **First bottleneck: ElevenLabs API rate limits.** The free tier has strict limits. Mitigation: aggressive cooldowns, cache common nudge audio, fallback to browser SpeechSynthesis API when quota exceeded.
2. **Second bottleneck: Socket.io connection count.** A single Node.js process handles ~10K concurrent Socket.io connections. For the hackathon, irrelevant. For production, add Redis adapter.

## Anti-Patterns

### Anti-Pattern 1: Sending Video Frames to the Server

**What people do:** Stream webcam frames to a backend for ML processing, hoping to offload GPU work.
**Why it's wrong:** Network round-trip adds 50-200ms of latency per frame. At 5 fps, you'd need to send ~150KB per frame (720p JPEG). That's 750KB/s upstream. The server needs GPU to process it, costing more than client-side WebGL. And you lose privacy.
**Do this instead:** Run Human.js entirely in the browser. The library is designed for client-side inference. WebGL backend uses the client's GPU. Only send the computed score (a single number) to the server.

### Anti-Pattern 2: Running Detection on Every requestAnimationFrame

**What people do:** Call `human.detect()` inside a `requestAnimationFrame` callback, attempting 60 fps detection.
**Why it's wrong:** ML inference takes 30-100ms per frame depending on hardware. Running at 60 fps means you queue up detection calls faster than they complete, causing memory pressure, dropped frames, and UI jank. The UI needs 60 fps for smooth animations, but detection at 5 fps is perceptually equivalent.
**Do this instead:** Decouple detection from rendering. Use `setTimeout` or a throttled interval (~200ms) for detection calls. Let the UI render at 60 fps using the most recent detection result. Human.js's temporal interpolation helps smooth the gap.

### Anti-Pattern 3: Embedding Socket.io in Next.js Custom Server

**What people do:** Use `server.js` to create a custom Next.js server that also hosts Socket.io, following the Socket.io official Next.js guide.
**Why it's wrong for this project:** It couples the frontend build/dev process to the WebSocket server. Next.js HMR conflicts with Socket.io connections during development. You lose Next.js optimizations (automatic static optimization, serverless-ready). Debugging becomes harder when one process handles both SSR and WebSockets.
**Do this instead:** Run Express+Socket.io as a separate process on a different port (e.g., :3001). The Next.js frontend (port :3000) connects to it as a client. In production, put both behind a reverse proxy. For the hackathon, just use two terminal tabs.

### Anti-Pattern 4: Generating Nudges on the Client

**What people do:** Call Gemini API directly from the browser to generate coaching text.
**Why it's wrong:** Exposes the Gemini API key in client-side JavaScript. Anyone can inspect network requests and steal the key. Same for ElevenLabs.
**Do this instead:** Client sends score to server. Server calls Gemini and ElevenLabs with keys stored in environment variables. Server sends the result back through Socket.io. API keys never leave the server.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Human.js** (`@vladmandic/human`) | NPM package, loaded client-side, WebGL backend | Models loaded from CDN or bundled in `/public/models/`. Initial load is ~5-15MB depending on enabled models. Cache aggressively. |
| **Gemini API** (`@google/generative-ai`) | Server-side SDK, REST calls from Express | Use `gemini-2.5-flash` for speed. System prompt constrains output to short nudges. ~200-500ms per call. |
| **ElevenLabs** (REST API) | Server-side HTTP calls to `api.elevenlabs.io` | Use `eleven_turbo_v2` voice model for lowest latency. Return audio as base64 string. ~500-1500ms per call. |
| **MongoDB** (`mongoose`) | Server-side, optional | Connect on startup if `MONGODB_URI` env var present. Otherwise fall back to in-memory store. |
| **Socket.io** (`socket.io` + `socket.io-client`) | Server: attach to Express HTTP server. Client: connect from React with singleton pattern. | Use rooms for multiplayer. Namespace events with prefixes (`focus:`, `room:`, `session:`). |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Webcam -> Detection** | Direct function call within same hook | `human.detect(videoElement)` returns a Promise. No serialization. |
| **Detection -> Score** | Synchronous pure function call | `computeScore(result): number`. No async, no side effects. |
| **Score -> UI** | React state (`useState` / `useRef`) | UI subscribes to score changes. Framer Motion handles animation interpolation. |
| **Score -> Server** | Socket.io `emit('focus:update')` | Lightweight JSON. ~50 bytes per emission. Fire-and-forget (no ack needed). |
| **Server -> Nudge** | Internal async function chain | `maybeNudge()` -> `geminiService.generate()` -> `elevenlabsService.speak()`. Sequential, not parallel (text must exist before TTS). |
| **Server -> Client nudge** | Socket.io `emit('focus:nudge')` | Carries text + base64 audio. ~50-200KB per nudge (audio dominates). Infrequent (max once per 30s). |
| **Server -> Room broadcast** | Socket.io `io.to(room).emit('room:broadcast')` | Tiny payload: `{ userId, score }`. Frequent but lightweight. |
| **Frontend <-> Backend REST** | HTTP `fetch()` to Express routes | Session start/end, room create/join. Infrequent. Standard REST. |

## Build Order (Dependency Chain)

The architecture implies this build sequence based on component dependencies:

```
Phase 1: Foundation
  ├── Next.js app scaffold (pages, routing, layout)
  ├── Express server scaffold (health check, CORS)
  └── Human.js integration (webcam access, detection loop, display raw results)

Phase 2: Core Solo Experience
  ├── Focus score algorithm (requires: Human.js detection results)
  ├── Score display UI (requires: focus score)
  ├── Session metrics tracking (requires: focus score over time)
  └── Socket.io connection (requires: both servers running)

Phase 3: AI Coaching Pipeline
  ├── Gemini nudge generation service (requires: Express server)
  ├── ElevenLabs TTS service (requires: Express server)
  ├── Nudge trigger logic with cooldown (requires: scores flowing to server)
  └── Audio playback on client (requires: nudge data arriving via Socket.io)

Phase 4: Multiplayer
  ├── Room creation/joining API (requires: Express + Socket.io)
  ├── Score broadcasting (requires: scores flowing to server)
  └── Leaderboard UI (requires: room state from server)

Phase 5: Polish & Demo Prep
  ├── Animations (Framer Motion)
  ├── Session summary view
  ├── Error handling / edge cases
  └── Demo rehearsal
```

**Why this order:**
- Human.js detection must work before anything else (it produces the data everything depends on).
- Focus scoring must exist before the server can decide when to nudge.
- Socket.io must be connected before nudges can flow back or rooms can broadcast.
- Multiplayer depends on solo mode working first -- it reuses the same score pipeline.
- AI coaching is Phase 3 (not Phase 1) because the demo can show real-time focus detection without nudges, but not nudges without detection.

## Performance Budget

| Operation | Target Latency | Actual (estimated) | Frequency |
|-----------|---------------|-------------------|-----------|
| Human.js detect() | < 200ms | 30-100ms (WebGL, modern GPU) | ~5/sec |
| Focus score computation | < 1ms | < 0.1ms (pure math) | ~5/sec |
| UI re-render with new score | < 16ms | ~5-10ms (React) | ~5/sec |
| Socket.io score emit | < 10ms | ~2-5ms (localhost) | ~5/sec |
| Gemini API call | < 1000ms | ~200-500ms | Max 1/30s |
| ElevenLabs API call | < 2000ms | ~500-1500ms | Max 1/30s |
| Full nudge pipeline (trigger to audio) | < 3000ms | ~1-2s typical | Max 1/30s |
| Room broadcast latency | < 50ms | ~5-20ms (localhost) | ~5/sec per user |

## Sources

- [@vladmandic/human GitHub - AI-powered face detection, body pose, gaze tracking](https://github.com/vladmandic/human) [HIGH confidence]
- [@vladmandic/human NPM package](https://www.npmjs.com/package/@vladmandic/human) [HIGH confidence]
- [Human.js Config Wiki](https://github.com/vladmandic/human/wiki/Config) [HIGH confidence]
- [Human.js Result Wiki](https://github.com/vladmandic/human/wiki/Result) [HIGH confidence]
- [Socket.IO: How to use with Next.js](https://socket.io/how-to/use-with-nextjs) [HIGH confidence]
- [Socket.IO architecture for Next.js - Wisp CMS](https://www.wisp.blog/blog/choosing-the-right-architecture-for-socket-communication-in-nextjs-a-comprehensive-guide) [MEDIUM confidence]
- [ElevenLabs Streaming TTS Documentation](https://elevenlabs.io/docs/api-reference/text-to-speech/stream) [HIGH confidence]
- [ElevenLabs JavaScript SDK](https://github.com/elevenlabs/elevenlabs-js) [HIGH confidence]
- [Gemini API Text Generation](https://ai.google.dev/gemini-api/docs/text-generation) [HIGH confidence]
- [TensorFlow.js MoveNet Pose Detection](https://blog.tensorflow.org/2021/05/next-generation-pose-detection-with-movenet-and-tensorflowjs.html) [HIGH confidence]
- [WebGazer.js - Browser Eye Tracking](https://webgazer.cs.brown.edu/) [MEDIUM confidence]
- [Roboflow: Real-Time Eye Tracking in Browser](https://blog.roboflow.com/build-eye-tracking-in-browser/) [MEDIUM confidence]
- [Client-side vs Server-side AI in Video - Pexip](https://www.pexip.com/blog/server-side-vs-client-side-ai-in-video-conferencing) [MEDIUM confidence]

---
*Architecture research for: Real-time webcam-based focus tracking and productivity coaching*
*Researched: 2026-02-07*
