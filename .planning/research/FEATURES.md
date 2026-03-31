# Feature Research

**Domain:** Freemium QR Code Generator — Monetization Layer (v1.1)
**Project:** QRCraft
**Researched:** 2026-03-11
**Confidence:** MEDIUM-HIGH — core patterns verified via live competitor research (QRTiger, Hovercode, QR Code Generator, Uniqode, Bitly QR, QRCodeChimp); feature gate patterns cross-referenced across multiple sources.

---

## Context: What Already Exists (v1.0)

QRCraft v1.0 is a complete, production-ready static QR generator. The following features are **already built and out of scope for v1.1**:

- Live QR generation: URL, text, WiFi, vCard
- Customization: dot shapes, corner/eye styles, foreground/background color, gradients, logo embed
- Export: PNG (3x resolution), SVG, clipboard copy
- Lighthouse 100 mobile performance, Astro 5 + React islands on Vercel

This FEATURES.md focuses exclusively on v1.1: freemium model, user accounts, Stripe billing, saved QR library, dynamic QR codes, and scan analytics.

---

## Feature Landscape: v1.1 Monetization Layer

### Table Stakes (Users Expect These for a Pro QR Tool)

Features that any serious paid QR code platform must have. Missing these causes immediate abandonment or refund requests.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email/password auth with email verification | Any paid product must have standard auth; users need account recovery | MEDIUM | Standard pattern; use established auth library (NextAuth/Lucia/Clerk) |
| Persistent saved QR library | Users paying for Pro expect to retrieve past work without re-creating | MEDIUM | Core value of having an account at all |
| Dynamic QR code with editable destination | The #1 Pro feature in every competitor — print once, change destination forever | HIGH | Requires server-side redirect layer; short URL encoding into QR |
| Scan count per dynamic QR code | Users paying for analytics expect at least a total count | MEDIUM | Minimum viable analytics |
| Upgrade/downgrade subscription | Stripe customer portal — users expect self-serve billing management | MEDIUM | Stripe Customer Portal handles this mostly out-of-box |
| Cancel subscription without contacting support | Legal requirement in many jurisdictions; expected UX standard | LOW | Stripe Customer Portal provides this |
| Clear free-vs-Pro feature labeling | Users need to know what they get before paying | LOW | Lock icons, upgrade prompts inline with gated features |
| Data retention on cancellation | Users expect their saved QRs to remain viewable (read-only) after cancellation | LOW | Do not delete data on cancel — gate edit/create only |

### Differentiators (Competitive Advantage)

Features that set QRCraft Pro apart from commodity QR tools. These drive conversion and justify the Pro price.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Scan analytics with time-series chart | Shows engagement trends over time — what marketers actually want | HIGH | Day/week/month chart; requires per-scan timestamp storage |
| Device breakdown in analytics | iOS vs Android split — directly actionable for app campaigns | MEDIUM | Parse User-Agent at redirect time; store device_type enum |
| Country/city scan location | Geographic targeting insight — which regions respond best | MEDIUM | IP geolocation at redirect; free MaxMind GeoLite2 or ipapi.co |
| Unique vs total scan distinction | Deduplication metric that shows reach vs engagement depth | MEDIUM | Session/cookie dedup or IP+day dedup at redirect |
| Named QR codes with description | Organize a library of 50+ QR codes without confusion | LOW | Name + optional description fields on saved QR record |
| Folder/tag organization for library | Power users with many QR codes need grouping | HIGH | Skip for v1.1 MVP; add in v1.2 |
| Copy existing QR as new draft | Saves re-configuration time for similar campaigns | LOW | Clone record, strip analytics, mark as new |
| QR code active/paused toggle | Pause a campaign without deleting the code | LOW | Dynamic redirect checks `is_active`; returns 404 or holding page |
| Scan limit alerts (email) | Pro users want to know when a campaign reaches thresholds | HIGH | Requires async job / webhook — defer to v1.2 |
| Custom short domain for redirects | Enterprise differentiator — yourbrand.com/qr/abc instead of qrcraft.io/r/abc | VERY HIGH | Requires custom domain DNS handling — defer to v2 |
| QR code expiry date | Campaign codes that auto-expire on a date | MEDIUM | Simple `expires_at` check in redirect handler |

### Anti-Features (Commonly Requested, Often Problematic)

