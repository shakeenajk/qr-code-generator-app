import { test, expect } from '@playwright/test';

test.describe('Create dynamic QR API @smoke', () => {
  test('POST /api/qr/save with isDynamic:true unauthenticated returns 401 @smoke', async ({ request }) => {
    const response = await request.post('/api/qr/save', {
      data: {
        name: 'test-dynamic',
        contentType: 'url',
        contentData: JSON.stringify({ url: 'https://example.com' }),
        styleData: '{}',
        isDynamic: true,
        destinationUrl: 'https://example.com',
      },
    });
    expect(response.status()).toBe(401);
  });

  test.fixme('Free user within limit can create dynamic QR', async ({ request }) => {
    // Requires real Clerk session — manually verify at checkpoint
  });

  test.fixme('4th dynamic QR by free user returns 403 dynamic_limit_reached', async ({ request }) => {
    // Requires real Clerk session — manually verify at checkpoint
  });
});
