import { test, expect } from '@playwright/test';

test.describe('QR Delete API @smoke', () => {
  test('unauthenticated DELETE /api/qr/[id] returns 401 @smoke', async ({ request }) => {
    const response = await request.delete('/api/qr/fake-id');
    expect(response.status()).toBe(401);
  });
});
