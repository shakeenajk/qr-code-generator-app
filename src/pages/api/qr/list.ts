export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { savedQrCodes } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: APIRoute = async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Explicitly select columns — logoData intentionally excluded (size concern)
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
    })
    .from(savedQrCodes)
    .where(eq(savedQrCodes.userId, userId))
    .orderBy(desc(savedQrCodes.createdAt))
    .limit(50);

  return new Response(JSON.stringify(rows), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
