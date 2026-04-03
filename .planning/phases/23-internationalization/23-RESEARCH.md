# Phase 23: Internationalization - Research

**Researched:** 2026-03-31
**Domain:** Astro 5 native i18n routing + TypeScript dictionary translations + hreflang SEO + sitemap i18n
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| I18N-01 | Marketing pages (homepage, pricing, use cases) are available in Spanish, French, and German | Astro 5 native i18n routing with `prefixDefaultLocale: false` — `src/pages/es/`, `fr/`, `de/` folders for the 3 pages; TypeScript dictionary `src/i18n/ui.ts` for ~80–120 strings; no new library required |
| I18N-02 | Language switcher is accessible in the site header; selection persists across page navigation | Astro component in `Header.astro` using `getRelativeLocaleUrl()` from `astro:i18n`; locale persisted via cookie (survives hard reload and cross-page navigation); switcher reads locale from `Astro.currentLocale` |
| I18N-03 | Each translated page has correct hreflang tags for SEO; sitemap includes all language variants | `<link rel="alternate" hreflang>` tags (including `x-default`) in `Layout.astro` `<head>`; `@astrojs/sitemap` `i18n` config option generates xhtml:link alternates in sitemap automatically |

</phase_requirements>

---

## Summary

Phase 23 adds Spanish, French, and German translations of the three marketing pages (homepage, pricing, use-cases index) via Astro 5's built-in i18n routing. No new npm library is needed. The implementation uses Astro's native `i18n` config block in `astro.config.mjs`, TypeScript literal dictionaries in `src/i18n/ui.ts`, a `useTranslations(locale)` helper, and folder-based page duplication under `src/pages/es/`, `src/pages/fr/`, `src/pages/de/`.

The milestone research flagged Paraglide 2.x as the i18n library. However, Paraglide 2.x's Astro integration requires `output: "server"` (documented by inlang as "SSG is not yet supported out of the box"). This project uses `output: "static"` and cannot switch to server output without breaking the Lighthouse 100 score and the Clerk + Vercel static deployment model. The SSG workaround for Paraglide (manually calling `setLocale()` via middleware + Vite plugin) adds complexity with no benefit over native Astro dictionaries for a ~80–120 string scope. **Use Astro native i18n + TypeScript dictionaries. Do not use Paraglide.**

The two SEO-critical tasks — hreflang tags in `Layout.astro` and sitemap `i18n` config in `astro.config.mjs` — must ship in the same wave as the translated pages. Shipping translated pages without hreflang creates a duplicate content penalty that is harder to recover from than prevent.

**Primary recommendation:** Astro 5 native i18n routing with TypeScript dictionaries. Paraglide is out of scope for `output: "static"` without significant workaround complexity.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Astro built-in i18n | (Astro 5.17.1 — already installed) | Locale routing, `Astro.currentLocale`, `getRelativeLocaleUrl()`, `astro:i18n` helper functions | Native Astro feature — zero new dependencies, full static output support, documented in official Astro docs |
| `@astrojs/sitemap` | ^3.7.0 (already installed) | Sitemap with i18n `xhtml:link` alternates for hreflang | Already installed; has an explicit `i18n` config option that generates alternate tags in the sitemap |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `js-cookie` or native `document.cookie` | — (no library) | Persist locale selection in browser cookie | The language switcher writes a locale cookie on click; Astro middleware reads it to set `Astro.currentLocale` preference. No library needed — native `document.cookie` is sufficient for a single `locale=es` cookie. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native Astro dictionaries | `@inlang/paraglide-js` 2.15.1 | Paraglide requires `output: "server"` for its Astro integration. The project uses `output: "static"`. The SSG workaround (Vite plugin + manual `setLocale()` middleware) works but adds ~100 lines of glue code and two new config files (`project.inlang/`) for no benefit at the ~80–120 string scope. Native dictionaries are the correct choice. |
| Native Astro dictionaries | `astro-i18next` | Archived package. Not maintained. |
| Native Astro dictionaries | `astro-i18n` (Alexandre-Fernandez) | Last commit 2023. Not compatible with Astro 5. |

**Installation:** No new packages. All required capabilities are already installed.

