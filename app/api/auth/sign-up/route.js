import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import {
  generateOtpCode,
  getOtpExpiryDate,
  hashOtpCode,
  hashPassword,
} from "@/lib/auth";
import { sendAuthCodeEmail } from "@/lib/brevo";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit-redis";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "@/lib/constants";

const signUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
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
    const data = signUpSchema.parse(body);
    const normalizedEmail = data.email.toLowerCase();

    // Check rate limit
    const rateLimit = await checkRateLimit({
      request,
      identifier: normalizedEmail,
      limiter: rateLimiters.signUp,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many sign up attempts. Please try again later." },
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

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser?.emailVerified) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    // Generate OTP
    const verificationCode = generateOtpCode();
    const verificationToken = hashOtpCode({
      code: verificationCode,
      email: normalizedEmail,
      purpose: "sign-up",
    });
    const verificationExpiry = getOtpExpiryDate();

    /**
     * SECURITY FIX: Password stored only as "pending" until OTP is verified.
     *
     * Previously, `passwordHash` was committed to the `User` record immediately
     * at sign-up — before the user proved ownership of the email address.
     * This allowed an attacker to register with a victim's email, permanently
     * occupying the account slot and storing credentials for an unverified user.
     *
     * Fix: The hashed password is now written to `pendingPasswordHash` ONLY.
     * The `passwordHash` field (used for login) remains null until the user
     * successfully verifies their OTP in POST /api/auth/verify-code, at which
     * point `pendingPasswordHash` is promoted to `passwordHash` and cleared.
     *
     * Result: An unverified account has NO usable passwordHash — the account
     * cannot be signed into even if the attacker knows the password.
     */
    const pendingPasswordHash = await hashPassword(data.password);

    const user = existingUser
      ? await db.user.update({
          where: { id: existingUser.id },
          data: {
            name: data.name,
            email: normalizedEmail,
            emailVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpiry: verificationExpiry,
            // Store as pending — NOT promoted to passwordHash yet
            pendingPasswordHash,
            // Explicitly ensure passwordHash is not set for unverified users
            passwordHash: null,
          },
        })
      : await db.user.create({
          data: {
            name: data.name,
            email: normalizedEmail,
            emailVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpiry: verificationExpiry,
            // Store as pending — NOT promoted to passwordHash yet
            pendingPasswordHash,
            skills: [],
          },
        });

    try {
      await sendAuthCodeEmail({
        email: user.email,
        code: verificationCode,
        purpose: "sign-up",
      });
    } catch (error) {
      console.error("Verification code email failed:", error);
      return NextResponse.json(
        { error: "Failed to send verification code" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      email: normalizedEmail,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid sign up data" },
        { status: 400 },
      );
    }

    console.error("Sign up failed:", error);
    if (error?.message?.includes("Can't reach database server")) {
      return NextResponse.json(
        { error: "Database is temporarily unavailable. Please try again." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 },
    );
  }
}