Features that appear reasonable but undermine UX, trust, or the business model.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Ads on free tier | Monetize non-paying users | Ads injected into the redirect path (intermediate ad page) are the single most-complained-about pattern in competitor reviews — users feel deceived when their QR codes show ads before redirecting. Destroys trust, hurts brand. | Gate features, not the experience. Free users get static QR only — clean experience. |
| Free dynamic QR codes (unlimited) | Lower barrier to entry | Giving away dynamic QR codes free (like Me-QR) means losing the core Pro differentiator. Once users have dynamic QRs for free, there's no upgrade trigger. | 3 dynamic QR codes max on free tier — mirrors QRTiger's successful model |
| Watermarks on downloaded QR codes | Force branding / upgrade | Every competitor review that mentions watermarks on free QR outputs is negative. QR codes appear in professional contexts (print, packaging, menus) — a watermark makes the entire output unusable. | Never watermark. The clean output IS the acquisition channel. |
| Requiring credit card for free tier | Reduce fraud / simplify billing | Kills signup conversion for the free tier. Free tier should be zero-friction. | Credit card only at Stripe checkout when user upgrades to Pro |
| Deleting user data on subscription cancel | Protect storage costs | Users who cancel and lose data leave angry reviews and never return. Storage for QR metadata is negligible. | Make saved QRs read-only on cancellation. Block new creates/edits. |
| Account required for static QR generation | Maximize sign-up conversion | The entire v1.0 value proposition is no-signup generation. Requiring auth for static QR alienates the acquisition funnel that feeds Pro conversion. | Static generation stays free and anonymous forever. |
| Bulk import / CSV generation on Pro | Power feature, often requested | High complexity, niche use case, support burden, not relevant to the individual/SMB market. Distracts from core loop. | Defer to v1.2+; treat as separate enterprise feature |
| Google/Facebook social login | Reduce signup friction | Adds OAuth dependency, privacy surface area, and complexity. Email/password is sufficient for a billing-linked product. | Email/password + magic link as stretch goal |
| Scan-level PII collection (GPS, email) | Granular analytics | Collecting GPS or prompting scanners for email crosses privacy line — legal exposure (GDPR, CCPA). Competitors who do this face backlash. | IP-based city/country geolocation is the industry standard and legally cleaner |
| "Unlimited" plan tier language | Marketing appeal | "Unlimited" creates support expectations and abuse vectors. Competitors who use "unlimited" end up rate-limiting anyway, creating trust issues. | Use explicit numbers: "100 dynamic QR codes", "10,000 scans/month" |

---

## Feature Behavior Specifications

Detailed field-level specs from competitor pattern analysis.

### Saved QR Library — Record Fields

Each saved QR code entry should contain:

```
QR Record:
  id                  UUID, primary key
  user_id             FK to users table
  name                string, required, user-chosen (e.g. "Restaurant Menu Summer 2026")
  type                enum: static | dynamic
  content_type        enum: url | text | wifi | vcard
  qr_settings         JSON blob: dot style, colors, gradient config, logo (base64 or storage ref)
  destination_url     string, nullable (dynamic QR only — the current redirect target)
  short_code          string, nullable, unique (dynamic QR only — e.g. "abc123" → /r/abc123)
  is_active           boolean, default true (dynamic only — pause/resume)
  expires_at          timestamp, nullable (dynamic only — optional expiry)
  created_at          timestamp
  updated_at          timestamp
  scan_count          integer, denormalized count (updated on each scan for fast display)
```

Library list view should show:
- QR thumbnail (regenerated client-side from stored settings, or cached server image)
- Name
- Type badge (Static / Dynamic)
- Scan count (dynamic only)
- Last scanned date (dynamic only)
- Actions: Edit destination | View analytics | Copy | Delete

### Dynamic QR Code — How Redirect Works

The encoded QR data is a short URL, not the final destination:

```
Encoded in QR: https://qrcraft.io/r/{short_code}
   └── server receives GET /r/abc123
       └── looks up short_code in DB
           ├── if dynamic record, active, not expired: 301 → destination_url
           ├── if paused: 302 → /qr-paused page
           └── if expired: 302 → /qr-expired page
```

Short code generation: 6-8 alphanumeric characters (Base58 or nanoid). Must be collision-resistant at 10K+ codes. Encode into QR at ECL=M (shorter URL = smaller QR = better scan reliability vs high ECL overhead).

Key properties:
- The QR image itself never changes when destination is edited — the user never needs to reprint
- Short code is permanent for the life of the QR record
- Destination URL is editable at any time from the library dashboard

### Scan Analytics — Data Collected Per Scan

Collected from HTTP request headers at redirect time (no JavaScript needed):

```
Scan Event:
  id              UUID
  qr_id           FK to QR record
  scanned_at      timestamp (UTC)
  ip_address      string (hashed for storage — use for dedup/geo, then hash)
  device_type     enum: mobile_ios | mobile_android | mobile_other | desktop | unknown
  os              string (parsed from User-Agent: "iOS 17", "Android 14", etc.)
  browser         string (parsed from User-Agent: "Safari", "Chrome", etc.)
  country         string (ISO 3166-1 alpha-2, from IP geolocation)
  city            string (from IP geolocation, best-effort)
  is_unique       boolean (true if first scan from this IP in 24h window)
```

Analytics display (per QR code detail view):
- **Summary strip:** Total scans | Unique scans | Countries reached | Peak day
- **Time-series chart:** Scans per day (last 30 days default; toggle 7d / 30d / 90d / all)
- **Device breakdown:** Donut or bar chart — iOS / Android / Desktop / Other (%)
- **Top countries:** Table sorted by scan count, country flag, count, % of total
- **Top cities:** Table of top 5-10 cities with counts
- **Recent scans feed:** Chronological list — timestamp, device, country (no PII, no IP shown to user)

### Free vs Pro Feature Gate — Competitor-Calibrated Limits

Based on QRTiger, Hovercode, QR Code Generator, and Uniqode pricing research:

| Feature | Free Tier | Pro Tier |
|---------|-----------|----------|
| Static QR generation | Unlimited, no account needed | Same — no change |
| Account required | No (static) / Yes (dynamic + library) | Yes |
| Saved QR library | 0 (no account) or read-only after downgrade | Unlimited |
| Dynamic QR codes | 3 max (soft limit — mirrors QRTiger model) | Unlimited |
| Dynamic QR scan limit | 500 scans/code (mirrors QRTiger) | Unlimited |
| Scan analytics | None | Full (all fields above) |
| QR customization | Full color + basic shapes | All shapes + gradients + logo |
| Logo embed | Locked (Pro) | Included |
| Advanced dot shapes (classy, etc.) | Basic only (square, rounded) | All shapes |
| PNG download | Free | Free |
| SVG download | Free | Free |
| Expiry dates | Not available | Available |
| Active/paused toggle | Not available | Available |
| Data export | Not available | CSV export of scan data |

