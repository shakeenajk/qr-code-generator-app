# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-11
**Phases:** 6 | **Plans:** 23

### What Was Built

- Crawlable Astro 5 + Tailwind v4 static site with complete SEO instrumentation (JSON-LD, OG, sitemap, robots.txt)
- Live QR generator for URL, plain text, WiFi, and vCard content types with debounced preview and stable layout
- Full visual customization: dot/eye shapes, foreground/background colors, linear/radial gradients, WCAG AA contrast gate
- Logo embedding with automatic ECL=H and 25% area cap enforced in island, not component
- PNG (3×), true vector SVG, and clipboard export pipeline
- Complete dark mode via Tailwind `dark:` classes; Lighthouse mobile performance score: 100

### What Worked

- **TDD Wave 0 pattern**: Writing failing smoke tests before implementation created a clear, verifiable contract and made plan completion unambiguous
- **Coarse granularity**: 6 phases instead of the 7 suggested by research kept context resets low and execution fast (5 days total)
- **Single source of truth**: FAQ_ITEMS used in both JSON-LD FAQPage schema and visible FAQ component — prevented schema/content drift throughout
- **client:visible hydration**: Single hydration strategy change was the key contributor to Lighthouse 100 — simple and high-leverage
- **Opacity toggle for ghost placeholder**: Avoided layout shift and qr-code-styling remount; cleaner than conditional render

### What Was Inefficient

- **Phases 2 and 4 plan counts mismatched ROADMAP**: ROADMAP showed some plans as `[ ]` incomplete in the progress table mid-milestone, creating confusion during audit
- **Nyquist validation not fully signed off**: All 6 phases have `nyquist_compliant: false` in VALIDATION.md — a recurring debt item that was deferred rather than resolved
- **Dark mode required a dedicated gap-closure phase (Phase 5)**: Phase 4's dark mode scope was incomplete; Features and FAQ sections needed a follow-up phase

### Patterns Established

- Wave 0 TDD stubs with `data-*` selector contract before any implementation
- `@smoke` tag embedded in test names for `--grep @smoke` CLI flag compatibility
- Island owns all state; tab/section components are fully controlled (no internal React state)
- ECL and logo size constraints delegated to the island, not the LogoSection component
- Negative assertion pattern for dark mode stubs: assert NOT white AND NOT gray-50 (both RGB and OKLCH) so tests fail until dark: classes applied

### Key Lessons

1. **Astro + Tailwind v4 + React islands is a solid stack for SEO-first static tools** — no friction with deployment, and `client:visible` makes Lighthouse scores trivial
2. **Canvas taint kills logo URL input** — file upload is the right default; document this early in future projects using canvas-based rendering
3. **Protocol encoders always produce non-empty strings** — WiFi/vCard empty state detection must check raw field values, not the encoded output
4. **Gap closure phases are cleaner than expanding scope of existing phases** — Phases 5 and 6 were small, focused, and completed in minutes each

### Cost Observations

- Model mix: primarily Sonnet (balanced profile)
- Sessions: ~10 estimated across 5 days
- Notable: coarse granularity + Wave 0 TDD kept per-session context clean

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Days | Lighthouse | Notes |
|-----------|--------|-------|------|------------|-------|
| v1.0 MVP | 6 | 23 | 5 | 100 | First release; gap closure phases added mid-milestone |
