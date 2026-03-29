# Phase 10: Dynamic QR Redirect Service - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the dynamic QR redirect layer: a Vercel edge function at `/r/[slug]` that looks up the slug in the DB and redirects to the current destination. Pro users (and free users up to a limit of 3) can create dynamic QRs from the generator, edit their destination URL inline from the dashboard, and pause/unpause them. The QR code itself never changes after printing — only the destination it points to changes.

**In scope:** Slug generation, edge function redirect, paused/invalid holding pages, "Dynamic QR" toggle in generator, inline destination editing in dashboard, active/paused toggle on card, tier-based limits.

**Out of scope:** Scan analytics (Phase 11), custom short domains (v2+), slug customization by user.

</domain>

<decisions>
## Implementation Decisions

### Creation flow
- **D-01:** Dynamic QR is created via a "Dynamic QR" toggle in the URL content section of the generator (the existing QRGeneratorIsland). The toggle is visible only on the URL tab.
- **D-02:** When a non-URL tab is active (WiFi, text, vCard), the Dynamic QR toggle is greyed out with a tooltip: "Dynamic QR only works with URL content." User must switch to URL tab first — no auto-switching.
- **D-03:** Enabling the toggle causes the QR to encode `/r/{slug}` (a short redirect URL on qr-code-generator-app.com) instead of the raw destination URL. The destination URL field stays visible — user enters where the QR should redirect to.
- **D-04:** Slug is always auto-generated (nanoid, ~8 chars). No user-customizable slugs in v1.1. The slug is generated at save time and stored immutably.
- **D-05:** Dynamic QRs are saved via the existing Phase 9 "Save to Library" flow. No separate creation modal or dashboard button needed.

### Dashboard integration
- **D-06:** Dynamic QRs appear in the same "My QR Codes" grid as static QRs. They have a "Dynamic" badge on the card to distinguish them visually.
- **D-07:** Dynamic QR cards show additional info vs static: current destination URL, active/paused status indicator.
- **D-08:** Destination URL is editable inline on the card. An edit icon next to the destination URL makes the field inline-editable on click. Saves on "Save" button or cancels with "Cancel". Toast confirms save ("Destination updated").
- **D-09:** Active/paused state is a direct toggle on the card (no confirmation modal). Toggling shows a toast: "QR paused — scanners will see a holding page" or "QR activated." The toggle is immediate, no extra steps.
- **D-10:** Card actions for dynamic QRs: inline destination edit, pause/activate toggle, "Edit QR" (reopens generator with Phase 9 edit flow to change styling/name), Delete.

### Tier access
- **D-11:** Free authenticated users get 3 dynamic QRs as a freemium trial. Pro users get unlimited. Starter tier follows free tier rules (3 limit) — dynamic QR is effectively a Pro feature with a free taste.
- **D-12:** When a free/Starter user hits the 3-QR limit and tries to create a 4th, they see an upgrade prompt ("Upgrade to Pro for unlimited dynamic QR codes").
- **D-13:** Existing dynamic QRs on free accounts keep working indefinitely — the user just can't create more. Consistent with Phase 8 principle: "gate create/edit, not read; users keep their QR codes."
- **D-14:** The "Dynamic QR" toggle in the generator shows a Pro lock indicator for users who have already hit their limit (not for users still under limit).

