# Phase 9: Saved QR Library + Pro Gates - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Pro users get a persistent named QR library — save, view, edit, and delete QR codes from the homepage generator. Pro-only customization features (logo upload and classy dot shapes) are server-side gated for authenticated users; anonymous users remain completely ungated. The dashboard shell (sidebar, layout, empty state) is already built from Phase 7 — this phase replaces the placeholder content.

</domain>

<decisions>
## Implementation Decisions

### Pro feature gates (conflict resolution)
- Gate conflict resolved: logo upload and advanced dot shapes ARE gated for authenticated non-Pro users
- Phase 8 CONTEXT was incorrect — that note ("logo stays free forever") is superseded by this decision
- **Logo upload**: requires Pro or higher tier for signed-in users; anonymous users stay ungated
- **Advanced dot shapes**: `classy` and `classy-rounded` only are Pro-gated; `square`, `dots`, `rounded`, `extra-rounded` stay free for everyone
- **Corner frames/pupils** (extra-rounded, etc.): NOT gated — free for all users
- **API enforcement**: if authenticated non-Pro user sends a save request with a classy shape or logo attached, API returns 403 with a clear error message; client shows inline upgrade prompt
- Anonymous users can use every static generation feature including logo upload and all dot shapes — ungated permanently

### Save UX flow
- "Save to Library" button placed near the existing export buttons (PNG/SVG/Copy) at the bottom of the generator
- Clicking opens a small modal with a name input field, pre-filled with the QR content (e.g. the URL) as the default name
- After successful save: toast notification appears ("Saved to library"), user stays on the generator — no navigation
- For signed-in non-Pro users: Save button is visible but disabled (greyed out), shows a Pro lock icon and tooltip ("Pro feature — upgrade to save QR codes"); clicking opens upgrade prompt
- For anonymous users: Save button is not shown (they have no account to save to)

### Library display
- Saved QRs shown in `/dashboard` (My QR Codes section) as a grid by default, with a toggle to switch to list view
- Each card/row shows: QR thumbnail, custom name, date saved, and a truncated preview of the QR content (URL or text it encodes)
- Per-card actions: **Edit** (reopens generator pre-populated) and **Delete** (with confirmation)
- Empty state (first visit, no saved QRs): illustration + "No QR codes yet" heading + "Go to Generator" CTA linking to `/`
- Existing Phase 7 empty state placeholder is replaced wholesale by the live grid/list

### Edit flow
- Clicking Edit on a saved QR navigates to the homepage generator (`/`) with all settings pre-populated: content, tab type, color options, shape options, and logo (if any)
- State is passed via URL params or sessionStorage (Claude's discretion on mechanism)
- When in edit mode, a banner/bar appears at the top of the generator: **"Editing: [QR Name]"** with two actions — **"Save Changes"** (updates the existing entry in-place) and **"Cancel"** (returns to dashboard without saving, discards changes)
- "Save Changes" updates the existing database record (same ID, updated settings + `updated_at`) — does NOT create a new entry
- If user wants to save as a new entry while in edit mode, they use the standard "Save to Library" button (which creates a new record)

### Claude's Discretion
- Exact mechanism for passing saved QR state to the generator for edit mode (URL params vs sessionStorage vs query string)
- Database schema for `saved_qr_codes` table (fields: id, user_id, name, content_type, content_data, style_data JSON, thumbnail_data, created_at, updated_at)
- Thumbnail generation approach (render QR to PNG data URL at save time and store, or regenerate on display)
- Exact Tailwind styling for Save modal, Edit banner, library cards, grid/list toggle
- Pagination vs infinite scroll for the library (if user has many saved QRs)
- Confirmation UX for delete (inline confirm vs modal)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/pages/dashboard/index.astro`: Placeholder empty state already built — Phase 9 replaces the dashed-border empty state div with the live grid/list component
- `src/components/dashboard/DashboardLayout.astro` + `Sidebar.astro`: Shell is ready; no structural changes needed
- `src/components/QRGeneratorIsland.tsx`: Full serializable state available — `colorOptions` (ColorSectionState), `shapeOptions` (ShapeSectionState), `logoOptions` (LogoSectionState), content per tab (urlValue, textValue, wifiValue, vcardValue), `activeTab`
- `src/db/schema.ts`: Only has `subscriptions` + `stripeEvents` tables — needs `saved_qr_codes` table added
- `src/components/billing/UpgradeCTAPanel.astro`: Pattern for upgrade prompts already established in Phase 8

### Established Patterns
- Tailwind v4 + dark mode (`dark:` variants) throughout — all Phase 9 UI must support dark mode
- `client:only="react"` for React components that need browser state (Clerk hooks, localStorage)
- `Astro.locals.auth()` for SSR tier check on dashboard pages
- API routes use `export const prerender = false`; auth checked via Clerk session cookie
- Toast notifications: no existing toast system — Phase 9 will establish this pattern (Claude's discretion on library choice, e.g. react-hot-toast or sonner)
- `src/lib/billing.ts`: tier resolution logic already centralized — gate checks can import from here

### Integration Points
- `src/db/schema.ts`: Add `savedQrCodes` table with user_id, name, content/style JSON, thumbnail, timestamps
- `src/pages/api/`: New API routes needed — `POST /api/qr/save`, `GET /api/qr/list`, `PUT /api/qr/[id]`, `DELETE /api/qr/[id]`
- `src/components/QRGeneratorIsland.tsx`: Add "Save to Library" button near exports; add edit-mode banner when `?edit=[id]` param present
- `src/components/customize/ShapeSection.tsx`: Add Pro lock overlay/indicator on classy and classy-rounded dot shape options
- `src/components/customize/LogoSection.tsx`: Add Pro lock on logo upload for authenticated non-Pro users
- Dashboard `index.astro`: Replace placeholder with `<QRLibrary>` React component (grid/list toggle, card actions)

</code_context>

<specifics>
## Specific Ideas

- Edit mode banner pattern: sits above or integrated into the generator header — similar to how GitHub shows "You're editing a fork" warning banners
- Pro lock on shape options: grey out the classy/classy-rounded tiles with a small padlock icon overlay — same pattern as many SaaS tools (Figma plugin stores, Notion templates)
- Save modal: minimal — just a name field with placeholder "e.g. My Coffee Shop QR", Save and Cancel buttons. No tags, no folders (those are v2)

</specifics>

<deferred>
## Deferred Ideas

- QR count limits enforcement (free users limited to N saves) — not in Phase 9 scope; gates are feature-based not quantity-based in this phase
- Folder/tag organization of saved QRs — v2 (ORG-V2-01)
- Download PNG directly from library card — Phase 9 has Edit + Delete only; export from generator
- "Save as copy" explicit button in edit mode — user can already create new via the standard Save button; explicit copy is v2
- Inline rename of QR name from dashboard (click-to-edit) — deferred; rename happens by opening edit mode

</deferred>

---

*Phase: 09-saved-qr-library-pro-gates*
*Context gathered: 2026-03-17*
