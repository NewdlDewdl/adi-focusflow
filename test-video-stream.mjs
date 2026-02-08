import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ permissions: ['camera'] });
  await context.grantPermissions(['camera']);
  const page = await context.newPage();

  await page.goto('http://localhost:3004/session');

  console.log('Waiting for calibration to complete...\n');
  await page.waitForTimeout(15000);

  console.log('Checking video stream state:\n');

  // Check video element properties
  const videoState = await page.locator('video').evaluate(video => ({
    paused: video.paused,
    readyState: video.readyState,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    hasStream: !!video.srcObject,
    streamActive: video.srcObject ? video.srcObject.active : false,
    currentTime: video.currentTime,
    computedDisplay: window.getComputedStyle(video).display,
    computedVisibility: window.getComputedStyle(video).visibility,
    computedOpacity: window.getComputedStyle(video).opacity,
    classList: Array.from(video.classList)
  }));

  console.log('Video element state:', JSON.stringify(videoState, null, 2));

  // Check canvas overlay
  const canvasExists = await page.locator('canvas').count();
  console.log('\nCanvas overlay exists:', canvasExists > 0);

  if (canvasExists > 0) {
    const canvasRect = await page.locator('canvas').boundingBox();
    console.log('Canvas dimensions:', canvasRect);
  }

  // Take screenshot
  await page.screenshot({ path: 'video-stream-check.png', fullPage: true });
  console.log('\nScreenshot saved: video-stream-check.png');

  if (!videoState.hasStream) {
    console.log('\n❌ ERROR: Video has no stream attached!');
  } else if (!videoState.streamActive) {
    console.log('\n❌ ERROR: Video stream is not active!');
  } else if (videoState.paused) {
    console.log('\n❌ ERROR: Video is paused!');
  } else if (videoState.computedVisibility === 'hidden') {
    console.log('\n❌ ERROR: Video visibility is hidden!');
  } else {
    console.log('\n✅ Video stream appears to be working');
  }

  await page.waitForTimeout(5000);
  await browser.close();
})();
