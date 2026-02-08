# Stack Research

**Domain:** AI-powered webcam-based focus tracking with eye gaze and head pose detection
**Researched:** 2026-02-07
**Confidence:** HIGH (core stack verified via npm, GitHub releases, official docs)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.x (stable) | React meta-framework, App Router, SSR | Plan specifies Next.js 15. Next.js 16 exists (released Oct 2025) but 15.x is battle-tested and avoids bleeding-edge risk on hackathon timeline. All webcam/tracking logic is client-side so App Router SSR benefits are minimal — Next.js here is primarily for DX, routing, and project structure. **Confidence: HIGH** |
| React | 19.x | UI component library | Ships with Next.js 15. React 19 is stable and required by Next.js 15 App Router. **Confidence: HIGH** |
| Node.js + Express | 5.x (Express) | Backend REST API server | Express 5.2.1 is current stable (default on npm since March 2025). Express 5 drops Node <18 support, adds promise-based error handling, and uses path-to-regexp@8.x for security. Use Express 5 — no reason to stay on 4.x for a new project. **Confidence: HIGH** |
| Socket.io | 4.8.x | Real-time bidirectional communication for multiplayer | Socket.io 4.8.3 is current stable (Dec 2025). Industry standard for real-time web. Handles reconnection, rooms, namespaces out of the box — exactly what multiplayer focus rooms need. **Confidence: HIGH** |
| Tailwind CSS | 4.x | Utility-first CSS framework | Tailwind v4.0 released Jan 2025. 5x faster builds, zero-config, CSS-native approach with cascade layers and @property. Targets Chrome 111+, Firefox 128+, Safari 16.4+ which aligns with desktop Chrome/Edge constraint. **Confidence: HIGH** |
| MongoDB | 7.x (optional) | Session/user data persistence | Optional per plan. MongoDB Atlas free tier (512MB) works for hackathon. Use in-memory fallback for demo reliability. Don't spend time on database setup unless sessions need persistence across restarts. **Confidence: MEDIUM** |

### AI & Computer Vision Stack

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @vladmandic/human | 3.2.1 | Webcam face detection, iris/gaze tracking, head pose estimation | **This is the centerpiece of the entire app.** Released Feb 2025. Single library provides face detection (BlazeFace), face mesh (FaceMesh), iris analysis (MediaPipe Iris), gaze tracking, and head pose (pitch/yaw/roll from mesh landmarks) — all in one unified API. No need to stitch together multiple ML libraries. Uses TensorFlow.js 4.17.0 internally. Browser-native via HumanGL backend. **Confidence: HIGH** |
| @google/genai | ^1.40.0 | Gemini 2.5 Flash API for coaching nudge generation | **Use @google/genai, NOT @google/generative-ai.** The old `@google/generative-ai` SDK is officially deprecated (support ended Aug 2025). The new unified `@google/genai` SDK is GA since May 2025, actively maintained (v1.40.0 published Feb 2026), and provides access to Gemini 2.5 Flash. **Confidence: HIGH** |
| @elevenlabs/elevenlabs-js | ^2.x | Text-to-speech voice nudges via ElevenLabs API | Official ElevenLabs Node.js SDK. TypeScript-native, supports text-to-speech with `eleven_turbo_v2` model for low-latency voice generation. Use this for server-side TTS, return base64 audio to client. **Confidence: MEDIUM** (exact latest version unverified, but package is actively maintained) |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| motion | ^12.x | React animations (focus score ring, transitions, sparklines) | Formerly "framer-motion", rebranded Nov 2024. Import as `motion/react`. Drop-in replacement. v12.33.0 is current. Use for animated score ring, page transitions, nudge indicators. **Confidence: HIGH** |
| recharts | ^3.7.0 | Data visualization (focus score charts, session history) | React chart library built on D3. v3.7.0 released Jan 2026. Use for sparkline focus history, session analytics. Lightweight alternative to heavy charting libs. **Confidence: HIGH** |
| socket.io-client | 4.8.x | Client-side Socket.io for Next.js frontend | Must match server Socket.io version. Install separately in frontend. **Confidence: HIGH** |
| helmet | ^8.x | HTTP security headers for Express | Standard Express security middleware. Always use. **Confidence: HIGH** |
| compression | ^1.x | Response compression for Express | Reduces payload size for audio data transfer. **Confidence: HIGH** |
| cors | ^2.x | Cross-origin resource sharing | Required because Next.js (port 3000) and Express (port 3001) run on different ports in dev. **Confidence: HIGH** |
| dotenv | ^16.x | Environment variable management | Store API keys for Gemini, ElevenLabs. Never commit .env files. **Confidence: HIGH** |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript | ^5.x | Type safety across entire codebase | Next.js 15 has excellent TS support. Human.js ships with full TypeScript definitions. Non-negotiable for a project with ML result types. |
| ESLint + Prettier | Latest | Code quality and formatting | Ships with `create-next-app`. Use default Next.js ESLint config. |
| nodemon | ^3.x | Auto-restart Express server on file changes | Dev convenience for backend. Use `ts-node` with it for TypeScript. |
| concurrently | ^9.x | Run frontend + backend simultaneously | `concurrently "npm run dev:frontend" "npm run dev:backend"` |