**Version verification (confirmed 2026-03-31):**
- `astro` 5.17.1 — includes full i18n routing API (`Astro.currentLocale`, `getRelativeLocaleUrl`, `getAbsoluteLocaleUrl`)
- `@astrojs/sitemap` 3.7.0 — includes `i18n` option for hreflang sitemap generation

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── i18n/
│   ├── ui.ts            # Translation dictionaries: { en: {...}, es: {...}, fr: {...}, de: {...} }
│   └── utils.ts         # useTranslations(locale), getLangFromUrl(url), getLocalizedHref(path, locale)
├── pages/
│   ├── index.astro          # English homepage (no prefix — prefixDefaultLocale: false)
│   ├── pricing.astro        # English pricing (no prefix)
│   ├── use-cases/
│   │   └── index.astro      # English use-cases (no prefix)
│   ├── es/
│   │   ├── index.astro      # /es/ — Spanish homepage
│   │   ├── pricing.astro    # /es/pricing/
│   │   └── use-cases/
│   │       └── index.astro  # /es/use-cases/
│   ├── fr/
│   │   ├── index.astro      # /fr/
│   │   ├── pricing.astro    # /fr/pricing/
│   │   └── use-cases/
│   │       └── index.astro  # /fr/use-cases/
│   └── de/
│       ├── index.astro      # /de/
│       ├── pricing.astro    # /de/pricing/
│       └── use-cases/
│           └── index.astro  # /de/use-cases/
└── components/
    └── Header.astro         # Updated to include LanguageSwitcher
    └── LanguageSwitcher.astro  # New: dropdown/links with getRelativeLocaleUrl()
```

### Pattern 1: Astro i18n Config

**What:** Enable Astro's built-in i18n routing with `prefixDefaultLocale: false` so English URLs are unchanged.
**When to use:** Always — this is the required entry point for the entire feature.

```javascript
// astro.config.mjs
// Source: https://docs.astro.build/en/guides/internationalization/
export default defineConfig({
  site: 'https://qr-code-generator-app.com',
  output: 'static',
  adapter: vercel(),
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr', 'de'],
    routing: {
      prefixDefaultLocale: false,   // /pricing stays /pricing, not /en/pricing
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-US',
          es: 'es-ES',
          fr: 'fr-FR',
          de: 'de-DE',
        },
      },
    }),
    // ... rest of integrations unchanged
  ],
  // ... vite unchanged
});
```

### Pattern 2: TypeScript Translation Dictionaries

**What:** `src/i18n/ui.ts` holds all translatable strings as a typed `const` object.
**When to use:** Every user-visible string on translated pages is extracted here.

```typescript
// src/i18n/ui.ts
// Source: https://docs.astro.build/en/recipes/i18n/
export const languages = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
} as const;

export const defaultLang = 'en';

export const ui = {
  en: {
    'nav.pricing': 'Pricing',
    'nav.usecases': 'Use Cases',
    'nav.signup': 'Sign Up',
    'nav.signin': 'Sign In',
    'hero.title': 'Free QR Code Generator',
    'hero.subtitle': 'Create custom QR codes for URLs, text, WiFi, and contact cards — no signup required.',
    'hero.cta': 'Generate QR Code',
    // ... ~80–120 keys total
  },
  es: {
    'nav.pricing': 'Precios',
    'nav.usecases': 'Casos de uso',
    'nav.signup': 'Registrarse',
    'nav.signin': 'Iniciar sesión',
    'hero.title': 'Generador de códigos QR gratuito',
    // ...
  },
  fr: {
    'nav.pricing': 'Tarifs',
    // ...
  },
  de: {
    'nav.pricing': 'Preise',
    // ...
  },
} as const;

export type UiKeys = keyof typeof ui[typeof defaultLang];
```

### Pattern 3: useTranslations Helper

**What:** A factory function that returns a typed `t()` function scoped to a locale.
**When to use:** At the top of every translated `.astro` page/component.

```typescript
// src/i18n/utils.ts
// Source: https://docs.astro.build/en/recipes/i18n/
import { ui, defaultLang, type UiKeys } from './ui';

export function getLangFromUrl(url: URL): keyof typeof ui {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: UiKeys): string {
    return (ui[lang] as Record<string, string>)[key] ?? ui[defaultLang][key];
  };
}

export function getLocalizedHref(path: string, lang: keyof typeof ui): string {
  if (lang === defaultLang) return path;
  return `/${lang}${path}`;
}
```

### Pattern 4: Using Translations in .astro Pages

**What:** Each localized page calls `useTranslations` with its locale.
**When to use:** Every `.astro` file under `src/pages/es/`, `fr/`, `de/`.

```astro
---
// src/pages/es/index.astro
// Source: https://docs.astro.build/en/recipes/i18n/
import { useTranslations } from '../../i18n/utils';
import Layout from '../../layouts/Layout.astro';
import Header from '../../components/Header.astro';
// ... other imports

