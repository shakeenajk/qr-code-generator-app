import { test, expect } from '@playwright/test';

test.describe('Redirect endpoint @smoke', () => {
  test('GET /r/[invalid-slug] returns 404 with holding page @smoke', async ({ request }) => {
    const response = await request.get('/r/nonexistent-slug-that-does-not-exist');
    expect(response.status()).toBe(404);
    const text = await response.text();
    expect(text).toContain('This QR code is no longer active.');
  });

  test('GET /r/[invalid-slug] holding page contains expected structure @smoke', async ({ request }) => {
    const response = await request.get('/r/another-invalid-slug');
    expect(response.status()).toBe(404);
    const text = await response.text();
    expect(text).toContain('QRCraft');
    expect(text).toContain('<h1>');
    expect(text).toContain('<main');
  });

  test.fixme('GET /r/[valid-active-slug] returns 307 with Location header', async ({ request }) => {
    // Requires DB seeding — manually verify at checkpoint
  });

  test.fixme('GET /r/[paused-slug] returns 200 with holding page', async ({ request }) => {
    // Requires DB seeding — manually verify at checkpoint
  });
});
