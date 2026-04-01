export const prerender = false;

import type { APIRoute } from 'astro';
import { nanoid } from 'nanoid';
import { db } from '../../../db/index';
import { subscriptions, savedQrCodes, dynamicQrCodes, landingPages } from '../../../db/schema';
import { count, eq } from 'drizzle-orm';
import { TIER_LIMITS, type TierKey } from '../../../lib/tierLimits';

export const POST: APIRoute = async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  const tier = (sub?.tier ?? 'free') as TierKey;
  const limits = TIER_LIMITS[tier];

  // Check totalQr limit ONLY — landing pages count as regular QR codes (per D-11)
  const [{ value: totalCount }] = await db
    .select({ value: count() })
    .from(savedQrCodes)
    .where(eq(savedQrCodes.userId, userId));

  if (totalCount >= limits.totalQr) {
    return new Response(JSON.stringify({ error: 'total_limit_reached' }), {
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

  const {
    type, title, description, companyName, websiteUrl, ctaButtonText,
    coverImageUrl, pdfUrl, appStoreUrl, googlePlayUrl, appIconUrl, screenshotUrl,
    socialLinks, name, styleData, logoData, thumbnailData,
  } = body as Record<string, string | undefined>;

  if (!type || !title || !name || !styleData) {
    return new Response(JSON.stringify({ error: 'Missing required fields: type, title, name, styleData' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Generate landing page slug (for /p/[slug])
  let landingSlug: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = nanoid(8);
    const [existing] = await db.select({ slug: landingPages.slug }).from(landingPages).where(eq(landingPages.slug, candidate)).limit(1);
    if (!existing) { landingSlug = candidate; break; }
  }
  if (!landingSlug) return new Response(JSON.stringify({ error: 'Slug generation failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  // Generate dynamic QR slug (for /r/[slug] — scan tracking per D-08 decision)
  let dynamicSlug: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = nanoid(8);
    const [existing] = await db.select({ slug: dynamicQrCodes.slug }).from(dynamicQrCodes).where(eq(dynamicQrCodes.slug, candidate)).limit(1);
    if (!existing) { dynamicSlug = candidate; break; }
  }
  if (!dynamicSlug) return new Response(JSON.stringify({ error: 'Dynamic slug generation failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  // Content data encodes the landing page slug for QR rendering
  const contentData = JSON.stringify({ landingSlug, type });

  // Create three linked rows: savedQrCodes -> dynamicQrCodes + landingPages
  const savedQrId = crypto.randomUUID();
  const dynamicQrId = crypto.randomUUID();
  const landingPageId = crypto.randomUUID();

  // Destination URL for the dynamic redirect — points to the landing page
  const destinationUrl = `/p/${landingSlug}`;

  await db.insert(savedQrCodes).values({
    id: savedQrId,
    userId,
    name: name as string,
    contentType: type as string, // 'pdf' or 'appstore'
    contentData,
    styleData: styleData as string,
    logoData: (logoData as string) ?? null,
    thumbnailData: (thumbnailData as string) ?? null,
  });

  await db.insert(dynamicQrCodes).values({
    id: dynamicQrId,
    savedQrCodeId: savedQrId,
    userId,
    slug: dynamicSlug,
    destinationUrl,
  });

  await db.insert(landingPages).values({
    id: landingPageId,
    userId,
    savedQrCodeId: savedQrId,
    slug: landingSlug,
    type: type as string,
    title: title as string,
    description: (description as string) ?? null,
    companyName: (companyName as string) ?? null,
    websiteUrl: (websiteUrl as string) ?? null,
    ctaButtonText: (ctaButtonText as string) ?? null,
    coverImageUrl: (coverImageUrl as string) ?? null,
    pdfUrl: (pdfUrl as string) ?? null,
    appStoreUrl: (appStoreUrl as string) ?? null,
    googlePlayUrl: (googlePlayUrl as string) ?? null,
    appIconUrl: (appIconUrl as string) ?? null,
    screenshotUrl: (screenshotUrl as string) ?? null,
    socialLinks: socialLinks ? JSON.stringify(socialLinks) : null,
  });

  return new Response(JSON.stringify({
    savedQrCodeId: savedQrId,
    landingPageId,
    landingSlug,
    dynamicSlug,
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
