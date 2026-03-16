import { test, expect } from '@playwright/test';

test.describe('AUTH-05: Sign out', () => {
  test('@smoke homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test.fixme('AUTH-05: sign-out from UserMenu redirects to /', async ({ page }) => {
    // TODO: requires authenticated state — implement after Plan 03 + Plan 04 complete
    // 1. Sign in
    // 2. Open UserMenu dropdown
    // 3. Click Sign Out
    // 4. Expect redirect to /
  });
});
