# Phase 6: Polish & Visual Enhancements - Research

**Researched:** 2026-02-08
**Domain:** Canvas rendering, color interpolation, Human.js draw API, UI state management
**Confidence:** HIGH

## Summary

Phase 6 is a polish phase with three tightly scoped requirements: (1) dynamic face mesh color based on focus score, (2) hiding stacked text metrics after calibration, and (3) smooth color transitions. The critical finding is that **most of VISUAL-01 is already implemented** in `WebcamView.tsx`. The file already contains a `getFocusColors()` function with the exact color ranges specified (red < 25, orange 25-50, yellow 50-75, green 75-100), an `interpolateColor()` helper, and integration with `human.draw.options` to update mesh colors on each frame. The remaining work is primarily about smoothing transitions and cleaning up the metrics overlay.

The `drawMetricsOverlay()` function in `WebcamView.tsx` currently renders Yaw/Pitch/Roll, Gaze bearing/strength, Face confidence, and FPS as stacked text on the canvas. This is drawn on **every frame regardless of calibration state**. Additionally, Human.js's `draw.all()` renders its own face labels by default (since `drawLabels` is not explicitly set to `false`). Both of these constitute the "stacked text metrics" that VISUAL-02 requires hiding after calibration.

**Primary recommendation:** This phase requires minimal new code. The main tasks are: (1) add color lerping/smoothing between frames to prevent abrupt color jumps, (2) conditionally skip `drawMetricsOverlay()` and set `drawLabels: false` after calibration completes, and (3) remove excessive console.log statements that were added during development.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @vladmandic/human | ^3.3.6 | Face detection + draw API | Already installed; `human.draw.all()` renders face mesh with configurable colors via `human.draw.options` |
| React | 19.1.0 | Component rendering | Already installed; useEffect drives the draw loop |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| framer-motion | ^12.33.0 | Animation (optional) | Already installed; NOT needed for canvas color transitions -- canvas colors must be managed imperatively |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual RGB lerp | CSS transitions on a DOM overlay | Canvas-drawn mesh cannot use CSS transitions; RGB lerp is the only viable approach for `human.draw.options.color` |
| requestAnimationFrame color lerp | Instant color change per detection frame | Current 5 FPS detection rate already provides ~200ms intervals; lerping within detection frames is sufficient without a separate rAF loop |

**Installation:**
```bash
# No new dependencies required -- all libraries already installed
```

## Architecture Patterns

### Existing File Structure (What Changes)
```
src/
├── components/
│   └── detection/
│       └── WebcamView.tsx      # PRIMARY: getFocusColors(), drawMetricsOverlay(), draw options
├── hooks/
│   └── useFocusScore.ts        # Provides: isCalibrated, score (already wired)
└── lib/
    └── detection-types.ts      # Types (no changes expected)
```

### Pattern 1: Color Lerping Between Frames via Ref
**What:** Store the "current displayed color" in a React ref and lerp toward the "target color" (from `getFocusColors()`) on each draw frame, rather than snapping instantly.
**When to use:** Every draw cycle in the `useEffect` that calls `drawOverlay`.
**Why:** The focus score changes every 3 seconds (via the timer-based scoring pipeline in `useFocusScore`), but the mesh redraws at 5 FPS. Without lerping, the color would jump abruptly when the score changes. With lerping, the color smoothly transitions over several frames.
**Example:**
```typescript
// Store current interpolated RGB in a ref (persists between renders)
const currentColorRef = useRef<[number, number, number]>([156, 163, 175]); // gray initially

// In the draw effect, lerp toward target color each frame
const targetRGB = getTargetRGB(focusScore, isCalibrated);
const lerpFactor = 0.15; // ~3-4 frames to converge at 5 FPS
currentColorRef.current = [
  currentColorRef.current[0] + (targetRGB[0] - currentColorRef.current[0]) * lerpFactor,
  currentColorRef.current[1] + (targetRGB[1] - currentColorRef.current[1]) * lerpFactor,
  currentColorRef.current[2] + (targetRGB[2] - currentColorRef.current[2]) * lerpFactor,
];
const color = `rgba(${Math.round(currentColorRef.current[0])}, ${Math.round(currentColorRef.current[1])}, ${Math.round(currentColorRef.current[2])}, 0.8)`;
```

