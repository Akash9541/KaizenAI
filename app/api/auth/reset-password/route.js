import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import {
  createAuthToken,
  getAuthCookieOptions,
  hashOtpCode,
  hashPassword,
} from "@/lib/auth";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit-redis";
import { clearLoginAttempts } from "@/lib/login-guard";
import {
  OTP_LENGTH,
  OTP_REGEX,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  AUTH_COOKIE_NAME,
} from "@/lib/constants";

const resetPasswordSchema = z
  .object({
    email: z.string().email("Valid email is required"),
    code: z
      .string()
      .length(OTP_LENGTH, `Verification code must be ${OTP_LENGTH} digits`)
      .regex(OTP_REGEX, "Verification code must contain only digits"),
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
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(request) {
  try {
    const body = await request.json();
    const data = resetPasswordSchema.parse(body);
    const normalizedEmail = data.email.toLowerCase();

    // Check rate limit
    const rateLimit = await checkRateLimit({
      request,
      identifier: normalizedEmail,
      limiter: rateLimiters.resetPassword,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many reset attempts. Please try again later." },
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
    const token = hashOtpCode({
      code: data.code,
      email: normalizedEmail,
      purpose: "password-reset",
    });

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (
      !user ||
      !user.emailVerificationToken ||
      !user.emailVerificationExpiry ||
      user.emailVerificationToken !== token ||
      user.emailVerificationExpiry.getTime() < Date.now()
    ) {
      return NextResponse.json(
        { error: "Invalid or expired reset code" },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(data.password);
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    clearLoginAttempts(normalizedEmail);
    const authToken = await createAuthToken(updatedUser);
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
      { status: 200 },
    );
    response.cookies.set(AUTH_COOKIE_NAME, authToken, getAuthCookieOptions());

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid reset request" },
        { status: 400 },
      );
    }

    console.error("Reset password failed:", error);
    if (error?.message?.includes("Can't reach database server")) {
      return NextResponse.json(
        { error: "Database is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 },
    );
  }
}
