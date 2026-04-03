# Phase 21: Campaign Scheduling — Research

**Researched:** 2026-03-31
**Domain:** Vercel Cron Jobs + Drizzle schema extension + React date/time UI
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAMPAIGN-01 | User can set a future activation date and optional deactivation date on a dynamic QR code | Schema columns `scheduled_enable_at` / `scheduled_pause_at` on `dynamicQrCodes`; PATCH `/api/qr/[id]` extended to accept schedule fields; date/time picker UI added to dynamic QR edit modal |
| CAMPAIGN-02 | Dashboard shows scheduled QR codes with countdown to activation and current status (scheduled/active/expired) | `QRLibrary.tsx` reads schedule columns from list API; derives `status` field client-side from epoch timestamps; countdown computed with `Date.now()` + `setInterval` |
| CAMPAIGN-03 | Scheduled QR codes activate and deactivate automatically via background job (QStash or Vercel Cron) | Vercel Cron `*/15 * * * *` on Pro plan; idempotent Drizzle `UPDATE WHERE scheduledEnableAt <= now AND isPaused = true`; `CRON_SECRET` header validation |
</phase_requirements>

---

## Summary

Campaign scheduling is a small, self-contained feature built on top of the existing `dynamicQrCodes` table. It requires two new nullable integer columns (`scheduled_enable_at`, `scheduled_pause_at`), a one-file cron handler, two lines in `vercel.json`, and UI additions in the dynamic QR edit modal plus library view. There are no new npm dependencies and no new service accounts required beyond what the project already has.

The core architectural question — Vercel Cron vs. QStash — is settled by the project context: the project is already on Vercel Pro (which supports per-minute cron with per-minute precision), and the existing `@upstash/redis` dependency is available for a distributed lock if double-fire protection beyond the idempotency guard is desired. **Use Vercel Cron with an idempotency guard.** QStash adds a new service dependency (separate Upstash account, new env vars, webhook URL management) with no benefit over a correctly-written idempotent Drizzle UPDATE.

The redirect handler at `/r/[slug]` already reads `isPaused` before redirecting. The cron job simply flips `isPaused` at the right time. No changes to the redirect handler are needed — the schedule columns are only consumed by the cron sweeper, not by the redirect path.

**Primary recommendation:** Vercel Cron `*/15 * * * *` + idempotent Drizzle UPDATE (check `isPaused = true` before enabling, `isPaused = false` before pausing) + `CRON_SECRET` header guard + two schema columns + date picker on the edit modal.

---

## Standard Stack

### Core (no new dependencies — all already installed)

| Library / Tool | Version | Purpose | Why |
|----------------|---------|---------|-----|
| Vercel Cron | built-in (Pro) | Trigger sweep every 15 minutes | Already on Pro; no new service needed; per-minute precision confirmed |
| Drizzle ORM | ^0.45.1 (installed) | Schema migration + idempotent UPDATE | Already used for all DB writes; `lte`, `and`, `eq` operators support the sweep query |
| `@upstash/redis` | ^1.37.0 (installed) | Optional distributed lock to prevent concurrent sweep runs | Already installed; only needed if sweep duration could exceed 15 min (unlikely) |
| React `useState` + `useEffect` | built-in | Countdown timer in `QRLibrary.tsx` | No library needed; `setInterval` every second is sufficient |

### No New npm Packages Required

This phase adds zero new npm dependencies. All primitives are already present.

**Version verification:** Confirmed installed via `package.json`. No npm view needed.

---

## Architecture Patterns

### Recommended Project Structure (new/modified files only)

```
src/
├── db/
│   └── schema.ts                   MODIFIED — add scheduledEnableAt, scheduledPauseAt columns
├── pages/
│   └── api/
│       ├── cron/
│       │   └── campaigns.ts        NEW — Vercel Cron GET handler
│       └── qr/
│           └── [id].ts             MODIFIED — PATCH accepts scheduledEnableAt, scheduledPauseAt
├── components/
│   └── dashboard/
│       └── QRLibrary.tsx           MODIFIED — status badges, countdown, schedule UI
drizzle/
│   └── 0003_campaign_schedule.sql  NEW — generated migration
vercel.json                         NEW — crons section
```

