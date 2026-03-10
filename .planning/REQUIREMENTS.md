# Requirements: QRCraft

**Defined:** 2026-03-06
**Core Value:** Anyone can generate a visually stunning, fully customized QR code and download it immediately — no signup, no friction.

## v1 Requirements

### Content Types

- [x] **CONT-01**: User can generate a QR code from a URL/website link
- [x] **CONT-02**: User can generate a QR code from plain text
- [x] **CONT-03**: User can generate a QR code from WiFi credentials (SSID, password, security type)
- [x] **CONT-04**: User can generate a QR code from vCard contact info (name, phone, email, organization)
- [x] **CONT-05**: User can switch between content types without losing other settings

### Live Preview

- [x] **PREV-01**: QR code preview updates in real time as user edits content or settings (debounced)
- [x] **PREV-02**: Preview container is fixed size (no layout shift as QR version changes)
- [x] **PREV-03**: Preview shows an empty/placeholder state when no content is entered

### Visual Customization

- [ ] **CUST-01**: User can set foreground (dot) color via color picker
- [ ] **CUST-02**: User can set background color via color picker
- [ ] **CUST-03**: User can apply a gradient to the QR dots (linear or radial)
- [ ] **CUST-04**: User can choose dot/module shape (square, rounded, dots, classy)
- [ ] **CUST-05**: User can choose corner eye frame style
- [ ] **CUST-06**: User can choose corner eye pupil style
- [ ] **CUST-07**: Color contrast between fg and bg is validated to ensure QR scannability

### Logo Embedding

- [x] **LOGO-01**: User can upload a local image file to embed in the center of the QR code
- [x] **LOGO-02**: Logo upload automatically sets error correction level to H
- [x] **LOGO-03**: Logo size is capped at 25% of total QR area to preserve scannability
- [x] **LOGO-04**: User can remove the uploaded logo

### Export

- [ ] **EXPO-01**: User can download the QR code as PNG (3x resolution for print quality)
- [ ] **EXPO-02**: User can download the QR code as true vector SVG (not raster-in-SVG)
- [ ] **EXPO-03**: User can copy the QR code to clipboard as PNG image
- [ ] **EXPO-04**: Clipboard copy shows graceful fallback/message when browser does not support it

### Branding & UX

- [x] **BRAND-01**: Site displays the QRCraft SVG logo — letter "Q" built from QR dot grid pattern
- [x] **BRAND-02**: Site design uses clean white base with bold accent color (primary brand color)
- [x] **BRAND-03**: Site is fully responsive and usable on mobile devices
- [ ] **BRAND-04**: Site supports dark mode based on system preference

### SEO

- [x] **SEO-01**: Page has optimized title tag and meta description targeting QR code generator queries
- [x] **SEO-02**: Page has Open Graph tags (og:title, og:description, og:image) for social sharing
- [x] **SEO-03**: Page includes JSON-LD structured data: WebApplication schema
- [x] **SEO-04**: Page includes JSON-LD structured data: FAQPage schema
- [x] **SEO-05**: Page has a visible FAQ section targeting long-tail QR search queries
- [x] **SEO-06**: Site has a sitemap.xml
- [x] **SEO-07**: Site has a robots.txt
- [x] **SEO-08**: Page uses semantic HTML (h1, h2, main, section, article, nav) correctly
- [ ] **SEO-09**: Page achieves Lighthouse performance score 90+ on mobile

## v2 Requirements

### Dynamic QR Codes

- **DYN-01**: User can create a dynamic QR code that redirects through a tracked URL
- **DYN-02**: User can view scan counts and analytics for their dynamic codes
- **DYN-03**: User can update the destination URL without reprinting the QR code

### Accounts & History

- **ACC-01**: User can create an account to save generated QR codes
- **ACC-02**: User can view history of previously generated QR codes
- **ACC-03**: User can re-open and re-edit a saved QR code

### Additional Content Types

- **CONT-V2-01**: User can generate a QR code for a calendar event (VEVENT)
- **CONT-V2-02**: User can generate a QR code for an SMS message
- **CONT-V2-03**: User can generate a QR code for an email (mailto)
- **CONT-V2-04**: User can generate a QR code for a phone number (tel)

### Bulk Generation

- **BULK-01**: User can generate multiple QR codes from a CSV upload

## Out of Scope

| Feature | Reason |
|---------|--------|
| QR code scanning / reading | Generator only for v1 — inverse operation, separate product |
| Logo URL input | Canvas taint CORS issue requires server-side proxy; file upload is safer and sufficient |
| Monetization / ads | Not decided; architecture should not block future freemium additions |
| Mobile native app | Web-first; native app is a separate project |
| Server-side QR generation | No backend needed; all rendering is client-side |
| Multiple pages per content type | SEO cannibalization — one well-structured page outperforms thin multi-page approach |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONT-01 | Phase 2 | Complete |
| CONT-02 | Phase 2 | Complete |
| CONT-03 | Phase 2 | Complete |
| CONT-04 | Phase 2 | Complete |
| CONT-05 | Phase 2 | Complete |
| PREV-01 | Phase 2 | Complete |
| PREV-02 | Phase 2 | Complete |
| PREV-03 | Phase 2 | Complete |
| CUST-01 | Phase 3 | Pending |
| CUST-02 | Phase 3 | Pending |
| CUST-03 | Phase 3 | Pending |
| CUST-04 | Phase 3 | Pending |
| CUST-05 | Phase 3 | Pending |
| CUST-06 | Phase 3 | Pending |
| CUST-07 | Phase 3 | Pending |
| LOGO-01 | Phase 3 | Complete |
| LOGO-02 | Phase 3 | Complete |
| LOGO-03 | Phase 3 | Complete |
| LOGO-04 | Phase 3 | Complete |
| EXPO-01 | Phase 4 | Pending |
| EXPO-02 | Phase 4 | Pending |
| EXPO-03 | Phase 4 | Pending |
| EXPO-04 | Phase 4 | Pending |
| BRAND-01 | Phase 1 | Complete |
| BRAND-02 | Phase 1 | Complete |
| BRAND-03 | Phase 1 | Complete |
| BRAND-04 | Phase 4 | Pending |
| SEO-01 | Phase 1 | Complete |
| SEO-02 | Phase 1 | Complete |
| SEO-03 | Phase 1 | Complete |
| SEO-04 | Phase 1 | Complete |
| SEO-05 | Phase 1 | Complete |
| SEO-06 | Phase 1 | Complete |
| SEO-07 | Phase 1 | Complete |
| SEO-08 | Phase 1 | Complete |
| SEO-09 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after roadmap creation — traceability confirmed, count corrected to 36*
