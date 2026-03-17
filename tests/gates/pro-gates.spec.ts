import { test, expect } from '@playwright/test';

test.describe('Pro gates @smoke', () => {
  test.fixme('GATE-01: Anonymous user — logo section renders drop-zone, not lock overlay', async ({ page }) => {
    // TODO: QRGeneratorIsland auth-awareness added in plan 09-03
  });

  test.fixme('GATE-02: Anonymous user — classy dot shape button is clickable (no lock overlay)', async ({ page }) => {
    // TODO: QRGeneratorIsland auth-awareness added in plan 09-03
  });

  test.fixme('GATE-03: Anonymous user — no "Save to Library" button visible on homepage', async ({ page }) => {
    // TODO: QRGeneratorIsland auth-awareness added in plan 09-03
  });
});