### Pattern 1: Idempotent Cron Sweep

**What:** Two Drizzle UPDATE statements that check current state before changing it, so running twice has no extra effect.

**When to use:** Always — Vercel documents that the same cron event can fire more than once.

```typescript
// src/pages/api/cron/campaigns.ts
// Source: Vercel Cron docs (https://vercel.com/docs/cron-jobs/manage-cron-jobs)
export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { dynamicQrCodes } from '../../../db/schema';
import { and, eq, lte, isNotNull } from 'drizzle-orm';

export const GET: APIRoute = async ({ request }) => {
  // CRON_SECRET is auto-injected by Vercel as the Bearer token when CRON_SECRET env var is set
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${import.meta.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);

  // Activate: only rows that are currently paused AND have a schedule date in the past
  // The isPaused = true guard is the idempotency check — running twice is safe
  const enableResult = await db
    .update(dynamicQrCodes)
    .set({
      isPaused: false,
      scheduledEnableAt: null,      // clear schedule after activation
      updatedAt: now,
    })
    .where(
      and(
        isNotNull(dynamicQrCodes.scheduledEnableAt),
        lte(dynamicQrCodes.scheduledEnableAt, now),
        eq(dynamicQrCodes.isPaused, true),
      )
    );

  // Pause: only rows that are currently active AND have a deactivation date in the past
  const pauseResult = await db
    .update(dynamicQrCodes)
    .set({
      isPaused: true,
      scheduledPauseAt: null,       // clear schedule after pausing
      updatedAt: now,
    })
    .where(
      and(
        isNotNull(dynamicQrCodes.scheduledPauseAt),
        lte(dynamicQrCodes.scheduledPauseAt, now),
        eq(dynamicQrCodes.isPaused, false),
      )
    );

  return new Response(
    JSON.stringify({
      ok: true,
      activated: enableResult.rowsAffected,
      paused: pauseResult.rowsAffected,
      sweepAt: now,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
```

### Pattern 2: Schema Migration (additive columns)

**What:** Two nullable integer columns added to `dynamicQrCodes`. Both are optional (null = no schedule). Stored as Unix epoch seconds matching the project-wide convention.

```typescript
// src/db/schema.ts — additions to dynamicQrCodes table
scheduledEnableAt: integer('scheduled_enable_at'),  // null = not scheduled; unix epoch
scheduledPauseAt: integer('scheduled_pause_at'),    // null = no auto-pause; unix epoch
```

**Drizzle migration:** Run `npx drizzle-kit generate` after schema change, then `npx drizzle-kit migrate` (or push). The generated SQL will be an `ALTER TABLE` with two nullable columns — fully backwards compatible with existing rows.

### Pattern 3: vercel.json Cron Configuration

