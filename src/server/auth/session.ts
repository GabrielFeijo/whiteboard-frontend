import { redirect } from "next/navigation";
import { getServerAuthTokens } from "@/server/auth/cookies";
import {
  serverBackendFetch,
  User,
  UserSchema,
} from "@/server/http/backend-client";

export type { User };
export type SessionUser = User;

export async function getCurrentUser(): Promise<User | null> {
  const { accessToken } = await getServerAuthTokens();
  if (!accessToken) {
    return null;
  }

  const meResult = await serverBackendFetch<User>("/auth/me", {
    method: "GET",
    schema: UserSchema,
  });

  if (meResult.ok) {
    return meResult.data;
  }

  return null;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?expired=1");
  }
  return user;
}
