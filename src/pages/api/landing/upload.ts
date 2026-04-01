export const prerender = false;

import type { APIRoute } from 'astro';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { db } from '../../../db/index';
import { subscriptions } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { TIER_LIMITS, type TierKey } from '../../../lib/tierLimits';

export const POST: APIRoute = async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  // Determine file size limit based on tier
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  const tier = (sub?.tier ?? 'free') as TierKey;
  const maxBytes = tier === 'pro' ? 26_214_400 : 10_485_760; // 25MB Pro, 10MB Free/Starter

  const body = await request.json() as HandleUploadBody;
  const jsonResponse = await handleUpload({
    body,
    request: request as unknown as Request,
    onBeforeGenerateToken: async (_pathname) => ({
      allowedContentTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      maximumSizeInBytes: maxBytes,
    }),
    onUploadCompleted: async ({ blob: _blob }) => {
      // No-op — blob URL stored when landing page is created/updated
    },
  });
  return new Response(JSON.stringify(jsonResponse), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
