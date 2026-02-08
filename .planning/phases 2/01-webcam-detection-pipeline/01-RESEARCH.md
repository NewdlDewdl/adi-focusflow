# Phase 1: Webcam Detection Pipeline - Research

**Researched:** 2026-02-07
**Domain:** Real-time browser-based face detection, iris/gaze tracking, and head pose estimation using Human.js with WebGL tensor memory management
**Confidence:** HIGH

## Summary

Phase 1 builds the foundational webcam detection pipeline that all subsequent phases depend on. The core technology is `@vladmandic/human` (v3.3.6), which bundles face detection (BlazeFace), face mesh (FaceMesh), and iris analysis (MediaPipe Iris) into a single library with its own TensorFlow.js 4.17.0 runtime. The critical engineering challenge is not getting detection working (Human.js makes that straightforward) but keeping it running reliably for 30+ minutes without crashing the browser tab from WebGL tensor/texture memory accumulation.

The detection loop must be decoupled from the rendering loop. Human.js inference takes 30-100ms per frame on a modern GPU, making 60fps detection impossible and unnecessary. The recommended pattern is a throttled `setInterval` at 200ms (5 Hz detection rate) with React rendering at 60fps using the most recent detection result. Human.js provides built-in frame caching via `skipFrames`/`skipTime`/`cacheSensitivity` that avoids redundant inference when the input has not changed meaningfully.

The webcam permission flow is the literal first thing users experience. The `getUserMedia` API has six distinct error types that must each produce a helpful, actionable message. A pre-permission screen explaining privacy before the browser prompt appears is essential for grant rates. The `navigator.permissions.query({ name: 'camera' })` API enables checking permission state before requesting, enabling the correct UI state (prompt vs. denied vs. granted) without triggering the browser dialog.

**Primary recommendation:** Build the detection pipeline as a self-contained `'use client'` component loaded via `next/dynamic` with `ssr: false`. Use `human.webcam` helpers for camera access, `human.detect()` in a throttled loop, and `human.next()` for temporal smoothing. Monitor `human.tf.memory().numTensors` continuously -- if the count climbs over time, tensors are leaking and the session will eventually crash.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @vladmandic/human | 3.3.6 | Face detection, iris tracking, gaze estimation, head pose (yaw/pitch/roll) | Single library provides the complete detection pipeline. Bundles TensorFlow.js 4.17.0 internally. No need to stitch together multiple ML libraries. Ships with TypeScript definitions. **Confidence: HIGH** (verified via TypeDoc v3.3.6 and GitHub releases) |
| Next.js | 15.x | App Router, project structure, dev server | Project constraint. All detection code is client-side; Next.js provides routing and DX. **Confidence: HIGH** |
| React | 19.x | UI components, hooks for detection loop lifecycle | Ships with Next.js 15. **Confidence: HIGH** |
| TypeScript | 5.x | Type safety for Human.js result types and detection state | Human.js ships full TypeScript definitions. Non-negotiable for ML result types. **Confidence: HIGH** |
| Tailwind CSS | 4.x | Styling for permission screens, privacy indicators, monitoring panel | Project constraint. v4.0 targets Chrome 111+ which aligns with desktop Chrome/Edge. **Confidence: HIGH** |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | Phase 1 has no additional library dependencies beyond Human.js and the Next.js stack. The webcam access, detection loop, draw overlay, and tensor monitoring are all provided by Human.js or native browser APIs. |

### Version Correction

The prior project research (STACK.md) references `@vladmandic/human` v3.2.1. The actual latest version is **v3.3.6** (verified via TypeDoc at `vladmandic.github.io/human/typedoc`). v3.3.6 bundles TensorFlow.js 4.17.0. Use v3.3.6 unless a specific incompatibility is found.

**Installation:**
```bash
npm install @vladmandic/human
```

No separate TensorFlow.js install needed -- Human.js bundles its own. Installing a separate `@tensorflow/tfjs` can cause version conflicts.

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing page with webcam detection
├── components/
│   ├── detection/
│   │   ├── DetectionProvider.tsx    # Client-only wrapper loaded via next/dynamic
│   │   ├── WebcamView.tsx          # Video element + canvas overlay
│   │   ├── PermissionGate.tsx      # Pre-permission screen + error handling
│   │   ├── PrivacyIndicator.tsx    # Persistent "camera active" badge
│   │   └── MonitoringPanel.tsx     # FPS + tensor count display
│   └── ui/                         # Shared UI primitives
├── hooks/
│   ├── useHumanDetection.ts        # Detection loop lifecycle
│   ├── useWebcamPermission.ts      # Permission state machine
│   └── useTensorMonitor.ts         # Memory leak detection
└── lib/
    ├── human-config.ts             # Human.js configuration
    └── detection-types.ts          # TypeScript types for detection results
