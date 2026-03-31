# Phase 11: Scan Analytics Dashboard - Research

**Researched:** 2026-03-30
**Domain:** Analytics data pipeline (DB schema + query aggregation + API routes + chart visualization)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Analytics accessed via `/dashboard/analytics/[slug]` page; triggered by new "Analytics" button on dynamic QR cards.
- **D-02:** Analytics button sits alongside Edit, pause toggle, Delete on dynamic cards only. Chart icon.
- **D-03:** Analytics page shows QR name + slug in header; back link to `/dashboard`.
- **D-04:** Single scrollable page. Top to bottom: stat cards (Total + Unique), 30-day area chart, device breakdown, top countries.
- **D-05:** Device + country sections use progress-bar list format: label | fill bar | count | percentage.
- **D-06:** Use Tremor for chart components. Install `@tremor/react` as new dependency. (**SEE CRITICAL FINDING BELOW**)
- **D-07:** AreaChart (line with filled area). X-axis = last 30 days, Y-axis = scan count. Tooltip on hover.
- **D-08:** Area chart must support Tailwind dark mode via Tremor's built-in dark mode support.
- **D-09:** Bot filtering at write time in `[slug].ts`. Known bot UA patterns checked before DB insert. If matched, no insert.
- **D-10:** Bot filtering is silent — redirect still proceeds; no response difference for bots.
- **D-11:** `scan_events` table: `id` (text PK UUID), `dynamicQrCodeId` (FK → `dynamic_qr_codes.id`, cascade delete), `scannedAt` (integer Unix timestamp), `userAgent` (text nullable), `country` (text nullable ISO-3166-1 alpha-2), `device` (text nullable `'ios'|'android'|'desktop'|'unknown'`). Index on `(dynamicQrCodeId, scannedAt)`.
- **D-12:** Device detection at write time via UA regex: iOS = `/iPhone|iPad|iPod/i`, Android = `/Android/i`, else `desktop`.
- **D-13:** Country from `x-vercel-ip-country` request header. Falls back to `null`.
- **D-14:** `GET /api/analytics/[slug]` — returns totals, time-series, device, countries. Auth + ownership check. Pro gate.
- **D-15:** All 4 dimensions computed in one request (batched queries).
- **D-16:** Unique scan count = distinct `(country + device + day)` combos. Label as "~unique scans" in UI.

### Claude's Discretion

- Exact Tremor component props and color palette (indigo to match dashboard accent)
- Loading state for analytics page (skeleton or spinner)
- Empty state for 0 scans ("No scans yet" copy)
- Whether analytics page is SSR (preferred) or client-fetch
- Exact bot UA pattern list (start with major crawlers)
- Page title and breadcrumb formatting

### Deferred Ideas (OUT OF SCOPE)

- Per-date-range filtering (ANAL-V2-02)
- CSV export (ANAL-V2-01)
- Scan-limit threshold email alerts (DYN-V2-03)
- Real unique visitor tracking (privacy complexity)
- Pie/donut charts for device breakdown
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANAL-01 | Pro user can view total and unique scan counts for a dynamic QR code | `scan_events` table + COUNT + distinct-combo approximation for unique; served by `/api/analytics/[slug]` + stat cards UI |
| ANAL-02 | Pro user can view a 30-day time-series scan chart per QR code | GROUP BY day query on `scannedAt`; Recharts AreaChart (or Tremor AreaChart); 30-entry data array |
| ANAL-03 | Pro user can view device breakdown (iOS/Android/desktop) per QR code | `device` column on `scan_events`; GROUP BY device query; progress-bar list UI |
| ANAL-04 | Pro user can view top countries per QR code | `country` column on `scan_events`; GROUP BY country ORDER BY count DESC LIMIT 5; progress-bar list UI |
</phase_requirements>

---

## Summary

Phase 11 adds a scan analytics pipeline to QRCraft. It spans three layers: (1) data capture — modifying the existing `/r/[slug].ts` redirect edge function to write `scan_events` rows with bot filtering, device classification, and country extraction; (2) data retrieval — a new `GET /api/analytics/[slug]` route that runs batched Drizzle queries to compute totals, 30-day time-series, device breakdown, and top-5 countries; and (3) presentation — a new SSR Astro page at `/dashboard/analytics/[slug].astro` rendering stat cards, an area chart React island, and two progress-bar breakdown panels.

