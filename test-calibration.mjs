import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    permissions: ['camera']
  });
  await context.grantPermissions(['camera']);
  const page = await context.newPage();

  // Navigate to the app
  await page.goto('http://localhost:3004/session');

  console.log('Page loaded, waiting for webcam permission...');

  // Wait for the page to load
  await page.waitForTimeout(2000);

  // Click allow camera if permission dialog appears
  try {
    const allowButton = await page.getByRole('button', { name: /allow|enable/i });
    if (await allowButton.isVisible({ timeout: 2000 })) {
      await allowButton.click();
      console.log('Clicked camera permission button');
    }
  } catch (e) {
    console.log('No permission button found, continuing...');
  }

  console.log('\nMonitoring calibration progress for 15 seconds...\n');

  // Monitor progress for 15 seconds
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(500);

    // Check if progress bar exists
    const progressBar = await page.locator('div.h-2.overflow-hidden.rounded-full');
    const exists = await progressBar.count() > 0;

    if (exists) {
      // Get the inner progress div
      const progressFill = await page.locator('div.h-2.overflow-hidden.rounded-full > div').first();
      const width = await progressFill.evaluate(el => el.style.width);

      // Get progress text
      const progressText = await page.locator('text=/Calibrating.../').textContent().catch(() => 'Not found');

      console.log(`[${i * 0.5}s] Progress bar width: ${width}, Text: ${progressText}`);
    } else {
      console.log(`[${i * 0.5}s] Progress bar not found - checking if calibration completed...`);

      // Check if we're in analytics view (calibration done)
      const analyticsVisible = await page.locator('text="Score Trend"').count() > 0;
      if (analyticsVisible) {
        console.log('✓ Calibration complete - analytics view is now showing!');
        break;
      }
    }

    // Take a screenshot every 5 seconds
    if (i % 10 === 0) {
      await page.screenshot({ path: `calibration-debug-${i}s.png` });
      console.log(`Screenshot saved: calibration-debug-${i}s.png`);
    }
  }

  console.log('\nTest complete!');

  // Keep browser open for inspection
  await page.waitForTimeout(5000);

  await browser.close();
})();
