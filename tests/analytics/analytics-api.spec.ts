import { test, expect } from '@playwright/test';

test.describe('Analytics API', () => {
  test('unauthenticated request returns 401', async ({ request }) => {
    const res = await request.get('/api/analytics/test-slug');
    expect(res.status()).toBe(401);
  });

  test.fixme('non-Pro user returns 403', async () => {
    // Requires real Clerk non-Pro session — cannot automate in CI
  });

  test.fixme('wrong user slug returns 404', async () => {
    // Requires two Clerk sessions — cannot automate in CI
  });

  test.fixme('Pro user gets analytics data with correct shape', async () => {
    // Requires real Clerk Pro session
    // Response should contain: { name, slug, total, unique, timeSeries, devices, countries }
    // timeSeries should have 30 entries
    // countries should have at most 5 entries
  });
});
