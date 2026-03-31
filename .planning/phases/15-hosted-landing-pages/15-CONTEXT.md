# Phase 15: Hosted Landing Pages - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Two new content types (PDF and App Store) that generate QR codes pointing to hosted, branded landing pages at `/p/[slug]`. Includes file storage via Vercel Blob, a new `landingPages` DB table, new generator tabs, landing page SSR routes, and full CRUD (create, edit, delete) for landing page content.

</domain>

<decisions>
## Implementation Decisions

### PDF Landing Page
- **D-01:** Creation form fields: cover photo upload, title, description, website URL, social sharing buttons (Facebook, Twitter, LinkedIn), PDF file upload, company name, CTA button text
- **D-02:** Hosted page renders embedded PDF viewer (first pages visible) with download button and metadata sidebar (title, description, company, website link, social buttons)
- **D-03:** PDF file stored via Vercel Blob; cover photo also via Vercel Blob

### App Store Landing Page
- **D-04:** Two store URLs only: iOS App Store + Google Play
- **D-05:** Always show landing page with both store buttons visible — no OS auto-redirect
- **D-06:** Creation form fields: app name, app icon upload, iOS URL, Google Play URL, description, screenshot/trailer URL, company name, CTA button text
- **D-07:** App icon stored via Vercel Blob

### QR Routing
- **D-08:** Claude's discretion — decide whether QR encodes `/r/[slug]` (scan tracking) or `/p/[slug]` (direct)

### Landing Page Editing
- **D-09:** Full editing — user can update all fields including re-uploading cover photo, PDF file, and app icon from the dashboard
- **D-10:** Edit flow should be accessible from the QR library (dashboard)

### Tier Limits
- **D-11:** PDF and App Store landing pages count toward the same QR code limits as other types (Free: 5, Starter: 100, Pro: 250) — enforced via existing `tierLimits.ts`
- **D-12:** File upload size limits: product decision needed (research suggests 10MB free, 25MB Pro)

### Claude's Discretion
- QR routing approach (through `/r/[slug]` for scan tracking vs direct `/p/[slug]`)
- `landingPages` DB table schema design
- Landing page slug generation approach
- Social sharing button implementation
- PDF viewer library/approach (embedded iframe vs canvas-based)
- File size limits per tier

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Infrastructure
- `src/pages/r/[slug].ts` — Dynamic QR redirect endpoint (scan tracking, bot filtering)
- `src/pages/api/qr/save.ts` — QR save API with tier limit enforcement via tierLimits.ts
- `src/pages/api/qr/[id].ts` — QR CRUD (GET/PUT/DELETE) with IDOR prevention
- `src/pages/api/qr/list.ts` — QR list API with LEFT JOIN pattern
- `src/lib/tierLimits.ts` — Centralized tier limits (Free: 5/3, Starter: 100/10, Pro: 250/100)
- `src/db/schema.ts` — Existing DB tables (savedQrCodes, dynamicQrCodes, scanEvents, subscriptions)

### Generator UI
- `src/components/QRGeneratorIsland.tsx` — Main generator with tab system (URL, Text, WiFi, vCard)
- `src/components/tabs/UrlTab.tsx` — Example tab component pattern
- `src/components/tabs/VCardTab.tsx` — Extended tab with many fields (reference for complex form)

### Dashboard
- `src/components/dashboard/QRLibrary.tsx` — QR library grid with edit/delete actions
- `src/pages/dashboard/index.astro` — Dashboard page with tier check

### Research
- `.planning/research/SUMMARY.md` — Vercel Blob approach, architecture decisions
- `.planning/research/ARCHITECTURE.md` — Landing page data model, `/p/[slug]` route design

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tierLimits.ts` — Tier limit enforcement, import and use for landing page count checks
- Tab component pattern (UrlTab, VCardTab) — New PdfTab and AppStoreTab follow same interface
- `save.ts` API pattern — Extend or create parallel endpoint for landing page saves
- `QRLibrary.tsx` card pattern — Extend for PDF/App Store cards with edit/view actions
- `DynamicCardBody` sub-component pattern — Create `LandingPageCardBody` following same approach

### Established Patterns
- File uploads use FileReader → data URI (logo upload in LogoSection.tsx)
- Vercel Blob: new pattern — needs `@vercel/blob` install and presigned token API route
- SSR pages use `prerender = false` with `locals.auth()` for protected routes
- Public pages (landing pages) don't require auth — anyone scanning the QR sees the page

### Integration Points
- New tabs (PDF, App Store) added to QRGeneratorIsland tab system
- New API routes: `/api/landing/save`, `/api/landing/[id]`, `/api/blob/upload`
- New SSR page: `/p/[slug].astro` — public, no auth required
- New DB table: `landingPages` with FK to `savedQrCodes`
- Dashboard: QRLibrary extended to show PDF/App Store cards with landing page actions

</code_context>

<specifics>
## Specific Ideas

- PDF viewer should show first few pages of the uploaded PDF with a download button
- App Store page should have both store buttons prominently displayed regardless of device
- Social sharing buttons: Facebook, Twitter/X, LinkedIn
- Landing pages should have OG meta tags for social sharing preview

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-hosted-landing-pages*
*Context gathered: 2026-03-31*
