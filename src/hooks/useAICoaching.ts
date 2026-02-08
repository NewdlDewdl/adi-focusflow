"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  canTriggerNudge,
  createNudgeState,
  advanceEscalation,
  updateScoreHistory,
  shouldResetEscalation,
  getEscalationTier,
  type NudgeState,
} from "@/lib/coaching-engine";

/** Escalation tier type (client-safe, mirrors coaching-engine output). */
export type EscalationTier = "gentle" | "medium" | "direct";

/**
 * Hardcoded fallback messages for when both Gemini API and network are down.
 * 3 phrases per tier -- minimal set for offline resilience.
 */
const FALLBACK_MESSAGES: Record<EscalationTier, string[]> = {
  gentle: [
    "Hey, let's refocus on your task.",
    "Time to return your focus.",
    "Your attention is drifting a little.",
  ],
  medium: [
    "Focus is slipping. Time to re-engage.",
    "You're losing focus. Bring it back.",
    "Attention needed. Come back now.",
  ],
  direct: [
    "Stop getting distracted. Focus now.",
    "Focus up. Your attention is needed.",
    "Enough distractions. Time to focus.",
  ],
};

/**
 * Configuration for AI coaching behavior.
 */
export interface CoachingConfig {
  /** Number of chimes before first voice activation */
  chimesToActivate: number;
  /** Minimum seconds between voice nudges */
  cooldownSeconds: number;
  /** Enable escalation across repeated distractions */
  enableEscalation: boolean;
  /** Seconds of grace period at session start (no nudges) */
  gracePeriodSeconds: number;
}

const DEFAULT_COACHING_CONFIG: CoachingConfig = {
  chimesToActivate: 5,
  cooldownSeconds: 30,
  enableEscalation: true,
  gracePeriodSeconds: 60,
};

/**
 * React hook that provides AI voice coaching when user loses focus.
 *
 * Uses the coaching-engine state machine for timing (grace period, cooldown,
 * recovery suppression) and escalation (gentle -> medium -> direct).
 *
 * Fetches coaching text from Gemini via /api/coaching/generate,
 * plays audio via ElevenLabs /api/elevenlabs/speak, and falls back
 * to browser SpeechSynthesis when ElevenLabs is unavailable.
 *
 * @param score - Current focus score (0-100)
 * @param chimeCount - Current number of chimes played in distraction session
 * @param sessionStartTime - Timestamp when detection session started (null if not started)
 * @param config - Optional configuration overrides
 */
