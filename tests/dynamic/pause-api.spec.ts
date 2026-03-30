import { test, expect } from '@playwright/test';

test.describe('Pause/activate dynamic QR API @smoke', () => {
  test.fixme('PATCH isPaused=true updates status', async ({ request }) => {
    // Requires real Clerk session or DB seeding — activate after API routes exist
  });

  test.fixme('PATCH isPaused=false reactivates', async ({ request }) => {
    // Requires real Clerk session or DB seeding — activate after API routes exist
  });
});
