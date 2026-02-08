---
phase: 01-webcam-detection-pipeline
plan: 01
subsystem: detection
tags: [next.js, human.js, webcam, permissions, tailwind, typescript]

# Dependency graph
requires:
  - phase: none
    provides: none (first plan)
provides:
  - Next.js 15 project scaffold with Tailwind CSS 4
  - "@vladmandic/human v3.3.6 installed and configured for focus tracking"
  - TypeScript types for face detection results (FaceDetectionData, DetectionResult, PerformanceMetrics, PermissionState)
  - Webcam permission state machine hook (useWebcamPermission)
  - Pre-permission UI with privacy messaging (PermissionGate)
  - Privacy indicator component (PrivacyIndicator)
  - Client-side dynamic import pattern (ClientDetectionLoader)
affects: [01-02-PLAN, 01-03-PLAN, 02-01-PLAN]

# Tech tracking
tech-stack:
  added: ["next.js 15.5.12", "react 19.1.0", "@vladmandic/human 3.3.6", "tailwindcss 4", "typescript 5"]
  patterns: ["client-only dynamic import via ClientDetectionLoader wrapper", "permission state machine hook", "props-down pattern for PermissionGate"]

key-files:
  created:
    - src/lib/human-config.ts
    - src/lib/detection-types.ts
    - src/hooks/useWebcamPermission.ts
    - src/components/detection/PermissionGate.tsx
    - src/components/detection/PrivacyIndicator.tsx
    - src/components/detection/DetectionProvider.tsx
    - src/components/detection/ClientDetectionLoader.tsx
    - src/app/page.tsx
    - src/app/layout.tsx
  modified: []

key-decisions:
  - "Used ClientDetectionLoader wrapper for next/dynamic ssr:false (Next.js 15 requires ssr:false inside use client components)"
  - "PermissionGate receives state as props instead of owning its own hook (prevents dual state machines)"
  - "HumanGL backend configured per research (3.6x faster warmup than webgl)"

patterns-established:
  - "Client-only components loaded via ClientDetectionLoader > DetectionProvider chain with ssr: false"
  - "Permission state machine: idle > checking > prompt > granted|denied|error"
  - "Single hook owner (DetectionProvider) passes state down to presentational components"

# Metrics
duration: 6min
completed: 2026-02-07
---

# Phase 1 Plan 1: Project Scaffold & Webcam Permission Summary

**Next.js 15 scaffold with Human.js v3.3.6, webcam permission state machine handling all getUserMedia error types, and pre-permission privacy UI**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-08T01:29:29Z
- **Completed:** 2026-02-08T01:35:33Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- Next.js 15.5.12 project with TypeScript, Tailwind CSS 4, App Router running on localhost:3000
- Human.js v3.3.6 installed and configured for focus tracking (HumanGL backend, face+mesh+iris only, all unnecessary modules disabled)
- TypeScript types defined for FaceDetectionData, DetectionResult, PerformanceMetrics, and PermissionState
- Webcam permission hook with full state machine and specific error messages for all getUserMedia error types
- Pre-permission screen with privacy explanation ("video never leaves your device")
- Privacy indicator with pulsing green dot when camera is active
- Camera stream cleanup on unmount (stops green LED)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 15 project with Human.js and configure detection** - `c25ada0` (feat)
2. **Task 2: Build webcam permission state machine with pre-permission UI and privacy indicator** - `3ae19ac` (feat)

## Files Created/Modified
- `package.json` - Next.js 15.5.12 + @vladmandic/human v3.3.6
- `next.config.ts` - serverExternalPackages for Human.js
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS 4 configuration
- `postcss.config.mjs` - PostCSS with Tailwind
- `src/app/layout.tsx` - Root layout with FocusFlow metadata
- `src/app/page.tsx` - Server component importing ClientDetectionLoader
- `src/app/globals.css` - Tailwind base styles
- `src/lib/human-config.ts` - Human.js configuration optimized for focus tracking
- `src/lib/detection-types.ts` - TypeScript interfaces for detection results
- `src/hooks/useWebcamPermission.ts` - Permission state machine hook
- `src/components/detection/ClientDetectionLoader.tsx` - Client wrapper for dynamic import with ssr: false
- `src/components/detection/DetectionProvider.tsx` - Main detection component, owns permission hook
- `src/components/detection/PermissionGate.tsx` - Pre-permission screen and error UI
- `src/components/detection/PrivacyIndicator.tsx` - Camera active badge

## Decisions Made
- Used a ClientDetectionLoader wrapper component for `next/dynamic` with `ssr: false` because Next.js 15 does not allow `ssr: false` in Server Components directly. This adds one extra file but follows the correct Next.js 15 pattern.
- PermissionGate receives state as props from DetectionProvider rather than calling useWebcamPermission internally, preventing duplicate state machines and ensuring the video ref stays consistent.
- Configured HumanGL backend per research recommendation (3.6x faster warmup than WebGL).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed next/dynamic ssr:false in Server Component**
- **Found during:** Task 1 (Scaffold and page.tsx creation)
- **Issue:** Next.js 15 throws "ssr: false is not allowed with next/dynamic in Server Components" when used directly in page.tsx (a Server Component)
- **Fix:** Created ClientDetectionLoader.tsx as a "use client" wrapper that uses next/dynamic with ssr: false, then imported it as a regular component in page.tsx
- **Files modified:** src/app/page.tsx, src/components/detection/ClientDetectionLoader.tsx (new)
- **Verification:** Dev server returns 200, no compilation errors
- **Committed in:** c25ada0 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed dual permission hook instances**
- **Found during:** Task 2 (PermissionGate + DetectionProvider integration)
- **Issue:** Both DetectionProvider and PermissionGate were calling useWebcamPermission independently, creating two separate state machines with disconnected video refs
- **Fix:** Refactored PermissionGate to accept state/error/requestPermission as props from DetectionProvider (single hook owner)
- **Files modified:** src/components/detection/PermissionGate.tsx, src/components/detection/DetectionProvider.tsx
- **Verification:** TypeScript compiles, single hook instance confirmed
- **Committed in:** 3ae19ac (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes essential for correctness. No scope creep. Added one extra file (ClientDetectionLoader.tsx).

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Project scaffold complete with all detection types and Human.js config ready for Plan 02 (detection loop)
- Permission flow handles all states; Plan 02 can build directly on the granted state
- PrivacyIndicator ready to show alongside detection overlay
- Potential concern: Turbopack workspace root warning from lockfile detection; harmless but may want to add `turbopack.root` to next.config.ts if it causes issues

## Self-Check: PASSED

All files found. All commits verified. All exports confirmed. All key links present.

---
*Phase: 01-webcam-detection-pipeline*
*Completed: 2026-02-07*