```json
{
  "crons": [
    {
      "path": "/api/cron/campaigns",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

`*/15 * * * *` = every 15 minutes. Confirmed supported on Vercel Pro (minimum interval: once per minute). This means a campaign can activate up to 15 minutes late — acceptable for a scheduling feature and must be documented to users.

### Pattern 4: Deriving Schedule Status Client-Side

**What:** `QRLibrary.tsx` already has `isPaused` and `isDynamic` in its `SavedQR` interface. Add `scheduledEnableAt` and `scheduledPauseAt` fields. Derive a display status without a new API field.

```typescript
// Derive status from existing + new fields
function getScheduleStatus(qr: SavedQR): 'scheduled' | 'active' | 'paused' | 'expired' | null {
  if (!qr.isDynamic) return null;
  const now = Math.floor(Date.now() / 1000);
  if (qr.scheduledEnableAt && qr.scheduledEnableAt > now) return 'scheduled';    // future activation
  if (!qr.isPaused && qr.scheduledPauseAt && qr.scheduledPauseAt <= now) return 'expired'; // overdue pause
  if (qr.isPaused && qr.scheduledEnableAt && qr.scheduledEnableAt <= now) return 'expired'; // missed window
  if (!qr.isPaused) return 'active';
  return 'paused';
}
```

### Pattern 5: Countdown Timer

```typescript
// Simple countdown — no library needed
function useCountdown(targetEpoch: number | null): string {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!targetEpoch) return;
    const tick = () => {
      const diff = targetEpoch - Math.floor(Date.now() / 1000);
      if (diff <= 0) { setText('activating soon'); return; }
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setText(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetEpoch]);
  return text;
}
```

### Pattern 6: PATCH Extension for Schedule Fields

The existing `PATCH /api/qr/[id]` handler updates `destinationUrl` and `isPaused` on `dynamicQrCodes`. Extend it to also accept `scheduledEnableAt` and `scheduledPauseAt`.

**Validation rules:**
- `scheduledEnableAt` must be a future Unix epoch integer OR `null` (to clear)
- `scheduledPauseAt` must be greater than `scheduledEnableAt` if both are set OR `null`
- When setting a schedule, also set `isPaused: true` (the QR should be paused until its time)
- Clearing both schedule fields should NOT automatically change `isPaused`

### Anti-Patterns to Avoid

- **Don't clear `scheduledEnableAt` in the PATCH without also setting `isPaused: true`** — the cron sweep uses `isPaused = true` as the activation guard; if a code was manually unpaused but still has a future `scheduledEnableAt`, the cron would re-pause it on next sweep.
- **Don't store schedule timestamps in local timezone** — always store and transmit UTC Unix epoch. Show local time equivalent in the UI but convert to UTC before saving.
- **Don't use `*/1 * * * *` (every minute)** — Pro supports it but it creates 1,440 function invocations per day for a small feature. `*/15` (96/day) is the right balance of freshness vs. cost.
- **Don't omit `isNotNull()` from the WHERE clause** — without it, the UPDATE would attempt to compare null `scheduledEnableAt` values against `now`, causing the WHERE to evaluate to NULL (no match) — but this is DB-safe. The `isNotNull` guard makes intent explicit and allows index use.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reliable at-least-once delivery | Custom retry logic | Vercel Cron + idempotency guard | Vercel Cron does NOT retry — but the sweep is stateless; next sweep picks up anything the previous missed |
| Distributed lock to prevent concurrent sweeps | Custom lock table in Turso | `@upstash/redis` SET NX PX pattern | Already installed; prevents the rare race where two sweep instances run simultaneously |
| Sub-minute scheduling precision | Custom worker or QStash | Accept 15-minute granularity | Sub-minute is not a stated requirement; QStash adds a new service for zero stated benefit |
| Timezone display math | Custom timezone library | `Intl.DateTimeFormat` (built-in) | Native JS handles locale-aware display; store/compare in UTC epoch always |

**Key insight:** This feature is entirely about flipping a boolean at the right time. A Drizzle `UPDATE WHERE lte(epoch, now) AND isPaused = true` is idempotent by definition — running it twice produces the same result. No distributed coordination needed beyond that guard.

---

## How `/r/[slug]` Interacts with Scheduled State

The redirect handler reads only `isPaused` from the `dynamicQrCodes` row. It does not need to know about `scheduledEnableAt` or `scheduledPauseAt`.

- A scheduled QR code is stored with `isPaused = true` until its activation time
- When the cron sweep fires, it sets `isPaused = false` (and clears `scheduledEnableAt`)
- From that point, the redirect handler serves the code normally
- **No changes to `/r/[slug].ts` are required**

This is the cleanest design: the redirect path stays ignorant of scheduling logic. The cron sweep is the only layer that reads schedule columns.

**Edge case:** A user manually sets `isPaused = true` on a QR that has a future schedule. The cron will activate it when the time comes, overriding the manual pause. This should be communicated clearly in the UI: "Your QR code is scheduled to activate automatically. Manually pausing it will delay but not cancel the schedule."

---

## Common Pitfalls

### Pitfall 1: No Idempotency Guard
**What goes wrong:** The cron updates rows matching `scheduledEnableAt <= now` but does not also require `isPaused = true`. A double-fire sets `isPaused = false` on already-active codes, which is a no-op — but if `scheduledEnableAt` was not cleared, the code stays in an inconsistent state (active but still has a past schedule timestamp).
**Why it happens:** Forgetting to clear `scheduledEnableAt` after activation.
**How to avoid:** The UPDATE `SET` must clear the schedule column: `.set({ isPaused: false, scheduledEnableAt: null })`. The WHERE must require `isPaused = true`.
**Warning signs:** `scheduledEnableAt IS NOT NULL` on rows where `isPaused = false`

### Pitfall 2: Timezone Confusion in UI
**What goes wrong:** User in GMT+5 sets "9:00 AM" via a `<input type="datetime-local">`. The browser submits local time. The API stores it as local epoch (5 hours off from UTC). The cron fires at the wrong time.
**Why it happens:** `datetime-local` input returns a local datetime string, not UTC. Converting it to epoch with `new Date(value).getTime() / 1000` gives the correct UTC epoch IF the browser's `Date` constructor is used (it IS timezone-aware). The risk is server-side reinterpretation of a datetime string without timezone context.
**How to avoid:** Always use `new Date(inputValue).getTime() / 1000` on the client before sending to the API. The API should accept only a Unix epoch integer, never a datetime string. Display the scheduled time back to the user as their local time via `new Date(epoch * 1000).toLocaleString()`.

### Pitfall 3: Cron Endpoint Returns 3xx
**What goes wrong:** The cron handler redirects (e.g., middleware redirects to /login because `CRON_SECRET` isn't set). Vercel treats the 3xx as success and moves on. The sweep never runs.
**Why it happens:** `prerender = false` is missing, or Clerk middleware catches the cron route before the handler runs.
**How to avoid:** Add `export const prerender = false` as the first line of `campaigns.ts`. Confirm the Clerk middleware exclusion pattern already handles `/api/cron/*` — check `src/middleware.ts`.

### Pitfall 4: CRON_SECRET Not Set in Local Dev
**What goes wrong:** Local dev hits the cron endpoint and gets 401 because `import.meta.env.CRON_SECRET` is undefined.
**Why it happens:** Vercel auto-injects the header in production only. In dev you must set `CRON_SECRET` in `.env.local` and manually include it when calling the endpoint.
**How to avoid:** Document in the plan that `.env.local` needs `CRON_SECRET=any-local-secret`. The cron handler can be tested locally via `curl -H "Authorization: Bearer any-local-secret" http://localhost:4323/api/cron/campaigns`.

### Pitfall 5: Past Schedule Date Stored, Never Cleared
**What goes wrong:** A QR code's schedule time passes while the cron is temporarily disabled (e.g., Vercel project redeployed with `vercel.json` crons removed). When cron re-enables, it bulk-activates all missed campaigns — which may be hundreds of codes that users expected to activate on specific dates.
**Why it happens:** No `activatedAt` or missed-activation surfacing.
**How to avoid (acceptable for v1.3):** The idempotency guard already handles this gracefully — the next sweep picks up all missed campaigns. Document to users that campaigns may activate up to 15 minutes late, but not a day late. For v1.3, this is acceptable behavior. No additional safeguard needed.

---

## Code Examples

### Verified Drizzle `lte` + `and` + `isNotNull` Pattern

```typescript
// Source: Drizzle ORM docs — conditional operators
// https://orm.drizzle.team/docs/operators
import { and, eq, lte, isNotNull } from 'drizzle-orm';

await db
  .update(dynamicQrCodes)
  .set({ isPaused: false, scheduledEnableAt: null, updatedAt: now })
  .where(
    and(
      isNotNull(dynamicQrCodes.scheduledEnableAt),
      lte(dynamicQrCodes.scheduledEnableAt, now),
      eq(dynamicQrCodes.isPaused, true),
    )
  );
```

### Schema Columns (additive — backward compatible)

```typescript
// src/db/schema.ts — in dynamicQrCodes table definition
scheduledEnableAt: integer('scheduled_enable_at'),   // unix epoch; null = no schedule
scheduledPauseAt:  integer('scheduled_pause_at'),    // unix epoch; null = no auto-pause
```

No default needed — nullable columns with no default are equivalent to `null` for all existing rows.

### vercel.json Full File

```json
{
  "crons": [
    {
      "path": "/api/cron/campaigns",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

### Middleware Check (existing pattern — no changes)

The existing `src/middleware.ts` already uses `shouldRateLimit()` to exempt `/r/` and presumably exempts API routes from Clerk session requirements for `/api/v1/*`. The cron route at `/api/cron/campaigns` must also be exempt from Clerk middleware so that Vercel's unauthenticated GET request reaches the handler. Confirm by checking `middleware.ts` — the `CRON_SECRET` guard inside the handler replaces Clerk auth for this route.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Vercel Cron unavailable on Hobby (once/day max) | Pro: per-minute precision with `*/1` support | Always been Pro-tier | Confirmed: project is on Pro; `*/15` is fully supported |
| No retry on cron failure | Still no retry (Vercel Cron does not retry) | Current | Must design for idempotency; sweep picks up missed on next run |
| Cron can fire twice for same window | Still documented as possible | Current | `isPaused = true` guard in WHERE is the fix |
| `CRON_SECRET` must be manually configured | Auto-injected by Vercel as `Authorization: Bearer {value}` when env var is set | Current | Set env var in Vercel dashboard; handler checks `request.headers.get('authorization')` |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Vercel Pro plan | `*/15` cron schedule | Yes | — (confirmed from project context) | Hobby would require hourly |
| `drizzle-orm` `lte` / `and` / `isNotNull` operators | Sweep query | Yes | ^0.45.1 installed | — |
| `@upstash/redis` | Optional distributed lock | Yes | ^1.37.0 installed | Not needed; idempotency guard is sufficient |
| `vercel.json` | Cron registration | Does not exist yet | — | Create from scratch |
| `CRON_SECRET` env var | Cron security | Not yet set in project | — | Must be added to Vercel dashboard before deploy |

**Missing dependencies with no fallback:**
- `CRON_SECRET` env var must be added to Vercel project settings before the cron handler is deployed. Without it, `import.meta.env.CRON_SECRET` is undefined and the handler will reject all requests including legitimate Vercel-originating ones.

**Missing dependencies with fallback:**
- None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 (e2e) + `node --loader tsx` unit tests |
| Config file | `playwright.config.ts` (baseURL: http://localhost:4323) |
| Quick run command | `node --loader tsx src/lib/__tests__/tierLimits.test.ts` (unit pattern) |
| Full suite command | `npm test` (Playwright, requires running server) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAMPAIGN-01 | PATCH /api/qr/[id] accepts and persists scheduledEnableAt / scheduledPauseAt | unit (node tsx) | `node --loader tsx tests/unit/campaignSchedule.test.mjs` | No — Wave 0 |
| CAMPAIGN-02 | QRLibrary renders "Scheduled" badge and countdown for a QR with future scheduledEnableAt | manual-only | Manual browser check | No |
| CAMPAIGN-03 | Cron sweep activates row where scheduledEnableAt <= now AND isPaused = true; second run is no-op | unit (node tsx) | `node --loader tsx tests/unit/campaignCron.test.mjs` | No — Wave 0 |
| CAMPAIGN-03 | Cron endpoint returns 401 without CRON_SECRET header | unit (node tsx) | included in campaignCron.test.mjs | No — Wave 0 |

CAMPAIGN-02 (countdown UI, status badge) is manual-only — client-side React rendering with real-time countdown cannot be meaningfully unit-tested without a full browser.

### Sampling Rate
- **Per task commit:** `node --loader tsx tests/unit/campaignSchedule.test.mjs && node --loader tsx tests/unit/campaignCron.test.mjs`
- **Per wave merge:** Same unit tests + manual browser check of schedule UI
- **Phase gate:** Unit tests green + manual CAMPAIGN-02 check before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/campaignSchedule.test.mjs` — covers CAMPAIGN-01 (PATCH validation for schedule fields)
- [ ] `tests/unit/campaignCron.test.mjs` — covers CAMPAIGN-03 (sweep idempotency, 401 guard)

