import { test, expect } from '@playwright/test';

test.describe('QR List API @smoke', () => {
  test('unauthenticated GET /api/qr/list returns 401 @smoke', async ({ request }) => {
    const response = await request.get('/api/qr/list');
    expect(response.status()).toBe(401);
  });
});
