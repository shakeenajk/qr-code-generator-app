import { test, expect } from '@playwright/test';

test.describe('Stripe webhook endpoint @smoke', () => {
  test('POST /api/webhooks/stripe returns 400 when stripe-signature header is missing', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', {
      data: JSON.stringify({ type: 'checkout.session.completed' }),
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res.status()).toBe(400);
  });

  test.fixme('valid Stripe-signed payload returns 200 and updates DB', async () => {
    // Requires stripe CLI: stripe trigger checkout.session.completed
  });
});
