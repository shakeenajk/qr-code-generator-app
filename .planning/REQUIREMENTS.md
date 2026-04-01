# Requirements: QRCraft

**Defined:** 2026-03-31
**Core Value:** Anyone can generate a visually stunning, fully customized QR code and download it immediately — no signup, no friction.

## v1.2 Requirements

### Copy & Navigation

- [x] **COPY-01**: Homepage hero, FAQs, and feature sections reflect freemium model accurately (no "no limits" claims)
- [x] **COPY-02**: Header shows a visible Register/Sign Up button next to Sign In
- [x] **COPY-03**: Header has a clear navigation link to the /pricing page

### Pricing & Tiers

- [x] **TIER-01**: Pricing page shows accurate dynamic QR limits per tier (Free: 3, Starter: 10, Pro: 100)
- [x] **TIER-02**: Pricing page shows accurate total QR code limits per tier (Free: 5, Starter: 100, Pro: 250)
- [x] **TIER-03**: Tier limits are enforced server-side (centralized in one module, not hardcoded)
- [x] **TIER-04**: "No ads" benefit removed from Starter/Pro until ads are live on free tier

### SEO

- [x] **SEO-01**: Site submitted to Google Search Console with verified ownership
- [x] **SEO-02**: All pages have proper meta titles, descriptions, and Open Graph tags via astro-seo
- [x] **SEO-03**: JSON-LD structured data (SoftwareApplication, HowTo, BreadcrumbList) on relevant pages
- [x] **SEO-04**: QR code use cases landing page with rich content targeting long-tail keywords

### Homepage Sections

- [x] **HOME-01**: Pricing promotion section explaining when users need the paid plan
- [x] **HOME-02**: How-to section with step 1-2-3 guide using programmatic screenshots from the live site
- [x] **HOME-03**: QR code use cases section with ideas grid; clicking "more" routes to the full landing page (SEO-04)

### Content Types

- [x] **CONT-01**: User can generate a QR code for a PDF with hosted landing page (cover photo, title, description, social buttons, website URL)
- [x] **CONT-02**: User can generate a QR code for an App Store listing with hosted landing page (all store links, app name, description, branding)
- [x] **CONT-03**: PDF/App Store landing pages follow same QR code limits per tier (Free: 5, Starter: 100, Pro: 250)

### vCard Enhancements

- [x] **VCARD-01**: vCard tab supports Title, Company, Work Phone, Address, Website, and LinkedIn profile fields
- [x] **VCARD-02**: vCard encoding properly escapes special characters in all fields

### QR Frames & Templates

- [x] **FRAME-01**: User can add a decorative frame around the QR code (e.g. "Scan Me" text border, geometric borders with custom CTA text)
- [x] **FRAME-02**: Framed QR codes export correctly as PNG (Canvas composition)
- [x] **FRAME-03**: User can choose from preset style templates (frame + color + shape combos) as quick-start options

### Advertising

- [x] **ADS-01**: Free-tier users see Google AdSense ads on the generator page (not in QR redirect path)
- [x] **ADS-02**: Starter/Pro users and anonymous users loading the page do not see ads (ads only for signed-in free tier)

## Future Requirements

### From v1.1 REQUIREMENTS.md (deferred)

- **DYN-V2-01**: User can set an expiry date on a dynamic QR code
- **DYN-V2-02**: User can copy an existing QR code as a new draft
- **DYN-V2-03**: User receives an email alert when a scan limit threshold is reached
- **ANAL-V2-01**: User can export scan data as CSV
- **ANAL-V2-02**: User can view scan analytics per date range
- **ORG-V2-01**: User can organize saved QR codes into folders or tags
- **ORG-V2-02**: User can share a QR code with team members
- **CONT-V2-01**: User can generate a QR code for an SMS message
- **CONT-V2-02**: User can generate a QR code for an email (mailto)
- **CONT-V2-03**: User can generate a QR code for a phone number (tel)
- **CONT-V2-04**: User can generate a QR code for a calendar event (VEVENT)
- **BULK-V2-01**: User can generate multiple QR codes from a CSV upload

## Out of Scope

| Feature | Reason |
|---------|--------|
| QR code scanning/reading | Generator only; inverse operation is a separate product |
| Logo URL input | Canvas taint CORS issue; file upload is safer and sufficient |
| Custom short domains (e.g. go.brand.com) | Enterprise-only; defer to v2+ |
| Ads in redirect path | Anti-pattern; destroys user trust |
| Watermarks on free QR output | Kills acquisition funnel |
| Requiring account for static QR generation | Breaks core acquisition model |
| Phone mockup frames | Anti-feature per research; geometric borders + CTA text sufficient |
| User-generated public templates | Anti-feature; curated presets only |
| vCard 4.0 format | iOS has inconsistent 4.0 support; stick with 3.0 |
| SVG export with frames | Canvas composition is raster-only; SVG export stays frameless |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| COPY-01 | Phase 12 | Complete |
| COPY-02 | Phase 12 | Complete |
| COPY-03 | Phase 12 | Complete |
| TIER-01 | Phase 12 | Complete |
| TIER-02 | Phase 12 | Complete |
| TIER-03 | Phase 12 | Complete |
| TIER-04 | Phase 12 | Complete |
| VCARD-01 | Phase 12 | Complete |
| VCARD-02 | Phase 12 | Complete |
| SEO-01 | Phase 13 | Complete |
| SEO-02 | Phase 13 | Complete |
| SEO-03 | Phase 13 | Complete |
| SEO-04 | Phase 13 | Complete |
| HOME-01 | Phase 13 | Complete |
| HOME-02 | Phase 13 | Complete |
| HOME-03 | Phase 13 | Complete |
| FRAME-01 | Phase 14 | Complete |
| FRAME-02 | Phase 14 | Complete |
| FRAME-03 | Phase 14 | Complete |
| CONT-01 | Phase 15 | Complete |
| CONT-02 | Phase 15 | Complete |
| CONT-03 | Phase 15 | Complete |
| ADS-01 | Phase 16 | Complete |
| ADS-02 | Phase 16 | Complete |

**Coverage:**
- v1.2 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 — traceability complete after v1.2 roadmap creation*
