# Phase 2: Focus Scoring & Visualization - Research

**Researched:** 2026-02-07
**Domain:** Real-time focus scoring algorithm (gaze + head pose), animated landing page hero, SVG score ring, sparkline charting, and shadcn/ui-style component patterns
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Landing Page with Animated Hero

**LOCKED REQUIREMENT:** Phase 2 must include a landing page with an animated hero section.

**Implementation details:**
- Use Framer Motion for text animations (cycling words effect)
- Base structure on the Hero component pattern provided by user
- Adapt all text/messaging to FocusFlow branding:
  - Focus on: webcam-based focus tracking, AI coaching, staying productive
  - Remove generic SMB trade messaging
  - Emphasize privacy ("video never leaves your device")
- Keep only essential CTAs:
  - Primary: "Start Focus Session" or "Try FocusFlow" → launches detection
  - Remove: "Jump on a call" button (not relevant for hackathon demo)
  - Remove or adapt: "Read our launch article" badge (could become "Built for [hackathon name]" if applicable)

**Component structure:**
- Install Framer Motion: `npm install framer-motion`
- Install required shadcn/ui components: Button (using the Button code provided)
- Install lucide-react for icons
- Create Hero component with animated text cycling through focus-related words
- Integrate into app routing (landing page separate from detection view, or same page with scroll/transition)

**Text adaptation examples:**
- Hero heading: "Stay focused with" + [cycling words: "real-time", "AI-powered", "intelligent", "webcam-based"] + "coaching"
- Subheading: Focus on productivity, eye tracking, distraction detection, privacy-first approach
- Emphasize: No recording, browser-based, instant feedback

**Routing decision needed:**
- Should landing page be a separate route (`/` = hero, `/session` = detection)?
- Or same page with scroll-to-start pattern?
- Or hero as overlay before permission gate?

Claude's discretion on routing approach -- choose what makes most sense for demo flow.

### Claude's Discretion

