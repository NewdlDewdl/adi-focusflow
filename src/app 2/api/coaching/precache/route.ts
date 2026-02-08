import { NextResponse } from "next/server";
import {
  COMMON_NUDGE_PHRASES,
  type EscalationTier,
} from "@/lib/coaching-prompts";
import { isCached, setCachedAudio } from "@/lib/coaching-cache";

/**
 * POST /api/coaching/precache
 *
 * Warm up the server-side audio cache by pre-generating
 * ElevenLabs audio for all common nudge phrases.
 *
 * Processes in batches of 2 (ElevenLabs free tier concurrency limit).
 * Directly calls ElevenLabs API to avoid self-request issues in Next.js.
 *
 * Response: { cached: number, total: number, skipped: number }
 */
export async function POST() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("[Precache] Missing ELEVENLABS_API_KEY");
    return NextResponse.json(
      { error: "ElevenLabs API key not configured", cached: 0, total: 0, skipped: 0 },
      { status: 500 }
    );
  }

  const voiceId = "21m00Tcm4TlvDq8ikWAM";
  const tiers: EscalationTier[] = ["gentle", "medium", "direct"];

  // Collect all phrases that need caching
  const phrasesToCache: string[] = [];
  let skipped = 0;

  for (const tier of tiers) {
    for (const phrase of COMMON_NUDGE_PHRASES[tier]) {
      if (isCached(phrase)) {
        skipped++;
      } else {
        phrasesToCache.push(phrase);
      }
    }
  }

  const total = phrasesToCache.length + skipped;
  let cached = 0;

  try {
    // Process in batches of 2 (ElevenLabs free tier concurrency limit)
    for (let i = 0; i < phrasesToCache.length; i += 2) {
      const batch = phrasesToCache.slice(i, i + 2);

      console.log(
        `[Precache] Caching phrases ${i + 1}-${Math.min(i + 2, phrasesToCache.length)}/${phrasesToCache.length}...`
      );

      const results = await Promise.allSettled(
        batch.map(async (text) => {
          const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "xi-api-key": apiKey,
              },
              body: JSON.stringify({
                text,
                model_id: "eleven_flash_v2_5",
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.75,
                },
              }),
            }
          );

          if (!response.ok) {
            const error = await response.text();
            console.error(
              `[Precache] ElevenLabs error for "${text.substring(0, 30)}...":`,
              response.status,
              error
            );
            throw new Error(`ElevenLabs ${response.status}`);
          }

          const audioBuffer = await response.arrayBuffer();
          setCachedAudio(text, Buffer.from(audioBuffer));
          console.log(
            `[Precache] Cached "${text.substring(0, 30)}..." (${audioBuffer.byteLength} bytes)`
          );
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          cached++;
        } else {
          console.error("[Precache] Failed to cache phrase:", result.reason);
        }
      }
    }

    console.log(
      `[Precache] Complete: ${cached} cached, ${skipped} skipped, ${total} total`
    );

    return NextResponse.json({ cached, total, skipped });
  } catch (error) {
    console.error("[Precache] Unexpected error:", error);

    // Return partial success
    return NextResponse.json({ cached, total, skipped, error: "Partial failure" });
  }
}
