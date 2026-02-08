# Phase 4: Session Management - Research

**Researched:** 2026-02-08
**Domain:** Session lifecycle state machine (start/pause/resume/end), persistent storage (localStorage), focus data aggregation, streak tracking, timeline visualization (Recharts), responsive layout
**Confidence:** HIGH

## Summary

Phase 4 adds a complete session lifecycle on top of the existing focus scoring and coaching pipeline. The codebase currently has no concept of a "session" -- detection starts automatically when the user navigates to `/session`, runs indefinitely, and all state is lost on page reload. This phase introduces: (1) explicit session controls (start/pause/resume/end with timer), (2) live session metrics and post-session summary, (3) persistent session history in localStorage, (4) streak tracking (consecutive days), and (5) a past sessions view with focus timeline charts.

The existing architecture (DetectionProvider as a monolithic component with hooks) must be restructured to separate the session lifecycle from the detection pipeline. The session state (running/paused/ended) should live in a `useReducer`-based hook or a lightweight Zustand store that controls whether detection feeds into scoring. Persistence should use localStorage directly (session data is small -- under 100KB for hundreds of sessions) rather than IndexedDB, which adds complexity without benefit at this scale. Recharts (already installed, v3.7.0) provides all the chart components needed for session timeline visualization via AreaChart with ReferenceArea for highlighting distraction zones.

The biggest architectural challenge is cleanly integrating session controls into the existing DetectionProvider without breaking the detection/scoring/coaching pipeline. The session state machine needs to: reset focus score to 100 on session start, pause the scoring timer (not detection) during pause, accumulate metrics during active time, compute summary on end, and persist the completed session to localStorage.

**Primary recommendation:** Use `useReducer` for session state (no new dependency), localStorage for persistence (simple JSON serialization of session history array), and Recharts AreaChart + ReferenceArea for timeline visualization. Restructure DetectionProvider to accept session state as a prop/context rather than auto-starting detection immediately.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React `useReducer` | 19.1.0 (built-in) | Session lifecycle state machine | Complex state transitions (idle/running/paused/ended) with predictable action dispatch; zero dependency cost |
| `localStorage` | Browser built-in | Persist session history and streaks across browser sessions | SESSION-08 requires cross-browser-session persistence; data is small (<100KB); synchronous API is fine for JSON reads/writes on session end |
| `recharts` | ^3.7.0 | Session timeline charts (AreaChart, ReferenceArea) | Already installed and used for FocusSparkline; AreaChart provides focus score timelines; ReferenceArea highlights distraction zones |
| `framer-motion` | ^12.33.0 | Animated session controls and transitions | Already installed; used for score ring, nudge indicator; consistent animation library |
| `lucide-react` | ^0.563.0 | Icons for session controls (Play, Pause, Square, Clock, etc.) | Already installed; used for landing page icons |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | Not yet installed | Date formatting and "consecutive days" calculation for streaks | Only if streak calculation needs timezone-aware day comparison; may not be needed if using simple midnight-based comparison |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useReducer` | Zustand with `persist` middleware | Zustand adds ~3KB gzipped and built-in persistence; but this app has no shared state across distant components -- session state flows parent-to-child via props. Adding Zustand is over-engineering for this use case. |
| `localStorage` | IndexedDB via `idb-keyval` | IndexedDB supports larger datasets and async API; but session history will be <100KB even with 1000+ sessions (each ~80 bytes JSON). localStorage's 5MB limit is more than sufficient. |
| `localStorage` | Zustand `persist` middleware | Couples state management choice to persistence; localStorage is simpler and doesn't require a new dependency |
| `date-fns` | Native `Date` with manual day math | Avoids new dependency; streak logic is simple (compare YYYY-MM-DD strings). Recommended unless timezone edge cases emerge during testing. |

**Installation:**
```bash
# No new dependencies needed. All tools are already in the project.
# date-fns is optional and only needed if timezone-aware streak logic is required:
# npm install date-fns
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── session/
│       └── page.tsx                   # MODIFY - Add session controls wrapper, history route
├── components/
│   ├── detection/
│   │   └── DetectionProvider.tsx       # MODIFY - Accept session state, control scoring pipeline
│   └── session/
│       ├── SessionControls.tsx         # NEW - Start/Pause/Resume/End buttons with timer
│       ├── SessionSummary.tsx          # NEW - Post-session summary modal/overlay
│       ├── SessionTimeline.tsx         # NEW - AreaChart showing focus score over session
│       ├── SessionHistory.tsx          # NEW - List of past sessions with mini-charts
│       ├── StreakBadge.tsx             # NEW - Consecutive days streak display
│       └── PersonalBests.tsx           # NEW - Highest score, longest focus streak display
├── hooks/
│   └── useSessionManager.ts           # NEW - Session lifecycle state machine (useReducer)
└── lib/
    ├── session-types.ts               # NEW - Session, SessionSummary, SessionSnapshot types
    └── session-storage.ts             # NEW - localStorage read/write for session history
