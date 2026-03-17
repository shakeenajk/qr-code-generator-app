export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { subscriptions } from '../../../db/schema';
import { stripe } from '../../../lib/stripe';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (!subscription?.stripeCustomerId) {
    return new Response(JSON.stringify({ error: 'No active subscription found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // NOTE: stripe.billingPortal.sessions.create() throws
    // "You can't create a portal session in test mode until you save your customer portal settings."
    // if portal is not configured in Stripe Dashboard → Billing → Customer Portal → Configure.
    // This must be saved in BOTH test and live environments before this endpoint can be tested.
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${import.meta.env.PUBLIC_BASE_URL}/dashboard`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Failed to open billing portal:', err);
    return new Response(JSON.stringify({ error: 'Failed to open billing portal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
