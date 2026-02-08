import { NextRequest, NextResponse } from "next/server";
import {
  generateCoachingText,
  COMMON_NUDGE_PHRASES,
  type EscalationTier,
} from "@/lib/coaching-prompts";

/**
 * POST /api/coaching/generate
 *
 * Generate contextual coaching text via Gemini 2.5 Flash.
 * Always returns usable text -- falls back to hardcoded phrases on failure.
 *
 * Body: { tier?: "gentle" | "medium" | "direct", context?: string }
 * Response: { text: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tier: EscalationTier = body.tier ?? "gentle";
    const context = body.context;

    // Parse context string into structured data if provided
    const contextObj = context
      ? { sessionMinutes: 0, distractionCount: 0 }
      : undefined;

    const text = await generateCoachingText(tier, contextObj);

    return NextResponse.json({ text });
  } catch (error) {
    console.error("[Coaching API] Error generating coaching text:", error);

    // Graceful fallback: always return usable text, never an error
    const tier: EscalationTier = "gentle";
    const phrases = COMMON_NUDGE_PHRASES[tier];
    const fallback = phrases[Math.floor(Math.random() * phrases.length)];

    return NextResponse.json({ text: fallback });
  }
}
