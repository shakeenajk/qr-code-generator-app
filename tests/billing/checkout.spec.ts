import { test, expect } from '@playwright/test';

test.describe('Checkout API @smoke', () => {
  test('POST /api/checkout/create returns 401 for unauthenticated request', async ({ request }) => {
    const res = await request.post('/api/checkout/create', {
      data: { priceId: 'price_test_monthly' }
    });
    expect(res.status()).toBe(401);
  });

  test.fixme('authenticated user gets checkout redirect URL for monthly plan', async () => {
    // Requires Stripe test keys and authenticated session
  });

  test.fixme('authenticated user gets checkout redirect URL for annual plan', async () => {
    // Requires Stripe test keys — BILL-02
  });
});
