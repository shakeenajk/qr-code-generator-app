import { test, expect } from '@playwright/test';

test.describe('AUTH-04: Session persistence', () => {
  test('@smoke /dashboard page loads (unauthenticated → redirects to /login)', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test.fixme('AUTH-04: session persists across browser refresh — /dashboard stays on /dashboard when logged in', async ({ page }) => {
    // TODO: requires authenticated state — implement after Plan 04 + Clerk testing setup
    // 1. Sign in
    // 2. Navigate to /dashboard
    // 3. Reload page
    // 4. Expect to remain on /dashboard
  });
});
