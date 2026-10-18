import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/cookies/cookie-storage";
import { BACKEND_API_V1_URL } from "@/lib/env";
import {
  applyAuthCookiesToResponse,
  clearAuthCookiesFromResponse,
  AuthTokenPair,
} from "@/server/auth/cookies";
import { refreshTokensWithBackend } from "@/server/http/backend-client";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

function buildForwardHeaders(
  contentType: string | null,
  hasBody: boolean,
  token: string | null,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers["Content-Type"] = contentType;
  } else if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function attemptTokenRefresh(
  refreshToken: string,
): Promise<{ accessToken: string; rotatedTokens: AuthTokenPair } | null> {
  const refreshed = await refreshTokensWithBackend(refreshToken);
  if (!refreshed) {
    return null;
  }
  return {
    accessToken: refreshed.accessToken,
    rotatedTokens: {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? refreshToken,
      expiresIn: refreshed.expiresIn,
    },
  };
}

async function buildProxyResponse(
  upstreamRes: Response,
  rotatedTokens: AuthTokenPair | null,
  refreshToken: string | null,
  hostHeader: string | null,
): Promise<NextResponse> {
  if (upstreamRes.status === 204) {
    const emptyResponse = new NextResponse(null, { status: 204 });
    if (rotatedTokens) {
      applyAuthCookiesToResponse(emptyResponse, rotatedTokens, hostHeader);
    }
    return emptyResponse;
  }

  const responseText = await upstreamRes.text();
  const contentType = upstreamRes.headers.get("content-type") ?? "application/json";

  const nextRes = new NextResponse(responseText, {
    status: upstreamRes.status,
    headers: {
      "Content-Type": contentType,
    },
  });

  if (rotatedTokens) {
    applyAuthCookiesToResponse(nextRes, rotatedTokens, hostHeader);
  } else if (upstreamRes.status === 401 && refreshToken) {
    clearAuthCookiesFromResponse(nextRes, hostHeader);
  }

  return nextRes;
}

async function handleProxyRequest(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { path } = await context.params;
  const subPath = path.join("/");
  const search = request.nextUrl.search;
  const targetUrl = `${BACKEND_API_V1_URL}/${subPath}${search}`;
  const hostHeader = request.headers.get("host");

  let accessToken = request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value ?? null;
  const refreshToken = request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value ?? null;
  let rotatedTokens: AuthTokenPair | null = null;

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const rawBody = hasBody ? await request.text() : undefined;

  const forwardToBackend = async (token: string | null) => {
    const headers = buildForwardHeaders(
      request.headers.get("content-type"),
      hasBody,
      token,
    );
    return fetch(targetUrl, {
      method: request.method,
      headers,
      body: hasBody && rawBody ? rawBody : undefined,
      cache: "no-store",
    });
  };

  try {
    if (!accessToken && refreshToken) {
      const refreshResult = await attemptTokenRefresh(refreshToken);
      if (refreshResult) {
        accessToken = refreshResult.accessToken;
        rotatedTokens = refreshResult.rotatedTokens;
      }
    }

    let upstreamRes = await forwardToBackend(accessToken);

    if (upstreamRes.status === 401 && refreshToken && !rotatedTokens) {
      const refreshResult = await attemptTokenRefresh(refreshToken);
      if (refreshResult) {
        accessToken = refreshResult.accessToken;
        rotatedTokens = refreshResult.rotatedTokens;
        upstreamRes = await forwardToBackend(accessToken);
      }
    }

    return await buildProxyResponse(upstreamRes, rotatedTokens, refreshToken, hostHeader);
  } catch (err) {
    return NextResponse.json(
      {
        message:
          err instanceof Error ? err.message : "Failed to communicate with upstream API",
      },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handleProxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleProxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleProxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleProxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleProxyRequest(request, context);
}
