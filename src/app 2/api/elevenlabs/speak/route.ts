import { NextRequest, NextResponse } from "next/server";
import {
  getCachedAudio,
  setCachedAudio,
  isCached,
} from "@/lib/coaching-cache";

/**
 * Server-side API route for ElevenLabs text-to-speech.
 * Keeps the API key secure and never exposes it to the client.
 *
 * Uses eleven_flash_v2_5 model (~75ms latency) with server-side
 * audio caching to avoid redundant API calls for repeated phrases.
 *
 * POST /api/elevenlabs/speak
 * Body: { text: string, cache?: boolean }
 * Returns: Audio stream (audio/mpeg)
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text parameter is required" },
        { status: 400 }
      );
    }

    // Check server-side cache first
    if (isCached(text)) {
      console.log("[ElevenLabs API] Cache hit for:", text.substring(0, 50));
      const cached = getCachedAudio(text)!;
      return new NextResponse(new Uint8Array(cached), {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": cached.byteLength.toString(),
          "X-Cache": "HIT",
        },
      });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error(
        "[ElevenLabs API] Missing ELEVENLABS_API_KEY in environment"
      );
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    // Use ElevenLabs "Rachel" voice (a clear, professional voice)
    const voiceId = "21m00Tcm4TlvDq8ikWAM";

    console.log(
      "[ElevenLabs API] Generating speech for:",
      text.substring(0, 50)
    );

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
      console.error("[ElevenLabs API] Error:", response.status, error);
      return NextResponse.json(
        { error: "Failed to generate speech" },
        { status: response.status }
      );
    }

    // Read audio and cache it
    const audioBuffer = await response.arrayBuffer();
    const audioNodeBuffer = Buffer.from(audioBuffer);
    console.log(
      "[ElevenLabs API] Speech generated successfully:",
      audioBuffer.byteLength,
      "bytes"
    );

    // Store in server-side cache for future requests
    setCachedAudio(text, audioNodeBuffer);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("[ElevenLabs API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
