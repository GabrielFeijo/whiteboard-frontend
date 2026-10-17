import axios, { AxiosRequestConfig } from "axios";
import { BACKEND_API_V1_URL, BFF_API_BASE_PATH, WS_COLLAB_URL } from "@/lib/env";

export const API_URL = BACKEND_API_V1_URL;
export const WS_URL = WS_COLLAB_URL;

export const api = axios.create({
  baseURL: BFF_API_BASE_PATH,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const apiClient = api;

export interface ApiProblem {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ApiProblem | null,
  ) {
    const detail = Array.isArray(problem?.message)
      ? problem.message.join(", ")
      : problem?.message || problem?.error || `HTTP ${status}`;
    super(detail);
  }
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred"
): string {
  if (axios.isAxiosError<ApiProblem>(error)) {
    const data = error.response?.data;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(", ") : data.message;
    }
    if (data?.error) {
      return data.error;
    }
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export interface ApiFetchOptions extends AxiosRequestConfig {
  body?: unknown;
}

export async function apiFetch<T>(path: string, init?: ApiFetchOptions): Promise<T> {
  const { body, ...config } = init || {};
  let data: unknown = config.data;
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