```

### Pattern 1: Client-Only Detection Component via next/dynamic

**What:** All Human.js code must run in the browser only. In Next.js 15 App Router, this requires a `'use client'` component loaded via `next/dynamic` with `ssr: false`.

**When to use:** Always -- Human.js accesses WebGL, `navigator.mediaDevices`, and canvas APIs that do not exist on the server.

**Example:**
```typescript
// app/page.tsx (Server Component)
import dynamic from 'next/dynamic';

const DetectionProvider = dynamic(
  () => import('@/components/detection/DetectionProvider'),
  {
    ssr: false,
    loading: () => <DetectionLoadingState />,
  }
);

export default function HomePage() {
  return (
    <main>
      <DetectionProvider />
    </main>
  );
}
```

```typescript
// components/detection/DetectionProvider.tsx
'use client';

import { useHumanDetection } from '@/hooks/useHumanDetection';
import { useWebcamPermission } from '@/hooks/useWebcamPermission';

export default function DetectionProvider() {
  const permission = useWebcamPermission();
  const detection = useHumanDetection(/* ... */);
  // ...
}
```

**Key constraint:** `ssr: false` only works inside `'use client'` components. If you use it in a Server Component, Next.js will throw an error. The correct pattern is: Server Component imports a Client Component via `next/dynamic({ ssr: false })`.

Source: [Next.js Lazy Loading Docs](https://nextjs.org/docs/app/guides/lazy-loading)

### Pattern 2: Decoupled Detection Loop (Throttled setInterval, Not rAF)

**What:** Run `human.detect()` in a throttled loop at 200ms intervals (5 Hz), separate from the 60fps render loop. Store the latest result in a React ref; UI reads from the ref on each render frame.

**When to use:** Always -- ML inference takes 30-100ms per frame, making 60fps detection impossible. Attempting it queues up detection calls faster than they complete, causing memory pressure and UI jank.

**Example:**
```typescript
// hooks/useHumanDetection.ts
'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Human from '@vladmandic/human';
import { humanConfig } from '@/lib/human-config';

const DETECT_INTERVAL_MS = 200; // 5 Hz detection rate (PERF-04)

