import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    permissions: ['camera'],
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  console.log('Navigating to localhost:3000...');
  await page.goto('http://localhost:3000');
  await page.screenshot({ path: 'landing-page.png' });
  console.log('Screenshot saved: landing-page.png');

  console.log('\nNavigating to /session...');
  await page.goto('http://localhost:3000/session');
  await page.waitForTimeout(2000); // Wait for page to load
  await page.screenshot({ path: 'session-page.png' });
  console.log('Screenshot saved: session-page.png');

  // Get page content
  const bodyText = await page.locator('body').textContent();
  console.log('\n=== Page content ===');
  console.log(bodyText);

  // Check for errors in console
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('pageerror', err => console.log('Page error:', err.message));

  // Try to find and click start button
  console.log('\n=== Looking for Start button ===');
  const startButton = page.locator('button').filter({ hasText: /start/i }).first();
  const exists = await startButton.count();
  console.log(`Start button found: ${exists > 0}`);

  if (exists > 0) {
    console.log('Clicking Start button...');
    await startButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'after-start.png' });
    console.log('Screenshot saved: after-start.png');
  }

  console.log('\n=== Keeping browser open for manual inspection ===');
  console.log('Press Ctrl+C to close');
  await page.waitForTimeout(60000); // Keep open for 60 seconds

  await browser.close();
})();
