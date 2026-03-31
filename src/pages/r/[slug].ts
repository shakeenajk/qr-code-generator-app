export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../db/index';
import { dynamicQrCodes, scanEvents } from '../../db/schema';
import { eq } from 'drizzle-orm';

const BOT_UA_PATTERNS = [
  /Googlebot/i, /bingbot/i, /AhrefsBot/i, /facebookexternalhit/i,
  /Twitterbot/i, /LinkedInBot/i, /Slackbot/i, /WhatsApp/i,
  /DuckDuckBot/i, /YandexBot/i, /Baiduspider/i, /Applebot/i,
  /SemrushBot/i, /MJ12bot/i, /Bytespider/i,
];

export function isBot(ua: string | null): boolean {
  if (!ua) return false;
  return BOT_UA_PATTERNS.some(pattern => pattern.test(ua));
}

export function classifyDevice(ua: string | null): 'ios' | 'android' | 'desktop' | 'unknown' {
  if (!ua) return 'unknown';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export const GET: APIRoute = async ({ params, request }) => {
  const { slug } = params;
  if (!slug) return holdingResponse('invalid');

  const [row] = await db
    .select({
      id: dynamicQrCodes.id,
      destinationUrl: dynamicQrCodes.destinationUrl,
      isPaused: dynamicQrCodes.isPaused,
    })
    .from(dynamicQrCodes)
    .where(eq(dynamicQrCodes.slug, slug))
    .limit(1);

  if (!row) return holdingResponse('invalid');
  if (row.isPaused) return holdingResponse('paused');

  // Record scan event (fire-and-forget per D-09/D-10)
  const ua = request.headers.get('user-agent');
  if (!isBot(ua)) {
    const country = request.headers.get('x-vercel-ip-country') ?? null;
    const device = classifyDevice(ua);
    db.insert(scanEvents).values({
      dynamicQrCodeId: row.id,
      userAgent: ua,
      country,
      device,
    }).catch(() => { /* silent — analytics must not break redirects */ });
  }

  return new Response(null, {
    status: 307,
    headers: { Location: row.destinationUrl },
  });
};

function holdingResponse(reason: 'paused' | 'invalid'): Response {
  const heading = reason === 'paused'
    ? 'This QR code is temporarily paused.'
    : 'This QR code is no longer active.';
  const body = reason === 'paused'
    ? 'The owner has disabled this link.'
    : 'The link you scanned is no longer available.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QRCraft</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #fff; color: #111; }
    @media (prefers-color-scheme: dark) { body { background: #0f172a; color: #f8fafc; } }
    .page { min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 1.5rem 2rem; text-align: center; }
    h1 { font-size: 1.75rem; font-weight: 600; margin: 0 0 0.75rem; max-width: 22rem; }
    p { font-size: 0.875rem; color: #6b7280; margin: 0; max-width: 20rem; }
    @media (prefers-color-scheme: dark) { p { color: #94a3b8; } }
    .logo { margin-bottom: 2rem; font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; }
  </style>
</head>
<body>
  <main class="page">
    <div class="logo">QRCraft</div>
    <h1>${heading}</h1>
    <p>${body}</p>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: reason === 'paused' ? 200 : 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
