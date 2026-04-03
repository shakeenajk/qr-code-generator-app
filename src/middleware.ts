import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';
import { sequence } from 'astro:middleware';
import { getRateLimiter } from './lib/rateLimit';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);
const isWebhookRoute = createRouteMatcher(['/api/webhooks/(.*)']);
const isPublicApiRoute = createRouteMatcher(['/api/v1/(.*)']);
const isCronRoute = createRouteMatcher(['/api/cron/(.*)']);

// Routes EXEMPT from rate limiting:
// - /r/[slug] — QR code redirects must never return 429 (end-user scans)
// - /api/webhooks/* — Stripe webhooks have their own retry logic
// - Static assets and pages — only rate-limit API/dynamic routes
function shouldRateLimit(pathname: string): boolean {
  // Exempt: redirect path
  if (pathname.startsWith('/r/')) return false;
  // Exempt: webhook routes
  if (pathname.startsWith('/api/webhooks/')) return false;
  // Exempt: cron routes (authenticated via CRON_SECRET, not rate limited)
  if (pathname.startsWith('/api/cron/')) return false;
  // Rate-limit: all other API routes
  if (pathname.startsWith('/api/')) return true;
  // Don't rate-limit static pages
  return false;
}

// Extract client IP from request headers (Vercel populates these)
function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

const rateLimitMiddleware = async (context: any, next: any) => {
  const url = new URL(context.request.url);

  if (!shouldRateLimit(url.pathname)) {
    return next();
  }

  const limiter = getRateLimiter();
  if (!limiter) {
    // No rate limiter configured (local dev) — pass through
    return next();
  }

  const ip = getClientIp(context.request);
  const { success, limit, remaining, reset } = await limiter.limit(ip);

  if (!success) {
    const retryAfterSeconds = Math.ceil((reset - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(reset),
        },
      }
    );
  }

  // Attach rate limit headers to successful responses too
  const response = await next();
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(reset));
  return response;
};

const clerkAuth = clerkMiddleware((auth, context) => {
  // Webhooks must bypass auth — Stripe sends unauthenticated POST requests
  if (isWebhookRoute(context.request)) return;
  // /api/v1/* routes handle their own auth via API key verification
  if (isPublicApiRoute(context.request)) return;
  // Cron routes handle their own auth via CRON_SECRET Bearer token
  if (isCronRoute(context.request)) return;

  const { userId } = auth();
  if (!userId && isProtectedRoute(context.request)) {
    return context.redirect('/login');
  }
});

export const onRequest = sequence(rateLimitMiddleware, clerkAuth);