**Visual design:**
- Color scheme, exact animation timing, layout refinements
- Whether to add additional visual elements (demo video, screenshots, feature cards)
- Exact wording for hero text (as long as it's FocusFlow-relevant and emphasizes key value props)
- Icon choices from lucide-react

**Component architecture:**
- Where to place Hero component in file structure
- Whether to create reusable animation variants
- CSS/Tailwind customization beyond the base provided

**Integration with detection flow:**
- How user transitions from landing hero to webcam detection
- Whether to show a preview/teaser of the detection on the landing page

### Deferred Ideas (OUT OF SCOPE)

**Not in scope for Phase 2:**
- Multiple landing page variants or A/B testing
- SEO optimization, meta tags, Open Graph (hackathon demo, not production)
- Testimonials, pricing, feature comparison sections
- Newsletter signup or email capture
- Multi-language support
</user_constraints>

## Summary

Phase 2 has two distinct sub-domains that must be planned together: (1) a focus scoring algorithm that converts raw Human.js detection data (yaw, pitch, gaze bearing, gaze strength, face presence) into a smooth 0-100 score, and (2) a visual layer consisting of a landing page hero with animated cycling text, an SVG circular score ring, a sparkline chart, and stat cards.

The focus scoring algorithm is the critical novel engineering work. There is no off-the-shelf "focus score" library -- this must be designed from first principles using the detection data already flowing from Phase 1. The recommended approach combines three signals (head pose deviation from center, gaze direction deviation, face presence) with configurable weights, processed through a time-windowed exponential moving average (EMA) with hysteresis bands to prevent rapid fluctuations. The 5 Hz detection rate from Phase 1 (200ms intervals) provides 25-50 samples per scoring window, which is sufficient for stable scoring.

The UI work is well-served by established libraries. The "motion" package (v12.33.0, the rebranded Framer Motion) provides `AnimatePresence` with `mode="wait"` for cycling hero text, plus spring-based animations for the score ring. Recharts (v3.7.0) provides a `LineChart` that can be stripped down to a sparkline by hiding axes and grid. The shadcn/ui Button pattern (using `class-variance-authority` + `clsx` + `tailwind-merge`) provides a composable component system that works cleanly with Tailwind v4.

**Primary recommendation:** Split Phase 2 into three plans: (1) Install dependencies + create UI primitives (Button, cn utility) + Hero landing page with routing; (2) Focus scoring algorithm as a pure function with EMA + hysteresis in `lib/focus-algorithm.ts` + `useFocusScore` hook; (3) Score visualization UI (SVG ring, sparkline, stat cards) wired to live scoring data.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion | 12.33.0 | Hero cycling text animations, score ring transitions, page transitions | Rebranded from framer-motion (Nov 2024). Import from `motion/react`. Supports React 19. AnimatePresence with `mode="wait"` is the standard pattern for sequential text cycling. **Confidence: HIGH** (npm verified) |
| recharts | 3.7.0 | Focus score sparkline chart | React chart library built on D3. Supports React 19. LineChart with hidden axes produces a clean sparkline. **Confidence: HIGH** (npm verified) |
| lucide-react | 0.563.0 | Icons for hero section, UI chrome | Tree-shakable icon library. Each icon imports as a React component rendering inline SVG. **Confidence: HIGH** (npm verified) |
| class-variance-authority | 0.7.1 | Type-safe component variant management (Button, stat cards) | Standard in shadcn/ui ecosystem. Stable at 0.7.1 despite low recent activity -- 7.2M weekly downloads. **Confidence: HIGH** (npm verified) |
| clsx | 2.1.1 | Conditional class name construction | Tiny utility for conditional className joining. Dependency of shadcn/ui pattern. **Confidence: HIGH** (npm verified) |
| tailwind-merge | 3.4.0 | Tailwind class conflict resolution | Resolves conflicting Tailwind classes (e.g., `p-4` vs `p-2`). Paired with clsx in the `cn()` utility. **Confidence: HIGH** (npm verified) |

### Already Installed (from Phase 1)

| Library | Version | Purpose |
|---------|---------|---------|
| @vladmandic/human | ^3.3.6 | Face detection, gaze tracking, head pose -- produces the raw data for scoring |
| Next.js | 15.5.12 | App Router, routing, project structure |
| React | 19.1.0 | UI framework |
| Tailwind CSS | ^4 | Styling |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts sparkline | react-sparklines | Dedicated sparkline lib (simpler API), but unmaintained (last publish years ago). Recharts is actively maintained and already needed for future session charts. Use recharts. |
| recharts sparkline | Custom SVG path | Fewer dependencies but requires manual scaling, responsive sizing, animation. Not worth hand-rolling for a hackathon. |
| class-variance-authority | Direct Tailwind ternaries | Works for 1-2 variants but becomes unreadable at 3+ variants and sizes. CVA keeps variants declarative and type-safe. |
| motion | react-spring | Physics-based animations. Motion has simpler API, better docs, and AnimatePresence for exit animations (react-spring lacks a clean equivalent). |

**Installation:**
```bash
npm install motion recharts lucide-react class-variance-authority clsx tailwind-merge
```

Note: The CONTEXT.md says `npm install framer-motion` but the package has been rebranded to `motion` (Nov 2024). The `framer-motion` package still works as a redirect but `motion` is the canonical name. Import from `motion/react`.

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
src/
├── app/
│   ├── layout.tsx              # Root layout (unchanged)
│   ├── page.tsx                # Landing page with Hero (MODIFIED)
│   └── session/
│       └── page.tsx            # Detection + scoring session (NEW)
├── components/
│   ├── detection/              # Phase 1 (unchanged)
│   ├── landing/
│   │   └── Hero.tsx            # Animated hero with cycling text (NEW)
│   ├── scoring/
│   │   ├── FocusScoreRing.tsx  # SVG circular progress ring (NEW)
│   │   ├── FocusSparkline.tsx  # Recharts sparkline chart (NEW)
│   │   └── StatCards.tsx       # Session metric cards (NEW)
│   └── ui/
│       └── Button.tsx          # shadcn/ui-style button (NEW)
├── hooks/
│   ├── useHumanDetection.ts    # Phase 1 (unchanged)
│   ├── useWebcamPermission.ts  # Phase 1 (unchanged)
│   ├── useTensorMonitor.ts     # Phase 1 (unchanged)
│   └── useFocusScore.ts       # Consumes detection, produces score (NEW)
└── lib/
    ├── human-config.ts         # Phase 1 (unchanged)
    ├── detection-types.ts      # Phase 1 (unchanged)
    ├── focus-algorithm.ts      # Pure scoring function (NEW)
    └── utils.ts                # cn() utility (NEW)
```

### Pattern 1: Separate Routes for Landing vs Session

**What:** Landing page at `/` with Hero component. Detection+scoring session at `/session`. CTA button navigates from landing to session.

**When to use:** This is the recommended routing approach for Phase 2.

**Why:** (1) Clean separation of concerns -- the landing page is a marketing/demo page, the session is a full-screen app experience. (2) The permission gate + model loading should happen fresh when the user navigates to `/session`, not pre-load on the landing page. (3) For the hackathon demo, the presenter can navigate directly to `/session` if they want to skip the hero. (4) Next.js App Router file-based routing makes this trivial.

**Example:**
```typescript
// app/page.tsx -- Landing page
import Hero from '@/components/landing/Hero';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Hero />
    </main>
  );
}

