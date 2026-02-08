import { test, expect } from '@playwright/test';

test.describe('Face Mesh Color Alignment Diagnosis', () => {
  test('check alignment scores and colors', async ({ page, context }) => {
    test.setTimeout(60000); // 60 second timeout
    // Grant camera permissions
    await context.grantPermissions(['camera']);

    // Array to capture console logs
    const logs: { type: string; text: string }[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[Alignment]') || text.includes('[MeshColor]')) {
        logs.push({ type: msg.type(), text });
        console.log(`📊 ${text}`);
      }
    });

    // Navigate to session page
    console.log('🚀 Opening /session...');
    await page.goto('http://localhost:3000/session');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Start a session if there's a button
    const startButton = page.locator('button:has-text("Start")');
    if (await startButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('▶️  Clicking Start Session...');
      await startButton.click();
    }

    // Wait for calibration to start
    console.log('⏳ Waiting for calibration...');
    await page.waitForTimeout(2000);

    // Check for calibration progress
    const calibrationText = page.locator('text=/calibrating|progress/i');
    if (await calibrationText.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('🔵 Calibration in progress...');
      await page.waitForTimeout(12000); // Wait for calibration to complete
    }

    console.log('✅ Calibration should be complete, collecting data for 8 seconds...');

    // Collect logs for 8 seconds
    await page.waitForTimeout(8000);

    // Analyze the logs
    console.log('\n📈 ANALYSIS:');
    console.log('=' .repeat(60));

    const alignmentLogs = logs.filter(l => l.text.includes('[Alignment]'));
    const colorLogs = logs.filter(l => l.text.includes('[MeshColor]'));

    if (alignmentLogs.length === 0) {
      console.log('❌ No alignment logs captured!');
      console.log('   This means either:');
      console.log('   - Calibration did not complete');
      console.log('   - Face detection is not working');
      console.log('   - Logging was removed');
    } else {
      console.log(`✅ Captured ${alignmentLogs.length} alignment readings`);

      // Extract scores from logs
      const scores = alignmentLogs.map(log => {
        const match = log.text.match(/score=(\d+)/);
        return match ? parseInt(match[1]) : null;
      }).filter(s => s !== null) as number[];

      if (scores.length > 0) {
        const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);

        console.log(`\n🎯 Alignment Scores:`);
        console.log(`   Average: ${avgScore}`);
        console.log(`   Range: ${minScore} - ${maxScore}`);

        console.log(`\n🎨 Expected Color:`);
        if (avgScore >= 75) {
          console.log(`   ✅ GREEN (score >= 75) - CORRECT!`);
        } else if (avgScore >= 60) {
          console.log(`   🟡 YELLOW (score 60-75)`);
        } else if (avgScore >= 40) {
          console.log(`   🟠 ORANGE (score 40-60)`);
        } else {
          console.log(`   🔴 RED (score < 40)`);
        }
      }
    }

    if (colorLogs.length > 0) {
      console.log(`\n🎨 Captured ${colorLogs.length} color readings`);

      // Show a sample of RGB values
      const rgbSamples = colorLogs.slice(0, 5).map(log => {
        const match = log.text.match(/targetRGB=\[([^\]]+)\]/);
        return match ? match[1] : null;
      }).filter(r => r !== null);

      if (rgbSamples.length > 0) {
        console.log(`   Sample RGB values: ${rgbSamples.join(', ')}`);
        console.log(`   (Green is ~[34,197,94], Yellow is ~[234,179,8], threshold now 75+)`);
      }
    }

    console.log('\n' + '='.repeat(60));

    // Show sample logs
    console.log('\n📋 Sample Logs (first 5):');
    logs.slice(0, 5).forEach(log => {
      console.log(`   ${log.text}`);
    });
  });
});
