import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

const AUTH_COOKIE = "career_coach_auth";
const protectedRoutes = [
  /^\/dashboard(?:\/.*)?$/,
  /^\/resume(?:\/.*)?$/,
  /^\/interview(?:\/.*)?$/,
  /^\/ai-cover-letter(?:\/.*)?$/,
  /^\/onboarding(?:\/.*)?$/,
];
const guestOnlyRoutes = [
  /^\/sign-in(?:\/.*)?$/,
  /^\/sign-up(?:\/.*)?$/,
  /^\/forgot-password(?:\/.*)?$/,
];

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return null;
  }

  return new TextEncoder().encode(secret);
};

const hasValidSession = async (request) => {
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    return false;
  }

  try {
    const secret = getJwtSecret();

    if (!secret) {
      return false;
    }

    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
};

const matchesRoute = (pathname, rules) =>
  rules.some((rule) => rule.test(pathname));

export default async function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const isAuthenticated = await hasValidSession(request);

  if (!isAuthenticated && matchesRoute(pathname, protectedRoutes)) {
    const signInUrl = new URL("/sign-in", request.url);
    const redirectTarget = `${pathname}${search || ""}`;

    signInUrl.searchParams.set("redirect_url", redirectTarget);
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthenticated && matchesRoute(pathname, guestOnlyRoutes)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
