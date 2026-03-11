# Phase 5: Complete Dark Mode — Research

**Researched:** 2026-03-10
**Domain:** Tailwind CSS v4 dark mode, Playwright color-scheme testing
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BRAND-04 | Site supports dark mode based on system preference | Full — gap is precisely scoped to Features.astro and FAQ.astro missing dark: classes; established dark: patterns from Phase 4 components are directly reusable |
</phase_requirements>

---

## Summary

Phase 5 is a scoped gap-closure phase. The dark mode infrastructure is already complete: Tailwind v4 with `@import "tailwindcss"` in `global.css` automatically enables `prefers-color-scheme` media-query dark mode — no `darkMode` config key is needed or valid. Phase 4 applied `dark:` classes to Layout, Header, Hero, Footer, and all React island components. The only remaining work is adding `dark:` classes to two Astro static components (`Features.astro` and `FAQ.astro`) and extending the existing Playwright dark mode tests to cover those two sections.

The color tokens to map are fully enumerated in the existing source files. Both components use the same three color concerns: section background (`bg-gray-50` / `bg-white`), card/item background (`bg-white` / `bg-gray-50`), and text (`text-gray-900` / `text-gray-600`). The established dark palette from Phase 4 provides all the right mappings: section backgrounds go to `dark:bg-slate-900` or `dark:bg-[#0f172a]`, card backgrounds to `dark:bg-slate-800`, borders to `dark:border-slate-700`, headings to `dark:text-white`, body text to `dark:text-slate-300` or `dark:text-slate-400`.

The Playwright test extension is equally bounded: two new dark mode tests — one for Features, one for FAQ — using the same `browser.newContext({ colorScheme: 'dark' })` pattern already established in `export.spec.ts`. The tests assert the computed background color of the section or a card element is NOT white/light-gray.

**Primary recommendation:** Add `dark:` Tailwind classes to `Features.astro` and `FAQ.astro` following Phase 4 palette tokens, extend `export.spec.ts` Dark Mode describe block with two section-level tests, update REQUIREMENTS.md BRAND-04 checkbox to `[x]`.

---

## Standard Stack

### Core (already installed — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS v4 | 4.2.1 | Utility classes including `dark:` variants | Already installed via `@tailwindcss/vite` |
| Playwright | latest (installed) | Dark mode smoke tests via `colorScheme: 'dark'` context | Already installed, pattern established in export.spec.ts |

No new packages are required for this phase. All tooling is in place.

---

## Architecture Patterns

### How Tailwind v4 Dark Mode Works in This Project

Tailwind v4 uses `@import "tailwindcss"` (not a config file). The dark mode strategy defaults to `prefers-color-scheme` media query, which is what this project uses. The `dark:` prefix generates CSS inside `@media (prefers-color-scheme: dark) { ... }`. No `darkMode: 'media'` or `darkMode: 'class'` config is needed or valid in Tailwind v4's CSS-first configuration approach.

**Confirmed by:** `src/styles/global.css` contains only `@import "tailwindcss"` — no config overrides. `astro.config.mjs` uses `@tailwindcss/vite` plugin.

### Established Dark Palette from Phase 4

The following mappings are already proven and in use across Layout, Header, Hero, Footer:

| Light token | Dark equivalent | Used in |
|-------------|----------------|---------|
| `bg-white` | `dark:bg-[#0f172a]` | body (deepest bg), Hero section |
| `bg-white` | `dark:bg-slate-900` | Header, Footer section |
| `bg-gray-50` | `dark:bg-slate-800` | Hero generator container (inner card) |
| `bg-gray-50` | `dark:bg-slate-900` | Footer section bg |
| `border-gray-200` | `dark:border-slate-700` | Header, Hero container, Footer |
| `text-gray-900` (heading) | `dark:text-white` | Header brand text, Hero h1 |
| `text-gray-600` (body) | `dark:text-slate-300` | Hero paragraph |
| `text-gray-500` (muted) | `dark:text-slate-400` | Footer text |

### Target Color Map for Features.astro

Current classes and their needed dark variants:

```
section:    bg-gray-50          → + dark:bg-slate-900
h2:         text-gray-900       → + dark:text-white
li card:    bg-white            → + dark:bg-slate-800
li card:    border-gray-200     → + dark:border-slate-700
h3:         text-gray-900       → + dark:text-white
p:          text-gray-600       → + dark:text-slate-400
```

