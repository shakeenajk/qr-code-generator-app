import { test, expect } from '@playwright/test';

test.describe('Update dynamic QR API @smoke', () => {
  test.fixme('PATCH destination URL by owner succeeds', async ({ request }) => {
    // Requires real Clerk session or DB seeding — activate after API routes exist
  });

  test.fixme('PATCH destination URL by wrong user returns 404 (IDOR)', async ({ request }) => {
    // Requires real Clerk session or DB seeding — activate after API routes exist
  });
});
