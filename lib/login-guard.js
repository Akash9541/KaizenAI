/**
 * Login Guard — Distributed Account Lockout via Upstash Redis
 *
 * Replaces the previous in-memory Map implementation which was NOT safe
 * for multi-instance deployments (serverless, containers, etc.) — each
 * instance had its own isolated counter, allowing unlimited login attempts
 * across the fleet.
 *
 * Redis keys:
 *   login_attempts:{email}  — incremental counter (auto-expires)
 *   login_locked:{email}    — lock flag with TTL = lockout duration
 *
 * All exported functions are async — callers must use `await`.
 */

import { Redis } from "@upstash/redis";
import { ACCOUNT_LOCKOUT } from "@/lib/constants";

// Re-use the same Redis client pattern as rate-limit-redis.js
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const LOCK_DURATION_SECONDS = Math.ceil(ACCOUNT_LOCKOUT.lockoutDuration / 1000);

const attemptsKey = (email) => `login_attempts:${email.toLowerCase().trim()}`;

const lockedKey = (email) => `login_locked:${email.toLowerCase().trim()}`;

/**
 * Check if an account is currently locked out.
 *
 * @param {string} email
 * @returns {Promise<{ isLocked: boolean, retryAfterSeconds: number }>}
 */
export const getLockState = async (email) => {
  try {
    const locked = await redis.get(lockedKey(email));

    if (!locked) {
      return { isLocked: false, retryAfterSeconds: 0 };
    }

    // TTL returns -2 if key doesn't exist, -1 if no expiry, or remaining seconds
    const ttl = await redis.ttl(lockedKey(email));
    return {
      isLocked: true,
      retryAfterSeconds: Math.max(1, ttl > 0 ? ttl : LOCK_DURATION_SECONDS),
    };
  } catch (error) {
    console.error("[login-guard] getLockState error:", error);
    // Fail open — don't block users if Redis is unavailable
    return { isLocked: false, retryAfterSeconds: 0 };
  }
};

/**
 * Record a failed login attempt. Locks the account if the threshold is reached.
 *
 * @param {string} email
 * @returns {Promise<{ locked: boolean }>}
 */
export const recordFailedLoginAttempt = async (email) => {
  try {
    const key = attemptsKey(email);

    // Atomically increment; set TTL on first attempt to define the window
    const attempts = await redis.incr(key);

    if (attempts === 1) {
      // Start the rolling window on first failure
      await redis.expire(key, LOCK_DURATION_SECONDS);
    }

    if (attempts >= ACCOUNT_LOCKOUT.maxAttempts) {
      // Lock the account for the full lockout duration
      await redis.set(lockedKey(email), "1", {
        ex: LOCK_DURATION_SECONDS,
      });
      return { locked: true };
    }

    return { locked: false };
  } catch (error) {
    console.error("[login-guard] recordFailedLoginAttempt error:", error);
    return { locked: false };
  }
};

/**
 * Clear all login attempt counters and any active lock for an account.
 * Called on successful login.
 *
 * @param {string} email
 * @returns {Promise<void>}
 */
export const clearLoginAttempts = async (email) => {
  try {
    await redis.del(attemptsKey(email), lockedKey(email));
  } catch (error) {
    console.error("[login-guard] clearLoginAttempts error:", error);
    // Non-critical — don't throw; successful logins should not be blocked
  }
};
