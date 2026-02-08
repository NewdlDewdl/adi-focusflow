/**
 * Session management types for the FocusFlow session lifecycle.
 *
 * Defines the state machine phases, actions, and stored session format.
 * Used by useSessionManager hook and session-storage persistence layer.
 */

// ---------------------------------------------------------------------------
// Session Lifecycle
// ---------------------------------------------------------------------------

/** Session lifecycle phases: idle -> running -> paused -> running -> ended */
export type SessionPhase = "idle" | "running" | "paused" | "ended";

/** A single focus score sample captured during a session */
export interface FocusSnapshot {
  time: number; // Unix ms timestamp
  score: number; // 0-100
}

/** State managed by the session reducer */
export interface SessionState {
  phase: SessionPhase;
  startTime: number | null;
  pausedAt: number | null;
  totalPausedMs: number;
  snapshots: FocusSnapshot[];
  distractionCount: number;
  focusedMs: number;
}

/** Actions dispatched to the session reducer */
export type SessionAction =
  | { type: "START" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "END" }
  | { type: "TICK"; score: number; timestamp: number }
  | { type: "DISTRACTION" };

// ---------------------------------------------------------------------------
// Persisted Session
// ---------------------------------------------------------------------------

/** A completed session persisted to localStorage */
export interface StoredSession {
  id: string;
  startTime: number;
  endTime: number;
  totalDurationMs: number;
  pausedDurationMs: number;
  averageScore: number;
  focusedPercentage: number;
  distractionCount: number;
  peakScore: number;
  longestFocusStreakMs: number;
  snapshots: FocusSnapshot[]; // Downsampled for storage
}
