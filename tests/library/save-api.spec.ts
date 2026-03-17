import { test, expect } from '@playwright/test';

test.describe('Save API @smoke', () => {
  test('unauthenticated POST /api/qr/save returns 401 @smoke', async ({ request }) => {
    const response = await request.post('/api/qr/save', {
      data: {
        name: 'test',
        contentType: 'url',
        contentData: JSON.stringify({ url: 'https://example.com' }),
        styleData: '{}',
      },
    });
    expect(response.status()).toBe(401);
  });

  test.fixme('authenticated non-Pro POST /api/qr/save returns 403', async ({ request }) => {
    // Requires real non-Pro Clerk session — manually verified in 09-05 checkpoint
  });
});
