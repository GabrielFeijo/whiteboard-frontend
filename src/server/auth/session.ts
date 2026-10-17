import { redirect } from "next/navigation";
import { getServerAuthTokens } from "@/server/auth/cookies";
import {
  refreshTokensWithBackend,
  serverBackendFetch,
  User,
  UserSchema,
} from "@/server/http/backend-client";

export type { User };
export type SessionUser = User;

export async function getCurrentUser(): Promise<User | null> {
  const { accessToken, refreshToken } = await getServerAuthTokens();
  if (!accessToken && !refreshToken) {
    return null;
  }

  const meResult = await serverBackendFetch<User>("/auth/me", {
    method: "GET",
    schema: UserSchema,
  });

  if (meResult.ok) {
    return meResult.data;
  }

  if (refreshToken) {
    const refreshed = await refreshTokensWithBackend(refreshToken);
    if (refreshed?.user) {
      return refreshed.user;
    }
  }

  return null;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