export function useHumanDetection(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const humanRef = useRef<Human | null>(null);
  const [result, setResult] = useState<any>(null);
  const [fps, setFps] = useState(0);
  const [tensorCount, setTensorCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const runningRef = useRef(false);

  // Initialize Human.js once
  useEffect(() => {
    const human = new Human(humanConfig);
    humanRef.current = human;

    const init = async () => {
      await human.load();           // Preload models
      await human.warmup();         // Warm up backend (reduces first-frame latency)
      setIsReady(true);
    };

    init();

    return () => {
      runningRef.current = false;
      // Human.js does not have a dispose() method;
      // setting reference to null allows GC
      humanRef.current = null;
    };
  }, []);

  // Detection loop
  useEffect(() => {
    if (!isReady || !videoRef.current) return;

    const human = humanRef.current;
    if (!human) return;

    runningRef.current = true;
    let lastTime = performance.now();

    const detect = async () => {
      if (!runningRef.current || !videoRef.current) return;

      const res = await human.detect(videoRef.current);
      const interpolated = human.next(res); // Temporal smoothing
      setResult(interpolated);

      // FPS calculation (PERF-01)
      const now = performance.now();
      setFps(Math.round(1000 / (now - lastTime)));
      lastTime = now;

      // Tensor monitoring (PERF-02)
      setTensorCount(human.tf.memory().numTensors);

      if (runningRef.current) {
        setTimeout(detect, DETECT_INTERVAL_MS);
      }
    };

    detect();

    return () => {
      runningRef.current = false;
    };
  }, [isReady, videoRef]);

  return { result, fps, tensorCount, isReady };
}
```

Source: [Human.js Usage Wiki](https://github.com/vladmandic/human/wiki/Usage), [Human.js Backends Wiki](https://github.com/vladmandic/human/wiki/Backends)

### Pattern 3: Permission State Machine

**What:** Use `navigator.permissions.query({ name: 'camera' })` to check permission state before requesting, and model the webcam permission flow as a state machine: `idle -> prompting -> granted | denied | error`.

**When to use:** Always -- the permission flow is the first thing users see.

**Example:**
```typescript
// hooks/useWebcamPermission.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type PermissionState = 'idle' | 'checking' | 'prompt' | 'granted' | 'denied' | 'error';

interface PermissionResult {
  state: PermissionState;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  requestPermission: () => Promise<void>;
}

export function useWebcamPermission(): PermissionResult {
  const [state, setState] = useState<PermissionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check initial permission state without triggering prompt
  useEffect(() => {
    setState('checking');
    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((status) => {
        if (status.state === 'granted') setState('granted');
        else if (status.state === 'denied') {
          setState('denied');
          setError('Camera access was previously denied. Click the camera icon in your address bar to allow access.');
        } else {
          setState('prompt'); // Will need to show pre-permission screen
        }
        // Listen for changes (e.g., user changes in browser settings)
        status.addEventListener('change', () => {
          if (status.state === 'granted') setState('granted');
          else if (status.state === 'denied') setState('denied');
        });
      })
      .catch(() => {
        // Permissions API not supported; fall through to getUserMedia
        setState('prompt');
      });
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setState('granted');
      setError(null);
    } catch (err: any) {
      setState('error');
      switch (err.name) {
        case 'NotAllowedError':
          setError('Camera access denied. Click the camera icon in your address bar, then select "Allow".');
          break;
        case 'NotFoundError':
          setError('No camera found. Please connect a webcam and try again.');
          break;
        case 'NotReadableError':
          setError('Camera is in use by another application. Close other apps using the camera and try again.');
          break;
        case 'OverconstrainedError':
          setError('Camera does not support the required settings. Try a different camera.');
          break;
        default:
          setError(`Camera error: ${err.message}`);
      }
    }
  }, []);

  // Cleanup: stop all tracks on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return { state, error, videoRef, requestPermission };
}
```

Source: [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [MDN Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API)

### Anti-Patterns to Avoid

- **Running detection at 60fps via requestAnimationFrame:** ML inference takes 30-100ms. Running at 60fps queues calls faster than they complete, causing memory pressure and UI jank. Use throttled `setTimeout` at 200ms instead.

- **Installing TensorFlow.js separately:** Human.js bundles TFJS 4.17.0 internally. Installing `@tensorflow/tfjs` alongside it causes version conflicts and double-initialization of WebGL context.

- **Using `react-webcam` package:** Last published 2+ years ago, unmaintained. Native `getUserMedia` in a custom hook is 30 lines and gives full control. Or use `human.webcam` helpers which are maintained.

- **Importing Human.js in a Server Component:** Human.js requires WebGL/canvas/navigator APIs. Any import outside a `'use client'` boundary will crash during SSR. Always use `next/dynamic` with `ssr: false`.

- **Setting `face.detector.return: true` without manual tensor disposal:** When `return: true`, Human.js outputs a raw face tensor that YOU must dispose manually via `tensor.dispose()`. If you don't need the raw tensor (and for focus tracking you don't), keep `return: false` (the default).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Face detection | Custom TensorFlow.js model loading, BlazeFace standalone | `@vladmandic/human` with `face.enabled: true` | Human.js handles model loading, warmup, caching, and result formatting. Building this manually means managing 5+ model files, tensor lifecycle, and output parsing. |
| Gaze tracking | Custom iris landmark → gaze vector math | `@vladmandic/human` with `face.iris.enabled: true` | Human.js wraps MediaPipe Iris with a clean API. The `rotation.gaze.bearing` and `rotation.gaze.strength` fields provide gaze direction out of the box. |
| Head pose estimation | Custom PnP solve from face mesh landmarks | `@vladmandic/human` with `face.mesh.enabled: true` | `rotation.angle.yaw/pitch/roll` are computed automatically from the face mesh. Rolling your own requires OpenCV-style solvePnP or manual rotation matrix extraction. |
| Webcam stream management | Complex custom getUserMedia wrapper | `human.webcam.start()` / `human.webcam.stop()` | Human.js includes webcam helpers that handle stream lifecycle, video element binding, and cleanup. Alternatively, a simple custom hook works fine (30 lines). |
| Canvas overlay drawing | Custom canvas 2D drawing for face mesh, bounding boxes, gaze lines | `human.draw.all()` or `human.draw.face()` | Human.js draw API renders bounding boxes, face mesh, gaze direction, and labels with configurable options. Handles canvas sizing and coordinate mapping. |
| Temporal result smoothing | Custom rolling average / exponential moving average for detection results | `human.next(result)` | Returns time-variant smoothed/interpolated results between detection frames. Handles the 200ms gaps between detections so the UI doesn't jump. |

**Key insight:** Human.js is an unusually complete library. For Phase 1, almost nothing needs to be built from scratch -- the work is configuring Human.js correctly and building the React integration around it.

## Common Pitfalls

### Pitfall 1: WebGL Tensor/Texture Memory Leak Crashes Browser After 15-30 Minutes

**What goes wrong:** TensorFlow.js WebGL backend allocates GPU textures for intermediate tensors during each inference pass. These are NOT garbage collected by JavaScript. Without proper management, the browser tab crashes after 15-30 minutes of continuous detection -- exactly the duration of a target focus session.

**Why it happens:** Developers call `human.detect()` in a loop and assume JavaScript GC handles cleanup. It does not. WebGL textures persist until explicitly freed.

**How to avoid:**
1. Monitor `human.tf.memory().numTensors` every 100 frames. If the count climbs steadily, tensors are leaking. Log it to console during development.
2. Set `config.deallocate: true` to force immediate garbage collection of deallocated tensors instead of caching them. This trades some performance for memory stability.
3. Keep `config.face.detector.return: false` (default). When `return: true`, Human.js outputs raw face tensors that YOU must manually `dispose()`.
4. Use Human.js's built-in frame caching (`skipFrames`/`skipTime`/`cacheSensitivity`) to skip redundant inference on unchanged frames.
5. Validate with a 30-minute sustained session. Monitor numTensors -- it must stay flat (PERF-05).

**Warning signs:** `numTensors` increasing over time; browser tab memory climbing past 500MB; Chrome "Aw, Snap!" crash after 10-20 minutes.

Source: [TensorFlow.js Issue #4309](https://github.com/tensorflow/tfjs/issues/4309), [TensorFlow.js Issue #1440](https://github.com/tensorflow/tfjs/issues/1440), [TensorFlow.js Issue #6019](https://github.com/tensorflow/tfjs/issues/6019)

### Pitfall 2: Enabling All Human.js Modules Tanks Frame Rate

**What goes wrong:** Human.js with all modules enabled (face + mesh + iris + body + hand + emotion + age/gender) drops to 10-20 FPS on laptops. The main thread blocks during inference, causing UI stuttering.

**Why it happens:** Each additional module adds inference time. The default config enables face, mesh, iris, emotion, description, body, hand, and gesture -- far more than needed for focus tracking.

**How to avoid:** Only enable what focus detection actually needs:
- `face.enabled: true` (face detection)
- `face.mesh.enabled: true` (head pose -- yaw/pitch/roll)
- `face.iris.enabled: true` (gaze tracking)
- `face.detector.rotation: true` (handle rotated faces)
- `face.detector.maxDetected: 1` (single user)
- Disable everything else: `body: false`, `hand: false`, `object: false`, `segmentation: false`, `face.emotion: false`, `face.description: false`

**Warning signs:** FPS counter drops below 15 during testing; UI animations stutter or freeze during detection.

### Pitfall 3: getUserMedia Permission Handling Breaks First-Time Experience

**What goes wrong:** User sees browser permission dialog they don't understand, dismisses or denies it, and the app shows a black screen or infinite loader with no actionable error message. Works on developer's machine (permissions already granted) but breaks on demo machine.

**Why it happens:** Developers test with permissions already granted and never experience the denied/dismissed flows. Browser error types differ: Chrome throws `NotAllowedError`, some contexts produce `TypeError` on HTTP.

**How to avoid:**
1. Show a pre-permission screen explaining why the camera is needed BEFORE calling `getUserMedia()`.
2. Use `navigator.permissions.query({ name: 'camera' })` to check permission state before requesting.
3. Catch errors by `error.name` and display specific, actionable messages for each type.
4. Add `playsInline`, `muted`, and `autoPlay` attributes to the `<video>` element for compatibility.
5. Test the denied flow, the dismissed flow, and the no-camera-found flow.

**Warning signs:** Black screen on first load during demo; no error messages visible when camera access fails.

Source: [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

### Pitfall 4: HumanGL Warmup Takes 6 Seconds With No Loading Indicator

**What goes wrong:** User clicks "Start" and nothing happens for 6 seconds while models load and the WebGL backend warms up. They click again, or navigate away, thinking the app is broken.

**Why it happens:** `human.load()` downloads model files (15-25 MB total) and `human.warmup()` initializes the GPU pipeline. Together they take ~6 seconds with HumanGL backend. Developers often forget to show a loading state.

**How to avoid:**
1. Call `human.load()` and `human.warmup()` during the pre-permission/welcome screen, before detection starts.
2. Show a progress indicator. Use `human.events` EventTarget which emits `load`, `warmup`, and `error` events.
3. Set `config.warmup: 'full'` (default) for fastest subsequent detection.
4. Consider self-hosting models in `/public/models/` for faster loading instead of CDN.

**Warning signs:** 3-6 second blank screen after granting camera permission before first detection result appears.

Source: [Human.js Backends Wiki](https://github.com/vladmandic/human/wiki/Backends)

### Pitfall 5: Stream Tracks Not Stopped on Component Unmount

**What goes wrong:** User navigates away from the detection page, but the green camera LED stays on. The webcam stream keeps running in the background, draining battery and keeping the camera locked.

**Why it happens:** `getUserMedia` returns a `MediaStream` with active tracks. These tracks persist until explicitly stopped via `track.stop()`. React component unmounting does NOT automatically stop them.

**How to avoid:** Always call `stream.getTracks().forEach(t => t.stop())` in the `useEffect` cleanup function. If using `human.webcam`, call `human.webcam.stop()` on unmount.

**Warning signs:** Green camera LED stays on after leaving the page; "camera in use by another application" errors when reopening.

## Code Examples

Verified patterns from official sources.

### Human.js Configuration for Focus Tracking

```typescript
// lib/human-config.ts
// Source: Human.js Config Wiki + config.ts defaults + TypeDoc v3.3.6