// app/session/page.tsx -- Detection + scoring session
import ClientDetectionLoader from '@/components/detection/ClientDetectionLoader';

export default function SessionPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <ClientDetectionLoader />
    </main>
  );
}
```

### Pattern 2: Pure Scoring Function + React Hook Consumer

**What:** The focus score algorithm is a pure function in `lib/focus-algorithm.ts` with zero React dependencies. A `useFocusScore` hook calls the pure function on each detection result and manages state (score history, EMA state, hysteresis thresholds).

**When to use:** Always -- this pattern keeps scoring logic testable, and the hook manages the React lifecycle around it.

**Why:** (1) A pure function is trivially unit-testable with mock detection data. (2) The hook can manage rolling window state, sensitivity config, and expose both current score and score history for the sparkline. (3) Separating algorithm from presentation matches the existing codebase pattern (e.g., `human-config.ts` is pure config, `useHumanDetection.ts` is the hook).

**Example:**
```typescript
// lib/focus-algorithm.ts -- Pure function, no React
export interface FocusInput {
  yawDeg: number;        // Head yaw in degrees (0 = centered)
  pitchDeg: number;      // Head pitch in degrees (0 = centered)
  gazeBearingDeg: number; // Gaze bearing in degrees
  gazeStrength: number;  // Gaze strength (0-1)
  faceDetected: boolean; // Whether a face is present
}

export interface FocusConfig {
  headPoseWeight: number;      // Default: 0.5
  gazeWeight: number;          // Default: 0.4
  facePresenceWeight: number;  // Default: 0.1
  yawThresholdDeg: number;     // Beyond this = fully distracted (default: 30)
  pitchThresholdDeg: number;   // Beyond this = fully distracted (default: 25)
  emaAlpha: number;            // EMA smoothing factor (default: 0.15)
}

export function computeInstantFocusScore(
  input: FocusInput,
  config: FocusConfig
): number {
  // ... pure math, returns 0-100
}

// hooks/useFocusScore.ts -- React hook
export function useFocusScore(
  result: DetectionResult | null,
  config?: Partial<FocusConfig>
): {
  score: number;
  history: { time: number; score: number }[];
  config: FocusConfig;
  updateConfig: (partial: Partial<FocusConfig>) => void;
} {
  // ... manages EMA state, hysteresis, rolling history
}
```

### Pattern 3: AnimatePresence mode="wait" for Cycling Hero Text

**What:** Use Motion's `AnimatePresence` with `mode="wait"` and a keyed `motion.span` to cycle through words. The key change triggers exit animation on the current word, then enter animation on the next word.

**When to use:** For the hero heading cycling text effect ("real-time", "AI-powered", "intelligent", "webcam-based").

**Example:**
```typescript
// components/landing/Hero.tsx
'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const words = ['real-time', 'AI-powered', 'intelligent', 'webcam-based'];

function CyclingWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={words[index]}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="inline-block text-blue-400"
      >
        {words[index]}
      </motion.span>
    </AnimatePresence>
  );
}
```

Source: [Motion AnimatePresence docs](https://motion.dev/docs/react-animate-presence), [AnimatePresence modes examples](https://motion.dev/examples/react-animate-presence-modes)

### Pattern 4: SVG Circular Progress Ring

**What:** An SVG circle with `stroke-dasharray` set to the circumference and `stroke-dashoffset` animated to represent the focus score percentage. Hand-rolled (not a library) because the implementation is ~40 lines and needs custom styling.

**When to use:** For the main focus score display (UI-01).

**Example:**
```typescript
// components/scoring/FocusScoreRing.tsx
'use client';

import { motion } from 'motion/react';

interface FocusScoreRingProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
}

