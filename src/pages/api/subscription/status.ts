export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { subscriptions } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  const status = sub?.status ?? 'inactive';
  const tier = status === 'active' || status === 'past_due' ? (sub?.tier ?? 'free') : 'free';
  const paymentFailed = status === 'past_due';

  return new Response(JSON.stringify({ tier, status, paymentFailed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
