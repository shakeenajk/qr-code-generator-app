# Requirements: QRCraft

**Defined:** 2026-04-02
**Core Value:** Anyone can generate a visually stunning, fully customized QR code and download it immediately — no signup, no friction.

## v1.3 Requirements

Requirements for v1.3 Scale & Integrate. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: All production errors are captured in Sentry with readable stack traces and source maps
- [x] **INFRA-02**: All public API endpoints are rate-limited via Upstash Redis (the /r/[slug] redirect path is excluded from rate limiting)
- [x] **INFRA-03**: Rate limit responses return 429 with Retry-After header

### Bulk Generation

- [x] **BULK-01**: User can upload a CSV file with URL, text, or WiFi columns to generate QR codes in batch (up to 500 per batch)
- [x] **BULK-02**: User can download all generated QR codes as a single ZIP file (client-side assembly via JSZip)
- [x] **BULK-03**: Bulk generation respects tier limits (total QR count); user sees clear error if batch would exceed limit
- [x] **BULK-04**: User can preview the batch before downloading (thumbnail grid of generated QR codes)

### REST API

- [x] **API-01**: Developer can create a QR code via POST /api/v1/generate with JSON body (URL, text, WiFi, vCard content types)
- [x] **API-02**: Developer can manage API keys in the dashboard (create, revoke, view usage)
- [x] **API-03**: API requests are rate-limited per key with usage tracking visible in dashboard
- [x] **API-04**: API returns QR code as base64 PNG or SVG in JSON response

### Advanced Analytics

- [ ] **ANALYTICS-01**: User can select a custom date range for scan analytics (not just last 30 days)
- [ ] **ANALYTICS-02**: User can export scan data as CSV (date, device, country, UTM parameters)
- [ ] **ANALYTICS-03**: Dynamic QR scans capture UTM parameters (source, medium, campaign) from the redirect URL
- [ ] **ANALYTICS-04**: Analytics dashboard shows UTM breakdown chart alongside device and country charts

### Campaign Scheduling

- [ ] **CAMPAIGN-01**: User can set a future activation date and optional deactivation date on a dynamic QR code
- [ ] **CAMPAIGN-02**: Dashboard shows scheduled QR codes with countdown to activation and current status (scheduled/active/expired)
- [ ] **CAMPAIGN-03**: Scheduled QR codes activate and deactivate automatically via background job (QStash or Vercel Cron)

### Internationalization

- [ ] **I18N-01**: Marketing pages (homepage, pricing, use cases) are available in Spanish, French, and German
- [ ] **I18N-02**: Language switcher is accessible in the site header; selection persists across page navigation
- [ ] **I18N-03**: Each translated page has correct hreflang tags for SEO; sitemap includes all language variants

### Seasonal Templates

- [ ] **TEMPLATE-01**: 20+ seasonal/holiday template presets are available (Christmas, Halloween, Valentine's, Easter, Black Friday, Summer, Back to School, etc.)
- [ ] **TEMPLATE-02**: Homepage features a seasonal collection section that highlights currently relevant templates based on the calendar

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Team Collaboration

- **TEAM-01**: User can create a workspace and invite team members by email
- **TEAM-02**: Workspace members share a QR library with role-based access (Admin, Editor, Viewer)
- **TEAM-03**: Workspace has its own tier limits and billing (multi-seat Stripe subscription)
- **TEAM-04**: Activity audit log shows who created, edited, or deleted QR codes

### Custom Short Domains

- **DOMAIN-01**: User can add a custom domain (e.g., go.brand.com) for dynamic QR redirects
- **DOMAIN-02**: Domain verification via DNS CNAME record with automatic SSL provisioning
- **DOMAIN-03**: Analytics are segmented by domain

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth2 authorization server | API keys with HTTPS are sufficient for M2M developer use; OAuth2 adds 1-2 weeks for no user benefit |
| AI-generated QR designs | Trend-following; core value is manual customization control |
| Mobile native app | Web-first; PWA is sufficient for mobile use |
| NFC code support | QR-only product; NFC is a different medium |
| White-label solution | Enterprise feature; requires multi-tenant architecture deferred to v2 |
| Server-side bulk QR with full styling | qr-code-styling is DOM-dependent; client-side generation is the documented v1.3 approach |
| Real-time collaboration | Not core to QR generation workflow |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 17 | Complete |
| INFRA-02 | Phase 17 | Complete |
| INFRA-03 | Phase 17 | Complete |
| BULK-01 | Phase 18 | Complete |
| BULK-02 | Phase 18 | Complete |
| BULK-03 | Phase 18 | Complete |
| BULK-04 | Phase 18 | Complete |
| API-01 | Phase 19 | Complete |
| API-02 | Phase 19 | Complete |
| API-03 | Phase 19 | Complete |
| API-04 | Phase 19 | Complete |
| ANALYTICS-01 | Phase 20 | Pending |
| ANALYTICS-02 | Phase 20 | Pending |
| ANALYTICS-03 | Phase 20 | Pending |
| ANALYTICS-04 | Phase 20 | Pending |
| CAMPAIGN-01 | Phase 21 | Pending |
| CAMPAIGN-02 | Phase 21 | Pending |
| CAMPAIGN-03 | Phase 21 | Pending |
| TEMPLATE-01 | Phase 22 | Pending |
| TEMPLATE-02 | Phase 22 | Pending |
| I18N-01 | Phase 23 | Pending |
| I18N-02 | Phase 23 | Pending |
| I18N-03 | Phase 23 | Pending |

**Coverage:**
- v1.3 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 — traceability complete after roadmap creation*
