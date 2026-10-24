import { NextRequest, NextResponse } from "next/server";
import { proxyAuthMutation } from "@/server/auth/cookies";

export async function POST(request: NextRequest): Promise<NextResponse> {
  return proxyAuthMutation(request, {
    endpoint: "/auth/login",
    successStatus: 200,
    fallbackAuthErrorMessage: "Authentication failed",
    invalidSchemaMessage: "Invalid authentication response from server",
    unexpectedErrorMessage: "Unable to process login request",
  });
}
