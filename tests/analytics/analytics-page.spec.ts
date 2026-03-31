import { test, expect } from '@playwright/test';

test.describe('Analytics Page', () => {
  test('unauthenticated user is redirected from analytics page', async ({ page }) => {
    const res = await page.goto('/dashboard/analytics/test-slug');
    // Should redirect to /login (middleware handles this)
    expect(page.url()).toMatch(/\/login/);
  });

  test.fixme('Pro user sees analytics page with stat cards', async () => {
    // Requires real Clerk Pro session + seeded scan_events data
    // Verify: h1 contains "Analytics:", stat card labels "Total Scans" and "~Unique Scans"
  });

  test.fixme('Pro user sees 30-day chart section heading', async () => {
    // Requires real Clerk Pro session
    // Verify: text "Scans — Last 30 Days" visible on page
  });

  test.fixme('Pro user sees Device Breakdown section', async () => {
    // Requires real Clerk Pro session + seeded scan_events with device data
    // Verify: text "Device Breakdown" visible
  });

  test.fixme('Pro user sees Top Countries section', async () => {
    // Requires real Clerk Pro session + seeded scan_events with country data
    // Verify: text "Top Countries" visible
  });

  test.fixme('Non-Pro user is redirected to /pricing', async () => {
    // Requires real Clerk free-tier session
    // Verify: redirected to /pricing
  });

  test.fixme('Unknown slug redirects to /dashboard', async () => {
    // Requires real Clerk Pro session with a slug that does not exist
    // Verify: redirected to /dashboard
  });

  test.fixme('Analytics button visible on dynamic QR cards in library', async () => {
    // Requires Pro session + at least one dynamic QR code
    // Verify: element with text "Analytics" and href containing /dashboard/analytics/ exists in the card
  });
});
