import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Per-user rate limits for authenticated endpoints
export const alertRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "rl:alerts",
});

// Per-IP rate limits for public endpoints
export const publicRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "rl:public",
});

// Stricter limit for checkout to prevent abuse
export const checkoutRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "rl:checkout",
});

export function rateLimitResponse(reset: number) {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  return Response.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    }
  );
}
