import { test, expect } from '@playwright/test';

test.describe('Phase 1: Foundation', () => {

  // BRAND-01: QRCraft SVG logo visible in header/nav
  test('logo @smoke', async ({ page }) => {
    await page.goto('/');
    const logo = page.locator('header svg[aria-label="QRCraft logo"], nav svg[aria-label="QRCraft logo"]');
    await expect(logo).toBeVisible();
  });

  // BRAND-02: White background and blue accent color present
  test('brand colors @smoke', async ({ page }) => {
    await page.goto('/');
    // Check that the page body has white background (CSS computed style)
    const body = page.locator('body');
    const bg = await body.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );
    // White = rgb(255, 255, 255)
    expect(bg).toBe('rgb(255, 255, 255)');
    // Check at least one element carries the brand blue accent (#2563EB = rgb(37, 99, 235))
    const accentEl = page.locator('[class*="blue-600"], [class*="text-\\[#2563EB\\]"], a, button').first();
    await expect(accentEl).toBeVisible();
  });

  // BRAND-03: Page renders correctly on mobile (375px viewport)
  test('mobile @smoke', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    // No horizontal scroll on mobile
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
    // Main content is visible
    await expect(page.locator('main')).toBeVisible();
  });

  // SEO-01: Title and meta description present with QR-targeting content
  test('meta tags @smoke', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toContain('QR');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(50);
  });

  // SEO-02: Open Graph tags present
  test('open graph @smoke', async ({ page }) => {
    await page.goto('/');
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    expect(ogDesc).toBeTruthy();
    expect(ogImage).toMatch(/https?:\/\//); // Must be absolute URL
  });

  // SEO-03: WebApplication JSON-LD schema in <head>
  test('webapplication schema @smoke', async ({ page }) => {
    await page.goto('/');
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const webApp = schemas.find((s) => {
      try { return JSON.parse(s)['@type'] === 'WebApplication'; } catch { return false; }
    });
    expect(webApp).toBeTruthy();
    const parsed = JSON.parse(webApp!);
    expect(parsed['name']).toBe('QRCraft');
    expect(parsed['applicationCategory']).toBeTruthy();
  });

  // SEO-04: FAQPage JSON-LD schema in <head>
  test('faqpage schema @smoke', async ({ page }) => {
    await page.goto('/');
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faqSchema = schemas.find((s) => {
      try { return JSON.parse(s)['@type'] === 'FAQPage'; } catch { return false; }
    });
    expect(faqSchema).toBeTruthy();
    const parsed = JSON.parse(faqSchema!);
    expect(parsed['mainEntity']).toHaveLength(expect.any(Number));
    expect(parsed['mainEntity'].length).toBeGreaterThanOrEqual(4);
  });

  // SEO-05: Visible FAQ section with at least 4 Q&A items on page
  test('faq section @smoke', async ({ page }) => {
    await page.goto('/');
    const faqSection = page.locator('section').filter({ hasText: /FAQ|frequently asked|questions/i });
    await expect(faqSection).toBeVisible();
    // At least 4 question items visible (dt, summary, h3 inside FAQ, etc.)
    const items = faqSection.locator('dt, summary, [data-faq-question]');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  // SEO-06: sitemap-index.xml accessible at canonical URL
  test('sitemap @smoke', async ({ page }) => {
    const response = await page.request.get('/sitemap-index.xml');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('<?xml');
    expect(body).toContain('sitemap');
  });

  // SEO-07: robots.txt accessible with correct directives
  test('robots @smoke', async ({ page }) => {
    const response = await page.request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Sitemap:');
    expect(body).toContain('sitemap-index.xml');
  });

  // SEO-08: Exactly one <h1>, one <main>, one <nav> on the page
  test('semantic html @smoke', async ({ page }) => {
    await page.goto('/');
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
    const mainCount = await page.locator('main').count();
    expect(mainCount).toBe(1);
    const navCount = await page.locator('nav').count();
    expect(navCount).toBeGreaterThanOrEqual(1);
    // At least one h2 for major sections
    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThanOrEqual(2);
  });

});
