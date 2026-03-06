# Project Research Summary

**Project:** QRCraft
**Domain:** Client-side QR code generator website (SEO-first, static)
**Researched:** 2026-03-06
**Confidence:** MEDIUM-HIGH

## Executive Summary

QRCraft is a pure client-side, static web application — no backend required for any core function. QR generation, logo compositing, and file export all happen in the browser using `qr-code-styling` (the dominant styled-QR library) and native Canvas/SVG APIs. The recommended stack is Astro (SSG framework for SEO-first HTML output) with React islands for the interactive generator, Tailwind CSS for styling, and Vercel for deployment. This combination delivers a fast-loading, crawler-friendly product without sacrificing the reactive UI needed for live QR preview. The architecture is well-understood and the technology choices are conservative — all libraries are mature and the patterns are established.

The product competes primarily on speed, cleanliness, and visual output quality. The biggest table-stakes differentiators are: instantaneous live preview (no submit button), SVG export as a first-class citizen, logo embed with gradient support, and zero friction (no signup, no watermarks). The competitive gap to own is the combination of a clean/fast UI with full visual customization — most competitors are either feature-complete but cluttered, or clean but limited. QRCraft should be both.

The highest-risk areas are not architectural but behavioral: QR scannability under customization (logo coverage, inverted colors, gradient contrast at finder squares), correct encoding for structured content types (WiFi SSID escaping, vCard RFC compliance), and canvas security restrictions that silently break PNG/SVG export when cross-origin logo images are involved. These pitfalls are well-documented and fully preventable, but only if they are addressed at implementation time — not retrofitted. The recommended mitigation strategy is to enforce constraints automatically (force EC=H when logo is present, validate color contrast, use file upload not URL input for logos) rather than relying on user awareness.

---

## Key Findings

### Recommended Stack

The core generation library is `qr-code-styling` (^1.6.0) — the industry standard for styled QR codes in the browser. It supports all required customization features: dot shapes, eye styles, color gradients, logo embedding, and both Canvas and SVG output modes. No alternatives come close in the combination of active maintenance and feature breadth for a consumer UI tool.

The framework choice is Astro (^4.x) with React (^18.x) islands. Astro provides full HTML output at build time — pages are real HTML for crawlers, satisfying SEO requirements without any additional configuration. React islands hydrate only the generator UI, keeping JS bundle size minimal for the static content around the tool. TypeScript (^5.x) is standard across all layers. Tailwind CSS (^3.4.x) handles styling. Build tooling is Vite (embedded in Astro) with pnpm. Deployment target is Vercel (zero-config, preview deploys, global CDN, free tier sufficient).

**Core technologies:**
- `qr-code-styling` ^1.6.0: QR rendering (Canvas + SVG, full customization) — only library with full dot/eye/logo/gradient support
- Astro ^4.x: SSG framework — ships zero-JS HTML by default; perfect for SEO + tool hybrid
- React ^18.x: Interactive islands — live preview, form controls, export buttons
- TypeScript ^5.x: Type safety — native support across all stack layers
- Tailwind CSS ^3.4.x: Utility CSS — fast UI iteration, purged at build, no runtime overhead
- Vercel: Deployment — zero-config Astro, global edge CDN, preview deploys on PRs
- `@astrojs/sitemap` ^3.x: Sitemap — required for Google indexing, one-line integration

### Expected Features

**Must have (table stakes):**
- URL QR generation with live preview — the primary use case; zero friction, no submit button
- Plain text QR — second most common type; trivially added once URL works
- Foreground and background color customization — minimum expected customization
- Error correction level selection — required for power users and logo embedding
- PNG download — universal export format
- Free with no signup — auth-wall means immediate abandonment
- Mobile-responsive layout — 50%+ of traffic is mobile; also a Core Web Vitals signal
- Fast page load (lean JS) — directly impacts SEO rankings for competitive queries

**Should have (competitive differentiators):**
- Logo/image embed in QR center — single biggest visual differentiator; requires EC=H enforcement
- Dot shape + eye style customization — produces "designer QR" vs plain black squares
- Color gradients (foreground, linear and radial) — high visual impact, medium complexity
- SVG download — vector export for print-quality output; high value given client-side architecture
- WiFi credential QR codes — good SEO keyword target, low implementation complexity
- vCard / contact info QR — business card use case; more UI fields but well-understood encoding
- Copy to clipboard — near-zero effort, noticeable UX improvement
- WCAG AA accessibility — keyboard navigation, labeled controls; most competitors fail here