const t = useTranslations('es');
---

<Layout title={t('meta.homeTitle')} description={t('meta.homeDescription')}>
  <Header lang="es" />
  <!-- use t('hero.title'), t('hero.subtitle'), etc. -->
</Layout>
```

### Pattern 5: Passing Locale to Components

**What:** The `lang` prop flows from pages → layout → components. React islands receive translated strings as props — they do NOT call `astro:i18n` directly (islands can't use it).
**When to use:** Any component that has translatable strings OR any React island that needs locale-aware text.

```astro
---
// src/components/Header.astro — updated signature
interface Props {
  lang?: keyof typeof ui;
}
const { lang = 'en' } = Astro.props;
const t = useTranslations(lang);
const locale = lang;
---
<!-- Language switcher reads current locale from prop -->
<LanguageSwitcher currentLang={locale} />
```

```astro
---
// src/components/LanguageSwitcher.astro
import { getRelativeLocaleUrl } from 'astro:i18n';
interface Props { currentLang: string; currentPath?: string; }
const { currentLang, currentPath = '/' } = Astro.props;
const langs = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'de', label: 'DE' },
];
---
<nav aria-label="Language selection">
  {langs.map(({ code, label }) => (
    <a
      href={getRelativeLocaleUrl(code, currentPath)}
      aria-current={currentLang === code ? 'true' : undefined}
      hreflang={code}
    >
      {label}
    </a>
  ))}
</nav>
```

### Pattern 6: Hreflang in Layout.astro

**What:** `<link rel="alternate" hreflang>` tags injected into `<head>` for every translated page, plus `x-default` pointing to the English URL.
**When to use:** `Layout.astro` — applies to all pages globally.

```astro
---
// src/layouts/Layout.astro — additions
import { getAbsoluteLocaleUrl } from 'astro:i18n';
const locales = ['en', 'es', 'fr', 'de'];
const hreflangMap = { en: 'en', es: 'es', fr: 'fr', de: 'de' };
const currentPath = Astro.url.pathname
  .replace(/^\/(es|fr|de)/, '')  // strip locale prefix for canonical path
  || '/';
---
<!-- In <head>: -->
{locales.map((loc) => (
  <link
    rel="alternate"
    hreflang={hreflangMap[loc]}
    href={getAbsoluteLocaleUrl(loc, currentPath)}
  />
))}
<link rel="alternate" hreflang="x-default" href={getAbsoluteLocaleUrl('en', currentPath)} />
```

### Pattern 7: Language Switcher Persistence

**What:** Locale choice is stored in a cookie so returning users and cross-page navigation preserves the language.
**When to use:** `LanguageSwitcher.astro` writes the cookie on click; Astro middleware reads it.

```astro
<!-- LanguageSwitcher.astro — inline script for cookie write -->
<script>
  document.querySelectorAll('[data-locale-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const locale = link.getAttribute('data-locale');
      document.cookie = `locale=${locale};path=/;max-age=31536000;SameSite=Lax`;
      // navigation proceeds normally via href
    });
  });
