export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { savedQrCodes, dynamicQrCodes, landingPages } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: APIRoute = async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // LEFT JOIN dynamicQrCodes — slug/destinationUrl/isPaused are null for static QRs
  // logoData intentionally excluded (size concern)
  const rows = await db
    .select({
      id: savedQrCodes.id,
      userId: savedQrCodes.userId,
      name: savedQrCodes.name,
      contentType: savedQrCodes.contentType,
      contentData: savedQrCodes.contentData,
      styleData: savedQrCodes.styleData,
      thumbnailData: savedQrCodes.thumbnailData,
      createdAt: savedQrCodes.createdAt,
      updatedAt: savedQrCodes.updatedAt,
      // Dynamic QR fields (null for static QRs)
      slug: dynamicQrCodes.slug,
      destinationUrl: dynamicQrCodes.destinationUrl,
      isPaused: dynamicQrCodes.isPaused,
      scheduledEnableAt: dynamicQrCodes.scheduledEnableAt,
      scheduledPauseAt: dynamicQrCodes.scheduledPauseAt,
      // Landing page fields (null for QRs without landing pages)
      landingPageId: landingPages.id,
      landingPageSlug: landingPages.slug,
      landingPageTitle: landingPages.title,
      landingPageType: landingPages.type,
    })
    .from(savedQrCodes)
    .leftJoin(dynamicQrCodes, eq(savedQrCodes.id, dynamicQrCodes.savedQrCodeId))
    .leftJoin(landingPages, eq(savedQrCodes.id, landingPages.savedQrCodeId))
    .where(eq(savedQrCodes.userId, userId))
    .orderBy(desc(savedQrCodes.createdAt))
    .limit(50);

  const response = rows.map((row) => ({
    ...row,
    isDynamic: row.slug !== null,
    isLandingPage: row.landingPageId !== null,
  }));

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
