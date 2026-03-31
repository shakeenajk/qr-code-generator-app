// scripts/generate-screenshots.ts
// Run: npx tsx scripts/generate-screenshots.ts
// Requires: dev server running at http://localhost:4321 (run `npm run dev` first)
// Output: public/screenshots/step-1.png, step-2.png, step-3.png

import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'screenshots');
const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:4321';
const CLIP = { x: 0, y: 0, width: 800, height: 512 };

async function main() {
  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    // Step 1: URL tab selected (default state) — shows the generator with URL input
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    // Click the URL tab if not already active (first tab is URL by default)
    const urlTabSelector = '[data-tab="url"], button:has-text("URL")';
    const urlTab = page.locator(urlTabSelector).first();
    if (await urlTab.count() > 0) {
      await urlTab.click();
    }
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'step-1.png'),
      clip: CLIP,
    });
    console.log('step-1.png captured');

    // Step 2: Customization panel visible — click customize/design tab
    const customizeSelector = '[data-tab="customize"], button:has-text("Customize"), button:has-text("Design")';
    const customizeTab = page.locator(customizeSelector).first();
    if (await customizeTab.count() > 0) {
      await customizeTab.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'step-2.png'),
      clip: CLIP,
    });
    console.log('step-2.png captured');

    // Step 3: Download section visible — scroll to export area
    const exportSelector = '[data-section="export"], button:has-text("Download"), button:has-text("Export")';
    const exportEl = page.locator(exportSelector).first();
    if (await exportEl.count() > 0) {
      await exportEl.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    }
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'step-3.png'),
      clip: CLIP,
    });
    console.log('step-3.png captured');

    console.log(`\nAll screenshots saved to: ${OUTPUT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Screenshot generation failed:', err);
  process.exit(1);
});