The most critical risk for the planner is the **chart library selection**. Decision D-06 locks in `@tremor/react` (the npm package), but verified research shows this package requires Tailwind v3.4+ with a `tailwind.config.ts` file — incompatible with the project's Tailwind v4 CSS-first configuration. The safe resolution is to use **Recharts directly** (the engine Tremor runs on top of), which explicitly supports React 19, works without any Tailwind config changes, and can be styled with Tailwind classes on wrapper elements. Wave 0 of the plan must resolve this choice before any chart implementation begins.

The data model, query patterns, bot-filter logic, and API route structure are all straightforward given the established project conventions. The existing Drizzle + Turso stack handles all aggregate queries natively with `count()`, `sql<number>` templates, and `groupBy()`.

**Primary recommendation:** Use Recharts `AreaChart` directly (not `@tremor/react`) for the time-series chart. Copy-paste the Tremor Raw AreaChart component from tremor.so as a Tailwind v4-compatible alternative, or implement a lean hand-rolled Recharts wrapper. Either avoids the Tailwind v3/v4 conflict with zero architectural change.

---

## CRITICAL FINDING: Tremor npm Package Incompatibility

**Confidence: HIGH (verified against official docs + npm registry)**

Decision D-06 specifies `npm install @tremor/react`. This will cause styling failures.

| Fact | Source | Status |
|------|--------|--------|
| `@tremor/react` v3.18.7 (latest) requires Tailwind CSS v3.4+ | npm.tremor.so/docs/getting-started/installation | Verified |
| `@tremor/react` requires `tailwind.config.ts` with explicit content paths and plugin | npm.tremor.so/docs | Verified |
| Project uses Tailwind v4 (CSS-first, no `tailwind.config.ts`) | `package.json` — `tailwindcss: ^4.2.1` | Verified |
| Tailwind v4 is fundamentally incompatible with Tremor npm's `tailwind.config` requirement | GitHub discussion #1010 + official Tremor npm docs | Verified |
| "Tremor Raw" (tremor.so) is the Tailwind v4 successor — copy-paste model, not npm | tremor.so/docs | Verified |
| Recharts (what Tremor wraps) supports React 19 explicitly via peerDeps `^19.0.0` | npm view recharts | Verified |

**Resolution options (in recommended order):**

1. **Use Recharts directly** (`npm install recharts`) — React 19 compatible, Tailwind-agnostic, ~40KB gzip. Implement a lean `ScanChart` component using `<AreaChart>`, `<XAxis>`, `<YAxis>`, `<Tooltip>`, `<Area>` from recharts. Style wrapper with Tailwind classes.
2. **Copy-paste Tremor Raw AreaChart** — fetch component source from tremor.so, copy into `src/components/dashboard/ScanChart.tsx`. Requires `recharts` + `useOnWindowResize` hook + `chartUtils.ts`. More setup, same underlying library.
3. **Do not install `@tremor/react` npm package** — styling will be broken in Tailwind v4 environment.

The planner must pick option 1 or 2. This research recommends option 1 as the lowest-friction path.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 (installed) | DB queries: INSERT, SELECT + aggregate | Already in project; handles `scan_events` schema and all analytics queries |
| @libsql/client | 0.17.0 (installed) | Turso HTTP client | Already in project; used for edge function writes via `drizzle-orm/libsql/web` |
| recharts | 3.8.1 (current) | AreaChart for 30-day time-series | React 19 explicit peerDep support; Tailwind-agnostic; what Tremor uses internally |
| lucide-react | installed | `BarChart2` icon for Analytics button | Already installed; project icon library |

### Supporting (already installed)
| Library | Version | Purpose |
|---------|---------|---------|
| sonner | 2.0.7 | Error toasts on analytics page fetch failure |
| @clerk/astro | 3.0.4 | `locals.auth()` session for Pro gate in analytics API |

### Do NOT install
| Package | Reason |
|---------|--------|
| @tremor/react | Tailwind v3 requirement conflicts with project's Tailwind v4; will break styles |
| @headlessui/react | Tremor npm dependency; only needed with @tremor/react |
| @tailwindcss/forms | Tremor npm dependency; only needed with @tremor/react |

