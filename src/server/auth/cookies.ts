import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/cookies/cookie-storage";
import { BACKEND_API_V1_URL, env } from "@/lib/env";
import { AuthBackendResponseSchema } from "@/server/http/backend-client";

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

export interface ProxyAuthMutationOptions {
  endpoint: "/auth/login" | "/auth/register";
  successStatus: 200 | 201;
  fallbackAuthErrorMessage: string;
  invalidSchemaMessage: string;
  unexpectedErrorMessage: string;
}

export async function proxyAuthMutation(
  request: NextRequest,
  options: ProxyAuthMutationOptions,
): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const upstreamRes = await fetch(`${BACKEND_API_V1_URL}${options.endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data: unknown = await upstreamRes.json().catch(() => null);

    if (!upstreamRes.ok) {
      return NextResponse.json(
        data ?? { message: options.fallbackAuthErrorMessage },
        { status: upstreamRes.status },
      );
    }

    const parsed = AuthBackendResponseSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { message: options.invalidSchemaMessage },
        { status: 502 },
      );
    }

    const response = NextResponse.json(
      { user: parsed.data.user },
      { status: options.successStatus },
    );

    applyAuthCookiesToResponse(
      response,
      {
        accessToken: parsed.data.accessToken,
        refreshToken: parsed.data.refreshToken,
        expiresIn: parsed.data.expiresIn,
      },
      request.headers.get("host"),
    );

    return response;
  } catch {
    return NextResponse.json(
      { message: options.unexpectedErrorMessage },
      { status: 500 },
    );
  }
}
