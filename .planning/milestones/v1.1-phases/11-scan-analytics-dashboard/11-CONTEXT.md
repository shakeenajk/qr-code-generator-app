# Phase 11: Scan Analytics Dashboard - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Pro users can view meaningful scan analytics for each dynamic QR code they own — total scans, unique scan count, a 30-day time-series chart, device breakdown (iOS/Android/desktop), and top countries by scan count. Bot traffic is filtered at write time and never enters analytics counts.

**In scope:** Scan event recording in the redirect edge function, `scan_events` DB table, analytics API routes, analytics page at `/dashboard/analytics/[slug]`, Tremor area chart, device/country progress-bar breakdowns.

**Out of scope:** Per-date-range filtering (v2 / ANAL-V2-02), CSV export (v2 / ANAL-V2-01), analytics for static QR codes, scan alerts (v2 / DYN-V2-03).

</domain>

<decisions>
## Implementation Decisions

### Analytics entry point
- **D-01:** Analytics are accessed via a dedicated page: `/dashboard/analytics/[slug]`. Navigating to this page is triggered by a new "Analytics" action button added to dynamic QR cards in the library.
- **D-02:** The "Analytics" action button sits alongside existing dynamic card actions (Edit, pause toggle, Delete). A chart-icon button is appropriate to keep it visually distinct. Only dynamic QR cards show this button — static cards do not.
- **D-03:** The analytics page shows the QR name and slug in the header so the user knows which QR they're viewing. A back link to `/dashboard` is included.

### Analytics page layout
- **D-04:** Single scrollable page — all 4 analytics dimensions on one page, no tabs. Layout from top to bottom:
  1. Stat cards row: **Total scans** + **Unique scans** (side by side)
  2. **30-day time-series area chart** (full width)
  3. **Device breakdown** (iOS / Android / Desktop) — progress-bar list
  4. **Top countries** — progress-bar list (top 5)
- **D-05:** Device breakdown and top countries use a simple progress-bar list format: label | fill bar | count | percentage. Example: `iOS  ████████░░  65%  (134)`. No pie/donut charts for these sections.

### Chart library
- **D-06:** Use **Tremor** for the analytics chart components. Install `@tremor/react` as a new dependency.
- **D-07:** Chart type is **AreaChart** (line with filled area). X-axis = date (last 30 days), Y-axis = scan count. Tooltip on hover shows date + scan count for that day.
- **D-08:** The area chart must support Tailwind dark mode. Use Tremor's built-in dark mode support.

### Bot filtering
- **D-09:** Bot traffic is filtered **at write time** in `[slug].ts`. Before inserting a `scan_events` row, check the User-Agent against a lightweight list of known bot patterns (Googlebot, bingbot, AhrefsBot, facebookexternalhit, Twitterbot, LinkedInBot, etc.). If matched, do not insert — redirect proceeds normally but no event is stored.
- **D-10:** Bot filtering is silent — no response difference for bots. The redirect still happens; bots just don't get counted.

### Scan event schema
- **D-11:** Add a `scan_events` table to `schema.ts` with fields: `id` (text PK, UUID), `dynamicQrCodeId` (FK → `dynamic_qr_codes.id`, cascade delete), `scannedAt` (integer, Unix timestamp), `userAgent` (text, nullable), `country` (text, nullable, ISO 3166-1 alpha-2), `device` (text, nullable — `'ios' | 'android' | 'desktop' | 'unknown'`). Index on `dynamicQrCodeId` + `scannedAt` for range queries.
- **D-12:** Device detection is done at write time in the edge function via User-Agent string parsing. Simple regex patterns: iOS = `/iPhone|iPad|iPod/i`, Android = `/Android/i`, everything else = `desktop`.
- **D-13:** Country detection uses **Vercel's `x-vercel-ip-country` request header** — free, zero-latency, no external API. Falls back to `null` if header is absent.

### Analytics API
- **D-14:** New API route: `GET /api/analytics/[slug]` — returns totals, time-series, device breakdown, and top countries for the given slug. Auth check (user must own the dynamic QR). Pro gate (only Pro users can view analytics).
- **D-15:** The analytics API computes all 4 dimensions in a single DB query batch (or multiple queries in one request) to minimize round trips.
- **D-16:** Unique scan count is approximated by counting distinct `(country + device + day)` combinations, since there's no user identity for anonymous scanners. This is a reasonable proxy — note it as an approximation in the UI ("~unique scans").