**Installation (only new dependency):**
```bash
npm install recharts
```

**Version verification (run before writing plan):**
```bash
npm view recharts version  # 3.8.1 as of 2026-03-30
npm view recharts peerDependencies  # confirms React 19 support
```

---

## Architecture Patterns

### Recommended Project Structure (additions)

```
src/
├── db/
│   └── schema.ts                  # ADD: scanEvents table
├── pages/
│   ├── r/
│   │   └── [slug].ts              # MODIFY: add scan event write + bot filter
│   ├── api/
│   │   └── analytics/
│   │       └── [slug].ts          # NEW: analytics data API route
│   └── dashboard/
│       └── analytics/
│           └── [slug].astro       # NEW: analytics page (SSR)
└── components/
    └── dashboard/
        ├── QRLibrary.tsx          # MODIFY: add Analytics button to CardActions
        └── ScanChart.tsx          # NEW: Recharts AreaChart React island
```

### Pattern 1: scan_events Drizzle Schema

```typescript
// Source: D-11 decision + established schema.ts patterns
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const scanEvents = sqliteTable('scan_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  dynamicQrCodeId: text('dynamic_qr_code_id')
    .notNull()
    .references(() => dynamicQrCodes.id, { onDelete: 'cascade' }),
  scannedAt: integer('scanned_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  userAgent: text('user_agent'),
  country: text('country'),
  device: text('device'),  // 'ios' | 'android' | 'desktop' | 'unknown'
}, (table) => [
  index('scan_events_qr_id_scanned_at_idx').on(table.dynamicQrCodeId, table.scannedAt),
]);
```

### Pattern 2: Drizzle Migration Command

```bash
# After adding scanEvents to schema.ts
npx drizzle-kit generate   # generates migration SQL
npx drizzle-kit migrate    # applies to Turso
```

### Pattern 3: Bot Filter + Device Classify in Edge Function

```typescript
// In src/pages/r/[slug].ts — add before redirect return
const BOT_UA_PATTERNS = [
  /Googlebot/i, /bingbot/i, /AhrefsBot/i, /facebookexternalhit/i,
  /Twitterbot/i, /LinkedInBot/i, /Slackbot/i, /WhatsApp/i,
  /DuckDuckBot/i, /YandexBot/i, /Baiduspider/i,
];

function isBot(ua: string | null): boolean {
  if (!ua) return false;
  return BOT_UA_PATTERNS.some(pattern => pattern.test(ua));
}

function classifyDevice(ua: string | null): 'ios' | 'android' | 'desktop' | 'unknown' {
  if (!ua) return 'unknown';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}
```

### Pattern 4: Fire-and-Forget Scan Event Write

```typescript
// In GET handler after bot check — non-blocking
// Per D-09/D-10: write event BEFORE returning redirect response
const ua = request.headers.get('user-agent');
if (!isBot(ua)) {
  const country = request.headers.get('x-vercel-ip-country') ?? null;
  const device = classifyDevice(ua);
  // Fire-and-forget: do NOT await — keep redirect latency minimal
  db.insert(scanEvents).values({
    dynamicQrCodeId: row.id,
    userAgent: ua,
    country,
    device,
  }).catch(() => { /* silent — analytics must not break redirects */ });
}
return new Response(null, { status: 307, headers: { Location: row.destinationUrl } });
```

Note: `row.id` requires fetching `dynamicQrCodes.id` in addition to `destinationUrl` and `isPaused`. Update the SELECT projection in `[slug].ts`.

### Pattern 5: Analytics API — Batched Queries

