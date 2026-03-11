import { test, expect } from '@playwright/test';

// Wave 0 stubs — all expected to fail until Phase 2 Wave 3 is implemented
// These define the selector contract for QRGeneratorIsland

test.describe('QR Generator @smoke', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // CONT-01: URL input produces a QR code
  test('CONT-01: URL tab generates a QR code from a URL @smoke', async ({ page }) => {
    await page.click('[data-tab="url"]');
    await page.fill('[data-tab-panel="url"] input[type="url"], [data-tab-panel="url"] input[type="text"]', 'https://example.com');
    await page.waitForTimeout(500); // wait for debounce
    const qrPreview = page.locator('[data-testid="qr-preview"]');
    await expect(qrPreview).toBeVisible();
    // QR rendered: SVG or canvas child present, placeholder hidden
    await expect(qrPreview.locator('svg, canvas')).toBeVisible();
  });

  // CONT-02: Plain text input produces a QR code
  test('CONT-02: Text tab generates a QR code from plain text @smoke', async ({ page }) => {
    await page.click('[data-tab="text"]');
    await page.fill('[data-tab-panel="text"] textarea', 'Hello, world!');
    await page.waitForTimeout(500);
    const qrPreview = page.locator('[data-testid="qr-preview"]');
    await expect(qrPreview.locator('svg, canvas')).toBeVisible();
  });

  // CONT-03: WiFi form produces a QR code
  test('CONT-03: WiFi tab generates a QR code from credentials @smoke', async ({ page }) => {
    await page.waitForSelector('[data-tab="wifi"]'); // wait for island hydration (client:visible)
    await page.click('[data-tab="wifi"]');
    await page.fill('[data-tab-panel="wifi"] [name="ssid"]', 'MyNetwork');
    await page.fill('[data-tab-panel="wifi"] [name="password"]', 'MyPass123');
    await page.waitForTimeout(500);
    const qrPreview = page.locator('[data-testid="qr-preview"]');
    await expect(qrPreview.locator('svg, canvas')).toBeVisible();
  });

  // CONT-04: vCard form produces a QR code
  test('CONT-04: vCard tab generates a QR code from contact info @smoke', async ({ page }) => {
    await page.click('[data-tab="vcard"]');
    await page.fill('[data-tab-panel="vcard"] [name="name"]', 'Jane Doe');
    await page.waitForTimeout(500);
    const qrPreview = page.locator('[data-testid="qr-preview"]');
    await expect(qrPreview.locator('svg, canvas')).toBeVisible();
  });

  // CONT-05: Switching tabs preserves previously entered values
  test('CONT-05: Tab state is preserved when switching between tabs @smoke', async ({ page }) => {
    // Enter URL
    await page.click('[data-tab="url"]');
    await page.fill('[data-tab-panel="url"] input[type="url"], [data-tab-panel="url"] input[type="text"]', 'https://example.com');
    // Switch to text tab
    await page.click('[data-tab="text"]');
    await page.fill('[data-tab-panel="text"] textarea', 'some text');
    // Switch back to URL tab — value must be preserved
    await page.click('[data-tab="url"]');
    const urlInput = page.locator('[data-tab-panel="url"] input[type="url"], [data-tab-panel="url"] input[type="text"]');
    await expect(urlInput).toHaveValue('https://example.com');
  });

  // PREV-01: Typing triggers QR update without button press (within 1s)
  test('PREV-01: QR preview updates automatically after typing (no button required) @smoke', async ({ page }) => {
    await page.click('[data-tab="url"]');
    const qrPreview = page.locator('[data-testid="qr-preview"]');
    // Start with empty — placeholder shown
    await expect(page.locator('[data-testid="qr-placeholder"]')).toBeVisible();
    // Type a URL — QR should appear within 1s (300ms debounce + render time)
    await page.fill('[data-tab-panel="url"] input[type="url"], [data-tab-panel="url"] input[type="text"]', 'https://example.com');
    await expect(qrPreview.locator('svg, canvas')).toBeVisible({ timeout: 1000 });
  });

  // PREV-02: Preview container size does not change as QR version updates
  test('PREV-02: QR preview container stays fixed at 256x256px @smoke', async ({ page }) => {
    const qrPreview = page.locator('[data-testid="qr-preview"]');
    const initialBox = await qrPreview.boundingBox();
    expect(initialBox?.width).toBe(256);
    expect(initialBox?.height).toBe(256);
    // Type to generate QR — size must not change
    await page.click('[data-tab="url"]');
    await page.fill('[data-tab-panel="url"] input[type="url"], [data-tab-panel="url"] input[type="text"]', 'https://example.com');
    await page.waitForTimeout(500);
    const afterBox = await qrPreview.boundingBox();
    expect(afterBox?.width).toBe(256);
    expect(afterBox?.height).toBe(256);
  });

  // PREV-03: Empty input shows placeholder state
  test('PREV-03: Empty input shows ghost placeholder, not a broken QR @smoke', async ({ page }) => {
    // On initial load, no content — placeholder must be visible
    await expect(page.locator('[data-testid="qr-placeholder"]')).toBeVisible();
    // Enter content to generate QR
    await page.click('[data-tab="url"]');
    await page.fill('[data-tab-panel="url"] input[type="url"], [data-tab-panel="url"] input[type="text"]', 'https://example.com');
    await page.waitForTimeout(500);
    // Clear content — placeholder must reappear
    await page.fill('[data-tab-panel="url"] input[type="url"], [data-tab-panel="url"] input[type="text"]', '');
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="qr-placeholder"]')).toBeVisible();
  });

});
