/**
 * Nudge state machine for coaching timing and escalation logic.
 * Pure functions -- zero React dependencies, fully testable.
 */

export interface NudgeState {
  sessionStartTime: number;
  lastNudgeTime: number;
  escalationLevel: number; // 0=gentle, 1=medium, 2=direct
  consecutiveDistractions: number;
  scoreHistory: number[]; // last 5 scores for recovery detection
}

/**
 * Factory for creating a fresh nudge state at session start.
 */
export function createNudgeState(sessionStartTime: number): NudgeState {
  return {
    sessionStartTime,
    lastNudgeTime: 0,
    escalationLevel: 0,
    consecutiveDistractions: 0,
    scoreHistory: [],
  };
}

/**
 * Determine whether a nudge is allowed right now.
 *
 * Rules:
 * 1. COACH-08: 60-second grace period at session start
 * 2. COACH-04: 30-second cooldown between nudges
 * 3. COACH-09: Suppress during active recovery (3-frame upward trend)
 */
export function canTriggerNudge(
  state: NudgeState,
  currentScore: number,
  now: number = Date.now()
): { allowed: boolean; reason?: string } {
  // Rule 1: No nudge in first 60 seconds
  const sessionAgeSec = (now - state.sessionStartTime) / 1000;
  if (sessionAgeSec < 60) {
    return { allowed: false, reason: "grace-period" };
  }

  // Rule 2: 30-second cooldown between nudges
  if (state.lastNudgeTime > 0) {
    const sinceLastSec = (now - state.lastNudgeTime) / 1000;
    if (sinceLastSec < 30) {
      return { allowed: false, reason: "cooldown" };
    }
  }

  // Rule 3: Suppress if score is actively recovering (3-frame upward trend)
  if (state.scoreHistory.length >= 3) {
    const recent = state.scoreHistory.slice(-3);
    const isRecovering =
      recent[1] >= recent[0] && recent[2] >= recent[1] && recent[2] > recent[0];
    if (isRecovering) {
      return { allowed: false, reason: "recovering" };
    }
  }

  return { allowed: true };
}

/**
 * Map numeric escalation level to tier name.
 */
export function getEscalationTier(
  level: number
): "gentle" | "medium" | "direct" {
  if (level === 0) return "gentle";
  if (level === 1) return "medium";
  return "direct";
}

/**
 * Advance escalation after a nudge is delivered.
 * Returns a new state (immutable).
 */
export function advanceEscalation(state: NudgeState): NudgeState {
  return {
    ...state,
    escalationLevel: Math.min(state.escalationLevel + 1, 2),
    consecutiveDistractions: state.consecutiveDistractions + 1,
  };
}

/**
 * Append a score to history, keeping the last 5 entries.
 * Returns a new state (immutable).
 */
export function updateScoreHistory(
  state: NudgeState,
  score: number
): NudgeState {
  const updated = [...state.scoreHistory, score];
  return {
    ...state,
    scoreHistory: updated.slice(-5),
  };
}

/**
 * Check whether escalation should reset to gentle.
 * Returns true when all 5 history entries are >= 70 (sustained high focus).
 */
export function shouldResetEscalation(state: NudgeState): boolean {
  if (state.scoreHistory.length < 5) return false;
  return state.scoreHistory.every((s) => s >= 70);
}