```typescript
// GET /api/analytics/[slug].ts
// Four queries run via Promise.all (single round-trip to Turso is possible but
// Promise.all with 4 simple queries is simpler and acceptable at this scale)

const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

const [totalRows, timeSeriesRows, deviceRows, countryRows, qrRow] = await Promise.all([
  // Total scans
  db.select({ count: count() })
    .from(scanEvents)
    .where(eq(scanEvents.dynamicQrCodeId, dynamicQr.id)),

  // ~Unique scans (distinct day+device+country combos)
  db.select({
    unique: sql<number>`count(distinct (
      cast(${scanEvents.scannedAt} / 86400 as int) ||
      coalesce(${scanEvents.device},'') ||
      coalesce(${scanEvents.country},'')
    ))`,
  })
    .from(scanEvents)
    .where(and(eq(scanEvents.dynamicQrCodeId, dynamicQr.id),
               gte(scanEvents.scannedAt, thirtyDaysAgo))),

  // 30-day time series: GROUP BY day
  db.select({
    day: sql<number>`cast(${scanEvents.scannedAt} / 86400 as int)`,
    scans: count(),
  })
    .from(scanEvents)
    .where(and(eq(scanEvents.dynamicQrCodeId, dynamicQr.id),
               gte(scanEvents.scannedAt, thirtyDaysAgo)))
    .groupBy(sql`cast(${scanEvents.scannedAt} / 86400 as int)`),

  // Device breakdown
  db.select({ device: scanEvents.device, scans: count() })
    .from(scanEvents)
    .where(eq(scanEvents.dynamicQrCodeId, dynamicQr.id))
    .groupBy(scanEvents.device),

  // Top 5 countries
  db.select({ country: scanEvents.country, scans: count() })
    .from(scanEvents)
    .where(eq(scanEvents.dynamicQrCodeId, dynamicQr.id))
    .groupBy(scanEvents.country)
    .orderBy(desc(count()))
    .limit(5),
]);
```

### Pattern 6: Recharts AreaChart (replaces @tremor/react)

```tsx
// src/components/dashboard/ScanChart.tsx
// client:only="react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ScanChartProps {
  data: { date: string; scans: number }[];
}

export default function ScanChart({ data }: ScanChartProps) {
  return (
    <div className="w-full h-64 md:h-72" aria-label="Scan volume over last 30 days">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="scans"
            stroke="#4F46E5"
            fill="url(#scanGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Pattern 7: Analytics API Route Structure

```typescript
// src/pages/api/analytics/[slug].ts — follows established API route pattern
export const prerender = false;

export const GET: APIRoute = async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  // Pro gate: query subscriptions table, check tier === 'pro'
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) });
  if (sub?.tier !== 'pro') return new Response('Forbidden', { status: 403 });

  const { slug } = params;
  // Ownership check: verify slug belongs to userId
  const [dynamicQr] = await db
    .select({ id: dynamicQrCodes.id, name: savedQrCodes.name })
    .from(dynamicQrCodes)
    .innerJoin(savedQrCodes, eq(dynamicQrCodes.savedQrCodeId, savedQrCodes.id))
    .where(and(eq(dynamicQrCodes.slug, slug!), eq(dynamicQrCodes.userId, userId)))
    .limit(1);

  if (!dynamicQr) return new Response('Not found', { status: 404 });

  // ... batched queries (Pattern 5 above) ...
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

### Pattern 8: SSR Analytics Astro Page

```astro
---
// src/pages/dashboard/analytics/[slug].astro
export const prerender = false;

const { userId } = Astro.locals.auth();
if (!userId) return Astro.redirect('/login');

// Server-side Pro gate + data fetch
const res = await fetch(`${import.meta.env.PUBLIC_BASE_URL}/api/analytics/${slug}`, {
  headers: { cookie: Astro.request.headers.get('cookie') ?? '' }
});
if (res.status === 403) return Astro.redirect('/pricing');
if (res.status === 404) return Astro.redirect('/dashboard');
const data = await res.json();
---
```

### Anti-Patterns to Avoid

- **Don't await the scan event write** — fire-and-forget only. Awaiting adds latency to every redirect.
- **Don't filter bots client-side** — bot filter must be server-side at write time (D-09).
- **Don't use `eq(scanEvents.userId, userId)` for IDOR prevention** — `scan_events` has no `userId` column. Ownership is via `dynamicQrCodeId → dynamicQrCodes.userId`. Always verify ownership by joining through `dynamicQrCodes`.
- **Don't install @tremor/react** — Tailwind v3 dependency will conflict with project's Tailwind v4. Use Recharts directly.
- **Don't `await` the `db.insert` for scan event in redirect path** — analytics failures must never break redirects.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Time-series chart rendering | Custom SVG chart | Recharts `AreaChart` | SVG math, responsiveness, tooltips, accessibility are all solved |
| Responsive chart container | CSS resize hacks | Recharts `ResponsiveContainer` | Handles ResizeObserver, SSR hydration edge cases |
| Bot detection | Full UA parser library | Simple regex list (D-09) | UA parsers are overkill; 10 patterns cover >95% of crawlers |
| Country lookup | IP geolocation API | `x-vercel-ip-country` header | Already provided by Vercel infra; zero-latency, no extra cost |
| Unique visitor tracking | Session tokens / fingerprinting | day+device+country approximation (D-16) | Privacy-safe; acceptable accuracy for v1.1 analytics |

