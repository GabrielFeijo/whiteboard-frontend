import { z } from "zod";
import { BACKEND_API_V1_URL } from "@/lib/env";
import { getServerAuthTokens } from "@/server/auth/cookies";

export const UserSchema = z.object({
  id: z.string(),
  email: z.email(),
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

const inFlightRefreshRequests = new Map<string, Promise<AuthBackendResponse | null>>();

export async function refreshTokensWithBackend(
  refreshToken: string,
): Promise<AuthBackendResponse | null> {
  const existing = inFlightRefreshRequests.get(refreshToken);
  if (existing) {
    return existing;
  }

  const refreshPromise = (async (): Promise<AuthBackendResponse | null> => {
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
    } finally {
      inFlightRefreshRequests.delete(refreshToken);
    }
  })();

  inFlightRefreshRequests.set(refreshToken, refreshPromise);
  return refreshPromise;
}

export interface ServerFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  schema?: z.ZodType;
}

async function extractErrorMessage(response: Response): Promise<string> {
  const errorMsg = `HTTP ${response.status}`;
  try {
    const errBody: unknown = await response.json();
    if (errBody && typeof errBody === "object" && "message" in errBody) {
      const msg = (errBody as { message?: unknown }).message;
      return Array.isArray(msg) ? msg.join(", ") : String(msg);
    }
  } catch {
    return response.statusText || errorMsg;
  }
  return errorMsg;
}

function parseResponsePayload<T>(
  json: unknown,
  schema?: z.ZodType,
): { ok: true; data: T } | { ok: false; error: string } {
  if (!schema) {
    return { ok: true, data: json as T };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: "Invalid upstream response schema" };
  }
  return { ok: true, data: parsed.data as T };
}

export async function serverBackendFetch<T>(
  path: string,
  options: ServerFetchOptions = {},
): Promise<{ ok: true; status: number; data: T } | { ok: false; status: number; error: string }> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${BACKEND_API_V1_URL}${normalizedPath}`;
  const { accessToken } = await getServerAuthTokens();

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
    const response = await executeRequest(accessToken);

    if (!response.ok) {
      const errorMsg = await extractErrorMessage(response);
      return { ok: false, status: response.status, error: errorMsg };
    }

    if (response.status === 204) {
      return { ok: true, status: 204, data: null as T };
    }

    const json: unknown = await response.json();
    const parsedPayload = parseResponsePayload<T>(json, options.schema);
    if (!parsedPayload.ok) {
      return { ok: false, status: 500, error: parsedPayload.error };
    }

    return { ok: true, status: response.status, data: parsedPayload.data };
  } catch (err) {
    return {
      ok: false,
      status: 503,
      error: err instanceof Error ? err.message : "Backend unreachable",
    };
  }
}