```

### Pattern 1: Session State Machine (useReducer)
**What:** A reducer-based state machine managing the session lifecycle: `idle -> running -> paused -> running -> ended`. Each state transition is an action dispatched by the UI (START, PAUSE, RESUME, END). The reducer is a pure function that computes the next state, making it easy to test and reason about.
**When to use:** For all session lifecycle logic. The hook exposes the current session state, elapsed time, and dispatch actions.
**Example:**
```typescript
// src/hooks/useSessionManager.ts

type SessionPhase = "idle" | "running" | "paused" | "ended";

interface SessionState {
  phase: SessionPhase;
  startTime: number | null;        // When session started
  pausedAt: number | null;         // When current pause began
  totalPausedMs: number;           // Accumulated pause time
  snapshots: FocusSnapshot[];      // Score samples during session
  distractionCount: number;        // Times score dropped below threshold
  focusedMs: number;               // Accumulated time with score >= 70
}

type SessionAction =
  | { type: "START" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "END" }
  | { type: "TICK"; score: number; timestamp: number }
  | { type: "DISTRACTION" };

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "START":
      return {
        ...state,
        phase: "running",
        startTime: Date.now(),
        pausedAt: null,
        totalPausedMs: 0,
        snapshots: [],
        distractionCount: 0,
        focusedMs: 0,
      };
    case "PAUSE":
      return state.phase === "running"
        ? { ...state, phase: "paused", pausedAt: Date.now() }
        : state;
    case "RESUME":
      return state.phase === "paused"
        ? {
            ...state,
            phase: "running",
            totalPausedMs: state.totalPausedMs + (Date.now() - (state.pausedAt ?? Date.now())),
            pausedAt: null,
          }
        : state;
    case "END":
      return { ...state, phase: "ended" };
    case "TICK":
      // Record snapshot and accumulate focused time
      return state.phase === "running"
        ? {
            ...state,
            snapshots: [...state.snapshots, { time: action.timestamp, score: action.score }],
            focusedMs: action.score >= 70
              ? state.focusedMs + 3000 // 3-second tick interval
              : state.focusedMs,
          }
        : state;
    case "DISTRACTION":
      return { ...state, distractionCount: state.distractionCount + 1 };
    default:
      return state;
  }
}
```

### Pattern 2: Session Data Persistence with localStorage
**What:** A thin abstraction layer over localStorage for reading/writing session history. Sessions are stored as a JSON array. Each completed session is appended on END. The storage module handles serialization, size limits, and graceful degradation if localStorage is unavailable.
**When to use:** On session end (write), on page load (read for history view), and for streak calculation.
**Example:**
```typescript
// src/lib/session-storage.ts

const STORAGE_KEY = "focusflow_sessions";
const MAX_SESSIONS = 100; // Keep last 100 sessions

export interface StoredSession {
  id: string;                    // UUID or timestamp-based
  startTime: number;             // Unix ms
  endTime: number;               // Unix ms
  totalDurationMs: number;       // End - start - paused
  pausedDurationMs: number;      // Total time paused
  averageScore: number;          // Mean of all snapshots
  focusedPercentage: number;     // focusedMs / totalDurationMs * 100
  distractionCount: number;      // Times score dropped below threshold
  peakScore: number;             // Highest score in session
  longestFocusStreakMs: number;  // Longest consecutive time above threshold
  snapshots: { time: number; score: number }[]; // For timeline chart
}

