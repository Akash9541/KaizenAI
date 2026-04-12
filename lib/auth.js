import crypto from "crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  JWT_AUTH_TTL_SECONDS,
  OTP_EXPIRY_MINUTES,
} from "@/lib/constants";

const OTP_TTL_SECONDS = OTP_EXPIRY_MINUTES * 60;

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return new TextEncoder().encode(secret);
};

export const hashPassword = async (password) => bcrypt.hash(password, 12);

export const comparePassword = async (password, hash) =>
  bcrypt.compare(password, hash);

export const generateEmailVerificationToken = () =>
  crypto.randomBytes(32).toString("hex");

export const generateOtpCode = () =>
  crypto.randomInt(100000, 1000000).toString();

export const getOtpExpiryDate = () =>
  new Date(Date.now() + OTP_TTL_SECONDS * 1000);

export const hashOtpCode = ({ code, email, purpose }) => {
  const normalizedEmail = (email || "").toLowerCase().trim();
  return crypto
    .createHash("sha256")
    .update(`${normalizedEmail}:${purpose}:${code}:${process.env.JWT_SECRET}`)
    .digest("hex");
};

export const createAuthToken = async (user) =>
  new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name || user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${JWT_AUTH_TTL_SECONDS}s`)
    .sign(getJwtSecret());

export const setAuthCookie = async (token) => {
  const cookieStore = await cookies();
  // Fixed: was incorrectly referencing undefined `AUTH_COOKIE` instead of `AUTH_COOKIE_NAME`
  cookieStore.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
};

export const clearAuthCookie = async () => {
  const cookieStore = await cookies();
  // Fixed: was incorrectly referencing undefined `AUTH_COOKIE` instead of `AUTH_COOKIE_NAME`
  cookieStore.delete(AUTH_COOKIE_NAME);
};

export const getSession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    if (!payload.sub || typeof payload.sub !== "string") {
      return null;
    }

    return {
      userId: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
      name: typeof payload.name === "string" ? payload.name : null,
    };
  } catch {
    return null;
  }
};

export const requireSession = async () => {
  const session = await getSession();

  if (!session?.userId) {
    throw new Error("Unauthorized");
  }

  return session;
};

export const getCurrentUser = async (query = {}) => {
  const session = await getSession();

  if (!session?.userId) {
    return null;
  }

  return db.user.findUnique({
    where: { id: session.userId },
    ...query,
  });
};

export const requireCurrentUser = async (query = {}) => {
  const user = await getCurrentUser(query);

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
};

export const AUTH_COOKIE_MAX_AGE = JWT_AUTH_TTL_SECONDS;
export const getAuthCookieOptions = () => ({
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: JWT_AUTH_TTL_SECONDS,
});