</script>
```

```typescript
// src/middleware.ts — append locale cookie reading
// NOTE: Astro's built-in i18n routing already handles URL-based locale detection.
// Cookie reading is only needed to redirect returning users to their preferred locale
// on the first visit (e.g., / → /es/). This is OPTIONAL for v1.3.
// The switcher links are the primary persistence mechanism (URL changes).
```

**Important:** The URL IS the persistent state. `getRelativeLocaleUrl()` generates locale-prefixed hrefs. As long as the user navigates via the switcher, they stay on `/es/` pages. A cookie redirect on `/` (root) is optional for v1.3 — it adds redirect complexity without SEO benefit.

### Anti-Patterns to Avoid

- **`redirectToDefaultLocale: true` with `prefixDefaultLocale: false`** — Creates an infinite redirect loop. If English has no prefix (which it does not in this project), `redirectToDefaultLocale` must remain `false` (or unset). This is a documented Astro pitfall.
- **Calling `astro:i18n` inside React islands** — React islands run client-side; `astro:i18n` is server-only. Pass translated strings as props from the parent `.astro` file.
- **Shipping translated pages without hreflang** — Even 1 week without hreflang will register as duplicate content with Google. Both must ship together.
- **Omitting `x-default` hreflang** — Google recommends `x-default` as a fallback. Without it, Google treats English and non-locale-prefixed URLs as ambiguous duplicates.
- **Using `i18next` with Astro 5** — Documented as incompatible. Do not attempt.
- **Using `@inlang/paraglide-js` without `output: "server"`** — The official Paraglide Astro guide requires server output; SSG workaround is fragile. Avoid for this project's static deployment.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL generation for localized paths | Custom string concatenation | `getRelativeLocaleUrl(locale, path)` from `astro:i18n` | Handles `prefixDefaultLocale: false` edge case, trailing slash normalization, and URL encoding automatically |
| Sitemap alternate links | Manual `<url>` XML entries | `@astrojs/sitemap` `i18n` option | Generates `xhtml:link` for every locale variant of every URL — no manual maintenance |
| Locale detection from URL | Custom regex on `Astro.url.pathname` | `Astro.currentLocale` (when i18n config is set) | Native API — correct even for complex locale formats like `pt-BR` |
| Hreflang absolute URLs | Concatenating `Astro.site` + path | `getAbsoluteLocaleUrl(locale, path)` from `astro:i18n` | Handles trailing slashes and locale prefix rules consistently |

**Key insight:** Astro 5 provides all required URL helpers natively. The only custom code needed is the translation dictionary and `useTranslations()` factory — everything else (URL generation, sitemap, locale detection) uses built-in APIs.

---

## Common Pitfalls

### Pitfall 1: Infinite Redirect Loop from `redirectToDefaultLocale`

**What goes wrong:** Setting `redirectToDefaultLocale: true` in the `routing` config while `prefixDefaultLocale: false` causes Astro to redirect `/` → `/en/` → `/` → `/en/` infinitely.
**Why it happens:** These two settings are mutually exclusive. If English has no prefix, there is no `/en/` to redirect to.
**How to avoid:** Never set `redirectToDefaultLocale: true` when `prefixDefaultLocale: false`. Leave `redirectToDefaultLocale` unset (defaults to `false`) or set it explicitly to `false`.
**Warning signs:** The English homepage redirects instead of loading; Playwright smoke test for `/` times out.

### Pitfall 2: Translated Pages Without Hreflang Cause Duplicate Content Penalty

**What goes wrong:** `/pricing`, `/es/pricing`, `/fr/pricing`, `/de/pricing` exist without `<link rel="alternate" hreflang>`. Google indexes all four with equal weight and penalizes the whole domain for duplicate content.
**Why it happens:** Developers add translated pages first, plan to "add hreflang later." The SEO penalty starts accumulating immediately after the first crawl.
**How to avoid:** Hreflang tags ship in the same wave as the translated pages. They live in `Layout.astro` so they apply globally without per-page work.
**Warning signs:** Sitemap includes locale URLs but `<head>` has no `<link rel="alternate">` tags.

### Pitfall 3: `x-default` Omission

**What goes wrong:** Hreflang tags exist for `en`, `es`, `fr`, `de` but no `x-default`. Google shows the wrong locale variant to users outside those regions.
**Why it happens:** Developers think `hreflang="en"` covers English-language users globally. It does not — `x-default` is the fallback for all other users.
**How to avoid:** Always include a `hreflang="x-default"` pointing to the English URL alongside the four locale-specific tags.
**Warning signs:** Hreflang tags present but no `x-default` in the head output.

### Pitfall 4: React Islands Called with `astro:i18n` APIs

**What goes wrong:** A React island (e.g., `QRGeneratorIsland.tsx`) tries to import `getRelativeLocaleUrl` from `astro:i18n`. Build fails with "module not found" or the island shows English-only text.
**Why it happens:** `astro:i18n` is a server-side Astro virtual module. React islands run in the browser.
**How to avoid:** The parent `.astro` file calls `useTranslations()` and passes translated strings as props to islands. Islands never import `astro:i18n` directly.
**Warning signs:** Any `import ... from 'astro:i18n'` in a `.tsx` file.

### Pitfall 5: `@astrojs/sitemap` Does Not Auto-Detect i18n Config

**What goes wrong:** The `i18n` block is set in `astro.config.mjs` but the `sitemap()` integration has no `i18n` option. The sitemap omits alternate links and hreflang entries.
**Why it happens:** `@astrojs/sitemap` does not read from `i18n.locales` automatically. It requires its own separate `i18n` config block within the `sitemap({ i18n: { ... } })` call.
**How to avoid:** Always configure the `i18n` option inside the `sitemap()` call independently from the top-level `i18n` config. Keep both in sync.
**Warning signs:** Sitemap generates single `<url>` entries per page with no `xhtml:link` alternate tags.

### Pitfall 6: Translation Scope Creep — Use Cases Slugs Need Translation Decision

**What goes wrong:** `src/pages/use-cases/[slug].astro` generates individual use-case pages (e.g., `/use-cases/restaurant-menu`). There are ~10 slugs in `src/data/useCases.ts` (192 lines, ~5–10 entries), each with significant body text. Translating all slug pages is 10× the content volume of the hub page.
**Why it happens:** The requirement says "use cases page" which is ambiguous — index only, or index + all slugs.
**How to avoid:** Phase 23 scope is the **use cases index page only** (`/use-cases/`). Individual slug pages (`/use-cases/restaurant-menu/`, etc.) are English-only in v1.3. This aligns with the ~80–120 string estimate in SUMMARY.md. Slug translations are a v2 candidate.
**Warning signs:** Plan tasks include creating `src/pages/es/use-cases/[slug].astro`.

### Pitfall 7: Header Component Needs Lang Prop Threading

**What goes wrong:** `Header.astro` renders `Pricing` and `Use Cases` nav links as hardcoded English strings and hardcoded `/pricing` paths. On `/es/pricing`, the header still shows English text.
**Why it happens:** The Header component has no `lang` prop and does not use `useTranslations`.
**How to avoid:** Update `Header.astro` to accept a `lang` prop and call `useTranslations(lang)` for nav labels. Update nav links to use `getRelativeLocaleUrl(lang, '/pricing')` and `getRelativeLocaleUrl(lang, '/use-cases/')`. Every translated page must pass `lang` to `<Header lang="es" />`.
**Warning signs:** Translated pages show English nav text.

---

## Code Examples

Verified patterns from official sources:

### Astro i18n Config (from official docs)
```javascript
// astro.config.mjs
// Source: https://docs.astro.build/en/guides/internationalization/
i18n: {
  defaultLocale: 'en',
  locales: ['en', 'es', 'fr', 'de'],
  routing: {
    prefixDefaultLocale: false,
  },
},
```

### getLangFromUrl (from official recipe)
```typescript
// src/i18n/utils.ts
// Source: https://docs.astro.build/en/recipes/i18n/
export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}
```

### Hreflang in Layout (from official i18n guide)
```astro
<!-- In Layout.astro <head> -->
<!-- Source: https://docs.astro.build/en/guides/internationalization/ -->
<link rel="alternate" hreflang="en" href={getAbsoluteLocaleUrl('en', Astro.url.pathname)} />
<link rel="alternate" hreflang="es" href={getAbsoluteLocaleUrl('es', Astro.url.pathname)} />
<link rel="alternate" hreflang="fr" href={getAbsoluteLocaleUrl('fr', Astro.url.pathname)} />
<link rel="alternate" hreflang="de" href={getAbsoluteLocaleUrl('de', Astro.url.pathname)} />
<link rel="alternate" hreflang="x-default" href={getAbsoluteLocaleUrl('en', Astro.url.pathname)} />
```

### Sitemap i18n Config (from official docs)
```javascript
// Source: https://docs.astro.build/en/guides/integrations-guide/sitemap/
sitemap({
  i18n: {
    defaultLocale: 'en',
    locales: {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
    },
  },
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `astro-i18next` (i18next wrapper) | Astro native i18n routing + TypeScript dictionaries | Astro 4.0+ (2023) | i18next integration is no longer needed for Astro projects — native routing handles URL structure; TypeScript dictionaries handle string extraction |
| `@inlang/paraglide-astro` adapter | `@inlang/paraglide-js` Vite plugin (no adapter) | Paraglide 2.0 (2024) | The old adapter is removed; Paraglide 2.x uses a Vite plugin directly — but requires `output: "server"` for Astro |
| Manual sitemap entries per locale | `@astrojs/sitemap` `i18n` option | @astrojs/sitemap 3.x | The sitemap integration now generates hreflang entries automatically when `i18n` is configured |

**Deprecated/outdated:**
- `astro-i18next`: Last maintained 2023. Not compatible with Astro 5.
- `@inlang/paraglide-astro` (v1 adapter): Replaced by Vite plugin in Paraglide 2.x.
- `astro-i18n` (Alexandre-Fernandez): Last commit 2023, abandoned for Astro 4+.

---

## Open Questions

1. **Translation quality for ES/FR/DE strings**
   - What we know: ~80–120 strings across 3 pages + shared nav/footer
   - What's unclear: Machine translation (DeepL/Google Translate) vs. human review — quality decision is a product call, not a technical one
   - Recommendation: Use machine translation for v1.3 (acceptable for marketing copy); flag translation keys for human review as a follow-up task

2. **`use-cases/[slug]` translation scope**
   - What we know: `useCases.ts` has ~10 entries with 2–4 body sections each; translating all slugs would be ~200–400 additional strings
   - What's unclear: Whether the requirement "use cases page" includes individual slug pages
   - Recommendation: Translate the use-cases index page only. Individual slug pages are English-only in v1.3. This is the safest interpretation of the ~80 string estimate.

3. **Paraglide 2.x SSG spike (from STATE.md pending todos)**
   - What we know: The STATE.md says "validate Paraglide 2.x Vite plugin setup with Astro 5 hybrid output mode in a spike before writing translation strings"
   - What's updated: Research now confirms Paraglide 2.x requires `output: "server"` for its Astro integration. SSG workaround exists but adds unnecessary complexity. Decision: use native Astro dictionaries instead. The spike is no longer needed.
   - Recommendation: Remove the Paraglide spike todo from STATE.md pending todos during Wave 0.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — purely code/config changes within the existing Astro 5 + Vercel static deployment).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` (exists) |
| Quick run command | `npm run test:smoke` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| I18N-01 | `/es/`, `/fr/`, `/de/` return HTTP 200 with locale-specific content visible | smoke | `npm run test:smoke` — new test in `tests/i18n.spec.ts` | ❌ Wave 0 |
| I18N-01 | Key strings (h1 titles) differ between `/` and `/es/` | smoke | `npm run test:smoke` | ❌ Wave 0 |
| I18N-02 | Language switcher visible in header on all marketing pages | smoke | `npm run test:smoke` | ❌ Wave 0 |
| I18N-02 | Clicking language switcher navigates to correct locale URL | smoke | `npm run test:smoke` | ❌ Wave 0 |
| I18N-03 | `<link rel="alternate" hreflang="es">` present in `<head>` on homepage | smoke | `npm run test:smoke` | ❌ Wave 0 |
| I18N-03 | `<link rel="alternate" hreflang="x-default">` present | smoke | `npm run test:smoke` | ❌ Wave 0 |
| I18N-03 | Sitemap XML contains `xhtml:link` alternate entries | smoke | `npm run test:smoke` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:smoke`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/i18n.spec.ts` — covers I18N-01, I18N-02, I18N-03 with @smoke tag

*(Existing test infrastructure covers all other phases; only the new i18n spec file is needed)*

---

## Sources

### Primary (HIGH confidence)
- Astro i18n Routing guide — https://docs.astro.build/en/guides/internationalization/ — config options, `prefixDefaultLocale`, `Astro.currentLocale`, `getRelativeLocaleUrl`, `getAbsoluteLocaleUrl`
- Astro i18n Recipe — https://docs.astro.build/en/recipes/i18n/ — TypeScript dictionary pattern, `useTranslations()` helper, `getLangFromUrl()`, React island prop-passing pattern
- @astrojs/sitemap docs — https://docs.astro.build/en/guides/integrations-guide/sitemap/ — `i18n` option, `xhtml:link` generation, manual configuration requirement
- Paraglide JS SSG docs — https://inlang.com/m/gerre34r/library-inlang-paraglideJs/static-site-generation — confirms SSG workaround exists; `setLocale()` in middleware with `context.currentLocale`
- Paraglide JS Astro docs — https://inlang.com/m/gerre34r/library-inlang-paraglideJs/astro — confirms `output: "server"` is the documented Astro integration mode; "SSG is not yet supported out of the box"

### Secondary (MEDIUM confidence)
- npm registry — `@inlang/paraglide-js` 2.15.1 current as of 2026-03-31 (confirmed via `npm view`)
- npm registry — `astro` 5.17.1 current as of 2026-03-31 (confirmed via `npm view`)

### Tertiary (LOW confidence)
- None — all critical claims verified against official Astro and Paraglide documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Native Astro i18n verified in official docs; Paraglide server requirement confirmed in official Paraglide docs; `@astrojs/sitemap` i18n option verified in official docs
- Architecture: HIGH — All patterns from official Astro i18n guide and recipe documentation
- Pitfalls: HIGH (routing pitfalls verified in official docs) / MEDIUM (translation scope estimate based on codebase inspection)

**Research date:** 2026-03-31
**Valid until:** 2026-05-01 (Astro i18n API is stable; Paraglide's SSG status may improve — recheck if timeline slips past April)