Note on locking logo and advanced shapes behind Pro: v1.0 built these as free features. Retroactively gating them is a **breaking change for existing users**. Two options:
1. Grandfather all existing pre-account users (no forced login, no gate on static generation ever)
2. Gate only for new accounts created after v1.1 launch

Recommendation: Gate logo and advanced shapes for **new authenticated users only**. Anonymous static generation remains completely ungated. This preserves the no-friction acquisition funnel.

---

## Feature Dependencies

```
User Authentication
  └──requires──> Stripe Billing (billing is reason auth exists for this product)
  └──requires──> Saved QR Library (library requires user identity)

Stripe Billing
  └──requires──> User Authentication
  └──enables──> Pro tier feature unlock

Saved QR Library
  └──requires──> User Authentication
  └──requires──> QR Settings Serialization (must serialize qr-code-styling config to JSON)
  └──enhances──> Dynamic QR Codes (dynamic codes live in the library)

Dynamic QR Codes
  └──requires──> Saved QR Library (dynamic QR is a type of saved QR)
  └──requires──> Server-Side Redirect Layer (new infra — short URL redirect endpoint)
  └──requires──> Pro subscription check (gated behind paid tier)

Scan Analytics
  └──requires──> Dynamic QR Codes (analytics only apply to dynamic codes)
  └──requires──> Server-Side Redirect Layer (scans are captured at redirect time)
  └──requires──> Pro subscription check (analytics are Pro-only display)

Pro Customization Gates (logo, advanced shapes)
  └──requires──> User Authentication (gate requires knowing who the user is)
  └──requires──> Stripe Billing (gate unlocks when user is Pro)
  └──conflicts──> Existing anonymous static generation (must NOT gate anonymous users)
```

### Dependency Notes

- **Stripe Billing requires User Authentication:** Stripe Checkout must attach to a user identity. Without auth, you can't persist subscription state.
- **Dynamic QR requires Redirect Layer:** This is the single largest new infrastructure requirement. A new serverless function or Edge Function must handle `GET /r/:code` with DB lookup at every scan.
- **Scan Analytics requires Redirect Layer:** Analytics are captured as a side effect of the redirect. There is no way to track scans without owning the redirect.
- **Customization gates conflict with anonymous generation:** The v1.0 anonymous experience must remain completely unaffected. Gates apply only to authenticated sessions. Detect auth state client-side; show lock icon + upgrade prompt if user is free-tier authenticated, hide lock entirely for anonymous users.

---

## MVP Definition

### Launch With (v1.1)

Minimum viable paid product — enough to charge money and deliver clear value.

- [ ] Email/password auth (sign up, log in, log out, email verification) — identity foundation for everything else
- [ ] Stripe Checkout integration (free → Pro upgrade) — revenue
- [ ] Stripe Customer Portal (manage/cancel subscription) — self-serve billing, legal compliance
- [ ] Saved QR library (Pro) — create, name, edit settings, delete — core Pro value
- [ ] Dynamic QR codes with editable destination (Pro) — most-demanded Pro feature in the category
- [ ] Short-URL redirect layer (`/r/:code`) with scan logging — enables dynamic QR + analytics
- [ ] Basic scan analytics: total scans, unique scans, time-series chart, device breakdown, top countries — minimum viable analytics dashboard
- [ ] Pro customization gates: logo upload + advanced dot shapes behind Pro (for new authenticated users only)
- [ ] Free tier limits enforced: 3 dynamic QR max, 500 scans/code soft limit

### Add After Validation (v1.x)

Add once v1.1 is live and paying customers exist.

- [ ] Folder/tag organization for library — trigger: users with 20+ saved QRs report navigation pain
- [ ] QR code expiry dates — trigger: any user requests campaign-end automation
- [ ] Copy existing QR as new — trigger: user feedback about re-setup friction
- [ ] CSV export of scan data — trigger: any user asks for data portability
- [ ] Bulk QR generation from CSV — trigger: agency or enterprise inbound
- [ ] Magic link login — trigger: support requests about forgotten passwords

### Future Consideration (v2+)

Defer until product-market fit is established.

- [ ] Custom short domains — very high complexity; relevant only at enterprise scale
- [ ] Team/multi-seat accounts — requires org/workspace data model
- [ ] Scan limit email alerts — requires async job queue
- [ ] QR code A/B testing (two destinations, split traffic) — advanced use case
- [ ] API access for developers — separate product surface; token auth, rate limiting
- [ ] White-label / embedded widget — enterprise only

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Email/password auth | HIGH | MEDIUM | P1 |
| Stripe Checkout + billing | HIGH | MEDIUM | P1 |
| Saved QR library | HIGH | MEDIUM | P1 |
| Dynamic QR + redirect layer | HIGH | HIGH | P1 |
| Basic scan analytics (count + chart) | HIGH | MEDIUM | P1 |
| Device breakdown analytics | MEDIUM | LOW | P1 |
| Country/city analytics | MEDIUM | LOW | P1 |
| Pro customization gates | MEDIUM | LOW | P1 |
| Free tier limits enforcement | MEDIUM | LOW | P1 |
| Stripe Customer Portal | HIGH | LOW | P1 |
| QR active/paused toggle | MEDIUM | LOW | P2 |
| Copy existing QR as draft | MEDIUM | LOW | P2 |
| QR expiry date | LOW | LOW | P2 |
| CSV scan data export | LOW | LOW | P2 |
| Folder/tag organization | MEDIUM | HIGH | P3 |
| Custom short domain | HIGH (enterprise) | VERY HIGH | P3 |

