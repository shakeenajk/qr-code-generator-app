# Architecture Research

**Domain:** Freemium SaaS — Astro 5 static site adding auth, payments, dynamic QR redirect, and analytics
**Researched:** 2026-03-11
**Confidence:** HIGH (Astro + Vercel integration patterns, edge vs serverless distinction, Stripe webhook), MEDIUM (Better Auth session details, Neon edge latency specifics)

---

## Context: Starting Point

The existing app is a fully static Astro 5 site — `output: 'static'` in `astro.config.mjs`, no server-side code, no adapter installed. All logic runs client-side in `QRGeneratorIsland.tsx` (a React island with 276 LOC). The QR preview renders into a `<div>` using qr-code-styling. Deployed to Vercel as static HTML/CSS/JS. Lighthouse mobile: 100.

v1.1 requires **five new server-side capabilities** that do not exist today:

1. Auth (session cookies, protected routes)
2. Database (users, QR codes, subscriptions, scan events)
3. Stripe webhook handling (must be server-side — signature verification)
4. Dynamic QR redirect service (`/r/:code` → target URL + scan log)
5. Scan analytics query (read scan counts and history)

The architecture challenge: **add all five capabilities without breaking the existing static site's Lighthouse 100 performance or introducing unnecessary complexity.**

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER / CLIENT                             │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Astro static pages (HTML + Tailwind CSS, prerendered)        │   │
│  │    index.astro (hero, features, FAQ)   ← UNCHANGED            │   │
│  │    login.astro, signup.astro           ← NEW SSR pages        │   │
│  │    dashboard.astro                     ← NEW SSR page         │   │
│  └────────────────────────┬─────────────────────────────────────┘   │
│                            │ hydrate (client:visible)                │
│  ┌─────────────────────────▼───────────────────────────────────┐    │
│  │  React Islands                                               │    │
│  │    QRGeneratorIsland.tsx  ← MODIFIED: auth props + Pro gate  │    │
│  │    AuthIsland.tsx         ← NEW: login/signup forms          │    │
│  │    DashboardIsland.tsx    ← NEW: saved QR library            │    │
│  │    AnalyticsIsland.tsx    ← NEW: scan charts                 │    │
│  └────────────────────────┬─────────────────────────────────────┘   │
└────────────────────────────┼────────────────────────────────────────┘
                             │ fetch()
