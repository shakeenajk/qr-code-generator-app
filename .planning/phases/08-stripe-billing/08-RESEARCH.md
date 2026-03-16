# Phase 8: Stripe Billing - Research

**Researched:** 2026-03-16
**Domain:** Stripe Checkout, Stripe Customer Portal, Stripe Webhooks, Drizzle ORM (libSQL/Turso), Astro API endpoints
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Tier structure and pricing**
- 3 tiers: Free, Starter, Pro
- Free: 5 QR codes, static QR only, basic PNG download (no account required for generation)
- Starter: $3.99/mo or $39/yr — 100 QR codes, PNG + SVG download, save QR codes, no ads
- Pro: $7.99/mo or $79/yr — unlimited QR codes, dynamic QR codes, analytics, custom colors/logo
- 4 Stripe products needed: Starter monthly, Starter annual, Pro monthly, Pro annual
- Custom colors and logo upload stay free forever — not gated despite appearing in Pro tier description
- App tracks tier level (free / starter / pro) from webhook events

**Upgrade entry point**
- Dashboard only — homepage stays a pure, frictionless QR generator with no billing UI
- Primary CTA: persistent panel at the bottom of the dashboard sidebar — "Upgrade to Pro" for free users
- For paid users (Starter or Pro): panel replaced with "Manage subscription" link → opens Stripe Customer Portal
- Hero section on homepage: subtle mention like "Free forever — unlock Pro for dynamic QR codes" with a link to /pricing

**Pricing page**
- Standalone public `/pricing` page — SEO-friendly, linked from hero mention
- Shows free vs Starter vs Pro comparison with monthly/annual toggle
- Annual savings clearly displayed per tier

**Pro status UI**
- Colored pill badge in the UserMenu dropdown next to the user's name
  - Free: no badge (or subtle "Free" label)
  - Starter: blue pill
  - Pro: purple/gold pill
- Free users in dashboard: upgrade CTA at sidebar bottom + inline contextual prompt when hitting a gated feature

**Post-checkout experience**
- Stripe redirects to `/dashboard?upgraded=true`
- App polls subscription status for up to 5 seconds waiting for webhook
- While polling: show "Activating your plan…" indicator
- Once Pro/Starter confirmed: success toast — "Welcome to [Starter/Pro]! Your plan is now active."
- If webhook fires later (rare): toast appears on next page interaction

**Payment failure handling**
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

