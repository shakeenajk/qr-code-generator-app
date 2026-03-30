---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Monetization
status: Ready to execute
stopped_at: Completed 10-04-PLAN.md
last_updated: "2026-03-30T12:42:00.999Z"
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 21
  completed_plans: 19
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-11)

**Core value:** Anyone can generate a visually stunning, fully customized QR code and download it immediately — no signup, no friction.
**Current focus:** Phase 10 — Dynamic QR Redirect Service

## Current Position

Phase: 10 (Dynamic QR Redirect Service) — EXECUTING
Plan: 4 of 5

## Performance Metrics

**Velocity (v1.0 reference):**

- Total plans completed: 23 (v1.0)
- Average duration: ~15 min/plan (estimated)
- Total execution time: ~5 days

**v1.1 By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 7. SSR Foundation + Auth | TBD | - | - |
| 8. Stripe Billing | TBD | - | - |
| 9. Saved QR Library + Pro Gates | TBD | - | - |
| 10. Dynamic QR Redirect Service | TBD | - | - |
| 11. Scan Analytics Dashboard | TBD | - | - |

*Updated after each plan completion*
| Phase 07 P01 | 2 | 2 tasks | 6 files |
| Phase 07 P02 | 81s | 2 tasks | 5 files |
| Phase 07 P04 | 5min | 2 tasks | 4 files |
| Phase 07 P03 | 434s | 2 tasks | 4 files |
| Phase 08 P01 | 9min | 2 tasks | 9 files |
| Phase 08 P02 | 2min | 2 tasks | 2 files |
| Phase 08 P03 | 15min | 2 tasks | 3 files |
| Phase 08 P04 | 147s | 2 tasks | 8 files |
| Phase 08 P05 | 176s | 2 tasks | 2 files |
| Phase 08 P06 | continuation | 2 tasks | 5 files |
| Phase 09 P01 | 3min | 2 tasks | 5 files |
| Phase 09 P02 | 248s | 2 tasks | 4 files |
| Phase 09 P03 | 12min | 2 tasks | 6 files |
| Phase 09 P04 | 860s | 2 tasks | 2 files |
| Phase 09 P05 | continuation | 2 tasks | 5 files |
| Phase 10 P01 | 125s | 2 tasks | 6 files |
| Phase 10 P02 | 2min | 2 tasks | 3 files |
| Phase 10 P04 | 5min | 2 tasks | 1 files |

## Accumulated Context

### Decisions

All v1.0 decisions archived in PROJECT.md Key Decisions table.
Recent decisions affecting v1.1:

