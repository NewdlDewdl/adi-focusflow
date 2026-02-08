/**
 * Session persistence layer using localStorage.
 *
 * All localStorage operations are wrapped in try/catch to prevent storage
 * errors from crashing the app. Functions degrade gracefully (return empty
 * arrays / log errors) when storage is unavailable or corrupted.
 */

import type { FocusSnapshot, SessionState, StoredSession } from "./session-types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "focusflow_sessions";
const MAX_SESSIONS = 100;

/** Tick interval used by the session manager (3 seconds) */
const TICK_INTERVAL_MS = 3000;

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

/**
 * Load all stored sessions from localStorage.
 * Returns empty array on parse error or missing data.
 */
export function loadSessions(): StoredSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Append a session to localStorage. Trims to most recent MAX_SESSIONS.
 * Logs errors but never throws.
 */
export function saveSession(session: StoredSession): void {
  try {
    const sessions = loadSessions();
    sessions.push(session);
    const trimmed = sessions.slice(-MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error("[session-storage] Failed to save session:", err);
  }
}

// ---------------------------------------------------------------------------
// Downsampling
// ---------------------------------------------------------------------------

/**
 * Reduce snapshot count for storage using evenly-spaced sampling.
 *
 * For N input snapshots and M maxPoints, picks every Math.ceil(N/M)th
 * snapshot, always including the first and last.
 *
 * @param snapshots - Full-resolution snapshots from the session
 * @param maxPoints - Maximum number of points to keep (default 120)
 */
export function downsampleSnapshots(
  snapshots: FocusSnapshot[],
  maxPoints: number = 120
): FocusSnapshot[] {
  if (snapshots.length <= maxPoints) return [...snapshots];

  const result: FocusSnapshot[] = [];
  const step = Math.ceil(snapshots.length / maxPoints);

  for (let i = 0; i < snapshots.length; i += step) {
    result.push(snapshots[i]);
  }

  // Always include the last snapshot
  const last = snapshots[snapshots.length - 1];
  if (result[result.length - 1] !== last) {
    result.push(last);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Streak Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the consecutive-day streak from stored sessions.
 *
 * Uses startTime (not endTime) for date attribution.
 * Streak must start from today or yesterday.
 * Same-day sessions are deduplicated (counted as one day).
 *
 * @returns Streak count (0 if no recent sessions)
 */
export function calculateStreak(sessions: StoredSession[]): number {
  if (sessions.length === 0) return 0;

  // Get unique dates (YYYY-MM-DD in local timezone)
  const dates = [
    ...new Set(
      sessions.map((s) =>
        new Date(s.startTime).toLocaleDateString("en-CA")
      )
    ),
  ]
    .sort()
    .reverse(); // Most recent first

  const today = new Date().toLocaleDateString("en-CA");
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");

  // Streak must start from today or yesterday
  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const current = new Date(dates[i] + "T00:00:00");
    const next = new Date(dates[i + 1] + "T00:00:00");
    const diffMs = current.getTime() - next.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ---------------------------------------------------------------------------
// Personal Bests
// ---------------------------------------------------------------------------

/**
 * Compute personal bests across all stored sessions.
 * Returns zeros for empty arrays.
 */
export function getPersonalBests(sessions: StoredSession[]): {
  longestFocusStreakMs: number;
  highestScore: number;
  longestSessionMs: number;
} {
  if (sessions.length === 0) {
    return { longestFocusStreakMs: 0, highestScore: 0, longestSessionMs: 0 };
  }

  return {
    longestFocusStreakMs: Math.max(
      ...sessions.map((s) => s.longestFocusStreakMs)
    ),
    highestScore: Math.max(...sessions.map((s) => s.peakScore)),
    longestSessionMs: Math.max(...sessions.map((s) => s.totalDurationMs)),
  };
}

// ---------------------------------------------------------------------------
// Session Summary Computation
// ---------------------------------------------------------------------------

/**
 * Compute a StoredSession summary from a completed SessionState.
 *
 * Call this when session phase transitions to "ended".
 * The caller is responsible for adding the `id` field (via crypto.randomUUID()).
 *
 * @returns All StoredSession fields except `id`
 */
export function computeSessionSummary(
  state: SessionState
): Omit<StoredSession, "id"> {
  const endTime = Date.now();
  const startTime = state.startTime ?? endTime;
  const totalDurationMs = endTime - startTime - state.totalPausedMs;

  // Average score from snapshots
  const averageScore =
    state.snapshots.length > 0
      ? Math.round(
          state.snapshots.reduce((sum, s) => sum + s.score, 0) /
            state.snapshots.length
        )
      : 0;

  // Focused percentage
  const focusedPercentage =
    totalDurationMs > 0
      ? Math.round((state.focusedMs / totalDurationMs) * 100)
      : 0;

  // Peak score (default 100 if no snapshots -- session started at 100)
  const peakScore =
    state.snapshots.length > 0
      ? Math.max(...state.snapshots.map((s) => s.score))
      : 100;

  // Longest focus streak: longest consecutive run of snapshots with score >= 70
  const longestFocusStreakMs = computeLongestFocusStreak(state.snapshots);

  // Downsample snapshots for storage
  const snapshots = downsampleSnapshots(state.snapshots, 120);

  return {
    startTime,
    endTime,
    totalDurationMs,
    pausedDurationMs: state.totalPausedMs,
    averageScore,
    focusedPercentage: Math.min(100, focusedPercentage),
    distractionCount: state.distractionCount,
    peakScore,
    longestFocusStreakMs,
    snapshots,
  };
}

/**
 * Compute the longest consecutive run of snapshots with score >= 70,
 * multiplied by the tick interval (3000ms).
 */
function computeLongestFocusStreak(snapshots: FocusSnapshot[]): number {
  let maxStreak = 0;
  let currentStreak = 0;

  for (const snap of snapshots) {
    if (snap.score >= 70) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak * TICK_INTERVAL_MS;
}
