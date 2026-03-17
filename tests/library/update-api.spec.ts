import { test, expect } from '@playwright/test';

test.describe('QR Update API @smoke', () => {
  test('unauthenticated PUT /api/qr/[id] returns 401 @smoke', async ({ request }) => {
    const response = await request.put('/api/qr/fake-id', {
      data: { name: 'updated' },
    });
    expect(response.status()).toBe(401);
  });
});
