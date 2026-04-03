export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { scanEvents, dynamicQrCodes, savedQrCodes, subscriptions } from '../../../db/schema';
import { and, eq, gte, lte, isNotNull, desc, count, sql } from 'drizzle-orm';

function dayBucketToLabel(bucket: number): string {
  const date = new Date(bucket * 86400 * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  // Pro gate (per D-14) — check both tier and status for consistency with subscription/status API
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

  // Parse optional from/to query params (Unix timestamps in seconds)
  const url = new URL(request.url);
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');

  const nowSec = Math.floor(Date.now() / 1000);
  let from: number;
  let to: number;

  if (fromParam !== null) {
    const parsed = Number(fromParam);
    if (!Number.isFinite(parsed)) {
      return new Response(JSON.stringify({ error: 'invalid_from' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    from = Math.floor(parsed);
  } else {
    from = nowSec - 30 * 24 * 60 * 60;
  }

  if (toParam !== null) {
    const parsed = Number(toParam);
    if (!Number.isFinite(parsed)) {
      return new Response(JSON.stringify({ error: 'invalid_to' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    to = Math.floor(parsed);
  } else {
    to = nowSec;
  }

  // Cap to 365-day range
  const rangeDays = Math.ceil((to - from) / 86400);
  if (rangeDays > 365) {
    return new Response(JSON.stringify({ error: 'date_range_too_large' }), {
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

  const nowBucket = Math.floor(to / 86400);
  const dateRangeFilter = and(
    eq(scanEvents.dynamicQrCodeId, dynamicQr.id),
    gte(scanEvents.scannedAt, from),
    lte(scanEvents.scannedAt, to),
  );

  // Batched queries — all dimensions in one request
  const [
    totalRows,
    uniqueRows,
    timeSeriesRows,
    deviceRows,
    countryRows,
    utmSourceRows,
    utmMediumRows,
    utmCampaignRows,
  ] = await Promise.all([
    // Total scans (all time — not date-filtered per original behavior)
    db.select({ count: count() })
      .from(scanEvents)
      .where(eq(scanEvents.dynamicQrCodeId, dynamicQr.id)),

    // ~Unique scans (distinct day+device+country combos, within date range) per D-16
    db.select({
      unique: sql<number>`count(distinct (cast(${scanEvents.scannedAt} / 86400 as int) || coalesce(${scanEvents.device},'') || coalesce(${scanEvents.country},'')))`,
    })
      .from(scanEvents)
      .where(dateRangeFilter),

    // Time series: GROUP BY day bucket within date range
    db.select({
      day: sql<number>`cast(${scanEvents.scannedAt} / 86400 as int)`,
      scans: count(),
    })
      .from(scanEvents)
      .where(dateRangeFilter)
      .groupBy(sql`cast(${scanEvents.scannedAt} / 86400 as int)`),

    // Device breakdown within date range
    db.select({ device: scanEvents.device, scans: count() })
      .from(scanEvents)
      .where(dateRangeFilter)
      .groupBy(scanEvents.device),

    // Top 5 countries within date range
    db.select({ country: scanEvents.country, scans: count() })
      .from(scanEvents)
      .where(dateRangeFilter)
      .groupBy(scanEvents.country)
      .orderBy(desc(count()))
      .limit(5),

    // UTM source breakdown (top 10, non-null, within date range)
    db.select({ value: scanEvents.utmSource, scans: count() })
      .from(scanEvents)
      .where(and(dateRangeFilter, isNotNull(scanEvents.utmSource)))
      .groupBy(scanEvents.utmSource)
      .orderBy(desc(count()))
      .limit(10),

    // UTM medium breakdown (top 10, non-null, within date range)
    db.select({ value: scanEvents.utmMedium, scans: count() })
      .from(scanEvents)
      .where(and(dateRangeFilter, isNotNull(scanEvents.utmMedium)))
      .groupBy(scanEvents.utmMedium)
      .orderBy(desc(count()))
      .limit(10),

    // UTM campaign breakdown (top 10, non-null, within date range)
    db.select({ value: scanEvents.utmCampaign, scans: count() })
      .from(scanEvents)
      .where(and(dateRangeFilter, isNotNull(scanEvents.utmCampaign)))
      .groupBy(scanEvents.utmCampaign)
      .orderBy(desc(count()))
      .limit(10),
  ]);

  // Fill missing days in the selected range
  const timeSeriesMap = new Map(timeSeriesRows.map(r => [r.day, r.scans]));
  const timeSeries = Array.from({ length: rangeDays }, (_, i) => {
    const bucket = nowBucket - (rangeDays - 1) + i;
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
    utm: {
      sources: utmSourceRows.map(r => ({ value: r.value ?? '', scans: r.scans })),
      mediums: utmMediumRows.map(r => ({ value: r.value ?? '', scans: r.scans })),
      campaigns: utmCampaignRows.map(r => ({ value: r.value ?? '', scans: r.scans })),
    },
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