export function useAICoaching(
  score: number,
  chimeCount: number,
  sessionStartTime: number | null,
  config?: Partial<CoachingConfig>
): {
  isPlaying: boolean;
  currentTier: EscalationTier | null;
  currentMessage: string | null;
  reset: () => void;
} {
  const fullConfig = { ...DEFAULT_COACHING_CONFIG, ...config };

  // UI-reactive state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTier, setCurrentTier] = useState<EscalationTier | null>(null);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);

  // Internal refs (non-reactive)
  const nudgeStateRef = useRef<NudgeState | null>(null);
  const isPlayingRef = useRef(false);
  const hasTriggeredForCurrentChimeSessionRef = useRef(false);
  const previousChimeCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousSessionStartRef = useRef<number | null>(null);

  // --- Pre-cache warm-up: fire when sessionStartTime transitions from null to a number ---
  useEffect(() => {
    if (
      sessionStartTime !== null &&
      previousSessionStartRef.current === null
    ) {
      console.log("[useAICoaching] Session started, firing pre-cache warm-up");
      fetch("/api/coaching/precache", { method: "POST" }).catch((err) =>
        console.error("[useAICoaching] Pre-cache warm-up failed:", err)
      );
    }
    previousSessionStartRef.current = sessionStartTime;
  }, [sessionStartTime]);

  // --- Lazily initialize nudge state when session starts ---
  useEffect(() => {
    if (sessionStartTime !== null && nudgeStateRef.current === null) {
      nudgeStateRef.current = createNudgeState(sessionStartTime);
      console.log("[useAICoaching] Nudge state initialized for session");
    }
  }, [sessionStartTime]);

  // --- Score history tracking: update on every score change ---
  useEffect(() => {
    if (nudgeStateRef.current === null) return;

    // Track score history
    nudgeStateRef.current = updateScoreHistory(nudgeStateRef.current, score);

    // Check if escalation should reset (sustained high focus)
    if (shouldResetEscalation(nudgeStateRef.current)) {
      console.log(
        "[useAICoaching] Sustained high focus detected, resetting escalation"
      );
      nudgeStateRef.current = {
        ...nudgeStateRef.current,
        escalationLevel: 0,
      };
    }
  }, [score]);

  /**
   * Build context object for Gemini coaching text generation.
   */
  const buildContext = () => {
    const state = nudgeStateRef.current;
    if (!state) return { sessionMinutes: 0, distractionCount: 0 };
    const sessionMinutes = Math.floor(
      (Date.now() - state.sessionStartTime) / 60000
    );
    return {
      sessionMinutes,
      distractionCount: state.consecutiveDistractions,
    };
  };

  /**
   * Play a spoken coaching nudge: fetch Gemini text, play via ElevenLabs or
   * SpeechSynthesis fallback, then update state.
   */
  const playCoachingNudge = async (tier: EscalationTier) => {
    let text: string;

    // 1. Fetch coaching text from Gemini API
    try {
      const res = await fetch("/api/coaching/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, context: buildContext() }),
      });

      if (res.ok) {
        const data = await res.json();
        text = data.text;
      } else {
        console.warn(
          "[useAICoaching] Gemini API returned",
          res.status,
          "- using fallback"
        );
        text = pickFallback(tier);
      }
    } catch (err) {
      console.warn("[useAICoaching] Gemini fetch failed:", err);
      text = pickFallback(tier);
    }

    console.log(`[useAICoaching] Nudge text (${tier}):`, text);
    setCurrentMessage(text);

    // 2. Try ElevenLabs TTS
    let playedViaElevenLabs = false;
    try {
      const audioRes = await fetch("/api/elevenlabs/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (audioRes.ok) {
        const blob = await audioRes.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        await new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
            resolve();
          };
          audio.onerror = (e) => {
            URL.revokeObjectURL(audioUrl);
            audioRef.current = null;
            reject(e);
          };
          audio.play().catch(reject);
        });

        playedViaElevenLabs = true;
      } else {
        console.warn(
          "[useAICoaching] ElevenLabs returned",
          audioRes.status,
          "- falling back to browser speech"
        );
      }
    } catch (err) {
      console.warn("[useAICoaching] ElevenLabs playback failed:", err);
    }

    // 3. SpeechSynthesis fallback (COACH-06)
    if (!playedViaElevenLabs) {
      console.log("[useAICoaching] Using SpeechSynthesis fallback");
      await speakWithSynthesis(text);
    }

    // 4. Post-playback: update nudge state
    if (nudgeStateRef.current) {
      nudgeStateRef.current = {
        ...nudgeStateRef.current,
        lastNudgeTime: Date.now(),
      };
      nudgeStateRef.current = advanceEscalation(nudgeStateRef.current);
    }

    // 5. Reset playing state
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentTier(null);
    setCurrentMessage(null);
    console.log("[useAICoaching] Nudge complete");
  };

  // --- Main trigger logic: fire on chimeCount changes ---
  useEffect(() => {
    if (nudgeStateRef.current === null) return;

    // Detect chime count reset (user recovered focus)
    if (chimeCount === 0 && previousChimeCountRef.current > 0) {
      console.log("[useAICoaching] Chime count reset, user recovered focus");
      hasTriggeredForCurrentChimeSessionRef.current = false;
      // NOTE: Do NOT reset escalation here. Escalation persists across
      // distraction events and only resets via shouldResetEscalation
      // (sustained high focus per COACH-07).
    }

    previousChimeCountRef.current = chimeCount;

    // Trigger coaching after N chimes
    if (
      chimeCount >= fullConfig.chimesToActivate &&
      !hasTriggeredForCurrentChimeSessionRef.current &&
      !isPlayingRef.current
    ) {
      // Check coaching-engine timing rules
      const { allowed, reason } = canTriggerNudge(
        nudgeStateRef.current,
        score
      );
      if (!allowed) {
        console.log("[useAICoaching] Nudge blocked:", reason);
        return;
      }

      console.log(
        "[useAICoaching] Chime threshold reached, triggering voice coaching"
      );
      hasTriggeredForCurrentChimeSessionRef.current = true;
      isPlayingRef.current = true;
      setIsPlaying(true);

      const tier = getEscalationTier(
        nudgeStateRef.current.escalationLevel
      );
      setCurrentTier(tier);

      // Fire-and-forget the async playback (errors handled internally)
      playCoachingNudge(tier);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chimeCount]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /**
   * Reset coaching state for a new session.
   * Clears nudge state, escalation, and playing state.
   * Does NOT clear pre-cached audio data (expensive to regenerate).
   */
  const reset = useCallback(() => {
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Reset nudge state (will be re-initialized when sessionStartTime changes)
    nudgeStateRef.current = null;
    isPlayingRef.current = false;
    hasTriggeredForCurrentChimeSessionRef.current = false;
    previousChimeCountRef.current = 0;
    previousSessionStartRef.current = null;

    // Reset reactive state
    setIsPlaying(false);
    setCurrentTier(null);
    setCurrentMessage(null);
  }, []);

  return { isPlaying, currentTier, currentMessage, reset };
}

/**
 * Pick a random fallback message for offline resilience.
 */
function pickFallback(tier: EscalationTier): string {
  const msgs = FALLBACK_MESSAGES[tier];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

/**
 * Speak text using browser SpeechSynthesis with proper onend handling.
 * Includes a 10-second safety timeout (research pitfall 5: onend sometimes
 * never fires on certain browsers/platforms).
 */
function speakWithSynthesis(text: string): Promise<void> {
  return new Promise<void>((resolve) => {
    if (
      typeof window === "undefined" ||
      !window.speechSynthesis
    ) {
      console.warn("[useAICoaching] SpeechSynthesis not available");
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    let resolved = false;

    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    utterance.onend = () => {
      console.log("[useAICoaching] Browser speech finished");
      finish();
    };

    utterance.onerror = (e) => {
      console.error("[useAICoaching] SpeechSynthesis error:", e);
      finish();
    };

    // Safety timeout: resolve after 10s even if onend never fires
    setTimeout(() => {
      if (!resolved) {
        console.warn(
          "[useAICoaching] SpeechSynthesis safety timeout (10s) -- forcing resolve"
        );
        window.speechSynthesis.cancel();
        finish();
      }
    }, 10000);

    window.speechSynthesis.speak(utterance);
  });
}
