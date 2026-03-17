import { test, expect } from '@playwright/test';

test.describe('Pro gates @smoke', () => {
  test('GATE-03: Anonymous user — no "Save to Library" button visible on homepage @smoke', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Anonymous users see neither the locked nor the active save button
    await expect(page.getByTestId('save-to-library')).not.toBeVisible();
    await expect(page.getByTestId('save-to-library-locked')).not.toBeVisible();
  });

  test('GATE-02: Anonymous user — classy dot shape button is clickable (no lock overlay) @smoke', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll to the Customize section heading to trigger island hydration for that area
    await page.evaluate(() => {
      window.scrollBy(0, 1200);
    });
    await page.waitForTimeout(2000);

    // Classy button should be present and enabled (no lock for anonymous)
    const classyBtn = page.getByTestId('dot-shape-classy');
    await expect(classyBtn).toBeVisible({ timeout: 10000 });
    // aria-label should NOT contain "Pro feature" for anonymous users
    await expect(classyBtn).not.toHaveAttribute('aria-label', /pro feature/i);
  });

  test('GATE-01: Anonymous user — logo section renders drop-zone, not lock overlay @smoke', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll to the Logo section (further down than the Customize heading)
    await page.evaluate(() => {
      window.scrollBy(0, 2000);
    });
    await page.waitForTimeout(2000);

    // Logo drop-zone should be visible for anonymous (not locked)
    const dropzone = page.getByTestId('logo-dropzone');
    await expect(dropzone).toBeVisible({ timeout: 10000 });
    // Lock overlay should NOT be visible
    await expect(page.getByTestId('logo-locked')).not.toBeVisible();
  });
});
