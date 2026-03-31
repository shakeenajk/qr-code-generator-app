import { test, expect } from '@playwright/test';

test.describe('Scan Events', () => {
  test('redirect still returns 307 for valid active slug', async ({ request }) => {
    // Validates that adding scan event recording did not break redirect behavior
    // This test requires a valid slug in the DB — may need test.fixme if no seed data
    test.fixme();
  });

  test.fixme('bot UA does not create scan event row', async () => {
    // Manual verification: curl with Googlebot UA, check DB for no new row
  });

  test.fixme('non-bot UA creates scan event row', async () => {
    // Manual verification: scan QR, check DB for new row with device + country
  });
});