**Key insight:** The scan analytics read path is computationally simple — SQLite GROUP BY queries are fast even at tens of thousands of rows. Don't over-engineer aggregations; raw SQL via `sql<number>` templates is fine at this scale.

---

## Common Pitfalls

### Pitfall 1: Tremor npm + Tailwind v4 Style Breakage
**What goes wrong:** `@tremor/react` components render with no styles or broken layout. Chart area appears plain HTML.
**Why it happens:** Tremor npm injects Tailwind color tokens and requires `tailwind.config.ts` content scanning of `node_modules/@tremor/**` — not possible with Tailwind v4's CSS-first model.
**How to avoid:** Use Recharts directly or copy-paste Tremor Raw component. Do not install `@tremor/react`.
**Warning signs:** If you install `@tremor/react` and styles look wrong after `npm run dev`, this is the cause.

### Pitfall 2: Bot UA Check Misplaced
**What goes wrong:** Bot filtering applied after DB insert instead of before.
**Why it happens:** Easy to insert first then filter, but D-09 is explicit: check before insert.
**How to avoid:** Structure the redirect handler as: 1. fetch QR row, 2. check paused, 3. check UA for bots, 4. insert event if not bot, 5. return redirect.

### Pitfall 3: Awaiting Scan Event Insert in Redirect Path
**What goes wrong:** Redirect latency increases by 50-200ms on every scan.
**Why it happens:** Natural instinct to await async operations.
**How to avoid:** Fire-and-forget: call `db.insert().values(...).catch(() => {})` without `await`.

### Pitfall 4: IDOR on Analytics Endpoint
**What goes wrong:** Any authenticated user can view analytics for any dynamic QR by guessing the slug.
**Why it happens:** Analytics query uses only `eq(scanEvents.dynamicQrCodeId, id)` without userId check.
**How to avoid:** Always verify ownership: join `dynamicQrCodes` and filter by `userId` before fetching scan data.

### Pitfall 5: Missing `id` in Redirect Edge Function Select
**What goes wrong:** Cannot reference `dynamicQrCodeId` for the scan_events insert because current `[slug].ts` only selects `destinationUrl` and `isPaused`.
**Why it happens:** Incremental feature addition to existing query.
**How to avoid:** Add `id: dynamicQrCodes.id` to the SELECT projection in `[slug].ts` as part of Wave 1.

### Pitfall 6: Empty 30-Day Array When No Scans
**What goes wrong:** Chart receives an empty array and renders blank.
**Why it happens:** SQL GROUP BY with no rows returns zero rows, not 30 rows with 0 values.
**How to avoid:** In the API response, fill missing days with 0 counts on the server side, or handle empty state in the `ScanChart` component by showing an empty state message instead of rendering `<AreaChart>`.

### Pitfall 7: `scannedAt` Unix Timestamp Division for Day Bucketing
**What goes wrong:** `GROUP BY date(scannedAt)` fails in SQLite because `scannedAt` is stored as integer (Unix timestamp), not text.
**Why it happens:** SQLite `date()` function expects text or proper datetime format.
**How to avoid:** Use `cast(scannedAt / 86400 as int)` as shown in Pattern 5. Convert bucket back to `Date` object in the API response for display formatting.

---

## Code Examples

### Drizzle count() import
```typescript
// Source: https://orm.drizzle.team/docs/guides/count-rows
import { count, countDistinct, sql, desc, and, gte, eq } from 'drizzle-orm';
```

### Time-Series Bucket to Date Label Conversion
```typescript
// In API route: convert day-bucket integer to 'Mar 1' format for chart X-axis
const dayBucketToLabel = (bucket: number): string => {
  const date = new Date(bucket * 86400 * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
```

