import { test, expect } from '@playwright/test';

test.describe('i18n — Internationalization', () => {

  // ─── I18N-01: Translated pages accessible ───────────────────────────────

  test('I18N-01 /es/ returns 200 with Spanish hero title @smoke', async ({ page }) => {
    const response = await page.goto('/es/');
    expect(response?.status()).toBe(200);
    const h1 = page.locator('h1');
    await expect(h1).toContainText('Generador de códigos QR gratuito');
  });

  test('I18N-01 /fr/ returns 200 with French hero title @smoke', async ({ page }) => {
    const response = await page.goto('/fr/');
    expect(response?.status()).toBe(200);
    const h1 = page.locator('h1');
    await expect(h1).toContainText('Générateur de QR code gratuit');
  });

  test('I18N-01 /de/ returns 200 with German hero title @smoke', async ({ page }) => {
    const response = await page.goto('/de/');
    expect(response?.status()).toBe(200);
    const h1 = page.locator('h1');
    await expect(h1).toContainText('Kostenloser QR-Code-Generator');
  });

  test('I18N-01 /es/pricing returns 200 with Spanish pricing heading @smoke', async ({ page }) => {
    const response = await page.goto('/es/pricing');
    expect(response?.status()).toBe(200);
    const h1 = page.locator('h1');
    await expect(h1).toContainText('Precios simples y transparentes');
  });

  test('I18N-01 /fr/pricing returns 200 with French pricing heading @smoke', async ({ page }) => {
    const response = await page.goto('/fr/pricing');
    expect(response?.status()).toBe(200);
    const h1 = page.locator('h1');
    await expect(h1).toContainText('Tarification simple et transparente');
  });

  test('I18N-01 /de/pricing returns 200 with German pricing heading @smoke', async ({ page }) => {
    const response = await page.goto('/de/pricing');
    expect(response?.status()).toBe(200);
    const h1 = page.locator('h1');
    await expect(h1).toContainText('Einfache, transparente Preise');
  });

  test('I18N-01 /es/use-cases/ returns 200 @smoke', async ({ page }) => {
    const response = await page.goto('/es/use-cases/');
    expect(response?.status()).toBe(200);
    const h1 = page.locator('h1');
    await expect(h1).toContainText('Casos de uso');
  });

  test('I18N-01 /fr/use-cases/ returns 200 @smoke', async ({ page }) => {
    const response = await page.goto('/fr/use-cases/');
    expect(response?.status()).toBe(200);
    const h1 = page.locator('h1');
    await expect(h1).toContainText("Cas d'utilisation");
  });

  test('I18N-01 /de/use-cases/ returns 200 @smoke', async ({ page }) => {
    const response = await page.goto('/de/use-cases/');
    expect(response?.status()).toBe(200);
    const h1 = page.locator('h1');
    await expect(h1).toContainText('QR-Code-Anwendungsfälle');
  });

  test('I18N-01 / English homepage regression — returns 200 with English content @smoke', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    const h1 = page.locator('h1');
    await expect(h1).toContainText('Free QR Code Generator');
  });

  // ─── I18N-02: Language switcher ─────────────────────────────────────────

  test('I18N-02 Language switcher is visible on homepage @smoke', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav[aria-label="Language selection"]');
    await expect(nav).toBeVisible();
  });

  test('I18N-02 Clicking ES link navigates to /es/ with Spanish content @smoke', async ({ page }) => {
    await page.goto('/');
    const esLink = page.locator('nav[aria-label="Language selection"] a[hreflang="es"]');
    await esLink.click();
    await page.waitForURL('**/es/**');
    const h1 = page.locator('h1');
    await expect(h1).toContainText('Generador de códigos QR gratuito');
  });

  test('I18N-02 Language switcher on /es/ shows ES as active (aria-current=true) @smoke', async ({ page }) => {
    await page.goto('/es/');
    const esLink = page.locator('nav[aria-label="Language selection"] a[hreflang="es"]');
    await expect(esLink).toHaveAttribute('aria-current', 'true');
  });

  // ─── I18N-03: Hreflang SEO tags ─────────────────────────────────────────

  test('I18N-03 Homepage head contains hreflang="es" alternate link @smoke', async ({ page }) => {
    await page.goto('/');
    const hreflangEs = page.locator('link[rel="alternate"][hreflang="es"]');
    await expect(hreflangEs).toHaveCount(1);
  });

  test('I18N-03 Homepage head contains hreflang="x-default" alternate link @smoke', async ({ page }) => {
    await page.goto('/');
    const hreflangDefault = page.locator('link[rel="alternate"][hreflang="x-default"]');
    await expect(hreflangDefault).toHaveCount(1);
  });

  test('I18N-03 /es/ head contains hreflang tags for all 4 locales + x-default @smoke', async ({ page }) => {
    await page.goto('/es/');
    // en, es, fr, de + x-default = 5 tags
    const hreflangLinks = page.locator('link[rel="alternate"][hreflang]');
    await expect(hreflangLinks).toHaveCount(5);
    // Verify each locale present
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="fr"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="de"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
  });

  test('I18N-03 Hreflang URLs are absolute (start with https://) @smoke', async ({ page }) => {
    await page.goto('/es/');
    const hreflangLinks = page.locator('link[rel="alternate"][hreflang]');
    const count = await hreflangLinks.count();
    for (let i = 0; i < count; i++) {
      const href = await hreflangLinks.nth(i).getAttribute('href');
      expect(href).toMatch(/^https?:\/\//);
    }
  });

});
