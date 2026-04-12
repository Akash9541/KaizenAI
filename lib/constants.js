/**
 * Security and Authentication Constants
 * Centralized configuration for auth-related timeouts and settings
 */

// OTP Configuration
export const OTP_EXPIRY_MINUTES = 5;
export const OTP_LENGTH = 6;
export const OTP_REGEX = /^\d{6}$/;

// JWT Configuration
export const JWT_AUTH_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const JWT_AUTH_TTL_MILLISECONDS = JWT_AUTH_TTL_SECONDS * 1000;

// Rate Limiting Configuration
export const RATE_LIMITS = {
  SIGN_UP: {
    limit: 5,
    window: 10 * 60 * 1000, // 10 minutes
  },
  SIGN_IN: {
    limit: 8,
    window: 10 * 60 * 1000, // 10 minutes
  },
  VERIFY_CODE: {
    limit: 10,
    window: 10 * 60 * 1000, // 10 minutes
  },
  RESET_PASSWORD: {
    limit: 8,
    window: 10 * 60 * 1000, // 10 minutes
  },
  FORGOT_PASSWORD: {
    limit: 5,
    window: 30 * 60 * 1000, // 30 minutes
  },
};

// Account Lockout Configuration
export const ACCOUNT_LOCKOUT = {
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
};

// Password Requirements
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// Cookie Names
export const AUTH_COOKIE_NAME = "career_coach_auth";
export const CSRF_TOKEN_COOKIE_NAME = "csrf_token";

// HTTP Headers
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
};