### Fill Missing Days in 30-Day Window
```typescript
// In API route: ensure all 30 days appear even with 0 scans
const nowBucket = Math.floor(Date.now() / 1000 / 86400);
const timeSeries = Array.from({ length: 30 }, (_, i) => {
  const bucket = nowBucket - 29 + i;
  const found = rawTimeSeries.find(r => r.day === bucket);
  return {
    date: dayBucketToLabel(bucket),
    scans: found?.scans ?? 0,
  };
});
```

### x-vercel-ip-country Header
```typescript
// Source: Vercel docs / CONTEXT.md D-13
// Available in Astro API routes and pages as a request header
const country = request.headers.get('x-vercel-ip-country') ?? null;
// Returns ISO 3166-1 alpha-2 (e.g. 'US', 'GB', 'DE') or null in local dev
```

### Pro Gate in API Route
```typescript
// Source: established pattern from src/pages/api/subscription/status.ts
import { subscriptions } from '../../../db/schema';
const sub = await db.query.subscriptions.findFirst({
  where: eq(subscriptions.userId, userId),
});
if (sub?.tier !== 'pro') {
  return new Response(JSON.stringify({ error: 'pro_required' }), { status: 403 });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@tremor/react` npm package | Tremor Raw (copy-paste) for Tailwind v4 | Early 2025 (Tremor joined Vercel) | npm package locked to Tailwind v3; new projects on Tailwind v4 use Raw or Recharts directly |
| `tailwind.config.js` for third-party lib integration | CSS-first via `@source` directive in `.css` | Tailwind v4 release | No `tailwind.config.js` at all; libs that require it don't work in v4 |
| Awaiting analytics writes in hot path | Fire-and-forget async insert | Analytics best practice | Decouples redirect latency from DB write latency |

---

## Open Questions

1. **D-06 resolution: confirm Recharts vs Tremor Raw**
   - What we know: `@tremor/react` npm package will not style correctly under Tailwind v4
   - What's unclear: Whether the user is aware of this and whether they prefer Recharts (simpler) or Tremor Raw copy-paste (more visual fidelity to D-06/D-07)
   - Recommendation: Plan Wave 0 as "install recharts + hand-rolled ScanChart". If user wants Tremor Raw aesthetics, Wave 0 can instead copy the Tremor Raw AreaChart component from tremor.so — both are valid; recharts is the simpler path.

2. **Fire-and-forget on Vercel serverless vs. edge**
   - What we know: The redirect endpoint is serverless (not edge per Phase 10 decision). Vercel serverless functions keep running briefly after response is sent.
   - What's unclear: Whether Vercel's serverless function lifecycle guarantees the fire-and-forget `db.insert()` completes before function shutdown.
   - Recommendation: Treat it as best-effort. Missing a small percentage of events is acceptable for v1.1 analytics. If needed, `waitUntil` can be added later.

3. **Drizzle migration for scan_events**
   - What we know: Drizzle Kit generates migrations; project uses Turso
   - What's unclear: Whether the human operator needs to run `npx drizzle-kit migrate` manually or if the plan should include it as a Wave gate step
   - Recommendation: Include as an explicit task in Wave 1 (DB schema wave) with a manual checkpoint: "run `npx drizzle-kit generate && npx drizzle-kit migrate`".

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| recharts (npm) | ScanChart island | Must install | 3.8.1 | — (no fallback; required) |
| Turso (libSQL) | scan_events writes + reads | Assumed ✓ | 0.17.0 (@libsql/client) | — (already live from Phase 10) |
| Vercel `x-vercel-ip-country` header | Country detection | ✓ in production, ✗ in local dev | — | Fallback to `null` (already in D-13) |
| drizzle-kit | Migration generation | Check: `npx drizzle-kit --version` | 0.31.9 (devDep) | — (already installed) |

**Missing dependencies with no fallback:**
- `recharts` must be installed before any chart implementation task

