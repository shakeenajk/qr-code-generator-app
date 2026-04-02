import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Module-level singleton — survives across requests within the same
// serverless instance but state is in Redis, not in-memory.
// NEVER use an in-memory Map for rate limiting on Vercel — it resets
// on every cold start (Pitfall 8 from research).

let ratelimit: Ratelimit | null = null;

export function getRateLimiter(): Ratelimit | null {
  // Gracefully return null when env vars are missing (local dev without Upstash)
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      // Sliding window: 60 requests per 60 seconds per IP
      // Generous for normal usage, catches abuse
      limiter: Ratelimit.slidingWindow(60, '60 s'),
      prefix: 'qrcraft:rl',
      analytics: true,
    });
  }

  return ratelimit;
}
