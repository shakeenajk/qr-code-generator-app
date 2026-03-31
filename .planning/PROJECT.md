# QRCraft

## What This Is

QRCraft is a freemium QR code generator that lets anyone create fully customized, visually branded QR codes and download them immediately — no design software needed. Free tier works with no signup. Pro users get dynamic QR codes (destination editable post-print), saved QR library, scan analytics, and full customization — billed via Stripe subscription.

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
- ✓ User sign up/login/session management (Clerk auth) — v1.1
- ✓ Freemium subscription via Stripe (free vs Pro tier, monthly/annual) — v1.1
- ✓ Saved QR code library (Pro) — create, name, edit, delete — v1.1
- ✓ Dynamic QR codes with server-side redirect layer (Pro) — v1.1
- ✓ Scan analytics: total/unique scans, 30-day chart, device/country breakdown (Pro) — v1.1
- ✓ Pro-only customization gates (advanced shapes, logo upload for signed-in users) — v1.1

### Active

(None yet — define with `/gsd:new-milestone`)

### Out of Scope

- QR code scanning/reading — generator only; inverse operation is a separate product
- Logo URL input — canvas taint CORS issue; file upload is safer and sufficient
- Mobile native app — web-first; native is a separate project
- Multiple pages per content type — SEO cannibalization risk
- Custom short domains (e.g. go.brand.com) — enterprise-only; defer to v2+
- Ads in redirect path — anti-pattern; destroys user trust
- Watermarks on free QR output — kills acquisition funnel
- Requiring account for static QR generation — breaks core acquisition model
- Deleting data on subscription cancel — gate create/edit, not read

## Context

Shipped v1.1 Monetization with ~5,279 source LOC (TypeScript/TSX/Astro).
Tech stack: Astro 5 + React islands + qr-code-styling + Tailwind v4 + Playwright + Vercel + Clerk + Turso/Drizzle + Stripe.
All 62 requirements complete (36 v1.0 + 26 v1.1). Lighthouse mobile performance: 100.
Domain: qr-code-generator-app.com (Porkbun → Vercel).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Client-side QR generation | No server needed, instant response, free hosting | ✓ Good — zero infra cost, instant UX |
| Static site (Astro + React islands) | Fast, SEO-friendly, simple deployment | ✓ Good — Lighthouse 100, easy Vercel deploy |
| SVG logo built from QR dot pattern | Clever brand identity reinforcing product purpose | ✓ Good — distinctive, scalable |
| Free public tool, no auth for static gen | Zero friction — core value is instant generation | ✓ Good — validates before adding accounts |
| qr-code-styling for QR rendering | Supports dot shapes, gradients, logo embedding, SVG export | ✓ Good — covered all customization needs |
| File upload only for logo (no URL input) | Canvas taint CORS issue with URL-based images | ✓ Good — simpler, no proxy needed |
| client:visible hydration | Defers JS hydration until element enters viewport | ✓ Good — key contributor to Lighthouse 100 |
| Clerk for auth | Managed auth with OAuth providers, session management | ✓ Good — minimal code, secure defaults |
| Turso + Drizzle ORM | Edge-compatible SQLite, type-safe queries | ✓ Good — low latency redirects, clean schema |
| Stripe Checkout + webhooks | Subscription state driven by webhooks, not client redirects | ✓ Good — reliable, handles edge cases |
| Separate dynamicQrCodes table | FK readiness for scan analytics, clean data model | ✓ Good — enabled Phase 11 analytics easily |
| 307 redirect (not 301) for dynamic QR | Destination updates take effect without browser cache | ✓ Good — critical for editable URLs |
| Recharts (not Tremor) for charts | Tremor incompatible with Tailwind v4 CSS-first setup | ✓ Good — works, lightweight |
| Fire-and-forget scan event insert | Analytics recording doesn't block redirect latency | ✓ Good — zero impact on redirect speed |

## Constraints

- **Performance**: Fast load is critical for SEO — dependencies lean; `client:visible` hydration
- **Accessibility**: WCAG AA contrast validation built in (color picker warns on low contrast)
- **Auth boundary**: Anonymous static generation must never be gated — this is the acquisition funnel
- **Deployment**: Vercel with serverless functions (not edge) — Clerk incompatible with Edge runtime

---
*Last updated: 2026-03-31 after v1.1 milestone completion*