**Missing dependencies with fallback:**
- `x-vercel-ip-country` header: absent in local dev → all country values will be `null` during local testing. This is acceptable; country breakdown will show data only after Vercel deployment.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` (root) |
| Quick run command | `npm run test:smoke` (runs `@smoke` tagged tests only) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANAL-01 | GET /api/analytics/[slug] unauthenticated returns 401 | smoke/API | `npm run test:smoke` | ❌ Wave 0 — `tests/analytics/analytics-api.spec.ts` |
| ANAL-01 | GET /api/analytics/[slug] non-Pro returns 403 | smoke/API | `npm run test:smoke` | ❌ Wave 0 |
| ANAL-01 | GET /api/analytics/[slug] wrong user returns 404 | smoke/API | `npm run test:smoke` | ❌ Wave 0 |
| ANAL-01 | Analytics API returns totals shape `{ total, unique }` | smoke/API | `npm run test:smoke` | ❌ Wave 0 (fixme) |
| ANAL-02 | Analytics API returns timeSeries array (30 entries) | smoke/API | `npm run test:smoke` | ❌ Wave 0 (fixme) |
| ANAL-03 | Analytics API returns device breakdown array | smoke/API | `npm run test:smoke` | ❌ Wave 0 (fixme) |
| ANAL-04 | Analytics API returns countries array (max 5) | smoke/API | `npm run test:smoke` | ❌ Wave 0 (fixme) |
| ANAL-01 | Bot UA does not create scan_events row | manual | manual at checkpoint | manual-only (requires DB inspection) |
| ANAL-03 | Device classification: iOS UA → 'ios' | unit | inline in redirect spec | ❌ Wave 0 (unit test of classifyDevice fn) |

**Manual-only justifications:**
- Bot filtering validation: requires DB state inspection (no automated way to verify absent rows)
- Pro gate with real session: requires real Clerk Pro session (pattern: `test.fixme` per Phase 09 precedent)
- Country header: only present in Vercel prod environment; cannot be simulated in Playwright dev server

### Sampling Rate
- **Per task commit:** `npm run test:smoke`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/analytics/analytics-api.spec.ts` — covers ANAL-01 (auth/403/404 cases), ANAL-02, ANAL-03, ANAL-04 (response shape with fixme for session-bound cases)
- [ ] Unit test for `classifyDevice()` function — covers ANAL-03 device logic
- [ ] No new framework config needed — Playwright config unchanged

---

## Sources

### Primary (HIGH confidence)
- `npm view @tremor/react` — confirmed version 3.18.7, peer deps `react: ^18.0.0` only (no Tailwind peer dep declared, but docs require v3 config)
- `npm view recharts` — confirmed version 3.8.1, peerDeps explicitly include `react: ^19.0.0`
- https://npm.tremor.so/docs/getting-started/installation — requires Tailwind v3.4+, `tailwind.config.ts`, `@tailwindcss/forms` plugin
- https://www.tremor.so/docs/getting-started/installation — Tremor Raw requires Tailwind v4+; CSS-first; copy-paste model
- https://orm.drizzle.team/docs/guides/count-rows — `count()`, `countDistinct()`, GROUP BY patterns
- https://orm.drizzle.team/docs/select — `groupBy()`, `having()`, aggregate helpers
- Project files: `src/db/schema.ts`, `src/pages/r/[slug].ts`, `src/pages/api/qr/[id].ts`, `src/pages/api/subscription/status.ts`, `src/components/dashboard/QRLibrary.tsx`

### Secondary (MEDIUM confidence)
- GitHub discussion #1010 on tremorlabs/tremor-npm — Tailwind v4 compatibility unanswered by maintainers, community confirms incompatibility
- Tremor X announcement (Dec 2024) — Tremor Raw (next-gen) entering beta with React 19 + Tailwind v4 support
- https://bundlephobia.com/package/recharts — ~40KB gzip for recharts

### Tertiary (LOW confidence)
- Vercel serverless function lifecycle for fire-and-forget writes — behavioral guarantee not formally documented

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry verified, peer deps confirmed
- Architecture: HIGH — follows established project patterns exactly (API routes, Drizzle queries, Astro SSR pages)
- Chart library risk (Tremor): HIGH — definitively incompatible with Tailwind v4; Recharts recommendation is HIGH confidence
- Pitfalls: HIGH — based on code inspection of existing project + verified library docs

**Research date:** 2026-03-30
**Valid until:** 2026-06-30 (recharts and drizzle are stable; Tremor npm situation unlikely to change)