- Stack confirmed: Clerk (auth) + Turso/libSQL + Drizzle ORM + Stripe Checkout — see research/SUMMARY.md
- Keep output: 'static' in astro.config.mjs; add adapter: vercel(); use per-route prerender = false
- Use @libsql/client/web import (not default) for edge runtime in redirect endpoint
- [Phase 07]: Use astro dev (not preview) as Playwright webServer — preview cannot serve SSR routes with prerender=false
- [Phase 07]: Auth stub tests use test.fixme (not .skip) so pending tests appear visibly in reports
- [Phase 07]: Use @astrojs/vercel@9.0.5 — v10 requires Astro 6; project is on Astro 5
- [Phase 07]: No edgeMiddleware on vercel() adapter — Clerk is incompatible with Vercel Edge runtime (Async Local Storage issue)
- [Phase 07]: Keep output: 'static' in astro.config.mjs — static homepage stays CDN-cached; auth pages use prerender=false per-route
- [Phase 07]: DashboardLayout uses frontmatter CSS import (consistent with Layout.astro) not <link> href
- [Phase 07]: DashboardLayout is a standalone HTML doc — noindex meta, no FAQ schema, separate from marketing layout
- [Phase 07]: MobileTabBar uses inline style for safe-area-inset-bottom (pb-safe Tailwind class not configured in v4 yet)
- [Phase 07]: Import useUser/useClerk from @clerk/shared/react — @clerk/astro/react does not export these hooks
- [Phase 07]: Clerk middleware with placeholder API keys throws 500 on protected routes — real keys required before smoke tests can pass
- [Phase 08-01]: Use drizzle-orm/libsql/web (not /libsql) — default import is Node-only and fails on Vercel Edge
- [Phase 08-01]: integer mode: boolean for cancelAtPeriodEnd — SQLite stores booleans as 0/1 integers
- [Phase 08-01]: PRICE_TIER_MAP initialized at module level from import.meta.env — tier resolution centralized in billing.ts
- [Phase 08]: current_period_end is on SubscriptionItem (not Subscription) in Stripe API 2026-02-25 — must use sub.items.data[0].current_period_end
- [Phase 08]: handleSubscriptionUpdated conflicts on stripeSubscriptionId (not userId) for safe upsert with out-of-order events
- [Phase 08]: clerkClient from @clerk/astro/server takes full APIContext — not a static client, must pass context to call .users.getUser()
- [Phase 08]: Checkout endpoint wraps only Stripe API calls in try/catch — DB errors surface as 500 (correct behavior)
- [Phase 08]: SubscriptionPolling uses client:only='react' — component uses window.location directly and must be browser-only
- [Phase 08]: DashboardLayout.astro threads tier prop from index.astro through to Sidebar to avoid duplicate server-side subscription fetches
- [Phase 08-05]: Pricing page is fully static (no prerender=false) — public SEO page benefits from CDN caching
- [Phase 08-05]: 401 from /api/checkout/create on pricing page redirects to /login?redirect=/pricing to preserve billing intent
- [Phase 08-05]: data-testid=billing-toggle wraps entire toggle group (not individual buttons) — matches Playwright test selector
- [Phase 08]: Strict mode violation in pricing smoke test fixed inline — aria snapshot for billing toggle matched wrapping div after selector correction
- [Phase 09-01]: Wave 0 scaffolding pattern: create test.fixme stubs in all spec files before any implementation begins (Nyquist compliance)
- [Phase 09-01]: Stubs use test.fixme (not test.skip) — project standard from Phase 07 for visible pending tests in reports
- [Phase 09]: IDOR prevention: PUT/DELETE use compound WHERE (id + userId) — 404 not 403 for wrong-user rows (avoids leaking existence)
- [Phase 09]: GET /api/qr/list uses explicit column SELECT to exclude logoData — prevents large payload for list view
- [Phase 09]: savedQrCodes.id uses crypto.randomUUID() text PK — integers in URLs are guessable enumeration vectors
- [Phase 09-03]: userTier null = unlocked — anonymous users and Clerk-loading state never see lock overlays (no-flash requirement)
- [Phase 09-03]: Pro gate click interception: isProLocked tiles intercept onClick to show sonner toast with /pricing action, not disabled button (accessibility)
- [Phase 09-03]: LogoSection locked state replaces drop-zone entirely — file input not rendered at all for non-Pro signed-in users
- [Phase 09]: Toaster moved to page level in dashboard/index.astro — avoids duplicate Toaster when QR codes present, ensures toast works in all component states
- [Phase 09]: QRLibrary viewMode persisted via localStorage key 'qrlibrary-view-mode' — grid/list preference survives page refreshes
- [Phase 09]: Non-Pro 403 test remains test.fixme — requires real non-Pro Clerk session; session-bound tests cannot be automated in CI
- [Phase 09]: Phase 9 gate: all 7 requirements LIB-01 through GATE-03 verified by automated suite (172 passed) and human sign-off
- [Phase 10]: Separate dynamicQrCodes table (not extending savedQrCodes) for Phase 11 analytics FK readiness
- [Phase 10]: 307 Temporary Redirect for /r/[slug] — not 301 — so destination updates take effect without browser cache
- [Phase 10]: No edge runtime on redirect endpoint — Vercel serverless + Turso HTTP API satisfies DYN-03 latency requirement
- [Phase 10]: Free/starter users can create dynamic QRs (up to 3); static QR saves remain Pro-only
- [Phase 10]: Explicit dynamicQrCodes DELETE before savedQrCodes in DELETE handler as Turso FK cascade safety belt
- [Phase 10]: isDynamic computed from slug !== null in list response — no stored column needed
- [Phase 10]: DynamicCardBody sub-component encapsulates all dynamic-QR-specific UI to keep static card paths clean
- [Phase 10]: isPaused from SQLite is 0|1 integer; wrap in Boolean() in UI for correct conditional rendering

### Pending Todos

None.

### Blockers/Concerns

- [RESOLVED] Phase 8: Stripe product + price IDs created in test mode, env vars confirmed present
- Phase 10: Confirm @libsql/client/web import path in v0.14.x before writing edge function
- Phase 11: Verify Recharts bundle size impact before committing to chart library

## Session Continuity

Last session: 2026-03-30T12:42:00.995Z
Stopped at: Completed 10-04-PLAN.md
Resume file: None
