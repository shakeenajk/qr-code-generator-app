export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { savedQrCodes, dynamicQrCodes } from '../../../db/schema';
import { and, eq } from 'drizzle-orm';

function tryParse(value: string): unknown {
  try { return JSON.parse(value); } catch { return {}; }
}

function toJsonString(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

export const GET: APIRoute = async ({ locals, params }) => {
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

  const [row] = await db
    .select()
    .from(savedQrCodes)
    .where(and(eq(savedQrCodes.id, id), eq(savedQrCodes.userId, userId)))
    .limit(1);

  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      id: row.id,
      name: row.name,
      contentType: row.contentType,
      contentData: typeof row.contentData === 'string' ? tryParse(row.contentData) : row.contentData,
      styleData: typeof row.styleData === 'string' ? tryParse(row.styleData) : row.styleData,
      logoData: row.logoData ?? null,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

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

  const { name, contentType, contentData, styleData, logoData, thumbnailData } = body as {
    name?: string;
    contentType?: string;
    contentData?: unknown;
    styleData?: unknown;
    logoData?: string | null;
    thumbnailData?: string | null;
  };

  const updates: Partial<{
    name: string;
    contentType: string;
    contentData: string;
    styleData: string;
    logoData: string | null;
    thumbnailData: string | null;
    updatedAt: number;
  }> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };

  if (name !== undefined) updates.name = name;
  if (contentType !== undefined) updates.contentType = contentType;
  if (contentData !== undefined) updates.contentData = toJsonString(contentData);
  if (styleData !== undefined) updates.styleData = toJsonString(styleData);
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

export const PATCH: APIRoute = async ({ locals, request, params }) => {
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

  const { destinationUrl, isPaused } = body as {
    destinationUrl?: string;
    isPaused?: boolean;
  };

  // Verify the dynamic QR row exists and belongs to this user (IDOR prevention)
  const [existing] = await db
    .select({ id: dynamicQrCodes.id })
    .from(dynamicQrCodes)
    .where(and(eq(dynamicQrCodes.savedQrCodeId, id), eq(dynamicQrCodes.userId, userId)))
    .limit(1);

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updates: Partial<{
    destinationUrl: string;
    isPaused: boolean;
    updatedAt: number;
  }> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };

  if (destinationUrl !== undefined) {
    if (typeof destinationUrl !== 'string' || destinationUrl.trim() === '') {
      return new Response(JSON.stringify({ error: 'destinationUrl must be a non-empty string' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    updates.destinationUrl = destinationUrl.trim();
  }

  if (isPaused !== undefined) {
    updates.isPaused = isPaused;
  }

  await db
    .update(dynamicQrCodes)
    .set(updates)
    .where(and(eq(dynamicQrCodes.savedQrCodeId, id), eq(dynamicQrCodes.userId, userId)));

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

  // Explicitly delete dynamicQrCodes first — safety belt in case FK cascade is not enforced
  // by Turso's HTTP mode. Harmless if cascade works, essential if it doesn't.
  await db
    .delete(dynamicQrCodes)
    .where(and(eq(dynamicQrCodes.savedQrCodeId, id), eq(dynamicQrCodes.userId, userId)));

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
