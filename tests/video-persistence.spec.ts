import { test, expect } from '@playwright/test';

test.describe('Video Persistence and Calibration', () => {
  test('should show video and calibration on landing page', async ({ page }) => {
    // Navigate to the page
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    console.log('Page loaded');

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/01-initial-load.png', fullPage: true });

    // Check if camera preview container exists
    const cameraContainer = page.locator('.aspect-video').first();
    await expect(cameraContainer).toBeVisible();
    console.log('✓ Camera container visible');

    // Wait a bit for dynamic import to load
    await page.waitForTimeout(2000);

    // Take screenshot after waiting
    await page.screenshot({ path: 'test-results/02-after-wait.png', fullPage: true });

    // Check if video element exists and is visible
    const video = page.locator('video');
    const videoExists = await video.count() > 0;
    console.log(`Video element count: ${await video.count()}`);

    if (videoExists) {
      const isVisible = await video.isVisible();
      console.log(`✓ Video element visible: ${isVisible}`);

      // Check video properties
      const videoProps = await video.evaluate((v: HTMLVideoElement) => ({
        srcObject: v.srcObject !== null,
        readyState: v.readyState,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        paused: v.paused,
        muted: v.muted,
        autoplay: v.autoplay,
      }));
      console.log('Video properties:', videoProps);
    } else {
      console.log('✗ No video element found');
    }

    // Check for calibration indicator
    const calibrationText = page.getByText(/calibrating/i);
    const calibrationExists = await calibrationText.count() > 0;
    console.log(`Calibration indicator: ${calibrationExists ? '✓ Found' : '✗ Not found'}`);

    if (calibrationExists) {
      const calibrationVisible = await calibrationText.isVisible();
      console.log(`Calibration visible: ${calibrationVisible}`);
    }

    // Check for permission prompt
    const permissionPrompt = page.getByText(/camera access needed/i);
    const promptExists = await permissionPrompt.count() > 0;
    console.log(`Permission prompt: ${promptExists ? '✓ Showing' : '✗ Not showing'}`);

    // Check for canvas (face mesh overlay)
    const canvas = page.locator('canvas');
    const canvasExists = await canvas.count() > 0;
    console.log(`Canvas element: ${canvasExists ? '✓ Found' : '✗ Not found'}`);

    // Check for "Begin Session" button (should be visible on landing page)
    const beginButton = page.getByRole('button', { name: /begin session/i });
    await expect(beginButton).toBeVisible();
    console.log('✓ Begin Session button visible');

    // Take final screenshot
    await page.screenshot({ path: 'test-results/03-final-state.png', fullPage: true });

    // Check page HTML to see what's actually rendered
    const bodyHTML = await page.locator('body').innerHTML();
    console.log('\n=== Page HTML (first 2000 chars) ===');
    console.log(bodyHTML.substring(0, 2000));
  });

  test('should persist video when entering focus mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot before clicking
    await page.screenshot({ path: 'test-results/04-before-begin.png', fullPage: true });

    // Click "Begin Session"
    const beginButton = page.getByRole('button', { name: /begin session/i });
    await beginButton.click();

    // Wait for transition
    await page.waitForTimeout(1000);

    // Take screenshot after clicking
    await page.screenshot({ path: 'test-results/05-after-begin.png', fullPage: true });

    // Check if video still exists
    const video = page.locator('video');
    const videoCount = await video.count();
    console.log(`Video elements after transition: ${videoCount}`);

    // Check for focus mode controls (the voice button)
    const voiceButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    const voiceButtonExists = await voiceButton.count() > 0;
    console.log(`Voice control button: ${voiceButtonExists ? '✓ Found' : '✗ Not found'}`);
  });
});
