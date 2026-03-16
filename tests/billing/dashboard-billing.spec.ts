import { test, expect } from '@playwright/test';

test.describe('Dashboard billing UI @smoke', () => {
  test('unauthenticated visit to dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test.fixme('free user sees upgrade CTA panel in sidebar', async () => {
    // Requires authenticated free user session
  });

  test.fixme('paid user sees manage subscription link in sidebar', async () => {
    // Requires authenticated paid user session with active subscription
  });
});
