/**
 * Rate Limiting Middleware for Next.js
 * Centralized rate limit validation for protected routes
 */

import { NextResponse } from "next/server";
import {
  checkRateLimit,
  checkGlobalRateLimit,
  rateLimiters,
} from "@/lib/rate-limit-redis";

/**
 * Apply rate limit to a request
 * Returns response with rate limit headers if limit exceeded
 */
export const withRateLimit = (limiter) => {
  return async (handler) => {
    return async (request) => {
      try {
        // First check global rate limit
        const globalLimit = await checkGlobalRateLimit(request);
        if (!globalLimit.allowed) {
          return NextResponse.json(
            { error: "Too many requests globally. Please try again later." },
            {
              status: 429,
              headers: {
                "Retry-After": String(globalLimit.retryAfterSeconds),
                "X-RateLimit-Limit": "1000",
                "X-RateLimit-Remaining": "0",
              },
            }
          );
        }

        // Then check specific endpoint rate limit
        // Extract identifier (email or other unique identifier from request)
        let identifier = "anonymous";
        try {
          const body = await request.json();
          // Reset body for handler to use
          request = new Request(request, {
            body: JSON.stringify(body),
          });
          identifier = body.email || body.identifier || "anonymous";
        } catch {
          // Request might not have JSON body
        }

        const rateLimitResult = await checkRateLimit({
          request,
          identifier,
          limiter,
        });

        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            {
              status: 429,
              headers: {
                "Retry-After": String(rateLimitResult.retryAfterSeconds),
                "X-RateLimit-Limit": String(rateLimitResult.limit),
                "X-RateLimit-Remaining": String(
                  Math.max(0, rateLimitResult.remaining)
                ),
                "X-RateLimit-Reset": rateLimitResult.reset.toISOString(),
              },
            }
          );
        }

        // Call the actual handler
        const response = await handler(request);

        // Add rate limit headers to response
        response.headers.set(
          "X-RateLimit-Limit",
          String(rateLimitResult.limit)
        );
        response.headers.set(
          "X-RateLimit-Remaining",
          String(Math.max(0, rateLimitResult.remaining))
        );
        response.headers.set(
          "X-RateLimit-Reset",
          rateLimitResult.reset.toISOString()
        );

        return response;
      } catch (error) {
        console.error("Rate limit middleware error:", error);
        // Fail open - don't block on middleware errors
        return handler(request);
      }
    };
  };
};

/**
 * Preset middleware for common endpoints
 */
export const rateLimitMiddleware = {
  signUp: withRateLimit(rateLimiters.signUp),
  signIn: withRateLimit(rateLimiters.signIn),
  verifyCode: withRateLimit(rateLimiters.verifyCode),
  resetPassword: withRateLimit(rateLimiters.resetPassword),
  forgotPassword: withRateLimit(rateLimiters.forgotPassword),
};
