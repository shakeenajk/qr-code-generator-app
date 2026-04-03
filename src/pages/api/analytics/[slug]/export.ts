export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../../db/index';
import { scanEvents, dynamicQrCodes, savedQrCodes, subscriptions } from '../../../../db/schema';
import { and, eq, gte, lte, desc } from 'drizzle-orm';

function escapeField(value: string | null | undefined): string {
  const str = value ?? '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const GET: APIRoute = async ({ locals, params, request }) => {
  // Auth check
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Pro gate — check both tier and status for consistency
  const [sub] = await db
    .select({ tier: subscriptions.tier, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  const effectiveTier = (sub?.status === 'active' || sub?.status === 'past_due') ? sub?.tier : 'free';
  if (effectiveTier !== 'pro') {
    return new Response(JSON.stringify({ error: 'pro_required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { slug } = params;
  if (!slug) {
    return new Response(JSON.stringify({ error: 'missing_slug' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse optional from/to query params (Unix seconds)
  const url = new URL(request.url);
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');

  const nowSec = Math.floor(Date.now() / 1000);
  const from = fromParam !== null && Number.isFinite(Number(fromParam))
    ? Math.floor(Number(fromParam))
    : nowSec - 30 * 24 * 60 * 60;
  const to = toParam !== null && Number.isFinite(Number(toParam))
    ? Math.floor(Number(toParam))
    : nowSec;

  // Ownership check: verify slug belongs to userId (IDOR prevention)
  const [dynamicQr] = await db
    .select({ id: dynamicQrCodes.id })
    .from(dynamicQrCodes)
    .innerJoin(savedQrCodes, eq(dynamicQrCodes.savedQrCodeId, savedQrCodes.id))
    .where(and(eq(dynamicQrCodes.slug, slug), eq(dynamicQrCodes.userId, userId)))
    .limit(1);

  if (!dynamicQr) {
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch raw scan events (limited to 10,000 rows to prevent memory issues)
  const rows = await db
    .select({
      scannedAt: scanEvents.scannedAt,
      device: scanEvents.device,
      country: scanEvents.country,
      utmSource: scanEvents.utmSource,
      utmMedium: scanEvents.utmMedium,
      utmCampaign: scanEvents.utmCampaign,
    })
    .from(scanEvents)
    .where(
      and(
        eq(scanEvents.dynamicQrCodeId, dynamicQr.id),
        gte(scanEvents.scannedAt, from),
        lte(scanEvents.scannedAt, to),
      ),
    )
    .orderBy(desc(scanEvents.scannedAt))
    .limit(10000);

  // Build CSV string with native JS
  const header = 'Date,Device,Country,UTM Source,UTM Medium,UTM Campaign';
  const lines = rows.map((row) => {
    const date = new Date(row.scannedAt * 1000).toISOString();
    return [
      escapeField(date),
      escapeField(row.device),
      escapeField(row.country),
      escapeField(row.utmSource),
      escapeField(row.utmMedium),
      escapeField(row.utmCampaign),
    ].join(',');
  });

  const csv = [header, ...lines].join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="scans-${slug}-${from}-${to}.csv"`,
    },
  });
};
