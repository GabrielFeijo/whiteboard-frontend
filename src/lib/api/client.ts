export { api, apiFetch, API_URL, WS_URL, getApiErrorMessage } from "./axios-client";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: { message?: string; error?: string; statusCode?: number } | null,
  ) {
    const detail = Array.isArray(problem?.message)
      ? problem.message.join(", ")
      : problem?.message || problem?.error || `HTTP ${status}`;
    super(detail);
  }
}
