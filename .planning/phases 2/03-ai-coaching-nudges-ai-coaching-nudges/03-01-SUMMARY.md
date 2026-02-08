---
phase: 03-ai-coaching-nudges
plan: 01
subsystem: api
tags: [gemini, elevenlabs, tts, coaching, state-machine, caching]

# Dependency graph
requires:
  - phase: 02-focus-scoring-visualization
    provides: Focus scoring pipeline and session layout
provides:
  - Nudge state machine (timing, escalation, recovery suppression)
  - Gemini 2.5 Flash coaching text generation API route
  - ElevenLabs Flash v2.5 TTS route with server-side audio cache
  - 27-phrase pre-cache corpus across 3 escalation tiers
  - Pre-cache warm-up endpoint for batch audio generation
affects: [03-02, coaching-ui, session-management]

# Tech tracking
tech-stack:
  added: ["@google/genai"]
  patterns: ["Server-side Map audio cache", "Graceful API fallback to hardcoded phrases", "Immutable state machine updates"]

key-files:
  created:
    - src/lib/coaching-engine.ts
    - src/lib/coaching-prompts.ts
    - src/lib/coaching-cache.ts
    - src/app/api/coaching/generate/route.ts
    - src/app/api/coaching/precache/route.ts
  modified:
    - src/app/api/elevenlabs/speak/route.ts

key-decisions:
  - "Immutable state machine: all coaching-engine functions return new state objects rather than mutating"
  - "27 pre-cache phrases (9 per tier) covers COACH-05 corpus requirement"
  - "ElevenLabs cache uses Uint8Array conversion for NextResponse body compatibility"
  - "Precache route calls ElevenLabs API directly (not self-fetch) to avoid Next.js self-request issues"

patterns-established:
  - "Server-side module-level Map for cross-request caching (no external storage needed for ~30 items)"
  - "Graceful API fallback: coaching routes always return usable text, never error to client"
  - "Batch processing with concurrency limit (2) for rate-limited external APIs"

# Metrics
duration: 3min
completed: 2026-02-08
---

# Phase 3 Plan 1: Coaching Engine Foundation Summary

**Pure nudge state machine with 3 timing rules, Gemini 2.5 Flash text generation via @google/genai, and ElevenLabs Flash v2.5 TTS with server-side audio caching**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-08T04:16:53Z
- **Completed:** 2026-02-08T04:20:12Z
- **Tasks:** 2
- **Files created/modified:** 6

## Accomplishments
- Pure coaching engine with 60s grace period, 30s cooldown, and 3-frame recovery suppression
- Gemini 2.5 Flash integration with system instructions per escalation tier and graceful fallback
- ElevenLabs model upgraded from eleven_monolingual_v1 to eleven_flash_v2_5 (~75ms latency)
- Server-side audio cache shared across requests via module-level Map
- Pre-cache warm-up endpoint processes 27 phrases in batches of 2

## Task Commits

Each task was committed atomically:

1. **Task 1: Create coaching engine, prompts, and cache modules** - `3aa2a38` (feat)
2. **Task 2: Create Gemini API route and upgrade ElevenLabs route with caching** - `b14addb` (feat)

## Files Created/Modified
- `src/lib/coaching-engine.ts` - Pure nudge state machine (canTriggerNudge, escalation, recovery detection)
- `src/lib/coaching-prompts.ts` - Gemini prompt templates, 27 pre-cache phrases, generateCoachingText
- `src/lib/coaching-cache.ts` - Server-side Map-based audio cache (get/set/has/size)
- `src/app/api/coaching/generate/route.ts` - POST endpoint for Gemini coaching text with fallback
- `src/app/api/coaching/precache/route.ts` - POST endpoint for batch audio pre-caching
- `src/app/api/elevenlabs/speak/route.ts` - Upgraded to Flash v2.5 with cache integration

## Decisions Made
- [03-01]: Immutable state machine: all coaching-engine functions return new NudgeState objects
- [03-01]: 27 pre-cache phrases (9 per tier) for COACH-05 corpus
- [03-01]: Precache route calls ElevenLabs API directly to avoid Next.js self-request issues
- [03-01]: Buffer-to-Uint8Array conversion for NextResponse body compatibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Buffer type incompatible with NextResponse body**
- **Found during:** Task 2 (ElevenLabs route upgrade)
- **Issue:** TypeScript error TS2345 -- `Buffer` is not assignable to `BodyInit` for NextResponse constructor
- **Fix:** Wrapped cached Buffer in `new Uint8Array(cached)` before passing to NextResponse
- **Files modified:** src/app/api/elevenlabs/speak/route.ts
- **Verification:** `npx tsc --noEmit` passes, `npm run build` succeeds
- **Committed in:** b14addb (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Type compatibility fix required for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed Buffer type issue.

## User Setup Required

External services require manual configuration:
- **GEMINI_API_KEY**: Add to `.env.local`. Get from Google AI Studio (https://aistudio.google.com/apikey) -> Create API key -> Copy
- **ELEVENLABS_API_KEY**: Already configured in `.env.local`

## Next Phase Readiness
- Three lib modules ready for Plan 02 to wire into client-side hooks
- coaching-engine.ts is pure/testable, ready for useAICoaching integration
- API routes are live and buildable, ready for client fetch calls
- Pre-cache route ready to be called on session start

---
*Phase: 03-ai-coaching-nudges*
*Completed: 2026-02-08*
