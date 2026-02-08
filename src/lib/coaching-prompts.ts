/**
 * Gemini prompt templates and coaching text generation.
 * Server-only module (uses process.env.GEMINI_API_KEY).
 */

import { GoogleGenAI } from "@google/genai";

export type EscalationTier = "gentle" | "medium" | "direct";

/**
 * System instructions per escalation tier.
 * Each constrains output to 4-8 words and includes examples.
 */
export const SYSTEM_INSTRUCTIONS: Record<EscalationTier, string> = {
  gentle: `You are a supportive focus coach. Generate a single gentle reminder to refocus. MUST be 4-8 words. No quotes or punctuation except periods. Examples: "Hey, let's get back on track." "Time to refocus on your work." "Your attention drifted a little." Never use harsh language.`,

  medium: `You are a firm but caring focus coach. Generate a single nudge to regain focus. MUST be 4-8 words. Be direct but not harsh. No quotes or punctuation except periods. Examples: "Your focus is slipping, come back." "Let's bring that attention back now." "Time to re-engage with your task."`,

  direct: `You are a no-nonsense focus coach. Generate a single direct command to focus immediately. MUST be 4-8 words. Be assertive. No quotes or punctuation except periods. Examples: "Stop. Focus. Right now." "Enough distractions, get to work." "Focus up. No more delays."`,
};

/**
 * Pre-cache corpus of common nudge phrases (~8-10 per tier).
 * Used as fallback when Gemini is unavailable and as the
 * pre-cache audio set (COACH-05).
 */
export const COMMON_NUDGE_PHRASES: Record<EscalationTier, string[]> = {
  gentle: [
    "Hey, let's refocus on your task.",
    "Come back and focus.",
    "Your attention is drifting a little.",
    "Time to return your focus.",
    "Let's get back on track.",
    "A gentle reminder to refocus.",
    "Bring your attention back here.",
    "Time to refocus on your work.",
    "Let's ease back into focus.",
  ],
  medium: [
    "You're losing focus. Bring it back.",
    "Focus is slipping. Time to re-engage.",
    "Your mind is wandering. Snap back.",
    "Let's regain that focus you had.",
    "Attention needed. Come back now.",
    "Your focus dropped. Let's fix that.",
    "Stay with your work. Refocus now.",
    "Bring that attention back to work.",
    "Re-engage with your task now.",
  ],
  direct: [
    "Stop getting distracted. Focus now.",
    "You need to concentrate. Get working.",
    "Focus up. Your attention is needed.",
    "Enough distractions. Time to focus.",
    "No more delays. Focus immediately.",
    "Stop. Get back to work now.",
    "Distractions end now. Focus up.",
    "Lock in. Focus on your task.",
    "Quit drifting. Concentrate right now.",
  ],
};

/**
 * Generate contextual coaching text via Gemini 2.5 Flash.
 * Falls back to a random phrase from COMMON_NUDGE_PHRASES on failure.
 */
export async function generateCoachingText(
  tier: EscalationTier,
  context?: { sessionMinutes?: number; distractionCount?: number }
): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[Coaching Prompts] No GEMINI_API_KEY, using fallback phrase");
      return pickRandomPhrase(tier);
    }

    const ai = new GoogleGenAI({ apiKey });

    const contextStr = context
      ? `User has been in session for ${context.sessionMinutes ?? 0} minutes with ${context.distractionCount ?? 0} distractions.`
      : "";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a focus coaching nudge. ${contextStr}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTIONS[tier],
        temperature: 0.8,
      },
    });

    const text = response.text?.trim();
    if (text && text.length > 0) {
      return text;
    }

    return pickRandomPhrase(tier);
  } catch (error) {
    console.error("[Coaching Prompts] Gemini generation failed:", error);
    return pickRandomPhrase(tier);
  }
}

/**
 * Pick a random phrase from the pre-cache corpus for a given tier.
 */
function pickRandomPhrase(tier: EscalationTier): string {
  const phrases = COMMON_NUDGE_PHRASES[tier];
  return phrases[Math.floor(Math.random() * phrases.length)];
}
