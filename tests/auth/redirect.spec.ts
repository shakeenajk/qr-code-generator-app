import { test, expect } from '@playwright/test';

test.describe('Middleware: Unauthenticated redirect', () => {
  test('@smoke unauthenticated /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('@smoke homepage stays at / (not redirected)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('body')).toBeVisible();
  });
});
