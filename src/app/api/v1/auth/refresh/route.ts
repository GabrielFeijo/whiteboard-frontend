import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/cookies/cookie-storage";
import {
  applyAuthCookiesToResponse,
  clearAuthCookiesFromResponse,
} from "@/server/auth/cookies";
import { refreshTokensWithBackend } from "@/server/http/backend-client";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value ?? null;
  const hostHeader = request.headers.get("host");

  if (!refreshToken) {
    const unauthorizedRes = NextResponse.json(
      { message: "No active session to refresh" },
      { status: 401 },
    );
    clearAuthCookiesFromResponse(unauthorizedRes, hostHeader);
    return unauthorizedRes;
  }

  const refreshed = await refreshTokensWithBackend(refreshToken);

  if (!refreshed) {
    const expiredRes = NextResponse.json(
      { message: "Session expired" },
      { status: 401 },
    );
    clearAuthCookiesFromResponse(expiredRes, hostHeader);
    return expiredRes;
  }

  const response = NextResponse.json({ user: refreshed.user }, { status: 200 });
  applyAuthCookiesToResponse(
    response,
    {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? refreshToken,
      expiresIn: refreshed.expiresIn,
    },
    hostHeader,
  );
  return response;
}
