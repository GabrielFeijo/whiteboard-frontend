import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/cookies/cookie-storage";
import { env } from "@/lib/env";

const ACCESS_TOKEN_DEFAULT_MAX_AGE = 60 * 15;
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

function isSecureEnvironment(hostHeader?: string | null): boolean {
  if (env.NODE_ENV !== "production") return false;
  const host = hostHeader ?? "";
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return false;
  }
  return true;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number;
}

export async function getServerAuthTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN)?.value ?? null;
  const refreshToken = cookieStore.get(COOKIE_NAMES.REFRESH_TOKEN)?.value ?? null;
  return { accessToken, refreshToken };
}

export function applyAuthCookiesToResponse(
  response: NextResponse,
  tokens: AuthTokenPair,
  hostHeader?: string | null,
): void {
  const secure = isSecureEnvironment(hostHeader);
  const accessMaxAge =
    tokens.expiresIn && tokens.expiresIn > 0
      ? tokens.expiresIn
      : ACCESS_TOKEN_DEFAULT_MAX_AGE;

  response.cookies.set({
    name: COOKIE_NAMES.ACCESS_TOKEN,
    value: tokens.accessToken,
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: accessMaxAge,
  });

  if (tokens.refreshToken) {
    response.cookies.set({
      name: COOKIE_NAMES.REFRESH_TOKEN,
      value: tokens.refreshToken,
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }
}

export function clearAuthCookiesFromResponse(
  response: NextResponse,
  hostHeader?: string | null,
): void {
  const secure = isSecureEnvironment(hostHeader);

  response.cookies.set({
    name: COOKIE_NAMES.ACCESS_TOKEN,
    value: "",
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set({
    name: COOKIE_NAMES.REFRESH_TOKEN,
    value: "",
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
