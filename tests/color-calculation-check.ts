/**
 * Unit test for color calculation logic
 * Run with: node --loader ts-node/esm tests/color-calculation.test.ts
 */

// Inline color calculation functions (copied from WebcamView.tsx)
function interpolateColor(
  rgb1: [number, number, number],
  rgb2: [number, number, number],
  t: number,
  alpha: number
): string {
  const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * t);
  const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * t);
  const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * t);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getFocusColors(score: number, isCalibrated: boolean): { primary: string; secondary: string } {
  // During calibration, use grey
  if (!isCalibrated) {
    return {
      primary: 'rgba(156, 163, 175, 0.8)', // gray-400
      secondary: 'rgba(209, 213, 219, 0.9)', // gray-300
    };
  }

  // Below 25: Dark red
  if (score < 25) {
    return {
      primary: 'rgba(185, 28, 28, 0.8)', // red-700
      secondary: 'rgba(220, 38, 38, 0.9)', // red-600
    };
  }

  // 25-50: Red to orange gradient
  if (score < 50) {
    const t = (score - 25) / 25; // 0 to 1
    return {
      primary: interpolateColor(
        [239, 68, 68],   // red-500
        [249, 115, 22],  // orange-500
        t,
        0.8
      ),
      secondary: interpolateColor(
        [252, 165, 165], // red-300
        [253, 186, 116], // orange-300
        t,
        0.9
      ),
    };
  }

  // 50-75: Orange to yellow gradient
  if (score < 75) {
    const t = (score - 50) / 25; // 0 to 1
    return {
      primary: interpolateColor(
        [249, 115, 22],  // orange-500
        [234, 179, 8],   // yellow-500
        t,
        0.8
      ),
      secondary: interpolateColor(
        [253, 186, 116], // orange-300
        [253, 224, 71],  // yellow-300
        t,
        0.9
      ),
    };
  }

  // 75-100: Yellow to green gradient
  const t = (score - 75) / 25; // 0 to 1
  return {
    primary: interpolateColor(
      [234, 179, 8],   // yellow-500
      [34, 197, 94],   // green-500
      t,
      0.8
    ),
    secondary: interpolateColor(
      [253, 224, 71],  // yellow-300
      [134, 239, 172], // green-300
      t,
      0.9
    ),
  };
}

// Test cases
console.log('\n=== COLOR CALCULATION TESTS ===\n');

const testCases = [
  { score: 0, isCalibrated: false, expected: 'Grey (calibrating)' },
  { score: 50, isCalibrated: false, expected: 'Grey (calibrating)' },
  { score: 100, isCalibrated: false, expected: 'Grey (calibrating)' },
  { score: 0, isCalibrated: true, expected: 'Dark Red' },
  { score: 10, isCalibrated: true, expected: 'Dark Red' },
  { score: 24, isCalibrated: true, expected: 'Dark Red' },
  { score: 25, isCalibrated: true, expected: 'Red (start of gradient)' },
  { score: 37.5, isCalibrated: true, expected: 'Red-Orange (mid gradient)' },
  { score: 49, isCalibrated: true, expected: 'Orange (end of gradient)' },
  { score: 50, isCalibrated: true, expected: 'Orange (start of gradient)' },
  { score: 62.5, isCalibrated: true, expected: 'Orange-Yellow (mid gradient)' },
  { score: 74, isCalibrated: true, expected: 'Yellow (end of gradient)' },
  { score: 75, isCalibrated: true, expected: 'Yellow (start of gradient)' },
  { score: 87.5, isCalibrated: true, expected: 'Yellow-Green (mid gradient)' },
  { score: 100, isCalibrated: true, expected: 'Green (end of gradient)' },
];

testCases.forEach(({ score, isCalibrated, expected }) => {
  const colors = getFocusColors(score, isCalibrated);
  console.log(`Score: ${score.toString().padStart(5)}, Calibrated: ${isCalibrated}, Expected: ${expected.padEnd(35)}`);
  console.log(`  Primary:   ${colors.primary}`);
  console.log(`  Secondary: ${colors.secondary}`);
  console.log('');
});

console.log('=== TEST COMPLETE ===\n');
