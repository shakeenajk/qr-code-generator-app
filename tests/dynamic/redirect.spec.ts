import { test, expect } from '@playwright/test';

test.describe('Redirect endpoint @smoke', () => {
  test.fixme('GET /r/[valid-active-slug] returns 307 with Location header', async ({ request }) => {
    // Requires real Clerk session or DB seeding — activate after API routes exist
  });

  test.fixme('GET /r/[invalid-slug] returns 404 with holding page', async ({ request }) => {
    // Requires real Clerk session or DB seeding — activate after API routes exist
  });

  test.fixme('GET /r/[paused-slug] returns 200 with holding page', async ({ request }) => {
    // Requires real Clerk session or DB seeding — activate after API routes exist
  });
});
