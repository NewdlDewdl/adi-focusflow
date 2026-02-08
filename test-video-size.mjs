import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ permissions: ['camera'] });
  await context.grantPermissions(['camera']);
  const page = await context.newPage();

  await page.goto('http://localhost:3004/session');

  console.log('Waiting for calibration to complete...\n');
  await page.waitForTimeout(15000);

  console.log('Checking video size after calibration:\n');

  const videoRect = await page.locator('video').boundingBox();
  console.log('Video dimensions:', videoRect);
  console.log(`Width: ${videoRect.width}px`);
  console.log(`Height: ${videoRect.height}px`);
  console.log(`Aspect ratio: ${(videoRect.width / videoRect.height).toFixed(2)}`);

  if (videoRect.height < 300) {
    console.log('\n❌ ERROR: Video is too small! Height should be >= 360px');
  } else {
    console.log('\n✅ Video size looks good!');
  }

  await page.screenshot({ path: 'video-size-check.png', fullPage: true });
  console.log('\nScreenshot saved: video-size-check.png');

  await page.waitForTimeout(3000);
  await browser.close();
})();
