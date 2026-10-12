import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../../store/auth-store";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3002";

export const api = axios.create({
  baseURL: `${API_URL}/v1`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (token: string | null, error: unknown = null) => {
  failedQueue.forEach((promise) => {
    if (token) {
      promise.resolve(token);
    } else {
      promise.reject(error);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (
    error: AxiosError<{ message?: string | string[]; error?: string; statusCode?: number }>,
  ) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || "";
    const isAuthEndpoint =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshed = await useAuthStore.getState().refreshSession();
        const newToken = useAuthStore.getState().accessToken;
        isRefreshing = false;

        if (refreshed && newToken) {
          processQueue(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          processQueue(null, error);
          return Promise.reject(error);
        }
      } catch (refreshErr) {
        isRefreshing = false;
        processQueue(null, refreshErr);
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(", ") : data.message;
    }
    if (data?.error) {
      return data.error;
    }
    return error.message || "Request failed";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

export interface ApiFetchOptions extends AxiosRequestConfig {
  body?: unknown;
}

export async function apiFetch<T>(path: string, init?: ApiFetchOptions): Promise<T> {
  const { body, ...config } = init || {};
  let data = config.data;
  if (body !== undefined && data === undefined) {
    if (typeof body === "string") {
      try {
        data = JSON.parse(body);
      } catch {
        data = body;
      }
    } else {
      data = body;
    }
  }

  const response = await api.request<T>({
    url: path.startsWith("/") ? path : `/${path}`,
    ...config,
    data,
  });
  return response.data;
}
