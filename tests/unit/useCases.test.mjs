// tests/unit/useCases.test.mjs
// Unit tests for src/data/useCases.ts — run via: node --loader tsx tests/unit/useCases.test.mjs

import { pathToFileURL } from 'url';
import { resolve } from 'path';

const FILE_PATH = resolve(process.cwd(), 'src/data/useCases.ts');
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

// We use tsx to run the TS file directly
const { USE_CASES } = await import(pathToFileURL(FILE_PATH).href).catch(() => ({ USE_CASES: undefined }));

console.log('--- useCases.ts data contract tests ---');

assert(USE_CASES !== undefined, 'USE_CASES is exported');
assert(Array.isArray(USE_CASES), 'USE_CASES is an array');
assert(USE_CASES?.length === 6, `USE_CASES has 6 entries (got ${USE_CASES?.length})`);

const expectedSlugs = ['restaurant-menu', 'business-cards', 'product-packaging', 'event-invitations', 'wifi-sharing', 'social-media'];
for (const slug of expectedSlugs) {
  const entry = USE_CASES?.find(e => e.slug === slug);
  assert(entry !== undefined, `Entry with slug "${slug}" exists`);
  if (entry) {
    assert(typeof entry.title === 'string' && entry.title.length > 0, `"${slug}" has title`);
    assert(typeof entry.excerpt === 'string' && entry.excerpt.length > 0, `"${slug}" has excerpt`);
    assert(Array.isArray(entry.keywords) && entry.keywords.length >= 2, `"${slug}" has at least 2 keywords`);
    assert(Array.isArray(entry.body) && entry.body.length > 0, `"${slug}" has non-empty body`);
    for (const section of entry.body ?? []) {
      assert(typeof section.heading === 'string' && section.heading.length > 0, `"${slug}" body section has heading`);
      assert(Array.isArray(section.paragraphs) && section.paragraphs.length > 0, `"${slug}" body section has paragraphs`);
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