### Pattern 2: Conditional Metrics Rendering Based on Calibration State
**What:** Pass `isCalibrated` into the draw logic and conditionally skip `drawMetricsOverlay()` and set `drawLabels: false` in `human.draw.options` once calibration is complete.
**When to use:** In the draw `useEffect`, before calling `drawMetricsOverlay()`.
**Example:**
```typescript
// In draw options setup:
const newOptions = {
  color: colors.primary,
  labelColor: colors.secondary,
  drawLabels: !isCalibrated, // Hide Human.js labels after calibration
  drawPoints: true,
  drawPolygons: true,
  // ... rest of options
};

// After ctx.restore():
if (!isCalibrated) {
  drawMetricsOverlay(ctx, result, fps);
}
```

### Anti-Patterns to Avoid
- **Separate rAF loop for color animation:** The detection loop at 5 FPS already drives redraws. Adding a separate requestAnimationFrame loop for color would double the canvas draws and potentially cause visual tearing. Instead, lerp colors within the existing draw cycle.
- **CSS-based color overlays on top of canvas:** Layering DOM elements over the canvas to simulate color changes would not affect the actual mesh lines drawn by `human.draw.all()`. The color must be set via `human.draw.options.color`.
- **Recreating Human instance for color changes:** `Object.assign(human.draw.options, newOptions)` is the correct mutation pattern (already in use). Do not create new Human instances.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Face mesh rendering | Custom WebGL mesh renderer | `human.draw.all()` with `human.draw.options` | Already renders 468-point face mesh with points, polygons, curves; just configure colors |
| Color space interpolation | HSL/HSV color space conversion | Simple RGB linear interpolation | RGB lerp is sufficient for the red-orange-yellow-green gradient; perceptual uniformity is not critical for a 4-stop gradient |
| Animation framework for canvas | framer-motion for canvas | Manual lerp in useEffect | framer-motion animates DOM/SVG, not canvas 2d context colors |

**Key insight:** The existing codebase already does 90% of the work. `getFocusColors()` maps scores to colors, `interpolateColor()` blends between color stops, and `Object.assign(human.draw.options, ...)` applies them. The gap is only smoothing transitions between frames and conditional rendering.

## Common Pitfalls

### Pitfall 1: Abrupt Color Jumps on Score Change
**What goes wrong:** Score changes every 3 seconds (timer-based pipeline), causing the mesh color to snap instantly from one color to another.
**Why it happens:** `getFocusColors()` returns the exact target color for the current score, with no transition between the previous color and the new one.
**How to avoid:** Store the current displayed RGB in a `useRef` and lerp toward the target RGB on each draw frame. With a lerp factor of 0.15 at 5 FPS, the color converges in ~3-4 frames (~600-800ms), producing a smooth visual transition.
**Warning signs:** Mesh color flickers or jumps when score crosses threshold boundaries (e.g., 49 to 51 crossing from orange to yellow).

### Pitfall 2: Stale Color Ref on Component Remount
**What goes wrong:** When DetectionProvider unmounts/remounts (session end/restart), the color ref retains the previous session's last color.
**Why it happens:** React refs persist across renders but are reset on unmount. If the component remounts, the ref initializes to its default value (gray), which is correct. But if the component does NOT unmount (e.g., pause/resume), the ref correctly preserves the current color.
**How to avoid:** Initialize the color ref to the calibration-gray value. The lerp will naturally transition to the correct color as scores flow in.
**Warning signs:** Flash of wrong color at session start.

### Pitfall 3: Human.js draw.options Mutation Timing
**What goes wrong:** Setting `human.draw.options` after calling `human.draw.all()` means the current frame renders with old colors.
**Why it happens:** `Object.assign(human.draw.options, newOptions)` must happen BEFORE `human.draw.all()`.
**How to avoid:** The existing code already sets options before calling draw.all(). Maintain this order when modifying.
**Warning signs:** Colors appear to lag by one frame.

