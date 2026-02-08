/**
 * Server-side audio cache for coaching nudge audio.
 * Module-level Map persists across requests within the same
 * Next.js server process -- no external storage needed.
 *
 * Designed for ~30 items (no eviction policy required).
 */

const audioCache = new Map<string, Buffer>();

/**
 * Retrieve cached audio for a text string, or null if not cached.
 */
export function getCachedAudio(text: string): Buffer | null {
  return audioCache.get(text) ?? null;
}

/**
 * Store audio in the cache keyed by the exact text string.
 */
export function setCachedAudio(text: string, audio: Buffer): void {
  audioCache.set(text, audio);
}

/**
 * Check whether audio for a given text is already cached.
 */
export function isCached(text: string): boolean {
  return audioCache.has(text);
}

/**
 * Return the number of cached audio entries.
 */
export function getCacheSize(): number {
  return audioCache.size;
}

/**
 * Return all cached text keys (useful for debugging).
 */
export function getAllCachedTexts(): string[] {
  return Array.from(audioCache.keys());
}
