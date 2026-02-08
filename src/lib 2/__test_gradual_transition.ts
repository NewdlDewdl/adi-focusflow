/**
 * Quick verification test for the gradual transition fix
 * Run with: npx tsx src/lib/__test_gradual_transition.ts
 */

import { applyGradualTransition } from './focus-algorithm';

console.log('Testing gradual transition rate limiting...\n');

// Test 1: Verify rate at 250ms intervals (normal update frequency)
console.log('Test 1: Movement at 250ms intervals');
let current = 100;
const target = 50; // Want to drop from 100 to 50
const timeDelta = 250; // 250ms between updates

// Simulate 60 seconds of updates (240 updates at 250ms each)
let updates = 0;
const maxUpdates = (60 * 1000) / timeDelta; // 240 updates in 60 seconds

console.log(`Starting at ${current}, target ${target}`);
console.log(`Simulating ${maxUpdates} updates over 60 seconds...\n`);

while (current > target && updates < maxUpdates) {
  const newCurrent = applyGradualTransition(target, current, timeDelta);
  current = newCurrent;
  updates++;

  // Log every 10 updates
  if (updates % 10 === 0) {
    const timeElapsed = (updates * timeDelta) / 1000;
    const pointsMoved = 100 - current;
    console.log(`After ${timeElapsed.toFixed(1)}s (${updates} updates): score=${current.toFixed(2)}, moved=${pointsMoved.toFixed(2)} points`);
  }
}

const finalPointsMoved = 100 - current;
console.log(`\nFinal: ${current.toFixed(2)} (moved ${finalPointsMoved.toFixed(2)} points in 60 seconds)`);
console.log(`Expected: ~95 (moved ~5 points in 60 seconds)`);
console.log(`✅ Pass: ${Math.abs(finalPointsMoved - 5) < 1 ? 'YES' : 'NO'}\n`);

// Test 2: Verify it works with different time deltas
console.log('Test 2: Movement with variable time deltas');
current = 100;
let totalTime = 0;

console.log(`Starting at ${current}, target ${target}`);
console.log('Simulating variable update intervals...\n');

while (current > target && totalTime < 60000) {
  const delta = 200 + Math.random() * 300; // Random 200-500ms
  current = applyGradualTransition(target, current, delta);
  totalTime += delta;

  if (totalTime > 15000 && totalTime < 16000) {
    console.log(`At 15s: score=${current.toFixed(2)}, moved=${(100 - current).toFixed(2)} points`);
  }
  if (totalTime > 30000 && totalTime < 31000) {
    console.log(`At 30s: score=${current.toFixed(2)}, moved=${(100 - current).toFixed(2)} points`);
  }
  if (totalTime > 45000 && totalTime < 46000) {
    console.log(`At 45s: score=${current.toFixed(2)}, moved=${(100 - current).toFixed(2)} points`);
  }
}

console.log(`At 60s: score=${current.toFixed(2)}, moved=${(100 - current).toFixed(2)} points`);
console.log(`✅ Should be close to 5 points moved\n`);

// Test 3: Verify increasing score also respects rate limit
console.log('Test 3: Increasing score (recovery)');
current = 50;
const recoverTarget = 100;
updates = 0;

console.log(`Starting at ${current}, target ${recoverTarget}`);
while (current < recoverTarget && updates < maxUpdates) {
  current = applyGradualTransition(recoverTarget, current, timeDelta);
  updates++;
}

const recoveryTime = (updates * timeDelta) / 1000;
const pointsRecovered = current - 50;
console.log(`Recovered ${pointsRecovered.toFixed(2)} points in ${recoveryTime.toFixed(1)} seconds`);
console.log(`Rate: ${(pointsRecovered / recoveryTime * 60).toFixed(2)} points/minute`);
console.log(`✅ Should be ~5 points/minute\n`);

console.log('All tests complete!');
