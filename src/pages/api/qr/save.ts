export const prerender = false;

import type { APIRoute } from 'astro';
import { nanoid } from 'nanoid';
import { db } from '../../../db/index';
import { subscriptions, savedQrCodes, dynamicQrCodes } from '../../../db/schema';
import { count, eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Fetch subscription tier
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  const tier = sub?.tier ?? 'free';

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { name, contentType, contentData, styleData, logoData, thumbnailData, isDynamic, destinationUrl } = body as {
    name?: string;
    contentType?: string;
    contentData?: unknown;
    styleData?: unknown;
    logoData?: string;
    thumbnailData?: string;
    isDynamic?: boolean;
    destinationUrl?: string;
  };

  if (!name || !contentType || !contentData || !styleData) {
    return new Response(JSON.stringify({ error: 'Missing required fields: name, contentType, contentData, styleData' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isDynamic) {
    // Dynamic QR path: free/starter users allowed up to 3 dynamic QRs; pro users unlimited
    if (!destinationUrl || typeof destinationUrl !== 'string' || destinationUrl.trim() === '') {
      return new Response(JSON.stringify({ error: 'destinationUrl required for dynamic QR' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (contentType !== 'url') {
      return new Response(JSON.stringify({ error: 'Dynamic QR only supports URL content type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Tier limit check: free/starter users limited to 3 dynamic QRs
    if (tier !== 'pro') {
      const [{ value: dynamicCount }] = await db
        .select({ value: count() })
        .from(dynamicQrCodes)
        .where(eq(dynamicQrCodes.userId, userId));

      if (dynamicCount >= 3) {
        return new Response(JSON.stringify({ error: 'dynamic_limit_reached' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Slug generation with retry loop (up to 3 attempts)
    let slug: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = nanoid(8);
      const [existing] = await db
        .select({ slug: dynamicQrCodes.slug })
        .from(dynamicQrCodes)
        .where(eq(dynamicQrCodes.slug, candidate))
        .limit(1);
      if (!existing) {
        slug = candidate;
        break;
      }
    }

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug generation failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Insert savedQrCode row
    const id = crypto.randomUUID();
    await db.insert(savedQrCodes).values({
      id,
      userId,
      name,
      contentType,
      contentData: typeof contentData === 'string' ? contentData : JSON.stringify(contentData),
      styleData: typeof styleData === 'string' ? styleData : JSON.stringify(styleData),
      logoData: logoData ?? null,
      thumbnailData: thumbnailData ?? null,
    });

    // Insert dynamicQrCodes row
    await db.insert(dynamicQrCodes).values({
      savedQrCodeId: id,
      userId,
      slug,
      destinationUrl: destinationUrl.trim(),
    });

    return new Response(JSON.stringify({ id, slug }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Static QR path: must be Pro
  if (tier !== 'pro') {
    return new Response(JSON.stringify({ error: 'Pro required' }), {
      status: 403,
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
    const parsedStyle = typeof styleData === 'string' ? JSON.parse(styleData) : styleData;
    const dotType = (parsedStyle as Record<string, unknown>)?.dotType;
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
    contentData: typeof contentData === 'string' ? contentData : JSON.stringify(contentData),
    styleData: typeof styleData === 'string' ? styleData : JSON.stringify(styleData),
    logoData: logoData ?? null,
    thumbnailData: thumbnailData ?? null,
  });

  return new Response(JSON.stringify({ id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