## Human.js Integration Deep Dive

This is the most critical technology decision. Here is exactly how to integrate it.

### Installation

```bash
npm install @vladmandic/human
```

No separate TensorFlow.js install needed — Human.js v3.2.1 bundles TensorFlow.js 4.17.0 internally.

### Configuration for Focus Tracking

The minimal config for focus detection (face + iris + gaze + head pose):

```typescript
import Human from '@vladmandic/human';

const humanConfig = {
  // Use HumanGL backend (optimized WebGL, default for browser)
  // Reduces warmup from ~22s (WebGL) to ~6s
  backend: 'humangl',

  modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/',

  // Only enable what we need — disabling unused modules improves performance
  face: {
    enabled: true,
    detector: {
      enabled: true,
      maxDetected: 1,        // Single user — only detect one face
      minConfidence: 0.2,    // Default, good balance
      rotation: true,        // Enable head rotation detection
    },
    mesh: {
      enabled: true,         // Required for head pose angles
    },
    iris: {
      enabled: true,         // Required for gaze tracking
    },
    emotion: {
      enabled: false,        // Not needed for focus detection
    },
    description: {
      enabled: false,        // Age/gender not needed
    },
    attention: {
      enabled: false,        // Alternative attention model, not needed
    },
  },

  // Disable everything we don't need
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  segmentation: { enabled: false },
  gesture: { enabled: true },  // Can detect head nod/shake — useful for focus
};

const human = new Human(humanConfig);
```

### Face Result Structure for Focus Scoring

After `human.detect(videoElement)`, the face result contains:

```typescript
result.face[0].rotation = {
  angle: {
    roll: number,   // Head tilt sideways (radians)
    yaw: number,    // Head turn left/right (radians) — KEY for "looking away"
    pitch: number,  // Head tilt up/down (radians) — KEY for "looking at phone"
  },
  matrix: number[][],  // 3x3 rotation matrix
  gaze: {
    bearing: number,   // Gaze direction angle (radians)
    strength: number,  // Gaze confidence/magnitude
  },
};
```

**To convert radians to degrees:** `angle * 180 / Math.PI`

### Focus Score Algorithm (Recommended Approach)