import type { Config } from '@vladmandic/human';

export const humanConfig: Partial<Config> = {
  backend: 'humangl' as any,    // Fastest warmup: ~6s vs ~22s for webgl
  modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/',
  cacheModels: true,             // Cache models in IndexedDB after first load
  cacheSensitivity: 0.70,        // Skip detection if input changed < 30%
  deallocate: false,             // Set true if tensor count climbs during testing
  warmup: 'full',                // Full warmup for fastest first detection
  debug: false,                  // Disable for production

  filter: {
    enabled: true,               // Enable input preprocessing
    equalization: false,
    autoBrightness: true,        // Handle variable lighting automatically
    flip: false,                 // Don't flip (user-facing camera)
    return: true,                // Return processed canvas for overlay
    width: 0,                    // 0 = use input dimensions
    height: 0,
  },

  face: {
    enabled: true,
    detector: {
      modelPath: 'blazeface.json',
      rotation: true,           // Enable rotation correction for angled faces
      maxDetected: 1,           // Single user -- only detect one face
      minConfidence: 0.2,       // Default, good balance
      skipFrames: 99,           // Use caching between active detections
      skipTime: 2500,           // Re-detect every 2.5s if input unchanged
      iouThreshold: 0.1,
      scale: 1.4,
      mask: false,
      return: false,            // CRITICAL: false prevents tensor leak
    },
    mesh: {
      enabled: true,            // Required for head pose (yaw/pitch/roll)
      modelPath: 'facemesh.json',
      keepInvalid: false,
    },
    iris: {
      enabled: true,            // Required for gaze tracking
      modelPath: 'iris.json',
      scale: 2.3,
    },
    emotion: { enabled: false },     // Not needed for Phase 1
    description: { enabled: false }, // Age/gender not needed
    attention: { enabled: false },   // Alternative attention model, not needed
    antispoof: { enabled: false },
    liveness: { enabled: false },
  },

  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  segmentation: { enabled: false },

  gesture: { enabled: true },   // Detects head nod/shake -- useful for future scoring
};
```

Source: [Human.js Config Wiki](https://github.com/vladmandic/human/wiki/Config), [Human.js config.ts source](https://github.com/vladmandic/human/blob/main/src/config.ts), [TypeDoc Config interface](https://vladmandic.github.io/human/typedoc/interfaces/Config.html)

### Face Detection Result Structure (What Phase 2 Will Consume)

```typescript
// lib/detection-types.ts
// Source: Human.js result.ts source + TypeDoc FaceResult interface

