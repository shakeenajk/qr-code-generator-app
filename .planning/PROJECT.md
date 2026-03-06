# QRCraft

## What This Is

QRCraft is a free, public-facing QR code generator website that lets anyone create fully customized QR codes in seconds. It targets the general public — marketers, business owners, and individuals — who want beautiful, branded QR codes without needing design software. The site is simple, elegant, and built to rank in Google search.

## Core Value

Anyone can generate a visually stunning, fully customized QR code and download it immediately — no signup, no friction.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can generate QR codes for URL, plain text, WiFi credentials, and vCard/contact info
- [ ] User can customize QR code colors and gradients (foreground, background)
- [ ] User can embed a logo/image in the center of the QR code
- [ ] User can choose dot/module shapes (square, rounded, dots, etc.)
- [ ] User can choose corner/eye styles
- [ ] User can preview the QR code live as they change settings
- [ ] User can download the QR code as PNG
- [ ] User can download the QR code as SVG
- [ ] User can copy the QR code to clipboard
- [ ] Site has a custom SVG logo — "Q" letter built from QR dot grid patterns
- [ ] Site design is clean white + bold accent color, elegant and minimal
- [ ] Site is SEO-optimized to rank in Google for QR code generator queries

### Out of Scope

- User accounts / saved QR codes — adds complexity, defer to future
- Monetization / ads — not decided yet, build first
- QR code scanning / reading — generator only for v1
- Mobile native app — web-first

## Context

- Greenfield project — no existing code
- Target audience: general public searching for QR code generators online
- SEO is a first-class requirement, not an afterthought — meta tags, structured data, page speed, semantic HTML
- Brand: QRCraft — clean white base with a strong primary accent color
- Logo concept: the letter "Q" constructed from QR dot grid patterns (SVG, designed as part of the build)
- Content types: URL, plain text, WiFi credentials, vCard/contact info
- Export formats: PNG, SVG, copy to clipboard
- Monetization: undecided — architecture should not block future freemium additions

## Constraints

- **Tech**: No backend required for v1 — all QR generation happens client-side in the browser
- **Deployment**: Static site deployable to Vercel, Netlify, or GitHub Pages
- **Performance**: Fast load time is critical for SEO — keep dependencies lean
- **Accessibility**: WCAG AA compliance for color contrast and keyboard navigation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Client-side QR generation | No server needed, instant response, free hosting | — Pending |
| Static site (no framework requirement) | Fast, SEO-friendly, simple deployment | — Pending |
| SVG logo built from QR dot pattern | Clever brand identity that reinforces the product purpose | — Pending |
| Free public tool, no auth | Zero friction — core value is instant generation | — Pending |

---
*Last updated: 2026-03-06 after initialization*
