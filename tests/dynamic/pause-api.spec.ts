import { test, expect } from '@playwright/test';

test.describe('Pause/activate dynamic QR API @smoke', () => {
  test('PATCH /api/qr/[id] with isPaused without auth returns 401 @smoke', async ({ request }) => {
    const response = await request.fetch('/api/qr/fake-dynamic-id', {
      method: 'PATCH',
      data: { isPaused: true },
    });
    expect(response.status()).toBe(401);
  });

  test.fixme('PATCH isPaused=true updates status', async ({ request }) => {
    // Requires real Clerk session — manually verify at checkpoint
  });

  test.fixme('PATCH isPaused=false reactivates', async ({ request }) => {
    // Requires real Clerk session — manually verify at checkpoint
  });
});