export function loadSessions(): StoredSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: StoredSession): void {
  try {
    const sessions = loadSessions();
    sessions.push(session);
    // Trim to most recent MAX_SESSIONS
    const trimmed = sessions.slice(-MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error("[session-storage] Failed to save:", err);
  }
}

export function getPersonalBests(sessions: StoredSession[]): {
  longestFocusStreak: number;
  highestScore: number;
  longestSession: number;
} {
  return {
    longestFocusStreak: Math.max(0, ...sessions.map(s => s.longestFocusStreakMs)),
    highestScore: Math.max(0, ...sessions.map(s => s.peakScore)),
    longestSession: Math.max(0, ...sessions.map(s => s.totalDurationMs)),
  };
}
```

### Pattern 3: Streak Tracking (Consecutive Days)
**What:** Track how many consecutive calendar days the user has completed at least one session. Compare the date of the most recent session to "today" (local timezone). If yesterday had a session, the streak continues. If not, it resets to 1 (or 0 if no session today).
**When to use:** Calculate on page load and after each session completion.
**Example:**
```typescript
// Inside session-storage.ts

export function calculateStreak(sessions: StoredSession[]): number {
  if (sessions.length === 0) return 0;

  // Get unique dates (YYYY-MM-DD in local timezone)
  const dates = [...new Set(
    sessions.map(s => new Date(s.startTime).toLocaleDateString("en-CA")) // en-CA gives YYYY-MM-DD
  )].sort().reverse(); // Most recent first

  const today = new Date().toLocaleDateString("en-CA");
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");

  // Streak must include today or yesterday
  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const current = new Date(dates[i]);
    const next = new Date(dates[i + 1]);
    const diffDays = (current.getTime() - next.getTime()) / 86400000;

    if (Math.round(diffDays) === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
```

### Pattern 4: Session Timeline Visualization (Recharts AreaChart)
**What:** A Recharts AreaChart that shows the focus score over the duration of a session. The x-axis shows elapsed time (mm:ss), the y-axis shows score (0-100). Use gradient fill that fades from the line color to transparent. Optionally use ReferenceArea to highlight distraction zones (periods where score was below a threshold).
**When to use:** In the session summary view (after session ends) and in the past sessions history view.
**Example:**
```typescript
// src/components/session/SessionTimeline.tsx

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface SessionTimelineProps {
  snapshots: { time: number; score: number }[];
  startTime: number;
  height?: number;
}

export default function SessionTimeline({ snapshots, startTime, height = 200 }: SessionTimelineProps) {
  // Convert timestamps to elapsed minutes for x-axis
  const data = snapshots.map(s => ({
    elapsed: Math.round((s.time - startTime) / 1000), // seconds
    score: s.score,
  }));

  const formatXAxis = (seconds: number) => {
    const mm = Math.floor(seconds / 60);
    const ss = seconds % 60;
    return `${mm}:${String(ss).padStart(2, "0")}`;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis dataKey="elapsed" tickFormatter={formatXAxis} />
        <YAxis domain={[0, 100]} />
        <Tooltip labelFormatter={formatXAxis} />
        <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="3 3" label="Focus" />
        <Area
          type="monotone"
          dataKey="score"
          stroke="#3b82f6"
          fill="url(#scoreGradient)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 5: Session Page Flow (UI States)
**What:** The `/session` page transitions through distinct UI states: (1) Pre-session: show "Start Session" button, streak badge, personal bests, past sessions list. (2) Running: show webcam + analytics (current DetectionProvider view) + session controls bar (timer, pause, end buttons). (3) Summary: show session results overlay with timeline chart and stats. (4) The user can dismiss summary to return to pre-session state.
**When to use:** This drives the overall page structure for the session page.
**Example:**
```
Pre-session (phase=idle)
  ├── Header: FocusFlow branding
  ├── Streak badge + Personal bests cards
  ├── "Start Focus Session" CTA button
  └── Past sessions list (from localStorage)

Running (phase=running|paused)
  ├── Header: FocusFlow branding
  ├── Session controls bar: Timer | Pause/Resume | End
  ├── Detection + Scoring + Coaching (current layout)
  └── Live metrics: focused time, distraction count

Summary (phase=ended)
  ├── Session summary overlay/modal
  │   ├── Total time, Average score, Focused %
  │   ├── Distraction count, Peak score
  │   ├── Session timeline chart (AreaChart)
  │   └── "Done" button → returns to idle
  └── Updated personal bests (if any)
```

### Anti-Patterns to Avoid
- **Storing snapshots at full detection rate (5 Hz):** At 5 FPS for 60 minutes, that's 18,000 data points. Store one snapshot per score update (every 3 seconds) instead, giving ~1,200 points for a 60-minute session. For localStorage persistence, downsample further to ~1 per 10 seconds (~360 points).
- **Resetting detection pipeline on session start/pause:** Detection (webcam + Human.js) should keep running even when paused. Only the scoring pipeline (useFocusScore TICK updates) should be gated by session state. Restarting detection requires model re-warmup (~5 seconds).
- **Using sessionStorage instead of localStorage:** sessionStorage is cleared when the browser tab closes. SESSION-08 requires persistence "across browser sessions," which means localStorage.
- **Computing streak on every render:** Streak calculation requires loading all sessions from localStorage and doing date math. Compute once on page load and after session end, cache the result in state.
- **Running the timer in a reducer:** The reducer must be pure. Use `setInterval` in the hook to dispatch TICK actions. The reducer only records timestamps and computes derived state.
- **Persisting snapshot data at maximum resolution for the history view:** Past sessions in the history list only need mini-sparkline data (~30-50 points). Downsample when saving to localStorage to keep storage small.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart visualization | Custom canvas/SVG timeline drawing | Recharts AreaChart + ReferenceArea + Tooltip | Already installed; handles axes, tooltips, responsive sizing, gradients |
| Unique session IDs | Custom UUID generator | `crypto.randomUUID()` | Built into all modern browsers (Chrome 92+, Edge 92+); no library needed |
| Time formatting (mm:ss) | Custom modular arithmetic functions | Simple template literal `${mm}:${ss}` | Too simple for a library; but keep the formatting function DRY |
| Animation | Manual CSS transitions for session state changes | framer-motion AnimatePresence + motion.div | Already installed; used throughout the app; handles enter/exit animations |
| Date comparison for streaks | Manual Date arithmetic with timezone handling | `toLocaleDateString("en-CA")` for YYYY-MM-DD comparison | Browser-native, handles local timezone correctly; only add date-fns if edge cases surface |

**Key insight:** This phase requires zero new npm dependencies. Every tool needed (useReducer, localStorage, Recharts, framer-motion, lucide-react) is either built into React/browser or already installed in the project. The work is architectural (restructuring DetectionProvider, adding new components) not dependency-heavy.

## Common Pitfalls

### Pitfall 1: Timer Drift with setInterval
**What goes wrong:** A `setInterval(tick, 1000)` timer accumulates drift over long sessions. After 30 minutes, the displayed time can be several seconds off from wall-clock time.
**Why it happens:** `setInterval` is not guaranteed to fire exactly on schedule. Each tick can be delayed by 10-50ms (more if the tab is backgrounded), and errors accumulate.
**How to avoid:** Do NOT use a counter variable that increments each tick. Instead, compute elapsed time from `Date.now() - startTime - totalPausedMs` on every tick. The interval just triggers a re-render; the actual time comes from wall-clock math. The existing `StatCards.tsx` and `MonitoringPanel.tsx` already follow this pattern correctly.
**Warning signs:** Timer shows different time than expected after long sessions; timer "jumps" when switching tabs.

### Pitfall 2: Pausing Detection vs. Pausing Scoring
**What goes wrong:** When user pauses the session, the developer stops the detection loop. When they resume, Human.js needs to re-load models and re-warmup (~5-10 seconds of loading screen), destroying the session flow.
**Why it happens:** Confusion between "session is paused" (user intent) and "stop everything" (implementation).
**How to avoid:** The detection pipeline (webcam stream, Human.js inference) must ALWAYS run while on the session page. Pausing only means: (1) stop updating the focus score (freeze it), (2) stop the session timer, (3) accumulate pause duration. When resuming, scoring picks up immediately because detection never stopped. Implement this by checking `sessionPhase === "running"` before dispatching TICK actions in useFocusScore.
**Warning signs:** Loading spinner appears after resume; calibration restarts after resume.

### Pitfall 3: localStorage Quota and JSON Parse Errors
**What goes wrong:** After many sessions with full snapshot data, localStorage exceeds 5MB and `setItem` throws. Or corrupted JSON causes `JSON.parse` to throw, crashing the app on load.
**Why it happens:** Unbounded snapshot arrays; no try/catch around localStorage operations; no data size management.
**How to avoid:** (1) Limit stored sessions to 100 (most recent). (2) Downsample snapshots for storage (1 point per 10 seconds instead of per 3 seconds). (3) Wrap ALL localStorage operations in try/catch. (4) Validate parsed data shape before using it (type guard). (5) Size estimate: 100 sessions * 360 snapshots * ~20 bytes = ~720KB, well under 5MB limit. With downsampling to ~60 snapshots per session: ~120KB total.
**Warning signs:** `QuotaExceededError` in console; white screen on page load; session history showing empty.

### Pitfall 4: Score State Reset Between Sessions
**What goes wrong:** User ends a session (score at 45), starts a new one, and score shows 45 instead of 100. Or coaching escalation carries over from the previous session.
**Why it happens:** The `useFocusScore` hook stores score in `useRef(100)` which persists across dispatches but not across component remounts. If DetectionProvider is not unmounted/remounted between sessions, refs retain stale values.
**How to avoid:** When session phase transitions to "running" (START action), explicitly reset: (1) focus score to 100 (via a reset function exposed by useFocusScore), (2) score history to empty, (3) coaching engine state (nudge state, escalation level), (4) chime baseline. Add a `reset()` function to each hook that clears ref state.
**Warning signs:** New session starts with previous session's score; coaching starts at "direct" tier immediately.

### Pitfall 5: Stale Streak Display After Midnight
**What goes wrong:** User starts a session at 11:55 PM, finishes at 12:05 AM. The streak shows "1 day" (today's session), but the session that started yesterday is also counted as today's because `endTime` crosses midnight.
**Why it happens:** Using `endTime` instead of `startTime` for date attribution, or not handling the midnight boundary.
**How to avoid:** Always use `startTime` for determining which calendar day a session belongs to. A session started on Monday at 11:55 PM is a "Monday session" even if it ended on Tuesday. This matches user expectations (they initiated it on Monday).
**Warning signs:** Streak count jumps unexpectedly; same session appears in two different days.

### Pitfall 6: Re-renders from Timer Updates
**What goes wrong:** The timer updates every second, causing the entire DetectionProvider tree to re-render (including webcam view, canvas overlay, sparkline chart), tanking FPS.
**Why it happens:** Timer state lives too high in the component tree; all children re-render when parent state changes.
**How to avoid:** (1) Keep the timer state in the SessionControls component only, NOT in the parent. The timer display is purely cosmetic and only needs `startTime` and `totalPausedMs` props (stable references). (2) Use `React.memo` on expensive children (WebcamView, FocusSparkline). (3) The existing architecture already separates concerns well -- don't merge session timer state into DetectionProvider.
**Warning signs:** FPS drops from ~5 to ~2-3 after adding timer; React DevTools shows unnecessary re-renders on child components.

## Code Examples

Verified patterns from official sources and existing codebase:

### Session Controls Component
```typescript
// src/components/session/SessionControls.tsx
// Pattern: Timer display from wall-clock math, not counter increments

"use client";

import { useState, useEffect } from "react";
import { Play, Pause, Square, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SessionControlsProps {
  phase: "idle" | "running" | "paused" | "ended";
  startTime: number | null;
  totalPausedMs: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}

export default function SessionControls({
  phase, startTime, totalPausedMs,
  onStart, onPause, onResume, onEnd,
}: SessionControlsProps) {
  const [elapsed, setElapsed] = useState("00:00");

  useEffect(() => {
    if (phase !== "running" || !startTime) return;

    const tick = () => {
      const now = Date.now();
      const activeMs = now - startTime - totalPausedMs;
      const totalSec = Math.max(0, Math.floor(activeMs / 1000));
      const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
      const ss = String(totalSec % 60).padStart(2, "0");
      setElapsed(`${mm}:${ss}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, startTime, totalPausedMs]);

  if (phase === "idle") {
    return (
      <Button size="lg" onClick={onStart} className="gap-2">
        <Play className="h-5 w-5" />
        Start Focus Session
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 font-mono text-2xl text-white">
        <Clock className="h-5 w-5 text-gray-400" />
        {elapsed}
      </div>

      {phase === "running" ? (
        <Button variant="outline" size="sm" onClick={onPause}>
          <Pause className="h-4 w-4" />
        </Button>
      ) : phase === "paused" ? (
        <Button variant="outline" size="sm" onClick={onResume}>
          <Play className="h-4 w-4" />
        </Button>
      ) : null}

      <Button variant="outline" size="sm" onClick={onEnd} className="text-red-400">
        <Square className="h-4 w-4" />
        End
      </Button>
    </div>
  );
}
```

### Existing Timer Pattern (verified from codebase)
```typescript
// Source: src/components/scoring/StatCards.tsx (line 24-35)
// The existing codebase already uses wall-clock math for timer display.
// This same pattern MUST be used for session timer.
useEffect(() => {
  const tick = () => {
    const seconds = Math.floor((Date.now() - sessionStartTime) / 1000);
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    setElapsed(`${mm}:${ss}`);
  };
  tick();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, [sessionStartTime]);
```

### Recharts AreaChart with Gradient (verified pattern)
```typescript
// Source: Recharts official examples (https://recharts.github.io/en-US/examples/)
// Already used in codebase: src/components/scoring/FocusSparkline.tsx

<ResponsiveContainer width="100%" height={200}>
  <AreaChart data={data}>
    <defs>
      <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
      </linearGradient>
    </defs>
    <XAxis dataKey="elapsed" tickFormatter={formatTime} stroke="#6b7280" />
    <YAxis domain={[0, 100]} stroke="#6b7280" />
    <Tooltip />
    <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="3 3" />
    <Area
      type="monotone"
      dataKey="score"
      stroke="#3b82f6"
      strokeWidth={2}
      fill="url(#focusGradient)"
      isAnimationActive={false}
    />
  </AreaChart>
</ResponsiveContainer>
```

### localStorage with Error Handling (verified browser API)
```typescript
// Source: MDN Web Docs (https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

function safeGetItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`[session-storage] Failed to read ${key}, using fallback`);
    return fallback;
  }
}

function safeSetItem(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`[session-storage] Failed to write ${key}:`, err);
    return false;
  }
}
```

### crypto.randomUUID() for Session IDs
```typescript
// Source: MDN (https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
// Supported in Chrome 92+, Edge 92+ (our target browsers)

