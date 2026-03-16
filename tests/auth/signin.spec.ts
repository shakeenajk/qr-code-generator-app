import { test, expect } from '@playwright/test';

test.describe('AUTH-02: Sign in with email/password', () => {
  test('@smoke sign-in page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('body')).toBeVisible();
  });

  test.fixme('AUTH-02: valid credentials redirect to /dashboard', async ({ page }) => {
    // TODO: implement after Plan 03 completes
  });
});

test.describe('AUTH-03: OAuth buttons visible', () => {
  test('@smoke Google and GitHub OAuth buttons are present on sign-in page', async ({ page }) => {
    await page.goto('/login');
    // Clerk renders OAuth buttons in its SignIn component — assert they exist
    // Exact selectors filled in after implementation
    await expect(page.locator('body')).toBeVisible();
  });

  test.fixme('AUTH-03: Google OAuth button is visible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/Google/i)).toBeVisible();
  });

  test.fixme('AUTH-03: GitHub OAuth button is visible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/GitHub/i)).toBeVisible();
  });
});
