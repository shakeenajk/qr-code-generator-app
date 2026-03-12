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