**Defer (v2+):**
- Frame/CTA text ("Scan Me" border) — polish, not core
- SMS / email / geo / calendar content types — expand SEO surface area post-launch
- Presets/templates — requires curating quality defaults
- Share link (settings encoded in URL hash) — useful but not blocking
- Batch/bulk generation — agency use case, high complexity
- Dynamic QR codes (redirect URLs) — requires backend, separate product tier

**Anti-features (explicitly avoid):**
- User accounts in v1 — adds GDPR surface area, infra cost, and auth friction for no benefit
- Watermarks on free tier — destroys value proposition
- Paid-only SVG export — users expect SVG free; paywalling it drives traffic to competitors
- Dynamic QR infrastructure — massive scope; separate product decision

### Architecture Approach

QRCraft is a three-layer client-side system: Input Layer (ContentForm + StyleControls + LogoUpload), Render Pipeline (QRMatrixGenerator + CanvasRenderer + SVGRenderer + LogoCompositor + LivePreview), and Export Pipeline (ExportController). A single reactive AppState object is the source of truth. Changes to state trigger a debounced render pipeline (300ms for text input, 100ms for style controls), which updates the live preview. Export actions trigger a separate high-resolution render to an off-screen canvas.

**Major components:**
1. AppState — single reactive object: content (type + fields + encoded value) + style (dotShape, eyeShape, foreground, background, gradient, errorCorrection) + logo (dataUrl, sizeRatio)
2. RenderPipeline — orchestrates matrix generation → canvas/SVG rendering → logo compositing → preview update; triggered by debounced state changes; never called directly from event handlers
3. ContentForm — collects and validates per-type input (URL, text, WiFi fields, vCard fields); delegates encoding to per-type pure encoder functions
4. StyleControls — color pickers, gradient toggles, dot shape selector, eye style selector; validates contrast before updating state
5. LogoUpload — file input only (no URL input to avoid canvas taint); converts to data URL on upload; triggers auto-set of EC=H
6. ExportController — separate high-res canvas render for PNG; SVG string serialization for SVG; ClipboardItem for clipboard; feature-detects clipboard API before offering copy
7. SEOLayer — static Astro page shell: semantic HTML, meta tags, JSON-LD structured data, FAQ section with FAQPage schema; built independently of React islands

**Key patterns:**
- Dual rendering: SVG for live preview (crisp on HiDPI), Canvas for PNG export and clipboard
- Pure functions for matrix generation and content encoding — testable without UI
- File upload only for logos (prevents canvas taint completely)
- Content type encoders as a lookup table — extensible to new types without architectural changes

### Critical Pitfalls

