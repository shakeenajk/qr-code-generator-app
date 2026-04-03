import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Module-level singleton — survives across requests within the same
// serverless instance. State is in Redis, not in-memory.
// Separate instance from IP rate limiter (qrcraft:rl) — distinct prefix
// allows per-key throttling without sharing the IP bucket.

let apiKeyLimiter: Ratelimit | null = null;

export function getApiKeyRateLimiter(): Ratelimit | null {
  // Gracefully return null when env vars are missing (local dev without Upstash)
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  if (!apiKeyLimiter) {
    apiKeyLimiter = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      // 100 requests per 60 seconds per API key — tighter than IP limit (60 req/60s)
      limiter: Ratelimit.slidingWindow(100, '60 s'),
      prefix: 'qrcraft:api-key-rl',
      analytics: true,
    });
  }

  return apiKeyLimiter;
}
