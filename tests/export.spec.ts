import { test, expect } from '@playwright/test';

// Wave 0 stubs — all expected to FAIL until Phase 4 Wave 1–3 is implemented.
// These define the selector contract for ExportButtons.tsx and dark mode.
//
// Selector contract established by this file:
//   [data-testid="export-png"]  — Download PNG button
//   [data-testid="export-svg"]  — Download SVG button
//   [data-testid="export-copy"] — Copy to Clipboard button

test.describe('Export Buttons @smoke', () => {
  // EXPO-01 / EXPO-02: Download PNG and SVG — visibility
  test('@smoke export-png button is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="export-png"]')).toBeVisible();
  });

  test('@smoke export-svg button is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="export-svg"]')).toBeVisible();
  });

  // EXPO-01 / EXPO-02: Disabled when no content entered
  test('@smoke export-png is disabled when no content entered', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="export-png"]')).toBeDisabled();
  });

  test('@smoke export-svg is disabled when no content entered', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="export-svg"]')).toBeDisabled();
  });

  // EXPO-01 / EXPO-02: Enabled after content entered
  test('@smoke export-png is enabled after content entered', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="export-png"]'); // wait for island hydration (client:visible)
    await page.fill('[data-testid="url-input"]', 'https://example.com');
    await page.waitForTimeout(400); // debounce
    await expect(page.locator('[data-testid="export-png"]')).not.toBeDisabled();
  });

  test('@smoke export-svg is enabled after content entered', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="export-png"]'); // wait for island hydration (client:visible)
    await page.fill('[data-testid="url-input"]', 'https://example.com');
    await page.waitForTimeout(400); // debounce
    await expect(page.locator('[data-testid="export-svg"]')).not.toBeDisabled();
  });

  // EXPO-01: PNG download triggers with expected filename
  test('@smoke export-png triggers download with filename containing qrcraft-code', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="export-png"]'); // wait for island hydration (client:visible)
    await page.fill('[data-testid="url-input"]', 'https://example.com');
    await page.waitForTimeout(400); // debounce
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-png"]'),
    ]);
    expect(download.suggestedFilename()).toContain('qrcraft-code');
  });

  // EXPO-02: SVG download triggers with expected filename
  test('@smoke export-svg triggers download with filename containing qrcraft-code', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="export-png"]'); // wait for island hydration (client:visible)
    await page.fill('[data-testid="url-input"]', 'https://example.com');
    await page.waitForTimeout(400); // debounce
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-svg"]'),
    ]);
    expect(download.suggestedFilename()).toContain('qrcraft-code');
  });
});

test.describe('Copy to Clipboard @smoke', () => {
  // EXPO-03 / EXPO-04: Copy button — visibility
  test('@smoke export-copy button is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="export-copy"]')).toBeVisible();
  });

  // EXPO-03 / EXPO-04: Disabled when no content entered
  test('@smoke export-copy is disabled when no content entered', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="export-copy"]')).toBeDisabled();
  });

  // EXPO-03 / EXPO-04: Enabled after content entered
  test('@smoke export-copy is enabled after content entered', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="export-png"]'); // wait for island hydration (client:visible)
    await page.fill('[data-testid="url-input"]', 'https://example.com');
    await page.waitForTimeout(400); // debounce
    await expect(page.locator('[data-testid="export-copy"]')).not.toBeDisabled();
  });

  // EXPO-03: Copy shows "Copied!" on success
  // clipboard-write permission grant is Chromium-only; skipped on Firefox/WebKit
  test('@smoke export-copy shows Copied! on success', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard-write permission grant is Chromium-only');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await page.waitForSelector('[data-testid="export-png"]'); // wait for island hydration (client:visible)
    await page.fill('[data-testid="url-input"]', 'https://example.com');
    await page.waitForTimeout(400); // debounce
    await page.click('[data-testid="export-copy"]');
    await expect(page.locator('[data-testid="export-copy"]')).toHaveText('Copied!');
  });

  // EXPO-04: Copy shows "Copy not supported" when clipboard unavailable
  test('@smoke export-copy shows Copy not supported when clipboard unavailable', async ({ page }) => {
    // Remove navigator.clipboard BEFORE page.goto so the override is in effect from the start
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        configurable: true,
      });
    });
    await page.goto('/');
    await page.waitForSelector('[data-testid="export-png"]'); // wait for island hydration (client:visible)
    await page.fill('[data-testid="url-input"]', 'https://example.com');
    await page.waitForTimeout(400); // debounce
    await page.click('[data-testid="export-copy"]');
    await expect(page.locator('[data-testid="export-copy"]')).toHaveText('Copy not supported');
  });
});

test.describe('Dark Mode @smoke', () => {
  // BRAND-04: Body has dark background in dark mode
  test('@smoke body has dark background in dark mode', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto('/');
    const bodyBg = await page.locator('body').evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    // #0f172a = rgb(15, 23, 42) — slate-900 dark background
    expect(bodyBg).toBe('rgb(15, 23, 42)');
    await context.close();
  });

  // BRAND-04: Header has dark background in dark mode
  test('@smoke header has dark background in dark mode', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto('/');
    const headerBg = await page.locator('header').evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    // Header must NOT be white (rgb(255, 255, 255)) in dark mode
    expect(headerBg).not.toBe('rgb(255, 255, 255)');
    await context.close();
  });

  // BRAND-04: QR preview container keeps light background in dark mode
  test('@smoke qr preview container keeps light background in dark mode', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto('/');
    // Check the outer wrapper (parent of qr-preview) — it has bg-white and must NOT receive dark:bg override
    const containerBg = await page.locator('[data-testid="qr-preview"]').evaluate(
      (el) => window.getComputedStyle(el.parentElement!).backgroundColor
    );
    // QR preview container must remain white regardless of OS dark mode — locked decision
    expect(containerBg).toBe('rgb(255, 255, 255)');
    await context.close();
  });
});