const sessionId = crypto.randomUUID();
// Returns e.g. "36b8f84d-df4e-4d49-b662-bcde71a8764f"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redux for all state | useReducer for local, Zustand for global | 2024-2025 | Less boilerplate; no new dependency for local state machines |
| IndexedDB for all browser storage | localStorage for small data, IndexedDB for large | Ongoing | localStorage is simpler for <5MB; IndexedDB adds async complexity |
| Custom chart libraries | Recharts 3.x with composable components | Recharts 3.0 (2024) | Stacked ranges, improved SSR, better TypeScript support |
| Manual streak tracking | date-fns / Temporal API | Temporal still stage 3 | Native Date + `toLocaleDateString("en-CA")` sufficient for now |

**Deprecated/outdated:**
- `Temporal` API: Still Stage 3 TC39 proposal as of February 2026. Not available in browsers without polyfill. Do not use.
- `moment.js`: Deprecated since 2020. Use `date-fns` if a date library is needed.
- Recharts 2.x: The project already uses Recharts 3.7.0. Do not reference Recharts 2.x patterns.

## Open Questions

1. **Snapshot Downsampling Strategy for Storage**
   - What we know: At 1 snapshot per 3 seconds, a 60-minute session produces ~1,200 data points (~24KB JSON). Storing 100 sessions = ~2.4MB. This fits in localStorage but is pushing toward limits.
   - What's unclear: Whether to downsample at storage time (fewer points in localStorage) or at render time (all points stored, fewer rendered). Downsampling at storage time saves space but loses resolution permanently.
   - Recommendation: Downsample at storage time to 1 point per 10 seconds (~360 points per 60-min session, ~720KB for 100 sessions). The timeline chart does not need 3-second resolution for a past session review. Live session can keep full resolution in memory.