// After human.detect(videoElement), result.face[0] contains:

interface FaceDetectionData {
  // Face presence & confidence
  id: number;                  // Face ID
  score: number;               // Overall score (0-1)
  boxScore: number;            // Detection confidence
  faceScore: number;           // Mesh quality score
  box: [number, number, number, number]; // [x, y, width, height] in pixels

  // HEAD POSE -- Key for focus detection
  rotation: {
    angle: {
      roll: number;            // Head tilt sideways (radians)
      yaw: number;             // Head turn left/right (radians) -- "looking away"
      pitch: number;           // Head tilt up/down (radians) -- "looking at phone"
    };
    matrix: number[];          // 3x3 rotation matrix (9 elements)
    gaze: {
      bearing: number;         // Gaze direction angle (radians)
      strength: number;        // Gaze confidence/magnitude (0-1)
    };
  } | null;

  // Face mesh -- 468 landmarks + 10 iris points
  mesh: [number, number, number?][];
  annotations: Record<string, [number, number, number?][]>;

  // Distance from camera (based on iris size)
  distance?: number;
}

// Performance timing object
// result.performance is Record<string, number> with keys like:
// 'total', 'detect', 'face', 'facemesh', 'iris', etc.
// Values are milliseconds
```

Source: [Human.js Result Wiki](https://github.com/vladmandic/human/wiki/Result), [TypeDoc FaceResult](https://vladmandic.github.io/human/typedoc/)

### Canvas Overlay Drawing

```typescript
// Drawing detection results on a canvas overlay
// Source: Human.js Draw Wiki

