import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/cookies/cookie-storage";
import { applyAuthCookiesToResponse, clearAuthCookiesFromResponse } from "@/server/auth/cookies";
import { refreshTokensWithBackend } from "@/server/http/backend-client";

const PROTECTED_PREFIXES = ["/boards"];
const AUTH_ROUTES = ["/login", "/register"];

function isProtectedRoute(pathname: string, searchParams?: URLSearchParams): boolean {
  if (PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }
  if (pathname.startsWith("/board/")) {
    return !searchParams?.get("token");
  }
  return false;
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route);
}

async function handleRefreshedSession(
  request: NextRequest,
  refreshToken: string,
  pathname: string,
  hostHeader: string | null,
): Promise<NextResponse> {
  const isProtected = isProtectedRoute(pathname, request.nextUrl.searchParams);
  const refreshed = await refreshTokensWithBackend(refreshToken);
  if (!refreshed) {
    const fallbackRes = isProtected
      ? NextResponse.redirect(new URL("/login", request.url))
      : NextResponse.next();
    clearAuthCookiesFromResponse(fallbackRes, hostHeader);
    return fallbackRes;
  }

  request.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, refreshed.accessToken);
  if (refreshed.refreshToken) {
    request.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, refreshed.refreshToken);
  }

  const tokenPair = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? refreshToken,
    expiresIn: refreshed.expiresIn,
  };

  if (isAuthRoute(pathname)) {
    const redirectRes = NextResponse.redirect(new URL("/boards", request.url));
    applyAuthCookiesToResponse(redirectRes, tokenPair, hostHeader);
    return redirectRes;
  }

  const nextRes = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  applyAuthCookiesToResponse(nextRes, tokenPair, hostHeader);
  return nextRes;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, searchParams } = request.nextUrl;
  const hostHeader = request.headers.get("host");

  if (isAuthRoute(pathname) && searchParams.get("expired") === "1") {
    const nextRes = NextResponse.next();
    clearAuthCookiesFromResponse(nextRes, hostHeader);
    return nextRes;
  }

  const accessToken = request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value ?? null;
  const refreshToken = request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value ?? null;

  if (!accessToken && refreshToken) {
    return handleRefreshedSession(request, refreshToken, pathname, hostHeader);
  }

  const hasValidSession = Boolean(accessToken || refreshToken);
  const isProtected = isProtectedRoute(pathname, searchParams);

  if (isProtected && !hasValidSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthRoute(pathname) && hasValidSession) {
    return NextResponse.redirect(new URL("/boards", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/boards/:path*", "/board/:path*", "/login", "/register"],
};