┌────────────────────────────▼────────────────────────────────────────┐
│                     VERCEL EDGE LAYER                                 │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Edge Function: /r/[code].ts   (export const runtime='edge')│     │
│  │    1. Neon HTTP driver: SELECT target_url WHERE id=code      │     │
│  │    2. Fire-and-forget scan event (waitUntil, non-blocking)   │     │
│  │    3. Return 302 Location: target_url                        │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  Astro Middleware: src/middleware.ts                         │     │
│  │    - Validate session cookie via Better Auth                 │     │
│  │    - Set Astro.locals.user and Astro.locals.isPro            │     │
│  │    - Redirect unauthenticated /dashboard → /login            │     │
│  └────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│               VERCEL SERVERLESS LAYER (Node.js runtime)               │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  /api/auth/[...] │  │  /api/qr/*       │  │ /api/webhooks/   │  │
│  │  Better Auth     │  │  CRUD saved QRs  │  │ stripe.ts        │  │
│  │  sign-up/in/out  │  │  + analytics     │  │ subscription     │  │
│  │  session verify  │  │  query           │  │ event handling   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
└───────────┼────────────────────┼────────────────────┼──────────────┘
            │                    │                    │
┌───────────▼────────────────────▼────────────────────▼──────────────┐
│                         DATA LAYER                                    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Neon Postgres (serverless HTTP driver for edge;             │    │
│  │                 pooled TCP connection for serverless)         │    │
│  │    users, sessions, subscriptions, qr_codes, scan_events     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Upstash Redis (Phase 2+ optimization, optional at launch)   │    │
│  │    Write-through cache: shortCode → targetUrl                │    │
│  │    Reduces redirect latency for frequently scanned codes     │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                  │
│  ┌──────────────────────────┐  ┌─────────────────────────────────┐  │
│  │  Stripe                  │  │  Better Auth (optional OAuth)    │  │
│  │  Checkout, subscriptions │  │  Google / GitHub social login    │  │
│  │  Customer portal         │  │  (email+password sufficient MVP) │  │
│  └──────────────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New / Modified |
|-----------|---------------|----------------|
| `index.astro` | Marketing homepage, fully static, no auth required | UNCHANGED |
| `src/middleware.ts` | Session validation on every SSR request; inject `locals.user` + `locals.isPro`; protect `/dashboard` | NEW |
| `/r/[code].ts` | Dynamic QR redirect: lookup code → 302, fire-and-forget scan log | NEW (Edge) |
| `/api/auth/[...all].ts` | Better Auth catch-all: sign-up, sign-in, sign-out, session | NEW (Serverless) |
| `/api/qr/index.ts` | GET list of saved QR codes; POST create new QR code | NEW (Serverless) |
| `/api/qr/[id].ts` | GET, PUT, DELETE single QR code; update dynamic target URL | NEW (Serverless) |
| `/api/analytics/[code].ts` | GET scan count + time-series for a QR code | NEW (Serverless) |
| `/api/webhooks/stripe.ts` | Verify Stripe sig; handle subscription lifecycle events | NEW (Serverless) |
| `login.astro` / `signup.astro` | SSR wrappers for AuthIsland | NEW |
| `dashboard.astro` | SSR protected page; passes `user` + `isPro` props to islands | NEW |
| `QRGeneratorIsland.tsx` | Accepts `user`/`isPro` props; gates logo upload + shapes; adds "Save as Dynamic QR" action | MODIFIED |
| `AuthIsland.tsx` | Login/signup forms using Better Auth browser client | NEW |
| `DashboardIsland.tsx` | Saved QR list, edit target URL for dynamic codes, link to analytics | NEW |
| `AnalyticsIsland.tsx` | Fetches `/api/analytics/:code`; renders total count + chart | NEW |
| `db/schema.ts` | Drizzle ORM table definitions | NEW |
| `lib/auth.ts` | Better Auth server instance (imported only by server code) | NEW |
| `lib/db.ts` | Neon + Drizzle client singleton | NEW |
| `lib/stripe.ts` | Stripe SDK client singleton | NEW |

---

## Recommended Project Structure

```
src/
├── components/
│   ├── QRGeneratorIsland.tsx     # MODIFIED — add user/isPro props, Pro gates, save action
│   ├── AuthIsland.tsx            # NEW — login/signup forms (Better Auth client)
│   ├── DashboardIsland.tsx       # NEW — saved QR library UI
│   ├── AnalyticsIsland.tsx       # NEW — scan count + chart
│   ├── UpgradeCTA.tsx            # NEW — reusable "Upgrade to Pro" prompt
│   ├── customize/                # UNCHANGED
│   └── tabs/                    # UNCHANGED
├── pages/
│   ├── index.astro               # UNCHANGED — static, no prerender flag needed
│   ├── login.astro               # NEW — export const prerender = false
│   ├── signup.astro              # NEW — export const prerender = false
│   ├── dashboard.astro           # NEW — export const prerender = false, protected
│   ├── r/
│   │   └── [code].ts             # NEW — export const runtime = 'edge'
│   └── api/
│       ├── auth/
│       │   └── [...all].ts       # NEW — Better Auth catch-all
│       ├── qr/
│       │   ├── index.ts          # NEW — GET list, POST create
│       │   ├── [id].ts           # NEW — GET, PUT, DELETE
│       │   └── checkout.ts       # NEW — POST: create Stripe checkout session
│       ├── analytics/
│       │   └── [code].ts         # NEW — GET scan stats
│       └── webhooks/
│           └── stripe.ts         # NEW — POST webhook handler
├── db/
│   ├── schema.ts                 # NEW — Drizzle table definitions
│   └── migrations/               # NEW — generated by drizzle-kit
├── lib/
│   ├── auth.ts                   # NEW — Better Auth server instance
│   ├── db.ts                     # NEW — Neon + Drizzle client
│   ├── stripe.ts                 # NEW — Stripe SDK client
│   ├── qrEncoding.ts             # UNCHANGED
│   └── contrastUtils.ts          # UNCHANGED
├── hooks/
│   └── useDebounce.ts            # UNCHANGED
├── middleware.ts                  # NEW — session injection + route protection
└── styles/                       # UNCHANGED
```

### Structure Rationale

- **`src/db/`:** Separates schema and migrations from application code. `drizzle-kit generate` and `drizzle-kit migrate` run at CI/deploy time.
- **`src/lib/`:** Server-only singletons. React islands never import from here directly — they call API endpoints which import from `lib/`. This enforces the server/client boundary.
- **`src/pages/r/[code].ts`:** Placed under `pages/` not `pages/api/` to get the clean URL `/r/abc123`. The edge runtime directive makes Vercel deploy it as an edge function, not a serverless function.
- **Static pages stay static:** `index.astro` keeps its default `prerender: true`. Only pages and endpoints with `export const prerender = false` run server-side. Lighthouse 100 preserved on the homepage.
- **`src/middleware.ts`:** Runs for every SSR request (middleware is skipped for prerendered static pages). Auth state is resolved once per SSR request and injected into `locals` — no redundant session fetches.

---

## Critical Architecture Decision: Astro 5 Hybrid Mode

### How It Works in Astro 5

In Astro v5, `output: 'hybrid'` was merged into `output: 'static'`. A single project can now mix fully prerendered static pages with on-demand server-rendered pages without changing the `output` config. Any `.astro` page or `.ts` endpoint opts into server rendering by adding:

```typescript
export const prerender = false;
```

Without that export, every file defaults to static prerender. This is exactly the right model for QRCraft: the marketing homepage stays static (Lighthouse 100 preserved), while `/dashboard`, `/login`, and all `/api/*` routes are server-rendered on demand.

**Required change to `astro.config.mjs`:**

```typescript
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://qrcraft.app',
  output: 'static',           // unchanged — hybrid is now implicit in v5
  adapter: vercel(),          // NEW — required to enable SSR routes on Vercel
  integrations: [react(), sitemap()],
  vite: { plugins: [tailwindcss()] },
});
```

The `@astrojs/vercel` adapter is the single config addition that enables everything. Without it, `prerender: false` routes throw a build error.

Confidence: HIGH — confirmed by Astro 5.0 release blog and on-demand rendering docs.

---

## Critical Architecture Decision: Edge vs Serverless for /r/[code]

### Why This Decision Matters

When someone scans a printed QR code, they wait for the `/r/abc123` redirect before seeing any content. A slow redirect feels like a broken QR code. This is the single most latency-sensitive path in the system.

### Measured Latency (Vercel, 2025)

| Runtime | Cold Start | Warm |
|---------|-----------|------|
| Serverless (Node.js) | 200–500ms | 80–150ms |
| Edge (V8 Isolate) | < 50ms | 10–50ms |

Edge functions are ~9x faster on cold start and ~2x faster warm. For a redirect that fires on every QR scan, this is meaningful.

**Decision: Use Vercel Edge Runtime for `/r/[code].ts`.** Add `export const runtime = 'edge'` to the file.

### Edge Runtime Constraint: No TCP

Edge functions run in the V8 isolate runtime, not Node.js. This rules out standard `pg` connections (TCP). The solution is Neon's HTTP driver (`@neondatabase/serverless` using `neon()` not `Pool`), which queries Postgres over HTTPS fetch — fully edge-compatible.

Neon benchmarks show sub-10ms Postgres queries from Vercel edge functions (same-region). This makes the full redirect flow — edge function cold start + DB lookup + response — achievable in under 60ms total, well below the threshold for perceived latency.

### Upstash Redis Cache (Phase 2+, Not Required at Launch)

For very high scan volume, add Upstash Redis as a write-through cache. On QR create/update, write `shortCode → targetUrl` to Redis. The edge function hits Redis first (2–3ms REST API call), falls back to Neon if miss. Vercel has an official edge-redirects-with-Upstash template. Not required at launch — add when scan volume justifies it.

Confidence: HIGH — Neon edge compatibility confirmed by Neon official docs; edge latency benchmarks from openstatus and Neon.

---

## Data Schema

All tables managed by Drizzle ORM with `drizzle-kit` migrations.

```sql
-- users: managed by Better Auth (auto-created by the framework)
users (
  id          text PRIMARY KEY,   -- Better Auth generates this
  email       text UNIQUE NOT NULL,
  name        text,
  created_at  timestamp DEFAULT now()
)

-- sessions: managed by Better Auth
sessions (
  id           text PRIMARY KEY,
  user_id      text REFERENCES users(id) ON DELETE CASCADE,
  token        text UNIQUE NOT NULL,
  expires_at   timestamp NOT NULL,
  created_at   timestamp DEFAULT now()
)

-- subscriptions: one row per user, written by Stripe webhook
subscriptions (
  id                      text PRIMARY KEY,   -- Stripe subscription ID
  user_id                 text UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id      text UNIQUE NOT NULL,
  stripe_subscription_id  text UNIQUE,
  plan                    text NOT NULL DEFAULT 'free',   -- 'free' | 'pro'
  status                  text NOT NULL DEFAULT 'active', -- 'active' | 'canceled' | 'past_due'
  current_period_end      timestamp,
  updated_at              timestamp DEFAULT now()
)

-- qr_codes: saved QR codes (Pro feature)
qr_codes (
  id           text PRIMARY KEY,   -- nanoid(10), doubles as redirect short code
  user_id      text REFERENCES users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  type         text NOT NULL,      -- 'static' | 'dynamic'
  target_url   text,               -- for dynamic: current redirect destination
  config_json  jsonb NOT NULL,     -- qr-code-styling options snapshot
  created_at   timestamp DEFAULT now(),
  updated_at   timestamp DEFAULT now()
)

-- scan_events: one row per scan (dynamic QR codes only)
scan_events (
  id           bigserial PRIMARY KEY,
  qr_code_id   text REFERENCES qr_codes(id) ON DELETE CASCADE,
  scanned_at   timestamp DEFAULT now(),
  user_agent   text,
  ip_hash      text    -- SHA-256(IP + daily_salt), never raw IP (GDPR)
)

-- stripe_events: for webhook idempotency
stripe_events (
  event_id     text PRIMARY KEY,   -- Stripe event ID (idempotency key)
  processed_at timestamp DEFAULT now()
)
```

**Key design note:** `qr_codes.id` (nanoid 10 chars) is also the redirect short code. The QR encodes `https://qrcraft.app/r/{id}`. No separate URL mapping table — the PK does double duty. Collision probability with nanoid(10) from ~64 chars is negligible for thousands of codes.

**Index:** `CREATE INDEX scan_events_qr_scanned ON scan_events(qr_code_id, scanned_at DESC)` — required for analytics queries.

---

## Architectural Patterns

### Pattern 1: Astro Middleware for Session Injection

**What:** A single `src/middleware.ts` intercepts all on-demand SSR requests, validates the session cookie via Better Auth's `auth.api.getSession()`, and injects `locals.user` and `locals.isPro` so every server-rendered page and API endpoint has auth context without duplicating validation logic.

**When to use:** Always — middleware runs before every SSR handler automatically.

**Trade-offs:** Adds ~5–10ms per SSR request for the session DB lookup. Acceptable because: (a) serverless paths are not latency-critical (they are not the redirect hot path), and (b) the alternative (each endpoint validates auth independently) is far worse for correctness.

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { auth } from './lib/auth';
import { db } from './lib/db';
import { subscriptions } from './db/schema';
import { eq } from 'drizzle-orm';

export const onRequest = defineMiddleware(async (context, next) => {
  const session = await auth.api.getSession({ headers: context.request.headers });
  context.locals.user = session?.user ?? null;

  if (session?.user) {
    const [sub] = await db.select().from(subscriptions)
      .where(eq(subscriptions.userId, session.user.id));
    context.locals.isPro = sub?.plan === 'pro' && sub?.status === 'active';
  } else {
    context.locals.isPro = false;
  }

  const protectedPaths = ['/dashboard'];
  if (protectedPaths.some(p => context.url.pathname.startsWith(p)) && !context.locals.user) {
    return context.redirect('/login');
  }

  return next();
});
```

### Pattern 2: Server Endpoint per Resource

**What:** Astro `.ts` files in `src/pages/api/` export named HTTP method functions (`GET`, `POST`, `PUT`, `DELETE`). Each file becomes a serverless function on Vercel. Auth state is available via `context.locals` (set by middleware — no re-validation needed in the endpoint).

**When to use:** All CRUD operations (QR codes), analytics queries, auth routes (delegated to Better Auth), Stripe checkout and webhooks.

**Trade-offs:** Cold starts apply (~200ms). Acceptable for user-initiated actions (save, edit, view dashboard). Not acceptable for the redirect hot path — which is why `/r/[code].ts` is edge, not serverless.

```typescript
// src/pages/api/qr/index.ts
export const prerender = false;

export async function GET({ locals }: APIContext) {
  if (!locals.user) return new Response('Unauthorized', { status: 401 });
  const codes = await db.select().from(qrCodes)
    .where(eq(qrCodes.userId, locals.user.id))
    .orderBy(desc(qrCodes.createdAt));
  return Response.json(codes);
}

export async function POST({ locals, request }: APIContext) {
  if (!locals.isPro) return new Response('Pro required', { status: 403 });
  const body = await request.json();
  const id = nanoid(10);
  const [created] = await db.insert(qrCodes).values({
    id, userId: locals.user.id, ...body
  }).returning();
  return Response.json(created, { status: 201 });
}
```

### Pattern 3: Edge Function with Fire-and-Forget Scan Logging

**What:** The `/r/[code].ts` redirect handler runs in Vercel Edge Runtime. It reads the target URL from Neon over HTTP, immediately issues a 302 response, and logs the scan as a non-blocking background task. The user reaches the destination fast; the analytics write happens asynchronously.

**When to use:** Any path where redirect latency is more important than write confirmation. This is the industry-standard pattern — Bitly, QR.io, and all major QR services use async scan logging.

**Trade-offs:** Scan counts are eventually consistent. A scan fired 100ms before a dashboard query might not appear yet. This is fully acceptable for analytics (users expect seconds of lag, not milliseconds).

```typescript
// src/pages/r/[code].ts
export const prerender = false;
export const runtime = 'edge';

import { neon } from '@neondatabase/serverless';
import { createHash } from 'crypto';

export async function GET({ params, request }: APIContext) {
  const sql = neon(import.meta.env.DATABASE_URL);

  const [qr] = await sql`
    SELECT target_url FROM qr_codes
    WHERE id = ${params.code} AND type = 'dynamic'
    LIMIT 1
  `;

  if (!qr?.target_url) {
    return new Response('QR code not found', { status: 404 });
  }

  // Log scan asynchronously — does not block the redirect
  const ip = request.headers.get('x-forwarded-for') ?? '';
  const dailySalt = new Date().toISOString().slice(0, 10);
  const ipHash = createHash('sha256').update(ip + dailySalt).digest('hex');

  // Fire-and-forget: scan event logged after response is sent
  sql`
    INSERT INTO scan_events (qr_code_id, user_agent, ip_hash)
    VALUES (${params.code}, ${request.headers.get('user-agent') ?? ''}, ${ipHash})
  `.catch(() => {}); // swallow errors so they never affect the redirect

  return new Response(null, {
    status: 302,
    headers: {
      Location: qr.target_url,
      'Cache-Control': 'no-store, no-cache',
    },
  });
}
```

### Pattern 4: Auth State via SSR Props (Not Island Fetch)

**What:** Server-rendered `.astro` pages use `Astro.locals.user` and `Astro.locals.isPro` (set by middleware) to pass auth state as props to React islands at SSR render time. Islands receive auth state immediately — no client-side fetch on mount.

**When to use:** Every page that has React islands needing auth state.

**Trade-offs:** Auth state is baked in at SSR time. If a session expires mid-session, the island will show stale state until the next navigation, but the next API call will correctly return 401. The island can handle that by redirecting to `/login`. This is how all major SSR frameworks handle this pattern.

```astro
---
// src/pages/dashboard.astro
export const prerender = false;

const user = Astro.locals.user;   // set by middleware
const isPro = Astro.locals.isPro; // set by middleware
---
<DashboardIsland client:visible user={user} isPro={isPro} />
<AnalyticsIsland client:visible isPro={isPro} />
```

```typescript
// Modified QRGeneratorIsland.tsx — top of file
interface Props {
  user: { id: string; email: string; name: string | null } | null;
  isPro: boolean;
}

export default function QRGeneratorIsland({ user = null, isPro = false }: Props) {
  // ... all existing state unchanged ...

  // Pro gate example: LogoSection becomes gated
  return (
    // ... existing JSX ...
    {isPro
      ? <LogoSection ... />
      : <UpgradeCTA feature="Logo upload" />
    }
  );
}
```

The homepage `index.astro` passes `user={null}` and `isPro={false}` — the island renders in free-tier mode with upgrade CTAs visible, but all free features fully functional.

### Pattern 5: Stripe Webhook Idempotency

**What:** Stripe can re-deliver webhooks (network failures, retries). The handler must be idempotent. Record processed event IDs in `stripe_events` table; skip duplicate events.

**When to use:** Always in webhook handlers. Critical for subscription state correctness — accidental double-activation or double-cancellation breaks the user's access.

```typescript
// src/pages/api/webhooks/stripe.ts
export const prerender = false;

export async function POST({ request }: APIContext) {
  const sig = request.headers.get('stripe-signature') ?? '';
  const body = await request.text(); // must be raw text for signature verification

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body, sig, import.meta.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  // Idempotency guard
  const [existing] = await db.select()
    .from(stripeEvents)
    .where(eq(stripeEvents.eventId, event.id));
  if (existing) return new Response('Already processed', { status: 200 });

  await db.insert(stripeEvents).values({ eventId: event.id });

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.created':
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await cancelSubscription(event.data.object as Stripe.Subscription);
      break;
  }

  return new Response('OK', { status: 200 });
}
```

---

## Data Flows

### Flow 1: User Signs Up → Subscribes → Creates Dynamic QR

```
[/signup.astro — SSR page]
  User submits email + password via AuthIsland
      ↓
[POST /api/auth/[...all] — Better Auth handler]
  Hash password, insert users row, create session row
  Return HTTP-only session cookie
      ↓
[Browser redirects to /dashboard]
      ↓
[Middleware validates cookie → locals.user set, locals.isPro = false]
      ↓
[dashboard.astro renders, passes user + isPro=false to DashboardIsland]
  UpgradeCTA shown — "Dynamic QR requires Pro"
      ↓
[User clicks "Upgrade to Pro"]
      ↓
[POST /api/qr/checkout — serverless endpoint]
  stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    success_url: '/dashboard?upgraded=true',
    cancel_url: '/dashboard',
  })
  Returns { url: 'https://checkout.stripe.com/...' }
      ↓
[Browser navigates to Stripe Checkout — user pays]
      ↓
[Stripe fires POST /api/webhooks/stripe — checkout.session.completed]
  Verify stripe-signature header
  Check idempotency (stripe_events table)
  Upsert subscriptions row: plan='pro', status='active'
      ↓
[Browser returns to /dashboard?upgraded=true]
  Middleware re-reads subscriptions row → locals.isPro = true
  DashboardIsland shows "Create Dynamic QR" button
      ↓
[User fills QR form in QRGeneratorIsland, clicks "Save as Dynamic QR"]
      ↓
[POST /api/qr — serverless endpoint, auth + isPro checked]
  id = nanoid(10)  // e.g., "x7kPm3qN2f"
  INSERT INTO qr_codes (id, user_id, name, type='dynamic', target_url, config_json)
  Returns { id, shortUrl: 'https://qrcraft.app/r/x7kPm3qN2f' }
      ↓
[QRGeneratorIsland re-encodes shortUrl into QR pattern]
  User downloads QR — printed code contains /r/x7kPm3qN2f
  Target URL changeable at any time; printed code never changes
```

### Flow 2: QR Code Is Scanned → Analytics Recorded

```
[Mobile camera scans printed QR code]
  Reads: https://qrcraft.app/r/x7kPm3qN2f
      ↓
[GET /r/x7kPm3qN2f — Vercel EDGE FUNCTION]
  Neon HTTP driver: SELECT target_url WHERE id='x7kPm3qN2f'
  (~5–10ms same region, no cold start penalty because edge)
      ↓
[Return 302 Location: https://example.com/campaign-page]
  User sees destination in ~30–60ms total
      ↓ [non-blocking, fire-and-forget]
[INSERT INTO scan_events (qr_code_id, user_agent, ip_hash)]
  Executes ~100ms after redirect, invisible to scanner
  ip_hash = SHA-256(IP + today's date) — no PII stored
```

### Flow 3: User Updates Dynamic QR Destination

```
[User on /dashboard, expands dynamic QR card]
  Types new target URL: 'https://example.com/new-page'
      ↓
[PUT /api/qr/x7kPm3qN2f — serverless endpoint]
  Auth check: locals.user must own this QR code
  UPDATE qr_codes SET target_url='https://example.com/new-page', updated_at=now()
  WHERE id='x7kPm3qN2f' AND user_id=locals.user.id
      ↓
[All future scans immediately redirect to new URL]
  Printed QR code unchanged — no reprint needed
  This is the core value of "dynamic" QR
```

### Flow 4: User Views Scan Analytics

```
[User on /dashboard, clicks "Analytics" on a dynamic QR card]
      ↓
[AnalyticsIsland mounts, GET /api/analytics/x7kPm3qN2f]
      ↓
[Serverless endpoint: auth check + ownership check]
  SELECT
    COUNT(*) as total,
    DATE_TRUNC('day', scanned_at) as day,
    COUNT(*) as day_count
  FROM scan_events
  WHERE qr_code_id = 'x7kPm3qN2f'
  GROUP BY day
  ORDER BY day DESC
  LIMIT 30
      ↓
[Returns { total: 47, series: [{date, count}, ...] }]
      ↓
[AnalyticsIsland renders: "47 total scans" + 30-day bar chart]
```

---

## Integration Points with Existing Code

### Modified: `QRGeneratorIsland.tsx`

**What changes:**
- Accept `user` and `isPro` props (injected by parent `.astro` page at SSR time, defaulting to `null`/`false` for unauthenticated use).
- Gate `LogoSection` and advanced dot/corner shape options behind `isPro`. Show `<UpgradeCTA>` in place of gated UI when `isPro = false`.
- Add "Save as Dynamic QR" button that calls `POST /api/qr` with current `config_json` and target URL.

**What stays unchanged:** All existing state management (276 LOC of form state, debounce, qr-code-styling integration, tab switching, WiFi/vCard encoding, export buttons). The `client:visible` hydration directive is unchanged. No performance impact on the homepage.

**Integration risk:** LOW — purely additive. The island already has well-separated state slices (ColorSection, ShapeSection, LogoSection, tabs).

### Unchanged: `index.astro`

The homepage is fully static. The `QRGeneratorIsland` on the homepage receives `user={null}` and `isPro={false}` as props from the Astro page (which reads `Astro.locals.user` — null for unauthenticated visitors on a static page). Free-tier generation and download work with no changes. Pro gates show upgrade CTAs. Lighthouse 100 preserved.

### Modified: `astro.config.mjs`

Add `@astrojs/vercel` adapter import and `adapter: vercel()` to `defineConfig`. No other changes.

### New: `src/middleware.ts`

Middleware is skipped for prerendered static pages (Astro only runs middleware for on-demand SSR requests). No impact on the static homepage performance.

---

## Build Order

Dependencies:

- Vercel adapter must be configured before SSR routes are testable
- Database schema must exist before any data operations
- Auth must exist before middleware can validate sessions
- Middleware must exist before dashboard page uses `locals.user`
- Stripe billing must exist before `isPro` is meaningful
- QR CRUD must exist before dynamic QR redirect
- Dynamic QR redirect must exist before analytics (no scan events without scans)

```
Phase 1: Foundation (everything else depends on this)
  1a. Add @astrojs/vercel adapter to astro.config.mjs
  1b. Define Drizzle schema (users, sessions, subscriptions, qr_codes, scan_events)
  1c. Configure Neon + Drizzle client (lib/db.ts)
  1d. Install and configure Better Auth (lib/auth.ts)
  1e. Mount Better Auth at /api/auth/[...all].ts
  1f. Write middleware.ts (session validation, route protection)
  1g. Build login.astro + signup.astro + AuthIsland.tsx

Phase 2: Payments
  2a. Stripe SDK client (lib/stripe.ts)
  2b. Checkout endpoint: /api/qr/checkout.ts
  2c. Webhook handler: /api/webhooks/stripe.ts
       (handles checkout.session.completed, subscription.updated, subscription.deleted)
  2d. Middleware reads subscriptions table → locals.isPro

Phase 3: Saved QR Library + Pro Gates
  3a. QR CRUD endpoints: /api/qr/index.ts + /api/qr/[id].ts
  3b. DashboardIsland.tsx (list, rename, delete)
  3c. dashboard.astro (protected SSR page)
  3d. QRGeneratorIsland.tsx modifications (user/isPro props, Pro gates, save action)

Phase 4: Dynamic QR Redirect
  4a. /r/[code].ts edge function (lookup + 302 redirect)
  4b. Fire-and-forget scan_events INSERT in edge function
  4c. PUT /api/qr/[id].ts supports updating target_url
  4d. Dashboard shows dynamic QR's short URL + edit target UI

Phase 5: Scan Analytics
  5a. /api/analytics/[code].ts (aggregate scan_events)
  5b. AnalyticsIsland.tsx (total count + 30-day chart)
  5c. Dashboard integrates analytics link/panel per dynamic QR
```

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users | Neon free tier (0.5 GB storage), Vercel Hobby plan. No Redis. Single Neon region (us-east-1 for lowest Vercel latency). |
| 1k–50k users | Neon Launch plan. Add Upstash Redis write-through cache for redirect hot path. Monitor `scan_events` row growth. |
| 50k–500k users | Neon Scale plan. Pre-aggregate: nightly job writes `scan_daily_totals` table; analytics query reads summaries not raw events. Partition `scan_events` by month. |
| 500k+ users | Dedicated redirect microservice (Cloudflare Workers). ClickHouse or TimescaleDB for analytics. CDN caching for QR images. |

### Scaling Priorities

1. **First bottleneck:** `scan_events` write volume. At 10k scans/day = 3.6M rows/year. At 100k scans/day, raw row-per-scan becomes expensive to aggregate. Add `scan_daily_totals` pre-aggregation before hitting this ceiling.
2. **Second bottleneck:** Redirect lookup under burst traffic (e.g., a QR code appears on TV). Upstash Redis cache (write-through on QR create/update) eliminates Neon dependency for the hot path. Add this when p99 redirect latency exceeds 200ms.

---

## Anti-Patterns

### Anti-Pattern 1: Running the QR Redirect as a Serverless Function

**What people do:** Place `/r/[code].ts` under `/api/` as a regular server endpoint without the edge runtime directive.

**Why it's wrong:** Serverless cold starts take 200–500ms on Vercel. A user scanning a QR code experiences a half-second blank screen before seeing the destination. They assume the QR code is broken and do not retry.

**Do this instead:** Export `const runtime = 'edge'` and use Neon's HTTP driver (not TCP `pg`). Edge cold starts are under 50ms.

### Anti-Pattern 2: Storing Raw IP Addresses for Scan Analytics

**What people do:** Insert `request.headers.get('x-forwarded-for')` directly into `scan_events` as `ip_address text`.

**Why it's wrong:** Raw IPs are personal data under GDPR Article 4(1). Storing them requires consent, privacy policy disclosure, and retention limits. This creates legal risk.

**Do this instead:** Store `SHA-256(IP + daily_salt)` as `ip_hash`. Sufficient for deduplication (filtering same-device repeat scans within a day), no PII stored, daily rotation makes hashes unlinkable across days.

### Anti-Pattern 3: Client-Side Auth Checks as the Security Layer for Pro Features

**What people do:** Fetch `/api/auth/session` in the React island on mount, check `isPro` in JavaScript, conditionally render gated UI. Treat the client-side check as authoritative.

**Why it's wrong:** Client-side checks are purely cosmetic. Any user can call `POST /api/qr` from browser DevTools. The Pro gate must be enforced server-side.

**Do this instead:** The API endpoint checks `locals.isPro` server-side (authoritative — returns 403 if false). The island receives `isPro` as a prop from the SSR page for display purposes only. Security lives at the API layer.

### Anti-Pattern 4: Importing `lib/auth.ts` or `lib/db.ts` in React Islands

**What people do:** Import the server-side Drizzle or Better Auth instances directly in a `*.tsx` island component to make database calls from the client.

**Why it's wrong:** Astro/Vite will attempt to bundle these server modules into the client bundle. They import Node.js-only APIs (`pg`, `crypto`, etc.) that crash in the browser.

**Do this instead:** React islands never import from `src/lib/`. They call API endpoints with `fetch()`. Server modules are only imported in `.ts` endpoint files and `middleware.ts`.

### Anti-Pattern 5: Per-Island Auth Fetches Instead of Middleware Injection

**What people do:** Each React island independently fetches `/api/auth/session` on mount to check if the user is logged in. Shows loading spinners in each island while waiting.

**Why it's wrong:** Multiple redundant auth requests per page load. Every protected page shows loading state on every render. Islands can get inconsistent auth state if the session query returns at different times.

**Do this instead:** Auth validation runs once in `middleware.ts`, injects `locals.user` once per request. The `.astro` page passes auth state as props to all islands simultaneously. Zero auth fetches on the client — islands render with correct state immediately.

### Anti-Pattern 6: Encoding the Final Target URL Directly in the QR Pattern

**What people do:** For "dynamic" QR codes, encode the destination URL (e.g., `https://example.com/campaign`) directly into the QR pattern, then try to track scans by adding UTM parameters.

**Why it's wrong:** Once a QR code is printed, the encoded URL cannot be changed. This is not dynamic QR — it is a tracked static QR. The destination cannot be updated without reprinting.

**Do this instead:** Encode the redirect short URL (`https://qrcraft.app/r/x7kPm3qN2f`) in the QR pattern. The short code is permanent. The target URL is a database field that can be updated at any time. This is the correct definition of a dynamic QR code.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Stripe | Server-side SDK only (`lib/stripe.ts`). Checkout redirect for subscription creation. Webhook for all subscription state changes. | `STRIPE_SECRET_KEY` never leaves server. Use Stripe CLI for local webhook forwarding in dev. |
| Neon Postgres | `@neondatabase/serverless` HTTP driver for edge functions. Standard `pg` + Drizzle for serverless functions (use `-pooler` connection string). | PgBouncer pooler handles connection limits in serverless. Use direct URL only in migrations. |
| Better Auth | Mounted at `/api/auth/[...all].ts` as catch-all handler. Middleware calls `auth.api.getSession()` — HTTP-based, works in edge/serverless. | Session stored as HTTP-only, Secure, SameSite=Lax cookie. Better Auth owns the session schema. |
| Upstash Redis | Optional. REST API from edge function via `@upstash/redis`. Write-through on QR create/update. | Add in Phase 2+ when redirect latency needs optimization. Not required at launch. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Middleware ↔ API endpoints | `context.locals.user` + `context.locals.isPro` | Set once by middleware, read by all SSR handlers. Eliminates redundant auth checks. |
| React islands ↔ API routes | `fetch()` with `credentials: 'include'` (sends session cookie automatically) | Islands never import server modules. API is the only server-communication channel. |
| `/r/[code].ts` ↔ `scan_events` | Async INSERT via Neon HTTP after 302 response is sent | Non-blocking. User redirect is never blocked by analytics write. |
| Stripe webhook ↔ `subscriptions` table | Webhook handler upserts subscription record. Middleware reads it on next request. | Stripe is authoritative for subscription state. Local DB is a cache of Stripe state. |
| `qr_codes.id` ↔ short URL | The PK is the short code. `qrcraft.app/r/{id}` encodes into QR. | No separate URL mapping table. The QR record IS the redirect config. |

---

## Sources

- Astro 5.0 release blog (hybrid → static merge): https://astro.build/blog/astro-5/
- Astro on-demand rendering docs: https://docs.astro.build/en/guides/on-demand-rendering/
- Astro Vercel adapter docs: https://docs.astro.build/en/guides/integrations-guide/vercel/
- Astro middleware docs: https://docs.astro.build/en/guides/middleware/
- Better Auth Astro integration: https://better-auth.com/docs/integrations/astro
- Neon serverless driver docs: https://neon.com/docs/serverless/serverless-driver
- Neon sub-10ms Postgres queries for Vercel edge functions: https://neon.com/blog/sub-10ms-postgres-queries-for-vercel-edge-functions
- Vercel edge vs serverless latency benchmarks: https://www.openstatus.dev/blog/monitoring-latency-vercel-edge-vs-serverless
- Vercel edge redirects + Upstash template: https://github.com/vercel/examples/tree/main/edge-middleware/redirects-upstash
- Stripe subscription webhooks guide: https://docs.stripe.com/billing/subscriptions/webhooks
- Stripe webhook signature verification: https://docs.stripe.com/webhooks
- Drizzle ORM + Neon tutorial: https://orm.drizzle.team/docs/tutorials/drizzle-with-neon

---
*Architecture research for: QRCraft v1.1 — adding auth/payments/dynamic QR redirect/analytics to existing Astro 5 static site on Vercel*
*Researched: 2026-03-11*