### Paused state & invalid slugs
- **D-15:** When a paused QR is scanned, the edge function renders (or redirects to) a branded holding page. Copy: "This QR code is temporarily paused. The owner has disabled this link." Branded with the QRCraft logo.
- **D-16:** When a slug doesn't exist (invalid or deleted QR), same branded holding page template with different copy: "This QR code is no longer active."
- **D-17:** The holding page is a simple Astro/HTML page — minimal, mobile-friendly (it's being viewed on a phone after scanning), with QRCraft logo. No nav, no footer. Just the message and logo.

### Claude's Discretion
- Schema design: whether to extend `savedQrCodes` with `is_dynamic`, `slug`, `destination_url`, `is_paused` columns OR create a separate `dynamicQrCodes` table. Separate table is likely cleaner for Phase 11 analytics (scan_events FK to dynamicQrCodes.id), but researcher/planner should evaluate.
- Exact nanoid length and character set for slug (target: short enough to be a compact QR code, long enough to avoid collisions at scale)
- Edge function implementation: `export const runtime = 'edge'` in an Astro endpoint at `src/pages/r/[slug].ts` with `@libsql/client/web` for DB lookup
- Holding page route: `/r/[slug]` vs a separate `/paused` page vs inline HTML response from edge function
- Slug collision check on generation (probability analysis + retry logic)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase requirements
- `.planning/REQUIREMENTS.md` §DYN-01 through DYN-05 — full acceptance criteria for dynamic QR codes

### Prior phase foundations
- `.planning/phases/08-stripe-billing/08-CONTEXT.md` — tier structure (Free/Starter/Pro), pricing, tier-gating patterns
- `.planning/phases/09-saved-qr-library-pro-gates/09-CONTEXT.md` — save flow, edit flow, dashboard grid layout, toast pattern (sonner), Phase 9 DB schema
- `src/db/schema.ts` — current DB schema (subscriptions, stripeEvents, savedQrCodes); Phase 10 extends this
- `src/pages/api/qr/save.ts` — existing save API route pattern (auth check, tier check, DB insert)
- `src/lib/billing.ts` — tier resolution logic; Phase 10 gate checks import from here
- `astro.config.mjs` — Vercel adapter config; edge function needs `export const runtime = 'edge'` + `@libsql/client/web`

### Stack references
- Memory note: Vercel edge functions use `@libsql/client/web` (not `@libsql/client`) for DB access from edge runtime

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/QRGeneratorIsland.tsx`: Full generator with URL tab, save flow, edit-mode banner — Dynamic QR toggle goes in the URL content section here
- `src/db/schema.ts`: `savedQrCodes` table is the base; Phase 10 may add a `dynamicQrCodes` table or extend existing
- `src/pages/api/qr/save.ts`: Pattern for Pro tier check + DB insert — dynamic QR save route follows same pattern
- `src/lib/billing.ts`: `tierFromPriceId()` and tier constants — reuse for dynamic QR limit checks
- `src/pages/dashboard/index.astro` + library grid components: Phase 10 adds Dynamic badge, destination URL row, pause toggle to existing cards
- Sonner toasts: already set up in Phase 9 — use same pattern for "Destination updated", "QR paused", etc.

### Established Patterns
- `export const prerender = false` on all API routes
- `locals.auth()` for Clerk session in API routes
- `client:only="react"` for React components using browser state or Clerk hooks
- Tier check: query `subscriptions` table by `userId`, check `tier` field
- Tailwind v4 + dark mode (`dark:` variants) — all new UI must support dark mode

### Integration Points
- `src/components/QRGeneratorIsland.tsx`: Add "Dynamic QR" toggle below URL input field (URL tab only)
- `src/db/schema.ts`: Add `dynamicQrCodes` table (or extend savedQrCodes) with slug, destinationUrl, isPaused, userId, name FK
- `src/pages/r/[slug].ts`: New Vercel edge function — `export const runtime = 'edge'`, lookup slug → redirect or holding page
- `src/pages/dashboard/index.astro` or library React component: Extend card to show Dynamic badge + destination + pause toggle
- `src/pages/api/qr/`: New routes for dynamic QR CRUD (create, update destination, toggle pause, delete)

</code_context>

<specifics>
## Specific Ideas

- Holding page: mobile-first, minimal layout — people scan QRs on phones. Just logo + message, no chrome. Dark mode support.
- "Dynamic QR" toggle in generator: show a small info hint when first enabled — "Destination can be changed after printing without a new QR code." Helps users understand the value.
- Dynamic QR card in library: show destination URL truncated (max ~40 chars) with the inline edit affordance. Active = green dot, Paused = yellow/orange dot.

</specifics>

<deferred>
## Deferred Ideas

- Custom short domains (e.g., `go.brand.com`) — explicitly out of scope in REQUIREMENTS.md
- User-customizable slugs — D-04 decided auto-only for v1.1; could be v2 feature
- QR code expiry dates (DYN-V2-01) — v2 requirement
- Scan-limit threshold alerts (DYN-V2-03) — v2 requirement
- Scan analytics (ANAL-01 through ANAL-04) — Phase 11

</deferred>

---

*Phase: 10-dynamic-qr-redirect-service*
*Context gathered: 2026-03-29*
