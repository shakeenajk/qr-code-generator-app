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

  const rows = await db
    .select({
      id: savedQrCodes.id,
      name: savedQrCodes.name,
      contentType: savedQrCodes.contentType,
      contentData: savedQrCodes.contentData,
      styleData: savedQrCodes.styleData,
      logoData: savedQrCodes.logoData,
      slug: dynamicQrCodes.slug,
      destinationUrl: dynamicQrCodes.destinationUrl,
      isPaused: dynamicQrCodes.isPaused,
      scheduledEnableAt: dynamicQrCodes.scheduledEnableAt,
      scheduledPauseAt: dynamicQrCodes.scheduledPauseAt,
    })
    .from(savedQrCodes)
    .leftJoin(dynamicQrCodes, eq(savedQrCodes.id, dynamicQrCodes.savedQrCodeId))
    .where(and(eq(savedQrCodes.id, id), eq(savedQrCodes.userId, userId)))
    .limit(1);

  const row = rows[0];

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
      // Dynamic QR metadata (null for static QRs)
      isDynamic: row.slug !== null,
      slug: row.slug ?? null,
      destinationUrl: row.destinationUrl ?? null,
      isPaused: row.isPaused ?? null,
      scheduledEnableAt: row.scheduledEnableAt ?? null,
      scheduledPauseAt: row.scheduledPauseAt ?? null,
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

  const { destinationUrl, isPaused, scheduledEnableAt, scheduledPauseAt } = body as {
    destinationUrl?: string;
    isPaused?: boolean;
    scheduledEnableAt?: number | null;
    scheduledPauseAt?: number | null;
  };

  // Verify the dynamic QR row exists and belongs to this user (IDOR prevention)
  const [existing] = await db
    .select({
      id: dynamicQrCodes.id,
      scheduledEnableAt: dynamicQrCodes.scheduledEnableAt,
    })
    .from(dynamicQrCodes)
    .where(and(eq(dynamicQrCodes.savedQrCodeId, id), eq(dynamicQrCodes.userId, userId)))
    .limit(1);

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate scheduledEnableAt — must be a future Unix epoch timestamp if provided and not null
  if (scheduledEnableAt !== undefined && scheduledEnableAt !== null) {
    const nowEpoch = Math.floor(Date.now() / 1000);
    if (typeof scheduledEnableAt !== 'number' || scheduledEnableAt <= nowEpoch) {
      return new Response(
        JSON.stringify({ error: 'scheduledEnableAt must be a future Unix epoch timestamp' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Validate scheduledPauseAt — must be after scheduledEnableAt (either in this request or persisted)
  if (scheduledPauseAt !== undefined && scheduledPauseAt !== null) {
    const enableAt = scheduledEnableAt !== undefined ? scheduledEnableAt : existing.scheduledEnableAt;
    if (typeof scheduledPauseAt !== 'number') {
      return new Response(
        JSON.stringify({ error: 'scheduledPauseAt must be a number' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (enableAt !== null && enableAt !== undefined && scheduledPauseAt <= enableAt) {
      return new Response(
        JSON.stringify({ error: 'scheduledPauseAt must be after scheduledEnableAt' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  const updates: Partial<{
    destinationUrl: string;
    isPaused: boolean;
    scheduledEnableAt: number | null;
    scheduledPauseAt: number | null;
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

  // When setting a future scheduledEnableAt, also pause the QR code
  // (it should remain paused until the scheduled activation time)
  if (scheduledEnableAt !== undefined) {
    updates.scheduledEnableAt = scheduledEnableAt;
    if (scheduledEnableAt !== null) {
      updates.isPaused = true;
    }
  }

  if (scheduledPauseAt !== undefined) {
    updates.scheduledPauseAt = scheduledPauseAt;
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
