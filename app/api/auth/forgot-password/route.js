import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateOtpCode, getOtpExpiryDate, hashOtpCode } from "@/lib/auth";
import { sendAuthCodeEmail } from "@/lib/brevo";

const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export async function POST(request) {
  try {
    const rateLimit = checkRateLimit({
      request,
      action: "forgot-password",
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const body = await request.json();
    const data = forgotPasswordSchema.parse(body);
    const normalizedEmail = data.email.toLowerCase();

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    });

    if (!user || !user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "If the account exists, a reset code has been sent.",
      });
    }

    const code = generateOtpCode();
    const token = hashOtpCode({
      code,
      email: normalizedEmail,
      purpose: "password-reset",
    });
    const expiry = getOtpExpiryDate();

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: token,
        emailVerificationExpiry: expiry,
      },
    });

    await sendAuthCodeEmail({
      email: user.email,
      code,
      purpose: "password-reset",
    });

    return NextResponse.json({
      success: true,
      message: "If the account exists, a reset code has been sent.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid request data" },
        { status: 400 }
      );
    }

    console.error("Forgot password failed:", error);
    if (error?.message?.includes("Can't reach database server")) {
      return NextResponse.json(
        { error: "Database is temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process forgot password request" },
      { status: 500 }
    );
  }
}