---

## Competitor Feature Analysis

| Feature | QR Code Generator (qr-code-generator.com) | QRTiger (qrcode-tiger.com) | Hovercode (hovercode.com) | Our Approach |
|---------|------------------------------------------|---------------------------|--------------------------|--------------|
| Free dynamic QR | No — paid only | 3 free, 100 scan limit, watermark-on-scan | 3 free, unlimited scans | 3 free, 500 scan limit, no watermark |
| Free analytics | None | None on free | Basic (total + unique scans only) | None on free — full analytics is Pro value |
| Saved library | Account required, basic list | Account required, folder support | Account required, basic list | Account required, named entries, Pro only |
| Analytics depth | Scans, location, device, OS | Scans, location, device, OS | Total + unique free; time/location on paid | Total + unique + time-series + device + geo |
| Customization gate | Some shapes/colors gated | Logo + advanced gated | Design features gated | Logo + advanced shapes gated (new auth users) |
| Redirect domain | Their domain only | Their domain only | Custom domain (paid) | Our domain (v1.1), custom domain (v2) |
| Scan limit on dynamic | Varies by plan | 100/code free, unlimited paid | Unlimited on all plans | 500/code free, unlimited Pro |
| Intermediate ad page | No | No | No | No — never |
| Watermark on free | No | Yes on scan redirect (ad-like) | No | No — never |
| Stripe billing | Yes | Yes | Yes | Yes |
| Self-serve cancel | Yes (portal) | Yes (portal) | Yes (portal) | Yes — Stripe Customer Portal |

---

## Sources