### Pitfall 4: Console.log Spam in Production
**What goes wrong:** The current WebcamView.tsx has extensive `console.log` statements that fire on every draw frame (~5 per second), degrading performance.
**Why it happens:** Debug logging added during development was never removed.
**How to avoid:** Remove or gate behind a debug flag all console.log statements in WebcamView.tsx as part of this polish phase.
**Warning signs:** Browser console floods with thousands of log entries during a session.

### Pitfall 5: Human.js Default Labels Still Showing
**What goes wrong:** Even after removing the custom `drawMetricsOverlay()`, Human.js's own face labels (score%, age, gender, etc.) still appear because `drawLabels` defaults to `true`.
**Why it happens:** The current draw options do not explicitly set `drawLabels`.
**How to avoid:** Explicitly set `drawLabels: false` in the draw options after calibration. During calibration, `drawLabels: true` can remain for debugging visibility.
**Warning signs:** Text overlaid on the face mesh after calibration that is not from `drawMetricsOverlay()`.

## Code Examples

Verified patterns from the existing codebase and Human.js documentation:

### Current Color Mapping (Already Implemented)
```typescript
// Source: src/components/detection/WebcamView.tsx lines 18-89
function getFocusColors(score: number, isCalibrated: boolean): { primary: string; secondary: string } {
  if (!isCalibrated) {
    return { primary: 'rgba(156, 163, 175, 0.8)', secondary: 'rgba(209, 213, 219, 0.9)' };
  }
  if (score < 25) { /* red-700 / red-600 */ }
  if (score < 50) { /* interpolate red-500 to orange-500 */ }
  if (score < 75) { /* interpolate orange-500 to yellow-500 */ }
  /* interpolate yellow-500 to green-500 */
}
```

### Current Draw Options Application (Already Implemented)
```typescript
// Source: src/components/detection/WebcamView.tsx lines 232-246
if (human.draw) {
  const newOptions = {
    color: colors.primary,
    labelColor: colors.secondary,
    lineWidth: 2,
    drawPoints: true,
    drawPolygons: true,
    drawBoxes: false,
    fillPolygons: false,
    useCurves: true,
    font: 'small-caps 13px "Segoe UI"',
  };
  Object.assign(human.draw.options, newOptions);
}
```

### Human.js DrawOptions Interface (Complete)
```typescript
// Source: https://vladmandic.github.io/human/typedoc/interfaces/DrawOptions.html
interface DrawOptions {
  alpha: number;           // alpha value for lines
  color: string;           // line color
  labelColor: string;      // label text color
  shadowColor: string;     // label shadow color
  font: string;            // label font
  lineHeight: number;      // spacing between labels
  lineWidth: number;       // line width
  pointSize: number;       // size of drawn points
  roundRect: number;       // rounded box corners
  drawPoints: boolean;     // draw mesh points
  drawLabels: boolean;     // draw text labels (DEFAULT: true)
  drawAttention: boolean;  // highlight attention keypoints
  drawGestures: boolean;   // draw gestures
  drawBoxes: boolean;      // draw bounding boxes
  drawPolygons: boolean;   // draw mesh polygons
  drawGaze: boolean;       // draw gaze arrows
  fillPolygons: boolean;   // fill polygons with color
  useDepth: boolean;       // use z-coordinate
  useCurves: boolean;      // curved lines
  faceLabels: string;      // template: "[score]% [gender] age:[age]..."
  bodyLabels: string;
  handLabels: string;
  objectLabels: string;
  gestureLabels: string;
}
```

