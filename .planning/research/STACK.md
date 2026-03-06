# Technology Stack

**Project:** QRCraft
**Researched:** 2026-03-06
**Research Mode:** Ecosystem

---

## Recommended Stack

### QR Code Generation Library

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `qr-code-styling` | ^1.6.0 | Core QR rendering — canvas + SVG output, full customization | The dominant library for styled QR codes. Supports dot shapes (rounded, dots, classy, classy-rounded, square, extra-rounded), corner square styles, corner dot styles, color gradients (linear/radial), embedded images/logos, and both Canvas and SVG output modes. Framework-agnostic. No backend needed. Actively maintained. |

**Why not alternatives:**
- `qrcode` (npm: `qrcode`) — the other high-download library — generates only plain black-and-white QR codes. Zero customization for dot styles, colors, or logos. Good for server-side/programmatic use, wrong for a consumer UI tool.
- `node-qrcode` — same as above; server-oriented.
- `easyqrcodejs` — feature-rich but less maintained post-2023, API is more verbose, smaller community.
- `qrcode.react` — React-specific wrapper around `qrcode`. No dot-style customization. Wrong fit.
- `react-qr-code` — SVG-only, no customization beyond foreground/background. Too limited.

**Confidence:** HIGH — `qr-code-styling` is the industry standard for styled QR codes on the client side as of 2025.

---

### Frontend Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Astro** | ^4.x | Static site framework, page routing, SSG | Ships zero JS by default. HTML-first. Excellent SEO. Supports React/Vue/Svelte islands if needed. Perfect for a content + tool hybrid site. Fast build output. |
| **React** | ^18.x | Interactive UI components (the generator form, preview panel) | Used as Astro islands — only interactive components hydrate JS. Ecosystem is enormous; `qr-code-styling` has first-class React wrappers. |
| **TypeScript** | ^5.x | Type safety across all code | No reason not to. Astro, React, and `qr-code-styling` all have full TypeScript support. |

**Why Astro over alternatives:**

- **Next.js**: Overkill for a static tool site. Adds server complexity, larger bundle, harder to deploy to GitHub Pages/Netlify without adapters. SEO is excellent but you don't need SSR here.
- **Vite + React SPA**: Fast DX but no built-in SSG/SSR. An SPA serves a blank `<div>` to crawlers unless you add a pre-rendering layer — bad for SEO without extra config.
- **Nuxt / Vue**: Fine technically but React has better `qr-code-styling` integration and wider hiring/community pool.
- **Vanilla JS**: Valid for a small tool, but adds friction for live-preview state management, form binding, and future extensibility. React islands in Astro give you the reactive form experience without sacrificing SEO.
- **SvelteKit**: Solid choice, but React is better tested with `qr-code-styling` and ecosystem support is larger.

**Confidence:** HIGH for Astro. HIGH for React. Astro+React is a well-established combo for content+tool hybrid sites as of 2025.

---

### Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Tailwind CSS** | ^3.4.x | Utility-first CSS | No custom CSS overhead. Consistent spacing/color system. Works natively with Astro. Minimal runtime (purged at build). The fastest path to polished UI without a component library. |

**Why not alternatives:**

- **CSS Modules**: Fine but verbose for a UI-heavy form. No design system built in.
- **Styled-components / Emotion**: Runtime-in-JS CSS doesn't pair well with Astro's zero-JS ethos.
- **shadcn/ui** (built on Radix + Tailwind): Could be added for accessible UI primitives (sliders, color pickers, tabs). Add it if form complexity warrants pre-built accessible components; keep optional for MVP.

**Confidence:** HIGH.

---

### Export / Download

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Built-in browser APIs | — | PNG download, SVG download, clipboard copy | `qr-code-styling` exposes `.download({ name, extension })` for PNG and SVG. For clipboard: `navigator.clipboard.write()` with a `ClipboardItem` containing a PNG `Blob`. No extra library needed. |

**Details by export format:**

- **PNG download**: `qrCode.download({ name: 'qrcraft', extension: 'png' })` — uses canvas `toBlob()` internally, triggers `<a>` download.
- **SVG download**: `qrCode.download({ name: 'qrcraft', extension: 'svg' })` — serializes the SVG DOM to a Blob.
- **Clipboard copy**: `canvas.toBlob()` → `new ClipboardItem({ 'image/png': blob })` → `navigator.clipboard.write([item])`. Requires HTTPS (true on Vercel/Netlify). Browser support: Chromium excellent, Firefox limited on clipboard image write (workaround: canvas fallback or message user).

