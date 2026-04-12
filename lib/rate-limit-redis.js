/**
 * Distributed Rate Limiting using Upstash Redis
 * Replaces in-memory rate limiting for scalable, multi-instance deployments
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RATE_LIMITS } from "@/lib/constants";

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Create rate limiter instances for different endpoints
 */
const createRateLimiter = (key, limit, window) =>
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${window}ms`),
    prefix: `ratelimit:${key}`,
    analytics: true,
  });

// Rate limiters for different endpoints
export const rateLimiters = {
  signUp: createRateLimiter(
    "sign-up",
    RATE_LIMITS.SIGN_UP.limit,
    RATE_LIMITS.SIGN_UP.window,
  ),
  signIn: createRateLimiter(
    "sign-in",
    RATE_LIMITS.SIGN_IN.limit,
    RATE_LIMITS.SIGN_IN.window,
  ),
  verifyCode: createRateLimiter(
    "verify-code",
    RATE_LIMITS.VERIFY_CODE.limit,
    RATE_LIMITS.VERIFY_CODE.window,
  ),
  resetPassword: createRateLimiter(
    "reset-password",
    RATE_LIMITS.RESET_PASSWORD.limit,
    RATE_LIMITS.RESET_PASSWORD.window,
  ),
  forgotPassword: createRateLimiter(
    "forgot-password",
    RATE_LIMITS.FORGOT_PASSWORD.limit,
    RATE_LIMITS.FORGOT_PASSWORD.window,
  ),
};

/**
 * Get client IP from request headers
 * Supports various proxy headers for accurate IP detection
 */
export const getClientIp = (request) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  return "unknown";
};

/**
 * Check rate limit for a specific action
 * Returns rate limit status with retry information
 *
 * @param {Object} options
 * @param {Request} options.request - Next.js request object
 * @param {string} options.identifier - Unique identifier for rate limiting (e.g., email)
 * @param {Object} options.limiter - Rate limiter instance
 * @returns {Promise<Object>} Rate limit metadata
 */
export const checkRateLimit = async ({ request, identifier, limiter }) => {
  try {
    const ip = getClientIp(request);
    const key = `${identifier}:${ip}`;

    const result = await limiter.limit(key);

    return {
      allowed: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: new Date(result.resetAfter),
      retryAfterSeconds: Math.ceil((result.resetAfter - Date.now()) / 1000),
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    // Fail open in case of Redis issues - don't block legitimate users
    return {
      allowed: true,
      limit: 0,
      remaining: 0,
      reset: new Date(),
      retryAfterSeconds: 0,
    };
  }
};

/**
 * Check if IP is rate limited globally
 * Useful for blocking DDoS attacks
 */
export const checkGlobalRateLimit = async (request) => {
  try {
    const ip = getClientIp(request);
    const key = `global:${ip}`;

    const result = await redis.incr(key);

    if (result === 1) {
      // Set expiry for first request
      await redis.expire(key, 60); // 1-minute window
    }

    // Allow max 1000 requests per minute globally per IP
    if (result > 1000) {
      return {
        allowed: false,
        retryAfterSeconds: 60,
      };
    }

    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  } catch (error) {
    console.error("Global rate limit check error:", error);
    // Fail open - don't block on Redis errors
    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  }
};

/**
 * Clear rate limit for a specific identifier
 * Useful for admin operations or after account unlock
 */
export const clearRateLimit = async (identifier, limiter) => {
  try {
    // Fixed: was `${limiter}.prefix}` (broken) → now `${limiter.prefix}` (correct)
    const key = `ratelimit:${limiter.prefix}:${identifier}`;
    await redis.del(key);
    return true;
  } catch (error) {
    console.error("Failed to clear rate limit:", error);
    return false;
  }
};
