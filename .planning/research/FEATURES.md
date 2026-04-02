# Feature Research

**Domain:** QR Code Generator SaaS — Scale & Integrate (v1.3)
**Project:** QRCraft
**Researched:** 2026-03-31
**Confidence:** MEDIUM — patterns sourced from live competitor analysis (Uniqode, QR Tiger, Hovercode, QRCodeKit, QR Code Generator, QR Planet, Supercode, me-qr); implementation complexity from framework docs (Astro, Upstash, Sentry, Paraglide)

---

## Context: What Already Exists (v1.0 – v1.2)

QRCraft has a complete freemium QR generator with:

- Static + dynamic QR for URL, text, WiFi, vCard, PDF, App Store
- Full customization: colors, gradients, dot/eye shapes, logos, frames, templates
- Saved library, scan analytics (30-day chart, device/country breakdown)
- Landing page hosting (PDF, App Store), AdSense on free tier
- Clerk auth, Stripe billing (Free/Starter/Pro), Turso + Drizzle, Vercel Blob

This file focuses exclusively on **v1.3 net-new features**: bulk generation, developer API, team collaboration, advanced analytics, i18n, campaign scheduling, custom short domains, seasonal templates, rate limiting, and error tracking.

---

## Feature Landscape: v1.3 Scale & Integrate

### Table Stakes (Users Expect These at This Stage)

Features that any QR code platform at this maturity level must offer. Missing these causes churn from power users and agency buyers.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Bulk QR generation via CSV | Agencies and operations teams can't manually create 50–500 QR codes; CSV → ZIP is the industry-standard workflow | HIGH | CSV parse server-side or client-side; ZIP with JSZip; each row = one QR code; filename = row identifier |
| REST API for programmatic generation | Developers building print pipelines or integrating QR into other SaaS products expect a documented API | HIGH | API key auth simpler than OAuth2 for this use case; key management UI in dashboard |
| API rate limiting | Any public-facing API must have abuse protection; without it a single bad actor can exhaust server capacity | MEDIUM | Upstash Redis sliding window; `@upstash/ratelimit` library; per-key and per-IP limits |
| Error tracking | Production SaaS without error visibility is flying blind; Sentry is table stakes for bug triage | LOW | `@sentry/astro` integration; source maps; auto-captures server + client errors |
| Custom date range in analytics | The fixed 30-day chart is useful for initial validation but power users need arbitrary date ranges for reporting | MEDIUM | Date picker → query filter on `scans` table; existing Recharts chart already supports dynamic data |
| CSV export of scan analytics | Users who pay for Pro expect to own their data; export for Excel/Sheets is expected | LOW | Stream DB query result as CSV; add download button in analytics panel |

### Differentiators (Competitive Advantage)

Features that move QRCraft from commodity tool to platform. Drive upgrade to higher tiers and reduce churn.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Team workspaces with roles | Agencies and marketing teams need shared QR libraries with role-based access; this unlocks a "Team" tier at 2–3x individual price | VERY HIGH | New `workspaces` + `workspace_members` tables; Owner / Editor / Viewer roles; shared library scoped to workspace; FK on existing QR tables |
| UTM parameter builder for dynamic QR | Automatically appends utm_source, utm_medium=qr-code, utm_campaign to destination URLs; routes scan data to GA4 | MEDIUM | UI form fields; append params before redirect; no GA4 server-side SDK needed |
| Campaign scheduling (activate on date) | Marketers create campaigns in advance and schedule auto-enable; reduces manual babysitting of campaigns | MEDIUM | `scheduled_at` column on `dynamicQrCodes`; cron job or Vercel cron checks pending activations; redirect handler checks schedule |
| Seasonal / holiday template packs | Themed visual presets for Christmas, Valentine's Day, etc.; drives return visits and reinforces brand value | LOW | Static template data additions; no new infra; reuses existing frame+color+shape system |
| Internationalization (ES, FR, DE) | Expands TAM to non-English markets; low-hanging fruit given Astro's built-in i18n routing | HIGH | Astro built-in i18n routing + Paraglide for type-safe translations; 3 locales minimum; React island translations need separate pass-through |
| Custom short domains for redirects | Enterprise differentiator: scans resolve through `go.brand.com/abc` instead of `qrcraft-app.com/r/abc`; white-label for agencies | VERY HIGH | CNAME verification per domain; Vercel multi-tenant domain API; SSL auto-provisioning; additional DNS propagation wait time (up to 48h); scope to top tier only |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full OAuth2 (authorization code flow) for API | "It's more secure" | Adds 1–2 weeks implementation vs 1 day for API keys; target audience is developers building server-to-server integrations, not user-facing OAuth apps; adds client registration, token refresh, revocation complexity | API key with HTTPS is sufficient for the M2M use case; add OAuth2 in v2 if enterprise SSO is required |
| Real-time scan analytics (WebSocket / SSE) | "Show scans as they happen" | Adds persistent connection infrastructure; Vercel serverless has no long-lived connections; Turso/libSQL not optimized for high-frequency polling | Refresh-on-demand or 30-second polling interval; real-time is only needed for high-volume campaigns that justify enterprise pricing |
| Bulk dynamic QR codes from CSV | "Generate 500 dynamic codes at once" | Each dynamic QR requires a DB row + short URL reservation; 500-row CSV = 500 inserts in one request; DoS risk; complex quota enforcement | Cap bulk dynamic generation at 50 per request; require Pro or Team tier; consider async job queue for large batches |
| Custom domain per individual QR code | "Each campaign has its own domain" | DNS provisioning per QR code is operationally untenable; requires custom domain pooling and tenant isolation | Custom domain per workspace (one domain per team account) is the correct scope |
| Team SSO / SAML | "Our company uses Okta" | Enterprise SSO is a dedicated 3–6 week project; Clerk supports it but requires Enterprise plan ($$$) | Defer to v2 enterprise tier; note Clerk has SAML support when needed |
| Ads in bulk-generated or API-served QR codes | "Monetize the API tier" | AdSense policy prohibits programmatic ad injection in non-human flows; destroys developer trust | Rate limit the free API tier; require API key (forces account creation); offer generous free tier with paid tiers for volume |