**Confidence:** HIGH for PNG/SVG. MEDIUM for clipboard (Firefox compatibility requires graceful fallback).

---

### SEO

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Astro built-in | — | Static HTML output, `<head>` management | Astro renders full HTML pages server-side at build. Every page ships real HTML to crawlers — no JS required to see content. |
| `@astrojs/sitemap` | ^3.x | Auto-generated sitemap.xml | One-line integration. Required for Google indexing. |
| JSON-LD via `<script type="application/ld+json">` | — | Structured data for rich results | Manual inline JSON-LD in Astro's `<head>` slot. Use `WebApplication` schema. Zero library overhead. |

**SEO requirements from PROJECT.md**: meta tags, structured data, page speed, semantic HTML — all satisfied by Astro SSG + sitemap integration + manual JSON-LD.

**Confidence:** HIGH.

---

### Build Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Vite** | ^5.x | Dev server, bundler | Astro uses Vite internally. Fast HMR. No separate config needed. |
| **pnpm** | ^9.x | Package manager | Faster installs, better disk usage than npm. Works natively with Astro. Lockfile ensures reproducible installs. |

**Confidence:** HIGH.

---

### Deployment

| Technology | Purpose | Why |
|------------|---------|-----|
| **Vercel** (recommended) | Static hosting + CDN | Zero-config Astro deployment. Global edge CDN. Preview deployments on PRs. Free tier covers a public tool site. Astro has an official Vercel adapter (though not needed for static output — just `output: 'static'` in astro.config). |
| **Netlify** (alternative) | Static hosting + CDN | Same capabilities. Slightly more complex redirect config. Either works. |
| **GitHub Pages** (fallback) | Static hosting | Works but no preview deployments, slower CDN, manual GitHub Actions pipeline needed. |

**Recommendation:** Vercel. Deploy by connecting the GitHub repo. `astro build` output goes to `dist/`. Done.

**Confidence:** HIGH.

---

## Complete Dependency List

### Runtime

```bash
pnpm add qr-code-styling react react-dom
pnpm add @astrojs/react
```

### Dev / Build

```bash
pnpm add -D astro @types/react @types/react-dom typescript tailwindcss @astrojs/tailwind @astrojs/sitemap
```

### Optional (add if form complexity grows)

```bash
# Accessible UI primitives
pnpm add @radix-ui/react-slider @radix-ui/react-tabs @radix-ui/react-tooltip

# OR full shadcn/ui setup (Tailwind + Radix + class-variance-authority)
# Follow: https://ui.shadcn.com/docs/installation/astro
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| QR library | `qr-code-styling` | `qrcode` | No dot/corner/logo customization |
| QR library | `qr-code-styling` | `easyqrcodejs` | Less maintained, verbose API |
| Framework | Astro + React islands | Next.js | Server complexity, overkill for static tool |
| Framework | Astro + React islands | Vite SPA | SPA = blank HTML for crawlers, SEO penalty |
| Framework | Astro + React islands | SvelteKit | Smaller ecosystem, less `qr-code-styling` integration |
| CSS | Tailwind CSS | CSS Modules | More verbose, no design system |
| CSS | Tailwind CSS | Styled-components | Runtime CSS conflicts with Astro zero-JS |
| Deployment | Vercel | GitHub Pages | No preview deploys, slower CDN |

---

## Version Currency Note

Training data cutoff: August 2025. Versions listed are latest-known as of that date.

**Verify before installing:**
- `qr-code-styling`: check npm for latest (was 1.6.0 in 2024; any breaking changes in major version)
- `astro`: v4.x was current mid-2025; v5.x may exist — check astro.build/changelog
- `tailwindcss`: v4.0 was in beta mid-2025 with significant API changes — verify stable release status before using; if v4 is released and stable, migration guide differs from v3

**Confidence for versions:** MEDIUM — architecture choices are HIGH confidence, specific patch versions need npm verification at project start.

---

## Sources

- `qr-code-styling` GitHub: https://github.com/kozakdenys/qr-code-styling (training data, HIGH confidence for feature set)
- Astro documentation: https://docs.astro.build (training data, HIGH confidence for SSG/island architecture)
- Astro + React integration: https://docs.astro.build/en/guides/integrations-guide/react/ (training data, HIGH confidence)
- `@astrojs/sitemap`: https://docs.astro.build/en/guides/integrations-guide/sitemap/ (training data, HIGH confidence)
- Clipboard API MDN: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write (training data, MEDIUM confidence for browser compatibility)
- Tailwind CSS v4 release status: verify at https://tailwindcss.com/blog — v4 was in beta as of training cutoff