### Target Color Map for FAQ.astro

Current classes and their needed dark variants:

```
section:    bg-white            → + dark:bg-[#0f172a]
h2:         text-gray-900       → + dark:text-white
div item:   border-gray-200     → + dark:border-slate-700
div item:   bg-gray-50          → + dark:bg-slate-800
dt:         text-gray-900       → + dark:text-white
dd:         text-gray-600       → + dark:text-slate-400
```

### Anti-Patterns to Avoid

- **Using `dark:bg-gray-800` instead of `dark:bg-slate-800`:** All existing dark surfaces use the `slate` scale, not `gray`. Mixing would produce slightly different hues. Stay on slate.
- **Adding a new dark mode describe block:** Extend the existing `test.describe('Dark Mode @smoke', ...)` in `export.spec.ts` — do not create a new spec file.
- **Class-based dark mode:** This project uses media-query dark mode. Do not add a `.dark` class toggle or JS-based theme switching — it would conflict with the established strategy.
- **Overcorrecting FAQ section bg:** `FAQ.astro`'s section background is `bg-white`. The correct dark equivalent following the Hero pattern is `dark:bg-[#0f172a]` (deepest bg), not `dark:bg-slate-900`, so the FAQ section blends with the body background seamlessly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark mode detection | JS `window.matchMedia` + class toggle | Tailwind `dark:` with media strategy | Already works; JS approach conflicts with existing implementation |
| CSS custom properties per theme | Manual `--color-bg-dark` variables | Tailwind `dark:` variant classes | Consistent with entire existing codebase |
| Computed color assertion in tests | String math / hex parsing | Direct `toBe('rgb(...)')` assertion | Same pattern already in export.spec.ts |

---

## Common Pitfalls

### Pitfall 1: Wrong slate shade for card backgrounds

**What goes wrong:** Using `dark:bg-slate-700` for cards instead of `dark:bg-slate-800` makes cards appear as the same surface as the section container, losing visual separation.
**Why it happens:** `slate-700` looks fine in isolation but matches the body text contrast incorrectly.
**How to avoid:** Use `dark:bg-slate-800` for inset card surfaces (the same token Hero uses for `div#qr-generator-root`). Section backgrounds use `slate-900` or `[#0f172a]`.
**Warning signs:** In dark mode, cards and their containing section appear the same flat color.

### Pitfall 2: Playwright test checks too-loose assertion

**What goes wrong:** Asserting `headerBg !== 'rgb(255, 255, 255)'` is the pattern in the existing header test. For Features/FAQ, a negative assertion (not white) is sufficient and robust — but the selector must target the right element.
**Why it happens:** `page.locator('section#features')` computes the section's own background. If the section has no explicit background (inherits), the computed value will be transparent or the body color.
**How to avoid:** Use `section#features` for Features (it has explicit `bg-gray-50` → will get `dark:bg-slate-900` = `rgb(15, 23, 42)` or similar). Use `section#faq` for FAQ. Assert the computed background color is not `rgb(255, 255, 255)` (white) and not `rgb(249, 250, 251)` (gray-50 light).

### Pitfall 3: Forgetting the border on FAQ items

**What goes wrong:** Adding dark text and section bg but missing `dark:border-slate-700` on the FAQ item `div` leaves a light gray border visible in dark mode.
**Why it happens:** `border-gray-200` = `rgb(229, 231, 235)` — clearly visible against dark backgrounds.
**How to avoid:** Check every element with a `border-*` class in both components.

### Pitfall 4: REQUIREMENTS.md update missed

**What goes wrong:** The code change ships but the REQUIREMENTS.md BRAND-04 checkbox stays `[ ]` — the audit finding explicitly noted the checkbox is stale.
**Why it happens:** REQUIREMENTS.md update is documentation, easy to forget in a code-focused task.
**How to avoid:** Include REQUIREMENTS.md as an explicit task deliverable in the plan.

---

## Code Examples

### Playwright dark mode test pattern (established in export.spec.ts)

```typescript
// Source: tests/export.spec.ts — existing Dark Mode describe block
test('@smoke body has dark background in dark mode', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto('/');
  const bodyBg = await page.locator('body').evaluate(
    (el) => window.getComputedStyle(el).backgroundColor
  );
  // #0f172a = rgb(15, 23, 42)
  expect(bodyBg).toBe('rgb(15, 23, 42)');
  await context.close();
});
```