2. **Session Minimum Duration**
   - What we know: Requirements don't specify a minimum session length. A user could start and immediately end a session (0 seconds).
   - What's unclear: Should very short sessions (< 30 seconds) be saved? They would pollute streak tracking and history.
   - Recommendation: Only save sessions longer than 60 seconds (matching the coaching grace period). Sessions under 60 seconds are discarded with a "Session too short" message. This prevents accidental starts from counting.

3. **Page Navigation During Active Session**
   - What we know: If the user navigates away from `/session` during an active session, all state is lost (React unmounts).
   - What's unclear: Should we warn the user? Save partial session data? Use `beforeunload` event?
   - Recommendation: Add a `beforeunload` event listener during active sessions that shows the browser's native "Leave page?" confirmation dialog. Do NOT auto-save partial sessions -- they would have incomplete data and skew statistics.

4. **Responsive Layout Scope (UI-05)**
   - What we know: The requirement says "responsive and works on desktop browsers (Chrome/Edge)." The current layout uses `lg:flex-row` breakpoint for two-column layout.
   - What's unclear: Whether to support tablet-sized viewports, or strictly desktop. The current implementation already handles narrower viewports by stacking columns.
   - Recommendation: Desktop-first (Chrome/Edge on 1024px+ screens). Ensure the pre-session and summary views work at 768px minimum. Mobile is explicitly out of scope per the requirement "desktop browsers."

