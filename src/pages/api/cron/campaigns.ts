export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { dynamicQrCodes } from '../../../db/schema';
import { and, eq, isNotNull, lte } from 'drizzle-orm';

export const GET: APIRoute = async ({ request }) => {
  // Validate CRON_SECRET — Bearer token auth
  const authHeader = request.headers.get('Authorization');
  const cronSecret = import.meta.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = Math.floor(Date.now() / 1000);

  // Activate sweep: paused QR codes whose scheduledEnableAt has passed
  // Clears scheduledEnableAt after processing (idempotent — won't re-process)
  const activateResult = await db
    .update(dynamicQrCodes)
    .set({ isPaused: false, scheduledEnableAt: null, updatedAt: now })
    .where(
      and(
        isNotNull(dynamicQrCodes.scheduledEnableAt),
        lte(dynamicQrCodes.scheduledEnableAt, now),
        eq(dynamicQrCodes.isPaused, true),
      )
    );

  // Pause sweep: active QR codes whose scheduledPauseAt has passed
  // Clears scheduledPauseAt after processing (idempotent — won't re-process)
  const pauseResult = await db
    .update(dynamicQrCodes)
    .set({ isPaused: true, scheduledPauseAt: null, updatedAt: now })
    .where(
      and(
        isNotNull(dynamicQrCodes.scheduledPauseAt),
        lte(dynamicQrCodes.scheduledPauseAt, now),
        eq(dynamicQrCodes.isPaused, false),
      )
    );

  return new Response(
    JSON.stringify({
      ok: true,
      activated: activateResult.rowsAffected ?? 0,
      paused: pauseResult.rowsAffected ?? 0,
      sweepAt: now,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
