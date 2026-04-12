import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  createAuthToken,
  getAuthCookieOptions,
  hashOtpCode,
} from "@/lib/auth";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit-redis";
import { OTP_LENGTH, OTP_REGEX } from "@/lib/constants";

const verifyCodeSchema = z.object({
  email: z.string().email("Valid email is required"),
  purpose: z.enum(["sign-up"]).default("sign-up"),
  code: z
    .string()
    .length(OTP_LENGTH, `Verification code must be ${OTP_LENGTH} digits`)
    .regex(OTP_REGEX, "Verification code must contain only digits"),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const data = verifyCodeSchema.parse(body);
    const normalizedEmail = data.email.toLowerCase();

    // Check rate limit
    const rateLimit = await checkRateLimit({
      request,
      identifier: normalizedEmail,
      limiter: rateLimiters.verifyCode,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "X-RateLimit-Remaining": String(Math.max(0, rateLimit.remaining)),
            "X-RateLimit-Reset": rateLimit.reset.toISOString(),
          },
        }
      );
    }

    const hashedCode = hashOtpCode({
      code: data.code,
      email: normalizedEmail,
      purpose: data.purpose,
    });

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (
      !user ||
      !user.emailVerificationToken ||
      !user.emailVerificationExpiry ||
      user.emailVerificationToken !== hashedCode ||
      user.emailVerificationExpiry.getTime() < Date.now()
    ) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    /**
     * SECURITY FIX: Promote pendingPasswordHash → passwordHash on OTP success.
     *
     * During sign-up (POST /api/auth/sign-up), the user's password was hashed
     * and stored in `pendingPasswordHash` — NOT in `passwordHash`. This kept
     * the account unloggable until the user proved ownership of their email.
     *
     * Here, on successful OTP verification, we atomically:
     *   1. Promote pendingPasswordHash → passwordHash   (enables login)
     *   2. Clear pendingPasswordHash                    (remove staging field)
     *   3. Set emailVerified = true                     (mark as verified)
     *   4. Clear OTP token + expiry                     (invalidate one-time code)
     *
     * Guard: if pendingPasswordHash is null (e.g., legacy user or re-verification),
     * we preserve the existing passwordHash to avoid accidentally clearing it.
     */
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        // Promote pending → active only if a pending hash exists
        ...(user.pendingPasswordHash && {
          passwordHash: user.pendingPasswordHash,
          pendingPasswordHash: null,
        }),
      },
    });

    const token = await createAuthToken(updatedUser);
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          industry: updatedUser.industry,
          emailVerified: updatedUser.emailVerified,
        },
      },
      { status: 200 }
    );
    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid verification data" },
        { status: 400 }
      );
    }

    console.error("Code verification failed:", error);
    if (error?.message?.includes("Can't reach database server")) {
      return NextResponse.json(
        { error: "Database is temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