### Smooth Color Lerp Pattern
```typescript
// Standard RGB linear interpolation for canvas colors
const lerpChannel = (a: number, b: number, t: number) => a + (b - a) * t;

function lerpRGB(
  current: [number, number, number],
  target: [number, number, number],
  t: number
): [number, number, number] {
  return [
    lerpChannel(current[0], target[0], t),
    lerpChannel(current[1], target[1], t),
    lerpChannel(current[2], target[2], t),
  ];
}

// Usage in draw loop:
const LERP_FACTOR = 0.15;
currentRGB = lerpRGB(currentRGB, targetRGB, LERP_FACTOR);
const colorString = `rgba(${Math.round(currentRGB[0])}, ${Math.round(currentRGB[1])}, ${Math.round(currentRGB[2])}, 0.8)`;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Instant color snap per frame | Lerp between previous and target color | Standard practice | Eliminates jarring color jumps at score thresholds |
| Always show debug metrics | Conditionally render based on app state | Standard practice | Cleaner UI for end users |
| Console.log on every frame | Remove or gate behind debug flag | Standard practice | Significant perf improvement |

**Existing implementation status:**
- `getFocusColors()`: DONE -- exact color mapping per spec
- `interpolateColor()`: DONE -- blends within a score band
- `human.draw.options` integration: DONE -- applies colors before draw.all()
- Color indicator badge (top-left): DONE -- shows current color and score/CAL state
- `isCalibrated` prop threading: DONE -- already passed from DetectionProvider to WebcamView
- Cross-frame color smoothing (lerp): NOT DONE -- colors snap on score change
- Conditional metrics hiding: NOT DONE -- `drawMetricsOverlay()` called unconditionally
- `drawLabels: false` after calibration: NOT DONE -- Human.js labels always shown
- Console.log cleanup: NOT DONE -- extensive debug logging on every frame

## Open Questions

1. **Should the color indicator badge (top-left overlay) be removed or kept?**
   - What we know: There is a `<div>` overlay at `left-2 top-2` showing a colored dot + score/CAL text. It was added for debugging.
   - What's unclear: Whether this is considered part of the "stacked text metrics" or a separate debug tool.
   - Recommendation: Keep it as-is for now (it is a React DOM element, not canvas text). It provides useful visual feedback. Can be removed in a later cleanup if desired.

2. **Should `drawGaze` arrows be hidden after calibration?**
   - What we know: Human.js can draw gaze direction arrows via `drawGaze: true/false`. Currently not explicitly set (defaults to `true`).
   - What's unclear: Whether gaze arrows count as "metrics" to hide, or if they are part of the face mesh visualization that should remain.
   - Recommendation: Keep gaze arrows visible -- they are part of the face mesh visualization, not text metrics. Only hide text-based overlays.

3. **Lerp factor tuning for 5 FPS**
   - What we know: At 5 FPS (200ms between frames), a lerp factor of 0.15 converges ~63% per frame, reaching ~95% in 3 frames (~600ms).
   - What's unclear: Whether 600ms transition feels smooth or too slow.
   - Recommendation: Start with 0.15, test visually, adjust. Range of 0.1 (slower, ~1s) to 0.25 (faster, ~400ms) is reasonable.

## Sources

### Primary (HIGH confidence)
- Codebase: `src/components/detection/WebcamView.tsx` -- existing `getFocusColors()`, `interpolateColor()`, `drawMetricsOverlay()`, draw options integration
- Codebase: `src/hooks/useFocusScore.ts` -- `isCalibrated`, `calibrationProgress` already exposed
- Codebase: `src/components/detection/DetectionProvider.tsx` -- `isCalibrated` already threaded through to WebcamView
- [Human.js DrawOptions TypeDoc](https://vladmandic.github.io/human/typedoc/interfaces/DrawOptions.html) -- complete DrawOptions interface with all properties
- [Human.js Draw Wiki](https://github.com/vladmandic/human/wiki/Draw) -- draw method documentation

### Secondary (MEDIUM confidence)
- [Human.js GitHub](https://github.com/vladmandic/human) -- general library documentation
- [Human.js Usage Wiki](https://github.com/vladmandic/human/wiki/Usage) -- usage patterns

### Tertiary (LOW confidence)
- None -- all findings verified against codebase and official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies; everything already installed and in use
- Architecture: HIGH -- changes are modifications to existing functions in a single file (WebcamView.tsx)
- Pitfalls: HIGH -- identified from direct code inspection of the existing implementation

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable -- no dependency changes expected)
