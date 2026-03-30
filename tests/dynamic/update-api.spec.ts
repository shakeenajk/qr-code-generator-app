import { test, expect } from '@playwright/test';

test.describe('Update dynamic QR API @smoke', () => {
  test('PATCH /api/qr/[id] without auth returns 401 @smoke', async ({ request }) => {
    const response = await request.fetch('/api/qr/fake-dynamic-id', {
      method: 'PATCH',
      data: { destinationUrl: 'https://updated.example.com' },
    });
    expect(response.status()).toBe(401);
  });

  test.fixme('PATCH destination URL by owner succeeds', async ({ request }) => {
    // Requires real Clerk session — manually verify at checkpoint
  });

  test.fixme('PATCH destination URL by wrong user returns 404 (IDOR)', async ({ request }) => {
    // Requires real Clerk session — manually verify at checkpoint
  });
});
