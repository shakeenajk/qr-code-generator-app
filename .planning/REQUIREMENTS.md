# Requirements: QRCraft

**Defined:** 2026-03-11
**Core Value:** Anyone can generate a visually stunning, fully customized QR code and download it immediately — no signup, no friction.

## v1.1 Requirements

### Auth

- [x] **AUTH-01**: User can sign up with email and password
- [x] **AUTH-02**: User can sign in with email and password
- [x] **AUTH-03**: User can sign in with Google or GitHub (OAuth)
- [x] **AUTH-04**: User session persists across browser refresh
- [x] **AUTH-05**: User can sign out

### Billing

- [x] **BILL-01**: User can upgrade to Pro via Stripe Checkout (monthly plan)
- [x] **BILL-02**: User can upgrade to Pro via Stripe Checkout (annual plan at a discount)
- [x] **BILL-03**: User can manage or cancel their subscription via Stripe Customer Portal
- [x] **BILL-04**: Pro status is reflected in the app after checkout completes (webhook-driven, not redirect-driven)
- [x] **BILL-05**: Subscription lifecycle events are handled (checkout, update, cancel, payment failure, trial end)

### Saved QR Library

- [x] **LIB-01**: Pro user can save a generated QR code to their library with a custom name
- [x] **LIB-02**: Pro user can view all saved QR codes in a dashboard
- [x] **LIB-03**: Pro user can reopen and edit a saved QR code
- [x] **LIB-04**: Pro user can delete a saved QR code from their library

### Dynamic QR Codes

- [x] **DYN-01**: Pro user can create a dynamic QR code that encodes a short redirect URL
- [x] **DYN-02**: Pro user can change the destination URL of a dynamic QR code without reprinting
- [x] **DYN-03**: Scanning a dynamic QR code redirects to the current destination via an edge function (low latency)
- [x] **DYN-04**: Pro user can toggle a dynamic QR code active or paused
- [x] **DYN-05**: Free authenticated user is limited to 3 dynamic QR codes

### Scan Analytics

- [x] **ANAL-01**: Pro user can view total and unique scan counts for a dynamic QR code
- [ ] **ANAL-02**: Pro user can view a 30-day time-series scan chart per QR code
- [ ] **ANAL-03**: Pro user can view device breakdown (iOS/Android/desktop) per QR code
- [ ] **ANAL-04**: Pro user can view top countries per QR code

### Pro Feature Gates

- [x] **GATE-01**: Logo upload in QR generator requires a Pro account (anonymous users remain ungated)
- [x] **GATE-02**: Advanced dot shapes require a Pro account (anonymous users remain ungated)
- [x] **GATE-03**: Anonymous users can use all static QR generation features without creating an account

## v2 Requirements

### Dynamic QR Codes (advanced)

- **DYN-V2-01**: User can set an expiry date on a dynamic QR code (campaign auto-expiry)
- **DYN-V2-02**: User can copy an existing QR code as a new draft
- **DYN-V2-03**: User receives an email alert when a scan limit threshold is reached

### Analytics (advanced)

- **ANAL-V2-01**: User can export scan data as CSV
- **ANAL-V2-02**: User can view scan analytics per date range (not just 30-day fixed window)

### Organization

- **ORG-V2-01**: User can organize saved QR codes into folders or tags
- **ORG-V2-02**: User can share a QR code with team members (multi-seat accounts)

### Additional Content Types

- **CONT-V2-01**: User can generate a QR code for an SMS message
- **CONT-V2-02**: User can generate a QR code for an email (mailto)
- **CONT-V2-03**: User can generate a QR code for a phone number (tel)
- **CONT-V2-04**: User can generate a QR code for a calendar event (VEVENT)

### Bulk Generation

- **BULK-V2-01**: User can generate multiple QR codes from a CSV upload

## Out of Scope

| Feature | Reason |
|---------|--------|
| QR code scanning/reading | Generator only; inverse operation is a separate product |
| Logo URL input | Canvas taint CORS issue; file upload is safer and sufficient |
| Custom short domains (e.g. go.brand.com) | Very high complexity; enterprise-only; defer to v2+ |
| Ads in redirect path | Anti-pattern; destroys user trust; never build |
| Watermarks on free QR output | Kills acquisition funnel; anonymous generation stays fully functional |
| Deleting data on subscription cancel | Gate create/edit, not read; users keep their QR codes |
| Requiring account for static QR generation | Breaks core acquisition model; anonymous flow stays ungated forever |
| Mobile native app | Web-first; native is a separate project |
| Multiple pages per content type | SEO cannibalization risk |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 7 | Complete |
| AUTH-02 | Phase 7 | Complete |
| AUTH-03 | Phase 7 | Complete |
| AUTH-04 | Phase 7 | Complete |
| AUTH-05 | Phase 7 | Complete |
| BILL-01 | Phase 8 | Complete |
| BILL-02 | Phase 8 | Complete |
| BILL-03 | Phase 8 | Complete |
| BILL-04 | Phase 8 | Complete |
| BILL-05 | Phase 8 | Complete |
| LIB-01 | Phase 9 | Complete |
| LIB-02 | Phase 9 | Complete |
| LIB-03 | Phase 9 | Complete |
| LIB-04 | Phase 9 | Complete |
| DYN-01 | Phase 10 | Complete |
| DYN-02 | Phase 10 | Complete |
| DYN-03 | Phase 10 | Complete |
| DYN-04 | Phase 10 | Complete |
| DYN-05 | Phase 10 | Complete |
| ANAL-01 | Phase 11 | Complete |
| ANAL-02 | Phase 11 | Pending |
| ANAL-03 | Phase 11 | Pending |
| ANAL-04 | Phase 11 | Pending |
| GATE-01 | Phase 9 | Complete |
| GATE-02 | Phase 9 | Complete |
| GATE-03 | Phase 9 | Complete |

**Coverage:**
- v1.1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-11*
*Last updated: 2026-03-11 after v1.1 roadmap creation*