New tests should follow this exact pattern. The `browser.newContext({ colorScheme: 'dark' })` approach is the correct Playwright mechanism for simulating `prefers-color-scheme: dark`.

### Negative assertion variant (robust for section tests)

```typescript
// Checking section is NOT light-mode white/gray
test('@smoke features section has dark background in dark mode', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto('/');
  const bg = await page.locator('section#features').evaluate(
    (el) => window.getComputedStyle(el).backgroundColor
  );
  expect(bg).not.toBe('rgb(255, 255, 255)');   // not white
  expect(bg).not.toBe('rgb(249, 250, 251)');   // not gray-50
  await context.close();
});
```

### Features.astro dark class additions (illustrative mapping)

```astro
<!-- Source: src/components/Features.astro — current markup, dark: additions shown -->
<section class="bg-gray-50 dark:bg-slate-900 py-16 sm:py-20" id="features">
  <h2 class="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
  <li class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
    <p class="text-gray-600 dark:text-slate-400 text-sm leading-relaxed">
```

### FAQ.astro dark class additions (illustrative mapping)

```astro
<!-- Source: src/components/FAQ.astro — current markup, dark: additions shown -->
<section class="bg-white dark:bg-[#0f172a] py-16 sm:py-20" id="faq">
  <h2 id="faq-heading" class="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
  <div class="border border-gray-200 dark:border-slate-700 rounded-xl p-6 bg-gray-50 dark:bg-slate-800">
    <dt class="text-base font-semibold text-gray-900 dark:text-white mb-2">
    <dd class="text-gray-600 dark:text-slate-400 text-sm leading-relaxed">
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` with `darkMode: 'media'` | CSS-first `@import "tailwindcss"` — media strategy is default | Tailwind v4 | No config file needed; dark: variants work out of the box |
| Separate dark theme spec file | Extend existing `Dark Mode @smoke` describe block | Phase 4 established | Keep all dark mode tests co-located in export.spec.ts |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (installed) |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test tests/export.spec.ts --grep "@smoke" --project=chromium` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRAND-04 | Features section has dark background in dark mode | smoke | `npx playwright test tests/export.spec.ts --grep "features.*dark" --project=chromium` | Wave 0 gap |
| BRAND-04 | FAQ section has dark background in dark mode | smoke | `npx playwright test tests/export.spec.ts --grep "faq.*dark" --project=chromium` | Wave 0 gap |

### Sampling Rate

- **Per task commit:** `npx playwright test tests/export.spec.ts --grep "@smoke" --project=chromium`
- **Per wave merge:** `npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] Two new tests in `tests/export.spec.ts` Dark Mode describe block — covers BRAND-04 Features and FAQ dark mode

*(Existing test infrastructure in export.spec.ts is in place. Only the two new dark mode test cases need to be added.)*

---

## Open Questions

None. The scope is fully constrained by the audit findings. All unknowns have been resolved by reading the source files directly.

---

## Sources

### Primary (HIGH confidence)

- `src/components/Features.astro` — exact current classes enumerated; dark: mappings derived from these
- `src/components/FAQ.astro` — exact current classes enumerated; dark: mappings derived from these
- `src/components/Header.astro`, `Hero.astro`, `Footer.astro`, `src/layouts/Layout.astro` — established dark palette tokens confirmed by source read
- `tests/export.spec.ts` — existing Playwright dark mode test pattern confirmed; test gap confirmed
- `src/styles/global.css` — Tailwind v4 `@import "tailwindcss"` media strategy confirmed
- `.planning/v1.0-MILESTONE-AUDIT.md` — gap scope confirmed (INT-01, BRAND-04 partial)

### Secondary (MEDIUM confidence)

- Tailwind CSS v4 dark mode behavior inferred from `@import "tailwindcss"` — no `darkMode` config key needed (consistent with Tailwind v4 CSS-first approach)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tooling confirmed in place by reading config files
- Architecture: HIGH — exact dark: class mappings derived from reading source files directly, not inferred
- Pitfalls: HIGH — specific to this codebase's actual tokens; not generic advice
- Test patterns: HIGH — existing working tests read directly from export.spec.ts

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable domain — Tailwind v4 and Playwright patterns are not fast-moving)