---

## Feature Dependencies

```
Bulk QR Generation (CSV → ZIP)
    └──requires──> Existing QR rendering logic (client-side, qr-code-styling)
    └──requires──> ZIP packaging (JSZip)
    └──optional──> Pro/Starter tier check (quota enforcement)

REST API
    └──requires──> API key management (generate, revoke, list)
    └──requires──> Rate limiting (Upstash Redis)
    └──enhances──> Bulk QR Generation (API can accept batch payloads)

Team Workspaces
    └──requires──> Existing Clerk auth (user identity)
    └──requires──> New DB tables: workspaces, workspace_members
    └──requires──> Existing QR library (shared within workspace)
    └──requires──> Stripe multi-seat billing logic (Team tier)

Advanced Analytics (date range + CSV export)
    └──requires──> Existing scans table (already has timestamp)
    └──requires──> Existing Recharts implementation (already dynamic)
    └──enhances──> UTM tracking (UTM params stored on scan record)

Campaign Scheduling
    └──requires──> Existing dynamicQrCodes table (add scheduled_at column)
    └──requires──> Vercel cron job (or similar scheduled invocation)

Custom Short Domains
    └──requires──> Existing dynamic redirect infrastructure (Vercel edge/serverless)
    └──requires──> Team Workspaces (domain scoped to workspace/org)
    └──requires──> Vercel multi-tenant domain API (programmatic CNAME verification)
    └──conflicts──> Simple deployment model (adds multi-tenant routing complexity)

i18n (ES, FR, DE)
    └──requires──> Astro built-in i18n routing (already in Astro 5)
    └──requires──> Paraglide (type-safe translation strings)
    └──conflicts──> Static page count (3x pages per locale for SEO, managed carefully)

Error Tracking (Sentry)
    └──requires──> @sentry/astro integration
    └──independent──> Everything else (can be added at any phase)

API Rate Limiting
    └──requires──> Upstash Redis (HTTP-based, serverless-compatible)
    └──requires──> REST API (protects API endpoints)
    └──enhances──> All public endpoints (redirect handler, landing pages)
```

### Dependency Notes

- **Team Workspaces requires REST API to be scoped correctly:** API keys should be workspace-scoped, not just user-scoped; implement API key management after workspace schema is defined.
- **Campaign Scheduling requires Vercel Cron:** Vercel Cron is available on Pro plan (`vercel.json` `crons` key); free tier has limitations on invocation frequency.
- **Custom Short Domains conflicts with simple deployment:** Multi-tenant domain routing requires Vercel's platform-level domain API, wildcard DNS, and CNAME verification flow. This is a non-trivial infrastructure change — implement last in v1.3 or defer to v2.
- **i18n conflicts with static page SEO strategy:** Adding 3 locales triples the static page count; hreflang tags are required or Google will treat them as duplicates; plan locale routing before writing content.
- **Error Tracking is independent:** Sentry can be added in the first phase with zero risk; it improves debuggability for all subsequent phases.

---

## MVP Definition for v1.3

### Launch With (Required for v1.3 to Ship)

- [ ] Error tracking (Sentry) — zero cost, immediate operational visibility, unblocks everything else
- [ ] API rate limiting (Upstash) — required before any public API ships; prevents abuse
- [ ] Bulk QR generation (CSV → ZIP, static only for free, dynamic for Pro/Starter) — highest-requested feature from agencies; tractable without new infra
- [ ] REST API with API key auth — unlocks developer integrations; simpler than OAuth2; scoped to user initially
- [ ] Advanced analytics (custom date range + CSV export) — completes the analytics feature set already partially built

### Add After Validation (v1.3.x)

