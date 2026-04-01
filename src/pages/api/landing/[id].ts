export const prerender = false;

import type { APIRoute } from 'astro';
import { del } from '@vercel/blob';
import { db } from '../../../db/index';
import { savedQrCodes, landingPages } from '../../../db/schema';
import { and, eq } from 'drizzle-orm';

// File URL fields that may have associated Blob storage objects
const FILE_URL_FIELDS = ['coverImageUrl', 'pdfUrl', 'appIconUrl', 'screenshotUrl'] as const;
type FileUrlField = typeof FILE_URL_FIELDS[number];

// Map from camelCase field to DB column name (for updates)
const FIELD_TO_COLUMN: Record<string, string> = {
  coverImageUrl: 'cover_image_url',
  pdfUrl: 'pdf_url',
  appIconUrl: 'app_icon_url',
  screenshotUrl: 'screenshot_url',
};

export const GET: APIRoute = async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const [row] = await db
    .select()
    .from(landingPages)
    .where(and(eq(landingPages.id, id), eq(landingPages.userId, userId)))
    .limit(1);

  if (!row) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(row), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ locals, request, params }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

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

  // Fetch current row for IDOR check and Blob URL comparison
  const [current] = await db
    .select()
    .from(landingPages)
    .where(and(eq(landingPages.id, id), eq(landingPages.userId, userId)))
    .limit(1);

  if (!current) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Collect old Blob URLs to delete: only when a file URL field IS present in the body
  // AND the incoming value differs from the stored value AND the old value is non-null.
  // Absent file URL fields are left unchanged (partial-update contract).
  const blobUrlsToDelete: string[] = [];

  for (const field of FILE_URL_FIELDS) {
    if (field in body) {
      const incoming = body[field] as string | null | undefined;
      const stored = current[field] as string | null;
      if (stored && incoming !== stored) {
        blobUrlsToDelete.push(stored);
      }
    }
  }

  // Build the update object — only include fields that are present in the request body
  const updates: Record<string, unknown> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };

  const allowedFields = [
    'type', 'title', 'description', 'companyName', 'websiteUrl', 'ctaButtonText',
    'coverImageUrl', 'pdfUrl', 'appStoreUrl', 'googlePlayUrl', 'appIconUrl',
    'screenshotUrl', 'socialLinks', 'isPaused',
  ];

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field] ?? null;
    }
  }

  await db
    .update(landingPages)
    .set(updates as Parameters<ReturnType<typeof db.update>['set']>[0])
    .where(and(eq(landingPages.id, id), eq(landingPages.userId, userId)));

  // Delete replaced Blob files after successful DB update
  for (const url of blobUrlsToDelete) {
    try {
      await del(url);
    } catch {
      // Non-fatal — DB already updated; log but don't fail the request
      console.error(`Failed to delete Blob file: ${url}`);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch current row for IDOR check and Blob URL collection
  const [current] = await db
    .select()
    .from(landingPages)
    .where(and(eq(landingPages.id, id), eq(landingPages.userId, userId)))
    .limit(1);

  if (!current) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Collect all non-null Blob file URLs before deleting the row
  const blobUrlsToDelete: string[] = [];
  for (const field of FILE_URL_FIELDS) {
    const url = current[field] as string | null;
    if (url) blobUrlsToDelete.push(url);
  }

  // Delete the landingPages row (FK cascade deletes dynamicQrCodes linked via savedQrCodes)
  await db
    .delete(landingPages)
    .where(and(eq(landingPages.id, id), eq(landingPages.userId, userId)));

  // Delete the savedQrCodes row (cascades to dynamicQrCodes via FK)
  if (current.savedQrCodeId) {
    await db
      .delete(savedQrCodes)
      .where(and(eq(savedQrCodes.id, current.savedQrCodeId), eq(savedQrCodes.userId, userId)));
  }

  // Delete all Blob files associated with this landing page
  for (const url of blobUrlsToDelete) {
    try {
      await del(url);
    } catch {
      // Non-fatal — DB already cleaned up; log but don't fail the request
      console.error(`Failed to delete Blob file: ${url}`);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
