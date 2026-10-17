import { z } from "zod";
import { BACKEND_API_V1_URL } from "@/lib/env";
import { getServerAuthTokens } from "@/server/auth/cookies";

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export const AuthBackendResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresIn: z.number().optional(),
});

export type AuthBackendResponse = z.infer<typeof AuthBackendResponseSchema>;

export async function refreshTokensWithBackend(
  refreshToken: string,
): Promise<AuthBackendResponse | null> {
  try {
    const response = await fetch(`${BACKEND_API_V1_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const raw: unknown = await response.json();
    const parsed = AuthBackendResponseSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export interface ServerFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  schema?: z.ZodTypeAny;
}

export async function serverBackendFetch<T>(
  path: string,
  options: ServerFetchOptions = {},
): Promise<{ ok: true; status: number; data: T } | { ok: false; status: number; error: string }> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${BACKEND_API_V1_URL}${normalizedPath}`;
  const { accessToken, refreshToken } = await getServerAuthTokens();

  const executeRequest = async (token: string | null) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...options.headers,
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers,
      cache: options.cache ?? "no-store",
    });
  };

  try {
    let response = await executeRequest(accessToken);

    if ((response.status === 401 || !accessToken) && refreshToken) {
      const refreshed = await refreshTokensWithBackend(refreshToken);
      if (refreshed?.accessToken) {
        response = await executeRequest(refreshed.accessToken);
      }
    }

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errBody: unknown = await response.json();
        if (errBody && typeof errBody === "object" && "message" in errBody) {
          const msg = (errBody as { message?: unknown }).message;
          errorMsg = Array.isArray(msg) ? msg.join(", ") : String(msg);
        }
      } catch {
        void 0;
      }
      return { ok: false, status: response.status, error: errorMsg };
    }

    if (response.status === 204) {
      return { ok: true, status: 204, data: undefined as T };
    }

    const json: unknown = await response.json();
    if (options.schema) {
      const parsed = options.schema.safeParse(json);
      if (!parsed.success) {
        return { ok: false, status: 500, error: "Invalid upstream response schema" };
      }
      return { ok: true, status: response.status, data: parsed.data as T };
    }

    return { ok: true, status: response.status, data: json as T };
  } catch (err) {
    return {
      ok: false,
      status: 503,
      error: err instanceof Error ? err.message : "Backend unreachable",
    };
  }
}
