---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Scale & Integrate
status: Phase complete — ready for verification
stopped_at: Completed 20-02-PLAN.md
last_updated: "2026-04-03T04:04:51.654Z"
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 9
  completed_plans: 6
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-02)

**Core value:** Anyone can generate a visually stunning, fully customized QR code and download it immediately — no signup, no friction.
**Current focus:** Phase 20 — advanced-analytics

## Current Position

Phase: 20 (advanced-analytics) — EXECUTING
Plan: 2 of 2

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v1.3)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 17 P01 | 5m | 2 tasks | 6 files |
| Phase 17 P02 | 5m | 2 tasks | 5 files |
| Phase 18-bulk-qr-generation P01 | 5 | 2 tasks | 6 files |
| Phase 18 P02 | 8m | 2 tasks | 1 files |
| Phase 19 P01 | 3m | 2 tasks | 8 files |
| Phase 19 P02 | 2m | 1 tasks | 1 files |
| Phase 19 P03 | 3 | 1 tasks | 4 files |
| Phase 19-rest-api-api-key-management P03 | 20 | 2 tasks | 4 files |
| Phase 20-advanced-analytics P01 | 3 | 2 tasks | 3 files |
| Phase 20-advanced-analytics P02 | 3 | 2 tasks | 5 files |

## Accumulated Context

### Decisions

All v1.0–v1.2 decisions archived in PROJECT.md Key Decisions table.

Recent decisions affecting current work:

- [Phase 16]: AdUnit script injection lives inside useEffect — adsbygoogle.js never loads for anonymous or paid users
- [v1.3 roadmap]: Rate limiting must be live (Phase 17) before REST API ships (Phase 19) — hard dependency
- [v1.3 roadmap]: Bulk ZIP assembled client-side via jszip — never stream ZIP through Vercel function response (4.5 MB limit)
- [v1.3 roadmap]: API keys stored as SHA-256 hash only; raw key shown to user once and never persisted
- [v1.3 roadmap]: Phase 22 depends on Phase 14 (template system), not Phase 17 — can proceed independently if needed
- [Phase 17]: @sentry/astro integration added to astro.config.mjs with sourceMapsUploadOptions tied to VERCEL_GIT_COMMIT_SHA for deploy-mapped source maps
- [Phase 17]: Sentry SDK silently no-ops when PUBLIC_SENTRY_DSN is undefined — build and local dev unaffected until DSN is configured
- [Phase 17]: Sliding window rate limit (60 req/60s) via Upstash Redis — module-level singleton with null fallback for dev; /r/ redirect path exempt via shouldRateLimit(); sequence() chains rate limit before Clerk auth
- [Phase 18-bulk-qr-generation]: BULK_TIER_LIMITS in separate bulkLimits.ts keeps single source of truth for row caps without modifying tierLimits.ts shape
- [Phase 18-bulk-qr-generation]: Tier cast pattern: rawTier as 'free'|'starter'|'pro' — Drizzle text() returns string; mirrors workaround needed by dashboard/index.astro
- [Phase 18-bulk-qr-generation]: generatedBlobs/isGenerating/progress stubbed in Plan 01; Plan 02 wires the qr-code-styling generation loop and ZIP assembly
- [Phase 18]: Used status enum ('generating'/'complete') instead of separate isGenerating boolean — single source of truth for generation state
- [Phase 18]: Dynamic import of qr-code-styling inside generation function — prevents SSR failure in Astro
- [Phase 19]: SHA-256 hash for API key storage — keys are 256-bit entropy (SHA-256 sufficient; bcrypt overkill for high-entropy inputs)
- [Phase 19]: Opaque API keys (not JWTs) — instant revocation, no signing secret, matches Stripe/GitHub/Vercel pattern
- [Phase 19]: Pro-only API key creation with max 10 active keys per account; dual rate limit (IP + per-key) intentional for v1.3
- [Phase 19]: qrcode npm (not qr-code-styling) for server-side API generation — qr-code-styling is DOM-dependent and cannot run in serverless functions
- [Phase 19]: Atomic SQL increment via Drizzle sql template for usageCount — never read-then-write pattern to prevent race conditions
- [Phase 19]: Pro-only gate at page level (Astro SSR) — non-Pro users see upgrade prompt, never the key manager
- [Phase 19]: Raw key shown in yellow warning card exactly once — cleared on Done click, never refetched
- [Phase 19-rest-api-api-key-management]: Raw key stored in React state only (newKeyRaw); cleared on Done click — never re-fetched from API
- [Phase 19-rest-api-api-key-management]: Pro gate enforced server-side in api-keys.astro before island mounts — non-Pro users see upgrade prompt
- [Phase 20-advanced-analytics]: UTM params extracted from destination URL at redirect time; malformed URL try/catch isolates failure from redirect flow
- [Phase 20-advanced-analytics]: Analytics API from/to params default to last-30-days when absent (backward compatible); 365-day cap prevents runaway queries
- [Phase 20-advanced-analytics]: Analytics page refactored from server-rendered to client:only React island — enables reactive date range updates without page reloads
- [Phase 20-advanced-analytics]: CSV export uses native JS with 10,000-row cap; no library needed for header + ISO date + field escaping

### Pending Todos

- Upgrade from Google AdSense to self-promo banner ads later
- Phase 19 prerequisite: Clerk middleware must exempt /api/v1/* routes before any API key auth code is written
- Phase 23 prerequisite: validate Paraglide 2.x Vite plugin setup with Astro 5 hybrid output mode in a spike before writing translation strings

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-03T04:04:51.650Z
Stopped at: Completed 20-02-PLAN.md
Resume file: None
