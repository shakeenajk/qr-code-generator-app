import { test, expect } from '@playwright/test';

test.describe('AUTH-01: Sign up', () => {
  test('@smoke sign-up page loads', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveURL('/signup');
    await expect(page.locator('body')).toBeVisible();
  });

  test.fixme('AUTH-01: email/password sign-up creates account and redirects to /dashboard', async ({ page }) => {
    // TODO: implement after Plan 03 completes
    // 1. Go to /signup
    // 2. Fill email + password
    // 3. Submit
    // 4. Expect redirect to /dashboard
  });
});
