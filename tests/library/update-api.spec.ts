import { test, expect } from '@playwright/test';

test.describe('QR Update API @smoke', () => {
  test.fixme('unauthenticated PUT /api/qr/[id] returns 401', async ({ request }) => {
    // TODO: endpoint created in plan 09-02
  });
});