*(No new framework install needed — existing `node --loader tsx` pattern matches project convention)*

---

## Open Questions

1. **Middleware exemption for `/api/cron/campaigns`**
   - What we know: Clerk middleware in `middleware.ts` already exempts `/api/v1/*` and `/r/*`
   - What's unclear: Whether the existing exclusion pattern also covers `/api/cron/*` or whether it will attempt a Clerk session check and return a redirect before the handler runs
   - Recommendation: Read `src/middleware.ts` in the plan's Wave 0 task; add `/api/cron/` to the exclusion list if needed

2. **Manual pause + scheduled activation conflict**
   - What we know: The cron activates any row with `isPaused = true AND scheduledEnableAt <= now` — including manually-paused QR codes that happen to have a past schedule
   - What's unclear: Whether users intend "manual pause should override the schedule" or "schedule should override manual pause"
   - Recommendation: For v1.3, schedule overrides manual pause (simpler, consistent). Surface this in the UI with a note: "This QR is scheduled — manual pause will be overridden at the activation time." Clearing the schedule date removes the automatic activation.

3. **API list endpoint — does it return schedule columns?**
   - What we know: `GET /api/qr/list` returns `SavedQR` objects; `QRLibrary.tsx` depends on this shape
   - What's unclear: Whether the list query already joins `dynamicQrCodes` and returns `scheduledEnableAt`/`scheduledPauseAt`
   - Recommendation: Read `src/pages/api/qr/list.ts` in Wave 0; add the two columns to the SELECT and to the `SavedQR` interface in `QRLibrary.tsx`

