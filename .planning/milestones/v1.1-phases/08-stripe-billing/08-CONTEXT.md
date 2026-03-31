# Phase 8: Stripe Billing - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Add Stripe-powered billing with three tiers (Free / Starter / Pro). Users can upgrade via Stripe Checkout, manage or cancel via Stripe Customer Portal, and the app reflects subscription tier via webhooks. No QR library, no analytics, no feature gates on customization — those are Phases 9+.

</domain>

<decisions>
## Implementation Decisions

### Tier structure and pricing
- 3 tiers: Free, Starter, Pro
- **Free**: 5 QR codes, static QR only, basic PNG download (no account required for generation)
- **Starter**: $3.99/mo or $39/yr — 100 QR codes, PNG + SVG download, save QR codes, no ads
- **Pro**: $7.99/mo or $79/yr — unlimited QR codes, dynamic QR codes, analytics, custom colors/logo
- 4 Stripe products needed: Starter monthly, Starter annual, Pro monthly, Pro annual
- Custom colors and logo upload **stay free forever** — these are not gated despite appearing in Pro tier description
- App tracks tier level (free / starter / pro) from webhook events

### Upgrade entry point
- Dashboard only — homepage stays a pure, frictionless QR generator with no billing UI
- Primary CTA: persistent panel at the **bottom of the dashboard sidebar** — "Upgrade to Pro" for free users
- For paid users (Starter or Pro): panel replaced with "Manage subscription" link → opens Stripe Customer Portal
- Hero section on homepage: subtle mention like "Free forever — unlock Pro for dynamic QR codes" with a link to /pricing

### Pricing page
- Standalone public `/pricing` page — SEO-friendly, linked from hero mention
- Shows free vs Starter vs Pro comparison with monthly/annual toggle
- Annual savings clearly displayed per tier

### Pro status UI
- Colored pill badge in the **UserMenu dropdown** next to the user's name
  - Free: no badge (or subtle "Free" label)
  - Starter: blue pill
  - Pro: purple/gold pill
- Free users in dashboard: upgrade CTA at sidebar bottom + inline contextual prompt when hitting a gated feature

### Post-checkout experience
- Stripe redirects to `/dashboard?upgraded=true`
- App polls subscription status for up to 5 seconds waiting for webhook
- While polling: show "Activating your plan…" indicator
- Once Pro/Starter confirmed: success toast — "Welcome to [Starter/Pro]! Your plan is now active."
- If webhook fires later (rare): toast appears on next page interaction

### Payment failure handling
- In-app warning banner in dashboard: "Your payment failed — update your payment method"
- Stripe handles dunning emails (built-in)
- Pro/Starter features remain active during grace period (Stripe's smart retry window)
- Immediate downgrade only after all retry attempts exhausted

### Claude's Discretion
- Database schema for subscriptions (Turso/libSQL + Drizzle — already decided in research)
- Webhook deduplication table design (stripe_events table with event ID)
- Exact Tailwind styling for upgrade CTA panel, pricing page, and tier badges
- Error handling for failed Stripe API calls
- Stripe Customer Portal configuration (which features to expose)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/dashboard/Sidebar.astro`: Already built with a slot area at the bottom — ideal for the Upgrade CTA panel
- `src/components/UserMenu.tsx`: Already renders avatar + dropdown — tier badge slots naturally next to user name
- `src/components/dashboard/DashboardLayout.astro`: Shell is ready; billing pages use same layout
- `src/pages/dashboard/index.astro`: Protected SSR page (prerender=false) — billing status check follows same pattern

### Established Patterns
- Tailwind v4 + dark mode (`dark:` variants) throughout — all new billing UI must support dark mode
- `client:only="react"` for React components that use Clerk/auth hooks (learned from UserMenu fix in Phase 7)
- `Astro.locals.auth()` for SSR auth check (not named exports from @clerk/astro/server)
- Middleware in `src/middleware.ts` using `clerkMiddleware` — webhook endpoint must be **excluded** from auth protection

### Integration Points
- `src/middleware.ts`: Needs to exclude `/api/webhooks/stripe` from Clerk auth (Stripe sends unauthenticated POST)
- `src/pages/api/`: New API routes needed — checkout session creation, webhook handler, subscription status
- `astro.config.mjs`: API routes need `prerender = false`; no config changes needed beyond what Phase 7 added
- Turso/libSQL connection: new `src/db/` directory with Drizzle schema (subscriptions table + stripe_events dedup table)

</code_context>

<specifics>
## Specific Ideas

- Upgrade CTA panel style: bottom of sidebar, persistent but not intrusive — similar to Linear's "Upgrade" panel or Vercel's free tier indicator
- Tier badge colors: blue pill for Starter (`bg-blue-100 text-blue-700`), purple pill for Pro (`bg-purple-100 text-purple-700`) — consistent with existing `#2563EB` brand blue
- Pricing page: monthly/annual toggle at top, 3-column card layout, highlight Pro as "Most Popular"
- Hero mention: one line below the main headline, e.g. "Free forever · Pro from $3.99/mo"

</specifics>

<deferred>
## Deferred Ideas

- Feature gates on logo upload / advanced shapes (GATE-01, GATE-02) — Phase 9
- QR count limits enforcement in the generator — Phase 9 (once save library exists to count against)
- Annual plan auto-renewal email reminders — v2
- Coupon/promo code support — v2

</deferred>

---

*Phase: 08-stripe-billing*
*Context gathered: 2026-03-16*