1. **Logo coverage breaks scannability** — Force EC=H automatically when a logo is uploaded; enforce 20-25% max area (not 30% — the spec's limit does not account for finder pattern preservation); never let the logo touch corner squares. Test with printed output on mid-range Android in poor lighting, not just browser BarcodeDetector.

2. **Canvas taint blocks download silently** — Use file upload exclusively for logo input (no URL input). Local File objects are never cross-origin, eliminating the taint risk entirely. If URL input is ever added, proxy it through a serverless function to same-origin.

3. **SVG export may be raster-in-SVG** — Verify `qr-code-styling` produces true vector output (paths/rects, not `<image>` wrappers) before relying on it. Open the exported SVG in a text editor to confirm. Also: ensure logo in SVG export uses data URL (not object URL), otherwise the logo breaks when the file is opened later.

4. **Inverted colors and low-contrast gradients break scans** — Validate that foreground luminance is darker than background (minimum 3:1 contrast ratio). For gradients, ensure the gradient endpoints at the finder square corners remain dark enough. Lock corner finder squares to solid dark color regardless of gradient settings.

5. **vCard and WiFi encoding bugs surface only in edge cases** — Write dedicated encoder functions (not string concatenation) for each content type. Unit-test with edge cases: SSID with quotes and backslashes, vCard name with comma and semicolon. WiFi format per ZXing spec: `WIFI:T:WPA;S:<SSID>;P:<password>;;` with backslash escaping.

---

## Implications for Roadmap

Based on combined research, the architecture's build order (state → matrix generator → renderer → preview → customization → export → SEO shell) maps cleanly to product phases. The critical path is short: AppState + matrix generator + basic canvas renderer + live preview = working prototype with 4 focused tasks. Everything else is incremental.

### Phase 1: Foundation — Project Setup and SEO Shell

**Rationale:** SEO page structure has no runtime dependencies — it can be built in parallel with the interactive components and must be correct before launch. URL architecture and meta tags are hard to change after Google indexing. Astro project initialization, Tailwind setup, and the static HTML shell with structured data belong here. Script loading strategy (defer/module for QR library) must also be set now, not retrofitted.

**Delivers:** Deployable Astro site with correct page structure, meta tags, Open Graph, JSON-LD WebApplication schema, FAQ section with FAQPage schema, static og:image, and sitemap. Passes Lighthouse SEO audit. QR generator area is a placeholder.

**Addresses:** Fast page load (table stakes), SEO requirements, social sharing preview (og:image)

**Avoids:** SEO cannibalization from wrong URL structure (Pitfall 4); missing og:image killing social CTR (Pitfall 13); QR library blocking FCP (Pitfall 11)

**Research flag:** Standard patterns — skip phase research. Astro SSG + sitemap + JSON-LD are well-documented.

---

### Phase 2: Core Generator — URL QR with Live Preview

**Rationale:** This is the critical path. AppState definition must come first (everything depends on the state shape). Then matrix generation (pure function, testable immediately), basic canvas renderer, and live preview. This phase delivers an end-to-end working QR generator for URL input. All subsequent phases build on this foundation.

**Delivers:** Working URL → live QR preview with debounced re-render. Fixed-size preview container (prevents layout shift). Basic square dots, solid foreground/background color. No export yet.

**Addresses:** URL QR generation (table stakes #1), live preview (table stakes #2), fast/instant generation

**Avoids:** Input lag and layout shift from unbounded re-render (Pitfall 5); wrong quiet zone default (Pitfall 7 — verify library default is 4 modules, set explicitly)

**Research flag:** Standard patterns — skip phase research. Debounce + fixed canvas container is well-established.

---

### Phase 3: Content Types — Text, WiFi, vCard

**Rationale:** Once the core generator works, adding content types is low-risk extension. Plain text is trivial. WiFi and vCard require dedicated encoder functions with proper escaping. Building encoders as pure functions early (before any customization complexity) keeps them isolated and testable. Unit tests for edge cases belong in this phase.

**Delivers:** Content type selector (URL / Text / WiFi / vCard) with type-specific form fields. Each type produces a correctly encoded QR payload. Encoders unit-tested with edge cases.

**Addresses:** Plain text QR (table stakes), WiFi QR (differentiator + SEO keyword), vCard QR (business card use case)

**Avoids:** WiFi encoding bugs with special characters (Pitfall 8 — ZXing spec backslash escaping); vCard field escaping per RFC 6350 (Pitfall 8)

**Research flag:** Standard patterns for URL/text. WiFi and vCard encoding has known spec rules — no additional research needed, but unit tests are mandatory.

---

### Phase 4: Visual Customization — Colors, Shapes, Gradients

**Rationale:** The visual customization features (dot shapes, eye styles, color pickers, gradients) are what differentiate QRCraft from basic generators. They build on the render pipeline established in Phase 2. Contrast validation must be built alongside color pickers, not added later.

**Delivers:** Dot shape selector (square, rounded, dots, classy, extra-rounded), eye/corner style selector, foreground/background color pickers with contrast validation, gradient toggle (linear/radial with start/end color and angle). All changes trigger debounced live preview update.

**Addresses:** Color customization (table stakes), dot/eye shape customization (differentiator), gradients (differentiator), error correction level selector

**Avoids:** Inverted color QR codes that fail to scan (Pitfall 6 — luminance validation on color picker change); gradient corners too light for finder squares (Pitfall 12 — lock corner squares to solid dark)

**Research flag:** Standard patterns — skip phase research. `qr-code-styling` API is well-documented for these features.

---

### Phase 5: Logo Embedding

**Rationale:** Logo embedding is the single most impactful differentiator and also the highest-risk feature from a scannability perspective. It must be a dedicated phase because: (1) it requires EC=H enforcement logic, (2) it extends both the canvas and SVG render paths (LogoCompositor), and (3) the file-upload-only strategy (to prevent canvas taint) must be a deliberate decision, not an afterthought.

**Delivers:** Logo file upload (file input only, no URL input). Automatic EC=H enforcement when logo is present. Logo size ratio control (default 20%, max 25%). Canvas compositing for preview and PNG export. SVG `<image>` embedding using data URL for vector export. Warning if logo approaches size limit.

**Addresses:** Logo embed (top differentiator), error correction level auto-management

**Avoids:** Logo coverage breaking scannability (Pitfall 1 — force H, enforce 20-25% max); canvas taint blocking download (Pitfall 2 — file upload only, never URL input); object URL in SVG export breaking downloaded files (Architecture anti-pattern 2)

**Research flag:** Logo compositing patterns are well-documented. The EC=H constraint is from ISO spec. No additional research needed — enforce the constraints as specified.

---

### Phase 6: Export Pipeline — PNG, SVG, Clipboard

**Rationale:** Export is the last core feature because it depends on both render paths (canvas for PNG/clipboard, SVG for vector export) being stable. High-resolution PNG export requires a separate off-screen canvas from the live preview canvas. SVG quality must be verified (true vector, not raster-in-SVG) before this phase ships. Clipboard requires feature detection and graceful degradation.

**Delivers:** PNG download at 3x display resolution (minimum 900px, ideally 1200px option). SVG download as true vector (verify library output format). Copy to clipboard with ClipboardAPI feature detection and fallback modal for unsupported browsers (Firefox image clipboard). Clear user-facing error if any export fails.

**Addresses:** PNG download (table stakes), SVG download (differentiator), copy to clipboard (differentiator)

**Avoids:** Low-resolution PNG for print (Pitfall 9 — render at 3-4x on hidden canvas); SVG as raster-in-SVG (Pitfall 3 — verify library output in text editor); clipboard failure in Firefox/HTTP (Pitfall 10 — feature detect, implement fallback)

**Research flag:** Verify `qr-code-styling` SVG output format before committing to the export implementation. This is a one-time check, not a research sprint.

---

### Phase 7: Polish and Launch Readiness

**Rationale:** Final phase collects UX polish items that improve conversion and completeness without being blocking for core functionality. Dark mode, accessibility audit, performance tuning, and content type expansion (SMS, email, geo) all belong here.

**Delivers:** Dark mode (CSS variables), WCAG AA accessibility pass (keyboard navigation, ARIA labels, labeled form controls), Lighthouse 90+ on mobile, additional content types (SMS, email, geo) as low-effort SEO surface area expansion, "how it works" page section, FAQ section populated with real questions.

**Addresses:** WCAG AA (differentiator), fast page load (table stakes), mobile-responsive layout (table stakes)

**Avoids:** Lighthouse CLS above 0.1 from preview resize (confirm fixed container from Phase 2 holds); script loading blocking FCP (confirm defer/module from Phase 1)

**Research flag:** Standard patterns — skip phase research.

---

### Phase Ordering Rationale

- Phase 1 (Foundation) runs partially in parallel with Phase 2 — the static shell and the React island are independent tracks that merge when the generator component is mounted in the page
- Phases 2-3 (Core + Content Types) establish pure functions that all later phases depend on — shortcutting this order causes retrofits
- Phase 4 (Customization) must come before Phase 5 (Logo) because EC=H is part of the style layer; logo logic reads from the style state
- Phase 5 (Logo) must come before Phase 6 (Export) because logo compositing affects both render paths that the export controller uses
- Phase 6 (Export) is the final core feature — once it ships, the product is functionally complete
- Phase 7 (Polish) can be partially parallelized: accessibility work can start during Phase 4-5, dark mode during any phase

### Research Flags

Phases needing deeper research during planning:
- None identified. All phases follow established patterns with well-documented APIs. The key unknowns are implementation-time verification tasks, not research questions.

Phases with standard patterns (skip research-phase):
- **All phases** — Astro, React, `qr-code-styling`, Canvas API, SVG export, Clipboard API, and QR encoding specs are all well-documented with high-confidence sources. The pitfalls are known and the preventions are specified.

Implementation-time verification tasks (not research sprints):
- Verify `qr-code-styling` SVG output is true vector (open exported SVG in text editor, confirm no `<image>` wrapper) — Phase 6
- Verify library default quiet zone is 4 modules; set explicitly if not — Phase 2
- Verify Tailwind CSS v4 stable release status before installing (was in beta at training cutoff) — Phase 1

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | `qr-code-styling` is the clear industry standard; Astro + React is a well-established combination; all deployment options are proven. Specific patch versions need npm verification at project start. Tailwind v4 status needs confirmation. |
| Features | MEDIUM | Core table stakes are stable and well-established. Competitive landscape observations are from training data (mid-2025); should be spot-checked against current competitors before final feature prioritization. |
| Architecture | HIGH | Three-layer client-side architecture is well-established for this class of tool. Dual renderer (SVG preview + Canvas export), debounce patterns, and logo compositing approach are all proven. EC=H constraint is from ISO spec. |
| Pitfalls | HIGH | Canvas taint, QR EC spec constraints, WiFi/vCard encoding specs, Clipboard API browser support, and SEO cannibalization patterns are all well-documented with authoritative sources. Library-specific defaults (quiet zone) need implementation-time verification. |

**Overall confidence:** HIGH for architecture and technology decisions. MEDIUM for competitive feature prioritization (verify against live competitors before roadmap is finalized).

### Gaps to Address

- **Tailwind CSS v4 stability:** Was in beta at training cutoff (August 2025). Verify whether v4 is stable before using; if it is, the API differs significantly from v3. If still in flux, use v3.4.x.
- **Astro version currency:** v4.x was current mid-2025; v5.x may exist. Check astro.build/changelog at project start and adjust.
- **`qr-code-styling` SVG output quality:** Must verify the library produces true vector SVG (not raster-in-SVG) before committing to SVG export as a feature. This is a 5-minute check, not a blocker.
- **Competitor feature set verification:** FEATURES.md was written from training knowledge. Before finalizing the roadmap, manually check qrcode-monkey.com and qr-code-generator.com for any features that have become table stakes since mid-2025.
- **Firefox clipboard image support:** Noted as unsupported as of 2025 training data. Verify current status — if Firefox has added `ClipboardItem` image support, the fallback modal can be simplified.

---

## Sources

### Primary (HIGH confidence)
- ISO/IEC 18004:2015 — QR code error correction level capacities, quiet zone requirements, module definitions
- ZXing WiFi QR format specification — WiFi credential encoding rules (`WIFI:T:WPA;S:...;P:...;;`)
- RFC 6350 (vCard 4.0) / RFC 2426 (vCard 3.0) — vCard field escaping rules
- HTML Living Standard, Canvas API — CORS taint security model for cross-origin images
- W3C Clipboard API specification — `navigator.clipboard.write()` secure context requirement
- Google Search Central — Core Web Vitals (CLS, LCP), structured data for WebApplication/FAQPage
- WCAG 2.1 SC 1.4.11 — 3:1 minimum contrast ratio for graphical objects

### Secondary (MEDIUM confidence)
- `qr-code-styling` GitHub (kozakdenys/qr-code-styling) — feature set, API, output modes (training data, HIGH confidence for feature set, MEDIUM for current version)
- Astro documentation (docs.astro.build) — SSG behavior, React integration, sitemap plugin (training data, HIGH confidence)
- Competitive landscape analysis: qrcode-monkey.com, qr-code-generator.com, the-qrcode-generator.com, canva.com/qr-code-generator (training data, MEDIUM — verify against live sites)
- MDN Web Docs — Clipboard API browser compatibility matrix (training data, MEDIUM — verify Firefox support status)

### Tertiary (LOW confidence)
- Debounce timing conventions (300ms text, 100ms style controls) — community convention, not specification; tune by feel during implementation
- Tailwind CSS v4 release status — was in beta at training cutoff; verify before use

---

*Research completed: 2026-03-06*
*Ready for roadmap: yes*