Based on the Human.js result structure and the GitHub discussion (#479) about student focus detection:

1. **Head Pose Score (60% weight):** Use `yaw` and `pitch` angles. Centered face (yaw ~0, pitch ~0) = high score. Large yaw = looking away. Large negative pitch = looking down at phone.
2. **Gaze Score (30% weight):** Use `gaze.bearing` and `gaze.strength`. Central gaze with high strength = focused.
3. **Face Presence (10% weight):** If no face detected (`result.face.length === 0`), score drops to 0.

Combine head pose + gaze for more reliable detection than either alone.

### Performance Expectations

| Metric | Value | Source |
|--------|-------|--------|
| HumanGL warmup time | ~6 seconds | GitHub wiki/Backends |
| Average inference time | ~1.6 seconds per frame | GitHub wiki/Backends |
| Recommended frame rate | 2-5 FPS for detection | Practical limit with full face pipeline |
| Model download size | ~15-25 MB total | CDN-loaded, cached after first load |

### Critical Integration Notes

1. **Client-side only.** Human.js runs in the browser via WebGL/WASM. It does NOT run on the server. In Next.js, wrap all Human.js code in `'use client'` components and use dynamic imports with `ssr: false`.
2. **Model loading is async.** Call `await human.load()` before first detection. Show a loading indicator during warmup.
3. **Video element required.** Human.js needs an HTML `<video>` element with webcam stream. Use `navigator.mediaDevices.getUserMedia({ video: true })` to get the stream.
4. **requestAnimationFrame loop.** Run detection in a loop: `const result = await human.detect(videoElement)` inside rAF or setInterval at 2-5 FPS.
5. **Memory management.** Call `human.next(result)` after processing to help with garbage collection. Dispose tensors if doing manual processing.

## Webcam Access Pattern

Do NOT use `react-webcam` (v7.2.0, last updated 2 years ago, stale). Instead, use the native `getUserMedia` API directly in a custom hook:

```typescript
// useWebcam.ts - Custom hook for webcam access
'use client';
import { useRef, useEffect, useCallback } from 'react';

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopCamera(); // Cleanup on unmount
  }, [stopCamera]);

  return { videoRef, startCamera, stopCamera };
}
```

**Rationale:** getUserMedia is well-supported in Chrome/Edge (your target browsers). A 30-line custom hook gives you full control without a dependency. react-webcam adds complexity and is unmaintained.

## Installation

```bash
# Frontend (Next.js project)
npx create-next-app@15 focusflow-frontend --typescript --tailwind --app --src-dir
cd focusflow-frontend
npm install @vladmandic/human motion recharts socket.io-client

# Backend (Express project)
mkdir focusflow-backend && cd focusflow-backend
npm init -y
npm install express@5 socket.io cors helmet compression dotenv @google/genai @elevenlabs/elevenlabs-js
npm install -D typescript @types/express @types/node ts-node nodemon

# Optional: MongoDB
npm install mongodb        # If using MongoDB driver directly
# OR
npm install mongoose       # If using Mongoose ODM
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @vladmandic/human | WebGazer.js | NEVER for this project. WebGazer requires calibration (user must click to train gaze model), is noisier, less temporally precise per research. Human.js provides instant gaze + head pose without calibration. |
| @vladmandic/human | MediaPipe FaceMesh (standalone) | Only if you need bare-metal control. Human.js wraps MediaPipe models with a clean API. Going direct adds complexity for no benefit. |
| @google/genai | @google/generative-ai | NEVER. Deprecated since Aug 2025. All support permanently ended. |
| @google/genai | OpenAI API | Only if Gemini is a hard blocker. But Gemini 2.5 Flash is free-tier friendly and a sponsor track requirement. |
| Express 5 | Fastify | If you want higher throughput. But Express is simpler, more documented, and overkill optimization for a hackathon. |
| Socket.io | WebSockets (raw) | NEVER for hackathon. Socket.io handles reconnection, rooms, namespaces. Raw WS requires building all of this from scratch. |
| motion (framer-motion) | React Spring | Only if you need physics-based animations. Motion has better docs, larger community, and simpler API. |
| Tailwind CSS v4 | Tailwind CSS v3 | Only if you hit v4 compatibility issues with component libraries. Unlikely for a new project. |
| Next.js 15 | Next.js 16 | If you want Turbopack as default bundler and React 19.2 features. But 15.x is safer for hackathon — less risk of undocumented edge cases. Upgrade later if desired. |
| MongoDB | SQLite / In-memory | For hackathon demo, in-memory is simpler. MongoDB adds setup time. Only use MongoDB if you need data persistence across server restarts. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @google/generative-ai | **Deprecated.** Support permanently ended Aug 2025. Will not receive updates or security patches. | @google/genai (unified SDK, GA since May 2025) |
| react-webcam | Last published 2+ years ago. Unmaintained. Adds unnecessary dependency for something achievable in 30 lines. | Native getUserMedia in a custom React hook |
| WebGazer.js | Requires calibration clicks from user (terrible UX for real-time focus tracking). Noisier gaze estimates. No head pose detection. | @vladmandic/human (instant gaze + head pose, no calibration) |
| face-api.js | Abandoned. Last updated years ago. Based on old TF.js versions. | @vladmandic/human (same author created Human as the successor to face-api.js) |
| TensorFlow.js (standalone) | No need to install separately. Human.js bundles TFJS 4.17.0. Installing a separate version can cause version conflicts. | Let @vladmandic/human manage its own TFJS dependency |
| framer-motion (old package name) | Rebranded to "motion" in Nov 2024. Old package still works but new imports are `motion/react`. Use the new name for clean project setup. | motion (npm package "motion") |
| Express 4.x | Express 5 is now default on npm. v4 is legacy. No reason to use old version for new project. | express@5 |
| Next.js Pages Router | App Router is the standard in Next.js 15. Pages Router is legacy. All new tutorials and docs target App Router. | Next.js App Router |

## Stack Patterns by Variant

**If focus detection accuracy is poor:**
- Increase video resolution in getUserMedia constraints (1280x720 instead of 640x480)
- Reduce detection interval (slower but more accurate per frame)
- Enable `face.detector.rotation: true` for better angle handling
- Consider enabling `face.attention` model as supplementary signal
- Lower `face.detector.minConfidence` to catch partially visible faces

**If performance is too slow (< 2 FPS):**
- Reduce video resolution to 320x240 for detection input
- Increase `skipFrames` values in face config
- Verify HumanGL backend is active (not falling back to WASM/CPU)
- Disable `face.mesh` if head pose is not needed (keep iris for gaze only)

**If model loading is too slow:**
- Self-host models in `/public/models/` instead of CDN
- Preload models during splash screen with `human.load()`
- Show progress indicator using Human's `human.events` for load progress

**If running without MongoDB:**
- Use a simple in-memory Map/object for session storage
- Data resets on server restart — acceptable for demo
- Log important data to console as backup

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| @vladmandic/human@3.2.1 | TensorFlow.js 4.17.0 (bundled) | Do NOT install @tensorflow/tfjs separately. Human bundles its own. |
| Next.js 15.x | React 19.x, TypeScript 5.x | Ships together via create-next-app |
| Tailwind CSS 4.x | Next.js 15.x | Works with `@tailwindcss/postcss` plugin. create-next-app handles setup. |
| Socket.io 4.8.x | socket.io-client 4.8.x | Server and client versions MUST match major.minor. |
| Express 5.x | Node.js >= 18 | Express 5 drops Node < 18 support |
| @google/genai 1.x | Node.js >= 18 | Modern SDK requires recent Node |
| motion 12.x | React 18.x or 19.x | Works with both React versions |

## Sources

- [@vladmandic/human GitHub releases](https://github.com/vladmandic/human/releases) — v3.2.1 (Feb 2025), TFJS 4.17.0 bundled. **HIGH confidence**
- [@vladmandic/human Wiki: Config](https://github.com/vladmandic/human/wiki/Config) — Configuration structure, modelBasePath, module toggles. **HIGH confidence**
- [@vladmandic/human Wiki: Backends](https://github.com/vladmandic/human/wiki/Backends) — HumanGL warmup 6s vs WebGL 22s, backend recommendations. **HIGH confidence**
- [@vladmandic/human Wiki: Result](https://github.com/vladmandic/human/wiki/Result) — Face result structure with rotation.angle and rotation.gaze. **HIGH confidence**
- [@vladmandic/human Discussion #479](https://github.com/vladmandic/human/discussions/479) — Student focus detection approach using gaze + head pose. **HIGH confidence**
- [@vladmandic/human src/config.ts](https://github.com/vladmandic/human/blob/main/src/config.ts) — Face detector/mesh/iris default configs. **HIGH confidence**
- [Next.js 15 blog post](https://nextjs.org/blog/next-15) — Next.js 15 features, React 19 support. **HIGH confidence**
- [Next.js 16 blog post](https://nextjs.org/blog/next-16) — Next.js 16 released Oct 2025, Turbopack stable. **HIGH confidence**
- [Express 5.1 release announcement](https://expressjs.com/2025/03/31/v5-1-latest-release.html) — Express 5 now default on npm. **HIGH confidence**
- [Socket.io npm](https://www.npmjs.com/package/socket.io) — v4.8.3 current. **HIGH confidence**
- [Tailwind CSS v4 blog](https://tailwindcss.com/blog/tailwindcss-v4) — v4.0 released Jan 2025, 5x faster. **HIGH confidence**
- [@google/genai npm](https://www.npmjs.com/package/@google/genai) — v1.40.0, official GA Gemini SDK. **HIGH confidence**
- [deprecated-generative-ai-js GitHub](https://github.com/google-gemini/deprecated-generative-ai-js) — Old SDK deprecated, migrate to @google/genai. **HIGH confidence**
- [@elevenlabs/elevenlabs-js npm](https://www.npmjs.com/package/@elevenlabs/elevenlabs-js) — Official ElevenLabs Node SDK. **MEDIUM confidence** (exact version unverified)
- [Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide) — framer-motion rebranded to motion, import from motion/react. **HIGH confidence**
- [Recharts npm](https://www.npmjs.com/package/recharts) — v3.7.0 released Jan 2026. **HIGH confidence**
- [MDN getUserMedia docs](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) — Browser webcam API, HTTPS requirement, permission model. **HIGH confidence**
- [WebGazer.js validation study (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10841511/) — WebGazer accuracy limitations, calibration requirement. **MEDIUM confidence**

---
*Stack research for: AI-powered webcam focus tracking (FocusFlow)*
*Researched: 2026-02-07*
