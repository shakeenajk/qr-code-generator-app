import { test, expect } from '@playwright/test';

// Wave 0 stubs — all expected to fail until Phase 3 Wave 1–3 is implemented
// These define the selector contract for customization components

test.describe('QR Customization @smoke', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // CUST-01: Foreground color picker exists
  test('@smoke CUST-01: foreground color picker is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="color-fg"]')).toBeVisible();
  });

  // CUST-02: Background color picker exists
  test('@smoke CUST-02: background color picker is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="color-bg"]')).toBeVisible();
  });

  // CUST-03: Gradient toggle and type selector
  test('@smoke CUST-03: gradient toggle is visible; type selector appears when enabled', async ({ page }) => {
    await expect(page.locator('[data-testid="gradient-toggle"]')).toBeVisible();
    // gradient-type should NOT be visible initially (gradient off by default)
    await expect(page.locator('[data-testid="gradient-type"]')).not.toBeVisible();
    // Click gradient-toggle to enable gradient
    await page.click('[data-testid="gradient-toggle"]');
    // gradient-type should now be visible
    await expect(page.locator('[data-testid="gradient-type"]')).toBeVisible();
  });

  // CUST-04: Dot shape thumbnails
  test('@smoke CUST-04: all six dot shape thumbnails are present', async ({ page }) => {
    await expect(page.locator('[data-testid="dot-shape-square"]')).toBeVisible();
    await expect(page.locator('[data-testid="dot-shape-dots"]')).toBeVisible();
    await expect(page.locator('[data-testid="dot-shape-rounded"]')).toBeVisible();
    await expect(page.locator('[data-testid="dot-shape-extra-rounded"]')).toBeVisible();
    await expect(page.locator('[data-testid="dot-shape-classy"]')).toBeVisible();
    await expect(page.locator('[data-testid="dot-shape-classy-rounded"]')).toBeVisible();
  });

  // CUST-05: Corner frame thumbnails
  test('@smoke CUST-05: all three corner frame thumbnails are present', async ({ page }) => {
    await expect(page.locator('[data-testid="corner-frame-square"]')).toBeVisible();
    await expect(page.locator('[data-testid="corner-frame-extra-rounded"]')).toBeVisible();
    await expect(page.locator('[data-testid="corner-frame-dot"]')).toBeVisible();
  });

  // CUST-06: Corner pupil thumbnails
  test('@smoke CUST-06: all three corner pupil thumbnails are present', async ({ page }) => {
    await expect(page.locator('[data-testid="corner-pupil-square"]')).toBeVisible();
    await expect(page.locator('[data-testid="corner-pupil-dot"]')).toBeVisible();
    await expect(page.locator('[data-testid="corner-pupil-extra-rounded"]')).toBeVisible();
  });

  // CUST-07: Low-contrast warning
  test('@smoke CUST-07: low-contrast warning hidden initially; appears with bad colors', async ({ page }) => {
    await page.waitForSelector('[data-testid="color-fg"]'); // wait for island hydration (client:visible)
    // Default colors (#1e293b on #ffffff) have good contrast — warning must be hidden
    await expect(page.locator('[data-testid="low-contrast-warning"]')).not.toBeVisible();
    // Fill fg color with yellow (#ffff00) — low contrast on white background
    await page.fill('[data-testid="color-fg"] input[type="text"]', '#ffff00');
    await page.keyboard.press('Enter');
    // Warning must now be visible
    await expect(page.locator('[data-testid="low-contrast-warning"]')).toBeVisible();
  });

  // LOGO-01: Logo drop zone exists
  test('@smoke LOGO-01: logo drop zone is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="logo-dropzone"]')).toBeVisible();
  });

  // LOGO-02 + LOGO-04: ECL notice appears/disappears with logo
  test('@smoke LOGO-02: ECL notice shown when logo uploaded; LOGO-04: hidden when removed', async ({ page }) => {
    await page.waitForSelector('[data-testid="logo-dropzone"]'); // wait for island hydration (client:visible)
    // ECL notice must NOT be visible initially (no logo uploaded)
    await expect(page.locator('[data-testid="logo-ecl-notice"]')).not.toBeVisible();

    // Upload a minimal 1x1 PNG via the hidden file input
    await page.setInputFiles('[data-testid="logo-dropzone"] input[type="file"]', {
      name: 'test.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      ),
    });

    // Thumbnail must appear after upload
    await expect(page.locator('[data-testid="logo-thumbnail"]')).toBeVisible();
    // ECL notice must appear after upload (LOGO-02)
    await expect(page.locator('[data-testid="logo-ecl-notice"]')).toBeVisible();

    // Remove the logo
    await page.click('[data-testid="logo-remove"]');

    // ECL notice must disappear after removal (LOGO-04)
    await expect(page.locator('[data-testid="logo-ecl-notice"]')).not.toBeVisible();
    // Thumbnail must also disappear
    await expect(page.locator('[data-testid="logo-thumbnail"]')).not.toBeVisible();
  });

});
