# AI Career Coach - Complete Project Walkthrough

**Last Updated**: April 12, 2026  
**Version**: 2.0.0 (Enterprise Security Edition)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Architecture](#core-architecture)
3. [File-by-File Breakdown](#file-by-file-breakdown)
4. [Authentication Flow](#authentication-flow)
5. [Data Model](#data-model)
6. [API Endpoints](#api-endpoints)
7. [UI Components](#ui-components)
8. [Utilities & Helpers](#utilities--helpers)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Architecture](#deployment-architecture)

---

## Project Overview

### What is this project?

**AI Career Coach** is a full-stack web application that helps professionals with:
- 📄 **Resume Building** - AI-powered resume generation and editing
- 💌 **Cover Letter Creation** - Personalized cover letter generation
- 🎤 **Interview Preparation** - Mock interviews and interview coaching
- 📊 **Career Insights** - Industry salary ranges, job market trends, skill recommendations
- 👤 **Profile Management** - User profiles with industry and experience tracking

### Tech Stack

```
Frontend:     React 19 + Next.js 16 (App Router)
Styling:      Tailwind CSS + Shadcn/UI components
Database:     PostgreSQL (Neon)
ORM:          Prisma 6.2.1
Auth:         JWT + HttpOnly Cookies
Rate Limit:   Upstash Redis
Email:        Brevo
AI:           Google Gemini API
Jobs:         Inngest
Testing:      Jest + Playwright + k6
Deployment:   Vercel
```

---

## Core Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser/Client                            │
│              (React Components + Next.js Client)                 │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Next.js Server  │
                    │  (App Router)    │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
    ┌───▼───┐          ┌────▼────┐         ┌────▼────┐
    │Routes │          │Server   │         │Middleware
    │/page  │          │Actions  │         │Rate Limit
    │/api   │          │Async    │         │Auth
    └───────┘          └────┬────┘         └────┬────┘
                             │                    │
                    ┌────────▼────────┐          │
                    │  Prisma ORM     │◄─────────┘
                    │  (Type-Safe)    │
                    └────────┬────────┘
                             │
        ┌────────────────────┼─────────────────────┐
        │                    │                     │
    ┌───▼────┐          ┌───▼────┐          ┌────▼────┐
    │Database│          │Redis   │          │External │
    │Postgres│          │Upstash │          │Services │
    │(Neon)  │          │(Cache) │          │(AI API) │
    └────────┘          └────────┘          └─────────┘
```

### Request Flow Example (Login)

```
1. User enters email/password → Form submission
   │
2. Browser sends POST /api/auth/sign-in
   │
3. Middleware checks rate limit (Redis)
   │
4. Route handler receives request
   ├─ Parse & validate request body (Zod)
   ├─ Check login attempts (Redis-backed login guard)
   ├─ Query database for user (Prisma)
   ├─ Hash comparison (bcryptjs)
   ├─ Generate JWT token (jose)
   │
5. Response sent back
   ├─ JSON: { success: true, user {...} }
   ├─ Cookie: Set HttpOnly auth cookie
   │
6. Client redirects to dashboard
   │
7. Dashboard calls /api/auth/me to get current user
   │
8. Auth middleware verifies JWT from cookie
   │
9. User data loaded from database
   │
10. Dashboard renders with user's industry insights
```

---

## File-by-File Breakdown

### 📁 Root Configuration Files

#### `next.config.mjs`
```javascript
// Next.js configuration
// Features:
// - Turbopack for ultra-fast compilation
// - Image optimization for Unsplash, Vercel CDN
// - Security headers for production
```

#### `tailwind.config.mjs`
```javascript
// Tailwind CSS configuration
// - Custom colors (gradient theme)
// - Animation definitions
// - Plugin integrations (Shadcn/UI)
```

#### `jest.config.js`
```javascript
// Jest testing configuration
// - testEnvironment: 'node' for API tests
// - setupFilesAfterEnv: jest.setup.js
// - moduleNameMapper: Path aliases (@/lib, @/components, etc.)
```

#### `playwright.config.ts`
```typescript
// Playwright E2E testing configuration
// - Browsers: Chromium, Firefox, WebKit
// - Base URL: http://localhost:3000
// - Screenshot/video on failure
// - Mobile device emulation
```

---

### 📁 Authentication & Security (`lib/`)

#### `lib/constants.js` ⭐ **NEW - Security Constants**

**Purpose**: Single source of truth for all security configurations

```javascript
// OTP Configuration
export const OTP_EXPIRY_MINUTES = 5;           // OTP valid for 5 minutes
export const OTP_LENGTH = 6;                   // 6-digit OTP
export const OTP_REGEX = /^\d{6}$/;           // Validation regex

// JWT Configuration
export const JWT_AUTH_TTL_SECONDS = 604800;   // 7 days
export const AUTH_COOKIE_NAME = "auth_token"; // Cookie name

// Rate Limiting by endpoint
export const RATE_LIMITS = {
  SIGN_UP: { limit: 5, window: 10 * 60 * 1000 },        // 5 per 10min
  SIGN_IN: { limit: 8, window: 10 * 60 * 1000 },        // 8 per 10min
  VERIFY_CODE: { limit: 10, window: 10 * 60 * 1000 },   // 10 per 10min
  RESET_PASSWORD: { limit: 8, window: 10 * 60 * 1000 }, // 8 per 10min
  FORGOT_PASSWORD: { limit: 5, window: 30 * 60 * 1000 }, // 5 per 30min
  GLOBAL: { limit: 1000, window: 1 * 60 * 1000 }        // 1000 per min
};

// Account Lockout
export const ACCOUNT_LOCKOUT_THRESHOLD = 5;     // After 5 failed attempts
export const ACCOUNT_LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Password Requirements
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
```

**Why**: Prevents hardcoding security values across multiple files. Single update point for all configurations.

---

#### `lib/auth.js` ⭐ **Updated - Core Authentication**

**Purpose**: All authentication logic and session management

```javascript
// 1. PASSWORD HASHING
export const hashPassword = async (password) => bcrypt.hash(password, 12);
export const comparePassword = async (password, hash) => bcrypt.compare(password, hash);

// Why bcrypt? 
// - Automatic salt generation
// - Slow computation (12 rounds = ~100ms per hash)
// - Resistant to brute force attacks
// - Industry standard

// 2. OTP GENERATION
export const generateOtpCode = () => crypto.randomInt(100000, 1000000).toString();
// Returns random 6-digit number

export const getOtpExpiryDate = () => 
  new Date(Date.now() + OTP_TTL_SECONDS * 1000);
// Returns expiry timestamp (uses constants)

// 3. OTP HASHING
export const hashOtpCode = ({ code, email, purpose }) => {
  return crypto
    .createHash("sha256")
    .update(`${email}:${purpose}:${code}:${JWT_SECRET}`)
    .digest("hex");
};
// Why hash OTP?
// - Store only hashes in database, never plain text
// - Even if DB compromised, OTPs are useless
// - Verify by comparing hashes

// 4. JWT TOKEN CREATION
export const createAuthToken = async (user) =>
  new SignJWT({
    sub: user.id,                    // Subject (user ID)
    email: user.email,
    name: user.name || user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${JWT_AUTH_TTL_SECONDS}s`)  // 7 days
    .sign(getJwtSecret());

// Why JWT?
// - Stateless (no session storage needed)
// - Self-contained (all info in token)
// - Signed (can't be forged)
// - Expiry (automatic timeout)

// 5. COOKIE MANAGEMENT (UPDATED)
export const getAuthCookieOptions = () => ({
  httpOnly: true,           // ✅ Can't access via JavaScript (XSS protection)
  sameSite: "strict",       // ✅ CSRF protection (was "lax")
  secure: process.env.NODE_ENV === "production",  // HTTPS only in prod
  path: "/",
  maxAge: JWT_AUTH_TTL_SECONDS,
});

// Why these settings?
// - httpOnly: Prevents XSS attacks (JS can't steal the cookie)
// - sameSite: strict: Prevents CSRF attacks
// - secure: Forces HTTPS in production
// - path: /: Cookie available to entire app

// 6. SESSION RETRIEVAL
export const getSession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  
  if (!token) return null;
  
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;  // Invalid token returns null
  }
};
```

**Key Changes from Original**:
- ✅ Uses `AUTH_COOKIE_NAME` from constants (was hardcoded)
- ✅ `sameSite: "strict"` instead of "lax" (CSRF protection)
- ✅ All config values imported from `lib/constants.js`
- ✅ Proper error handling with try-catch

---

#### `lib/rate-limit-redis.js` ⭐ **NEW - Distributed Rate Limiting**

**Purpose**: Redis-backed rate limiting for scalability and distributed deployments

```javascript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create Redis client (Upstash)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Create rate limiter with sliding window algorithm
export const createRateLimiter = (options) => {
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(
      options.limit,           // Max requests
      options.window           // Time window (e.g., "10 m" for 10 minutes)
    ),
    analytics: true,           // Track analytics
    prefix: `@upstash/ratelimit`,
  });
};

// Pre-configured limiters for each endpoint
export const rateLimiters = {
  signUp: createRateLimiter({ limit: 5, window: "10 m" }),
  signIn: createRateLimiter({ limit: 8, window: "10 m" }),
  verifyCode: createRateLimiter({ limit: 10, window: "10 m" }),
  resetPassword: createRateLimiter({ limit: 8, window: "10 m" }),
  global: createRateLimiter({ limit: 1000, window: "1 m" }),
};

// Check rate limit function
export const checkRateLimit = async ({ request, identifier, limiter }) => {
  try {
    const ip = getClientIp(request);
    const key = `${identifier}:${ip}`;  // Rate limit per email + IP
    
    const result = await limiter.limit(key);
    
    return {
      allowed: result.success,
      remaining: result.remaining,
      reset: new Date(result.reset),
      retryAfterSeconds: Math.ceil((result.reset - Date.now()) / 1000),
      limit: result.limit,
    };
  } catch (error) {
    // Fail-open strategy: If Redis unavailable, allow request
    console.error("Rate limit check failed:", error);
    return { allowed: true, remaining: -1, reset: new Date() };
  }
};

// Get client IP (handles proxies)
const getClientIp = (request) => {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
};
```

**Why Redis instead of in-memory?**
- ✅ Distributed: Works across multiple server instances
- ✅ Persistent: Survives server restarts
- ✅ Scalable: Handles millions of requests
- ✅ Centralized: No race conditions between servers
- ✅ Analytics: Built-in tracking and reporting

**Sliding Window Algorithm**:
```
Time:     |----10 minutes----|
Requests: X X X X X X X X (8 requests)
After 2: Request #9 blocked, must wait for first request to age out
```

---

#### `lib/login-guard.js` ⭐ **Account Lockout Logic**

**Purpose**: Prevent brute-force attacks by tracking failed login attempts

```javascript
// Stores failed login attempts (Redis-backed)
const getFailedAttempts = async (email) => {
  const key = `login_attempts:${email}`;
  const count = await redis.get(key);
  return count || 0;
};

// Record a failed attempt
export const recordFailedLoginAttempt = async (email) => {
  const key = `login_attempts:${email}`;
  await redis.incr(key);
  await redis.expire(key, 3600);  // Expire after 1 hour
  
  const attempts = await redis.get(key);
  if (attempts >= ACCOUNT_LOCKOUT_THRESHOLD) {
    // Lock account for 15 minutes
    await redis.set(
      `account_locked:${email}`,
      true,
      "EX",
      ACCOUNT_LOCKOUT_DURATION / 1000
    );
  }
};

// Get lock state
export const getLockState = async (email) => {
  const isLocked = await redis.get(`account_locked:${email}`);
  if (isLocked) {
    const ttl = await redis.ttl(`account_locked:${email}`);
    return {
      isLocked: true,
      retryAfterSeconds: ttl,
    };
  }
  return { isLocked: false };
};

// Clear after successful login
export const clearLoginAttempts = async (email) => {
  await redis.del(`login_attempts:${email}`);
  await redis.del(`account_locked:${email}`);
};
```

**Brute Force Protection**:
```
Attempt 1: ✅ Failed (1/5)
Attempt 2: ✅ Failed (2/5)
Attempt 3: ✅ Failed (3/5)
Attempt 4: ✅ Failed (4/5)
Attempt 5: ✅ Failed (5/5) → ACCOUNT LOCKED
Attempt 6: ❌ Blocked: Account locked, try again in 15 minutes
```

---

### 📁 Database Layer (`prisma/`)

#### `prisma/schema.prisma` ⭐ **Updated Database Model**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  // Identity fields
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  industry  String?
  
  // Authentication fields
  passwordHash            String?
  emailVerified           Boolean          @default(false)
  emailVerificationToken  String?          @unique
  emailVerificationExpiry DateTime?
  
  // Security audit fields (NEW)
  lastLoginAt            DateTime?          // Track last successful login
  lastPasswordChangeAt   DateTime?          // Track password changes
  failedLoginAttempts    Int               @default(0)  // For lockout
  accountLockedUntil     DateTime?          // Lockout expiry
  
  // Profile & skills
  experience  String?
  bio         String?
  skills      String[]          @default([])
  
  // Relationships
  resumes     Resume[]
  coverLetters CoverLetter[]
  interviews  Interview[]
  
  // Metadata
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  // Performance indexes (NEW)
  @@index([email])
  @@index([emailVerified])
}

model Resume {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title     String
  content   String   @db.Text
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([userId])
}

model CoverLetter {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  jobTitle  String
  content   String   @db.Text
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([userId])
}

model Interview {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  topic     String
  level     String   // Beginner, Intermediate, Advanced
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([userId])
}
```

**Schema Design Decisions**:

| Field | Why | Security Impact |
|-------|-----|-----------------|
| `emailVerified` | Prevents login before email verification | Prevents account takeover |
| `failedLoginAttempts` | Tracks failed attempts | Enables lockout mechanism |
| `accountLockedUntil` | Stores lockout expiry | Prevents brute force |
| `lastLoginAt` | Audit trail | Detects suspicious activity |
| Indexes on `email`, `emailVerified` | Speed up frequent queries | Better performance |

---

### 📁 API Routes (`app/api/auth/`)

#### `app/api/auth/sign-in/route.js` ⭐ **Login Endpoint**

```javascript
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { comparePassword, createAuthToken, getAuthCookieOptions } from "@/lib/auth";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit-redis";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

// Input validation schema
const signInSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request) {
  try {
    // 1. Parse & validate request
    const body = await request.json();
    const { email, password } = signInSchema.parse(body);
    const normalizedEmail = email.toLowerCase();

    // 2. Check global rate limit
    let rateLimit = await checkRateLimit({
      request,
      identifier: "global",
      limiter: rateLimiters.global,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { 
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) }
        }
      );
    }

    // 3. Check endpoint-specific rate limit (8 per 10 minutes)
    rateLimit = await checkRateLimit({
      request,
      identifier: normalizedEmail,
      limiter: rateLimiters.signIn,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts" },
        { 
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          }
        }
      );
    }

    // 4. Check account lockout (after 5 failed attempts)
    const lockState = await getLockState(normalizedEmail);
    if (lockState.isLocked) {
      return NextResponse.json(
        { error: "Account temporarily locked" },
        { 
          status: 429,
          headers: { "Retry-After": String(lockState.retryAfterSeconds) }
        }
      );
    }

    // 5. Find user in database
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Record failed attempt for non-existent user
      await recordFailedLoginAttempt(normalizedEmail);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // 6. Verify email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Email is not verified" },
        { status: 403 }
      );
    }

    // 7. Compare passwords
    const passwordValid = await comparePassword(password, user.passwordHash);
    if (!passwordValid) {
      await recordFailedLoginAttempt(normalizedEmail);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // 8. Login successful: clear failed attempts
    await clearLoginAttempts(normalizedEmail);

    // 9. Generate JWT token
    const token = await createAuthToken(user);

    // 10. Update last login timestamp
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 11. Create response with user data (NO TOKEN in body)
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
      { status: 200 }
    );

    // 12. Set secure HttpOnly cookie
    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    return response;
  } catch (error) {
    console.error("Sign in error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
```

**Request Flow**:
```
POST /api/auth/sign-in
├─ Validate email & password (Zod)
├─ Check global rate limit
├─ Check endpoint rate limit
├─ Check account lockout
├─ Query database for user
├─ Verify email is verified
├─ Compare password hashes
├─ Update last login timestamp
├─ Generate JWT token
├─ Return user data (no token in JSON)
└─ Set HttpOnly secure cookie with token

Response: 200 OK
{
  "success": true,
  "user": { "id": "...", "email": "...", ... }
}
Set-Cookie: auth_token=eyJhbGc....; HttpOnly; SameSite=Strict; Secure
```

---

#### `app/api/auth/sign-up/route.js` ⭐ **Registration Endpoint**

```javascript
export async function POST(request) {
  try {
    // 1. Rate limit (5 per 10 minutes)
    const rateLimit = await checkRateLimit({
      request,
      identifier: data.email.toLowerCase(),
      limiter: rateLimiters.signUp,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // 2. Parse request
    const body = await request.json();
    const { name, email, password } = signUpSchema.parse(body);

    // 3. Hash password
    const passwordHash = await hashPassword(password);

    // 4. Generate OTP & verification token
    const otp = generateOtpCode();
    const hashedOtp = hashOtpCode({ code: otp, email, purpose: "sign-up" });
    const verificationToken = generateEmailVerificationToken();

    // 5. Create user with emailVerified: false
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,  // Password hashed but NOT verified yet
        emailVerified: false,  // ← KEY: Not verified until OTP confirmation
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: getOtpExpiryDate(),
      },
    });

    // 6. Send OTP email
    await sendOtpEmail(email, otp);

    // 7. Return email for client
    return NextResponse.json({
      success: true,
      email: user.email,
      message: "OTP sent to email",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

**Why password is hashed before verification?**
- ✅ Prepare it early
- ✅ But don't set `emailVerified = true` until OTP verified
- ✅ If user doesn't verify email, account never becomes active
- ✅ Prevents account takeover by registering with someone else's email

---

#### `app/api/auth/verify-code/route.js` ⭐ **OTP Verification**

```javascript
export async function POST(request) {
  try {
    // 1. Rate limit (10 per 10 minutes)
    const rateLimit = await checkRateLimit({
      request,
      identifier: data.email.toLowerCase(),
      limiter: rateLimiters.verifyCode,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
    }

    // 2. Find user
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Check OTP expiry
    if (!user.emailVerificationExpiry || user.emailVerificationExpiry < new Date()) {
      return NextResponse.json({ error: "OTP expired" }, { status: 410 });
    }

    // 4. Verify OTP hash
    const hashedOtp = hashOtpCode({ 
      code: data.code, 
      email: normalizedEmail, 
      purpose: data.purpose 
    });

    if (hashedOtp !== user.emailVerificationToken) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
    }

    // 5. Mark email as verified
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,  // ← NOW set to true after OTP verification
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    // 6. Generate JWT & set cookie (same as login)
    const token = await createAuthToken(user);
    const response = NextResponse.json({
      success: true,
      user: { /* ... */ },
    });
    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**OTP Verification Flow**:
```
1. User signs up
   → Pass: hashed, emailVerified: false
   
2. OTP sent to email

3. User enters OTP code

4. Server verifies:
   ├─ OTP not expired (5 minutes)
   ├─ OTP hash matches stored hash
   └─ Purpose matches (sign-up, password-reset, etc.)

5. If valid:
   → Update emailVerified: true
   → Login user immediately
   → Set auth cookie

6. If invalid/expired:
   → Reject
   → User must request new OTP
```

---

### 📁 Frontend Components (`components/`, `app/`)

#### `components/header.jsx` ⭐ **Fixed Navigation Header**

```javascript
"use client";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState(undefined);  // undefined = loading
  const [mounted, setMounted] = useState(false);

  // Hydration safety: only render on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch current user
  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!cancelled) {
          setUser(payload.user || null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      }
    };

    loadUser();
    return () => { cancelled = true; };
  }, [mounted]);

  // FIX: Growth Tools dropdown now OUTSIDE the user conditional
  // This means it shows immediately, doesn't wait for user data
  return (
    <header className="fixed top-0 w-full border-b bg-background/80">
      <nav className="container mx-auto flex h-24 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="Logo" width={320} height={160} />
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4">
          {/* Growth Tools - Shows immediately ✅ */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex items-center gap-2">
                <StarsIcon className="h-4 w-4" />
                <span className="hidden md:block">Growth Tools</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/resume">
                  <FileText className="h-4 w-4" />
                  Build Resume
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/ai-cover-letter">
                  <PenBox className="h-4 w-4" />
                  Cover Letter
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/interview">
                  <GraduationCap className="h-4 w-4" />
                  Interview Prep
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Profile Section - Only when user data loaded */}
          {mounted && user ? (
            <>
              {/* Dashboard/Profile button */}
              <Link href={user?.industry ? "/dashboard" : "/onboarding"}>
                <Button variant="outline">
                  <LayoutDashboard className="h-4 w-4" />
                  {user?.industry ? "Industry Insights" : "Complete Profile"}
                </Button>
              </Link>

              {/* User menu dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 w-10 rounded-full p-0"
                  >
                    {getInitials(user.name || user.email)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-2 text-sm">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/onboarding?edit=true">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : mounted && user === null ? (
            // Not logged in
            <Link href="/sign-in">
              <Button variant="outline">Sign In</Button>
            </Link>
          ) : (
            // Loading placeholder
            <div className="h-10 w-24 animate-pulse bg-gray-200" />
          )}
        </div>
      </nav>
    </header>
  );
}
```

**Why the FIX works**:
- ❌ **Before**: Growth Tools inside `{mounted && user ? ... }`
  - Dropdown hidden until user data loads from API (~1-2 sec)
  
- ✅ **After**: Growth Tools OUTSIDE the conditional
  - Dropdown visible immediately after login
  - Doesn't wait for /api/auth/me to complete

---

### 📁 Server Actions (`actions/`)

#### `actions/user.js` ⭐ **User Profile Updates**

```javascript
"use server";

import { db } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import { ensureIndustryInsights } from "@/lib/industry-insights";

// Update user profile
export async function updateUser(data) {
  // 1. Require authentication
  const user = await requireCurrentUser();

  try {
    // 2. Generate industry insights if industry changed
    await ensureIndustryInsights(data.industry);

    // 3. Update user in database
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        industry: data.industry,
        experience: data.experience,
        bio: data.bio,
        skills: data.skills,
      },
    });

    // 4. Revalidate cached pages
    revalidatePath("/dashboard");

    return { success: true, user: updatedUser };
  } catch (error) {
    throw new Error("Failed to update profile");
  }
}

// Get user's onboarding status
export async function getUserOnboardingStatus() {
  const user = await requireCurrentUser({ select: { industry: true } });

  try {
    return {
      isOnboarded: !!user?.industry,  // true if industry is set
    };
  } catch {
    throw new Error("Failed to check status");
  }
}
```

**Server Actions Benefits**:
- ✅ **Type Safety**: Return types checked at compile time
- ✅ **No API needed**: Direct database access
- ✅ **Automatic serialization**: Objects converted to JSON automatically
- ✅ **Security**: Runs only on server, can't be called from browser
- ✅ **Mutability**: Use for both reads & writes

---

### 📁 Middleware & Request Processing

#### `middleware/rate-limit.js` ⭐ **Rate Limit Middleware Wrapper**

```javascript
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimiters } from "@/lib/rate-limit-redis";

// Higher-order function that wraps route handlers
export const withRateLimit = (limiter) => {
  return async (handler) => {
    return async (request) => {
      // 1. Get client IP
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

      // 2. Check global rate limit first
      let result = await checkRateLimit({
        request,
        identifier: "global",
        limiter: rateLimiters.global,
      });

      if (!result.allowed) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { 
            status: 429,
            headers: {
              "X-RateLimit-Limit": String(result.limit),
              "X-RateLimit-Remaining": String(result.remaining),
              "X-RateLimit-Reset": result.reset.toISOString(),
              "Retry-After": String(result.retryAfterSeconds),
            }
          }
        );
      }

      // 3. Check endpoint-specific limit
      result = await checkRateLimit({
        request,
        identifier: ip,
        limiter,
      });

      if (!result.allowed) {
        return NextResponse.json(
          { error: "Too many requests" },
          { 
            status: 429,
            headers: { "Retry-After": String(result.retryAfterSeconds) }
          }
        );
      }

      // 4. Add rate limit headers to response
      const response = await handler(request);
      response.headers.set("X-RateLimit-Limit", String(result.limit));
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
      response.headers.set("X-RateLimit-Reset", result.reset.toISOString());

      return response;
    };
  };
};
```

---

### 📁 Testing Strategy

#### `__tests__/unit/auth.test.js` ⭐ **Unit Tests**

```javascript
import {
  hashPassword,
  comparePassword,
  generateOtpCode,
  generateEmailVerificationToken,
} from "@/lib/auth";

describe("Authentication Utilities", () => {
  // Password hashing
  describe("hashPassword & comparePassword", () => {
    it("should hash password and verify it", async () => {
      const password = "SecurePassword123!";
      const hash = await hashPassword(password);
      
      expect(hash).not.toBe(password);  // Hashed, not plain text
      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject wrong password", async () => {
      const hash = await hashPassword("CorrectPassword");
      const isValid = await comparePassword("WrongPassword", hash);
      expect(isValid).toBe(false);
    });
  });

  // OTP generation
  describe("generateOtpCode", () => {
    it("should generate 6-digit OTP", () => {
      const otp = generateOtpCode();
      expect(otp).toMatch(/^\d{6}$/);  // Matches /^\d{6}$/
    });

    it("should generate different OTPs", () => {
      const otp1 = generateOtpCode();
      const otp2 = generateOtpCode();
      expect(otp1).not.toBe(otp2);  // Different each time
    });
  });

  // Email verification token
  describe("generateEmailVerificationToken", () => {
    it("should generate unique token", () => {
      const token1 = generateEmailVerificationToken();
      const token2 = generateEmailVerificationToken();
      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64);  // 32 bytes -> 64 hex chars
    });
  });
});
```

#### `__tests__/integration/auth-api.test.js` ⭐ **Integration Tests**

```javascript
import request from "supertest";

describe("Authentication API", () => {
  // Test sign-up endpoint
  describe("POST /api/auth/sign-up", () => {
    it("should create user and send OTP", async () => {
      const response = await request(app)
        .post("/api/auth/sign-up")
        .send({
          name: "John Doe",
          email: "john@example.com",
          password: "SecurePassword123!",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.email).toBe("john@example.com");
    });

    it("should reject weak password", async () => {
      const response = await request(app)
        .post("/api/auth/sign-up")
        .send({
          name: "John Doe",
          email: "john@example.com",
          password: "weak",  // Less than 8 chars
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("at least 8 characters");
    });
  });

  // Test sign-in endpoint
  describe("POST /api/auth/sign-in", () => {
    it("should login and set cookie", async () => {
      // Assume user already created and email verified
      const response = await request(app)
        .post("/api/auth/sign-in")
        .send({
          email: "john@example.com",
          password: "SecurePassword123!",
        });

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe("john@example.com");
      expect(response.headers["set-cookie"]).toBeDefined();
      expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
    });

    it("should reject unverified email", async () => {
      const response = await request(app)
        .post("/api/auth/sign-in")
        .send({
          email: "unverified@example.com",
          password: "SecurePassword123!",
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("not verified");
    });
  });

  // Test rate limiting
  describe("Rate Limiting", () => {
    it("should block after max attempts", async () => {
      // Make 8 requests (at limit)
      for (let i = 0; i < 8; i++) {
        await request(app).post("/api/auth/sign-in").send({...});
      }

      // 9th request should be blocked
      const response = await request(app).post("/api/auth/sign-in").send({...});
      expect(response.status).toBe(429);
      expect(response.headers["retry-after"]).toBeDefined();
    });
  });
});
```

#### `__tests__/e2e/auth.spec.ts` ⭐ **End-to-End Tests (Playwright)**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Sign Up Flow", () => {
  test("should complete sign up with valid credentials", async ({ page }) => {
    // 1. Navigate to sign-up page
    await page.goto("/sign-up");

    // 2. Fill form
    await page.fill('input[name="name"]', "John Doe");
    await page.fill('input[name="email"]', "john.doe@example.com");
    await page.fill('input[name="password"]', "SecurePassword123!");
    await page.fill('input[name="confirmPassword"]', "SecurePassword123!");

    // 3. Submit
    await page.click('button[type="submit"]');

    // 4. Should see OTP prompt
    await expect(page).toHaveURL(/verify|verification/);
    await expect(page.locator("text=verification code")).toBeVisible();
  });
});

test.describe("Sign In Flow", () => {
  test("should login and access dashboard", async ({ page }) => {
    // 1. Navigate to sign-in
    await page.goto("/sign-in");

    // 2. Enter credentials
    await page.fill('input[name="email"]', "verified@example.com");
    await page.fill('input[name="password"]', "SecurePassword123!");

    // 3. Submit
    await page.click('button[type="submit"]');

    // 4. Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard");

    // 5. Should see Growth Tools menu (FIX: appears immediately)
    await expect(page.locator("button:has-text('Growth Tools')")).toBeVisible();

    // 6. Should see dropdown items
    await page.click("button:has-text('Growth Tools')");
    await expect(page.locator("text=Build Resume")).toBeVisible();
    await expect(page.locator("text=Cover Letter")).toBeVisible();
    await expect(page.locator("text=Interview Prep")).toBeVisible();
  });
});
```

---

## Authentication Flow (Complete Sequence)

### Sign-Up Flow

```
1. User fills: name, email, password
   │
2. POST /api/auth/sign-up
   ├─ Rate limit check (5 per 10 min)
   ├─ Validate email format
   ├─ Hash password (bcryptjs)
   ├─ Generate OTP (random 6-digit)
   ├─ Hash OTP & store with expiry
   ├─ Create user in database (emailVerified: false)
   └─ Send OTP email
   │
3. Response: { email: "..." }
   │
4. User sees: "Enter verification code"
   │
5. User enters 6-digit OTP
   │
6. POST /api/auth/verify-code
   ├─ Rate limit check (10 per 10 min)
   ├─ Find user
   ├─ Check OTP not expired (5 min)
   ├─ Compare OTP hashes
   ├─ Update user: emailVerified = true
   ├─ Generate JWT token
   └─ Set HttpOnly cookie
   │
7. Response: { user: {...} } + Cookie
   │
8. Browser redirects to /dashboard or /onboarding
   │
9. Dashboard checks /api/auth/me
   ├─ Read JWT from cookie
   ├─ Verify signature & expiry
   ├─ Query user from database
   └─ Return user data
   │
10. Dashboard renders with user's data
```

### Sign-In Flow

```
1. User enters: email, password
   │
2. POST /api/auth/sign-in
   ├─ Check global rate limit
   ├─ Check endpoint rate limit (8 per 10 min)
   ├─ Check account lockout (15 min after 5 failed)
   ├─ Query user by email
   ├─ Check emailVerified = true
   ├─ Compare password hash
   ├─ On success:
   │  ├─ Clear failed attempts
   │  ├─ Update lastLoginAt
   │  ├─ Generate JWT
   │  └─ Set HttpOnly cookie
   └─ On failure:
      ├─ Increment failed attempts
      └─ If >= 5: lock account for 15 min
   │
3. Response: { user: {...} } + Cookie
   │
4. Browser redirects to /dashboard
   │
5. Rest of flow same as sign-up (step 9-10)
```

---

## Data Model Relationships

```
┌─────────────────────────────────────────────────────────┐
│                         User                            │
├──────────────────────────────────────────────────────────┤
│ id (PK)                                                  │
│ email (UNIQUE)                                           │
│ passwordHash                                             │
│ emailVerified       ← Key field for auth state          │
│ failedLoginAttempts ← For brute force protection        │
│ lastLoginAt         ← Audit trail                        │
│ industry            ← Onboarding status                  │
│ skills[] (array)                                         │
│ createdAt, updatedAt                                     │
└───────────────┬──────────────────────────────────────────┘
                │ 1:N relationships
    ┌───────────┼───────────┬──────────────┐
    │           │           │              │
    ▼           ▼           ▼              ▼
  Resume   CoverLetter   Interview    Feedback
  ┌────┐    ┌────────┐    ┌─────┐      (future)
  │id  │    │id      │    │id   │
  │userId    │userId │    │userId
  │title │    │jobTitle│   │topic│
  │content   │content│    │level│
  │createdAt │createdAt   │createdAt
  └────┘    └────────┘    └─────┘
```

**Foreign Key Constraints**:
- User → Resume: `onDelete: Cascade` (delete all resumes if user deleted)
- User → CoverLetter: `onDelete: Cascade`
- User → Interview: `onDelete: Cascade`

---

## API Response Patterns

### Success Response (200 OK)
```json
{
  "success": true,
  "data": { /* ... */ }
}

Headers:
X-RateLimit-Limit: 8
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 2026-04-12T19:00:00Z
```

### Error Response (4XX/5XX)
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { /* optional */ }
}

Headers (on rate limit):
Retry-After: 120
X-RateLimit-Remaining: 0
```

---

## Security Checklist

✅ **Authentication**
- JWTs signed and verified
- HttpOnly cookies (XSS protection)
- SameSite: strict (CSRF protection)
- Password hashed with bcryptjs

✅ **Rate Limiting**
- Global: 1000 req/min per IP
- Sign-in: 8 attempts / 10 min
- Sign-up: 5 attempts / 10 min
- OTP verify: 10 attempts / 10 min

✅ **Account Lockout**
- 5 failed logins → 15 min lockout
- Failed attempts tracked in Redis
- Cleared on successful login

✅ **Data Protection**
- Email verification required before login
- OTP expires after 5 minutes
- Passwords never stored in plain text
- OTP hashes prevent database compromise

✅ **Database**
- Indexes on frequently queried fields (email, emailVerified)
- Foreign key constraints with cascade delete
- Audit fields (lastLoginAt, lastPasswordChangeAt)

---

## Performance Optimizations

### Database Queries
- **Indexes**: email, emailVerified for quick lookups
- **Query selection**: Only select needed fields
- **Connection pooling**: Via Neon PostgreSQL (50 max connections)

### Caching
- **Redis rate limiting**: In-memory, microsecond response time
- **Session cookies**: No database query on every request
- **Next.js ISR**: Incremental Static Regeneration for pages

### Frontend
- **Code splitting**: Lazy load route components
- **Image optimization**: Next.js Image component
- **CSS**: Tailwind CSS purges unused styles at build time

---

## Deployment Architecture

### Development
```
localhost:3000
  ├─ Next.js dev server (--turbopack)
  ├─ Prisma generates on startup
  └─ Hot reload on file changes
```

### Staging
```
Vercel (staging branch)
  ├─ Built with Next.js build
  ├─ Environment: Neon dev database
  ├─ CI/CD: GitHub Actions runs tests first
  └─ Preview URL available
```

### Production
```
Vercel (main branch)
  ├─ Built with optimizations
  ├─ Environment: Neon production database
  ├─ Edge functions for middleware
  ├─ Automatic HTTPS/2
  └─ Global CDN distribution
```

### Services
```
PostgreSQL (Neon):       Database & connection pooling
Redis (Upstash):        Rate limiting & caching
Email (Brevo):          Transactional emails
AI (Google Gemini):     Resume/cover letter generation
Jobs (Inngest):         Background jobs
```

---

## Key Decisions & Rationale

| Decision | Why | Benefit |
|----------|-----|---------|
| Store JWT in cookie, not localStorage | XSS vulnerability | Tokens can't be stolen via JS |
| SameSite: strict instead of lax | CSRF attacks | Cookies only sent to same site |
| Rate limit with Redis | Single instance limit | Works across multiple servers |
| Prisma ORM | Type safety | Catches errors at compile time |
| Server Actions | Reduces API boilerplate | Directly call server from client |
| Playwright + Jest + k6 | 4-tier testing | Full coverage: unit, integration, E2E, load |
| GitHub Actions CI/CD | Automated testing | Never deploy broken code |

---

## Extension Points (Future Features)

### 1. Social Login (OAuth)
```
Add to: lib/auth.js
- Google OAuth provider
- GitHub OAuth provider
- Email linking
```

### 2. Two-Factor Authentication
```
Add to: lib/2fa.js
- TOTP (Time-based OTP)
- SMS verification
- Backup codes
```

### 3. Audit Logging
```
Add to: prisma/schema.prisma
- AuditLog model
- Track all auth events
- Track profile changes
```

### 4. API Keys for Integrations
```
Add to: prisma/schema.prisma
- ApiKey model
- Rate limiting per key
- Scope/permission system
```

---

**This completes the comprehensive project walkthrough!** 🎉

For specific code questions, refer to the files mentioned and the [ARCHITECTURE_ANALYSIS.md](ARCHITECTURE_ANALYSIS.md) document for deeper technical details.
