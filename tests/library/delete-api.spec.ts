import { test, expect } from '@playwright/test';

test.describe('QR Delete API @smoke', () => {
  test.fixme('unauthenticated DELETE /api/qr/[id] returns 401', async ({ request }) => {
    // TODO: endpoint created in plan 09-02
  });
});
