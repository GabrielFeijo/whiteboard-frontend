/** Base URLs públicas (embutidas no build). O cliente tipado completo vem de `npm run gen:api`. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3002";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: { title?: string; detail?: string } | null,
  ) {
    super(problem?.title ?? `HTTP ${status}`);
  }
}

/** Wrapper mínimo de fetch (cookies de refresh incluídos; erros RFC 7807). */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/v1${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    throw new ApiError(res.status, await res.json().catch(() => null));
  }
  return (await res.json()) as T;
}
