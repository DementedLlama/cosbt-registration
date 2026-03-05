/**
 * Upstash Redis client + rate limiters.
 *
 * Two limiters:
 * - loginLimiter:        5 attempts per 15 min per email (auth.ts)
 * - registrationLimiter: 5 requests per 1 min per IP    (registrations/route.ts)
 */

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/** Login: 5 failed attempts per email per 15-minute sliding window */
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "ratelimit:login",
});

/** Registration: 5 submissions per IP per 1-minute sliding window */
export const registrationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "ratelimit:register",
});
