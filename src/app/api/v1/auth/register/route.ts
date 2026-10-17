import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_V1_URL } from "@/lib/env";
import { applyAuthCookiesToResponse } from "@/server/auth/cookies";
import { AuthBackendResponseSchema } from "@/server/http/backend-client";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    const upstreamRes = await fetch(`${BACKEND_API_V1_URL}/auth/register`, {
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
        data ?? { message: "Registration failed" },
        { status: upstreamRes.status },
      );
    }

    const parsed = AuthBackendResponseSchema.safeParse(data);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid registration response from server" },
        { status: 502 },
      );
    }

    const response = NextResponse.json(
      { user: parsed.data.user },
      { status: 201 },
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
      { message: "Unable to process registration request" },
      { status: 500 },
    );
  }
}