### Claude's Discretion
- Exact Tremor component props and color palette for the area chart (should use indigo to match existing dashboard accent color)
- Loading state for the analytics page (skeleton loaders or spinner)
- Empty state when a QR has 0 scans (friendly illustration + "No scans yet" copy)
- Whether analytics page is an Astro page (SSR) that fetches data server-side, or a React component that fetches client-side. SSR preferred for initial load performance.
- Exact bot UA pattern list (extend as needed; start with the major crawlers)
- Page title and breadcrumb formatting

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/REQUIREMENTS.md` §ANAL-01 through ANAL-04 — full acceptance criteria for analytics features

### Prior phase foundations
- `.planning/phases/10-dynamic-qr-redirect-service/10-CONTEXT.md` — Dynamic QR schema, slug structure, edge function pattern, tier-gating decisions
- `.planning/phases/09-saved-qr-library-pro-gates/09-CONTEXT.md` — Dashboard grid layout, card action pattern, sonner toast pattern, tier check pattern
- `.planning/phases/08-stripe-billing/08-CONTEXT.md` — Pro tier definition, tier resolution logic
- `src/db/schema.ts` — Current DB schema (`dynamicQrCodes`, `savedQrCodes`, `subscriptions`); Phase 11 adds `scanEvents` table
- `src/pages/r/[slug].ts` — Edge function that Phase 11 modifies to add scan event recording (currently redirect-only)
- `src/lib/billing.ts` — Tier resolution; analytics page gate check imports from here
- `src/components/dashboard/QRLibrary.tsx` — Current dynamic QR card structure; Phase 11 adds Analytics button here

### Stack references
- Memory note: Vercel edge functions / Astro SSR routes can read `request.headers.get('x-vercel-ip-country')` for country
- Tremor docs: `@tremor/react` AreaChart component — install as new dependency

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/dashboard/QRLibrary.tsx`: Dynamic QR card already has `isDynamic` flag and action buttons pattern — add Analytics button here
- `src/pages/dashboard/index.astro`: Dashboard page with `DashboardLayout` wrapper — analytics page follows same layout
- `src/lib/billing.ts`: `tierFromPriceId()` and tier check pattern — analytics page Pro gate uses same check
- `src/pages/api/qr/`: Existing API route pattern (auth check → tier check → DB query) — analytics API route follows same pattern
- Sonner toasts: already set up in the app — use for any analytics page errors

### Established Patterns
- `export const prerender = false` on all API routes and SSR pages
- `locals.auth()` for Clerk session in API routes and Astro pages
- `client:only="react"` for React components using browser state (Clerk hooks)
- Tailwind v4 + dark mode (`dark:` variants) — analytics page and all new components must support dark mode
- Tier check: query `subscriptions` table by `userId`, check `tier` field

### Integration Points
- `src/pages/r/[slug].ts`: Add scan event write before redirect (after bot check). Keep the redirect path as fast as possible — write event using `db.insert()` fire-and-forget is acceptable since analytics is non-blocking.
- `src/db/schema.ts`: Add `scanEvents` table with FK to `dynamicQrCodes`
- `src/components/dashboard/QRLibrary.tsx`: Add Analytics button to dynamic QR card action row
- `src/pages/dashboard/analytics/[slug].astro` (new): Analytics page — SSR, reads scan data server-side, renders Tremor chart as a React island
- `src/pages/api/analytics/[slug].ts` (new): Analytics data API route

</code_context>

<specifics>
## Specific Ideas

- The analytics page should feel like Vercel's analytics or Stripe's dashboard — clean stat cards at top, area chart below, simple breakdowns.
- Unique scan count is an approximation (distinct day+device+country combos) — label it "~unique" in the UI to be honest with users.
- Tremor area chart should use indigo to match the existing dashboard accent color.
- Empty state (0 scans): show a friendly message — "No scans yet. Share your QR code to start tracking."

</specifics>

<deferred>
## Deferred Ideas

- Per-date-range filtering (e.g., 7 days, 90 days, custom) — ANAL-V2-02
- CSV export of scan data — ANAL-V2-01
- Scan-limit threshold email alerts — DYN-V2-03
- Real unique visitor tracking (fingerprinting or session tokens) — privacy complexity; approximation is fine for v1.1
- Pie/donut charts for device breakdown — opted for simpler progress bars in v1.1

</deferred>

---

*Phase: 11-scan-analytics-dashboard*
*Context gathered: 2026-03-30*
