import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/cookies/cookie-storage";
import { applyAuthCookiesToResponse, clearAuthCookiesFromResponse } from "@/server/auth/cookies";
import { refreshTokensWithBackend } from "@/server/http/backend-client";

const PROTECTED_PREFIXES = ["/boards"];
const AUTH_ROUTES = ["/login", "/register"];

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const hostHeader = request.headers.get("host");

  const accessToken = request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value ?? null;
  const refreshToken = request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value ?? null;
  let hasValidSession = Boolean(accessToken || refreshToken);

  if (!accessToken && refreshToken) {
    const refreshed = await refreshTokensWithBackend(refreshToken);
    if (refreshed) {
      request.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, refreshed.accessToken);
      if (refreshed.refreshToken) {
        request.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, refreshed.refreshToken);
      }

      const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);
      if (isAuthRoute) {
        const redirectRes = NextResponse.redirect(new URL("/boards", request.url));
        applyAuthCookiesToResponse(
          redirectRes,
          {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken ?? refreshToken,
            expiresIn: refreshed.expiresIn,
          },
          hostHeader,
        );
        return redirectRes;
      }

      const nextRes = NextResponse.next({
        request: {
          headers: request.headers,
        },
      });
      applyAuthCookiesToResponse(
        nextRes,
        {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken ?? refreshToken,
          expiresIn: refreshed.expiresIn,
        },
        hostHeader,
      );
      return nextRes;
    } else {
      hasValidSession = false;
      const isProtected = PROTECTED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      );
      if (isProtected) {
        const loginRedirect = NextResponse.redirect(new URL("/login", request.url));
        clearAuthCookiesFromResponse(loginRedirect, hostHeader);
        return loginRedirect;
      }
      const nextRes = NextResponse.next();
      clearAuthCookiesFromResponse(nextRes, hostHeader);
      return nextRes;
    }
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !hasValidSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);
  if (isAuthRoute && hasValidSession) {
    return NextResponse.redirect(new URL("/boards", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/boards/:path*", "/board/:path*", "/login", "/register"],
};