### Deferred Ideas (OUT OF SCOPE)
- Feature gates on logo upload / advanced shapes (GATE-01, GATE-02) — Phase 9
- QR count limits enforcement in the generator — Phase 9 (once save library exists to count against)
- Annual plan auto-renewal email reminders — v2
- Coupon/promo code support — v2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BILL-01 | User can upgrade to Pro via Stripe Checkout (monthly plan) | Stripe Checkout `mode: 'subscription'` with monthly Price ID; Astro POST endpoint creates session |
| BILL-02 | User can upgrade to Pro via Stripe Checkout (annual plan at a discount) | Same Checkout flow, separate annual Price ID; monthly/annual selector in UI drives which price ID is sent |
| BILL-03 | User can manage or cancel their subscription via Stripe Customer Portal | `stripe.billingPortal.sessions.create({ customer, return_url })` — requires portal settings saved in Stripe Dashboard first |
| BILL-04 | Pro status is reflected in the app after checkout completes (webhook-driven, not redirect-driven) | `checkout.session.completed` webhook updates DB; dashboard polls `/api/subscription/status` for up to 5s post-redirect |
| BILL-05 | Subscription lifecycle events are handled (checkout, update, cancel, payment failure, trial end) | Six events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.trial_will_end`; `stripe_events` dedup table prevents double-processing |
</phase_requirements>

---

## Summary

Stripe Billing integration for QRCraft follows a standard SaaS webhook-driven pattern: Stripe Checkout creates the subscription, webhooks update the database authoritatively, and the app reads subscription state from the local DB rather than calling Stripe on each request. The key discipline is that Checkout redirects are unreliable (tab closes, network drops) — the webhook is the single source of truth for pro status.

The Astro endpoint pattern is straightforward: POST handlers with `export const prerender = false` at `src/pages/api/`. The critical Astro-specific insight is that `request.text()` returns the raw body string needed for Stripe webhook signature verification — no custom buffer-reading helper is needed (unlike Express). Webhook endpoint must be excluded from Clerk middleware since Stripe sends unauthenticated POST requests.

Drizzle ORM with Turso/libSQL uses `drizzle-orm/libsql/web` import path for Astro (not the default `drizzle-orm/libsql`). Two tables are needed: `subscriptions` (maps Clerk userId to Stripe data + tier) and `stripe_events` (deduplication — stores processed event IDs to prevent double-execution on Stripe retries).

**Primary recommendation:** Implement webhook handler first (Wave 1), then checkout/portal endpoints (Wave 2), then UI layer (Wave 3). DB schema is the foundation everything else reads from.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | ^20.4.1 | Stripe Node.js SDK — checkout, portal, webhook construction | Official Stripe SDK; includes TypeScript types; pinned to API version 2026-02-25 |
| drizzle-orm | ^0.45.1 | ORM for Turso/libSQL database | Already decided in Phase 7 research; type-safe SQL |
| @libsql/client | (peer dep of drizzle) | libSQL database client | Already decided; use `/web` variant for Astro |

### No New Dev Dependencies Needed
Playwright already installed for E2E tests. `stripe` SDK is the only new package.

**Installation:**
```bash
npm install stripe@^20.4.1
```

Note: `drizzle-orm` and `@libsql/client` may not yet be installed (Phase 7 set up auth but not DB). Verify with `npm ls drizzle-orm`.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stripe Checkout (hosted) | Stripe Elements (embedded) | Elements gives more UI control but requires PCI compliance handling; Checkout is faster to implement and Stripe-hosted |
| DB-based polling | Stripe API polling | Stripe rate limits; DB is faster and free |
| `request.text()` for raw body | Buffer-reading helper | Both work; `request.text()` is simpler and works natively in Astro's Request API |

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── db/
│   ├── index.ts           # Drizzle client singleton
│   └── schema.ts          # subscriptions + stripe_events tables
├── lib/
│   └── stripe.ts          # Stripe client singleton (import.meta.env.STRIPE_SECRET_KEY)
├── pages/
│   ├── api/
│   │   ├── checkout/
│   │   │   └── create.ts  # POST: create Stripe Checkout session
│   │   ├── portal/
│   │   │   └── create.ts  # POST: create Stripe Customer Portal session
│   │   ├── webhooks/
│   │   │   └── stripe.ts  # POST: Stripe webhook handler (EXCLUDED from Clerk auth)
│   │   └── subscription/
│   │       └── status.ts  # GET: current user's tier (used for polling)
│   ├── pricing.astro       # Public /pricing page (SEO, no auth required)
│   └── dashboard/
│       └── index.astro    # Extended to read tier and show upgrade CTA / payment failure banner
└── components/
    ├── billing/
    │   ├── UpgradeCTAPanel.astro       # Bottom-of-sidebar persistent upgrade panel
    │   ├── TierBadge.tsx               # Colored pill badge (React, client:only="react")
    │   ├── SubscriptionPolling.tsx     # Polls /api/subscription/status after checkout redirect
    │   └── PaymentFailureBanner.astro  # Warning banner shown on past_due subscriptions
    └── pricing/
        └── PricingCard.astro           # 3-column pricing cards with monthly/annual toggle
```

### Pattern 1: Webhook Handler (Source of Truth)

**What:** Raw POST endpoint that verifies Stripe signature, deduplicates by event ID, then upserts subscription state into DB.

**When to use:** Every subscription lifecycle change. This is the ONLY place subscription state is written.

```typescript
// Source: https://docs.stripe.com/webhooks + https://mihai-andrei.com/blog/how-to-add-stripe-to-astro/
// src/pages/api/webhooks/stripe.ts
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const sig = request.headers.get('stripe-signature');
  if (!sig) return new Response('Missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    // request.text() returns raw body — required for signature verification
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      import.meta.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Return 200 IMMEDIATELY before any async logic (Stripe has timeout limits)
  // Process synchronously — Turso writes are fast enough
  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Still return 200 to prevent Stripe retries for non-transient errors
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
```

### Pattern 2: Deduplication with stripe_events Table

**What:** Before processing any event, check if its ID exists in `stripe_events`. Insert first (unique constraint) — if INSERT fails, event was already processed.

**When to use:** Inside `handleStripeEvent()` as the first step.

