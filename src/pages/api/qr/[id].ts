export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { savedQrCodes } from '../../../db/schema';
import { and, eq } from 'drizzle-orm';

export const PUT: APIRoute = async ({ locals, request, params }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { name, styleData, logoData, thumbnailData } = body as {
    name?: string;
    styleData?: string;
    logoData?: string | null;
    thumbnailData?: string | null;
  };

  const updates: Partial<{
    name: string;
    styleData: string;
    logoData: string | null;
    thumbnailData: string | null;
    updatedAt: number;
  }> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };

  if (name !== undefined) updates.name = name;
  if (styleData !== undefined) updates.styleData = styleData;
  if (logoData !== undefined) updates.logoData = logoData;
  if (thumbnailData !== undefined) updates.thumbnailData = thumbnailData;

  // Ownership enforced in WHERE — never filter by id alone (IDOR prevention)
  const result = await db
    .update(savedQrCodes)
    .set(updates)
    .where(and(eq(savedQrCodes.id, id), eq(savedQrCodes.userId, userId)));

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

export const DELETE: APIRoute = async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Ownership enforced in WHERE — never filter by id alone (IDOR prevention)
  const result = await db
    .delete(savedQrCodes)
    .where(and(eq(savedQrCodes.id, id), eq(savedQrCodes.userId, userId)));

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