// Option A: Use Human.js built-in draw API
const drawResults = async (
  human: Human,
  canvas: HTMLCanvasElement,
  result: any,
) => {
  // Draw input frame to canvas
  await human.draw.canvas(result.canvas || videoRef.current, canvas);
  // Draw all face detection overlays (bounding box, mesh, gaze)
  await human.draw.all(canvas, result);
};

// Option B: Custom minimal draw for just gaze direction + head pose
// (for a cleaner overlay without full mesh)
const drawFocusOverlay = (
  ctx: CanvasRenderingContext2D,
  face: any,
) => {
  if (!face?.rotation) return;

  const { yaw, pitch, roll } = face.rotation.angle;
  const { bearing, strength } = face.rotation.gaze;

  // Convert radians to degrees for display
  const yawDeg = Math.round(yaw * 180 / Math.PI);
  const pitchDeg = Math.round(pitch * 180 / Math.PI);
  const rollDeg = Math.round(roll * 180 / Math.PI);

  // Draw text overlay with head pose data
  ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
  ctx.font = '14px monospace';
  ctx.fillText(`Yaw: ${yawDeg}deg  Pitch: ${pitchDeg}deg  Roll: ${rollDeg}deg`, 10, 20);
  ctx.fillText(`Gaze: ${Math.round(bearing * 180 / Math.PI)}deg (${(strength * 100).toFixed(0)}%)`, 10, 40);
};
```

Source: [Human.js Draw Wiki](https://github.com/vladmandic/human/wiki/Draw)

### Tensor Monitoring Hook

```typescript
// hooks/useTensorMonitor.ts
// Source: TensorFlow.js tf.memory() API + Human.js tf property

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type Human from '@vladmandic/human';

interface TensorStats {
  numTensors: number;
  numBytes: number;
  isLeaking: boolean;  // True if tensor count is growing
}

