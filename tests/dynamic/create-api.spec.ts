import { test, expect } from '@playwright/test';

test.describe('Create dynamic QR API @smoke', () => {
  test.fixme('POST /api/qr/save with isDynamic:true unauthenticated returns 401', async ({ request }) => {
    // Requires real Clerk session or DB seeding — activate after API routes exist
  });

  test.fixme('Free user within limit can create dynamic QR', async ({ request }) => {
    // Requires real Clerk session or DB seeding — activate after API routes exist
  });

  test.fixme('4th dynamic QR by free user returns 403 dynamic_limit_reached', async ({ request }) => {
    // Requires real Clerk session or DB seeding — activate after API routes exist
  });
});
