import { test, expect } from '@playwright/test';

test.describe('Save API @smoke', () => {
  test.fixme('unauthenticated POST /api/qr/save returns 401', async ({ request }) => {
    // TODO: endpoint created in plan 09-02
  });

  test.fixme('authenticated non-Pro POST /api/qr/save returns 403', async ({ request }) => {
    // TODO: endpoint created in plan 09-02
  });
});
