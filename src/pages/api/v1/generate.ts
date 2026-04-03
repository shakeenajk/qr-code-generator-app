export const prerender = false;

import type { APIRoute } from 'astro';
import QRCode from 'qrcode';
import { verifyApiKey } from '../../../lib/apiAuth';
import { getApiKeyRateLimiter } from '../../../lib/apiRateLimit';
import { db } from '../../../db/index';
import { apiKeys } from '../../../db/schema';
import { eq, sql } from 'drizzle-orm';

const ALLOWED_CONTENT_TYPES = ['url', 'text', 'wifi', 'vcard'] as const;
const ALLOWED_FORMATS = ['png', 'svg'] as const;
const ALLOWED_ECL = ['L', 'M', 'Q', 'H'] as const;

type ContentType = typeof ALLOWED_CONTENT_TYPES[number];
type Format = typeof ALLOWED_FORMATS[number];
type ErrorCorrectionLevel = typeof ALLOWED_ECL[number];

interface GenerateBody {
  content: string;
  contentType: ContentType;
  format?: Format;
  size?: number;
  errorCorrectionLevel?: ErrorCorrectionLevel;
}

function jsonError(message: string, status: number, extra?: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  // Parse JSON body
  let body: GenerateBody;
  try {
    body = await request.json() as GenerateBody;
  } catch {
    return jsonError('Request body must be valid JSON', 400);
  }

  // Validate content
  if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
    return jsonError('content is required and must be a string (max 4096 chars)', 400);
  }
  if (body.content.length > 4096) {
    return jsonError('content is required and must be a string (max 4096 chars)', 400);
  }

  // Validate contentType
  if (!body.contentType || !ALLOWED_CONTENT_TYPES.includes(body.contentType as ContentType)) {
    return jsonError('contentType must be one of: url, text, wifi, vcard', 400);
  }

  // Validate format (default 'png')
  const format: Format = body.format ?? 'png';
  if (!ALLOWED_FORMATS.includes(format)) {
    return jsonError('format must be one of: png, svg', 400);
  }

  // Validate size (default 400, range 100–1000)
  const size: number = body.size ?? 400;
  if (typeof body.size !== 'undefined' && (typeof body.size !== 'number' || body.size < 100 || body.size > 1000)) {
    return jsonError('size must be a number between 100 and 1000', 400);
  }

  // Validate errorCorrectionLevel (default 'M')
  const errorCorrectionLevel: ErrorCorrectionLevel = body.errorCorrectionLevel ?? 'M';
  if (
    typeof body.errorCorrectionLevel !== 'undefined' &&
    !ALLOWED_ECL.includes(body.errorCorrectionLevel as ErrorCorrectionLevel)
  ) {
    return jsonError('errorCorrectionLevel must be one of: L, M, Q, H', 400);
  }

  // Authentication
  const verified = await verifyApiKey(request);
  if (!verified) {
    return jsonError('Invalid or revoked API key', 401);
  }

  // Per-key rate limiting
  const limiter = getApiKeyRateLimiter();
  if (limiter) {
    const { success, reset } = await limiter.limit(verified.keyId);
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      });
    }
  }

  // QR code generation
  let data: string;
  try {
    if (format === 'svg') {
      data = await QRCode.toString(body.content, {
        type: 'svg',
        width: size,
        margin: 1,
        errorCorrectionLevel,
      });
    } else {
      const dataUrl = await QRCode.toDataURL(body.content, {
        type: 'image/png',
        width: size,
        margin: 1,
        errorCorrectionLevel,
        color: { dark: '#000000', light: '#ffffff' },
      });
      // Strip "data:image/png;base64," prefix
      data = dataUrl.split(',')[1];
    }
  } catch {
    return jsonError('QR generation failed', 500);
  }

  // Atomic usage increment + lastUsedAt update
  await db
    .update(apiKeys)
    .set({
      usageCount: sql`${apiKeys.usageCount} + 1`,
      lastUsedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(apiKeys.id, verified.keyId));

  return new Response(
    JSON.stringify({
      format,
      data,
      contentType: format === 'png' ? 'image/png' : 'image/svg+xml',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

export const GET: APIRoute = () =>
  jsonError('Method not allowed', 405);

export const PUT: APIRoute = () =>
  jsonError('Method not allowed', 405);

export const DELETE: APIRoute = () =>
  jsonError('Method not allowed', 405);

export const PATCH: APIRoute = () =>
  jsonError('Method not allowed', 405);