export function useTensorMonitor(
  humanRef: React.RefObject<Human | null>,
  intervalMs: number = 5000,
): TensorStats {
  const [stats, setStats] = useState<TensorStats>({
    numTensors: 0,
    numBytes: 0,
    isLeaking: false,
  });
  const historyRef = useRef<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const human = humanRef.current;
      if (!human) return;

      const mem = human.tf.memory();
      const count = mem.numTensors;

      // Track last 10 readings
      historyRef.current.push(count);
      if (historyRef.current.length > 10) {
        historyRef.current.shift();
      }

      // Detect leak: if tensor count has been climbing for 5+ readings
      const history = historyRef.current;
      let isLeaking = false;
      if (history.length >= 5) {
        const recentTrend = history.slice(-5);
        isLeaking = recentTrend.every((val, i) =>
          i === 0 || val > recentTrend[i - 1]
        );
      }

      setStats({
        numTensors: count,
        numBytes: mem.numBytes,
        isLeaking,
      });

      if (isLeaking) {
        console.warn(
          `[TensorMonitor] Possible memory leak detected! Tensor count: ${count}, ` +
          `trend: ${history.slice(-5).join(' -> ')}`
        );
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [humanRef, intervalMs]);

  return stats;
}
```

Source: [TensorFlow.js Memory Management](https://ebookreading.net/view/book/EB9781617296178_35.html)

### Human.js Caching Configuration Explained

```typescript
// How Human.js caching works (critical for performance):
//
// Two-stage modules (Face, Hand) use a hybrid approach:
// 1. cacheSensitivity (0-1): measures relative pixel difference between
//    last known input and current input. If difference < threshold,
//    the cached result is returned without running inference.
//    Default: 0.70 (skip if input changed < 30%)
//
// 2. skipFrames / skipTime: per-module settings that control how many
//    frames OR how many milliseconds can pass before the cache is
//    invalidated and inference re-runs, even if input hasn't changed.
//    These are OR conditions -- whichever triggers first wins.
//
// Face detector defaults:
//   skipFrames: 99   -- cache up to 99 frames
//   skipTime: 2500   -- but re-detect at least every 2.5 seconds
//
// At 5 Hz detection rate (200ms intervals), 99 frames = ~20 seconds.
// But skipTime: 2500 ensures re-detection every 2.5 seconds regardless.
// This means: most frames use cached results, full inference runs
// every 2.5 seconds, and unchanged inputs are skipped entirely.
//
// For focus tracking, these defaults are fine. The user's face position
// changes slowly enough that 2.5-second re-detection is adequate for
// bounding box updates, while iris/mesh/gaze are analyzed on each
// non-cached frame.
//
// Monitor caching effectiveness via:
//   human.performance.totalFrames   -- total processed frames
//   human.performance.cachedFrames  -- frames using cached results
```

Source: [Human.js Caching Wiki](https://github.com/vladmandic/human/wiki/Caching)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WebGL backend (22s warmup) | HumanGL backend (6s warmup) | Human.js v3.0+ (2023) | 3.6x faster startup. HumanGL is now the recommended browser backend. |
| Manual TF.js model loading + inference pipeline | `human.detect()` single-call API | Human.js v1.0+ | Eliminates need to manage model loading, tensor conversion, and result parsing separately. |
| `face-api.js` for browser face detection | `@vladmandic/human` | 2021+ | face-api.js is abandoned. Human.js is its spiritual successor by the same author, with modern TF.js and expanded capabilities. |
| `react-webcam` for camera access | Native `getUserMedia` or `human.webcam` helpers | 2023+ | react-webcam unmaintained (2+ years). Native API or Human.js helpers are actively maintained. |
| WebGPU backend (experimental) | Still experimental; HumanGL recommended | Current | WebGPU shows best execution time (1,150ms vs 1,600ms) but warmup is 21s and requires Chrome flags. Not production-ready. |

**Deprecated/outdated:**
- `face-api.js`: Abandoned. Replaced by `@vladmandic/human`.
- `@tensorflow/tfjs` standalone install alongside Human.js: Not needed. Human.js bundles TF.js 4.17.0. Dual install causes conflicts.
- `react-webcam`: Unmaintained for 2+ years. Use native API.
- `config.backend: 'webgl'`: Works but HumanGL is strictly better (same execution speed, 3.6x faster warmup).

## Open Questions

1. **Web Worker for detection loop**
   - What we know: Human.js supports running in a Web Worker for offloading inference from the main thread. This would prevent any UI jank during detection.
   - What's unclear: The exact Web Worker integration pattern with React hooks and message passing. Human.js docs mention it but don't provide a complete React example.
   - Recommendation: Start without Web Worker (simpler). If FPS testing shows main thread blocking causing UI stutter at 5 Hz detection, add Web Worker as an optimization. The 200ms throttle should prevent most jank.

2. **Self-hosted vs CDN models**
   - What we know: Human.js loads models from `modelBasePath`. Default is CDN (`cdn.jsdelivr.net`). Can self-host by copying models to `/public/models/`.
   - What's unclear: Exact model download size breakdown per module. CDN has cold-start latency on first load but IndexedDB caching (`cacheModels: true`) mitigates subsequent loads.
   - Recommendation: Start with CDN + `cacheModels: true`. If model loading is too slow (>10s) during testing, copy models to `/public/models/` for same-origin loading.

3. **`deallocate: true` performance tradeoff**
   - What we know: `config.deallocate: true` forces immediate tensor garbage collection instead of caching. Prevents memory leaks but may reduce detection speed.
   - What's unclear: Exact performance impact (percentage slowdown) of `deallocate: true` on the detection loop.
   - Recommendation: Start with `deallocate: false` (default). Monitor `numTensors` during 30-minute tests. Switch to `true` only if tensor count climbs. If needed, the performance tradeoff is worth it to prevent crashes.

4. **Exact latest Human.js version to install**
   - What we know: TypeDoc references v3.3.6. GitHub releases page shows v3.2 (Feb 2025). NPM page shows v3.3.6 published ~4 months ago (Oct 2025).
   - What's unclear: Whether v3.3.6 introduces any breaking changes vs v3.2.
   - Recommendation: Install latest (`npm install @vladmandic/human`) which will get v3.3.6. If any issues arise, pin to `@vladmandic/human@3.2.1` which is known to work.

## Sources

### Primary (HIGH confidence)
- [Human.js TypeDoc v3.3.6 - Config Interface](https://vladmandic.github.io/human/typedoc/interfaces/Config.html) - Complete configuration schema with types and descriptions
- [Human.js TypeDoc v3.3.6 - FaceDetectorConfig](https://vladmandic.github.io/human/typedoc/interfaces/FaceDetectorConfig.html) - Face detector configuration options
- [Human.js TypeDoc v3.3.6 - Human Class](https://vladmandic.github.io/human/typedoc/classes/Human.html) - Complete public API
- [Human.js Config Wiki](https://github.com/vladmandic/human/wiki/Config) - Configuration structure and defaults
- [Human.js Result Wiki](https://github.com/vladmandic/human/wiki/Result) - Detection result structure
- [Human.js Backends Wiki](https://github.com/vladmandic/human/wiki/Backends) - HumanGL vs WebGL warmup/performance benchmarks
- [Human.js Caching Wiki](https://github.com/vladmandic/human/wiki/Caching) - skipFrames, skipTime, cacheSensitivity behavior
- [Human.js Usage Wiki](https://github.com/vladmandic/human/wiki/Usage) - API usage patterns: load(), warmup(), detect(), next()
- [Human.js Draw Wiki](https://github.com/vladmandic/human/wiki/Draw) - Canvas overlay drawing API
- [Human.js config.ts source](https://github.com/vladmandic/human/blob/main/src/config.ts) - Default configuration values (line 335)
- [Human.js result.ts source](https://github.com/vladmandic/human/blob/main/src/result.ts) - FaceResult interface with rotation/gaze fields
- [Human.js GitHub Releases](https://github.com/vladmandic/human/releases) - v3.2 (Feb 2025) release notes
- [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) - Error types, constraints, HTTPS requirement
- [MDN Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API) - Permission state query and change events
- [Next.js Lazy Loading Docs](https://nextjs.org/docs/app/guides/lazy-loading) - `next/dynamic` with `ssr: false` pattern

### Secondary (MEDIUM confidence)
- [TensorFlow.js Issue #1440](https://github.com/tensorflow/tfjs/issues/1440) - WebGL texture cache memory leak cause and workarounds
- [TensorFlow.js Issue #6019](https://github.com/tensorflow/tfjs/issues/6019) - Memory leak despite dispose/tidy: root cause (model reloading) and fix
- [TensorFlow.js Issue #4309](https://github.com/tensorflow/tfjs/issues/4309) - FaceMesh WebGL crash after 15-18 minutes
- [Human.js Issue #167](https://github.com/vladmandic/human/issues/167) - Chrome 93-95 GPU memory leak (fixed in Chrome 96+, workaround in Human 2.3.0+)
- [Human.js Issue #181](https://github.com/vladmandic/human/issues/181) - Chromium memory leak diagnosis (browser bug, not library bug)
- [Human.js Discussion #317](https://github.com/vladmandic/human/discussions/317) - Performance optimization for real-time face recognition
- [Human.js Discussion #479](https://github.com/vladmandic/human/discussions/479) - Student focus detection approach using gaze + head pose (referenced in STACK.md)

### Tertiary (LOW confidence)
- [TensorFlow.js Memory Management (O'Reilly)](https://ebookreading.net/view/book/EB9781617296178_35.html) - tf.dispose() and tf.tidy() patterns
- [Saturn Cloud: TF.js Memory Optimization](https://saturncloud.io/blog/how-to-optimize-memory-management-in-tensorflowjs-for-tfmodel/) - General TF.js memory management advice

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Human.js v3.3.6 verified via TypeDoc, GitHub releases, and NPM. Config and result structures verified via source code and TypeDoc interfaces.
- Architecture: HIGH - Detection loop pattern verified against Human.js official TypeScript demo and wiki. Next.js dynamic import pattern verified via official Next.js docs. Permission handling verified via MDN.
- Pitfalls: HIGH - WebGL memory leak is extensively documented in TensorFlow.js and Human.js issue trackers. getUserMedia error handling verified via MDN. Module performance impact confirmed by Human.js benchmarks.

**Research date:** 2026-02-07
**Valid until:** 2026-03-09 (30 days -- Human.js is stable, no major releases expected)