- [ ] UTM parameter builder — enhances existing dynamic QR workflow; low complexity add-on
- [ ] Campaign scheduling — moderate complexity; adds `scheduled_at` + cron; validates before team features
- [ ] Seasonal / holiday template packs — no new infra; reuses existing template system; good for re-engagement
- [ ] i18n (ES, FR, DE) — significant translation effort but known path with Paraglide + Astro i18n routing

### Future Consideration (v2+)

- [ ] Team workspaces — biggest architectural change; new billing tier; validate solo-user growth first
- [ ] Custom short domains — VERY HIGH complexity; requires Vercel multi-tenant domain API + DNS verification flow; enterprise-only pricing justification needed
- [ ] OAuth2 for API — justified only when enterprise customers require delegated access; API keys sufficient until then
- [ ] SSO / SAML — Clerk supports it; defer until enterprise sales motion begins

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Error tracking (Sentry) | HIGH | LOW | P1 |
| API rate limiting | HIGH | MEDIUM | P1 |
| Bulk QR generation | HIGH | HIGH | P1 |
| REST API (API key auth) | HIGH | HIGH | P1 |
| Advanced analytics (date range + export) | HIGH | MEDIUM | P1 |
| UTM parameter builder | MEDIUM | MEDIUM | P2 |
| Campaign scheduling | MEDIUM | MEDIUM | P2 |
| Seasonal template packs | LOW | LOW | P2 |
| i18n (ES, FR, DE) | MEDIUM | HIGH | P2 |
| Team workspaces | HIGH | VERY HIGH | P3 |
| Custom short domains | MEDIUM | VERY HIGH | P3 |

**Priority key:**
- P1: Required for v1.3 milestone to be complete
- P2: High value, lower risk, add within v1.3 after P1 lands
- P3: Significant architectural or infrastructure commitment — consider for v2

---

## Competitor Feature Analysis

| Feature | Uniqode | QR Tiger | Hovercode | QRCraft v1.3 Plan |
|---------|---------|----------|-----------|-------------------|
| Bulk CSV → ZIP | Yes (2,000+ codes, enterprise) | Yes (Business+) | Yes (limited) | Yes (cap at 500, Pro/Starter) |
| REST API | Yes (full API, key-based) | Yes (Business) | Yes (limited) | Yes (API key, documented) |
| Team workspaces | Yes (Owner/Editor/Viewer) | Yes (enterprise) | Limited | P3 — defer to v2 |
| UTM tracking | Yes | Yes | Yes | Yes (inline builder UI) |
| Custom date range analytics | Yes | Yes | Yes | Yes (date picker on existing chart) |
| CSV analytics export | Yes | Yes | Partial | Yes (server-streamed CSV) |
| Campaign scheduling | Yes | Yes | No | Yes (scheduled_at + cron) |
| Custom short domains | Yes (CNAME, top tier) | Yes (enterprise) | No | P3 — defer to v2 |
| i18n UI | Partial (EN only) | Partial | No | Yes (ES, FR, DE) — differentiator |
| Seasonal templates | No | Limited | No | Yes (differentiator — unique) |
| Error tracking | Internal | Internal | Unknown | Sentry (developer-facing) |

---

## Sources

- Uniqode feature set: https://www.uniqode.com/ (product pages, help docs)
- Bulk generation patterns: https://qrcodekit.com/guides/bulk-qr-code-creation/ and https://www.qr-code-generator.com/guides/how-to-generate-qr-codes-in-bulk/
- API authentication comparison: https://boldsign.com/blogs/api-keys-vs-oauth-authentication/ and https://www.scalekit.com/blog/api-authentication-b2b-saas
- Rate limiting: https://upstash.com/blog/upstash-ratelimit and https://github.com/upstash/ratelimit-js
- Sentry + Astro: https://docs.sentry.io/platforms/javascript/guides/astro/ and https://docs.astro.build/en/guides/backend/sentry/
- Astro i18n: https://docs.astro.build/en/guides/internationalization/ (built-in routing, v4+)
- Paraglide i18n: https://github.com/Alexandre-Fernandez/astro-i18n and https://intlayer.org/doc/environment/astro
- Custom domain / CNAME: https://vercel.com/platforms/docs/multi-tenant-platforms/configuring-domains and https://www.qrcode-tiger.com/how-do-i-set-up-your-own-domain-to-a-dynamic-qr-code-generator-white-label
- Team collaboration patterns: https://qr-verse.com/en/blog/qr-code-team-collaboration and https://scanova.io/features/enterprise-qr-code-generator/
- UTM tracking: https://www.supercode.com/blog/qr-code-utm-parameters and https://hovercode.com/blog/qr-code-utm-link-tracking/
- QR code SaaS trends 2026: https://qrcodekit.com/news/qr-code-trends/ and https://www.supercode.com/blog/qr-code-tracking

---
*Feature research for: QR Code Generator SaaS — v1.3 Scale & Integrate*
*Researched: 2026-03-31*
