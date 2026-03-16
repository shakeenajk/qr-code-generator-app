export const prerender = false;

import type { APIRoute } from 'astro';
import type { Stripe } from 'stripe';
import { db } from '../../../db/index';
import { subscriptions, stripeEvents } from '../../../db/schema';
import { stripe } from '../../../lib/stripe';
import { tierFromPriceId } from '../../../lib/billing';
import { eq, sql } from 'drizzle-orm';

export const POST: APIRoute = async ({ request }) => {
  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing signature', { status: 400 });
  }

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
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Still return 200 to prevent Stripe retries for non-transient errors
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

async function handleStripeEvent(event: Stripe.Event) {
  // Deduplication — Stripe retries events for up to 3 days
  try {
    await db.insert(stripeEvents).values({ eventId: event.id }).run();
  } catch {
    // Unique constraint violation = already processed
    console.log(`Duplicate event ${event.id} — skipping`);
    return;
  }

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
    default:
      // Unknown event types silently ignored
      break;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription') return;

  const userId = session.metadata?.clerkUserId;
  if (!userId) {
    console.error('No clerkUserId in checkout session metadata');
    return;
  }

  // Retrieve full subscription to get price ID
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const item = subscription.items.data[0];
  const priceId = item.price.id;
  const tier = tierFromPriceId(priceId);
  // current_period_end moved to SubscriptionItem in Stripe API 2026-02-25
  const currentPeriodEnd = item.current_period_end;

  await db.insert(subscriptions).values({
    userId,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    tier,
    status: subscription.status,
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
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
    },
  });
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  const priceId = item.price.id;
  const tier = tierFromPriceId(priceId);
  // current_period_end moved to SubscriptionItem in Stripe API 2026-02-25
  const currentPeriodEnd = item.current_period_end;

  await db.insert(subscriptions).values({
    userId: sub.metadata?.clerkUserId ?? '',
    stripeCustomerId: sub.customer as string,
    stripeSubscriptionId: sub.id,
    stripePriceId: priceId,
    tier,
    status: sub.status,
    currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  }).onConflictDoUpdate({
    target: subscriptions.stripeSubscriptionId,
    set: {
      stripePriceId: sql`excluded.stripe_price_id`,
      tier: sql`excluded.tier`,
      status: sql`excluded.status`,
      currentPeriodEnd: sql`excluded.current_period_end`,
      cancelAtPeriodEnd: sql`excluded.cancel_at_period_end`,
      updatedAt: Math.floor(Date.now() / 1000),
    },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  await db
    .update(subscriptions)
    .set({
      tier: 'free',
      status: 'canceled',
      cancelAtPeriodEnd: false,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(subscriptions.stripeSubscriptionId, sub.id));
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  await db
    .update(subscriptions)
    .set({
      status: 'active',
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  await db
    .update(subscriptions)
    .set({
      status: 'past_due',
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(subscriptions.stripeCustomerId, customerId));
}

async function handleTrialWillEnd(_sub: Stripe.Subscription) {
  // Log only — no DB change needed at trial_will_end stage
  console.log(`Trial ending soon for subscription ${_sub.id}`);
}
