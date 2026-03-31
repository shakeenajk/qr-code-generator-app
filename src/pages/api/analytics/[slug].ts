export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { scanEvents, dynamicQrCodes, savedQrCodes, subscriptions } from '../../../db/schema';
import { and, eq, gte, desc, count, sql } from 'drizzle-orm';

function dayBucketToLabel(bucket: number): string {
  const date = new Date(bucket * 86400 * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const GET: APIRoute = async ({ locals, params }) => {
  // Auth check
  const { userId } = locals.auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Pro gate (per D-14)
  const [sub] = await db
    .select({ tier: subscriptions.tier })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (sub?.tier !== 'pro') {
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

  // Ownership check: verify slug belongs to userId (IDOR prevention)
  const [dynamicQr] = await db
    .select({
      id: dynamicQrCodes.id,
      name: savedQrCodes.name,
      qrSlug: dynamicQrCodes.slug,
    })
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

  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  const nowBucket = Math.floor(Date.now() / 1000 / 86400);

  // Batched queries (per D-15) — all 4 dimensions in one request
  const [totalRows, uniqueRows, timeSeriesRows, deviceRows, countryRows] = await Promise.all([
    // Total scans (all time)
    db.select({ count: count() })
      .from(scanEvents)
      .where(eq(scanEvents.dynamicQrCodeId, dynamicQr.id)),

    // ~Unique scans (distinct day+device+country combos, last 30 days) per D-16
    db.select({
      unique: sql<number>`count(distinct (cast(${scanEvents.scannedAt} / 86400 as int) || coalesce(${scanEvents.device},'') || coalesce(${scanEvents.country},'')))`,
    })
      .from(scanEvents)
      .where(and(
        eq(scanEvents.dynamicQrCodeId, dynamicQr.id),
        gte(scanEvents.scannedAt, thirtyDaysAgo),
      )),

    // 30-day time series: GROUP BY day bucket
    db.select({
      day: sql<number>`cast(${scanEvents.scannedAt} / 86400 as int)`,
      scans: count(),
    })
      .from(scanEvents)
      .where(and(
        eq(scanEvents.dynamicQrCodeId, dynamicQr.id),
        gte(scanEvents.scannedAt, thirtyDaysAgo),
      ))
      .groupBy(sql`cast(${scanEvents.scannedAt} / 86400 as int)`),

    // Device breakdown (all time)
    db.select({ device: scanEvents.device, scans: count() })
      .from(scanEvents)
      .where(eq(scanEvents.dynamicQrCodeId, dynamicQr.id))
      .groupBy(scanEvents.device),

    // Top 5 countries (all time)
    db.select({ country: scanEvents.country, scans: count() })
      .from(scanEvents)
      .where(eq(scanEvents.dynamicQrCodeId, dynamicQr.id))
      .groupBy(scanEvents.country)
      .orderBy(desc(count()))
      .limit(5),
  ]);

  // Fill missing days in 30-day window (Pitfall 6: GROUP BY returns 0 rows for days with no scans)
  const timeSeriesMap = new Map(timeSeriesRows.map(r => [r.day, r.scans]));
  const timeSeries = Array.from({ length: 30 }, (_, i) => {
    const bucket = nowBucket - 29 + i;
    return {
      date: dayBucketToLabel(bucket),
      scans: timeSeriesMap.get(bucket) ?? 0,
    };
  });

  const total = totalRows[0]?.count ?? 0;
  const unique = uniqueRows[0]?.unique ?? 0;

  const payload = {
    name: dynamicQr.name,
    slug: dynamicQr.qrSlug,
    total,
    unique,
    timeSeries,
    devices: deviceRows.map(r => ({
      device: r.device ?? 'unknown',
      scans: r.scans,
    })),
    countries: countryRows.map(r => ({
      country: r.country ?? 'unknown',
      scans: r.scans,
    })),
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
