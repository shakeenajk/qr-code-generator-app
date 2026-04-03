export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../../db/index';
import { apiKeys } from '../../../../db/schema';
import { and, eq } from 'drizzle-orm';

export const DELETE: APIRoute = async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing key ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Soft delete: set revokedAt timestamp.
  // Always scope by userId to prevent IDOR — never trust id alone.
  const result = await db
    .update(apiKeys)
    .set({ revokedAt: Math.floor(Date.now() / 1000) })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));

  if (!result.rowsAffected) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
