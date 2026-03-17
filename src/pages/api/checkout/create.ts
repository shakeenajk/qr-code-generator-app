export const prerender = false;

import type { APIRoute, APIContext } from 'astro';
import { clerkClient } from '@clerk/astro/server';
import { db } from '../../../db/index';
import { subscriptions } from '../../../db/schema';
import { stripe } from '../../../lib/stripe';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async (context: APIContext) => {
  const { request, locals } = context;
  const { userId } = locals.auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  let priceId: string;
  try {
    const body = await request.json();
    priceId = body.priceId;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!priceId) {
    return new Response(JSON.stringify({ error: 'priceId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Check DB for existing stripeCustomerId — never create duplicate customers
    const existingSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    let customerId = existingSubscription?.stripeCustomerId;

    if (!customerId) {
      // Get user email from Clerk to attach to Stripe customer
      // clerkClient from @clerk/astro/server takes the full APIContext
      const user = await clerkClient(context).users.getUser(userId);
      const customer = await stripe.customers.create({
        email: user.emailAddresses[0]?.emailAddress,
        metadata: { clerkUserId: userId },
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
        metadata: { clerkUserId: userId },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Failed to create checkout session:', err);
    return new Response(JSON.stringify({ error: 'Failed to create checkout session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
