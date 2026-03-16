import { test, expect } from '@playwright/test';

test.describe('Pricing page @smoke', () => {
  test('pricing page loads with three tier cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveTitle(/pricing/i);
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=Starter')).toBeVisible();
    await expect(page.locator('text=Pro')).toBeVisible();
  });

  test('monthly/annual toggle changes displayed prices', async ({ page }) => {
    await page.goto('/pricing');
    // Toggle to annual
    await page.locator('[data-testid="billing-toggle"]').click();
    await expect(page.locator('text=$39')).toBeVisible();
  });
});
