export const prerender = false;

import { randomBytes, createHash } from 'node:crypto';
import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { apiKeys, subscriptions } from '../../../db/schema';
import { eq, and, isNull, count } from 'drizzle-orm';

// Maximum active API keys per user
const MAX_API_KEYS = 10;

export const GET: APIRoute = async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      usageCount: apiKeys.usageCount,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(apiKeys.createdAt);

  return new Response(JSON.stringify(keys), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check Pro tier requirement — API keys are Pro-only
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  const tier = (sub?.status === 'active' || sub?.status === 'past_due') ? sub.tier : 'free';
  if (tier !== 'pro') {
    return new Response(JSON.stringify({ error: 'API keys require a Pro subscription' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check active key count (soft-deleted keys don't count toward the limit)
  const [{ value: activeCount }] = await db
    .select({ value: count() })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));

  if (activeCount >= MAX_API_KEYS) {
    return new Response(JSON.stringify({ error: 'Maximum 10 active API keys per account' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse and validate key name
  let name: string;
  try {
    const body = await request.json();
    name = body?.name?.trim() ?? '';
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!name || name.length < 1 || name.length > 50) {
    return new Response(JSON.stringify({ error: 'Name must be 1–50 characters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Generate raw key — 'qrc_' prefix + 64 hex chars (256 bits of entropy)
  const rawKey = `qrc_${randomBytes(32).toString('hex')}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 12); // "qrc_" + 8 hex chars

  const [inserted] = await db
    .insert(apiKeys)
    .values({ userId, name, keyHash, keyPrefix, usageCount: 0 })
    .returning({ id: apiKeys.id });

  // Return raw key exactly once — it is never stored and never shown again
  return new Response(JSON.stringify({ key: rawKey, keyPrefix, name, id: inserted.id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
