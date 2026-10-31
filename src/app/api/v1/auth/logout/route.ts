import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/cookies/cookie-storage";
import { BACKEND_API_V1_URL } from "@/lib/env";
import { clearAuthCookiesFromResponse } from "@/server/auth/cookies";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value ?? null;

  if (refreshToken) {
    await fetch(`${BACKEND_API_V1_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    }).catch(() => null);
  }

  const response = NextResponse.json({ success: true }, { status: 200 });
  clearAuthCookiesFromResponse(response, request.headers.get("host"));
  return response;
}
