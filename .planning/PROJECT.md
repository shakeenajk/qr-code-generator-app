# QRCraft

## What This Is

QRCraft is a free, public-facing QR code generator that lets anyone create fully customized, visually branded QR codes in seconds and download them immediately. It targets marketers, business owners, and individuals who want beautiful QR codes without design software or signup friction. Shipped as a fast static site optimized for Google search.

## Core Value

Anyone can generate a visually stunning, fully customized QR code and download it immediately — no signup, no friction.

## Requirements

### Validated

- ✓ User can generate QR codes for URL, plain text, WiFi credentials, and vCard/contact info — v1.0
- ✓ User can customize QR code colors and gradients (foreground, background, linear/radial) — v1.0
- ✓ User can embed a logo/image in the center of the QR code (ECL=H, 25% area cap) — v1.0
- ✓ User can choose dot/module shapes (square, rounded, dots, classy) — v1.0
- ✓ User can choose corner eye frame and pupil styles — v1.0
- ✓ User can preview the QR code live as they change settings (debounced, no layout shift) — v1.0
- ✓ User can download the QR code as PNG (3× resolution for print) — v1.0
- ✓ User can download the QR code as true vector SVG — v1.0
- ✓ User can copy the QR code to clipboard (with graceful fallback) — v1.0
- ✓ Site has a custom SVG logo — "Q" letter built from QR dot grid patterns — v1.0
- ✓ Site design is clean white + bold accent color with dark mode support — v1.0
- ✓ Site is SEO-optimized: full meta tags, JSON-LD schemas, sitemap, Lighthouse 100 mobile — v1.0

### Active

- [ ] Dynamic QR codes with scan analytics (redirect URL, scan count dashboard)
- [ ] User accounts to save and re-edit generated QR codes
- [ ] Additional content types: SMS, email (mailto), phone number (tel), calendar event (VEVENT)
- [ ] Bulk generation from CSV upload

### Out of Scope

- QR code scanning/reading — generator only; inverse operation is a separate product
- Logo URL input — canvas taint CORS issue; file upload is safer and sufficient
- Monetization/ads — not decided; architecture does not block future freemium
- Mobile native app — web-first; native is a separate project
- Server-side QR generation — no backend needed; all rendering is client-side
- Multiple pages per content type — SEO cannibalization risk

## Context

Shipped v1.0 with ~1,672 source LOC (TypeScript/TSX/Astro).
Tech stack: Astro 5 + React islands + qr-code-styling + Tailwind v4 + Playwright + Vercel.
All 36 v1 requirements complete. Lighthouse mobile performance: 100.
No user feedback yet — first public release.

Known tech debt from v1.0 audit:
- Nyquist validation not fully signed off on Phases 1, 3, 4, 5 (VALIDATION.md nyquist_compliant: false)
- Several VERIFICATION.md items marked human_needed (logo 25% cap, Lighthouse re-verification, dark mode visual continuity)

## Constraints

- **Tech**: No backend for v1 — all QR generation client-side
- **Deployment**: Static site on Vercel (current) / Netlify / GitHub Pages
- **Performance**: Fast load is critical for SEO — dependencies lean; `client:visible` hydration
- **Accessibility**: WCAG AA contrast validation built in (color picker warns on low contrast)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Client-side QR generation | No server needed, instant response, free hosting | ✓ Good — zero infra cost, instant UX |
| Static site (Astro + React islands) | Fast, SEO-friendly, simple deployment | ✓ Good — Lighthouse 100, easy Vercel deploy |
| SVG logo built from QR dot pattern | Clever brand identity reinforcing product purpose | ✓ Good — distinctive, scalable |
| Free public tool, no auth | Zero friction — core value is instant generation | ✓ Good — validates before adding accounts |
| qr-code-styling for QR rendering | Supports dot shapes, gradients, logo embedding, SVG export | ✓ Good — covered all v1 customization needs |
| File upload only for logo (no URL input) | Canvas taint CORS issue with URL-based images | ✓ Good — simpler, no proxy needed |
| client:visible hydration for QRGeneratorIsland | Defers JS hydration until element enters viewport | ✓ Good — key contributor to Lighthouse 100 |
| Coarse granularity (6 phases vs 7 suggested) | Fewer context resets, faster execution | ✓ Good — completed in 5 days |
| Ghost placeholder via opacity toggle (not conditional render) | Prevents layout shift and qr-code-styling remount | ✓ Good — clean UX, no flicker |
| WCAG AA 4.5:1 contrast threshold | Standard accessibility bar, reasonable UX gate | ✓ Good — clear user warning before bad QR |
| FAQ_ITEMS single source of truth | Same array for JSON-LD FAQPage schema and visible FAQ | ✓ Good — prevents schema/content drift |

---
*Last updated: 2026-03-11 after v1.0 milestone*
