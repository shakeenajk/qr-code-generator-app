export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  // Only allow in non-production or when explicitly enabled
  if (import.meta.env.PROD && !import.meta.env.SENTRY_DEBUG_ENABLED) {
    return new Response(JSON.stringify({ error: 'Not available' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  throw new Error('Sentry debug test — this error should appear in Sentry dashboard');
};