---

## Project Constraints (from CLAUDE.md)

No `CLAUDE.md` found in the project root. No project-level overrides to document.

---

## Sources

### Primary (HIGH confidence)
- Vercel Cron Jobs official docs — https://vercel.com/docs/cron-jobs — cron expressions, CRON_SECRET behavior, invocation mechanism
- Vercel Managing Cron Jobs — https://vercel.com/docs/cron-jobs/manage-cron-jobs — no retry behavior, double-fire possibility, idempotency guidance, CRON_SECRET header format
- Vercel Cron Usage & Pricing — https://vercel.com/docs/cron-jobs/usage-and-pricing — Pro plan: minimum once/minute, per-minute precision confirmed
- Project `src/db/schema.ts` (read directly) — confirmed `dynamicQrCodes` shape: `isPaused`, no schedule columns yet
- Project `src/pages/r/[slug].ts` (read directly) — confirmed redirect handler only reads `isPaused`, no changes needed
- Project `src/pages/api/qr/[id].ts` (read directly) — confirmed PATCH handler shape; extension point identified
- Project milestone research ARCHITECTURE.md — Feature 6 campaign scheduling architecture, confirmed column names and cron pattern
- Project milestone research PITFALLS.md — Pitfall 7 idempotency requirements, CRON_SECRET guidance

### Secondary (MEDIUM confidence)
- Project milestone research SUMMARY.md — Vercel Cron `*/15 * * * *` as recommended frequency; confirmed Pro plan already in use

### Tertiary (LOW confidence / not needed)
- QStash as alternative to Vercel Cron — researched but not recommended; adds service dependency with no requirement-driven benefit at this scale

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all tools already installed and in use
- Architecture: HIGH — redirect handler shape confirmed by reading actual source; schema shape confirmed; cron pattern confirmed by official Vercel docs
- Pitfalls: HIGH — idempotency requirements sourced from Vercel official docs (double-fire is documented); timezone pitfall is a well-known JS trap
- Cron frequency: HIGH — `*/15` confirmed as Pro-plan supported by official pricing table

**Research date:** 2026-03-31
**Valid until:** 2026-07-01 (Vercel Cron docs are stable; Drizzle API is stable at 0.45.x)