```typescript
// Deduplication check — Stripe retries events for up to 3 days
async function handleStripeEvent(event: Stripe.Event) {
  try {
    await db.insert(stripeEvents).values({ eventId: event.id }).run();
  } catch {
    // Unique constraint violation = already processed
    console.log(`Duplicate event ${event.id} — skipping`);
    return;
  }
  // Now safe to process
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(event.data.object as Stripe.Subscription);
      break;
  }
}
```

### Pattern 3: Checkout Session Creation

**What:** Authenticated POST endpoint that creates a Stripe Checkout session for a given price ID.

**When to use:** When free/lower-tier user clicks "Upgrade" in dashboard sidebar.

```typescript
// Source: https://docs.stripe.com/payments/checkout/build-subscriptions
// src/pages/api/checkout/create.ts
export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { priceId } = await request.json();

  // Look up or create Stripe customer for this Clerk user
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId)
  });

  let customerId = subscription?.stripeCustomerId;
  if (!customerId) {
    // Get user email from Clerk to attach to Stripe customer
    const user = await clerkClient.users.getUser(userId);
    const customer = await stripe.customers.create({
      email: user.emailAddresses[0].emailAddress,
      metadata: { clerkUserId: userId }
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${import.meta.env.PUBLIC_BASE_URL}/dashboard?upgraded=true`,
    cancel_url: `${import.meta.env.PUBLIC_BASE_URL}/pricing`,
    metadata: { clerkUserId: userId },
    subscription_data: {
      metadata: { clerkUserId: userId }
    }
  });

  return new Response(JSON.stringify({ url: session.url }), { status: 200 });
};
```

### Pattern 4: Customer Portal Session

**What:** Authenticated POST endpoint that creates a portal session for existing subscribers.

```typescript
// Source: https://docs.stripe.com/customer-management/integrate-customer-portal
// src/pages/api/portal/create.ts
export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId)
  });

  if (!subscription?.stripeCustomerId) {
    return new Response('No subscription found', { status: 404 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${import.meta.env.PUBLIC_BASE_URL}/dashboard`,
  });

  return new Response(JSON.stringify({ url: portalSession.url }), { status: 200 });
};
```

### Pattern 5: Post-Checkout Polling

**What:** React component that polls `/api/subscription/status` after redirect from Stripe. Detects `?upgraded=true` in URL, polls for up to 5s, shows "Activating your plan…" then success toast.

**When to use:** `SubscriptionPolling.tsx` rendered `client:only="react"` on dashboard page.

```typescript
// src/components/billing/SubscriptionPolling.tsx
export default function SubscriptionPolling() {
  const [status, setStatus] = useState<'idle' | 'polling' | 'done'>('idle');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('upgraded')) return;

    setStatus('polling');
    let attempts = 0;
    const MAX_ATTEMPTS = 10; // 500ms * 10 = 5s

    const interval = setInterval(async () => {
      attempts++;
      const res = await fetch('/api/subscription/status');
      const { tier } = await res.json();

      if (tier !== 'free' || attempts >= MAX_ATTEMPTS) {
        clearInterval(interval);
        setStatus('done');
        // Remove ?upgraded from URL without reload
        window.history.replaceState({}, '', '/dashboard');
        if (tier !== 'free') {
          showToast(`Welcome to ${capitalize(tier)}! Your plan is now active.`);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  if (status === 'polling') {
    return <div className="...">Activating your plan…</div>;
  }
  return null;
}
```

### Database Schema

```typescript
// Source: https://orm.drizzle.team/docs/connect-turso + Stripe webhook patterns
// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().unique(),         // Clerk userId
  stripeCustomerId: text('stripe_customer_id'),        // cus_xxx
  stripeSubscriptionId: text('stripe_subscription_id'), // sub_xxx
  stripePriceId: text('stripe_price_id'),              // price_xxx (determines tier)
  tier: text('tier').notNull().default('free'),        // 'free' | 'starter' | 'pro'
  status: text('status').notNull().default('inactive'), // Stripe subscription status
  currentPeriodEnd: integer('current_period_end'),     // Unix timestamp
  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
});

export const stripeEvents = sqliteTable('stripe_events', {
  eventId: text('event_id').primaryKey(),            // evt_xxx — unique constraint prevents double processing
  processedAt: integer('processed_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
});
```

### Drizzle Client Setup

```typescript
// Source: https://orm.drizzle.team/docs/connect-turso
// src/db/index.ts
import { drizzle } from 'drizzle-orm/libsql/web';  // Use /web for Astro, NOT default /libsql
import * as schema from './schema';

export const db = drizzle({
  connection: {
    url: import.meta.env.TURSO_DATABASE_URL,
    authToken: import.meta.env.TURSO_AUTH_TOKEN,
  },
  schema,
});
```

### Tier Resolution from Price ID

Map Stripe price IDs to tiers at the application layer (not in Stripe metadata):

```typescript
// src/lib/billing.ts
const PRICE_TIER_MAP: Record<string, 'starter' | 'pro'> = {
  [import.meta.env.STRIPE_PRICE_STARTER_MONTHLY]: 'starter',
  [import.meta.env.STRIPE_PRICE_STARTER_ANNUAL]:  'starter',
  [import.meta.env.STRIPE_PRICE_PRO_MONTHLY]:     'pro',
  [import.meta.env.STRIPE_PRICE_PRO_ANNUAL]:      'pro',
};

export function tierFromPriceId(priceId: string): 'free' | 'starter' | 'pro' {
  return PRICE_TIER_MAP[priceId] ?? 'free';
}
```

### Anti-Patterns to Avoid

- **Determining tier from redirect URL:** The `?upgraded=true` param is only for triggering polling UI. Never trust it for access control.
- **Calling Stripe API on every page load:** Read subscription state from local DB, not Stripe.
- **Processing webhook before returning 200:** Return 200 first to prevent timeout-triggered retries (Stripe timeout is 30s).
- **Using `drizzle-orm/libsql` instead of `/web`:** Default import uses Node.js native bindings that may fail in Vercel's serverless runtime. Use `/web` variant.
- **Skipping webhook endpoint from middleware exclusion:** Stripe POSTs are unauthenticated; Clerk middleware will reject them with 401 unless excluded.
- **Creating a new Stripe customer on every checkout:** Check for existing `stripe_customer_id` in DB first to avoid duplicate customer records.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Subscription lifecycle state machine | Custom status tracking logic | Stripe subscription `status` field + webhook events | Stripe handles 12+ states (incomplete, trialing, active, past_due, canceled, unpaid, paused) with correct transitions |
| Payment retry / dunning | Email reminders, retry logic | Stripe Smart Retries + built-in dunning emails | Stripe retries intelligently (4 attempts over ~2 weeks) based on card network signals |
| Webhook signature verification | HMAC comparison code | `stripe.webhooks.constructEvent()` | Timing-safe comparison, handles tolerance window (300s), base64 parsing |
| Proration on plan changes | Calculate prorated amounts | Stripe Customer Portal | Portal handles upgrade/downgrade proration automatically |
| Event deduplication logic | TTL cache or complex state | `stripe_events` table with PRIMARY KEY on event_id | SQLite unique constraint is atomic; no race condition possible |

**Key insight:** The Stripe SDK + Customer Portal handle the genuinely hard parts (state machines, proration, retries, PCI compliance). The app's job is: store tier in DB, read tier from DB, show appropriate UI.

---

## Common Pitfalls

### Pitfall 1: Raw Body Mangled Before Webhook Verification

**What goes wrong:** Middleware or JSON parsing reads the body before the webhook handler, causing `stripe.webhooks.constructEvent()` to throw "No signatures found matching the expected signature."
**Why it happens:** In Express/Next.js, `express.json()` or `bodyParser` consumes the stream. In Astro, this is less likely but possible if a middleware parses the body.
**How to avoid:** Use `await request.text()` as the FIRST operation in the webhook endpoint before any other body reading. Ensure Clerk middleware does not parse the body of `/api/webhooks/stripe`.
**Warning signs:** Webhook signature errors in logs, 400 responses to Stripe.

### Pitfall 2: Webhook Endpoint Not Excluded from Clerk Auth

**What goes wrong:** Clerk middleware redirects Stripe's unauthenticated POST to `/login`, returning 302. Stripe sees this as a failure and retries.
**Why it happens:** The existing middleware in `src/middleware.ts` uses `createRouteMatcher(['/dashboard(.*)'])` for protected routes. API routes under `/api/` are NOT currently protected — but explicit exclusion is safer and documents intent.
**How to avoid:** Verify `/api/webhooks/stripe` is not matched by any auth protection. Add explicit exclusion if needed.
**Warning signs:** Stripe webhook dashboard shows repeated failures with "Redirect" or 302 status.

### Pitfall 3: Customer Portal "Not Configured" Error

**What goes wrong:** `stripe.billingPortal.sessions.create()` throws "You can't create a portal session in test mode until you save your customer portal settings."
**Why it happens:** Stripe Customer Portal requires portal configuration to be saved in the Stripe Dashboard before any session can be created — even in test mode.
**How to avoid:** Before Phase 8 implementation, open Stripe Dashboard → Billing → Customer Portal → Configure and Save. Must be done in BOTH test and live environments.
**Warning signs:** 400 error from Stripe when clicking "Manage subscription" in the dashboard.

### Pitfall 4: Webhook Events Arriving Out of Order

**What goes wrong:** `customer.subscription.updated` arrives before `checkout.session.completed`, leaving subscription in inconsistent state.
**Why it happens:** Stripe does not guarantee event ordering. Network delays, retries, and parallel event delivery all affect ordering.
**How to avoid:** Each event handler must be an independent upsert — never assume prior state. Use `customer.subscription.updated` to fully re-sync tier/status from the subscription object, regardless of what's currently in DB.
**Warning signs:** Users show "free" tier despite paying, or "pro" tier after cancellation.

### Pitfall 5: Missing Price IDs in Environment at Deploy Time

**What goes wrong:** Checkout session creation fails because `STRIPE_PRICE_PRO_MONTHLY` env var is empty/undefined.
**Why it happens:** Stripe price IDs must be created in Stripe Dashboard before coding starts, then added to Vercel env vars and local `.env`.
**How to avoid:** Create all 4 Stripe products/prices BEFORE writing any code. Note: this is a known blocker in STATE.md.
**Warning signs:** `line_items[0].price` validation error from Stripe API.

### Pitfall 6: Duplicate Stripe Customers

**What goes wrong:** Multiple `cus_xxx` records for the same user in Stripe, causing webhook events to not match the stored `stripeCustomerId`.
**Why it happens:** Checkout session creation creates a new Stripe customer each time if the existing customer ID isn't passed.
**How to avoid:** Always check `subscriptions.stripeCustomerId` in DB before creating a new Stripe customer. If found, pass `customer: existingCustomerId` to `stripe.checkout.sessions.create()`.
**Warning signs:** Multiple customers with same email in Stripe Dashboard.

---

## Code Examples

### Resolving Tier from checkout.session.completed

```typescript
// Source: https://docs.stripe.com/billing/subscriptions/webhooks
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription') return;

  // Retrieve full subscription to get price ID
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const priceId = subscription.items.data[0].price.id;
  const tier = tierFromPriceId(priceId);
  const userId = session.metadata?.clerkUserId;

  if (!userId) {
    console.error('No clerkUserId in checkout session metadata');
    return;
  }

  await db.insert(subscriptions).values({
    userId,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    tier,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  }).onConflictDoUpdate({
    target: subscriptions.userId,
    set: {
      stripeCustomerId: sql`excluded.stripe_customer_id`,
      stripeSubscriptionId: sql`excluded.stripe_subscription_id`,
      stripePriceId: sql`excluded.stripe_price_id`,
      tier: sql`excluded.tier`,
      status: sql`excluded.status`,
      currentPeriodEnd: sql`excluded.current_period_end`,
      cancelAtPeriodEnd: sql`excluded.cancel_at_period_end`,
      updatedAt: Math.floor(Date.now() / 1000),
    }
  });
}
```

### Subscription Status API Endpoint (for polling)

```typescript
// src/pages/api/subscription/status.ts
export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId)
  });

  const tier = sub?.tier ?? 'free';
  const status = sub?.status ?? 'inactive';
  const paymentFailed = status === 'past_due';

  return new Response(JSON.stringify({ tier, status, paymentFailed }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Middleware: Exclude Webhook from Auth

```typescript
// src/middleware.ts — updated
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);
const isWebhookRoute = createRouteMatcher(['/api/webhooks/(.*)']);

export const onRequest = clerkMiddleware((auth, context) => {
  // Webhooks must be excluded — Stripe sends unauthenticated POST
  if (isWebhookRoute(context.request)) return;

  const { userId } = auth();
  if (!userId && isProtectedRoute(context.request)) {
    return context.redirect('/login');
  }
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manually verify HMAC with crypto | `stripe.webhooks.constructEvent()` | stripe-node v6+ | Handles timing-safe comparison, 5-minute tolerance window |
| Client-side Stripe.js for subscriptions | Stripe Checkout (hosted page) | ~2019 | No PCI scope; Stripe hosts payment form |
| Polling Stripe API for status | Webhook → DB → read from DB | Standard pattern | Avoids rate limits; faster for users |
| Node-specific Buffer for raw body | `request.text()` in Web API environments | Fetch API standardization | Works natively in Astro, Edge Functions, Deno |
| Stripe API version pinning in code | stripe-node pins API version at install | stripe-node v12+ | SDK types always match pinned API version |

**Deprecated/outdated:**
- `stripe.charges.*` for subscriptions: Use `stripe.subscriptions.*` and `stripe.checkout.sessions.*` instead
- `invoice.payment_succeeded`: Replaced by `invoice.paid` — use the latter

---

## Stripe Configuration Checklist (Pre-Code Prerequisites)

These must be done in Stripe Dashboard BEFORE any code is written:

1. **Create 4 products + prices:**
   - Starter Monthly ($3.99/mo recurring)
   - Starter Annual ($39/yr recurring)
   - Pro Monthly ($7.99/mo recurring)
   - Pro Annual ($79/yr recurring)
   - Record price IDs (format: `price_xxx`) — add to `.env` and Vercel env vars

2. **Configure Customer Portal:**
   - Stripe Dashboard → Billing → Customer Portal → Configure
   - Enable: cancel subscription, update payment method, view billing history
   - Enable upgrade/downgrade between Starter and Pro plans
   - Set return URL default to `https://qr-code-generator-app.com/dashboard`
   - Must save in BOTH test mode and live mode

3. **Create Webhook Endpoint:**
   - Stripe Dashboard → Developers → Webhooks → Add endpoint
   - URL: `https://qr-code-generator-app.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.trial_will_end`
   - Record webhook signing secret (format: `whsec_xxx`) — add to env vars

4. **Local dev webhook forwarding:**
   ```bash
   stripe listen --forward-to localhost:4321/api/webhooks/stripe
   # This outputs a temporary whsec_xxx for local testing
   ```

---

## Environment Variables Required

```
# Stripe
STRIPE_SECRET_KEY=sk_test_xxx          # or sk_live_xxx in production
STRIPE_WEBHOOK_SECRET=whsec_xxx        # From webhook endpoint config
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_STARTER_ANNUAL=price_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_ANNUAL=price_xxx

# Turso (may already exist from Phase 7)
TURSO_DATABASE_URL=libsql://xxx.turso.io
TURSO_AUTH_TOKEN=xxx

# App
PUBLIC_BASE_URL=https://qr-code-generator-app.com  # (http://localhost:4321 in dev)
```

---

## Open Questions

1. **Are drizzle-orm and @libsql/client already installed?**
   - What we know: Phase 7 (SSR Foundation + Auth) is complete but the DB directory doesn't exist yet (`src/db/` not found in filesystem check)
   - What's unclear: Whether the packages are in package.json or only planned
   - Recommendation: Wave 0 task installs `drizzle-orm @libsql/client` if not present and creates `src/db/`

2. **Stripe product/price IDs: are they created yet?**
   - What we know: STATE.md flags this as a known blocker: "Stripe product + price ID (monthly/annual) must be created in Stripe dashboard before Phase 8 starts — business input required"
   - What's unclear: Whether the user has already created these
   - Recommendation: Planner should make Wave 0 include a manual step (not a code task) to verify price IDs exist before proceeding

3. **Clerk client-side access in API routes**
   - What we know: `locals.auth()` works for SSR pages; `clerkClient.users.getUser(userId)` requires `@clerk/astro` server import
   - What's unclear: Exact import path for `clerkClient` in API endpoints (may be `import { clerkClient } from '@clerk/astro/server'`)
   - Recommendation: Verify during Wave 1 implementation; fall back to storing user email at signup if clerkClient access is complex

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright ^1.58.2 |
| Config file | `playwright.config.ts` (root) |
| Quick run command | `npx playwright test tests/billing/ --grep @smoke` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BILL-01 | `/pricing` page loads and "Upgrade" button exists | smoke | `npx playwright test tests/billing/pricing.spec.ts --grep @smoke` | ❌ Wave 0 |
| BILL-01 | Checkout session API returns redirect URL for authenticated user | smoke | `npx playwright test tests/billing/checkout.spec.ts --grep @smoke` | ❌ Wave 0 |
| BILL-02 | Annual plan price ID produces different checkout URL than monthly | unit/fixme | `test.fixme` — requires Stripe test keys | ❌ Wave 0 |
| BILL-03 | "Manage subscription" link visible for paid users in sidebar | smoke | `npx playwright test tests/billing/dashboard-billing.spec.ts --grep @smoke` | ❌ Wave 0 |
| BILL-04 | Dashboard shows "Activating your plan…" with `?upgraded=true` param | smoke | `npx playwright test tests/billing/polling.spec.ts --grep @smoke` | ❌ Wave 0 |
| BILL-05 | Webhook endpoint returns 400 on missing signature | smoke | `npx playwright test tests/billing/webhook.spec.ts --grep @smoke` | ❌ Wave 0 |
| BILL-05 | Webhook endpoint returns 200 for valid Stripe-signed payload | fixme | `test.fixme` — requires Stripe CLI in test | ❌ Wave 0 |

Note: Full E2E billing flow (complete checkout in Stripe test mode) is manual-only without a Stripe test account configured in CI. Use `test.fixme` for payment flow tests per project convention.

### Sampling Rate
- **Per task commit:** `npx playwright test tests/billing/ --grep @smoke`
- **Per wave merge:** `npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/billing/pricing.spec.ts` — covers BILL-01 (pricing page loads)
- [ ] `tests/billing/checkout.spec.ts` — covers BILL-01 (checkout API smoke)
- [ ] `tests/billing/dashboard-billing.spec.ts` — covers BILL-03 (manage subscription link)
- [ ] `tests/billing/polling.spec.ts` — covers BILL-04 (post-checkout polling UI)
- [ ] `tests/billing/webhook.spec.ts` — covers BILL-05 (webhook 400 on bad sig)
- [ ] `src/db/` directory with `schema.ts` and `index.ts`
- [ ] Package install: `npm install stripe@^20.4.1` (and drizzle-orm + @libsql/client if not present)
- [ ] Stripe Dashboard configuration (products, portal settings, webhook endpoint) — manual, not code

---

## Sources

### Primary (HIGH confidence)
- [Stripe Webhooks Documentation](https://docs.stripe.com/webhooks) — constructEvent, raw body requirement, retry behavior
- [Stripe Billing Webhooks](https://docs.stripe.com/billing/subscriptions/webhooks) — subscription lifecycle events, event types
- [Stripe Subscriptions Build Guide](https://docs.stripe.com/billing/subscriptions/build-subscriptions) — checkout session params, customer.subscription.* events
- [Stripe Customer Portal Integration](https://docs.stripe.com/customer-management/integrate-customer-portal) — portal session creation, must-save-settings requirement
- [Drizzle ORM Turso Connect](https://orm.drizzle.team/docs/connect-turso) — `/web` import path for Astro, client creation

### Secondary (MEDIUM confidence)
- [Stripe + Astro Integration Guide](https://mihai-andrei.com/blog/how-to-add-stripe-to-astro/) — `request.text()` pattern for raw body, endpoint structure
- [Astro Stripe Webhooks Tutorial (DEV.to)](https://dev.to/reeshee/automating-access-to-a-github-repo-using-stripe-webhooks-and-astro-endpoints-18lm) — confirmed `request.text()` approach, Uint8Array alternative
- [Stripe Webhook Deduplication (Duncan Mackenzie)](https://www.duncanmackenzie.net/blog/handling-duplicate-stripe-events/) — event ID dedup pattern
- [How to Implement Webhook Idempotency (Hookdeck)](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency) — DB-based dedup with unique constraint

### Tertiary (LOW confidence)
- Web search results for Stripe + Clerk userId mapping — general pattern confirmed but no official combined guide

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm info confirmed stripe@20.4.1; Drizzle docs verified import paths
- Architecture: HIGH — patterns verified against official Stripe docs and confirmed Astro examples
- Pitfalls: HIGH — confirmed against official Stripe docs (portal config requirement, raw body requirement, event ordering)
- Validation: MEDIUM — test structure follows established project pattern (test.fixme convention)

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (Stripe API is stable; `stripe-node` major versions align with API changes)
