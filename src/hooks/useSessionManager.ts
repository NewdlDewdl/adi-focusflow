"use client";

import { useReducer, useCallback } from "react";
import type {
  SessionState,
  SessionAction,
  StoredSession,
} from "@/lib/session-types";
import { computeSessionSummary, saveSession } from "@/lib/session-storage";

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const INITIAL_STATE: SessionState = {
  phase: "idle",
  startTime: null,
  pausedAt: null,
  totalPausedMs: 0,
  snapshots: [],
  distractionCount: 0,
  focusedMs: 0,
};

/** Minimum session duration (ms) to persist. Sessions shorter than this are discarded. */
const MIN_SESSION_DURATION_MS = 60000; // 60 seconds

// ---------------------------------------------------------------------------
// Reducer (pure function)
// ---------------------------------------------------------------------------

function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  switch (action.type) {
    case "START":
      return {
        phase: "running",
        startTime: Date.now(),
        pausedAt: null,
        totalPausedMs: 0,
        snapshots: [],
        distractionCount: 0,
        focusedMs: 0,
      };

    case "PAUSE":
      if (state.phase !== "running") return state;
      return {
        ...state,
        phase: "paused",
        pausedAt: Date.now(),
      };

    case "RESUME":
      if (state.phase !== "paused") return state;
      return {
        ...state,
        phase: "running",
        totalPausedMs:
          state.totalPausedMs +
          (Date.now() - (state.pausedAt ?? Date.now())),
        pausedAt: null,
      };

    case "END": {
      if (state.phase !== "running" && state.phase !== "paused") return state;
      // If ending while paused, accumulate the final pause duration
      const finalPausedMs =
        state.phase === "paused" && state.pausedAt !== null
          ? state.totalPausedMs + (Date.now() - state.pausedAt)
          : state.totalPausedMs;
      return {
        ...state,
        phase: "ended",
        totalPausedMs: finalPausedMs,
        pausedAt: null,
      };
    }

    case "TICK":
      if (state.phase !== "running") return state;
      return {
        ...state,
        snapshots: [
          ...state.snapshots,
          { time: action.timestamp, score: action.score },
        ],
        focusedMs:
          action.score >= 70
            ? state.focusedMs + 3000 // 3-second tick interval
            : state.focusedMs,
      };

    case "DISTRACTION":
      if (state.phase !== "running") return state;
      return {
        ...state,
        distractionCount: state.distractionCount + 1,
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Session lifecycle state machine.
 *
 * Manages session phases (idle -> running -> paused -> running -> ended)
 * via useReducer. Does NOT run a timer -- the caller dispatches TICK actions.
 *
 * On END, computes a session summary and persists to localStorage if the
 * session was longer than 60 seconds.
 */
export function useSessionManager() {
  const [session, dispatch] = useReducer(sessionReducer, INITIAL_STATE);

  const start = useCallback(() => {
    dispatch({ type: "START" });
  }, []);

  const pause = useCallback(() => {
    dispatch({ type: "PAUSE" });
  }, []);

  const resume = useCallback(() => {
    dispatch({ type: "RESUME" });
  }, []);

  const end = useCallback((): StoredSession | null => {
    dispatch({ type: "END" });

    // Compute summary from current state (before reducer updates)
    // We need to handle the END transition inline since dispatch is async
    if (session.phase !== "running" && session.phase !== "paused") return null;

    // Build the ended state manually for summary computation
    const finalPausedMs =
      session.phase === "paused" && session.pausedAt !== null
        ? session.totalPausedMs + (Date.now() - session.pausedAt)
        : session.totalPausedMs;

    const endedState: SessionState = {
      ...session,
      phase: "ended",
      totalPausedMs: finalPausedMs,
      pausedAt: null,
    };

    const summary = computeSessionSummary(endedState);

    // Only save sessions longer than 60 seconds
    if (summary.totalDurationMs < MIN_SESSION_DURATION_MS) {
      console.log(
        "[useSessionManager] Session too short to save:",
        Math.round(summary.totalDurationMs / 1000),
        "seconds"
      );
      return null;
    }

    const stored: StoredSession = {
      id: crypto.randomUUID(),
      ...summary,
    };

    saveSession(stored);
    console.log("[useSessionManager] Session saved:", stored.id);

    return stored;
  }, [session]);

  const tick = useCallback((score: number) => {
    dispatch({ type: "TICK", score, timestamp: Date.now() });
  }, []);

  const recordDistraction = useCallback(() => {
    dispatch({ type: "DISTRACTION" });
  }, []);

  return {
    session,
    start,
    pause,
    resume,
    end,
    tick,
    recordDistraction,
  };
}