export function FocusScoreRing({
  score,
  size = 200,
  strokeWidth = 12,
}: FocusScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  // Color based on score
  const color =
    score >= 70 ? '#22c55e'   // green-500
    : score >= 40 ? '#eab308' // yellow-500
    : '#ef4444';              // red-500

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
        />
      </svg>
      {/* Score text in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={Math.round(score)}
          className="text-4xl font-bold text-white"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
        >
          {Math.round(score)}
        </motion.span>
        <span className="text-sm text-gray-400">Focus Score</span>
      </div>
    </div>
  );
}
```

Source: [LogRocket SVG circular progress guide](https://blog.logrocket.com/build-svg-circular-progress-component-react-hooks/), [DEV Community animated circle progress](https://dev.to/dastasoft/animated-circle-progress-bar-with-svg-as-react-component-28nm)

### Pattern 5: Recharts Sparkline (LineChart with Hidden Axes)

**What:** A Recharts `LineChart` wrapped in `ResponsiveContainer` with `XAxis`/`YAxis` hidden and no `CartesianGrid`, producing a minimal sparkline.

**When to use:** For the focus score trend chart (UI-02).

**Example:**
```typescript
// components/scoring/FocusSparkline.tsx
'use client';

import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from 'recharts';

interface FocusSparklineProps {
  data: { time: number; score: number }[];
  width?: number | string;
  height?: number;
}

export function FocusSparkline({
  data,
  width = '100%',
  height = 60,
}: FocusSparklineProps) {
  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data}>
        <YAxis domain={[0, 100]} hide />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

Source: [Recharts GitHub](https://github.com/recharts/recharts), [GeeksforGeeks Recharts LineChart](https://www.geeksforgeeks.org/create-a-line-chart-using-recharts-in-reactjs/)

### Anti-Patterns to Avoid

- **Per-frame scoring without time windowing:** Computing a focus score on every detection frame (5 Hz) and displaying it directly causes the score to jump erratically. A brief glance at a notification would tank the score. Use a time-windowed EMA (5-10 second windows) so the score reflects sustained attention, not instant snapshots.

- **Linear interpolation for score smoothing:** Simple linear interpolation creates an artificial "catching up" lag where the score visibly crawls toward the target. Use an EMA with configurable alpha -- it responds to genuine attention changes while damping noise. Spring animations on the UI handle visual smoothing separately.

- **Coupling scoring logic to React state:** Putting the scoring algorithm inside `useState`/`useEffect` makes it untestable and couples it to the render cycle. Keep the algorithm as a pure function in `lib/focus-algorithm.ts` and call it from the hook.

- **Installing `framer-motion` instead of `motion`:** The package was rebranded in Nov 2024. `framer-motion` still works as a redirect but imports should use `motion/react`. Installing `motion` directly is the correct approach.

- **Using `react-circular-progressbar` for the score ring:** Adds a dependency for something achievable in ~40 lines of SVG. The custom implementation gives full control over colors, animations, and the Motion spring physics. Don't add a library for this.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cycling text animation | Custom CSS keyframes with opacity/transform | `AnimatePresence` from `motion/react` with `mode="wait"` | AnimatePresence handles mount/unmount animation lifecycle, exit animations, and sequential transitions. CSS-only approaches cannot animate elements being removed from the DOM. |
| Sparkline chart | Custom SVG path with manual data scaling | `recharts` LineChart with hidden axes | Recharts handles responsive sizing, data domain scaling, smooth line interpolation, and touch/mouse events. Hand-rolling requires reimplementing all of this. |
| Class name merging | Manual template literals with ternaries | `cn()` utility (clsx + tailwind-merge) | Tailwind class conflicts (e.g., `p-4 p-2`) produce unpredictable results without tailwind-merge. The cn utility resolves conflicts intelligently. |
| Component variants | Nested ternary classNames | `class-variance-authority` (cva) | CVA provides type-safe, declarative variant definitions. Manual ternaries break down at 3+ variant dimensions and are error-prone. |

**Key insight:** The SVG score ring IS worth hand-rolling (~40 lines, full animation control). The sparkline is NOT worth hand-rolling (data scaling, responsive sizing, line interpolation are non-trivial). Choose wisely.

## Common Pitfalls

### Pitfall 1: Focus Score Oscillates Rapidly Between High and Low

**What goes wrong:** User looks away for 1 second (e.g., at a notification), score drops from 85 to 20, then recovers to 80 when they look back. This happens several times per minute, making the score feel unreliable and annoying.

**Why it happens:** Per-frame scoring without time windowing or hysteresis. Every detection frame independently computes a score, and brief distractions cause full score drops.

**How to avoid:**
1. **Time-windowed EMA:** Don't score individual frames. Maintain an exponential moving average (EMA) with alpha=0.15 (roughly a 5-7 second effective window at 5 Hz). Each new frame's instant score blends into the running average: `ema = alpha * instant + (1 - alpha) * ema`.
2. **Hysteresis bands:** Use separate thresholds for score drops and recoveries. Score drops when the raw signal falls below `currentScore - dropThreshold` (e.g., 10 points). Score recovers when the raw signal exceeds `currentScore + recoverThreshold` (e.g., 5 points). This prevents oscillation around boundary values.
3. **Face absence grace period:** No face detected for <2 seconds should not change the score (user may have shifted slightly). Only start dropping after sustained absence (3+ seconds).

**Warning signs:** Score number changes more than 3 times per second when the user is mostly still. Users feel "punished" for normal eye movements.

### Pitfall 2: EMA Alpha Too High or Too Low

**What goes wrong:** If alpha is too high (e.g., 0.8), the EMA barely smooths -- it reacts to every frame's noise. If alpha is too low (e.g., 0.02), the score takes 30+ seconds to respond to genuine distraction, feeling unresponsive.

**Why it happens:** The alpha parameter controls the tradeoff between responsiveness and smoothness. Developers often pick a value without testing it against real webcam data.

**How to avoid:** Use alpha=0.15 as the starting point. At 5 Hz detection, this gives an effective window of ~7 seconds. Make alpha tunable via the UI (SCORE-06: sensitivity control). Provide a slider that maps to alpha range [0.05, 0.4] so the demo operator can adjust for different environments. Label the slider "Sensitivity" with "Steady" (low alpha) and "Responsive" (high alpha) ends.

**Warning signs:** Score feels "laggy" (alpha too low) or "jumpy" (alpha too high) during testing.

### Pitfall 3: Gaze Bearing Range Misinterpretation

**What goes wrong:** Developer assumes gaze bearing is in degrees (0-360) when it's actually in radians. Or assumes it's always positive when it can be negative. The scoring algorithm produces wrong results for left-gaze vs. right-gaze.

**Why it happens:** Human.js documentation is sparse on gaze value ranges. The `rotation.gaze.bearing` is in radians and can be positive or negative. `rotation.gaze.strength` is 0-1.

**How to avoid:** Always convert radians to degrees: `bearing * 180 / Math.PI`. Use `Math.abs()` when comparing to thresholds -- looking 20deg left is the same distraction level as looking 20deg right. The existing `drawMetricsOverlay` in `WebcamView.tsx` already does this conversion, confirming the values are in radians.

**Warning signs:** Score drops only when looking left but not right (or vice versa). Score is always 0 or always 100 regardless of head position.

### Pitfall 4: Score Ring SVG Animation Causes Layout Thrash

**What goes wrong:** Animating the score ring's `strokeDashoffset` causes the SVG to re-render on every animation frame, triggering layout recalculation in surrounding elements. The entire detection panel jitters during score changes.

**Why it happens:** SVG attribute changes can trigger layout if the SVG's dimensions are not fixed or if surrounding elements use flexbox/grid with auto-sizing.

**How to avoid:** (1) Fix the SVG container's width and height in pixels (not percentage). (2) Use `motion.circle` with `animate` prop -- Motion uses `transform` and `opacity` compositing by default, but `strokeDashoffset` requires explicit animation. (3) Set `will-change: stroke-dashoffset` on the progress circle for GPU compositing. (4) Keep the score text update separate from the ring animation.

**Warning signs:** Webcam video feed stutters or jumps when the focus score changes. FPS drops during score transitions.

### Pitfall 5: Recharts SSR Crash in Next.js

**What goes wrong:** Recharts components crash with "window is not defined" or "document is not defined" errors during Next.js server-side rendering.

**Why it happens:** Recharts uses D3 internally, which accesses browser APIs (window, document) on import. In Next.js App Router, even `'use client'` components initially render on the server.

**How to avoid:** Either (1) wrap the sparkline component in a `next/dynamic` with `ssr: false`, or (2) use a client-side only rendering guard with `useEffect` + `useState` to skip render on the server. Option 2 is simpler:
```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <div style={{ width, height }} />;
// ... render Recharts
```

**Warning signs:** "ReferenceError: window is not defined" in terminal during `next build`.

## Code Examples

Verified patterns from official sources and codebase analysis.

### Focus Scoring Algorithm

```typescript
// lib/focus-algorithm.ts
// Source: Human.js rotation data structure + EMA smoothing principles

export interface FocusInput {
  yawDeg: number;         // Head yaw in degrees (0 = centered, +/- = left/right)
  pitchDeg: number;       // Head pitch in degrees (0 = centered, + = up, - = down)
  gazeBearingDeg: number; // Gaze bearing in degrees
  gazeStrength: number;   // Gaze strength/confidence (0-1)
  faceDetected: boolean;  // Whether a face was detected this frame
}

export interface FocusConfig {
  // Signal weights (must sum to 1.0)
  headPoseWeight: number;      // Default: 0.5
  gazeWeight: number;          // Default: 0.4
  facePresenceWeight: number;  // Default: 0.1

  // Thresholds for "fully distracted" (score = 0 for that signal)
  yawThresholdDeg: number;     // Default: 30 (beyond 30deg = fully looking away)
  pitchThresholdDeg: number;   // Default: 25 (beyond 25deg = fully looking down/up)
  gazeThresholdDeg: number;    // Default: 25

  // EMA smoothing
  emaAlpha: number;            // Default: 0.15 (lower = smoother, higher = more responsive)

  // Hysteresis
  dropThreshold: number;       // Points below current to trigger drop (default: 8)
  recoverThreshold: number;    // Points above current to trigger recovery (default: 5)
}

export const DEFAULT_FOCUS_CONFIG: FocusConfig = {
  headPoseWeight: 0.5,
  gazeWeight: 0.4,
  facePresenceWeight: 0.1,
  yawThresholdDeg: 30,
  pitchThresholdDeg: 25,
  gazeThresholdDeg: 25,
  emaAlpha: 0.15,
  dropThreshold: 8,
  recoverThreshold: 5,
};

/**
 * Compute instantaneous focus score from a single detection frame.
 * Returns 0-100. Pure function, no side effects.
 */
export function computeInstantFocusScore(
  input: FocusInput,
  config: FocusConfig = DEFAULT_FOCUS_CONFIG
): number {
  if (!input.faceDetected) return 0;

  // Head pose sub-score: how centered is the head?
  const yawScore = Math.max(0, 1 - Math.abs(input.yawDeg) / config.yawThresholdDeg);
  const pitchScore = Math.max(0, 1 - Math.abs(input.pitchDeg) / config.pitchThresholdDeg);
  const headPoseScore = (yawScore + pitchScore) / 2;

  // Gaze sub-score: how centered is the gaze?
  const gazeDirectionScore = Math.max(
    0,
    1 - Math.abs(input.gazeBearingDeg) / config.gazeThresholdDeg
  );
  const gazeScore = gazeDirectionScore * input.gazeStrength;

  // Face presence sub-score: binary (1 if face detected, 0 if not)
  const faceScore = input.faceDetected ? 1 : 0;

  // Weighted combination
  const raw =
    headPoseScore * config.headPoseWeight +
    gazeScore * config.gazeWeight +
    faceScore * config.facePresenceWeight;

  return Math.round(raw * 100);
}

/**
 * EMA state for smoothing scores over time.
 */
export interface EMAState {
  value: number;
  initialized: boolean;
}

/**
 * Apply EMA smoothing to a new instant score.
 * Returns the smoothed score and updated state.
 */
export function applyEMA(
  instantScore: number,
  state: EMAState,
  alpha: number
): { score: number; state: EMAState } {
  if (!state.initialized) {
    return {
      score: instantScore,
      state: { value: instantScore, initialized: true },
    };
  }

  const smoothed = alpha * instantScore + (1 - alpha) * state.value;
  return {
    score: Math.round(smoothed),
    state: { value: smoothed, initialized: true },
  };
}

/**
 * Apply hysteresis to prevent rapid oscillation.
 * The displayed score only changes when the smoothed score
 * deviates significantly from the current displayed score.
 */
export function applyHysteresis(
  smoothedScore: number,
  displayedScore: number,
  config: FocusConfig
): number {
  const diff = smoothedScore - displayedScore;

  if (diff < -config.dropThreshold) {
    // Significant drop -- update displayed score
    return smoothedScore;
  }
  if (diff > config.recoverThreshold) {
    // Significant recovery -- update displayed score
    return smoothedScore;
  }

  // Within hysteresis band -- keep current displayed score
  return displayedScore;
}
```

Source: [EMA Wikipedia](https://en.wikipedia.org/wiki/Exponential_smoothing), [Human.js Result Wiki - rotation.angle and rotation.gaze](https://github.com/vladmandic/human/wiki/Result), existing `src/lib/detection-types.ts` FaceDetectionData interface

### cn() Utility Function

```typescript
// lib/utils.ts
// Source: shadcn/ui manual installation guide

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Source: [shadcn/ui manual installation](https://ui.shadcn.com/docs/installation/manual)

### Button Component (shadcn/ui pattern)

```typescript
// components/ui/Button.tsx
// Source: shadcn/ui button component

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-500 text-white hover:bg-blue-600',
        outline: 'border border-gray-700 bg-transparent text-gray-200 hover:bg-gray-800',
        ghost: 'text-gray-300 hover:bg-gray-800 hover:text-white',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-12 rounded-md px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

Note: This is a simplified version without `@radix-ui/react-slot` (`asChild` prop). For a hackathon demo, the Slot pattern is unnecessary overhead. If needed later, add `@radix-ui/react-slot` and the `asChild` prop.

Source: [shadcn/ui Button docs](https://ui.shadcn.com/docs/components/button), adapted for dark theme

### Extracting Focus Input from Detection Result

```typescript
// Bridging Phase 1 detection data to Phase 2 scoring input
// Source: existing src/lib/detection-types.ts + src/hooks/useHumanDetection.ts

import type { DetectionResult, FaceDetectionData } from '@/lib/detection-types';
import type { FocusInput } from '@/lib/focus-algorithm';

export function extractFocusInput(result: DetectionResult | null): FocusInput {
  if (!result || result.faces.length === 0) {
    return {
      yawDeg: 0,
      pitchDeg: 0,
      gazeBearingDeg: 0,
      gazeStrength: 0,
      faceDetected: false,
    };
  }

  const face = result.faces[0];

  if (!face.rotation) {
    return {
      yawDeg: 0,
      pitchDeg: 0,
      gazeBearingDeg: 0,
      gazeStrength: 0,
      faceDetected: true, // Face exists but no rotation data
    };
  }

  return {
    yawDeg: (face.rotation.angle.yaw * 180) / Math.PI,
    pitchDeg: (face.rotation.angle.pitch * 180) / Math.PI,
    gazeBearingDeg: (face.rotation.gaze.bearing * 180) / Math.PI,
    gazeStrength: face.rotation.gaze.strength,
    faceDetected: true,
  };
}
```

### useFocusScore Hook

```typescript
// hooks/useFocusScore.ts
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { DetectionResult } from '@/lib/detection-types';
import {
  computeInstantFocusScore,
  applyEMA,
  applyHysteresis,
  DEFAULT_FOCUS_CONFIG,
  type FocusConfig,
  type EMAState,
} from '@/lib/focus-algorithm';
import { extractFocusInput } from '@/lib/focus-algorithm'; // or wherever placed

const MAX_HISTORY_LENGTH = 300; // ~60 seconds at 5 Hz

export function useFocusScore(
  result: DetectionResult | null,
  configOverrides?: Partial<FocusConfig>
) {
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState<{ time: number; score: number }[]>([]);
  const [config, setConfig] = useState<FocusConfig>({
    ...DEFAULT_FOCUS_CONFIG,
    ...configOverrides,
  });

  const emaRef = useRef<EMAState>({ value: 0, initialized: false });
  const displayedScoreRef = useRef(0);

  // Process each new detection result
  useEffect(() => {
    if (!result) return;

    const input = extractFocusInput(result);
    const instant = computeInstantFocusScore(input, config);

    // Apply EMA smoothing
    const { score: smoothed, state: newState } = applyEMA(
      instant,
      emaRef.current,
      config.emaAlpha
    );
    emaRef.current = newState;

    // Apply hysteresis
    const displayed = applyHysteresis(smoothed, displayedScoreRef.current, config);
    displayedScoreRef.current = displayed;

    setScore(displayed);

    // Append to history (capped)
    setHistory((prev) => {
      const next = [...prev, { time: Date.now(), score: displayed }];
      return next.length > MAX_HISTORY_LENGTH ? next.slice(-MAX_HISTORY_LENGTH) : next;
    });
  }, [result, config]);

  const updateConfig = useCallback((partial: Partial<FocusConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  return { score, history, config, updateConfig };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `framer-motion` package name | `motion` package name | Nov 2024 | Import from `motion/react` not `framer-motion`. Old name still works as redirect. |
| `@google/generative-ai` | `@google/genai` | Aug 2025 (deprecated) | Not relevant for Phase 2 but noted for future phases. |
| Recharts v2 | Recharts v3 (3.7.0) | Jan 2026 | v3 has improved TypeScript support, React 19 compatibility, tree-shaking. |
| shadcn/ui v0 | shadcn/ui v3 (Tailwind v4 support) | Feb 2025 | Updated component patterns use OKLCH colors, data-slot attributes. For this project we take only the patterns (Button + cn), not the full CLI. |
| Per-frame attention scoring | Time-windowed EMA + hysteresis | Industry standard | Prevents false alarms from brief glances away. Makes score feel trustworthy. |

**Deprecated/outdated:**
- `framer-motion` package name: Use `motion` instead. Same library, new name.
- `react-circular-progressbar`: Unnecessary dependency for a 40-line SVG component.
- `react-sparklines`: Unmaintained. Use recharts or custom SVG.

## Open Questions

1. **Exact gaze bearing range from Human.js**
   - What we know: `rotation.gaze.bearing` is in radians, `rotation.gaze.strength` is 0-1. The existing `WebcamView.tsx` overlay converts bearing to degrees for display.
   - What's unclear: The exact range of bearing values -- is it [-PI, PI]? [0, 2*PI]? Negative for left, positive for right? The Human.js wiki does not document this precisely.
   - Recommendation: During implementation, add debug logging to observe the actual range of bearing values as the user looks in different directions. Use `Math.abs()` for threshold comparison regardless, since looking left and right are equally "distracted".

2. **Optimal EMA alpha and hysteresis thresholds**
   - What we know: Alpha=0.15 gives ~7-second effective window at 5 Hz. Drop threshold=8, recover threshold=5 provides asymmetric hysteresis (harder to drop, easier to recover -- matches user expectation).
   - What's unclear: These values are theoretical. They need validation against real webcam data in different lighting and seating positions.
   - Recommendation: Start with defaults, make tunable via SCORE-06 sensitivity control. The demo operator can adjust during the hackathon.

3. **Stat card metrics for Phase 2 vs Phase 4**
   - What we know: UI-03 requires stat cards for session metrics. Phase 4 adds full session management (SESSION-01 through SESSION-10).
   - What's unclear: Which metrics to show in Phase 2 stat cards when there is no formal session lifecycle yet.
   - Recommendation: Show three cards in Phase 2: (1) Current Focus Score (redundant with ring but provides numeric precision), (2) Session Duration (simple elapsed timer since page load), (3) Average Score (mean of score history). These are computable from Phase 2 data without Phase 4 session management.

4. **Whether to keep or remove the existing detection overlay in the session view**
   - What we know: Phase 1 shows webcam view with face mesh overlay, bounding boxes, and a metrics text panel. Phase 2 adds a focus score ring and sparkline alongside this.
   - What's unclear: Should the Phase 1 debug overlay (face mesh, gaze arrows) remain visible during a scored session, or be hidden in favor of the cleaner scoring UI?
   - Recommendation: Keep the webcam view but make the debug overlay togglable (the "Show/Hide Video" button already exists). Default to showing the webcam feed without the mesh overlay during scored sessions, with a "Debug" toggle to bring it back for demo purposes.

## Sources

### Primary (HIGH confidence)
- [motion npm package](https://www.npmjs.com/package/motion) - v12.33.0, supports React 19. Verified via `npm view motion version`.
- [Motion AnimatePresence docs](https://motion.dev/docs/react-animate-presence) - mode="wait" for sequential animations
- [Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide) - framer-motion to motion migration, import from motion/react
- [recharts npm package](https://www.npmjs.com/package/recharts) - v3.7.0, supports React 19. Verified via `npm view recharts version`.
- [recharts GitHub](https://github.com/recharts/recharts) - LineChart with hidden axes for sparkline pattern
- [lucide-react npm package](https://www.npmjs.com/package/lucide-react) - v0.563.0. Verified via `npm view lucide-react version`.
- [shadcn/ui Button docs](https://ui.shadcn.com/docs/components/button) - Button component with CVA variants
- [shadcn/ui manual installation](https://ui.shadcn.com/docs/installation/manual) - cn utility with clsx + tailwind-merge
- [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4) - Tailwind v4 compatibility updates
- [Human.js Result Wiki](https://github.com/vladmandic/human/wiki/Result) - Face rotation.angle and rotation.gaze structure
- [Next.js Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages) - App Router file-based routing

### Secondary (MEDIUM confidence)
- [LogRocket SVG circular progress](https://blog.logrocket.com/build-svg-circular-progress-component-react-hooks/) - stroke-dasharray/offset technique
- [EMA Wikipedia](https://en.wikipedia.org/wiki/Exponential_smoothing) - Exponential moving average formula
- [Human.js Discussion #433](https://github.com/vladmandic/human/discussions/433) - Head pose orientation from FaceMesh
- [Human.js Discussion #479](https://github.com/vladmandic/human/discussions/479) - Student focus detection approach (referenced in prior research)

### Tertiary (LOW confidence)
- Focus score algorithm weights and thresholds (headPoseWeight=0.5, gazeWeight=0.4, facePresenceWeight=0.1) are design decisions, not research-backed values. They must be validated against real detection data and tuned empirically.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All library versions verified via npm. Peer dependencies checked (motion, recharts both support React 19). Import paths verified (motion/react).
- Architecture: HIGH - Routing pattern (separate routes) verified via Next.js docs. Pure function + hook pattern matches existing codebase conventions. SVG ring technique is well-documented.
- Focus scoring algorithm: MEDIUM - The algorithm structure (weighted signals + EMA + hysteresis) is sound and well-established in signal processing. However, the specific weights, thresholds, and alpha values are unvalidated assumptions that need empirical tuning.
- Pitfalls: HIGH - Recharts SSR issues are well-documented. EMA tuning challenges are inherent to any real-time scoring system. SVG animation performance is a known concern.

**Research date:** 2026-02-07
**Valid until:** 2026-03-09 (30 days -- all libraries are stable, no major releases expected)
