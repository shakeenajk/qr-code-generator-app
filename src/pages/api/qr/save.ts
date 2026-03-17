export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { subscriptions, savedQrCodes } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Tier check: must be Pro to save QR codes
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  const tier = sub?.tier ?? 'free';

  if (tier !== 'pro') {
    return new Response(JSON.stringify({ error: 'Pro required' }), {
      status: 403,
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
    contentData?: string;
    styleData?: string;
    logoData?: string;
    thumbnailData?: string;
  };

  if (!name || !contentType || !contentData || !styleData) {
    return new Response(JSON.stringify({ error: 'Missing required fields: name, contentType, contentData, styleData' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Belt-and-suspenders server-side Pro gate checks
  if (logoData && tier !== 'pro') {
    return new Response(JSON.stringify({ error: 'Pro required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const parsedStyle = JSON.parse(styleData);
    const dotType = parsedStyle?.dotsOptions?.type ?? parsedStyle?.dotType;
    if ((dotType === 'classy' || dotType === 'classy-rounded') && tier !== 'pro') {
      return new Response(JSON.stringify({ error: 'Pro required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    // If styleData is not valid JSON, that's fine — skip the dot-type check
  }

  const id = crypto.randomUUID();
  await db.insert(savedQrCodes).values({
    id,
    userId,
    name,
    contentType,
    contentData,
    styleData,
    logoData: logoData ?? null,
    thumbnailData: thumbnailData ?? null,
  });

  return new Response(JSON.stringify({ id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