- [QR Code Generator Pricing](https://www.qr-code-generator.com/pricing/) — feature tier breakdown (MEDIUM confidence — visited via search results)
- [QRTiger Pricing](https://www.qrcode-tiger.com/payment) — free tier limits: 3 dynamic, 100 scan/code, branding on scan (MEDIUM confidence)
- [Hovercode Pricing & Analytics Review](https://hovercode.com/pricing/) — free tier: 3 dynamic, unlimited scans; free analytics: total + unique only; paid: time + location + device (HIGH confidence — verified via multiple sources)
- [Supercode QR Analytics Guide 2026](https://www.supercode.com/blog/qr-code-tracking) — canonical list of analytics data points (MEDIUM confidence)
- [Hovercode: How to Track QR Code Analytics](https://hovercode.com/blog/how-to-track-qr-code-analytics/) — per-scan data fields (HIGH confidence)
- [Uniqode: Best QR Code Generator for Every Budget](https://www.uniqode.com/blog/qr-code-buying-guide/best-qr-code-generators) — competitor comparison (MEDIUM confidence)
- [Stripe Freemium Pricing Explained](https://stripe.com/resources/more/freemium-pricing-explained) — freemium conversion patterns (HIGH confidence)
- [Hovercode: Static vs Dynamic QR Codes](https://hovercode.com/blog/static-vs-dynamic-qr-codes/) — redirect architecture description (HIGH confidence)
- [Uniqode: How to Change QR Code Destination](https://www.uniqode.com/blog/dynamic-qr-code/change-qr-code-destination) — dynamic QR behavior spec (HIGH confidence)
- [Me-QR: Best QR Code Tools with Advanced Analytics 2025](https://me-qr.com/page/blog/best-qr-code-tools-advanced-analytics) — analytics feature comparison (MEDIUM confidence)
- [Mobiqode: Hovercode Review 2026](https://www.mobiqode.com/blog/hovercode-review/) — free vs paid feature detail (MEDIUM confidence)

---

## v1.0 FEATURES.md — Retained Below for Reference

The following section preserves the original v1.0 feature research (static QR generator). These features are complete and not subject to change in v1.1.

---

### Table Stakes (v1.0 — Already Built)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| URL QR code generation | Primary use case for ~80% of users | Low | Complete |
| Live preview as you type | Every major competitor has this | Low-Med | Complete — debounced |
| PNG download | Universal format | Low | Complete — 3x resolution |
| Free, no signup required | Zero-friction acquisition | Low | Complete — must stay free forever |
| Mobile-friendly / responsive UI | ~50%+ traffic is mobile | Med | Complete — Lighthouse 100 |
| Color customization (fg/bg) | Brand matching expected | Low | Complete |
| Error correction level | Logo embed requires ECL-H | Low | Complete |
| Plain text QR code | Second most common type | Low | Complete |
| Fast page load | SEO-critical | Med | Complete — Lighthouse 100 |

### Differentiators (v1.0 — Already Built)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Logo embed | Branded QR — biggest differentiator | Med | Complete |
| Dot/module shape customization | Designer QR codes | Med | Complete |
| Corner/eye style | Fine-grained visual control | Med | Complete |
| Color gradients | Premium look | Med | Complete |
| SVG download | Vector export for print | Low | Complete |
| WiFi QR codes | Popular use case | Low | Complete |
| vCard QR codes | Business card use case | Med | Complete |
| Copy to clipboard | Convenience | Low | Complete |
| Dark mode | User comfort | Low | Complete |

### Anti-Features (v1.0 — Correctly Avoided)

| Anti-Feature | Why Avoided |
|--------------|-------------|
| User accounts (v1.0) | Added in v1.1 with clear monetization rationale |
| Dynamic QR codes (v1.0) | Added in v1.1 with redirect infrastructure |
| Analytics dashboard (v1.0) | Added in v1.1 tied to dynamic QR |
| Watermarks on free output | Never — output quality is the acquisition channel |
| Paywalled SVG export | SVG is free; gate on Pro features instead |

---
*Feature research for: QRCraft freemium QR code generator — v1.1 monetization layer*
*Researched: 2026-03-11*

---
---

# Feature Landscape — QRCraft v1.2 Growth & Content

**Domain:** QR code generator / freemium SaaS tool
**Researched:** 2026-03-30
**Milestone context:** v1.2 adds content types (PDF, App Store), frames, templates, homepage marketing, SEO, and AdSense to an already-shipped product (auth, Stripe, saved library, dynamic codes, analytics all complete).

---

## 1. PDF Content Type — Hosted Landing Page

### Table Stakes

Features users expect when a competitor offers a "PDF QR code" type. Missing any of these will feel incomplete.

| Field | Why Expected | Complexity | Notes |
|-------|--------------|------------|-------|
| PDF file upload | Primary action — source of truth | Med | Up to 20 MB is industry norm (QR Code Generator limit) |
| Cover/welcome image | Visual context for the scanned page | Low | Shown at top of landing page |
| Title | Tells scanner what the document is | Low | Required |
| Description | Brief document summary | Low | Optional but standard |
| Company/brand name | Attribution for business use cases | Low | Optional |
| Website URL | Back-link to brand | Low | Optional |
| "View PDF" CTA button | Primary action on landing page | Low | Must be prominent, above fold |
| Mobile-optimized landing page | 80%+ of scans are mobile | Med | Mandatory |
| "Link directly to PDF" option | Skip landing page, go straight to file | Low | Toggle — QR Code Generator offers this |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Social sharing buttons | Users forward the PDF page | Low | Share to WhatsApp, email, copy link |
| Custom accent color on landing page | Brand matching | Low | Single color picker, apply to button/header |
| QR scan count on landing page | Social proof ("X people scanned this") | Med | Requires analytics integration (already built in v1.1) |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Multiple-file upload per QR | Complexity, unclear UX | One PDF per QR code |
| In-browser PDF viewer (iframe) | Poor mobile experience; fails on iOS Safari | Link out to OS-native viewer |
| Password-protecting PDFs server-side | Re-implements OS-level security, fragile | Let user encrypt PDF before upload |

### Dependencies on Existing QRCraft Features
- Dynamic QR redirect (v1.1) — PDF landing page is a specialized redirect destination; same short code infrastructure
- Turso/Drizzle schema — needs a `pdfLandingPages` table (file URL, title, description, company, website, cover image URL, direct link toggle)
- **New infra required:** Vercel Blob or similar for PDF + cover image storage — this is currently absent from the stack and is the highest-risk dependency
- Pro tier gate — hosted content types are standard Pro features across all competitors

---

## 2. App Store Content Type — Hosted Landing Page

### Table Stakes

| Field | Why Expected | Complexity | Notes |
|-------|--------------|------------|-------|
| App name | Header of landing page | Low | Required |
| App icon / logo upload | Visual brand recognition | Low | Required |
| Short description | 1–2 sentence app pitch | Low | Optional but expected |
| iOS App Store URL | Core link | Low | Required (or Android, at least one) |
| Google Play URL | Core link | Low | Required (or iOS, at least one) |
| "Download on App Store" button | Standard Apple badge | Low | Use official badge assets |
| "Get it on Google Play" button | Standard Google badge | Low | Use official badge assets |
| Auto-detect OS and redirect | iPhone scan → App Store; Android scan → Play | Med | User-agent sniffing — industry standard (Onelink.to model) |
| Mobile-optimized landing page | 100% mobile audience | Low | Mandatory |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| App trailer / video embed | YouTube/Vimeo URL for promo video | Low | iframe embed only — no hosting |
| Star rating display | Manual entry (e.g. "4.8 stars") | Low | Not API-fetched; user enters manually |
| Screenshot carousel | 2–3 app screenshots | Med | Adds visual credibility |
| "Visit website" link | Optional brand site link | Low | Extra field |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Fetching app metadata from App Store API | CORS, Apple restrictions, rate limits | Manual entry fields only |
| Requiring both iOS and Android URLs | Many apps are iOS-only or Android-only | Make each platform URL optional; require at least one |
| Hosting the trailer video | Storage costs + encoding complexity | YouTube/Vimeo embed URL only |

### OS-Detection Redirect Logic
When only one platform URL provided: always go there directly.
When both URLs provided: user-agent check in the existing Vercel redirect function → correct store. Desktop or unknown OS: show landing page with both store buttons.

### Dependencies on Existing QRCraft Features
- Dynamic QR redirect (v1.1) — same short code infra
- Vercel redirect function — add OS detection branch (low complexity addition)
- New DB table: `appStoreLandingPages`
- Shares file storage infra with PDF type (app icon upload)

---

## 3. QR Code Decorative Frames

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Rectangular border frame | Most common style — universal recognition | Med | Rendered around QR output |
| "Scan Me" default CTA text | Industry standard — what users expect | Low | Bottom text below QR |
| Editable CTA text | "Scan to Order", "Scan to Connect", etc. | Low | Replace default with user input |
| Frame color control | Brand color matching | Low | Single color picker |
| Text color control | Contrast readability | Low | |
| No frame option (default) | Existing behavior preserved | Low | Frame is additive, never forced |
| Frame included in PNG download | Must export with frame visible | Med | Composite render step |
| Frame included in SVG download | Clean vector output | High | SVG composition adds complexity |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Rounded corners frame style | Modern, softer look | Low | SVG rx attribute |
| Font choice for CTA text (2–3 options) | Subtle branding differentiation | Low | Embed font subset in SVG |
| Small scan icon/arrow decoration | Visual affordance | Low | Add arrow or camera SVG icon |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Phone mockup frames | Extreme render complexity, dated aesthetic | Geometric borders with text only |
| Animated frames | Cannot export to PNG/SVG cleanly | Static frames only |
| 70+ frame variants | Overwhelming, high maintenance | Curate 5–8 high-quality styles |
| Frames on anonymous/free users blocked | Frames are a quality-of-life feature, not Pro differentiator | Keep frames free — gates are on Pro content types |

### Rendering Approach (Technical)

**Recommended: `qr-border-plugin` npm package** — a verified extension for `qr-code-styling` that adds customizable borders with text via `extensionOptions`. Since QRCraft already uses `qr-code-styling`, this is the minimum-friction implementation path.

For PNG export: render QR to canvas → draw frame rect + CTA text onto same 2D canvas context → export canvas as PNG.
For SVG export: wrap QR SVG in a parent SVG element → add `<rect>` and `<text>` children. This is the harder path; plan extra implementation time.

Confidence on `qr-border-plugin` API: MEDIUM — package exists and is documented on npm; hands-on API verification needed before committing to it.

### Dependencies on Existing QRCraft Features
- `qr-code-styling` (v1.0 stack) — `qr-border-plugin` extends it
- Live preview (v1.0) — frame must update in real-time as user edits CTA text or color
- PNG + SVG download (v1.0) — both export paths need compositing step added
- Preset templates (Feature 4 below) — frames are a component of templates; build frames first

---

## 4. Preset Style Templates

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Pre-made visual combos | "Make it look good instantly" — main user request | Med | Each preset = dot style + colors + corner style + optional frame |
| One-click apply | Single click replaces all current style settings | Low | |
| Thumbnail preview per template | See before applying | Low | Static images or small canvas renders |
| Named templates | "Classic", "Bold Dark", "Neon" — names aid recall | Low | |
| 8–12 templates minimum | Below 8 feels sparse; above 20 causes decision fatigue | Low | |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Category grouping | "Minimal", "Bold", "Business", "Vibrant" | Low | 4–5 categories across 12 templates |
| "New" badge on recently added templates | Drives return visits | Low | Static flag in template data |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| User-generated public template gallery | Moderation burden, legal risk | Private saved templates if needed (v1.3+) |
| Animated preview thumbnails | Slow load, JS complexity | Static images |
| More than 30 templates | Discovery failure, maintenance burden | Curate 12–20 maximum |

### Suggested Categories
1. **Minimal** — square dots, black/white, no frame
2. **Bold** — high-contrast, thick dots, dark frame with CTA text
3. **Rounded** — circle dots, soft colors, no frame
4. **Business** — navy/white, corner eye emphasis
5. **Vibrant** — gradient foreground, colorful frame

### Dependencies on Existing QRCraft Features
- All existing customization controls (dot style, colors, corner eyes) — presets auto-fill these existing fields
- Decorative frames (Feature 3) — templates reference frame styles; frames must be built first
- Customization panel UI (v1.0) — must visually reflect which template is currently active

---

## 5. Homepage Marketing Sections

### Table Stakes

| Section | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Pricing promotion / CTA block | Every SaaS homepage has one | Low | Summarize Pro benefits + "Upgrade" CTA |
| How-to / step-by-step guide | Reduces bounce from confused visitors | Med | 3 steps: pick type → customize → download |
| QR code use cases section | Broadens appeal, aids SEO | Low | 6–8 tiles with icons and brief descriptions |
| Register button + pricing link in header | Navigation clarity for conversion | Low | Missing from current v1.1 header |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Programmatic screenshots in how-to | Authentic, auto-updates with UI changes | High | Playwright screenshot automation (test suite already exists) |
| Dedicated use-case landing pages | SEO long-tail, specific audience targeting | Med | /qr-code-for-restaurants, /qr-code-for-business-cards etc. |
| Scan count social proof widget | "X QR codes generated" counter | Low | DB aggregate query; motivates trial |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Video hero / autoplay background | Destroys Lighthouse score on mobile | Static images + CSS animation only |
| Testimonials without real users | Fake social proof destroys trust | Use quantitative stats instead |
| More than 6 homepage sections | Cognitive overload, slow TTI | Max 5–6 sections; defer content to dedicated pages |

### Content That Converts (MEDIUM confidence — based on competitor homepage patterns)
1. Feature benefit bullets near hero — not a feature checklist
2. Pricing table or teaser above the fold on pricing page, briefly referenced on homepage
3. Use case tiles with industry icons — restaurant, retail, events, healthcare, WiFi
4. "How it works" 3-step section with real UI screenshots
5. Free tier prominently called out — reduces signup friction

### Dependencies on Existing QRCraft Features
- Stripe tier data (v1.1) — pricing promo section must reflect actual current tier limits
- Existing Astro component architecture — new sections are Astro island components
- Playwright (v1.1 test suite) — extend for programmatic screenshot capture

---

## 6. SEO Improvements

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Google Search Console setup | Track clicks/impressions/position | Low | GSC verification tag in head |
| HowTo structured data (JSON-LD) | Enables rich snippets for how-to section | Med | JSON-LD already used in v1.0 |
| FAQPage structured data | Featured snippets for FAQ section | Low | Additional JSON-LD schema |
| Sitemap includes all new pages | Every new page must appear in sitemap.xml | Low | Astro sitemap plugin already in place |
| Unique title + meta description per page | All new content type pages need distinct meta | Low | Astro frontmatter handles per-page |
| Fast mobile page load maintained | Core Web Vitals are a ranking signal | Low | Already Lighthouse 100 — maintain discipline |

### Target Keyword Clusters (MEDIUM confidence — no direct volume data accessed)

| Keyword Cluster | Intent | Priority |
|-----------------|--------|----------|
| "free qr code generator" | High volume, high competition | Core — already targeting |
| "qr code with logo" | Mid volume, differentiator | Core |
| "dynamic qr code" | Mid volume, Pro feature | Pro upsell page |
| "qr code for restaurants" | Lower volume, lower competition | Use case landing page |
| "qr code for business cards" / "vcard qr code" | Mid volume | Existing type, enhance page |
| "pdf qr code" | Low-mid volume | New page opportunity from content type |
| "app store qr code" | Low volume | New page opportunity |
| "custom qr code" | High volume, high competition | Core |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Use-case landing pages | Long-tail ranking for industry-specific queries | Med | 4–6 dedicated Astro pages, 400+ words each |
| Expanded FAQ content | More FAQ items = more featured snippet opportunities | Low | Additive to existing FAQ section |
| Alt text on all QR example images | Image SEO, accessibility | Low | Easy win |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Keyword stuffing | Google Helpful Content Update penalizes this | Natural language with keyword intent |
| Near-duplicate use case pages | Thin content hurts rather than helps | Each page needs 200+ unique words and a unique value proposition |
| Blog without publishing commitment | Ghost blog signals abandonment | Skip blog unless committing to 1 post/month minimum |

### Content Priority Order
1. Fix homepage copy accuracy (freemium truth-in-advertising in hero)
2. Add HowTo + FAQPage JSON-LD to relevant sections
3. Use case tiles on homepage (6–8, linking to dedicated pages)
4. 4–6 dedicated use-case landing pages
5. Google Search Console verification + ongoing monitoring
6. PDF and App Store pages (new content type pages auto-add indexable real estate)

---

## 7. Google AdSense on Free Tier

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| AdSense script in layout | Standard implementation | Low | Async script tag in Astro layout head |
| Ads visible to free-tier users only | Pro users should not see ads | Med | Clerk session check; server-side conditional |
| Reserved min-height on ad containers | Google 2025 algo: no reserved space = 50% viewability penalty | Low | CSS `min-height` on every ad slot |
| Ad placement below QR preview | Tool function must come first — ads below fold | Low | Never above the generator |
| No ads in redirect path | Already confirmed out-of-scope in PROJECT.md | N/A | Confirmed — never |

### CPM Expectations for This Niche (LOW confidence)

Tool/utility sites are mid-tier niche for AdSense:
- US visitors: ~$1–3 CPM estimated
- Non-US: ~$0.20–0.80 CPM
- Marketing/business tool niche is slightly above pure utility

At ~1,000 daily free-tier visitors: realistically $30–100/month. Not transformative — supplemental to Stripe revenue. Primary value is the "upgrade to remove ads" conversion nudge.

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Remove ads — upgrade to Pro" CTA adjacent to ad slot | Converts ad annoyance into upgrade motivation | Low | Simple upgrade link next to ad unit |
| Single ad unit vs. multiple | Better UX retention; users don't abandon tool | Low | One unit max on generator page |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Ads covering >15% initial viewport | Google 2025 penalty — reduces CPM and ranking | Place ads below fold |
| More than 2 ad units on generator page | Diminishing returns, UX degradation | Max 1–2 units |
| Sticky/floating ad overlays | AdSense ToS violation risk | Static placed units only |
| Ads shown to Pro users | Violates Pro value proposition | Conditional render: `!isProUser` |

### Implementation Note
AdSense `async` script in `<head>`. Conditional rendering via Astro server-side Clerk session check. Reserve ad slot containers with CSS `min-height` so layout doesn't shift when ads load — CLS must remain 0 to preserve Lighthouse 100.

### Dependencies on Existing QRCraft Features
- Clerk auth (v1.1) — gate ads behind `!user.isPro` check
- Stripe subscription state (v1.1) — determines Pro status
- Astro layout (v1.0) — script placement and conditional rendering

---

## 8. vCard Enhancements

### Table Stakes (additions to existing name/phone/email)

| Field | Why Expected | Complexity | Notes |
|-------|--------------|------------|-------|
| Job title | Standard business card field | Low | vCard 3.0 TITLE field |
| Company name | Standard business card field | Low | vCard 3.0 ORG field |
| Work phone (separate from mobile) | Business context | Low | Second PHONE entry, type=WORK |
| Physical address (street, city, country) | Full contact record standard | Low | vCard ADR field |
| Website URL | Portfolio or company site | Low | vCard URL field |
| LinkedIn profile URL | Modern professional standard | Low | Second URL or NOTE field |

### Differentiators

| Field | Value Proposition | Complexity | Notes |
|-------|-------------------|------------|-------|
| Twitter/X handle | Social-forward users | Low | NOTE field |
| Department | Enterprise org contexts | Low | vCard ORG field suffix |
| Multiple email addresses | Work + personal | Low | Second EMAIL entry |
| Pronouns | Inclusive, contemporary | Low | NOTE field |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Profile photo in vCard | Inflates QR data density dramatically; harder to scan | Make optional with explicit scan-complexity warning |
| Dozens of social media fields | Form bloat, rare usage | LinkedIn + Website is sufficient; user puts others on website |
| Freeform custom fields | Support burden, unpredictable vCard output | Fixed known fields only |

### Format Note
Use vCard 3.0, not 4.0. iOS Contacts has inconsistent vCard 4.0 support as of 2025. vCard 3.0 is the safe cross-device standard.

### Gate Consideration
These fields are table stakes across all competitors — keep them free. Gating basic contact fields would be a negative differentiator.

### Dependencies on Existing QRCraft Features
- Existing vCard QR type UI (v1.0) — additive form extension, not a replacement
- vCard string builder — append new fields to existing encoder
- Form validation — address fields add grouping complexity (show/hide address section as a unit)

---

## v1.2 Feature Dependencies Map

```
Dynamic QR Redirect (v1.1)
  ├── PDF content type  (redirect destination + new DB table + file storage)
  └── App Store content type  (redirect destination + OS detection in redirect fn)

File Storage (NEW — not in current stack)
  ├── PDF content type  (PDF files + cover images)
  └── App Store content type  (app icons)

qr-code-styling library (v1.0)
  ├── Decorative Frames  (qr-border-plugin extension)
  └── Preset Templates  (templates auto-fill dot + color + frame settings)

Decorative Frames
  └── must be built before Preset Templates

Homepage Marketing
  └── Pricing promo references real Stripe tier data (v1.1)
  └── How-to screenshots can use existing Playwright test suite

AdSense
  └── Clerk auth (v1.1) — conditional rendering for Pro users
  └── Stripe Pro status (v1.1) — source of truth for gate

vCard Enhancements
  └── Existing vCard type (v1.0) — additive extension only
```

---

## v1.2 Build Priority

### Build First (high value, no new infra)
1. **vCard enhancements** — purely additive to existing form, zero new infrastructure
2. **AdSense setup** — script tag + conditional render; low complexity, immediate supplemental revenue + upgrade nudge
3. **Header improvements** — Register button + pricing link; 1-hour fix with outsized conversion impact
4. **Decorative frames** — `qr-border-plugin` extends existing library; unlocks template system

### Build Second (moderate complexity, high growth value)
5. **Preset style templates** — depends on frames; high perceived polish, low infra
6. **Homepage marketing sections** — how-to guide, pricing promo, use case tiles
7. **SEO improvements** — structured data, use case pages, GSC setup

### Build Last (requires new infra)
8. **PDF content type** — needs file storage infra (Vercel Blob or equivalent) — highest infra risk
9. **App Store content type** — shares file storage with PDF; add OS detection in existing redirect function

### Defer from v1.2
- Blog / content hub — requires sustained content commitment; defer until traffic validates the investment
- User-saved style templates — low urgency vs. other features; v1.3 candidate
- Profile photo in vCard — QR scannability risk; needs A/B testing before shipping to all users

---

## Sources (v1.2 Research)

- [QR Code Generator — PDF QR Code](https://www.qr-code-generator.com/solutions/pdf-qr-code/) — PDF fields spec (MEDIUM confidence)
- [Me-QR — App Store QR Code Generator](https://me-qr.com/qr-code-generator/store) — App Store type UX (MEDIUM confidence)
- [URLgenius — App Store QR Code Blog](https://app.urlgeni.us/blog/app-store-links-apple-itunes-google-play) — OS detection pattern (MEDIUM confidence)
- [Onelink.to — App Store + Google Play single link](https://www.onelink.to/) — industry standard for OS detection (HIGH confidence)
- [QR Code Generator — App Store QR](https://www.qr-code-generator.com/solutions/app-qr-code/) — hosted page fields (MEDIUM confidence)
- [Uniqode — QR Code Frame Guide](https://www.uniqode.com/blog/qr-code-customization/qr-code-frame) — frame styles overview (MEDIUM confidence)
- [qr-border-plugin — Socket.dev npm analysis](https://socket.dev/npm/package/qr-border-plugin) — extension for qr-code-styling (MEDIUM confidence)
- [kozakdenys/qr-code-styling — GitHub](https://github.com/kozakdenys/qr-code-styling) — extension API (HIGH confidence)
- [QR TIGER — Templates](https://www.qrcode-tiger.com/qr-code-templates) — competitor template categories (MEDIUM confidence)
- [Beaconstac — PDF QR Code Marketing (Medium)](https://medium.com/@beaconstac/qr-code-generator-pdf-the-help-you-need-for-better-marketing-2cf41465e83f) — PDF content type fields (MEDIUM confidence)
- [QR Tiger — Custom Landing Page](https://www.qrcode-tiger.com/custom-qr-code-landing-page) — landing page field pattern (MEDIUM confidence)
- [AdPushup — AdSense CPM Rates](https://www.adpushup.com/blog/adsense-cpm/) — CPM data by niche (MEDIUM confidence)
- [Serpzilla — AdSense Niches 2025](https://serpzilla.com/blog/10-best-google-adsense-niches-2025-a-practical-guide-for-website-owners/) — niche CPM benchmarks (LOW-MEDIUM confidence)
- [QR Code Generator — vCard](https://www.qr-code-generator.com/solutions/vcard-qr-code/) — vCard field standards (MEDIUM confidence)
- [QRCodeKit — QR Code Trends 2026](https://qrcodekit.com/news/qr-code-trends/) — market context (MEDIUM confidence)
- [Dynamsoft — SVG QR Code Overlays](https://www.dynamsoft.com/codepool/draw-qr-code-overlays-using-svg-javascript.html) — SVG composition technique (HIGH confidence)

---
*v1.2 feature research appended: 2026-03-30*
