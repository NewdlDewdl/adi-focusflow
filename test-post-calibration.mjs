import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    permissions: ['camera']
  });
  await context.grantPermissions(['camera']);
  const page = await context.newPage();

  // Listen to console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[DetectionProvider]') || text.includes('[Calibration')) {
      console.log('BROWSER:', text);
    }
  });

  // Navigate to the app
  await page.goto('http://localhost:3004/session');

  console.log('Page loaded, waiting for calibration to complete...\n');

  // Wait for calibration to complete (15 seconds to be safe)
  await page.waitForTimeout(15000);

  console.log('Calibration should be complete. Checking layout...\n');

  // Check if webcam is visible
  const webcamVisible = await page.locator('video').isVisible();
  console.log(`Webcam visible: ${webcamVisible}`);

  // Check if analytics are visible
  const scoreRingVisible = await page.locator('text="Score Trend"').isVisible();
  console.log(`Analytics (Score Trend) visible: ${scoreRingVisible}`);

  // Check layout structure
  const videoRect = await page.locator('video').boundingBox();
  console.log(`Video bounding box:`, videoRect);

  // Take screenshot
  await page.screenshot({ path: 'post-calibration.png', fullPage: true });
  console.log('\nScreenshot saved: post-calibration.png');

  // Check if it's in 2-column layout
  const layoutContainer = await page.locator('.lg\\:flex-row').count();
  console.log(`Two-column layout containers found: ${layoutContainer}`);

  console.log('\nTest complete! Browser will close in 5 seconds...');
  await page.waitForTimeout(5000);

  await browser.close();
})();
