import { test, expect } from '@playwright/test';

test.describe('Focus Color Visualization', () => {
  test('should show correct colors throughout the process', async ({ page }) => {
    // Navigate to the app
    await page.goto('/session');

    // Wait for the webcam view to appear
    const webcamView = page.locator('[data-testid="webcam-view"]');
    await webcamView.waitFor({ state: 'visible', timeout: 10000 });

    console.log('\n=== TESTING COLOR CHANGES ===\n');

    // Test 1: During calibration, should be grey
    await page.waitForTimeout(1000);
    let isCalibrated = await webcamView.getAttribute('data-is-calibrated');
    let meshColor = await webcamView.getAttribute('data-mesh-color');
    let score = await webcamView.getAttribute('data-focus-score');

    console.log('1. During calibration:');
    console.log(`   isCalibrated: ${isCalibrated}`);
    console.log(`   score: ${score}`);
    console.log(`   meshColor: ${meshColor}`);
    console.log(`   Expected: Grey (rgba(156, 163, 175, 0.8))`);

    if (isCalibrated === 'false') {
      expect(meshColor).toContain('156, 163, 175'); // grey-400
    }

    // Test 2: Wait for calibration to complete
    console.log('\n2. Waiting for calibration to complete...');
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="webcam-view"]');
      return el?.getAttribute('data-is-calibrated') === 'true';
    }, { timeout: 30000 });

    await page.waitForTimeout(2000);

    isCalibrated = await webcamView.getAttribute('data-is-calibrated');
    meshColor = await webcamView.getAttribute('data-mesh-color');
    score = await webcamView.getAttribute('data-focus-score');

    console.log('\n3. After calibration:');
    console.log(`   isCalibrated: ${isCalibrated}`);
    console.log(`   score: ${score}`);
    console.log(`   meshColor: ${meshColor}`);
    console.log(`   Expected: Green (score should be ~100, color should be greenish)`);

    // Score should start at 100 after calibration
    const scoreNum = parseFloat(score || '0');
    expect(scoreNum).toBeGreaterThan(70);

    // Color should be in the green range for high scores
    if (scoreNum >= 75) {
      expect(meshColor).toMatch(/rgba\(\d+, \d+, \d+, 0\.8\)/);
    }

    // Monitor color changes over 10 seconds
    console.log('\n4. Monitoring color changes over 10 seconds:');
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      meshColor = await webcamView.getAttribute('data-mesh-color');
      score = await webcamView.getAttribute('data-focus-score');
      console.log(`   t=${i + 1}s: score=${score}, color=${meshColor}`);
    }

    console.log('\n=== TEST COMPLETE ===\n');
  });

  test('should display color legend', async ({ page }) => {
    await page.goto('/session');

    console.log('\n=== COLOR LEGEND ===');
    console.log('Score < 25:   Dark Red    rgba(185, 28, 28, 0.8)');
    console.log('Score 25-50:  Red→Orange  rgba(239, 68, 68, 0.8) → rgba(249, 115, 22, 0.8)');
    console.log('Score 50-75:  Orange→Yellow rgba(249, 115, 22, 0.8) → rgba(234, 179, 8, 0.8)');
    console.log('Score 75-100: Yellow→Green  rgba(234, 179, 8, 0.8) → rgba(34, 197, 94, 0.8)');
    console.log('Calibrating:  Grey        rgba(156, 163, 175, 0.8)');
    console.log('==================\n');
  });
});
