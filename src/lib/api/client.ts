import { useAuthStore } from '../../store/auth-store';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3002';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: { message?: string; error?: string; statusCode?: number } | null,
  ) {
    const detail = Array.isArray(problem?.message)
      ? problem.message.join(', ')
      : problem?.message || problem?.error || `HTTP ${status}`;
    super(detail);
  }
}

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string | null) => void }> = [];

const processQueue = (token: string | null) => {
  failedQueue.forEach((prom) => prom.resolve(token));
  failedQueue = [];
};

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}/v1${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });

  // Handle 401 token refresh retry (except on login/register/refresh endpoints)
  if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register') && !path.startsWith('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      const refreshed = await useAuthStore.getState().refreshSession();
      isRefreshing = false;
      const newToken = useAuthStore.getState().accessToken;
      processQueue(refreshed ? newToken : null);
      if (refreshed && newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        const retryRes = await fetch(`${API_URL}/v1${path}`, { ...init, credentials: 'include', headers });
        if (!retryRes.ok) throw new ApiError(retryRes.status, await retryRes.json().catch(() => null));
        return (await retryRes.json()) as T;
      }
    } else {
      const waitToken = await new Promise<string | null>((resolve) => failedQueue.push({ resolve }));
      if (waitToken) {
        headers.set('Authorization', `Bearer ${waitToken}`);
        const retryRes = await fetch(`${API_URL}/v1${path}`, { ...init, credentials: 'include', headers });
        if (!retryRes.ok) throw new ApiError(retryRes.status, await retryRes.json().catch(() => null));
        return (await retryRes.json()) as T;
      }
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, await res.json().catch(() => null));
  }
  return (await res.json()) as T;
}
