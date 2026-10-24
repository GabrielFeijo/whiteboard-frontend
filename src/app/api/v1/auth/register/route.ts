import { NextRequest, NextResponse } from "next/server";
import { proxyAuthMutation } from "@/server/auth/cookies";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return proxyAuthMutation(request, {
    endpoint: "/auth/register",
    successStatus: 201,
    fallbackAuthErrorMessage: "Registration failed",
    invalidSchemaMessage: "Invalid registration response from server",
    unexpectedErrorMessage: "Unable to process registration request",
  });
}
