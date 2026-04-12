import { NextResponse } from "next/server";

/**
 * Legacy /api/auth/verify-email endpoint — DECOMMISSIONED
 *
 * This route previously accepted a plaintext token via query parameter.
 * The application now uses hashed OTP codes stored in the database, making
 * this endpoint both non-functional and insecure (plaintext tokens are
 * susceptible to interception via server logs and referrer headers).
 *
 * All email verification is now handled by:
 *   POST /api/auth/verify-code  (OTP-based, hashed, rate-limited)
 *
 * Any old magic-link emails sent before this change will redirect users
 * to sign-in with a clear error message.
 */
export async function GET(request) {
  console.warn(
    "[Security] Legacy /api/auth/verify-email was called — redirecting. " +
      "This endpoint has been decommissioned. Use /api/auth/verify-code instead.",
  );

  return NextResponse.redirect(
    new URL("/sign-in?error=legacy_link_expired", request.url),
  );
}
