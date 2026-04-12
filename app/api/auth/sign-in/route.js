import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import {
  comparePassword,
  createAuthToken,
  getAuthCookieOptions,
} from "@/lib/auth";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit-redis";
import {
  clearLoginAttempts,
  getLockState,
  recordFailedLoginAttempt,
} from "@/lib/login-guard";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  AUTH_COOKIE_NAME,
} from "@/lib/constants";

const signInSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    )
    .max(
      PASSWORD_MAX_LENGTH,
      `Password must be less than ${PASSWORD_MAX_LENGTH} characters`,
    ),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const data = signInSchema.parse(body);
    const normalizedEmail = data.email.toLowerCase();

    // Check rate limit
    const rateLimit = await checkRateLimit({
      request,
      identifier: normalizedEmail,
      limiter: rateLimiters.signIn,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "X-RateLimit-Remaining": String(Math.max(0, rateLimit.remaining)),
            "X-RateLimit-Reset": rateLimit.reset.toISOString(),
          },
        },
      );
    }
    // login-guard functions are now async (Redis-backed) — must await
    const lockState = await getLockState(normalizedEmail);

    if (lockState.isLocked) {
      return NextResponse.json(
        { error: "Account temporarily locked. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(lockState.retryAfterSeconds),
          },
        },
      );
    }

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      await recordFailedLoginAttempt(normalizedEmail); // async — must await
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error:
            "Password login is not set for this account yet. Use Forgot Password to set one.",
        },
        { status: 428 },
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error:
            "Email is not verified. Complete sign-up verification or reset password.",
        },
        { status: 403 },
      );
    }

    const isValidPassword = await comparePassword(
      data.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      await recordFailedLoginAttempt(normalizedEmail); // async — must await
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    await clearLoginAttempts(normalizedEmail); // async — must await
    const token = await createAuthToken(user);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          industry: user.industry,
          emailVerified: user.emailVerified,
        },
      },
      { status: 200 },
    );
    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid sign in data" },
        { status: 400 },
      );
    }

    console.error("Sign in failed:", error);
    if (error?.message?.includes("Can't reach database server")) {
      return NextResponse.json(
        { error: "Database is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 });
  }
}