5. **Session History View: Same Page or New Route?**
   - What we know: The current `/session` route shows the detection view immediately. Phase 4 needs a pre-session view with history.
   - What's unclear: Whether past session details should be on `/session` (scroll-down list), a new `/session/history` route, or a slide-out panel.
   - Recommendation: Keep everything on `/session` as a single-page flow controlled by session phase state. Pre-session state shows the dashboard with history. This avoids route changes that would unmount/remount detection components. Use a tab or expandable section for the history list, not a separate route.

## Sources

### Primary (HIGH confidence)
- [React useReducer docs](https://react.dev/reference/react/useReducer) - Official React reference for useReducer hook, pure reducer functions, action dispatch pattern
- [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) - Browser storage API, synchronous read/write, 5MB limit per origin
- [MDN crypto.randomUUID()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) - UUID generation, Chrome 92+ support
- [Recharts API docs](https://recharts.github.io/en-US/api/) - AreaChart, Area, ReferenceLine, ReferenceArea, ResponsiveContainer, Tooltip components
- [Recharts GitHub](https://github.com/recharts/recharts) - Version 3.7.0, stacked ranges since 3.6
- Existing codebase: `src/components/scoring/StatCards.tsx` - Timer pattern using wall-clock math
- Existing codebase: `src/components/scoring/FocusSparkline.tsx` - Recharts sparkline with SSR guard
- Existing codebase: `src/hooks/useFocusScore.ts` - Score state management pattern, 3-second update interval
- Existing codebase: `src/lib/coaching-engine.ts` - State machine pattern (NudgeState), pure functions

### Secondary (MEDIUM confidence)
- [Zustand persist middleware](https://zustand.docs.pmnd.rs/middlewares/persist) - Alternative persistence approach (not recommended for this phase but documented as considered)
- [idb-keyval npm](https://www.npmjs.com/package/idb-keyval) - Lightweight IndexedDB wrapper, 295 bytes (alternative to localStorage, not recommended)
- [use-streak npm](https://www.npmjs.com/package/use-streak) - Reference implementation for streak counting with localStorage (too simple and external; hand-roll is fine)
- [MDN Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) - localStorage limits vary by browser, typically 5-10MB

### Tertiary (LOW confidence)
- None. All critical claims verified with official docs or codebase inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zero new dependencies; all tools already installed or browser-built-in; verified against existing codebase patterns
- Architecture: HIGH - Session state machine pattern is well-established (useReducer); localStorage persistence is simple and verified; Recharts AreaChart confirmed available in installed version
- Pitfalls: HIGH - Timer drift, pause vs. stop detection, localStorage quota, state reset, and re-render issues are all verified from codebase review and established React patterns
- Streak tracking: MEDIUM - The `toLocaleDateString("en-CA")` approach for YYYY-MM-DD comparison is browser-native but untested for edge cases around DST transitions. Low risk for desktop Chrome/Edge targets.

**Existing code assessment:**
- `DetectionProvider.tsx` (193 lines): Must be restructured to accept session phase and only feed scores when running. Currently auto-starts everything on mount.
- `useFocusScore.ts` (183 lines): Needs a `reset()` function to clear score/history/calibration refs when new session starts. Currently initializes once and never resets.
- `useAICoaching.ts` (380 lines): Needs session-aware initialization -- nudge state should reset on new session start. Pre-cache warm-up already triggers on `sessionStartTime` change.
- `useFocusChime.ts` (192 lines): Needs reset capability for new sessions (baseline, chimeCount refs).
- `StatCards.tsx` (88 lines): Will be replaced/enhanced by session-aware stat cards that show session-specific metrics.
- `session/page.tsx` (18 lines): Minimal page wrapper. Must be expanded to manage session lifecycle and conditional rendering.

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - all libraries are stable, no breaking changes expected)
