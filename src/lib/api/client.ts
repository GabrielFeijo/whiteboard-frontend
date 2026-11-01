import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { BACKEND_API_V1_URL, BFF_API_BASE_PATH, WS_COLLAB_URL } from "@/lib/env";
import { COOKIE_NAMES, getClientCookie } from "@/lib/cookies/cookie-storage";
import { dictionaries, type Locale } from "@/i18n/translator";

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

const RAW_TECHNICAL_PATTERNS = [
  /Request failed with status code \d+/i,
  /Network Error/i,
  /AxiosError/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /timeout of \d+ms exceeded/i,
  /Internal server error/i,
  /Prisma/i,
  /P20\d\d/i,
  /\[object Object\]/i,
  /TypeError/i,
  /UnhandledPromise/i,
];

type ApiDomainKey = keyof typeof dictionaries.pt.apiErrors.domain;
type ApiStatusKey = keyof typeof dictionaries.pt.apiErrors.status;

const KNOWN_ERROR_TO_DOMAIN_KEY: Record<string, ApiDomainKey> = {
  "Access denied to board": "accessDenied",
  "Invalid or revoked share link": "invalidOrRevokedShareLink",
  "Share link has expired": "shareLinkExpired",
  "Authentication or share link required": "authOrShareLinkRequired",
  "Board not found": "boardNotFound",
  "User not found": "userNotFound",
  "User with this email already exists": "userEmailExists",
  "Invalid credentials": "invalidCredentials",
  "Invalid email or password": "invalidCredentials",
  "Resource already exists with conflicting unique constraint": "resourceConflict",
  "This resource already exists": "resourceConflict",
  "Requested record was not found": "recordNotFound",
  "Invalid relation reference": "invalidRelation",
  "Viewers cannot rename board": "viewersCannotRename",
  "Only the board owner can delete it": "ownerOnlyDelete",
  "Only owner can add members directly": "ownerOnlyAddMembers",
  "Only owner can remove members": "ownerOnlyRemoveMembers",
  "Only editors or owners can create share links": "editorOrOwnerShareLinks",
  "Only owner can revoke links": "ownerOnlyRevokeLinks",
  "Only owners and editors can create snapshots": "editorOrOwnerSnapshots",
  "Only owners and editors can restore snapshots": "editorOrOwnerRestore",
  "Viewers cannot upload assets": "viewersCannotUpload",
  "Stored asset MIME type is not allowed": "invalidAssetMime",
  "Unsupported asset MIME type": "unsupportedAssetMime",
};

export function resolveActiveLocale(): Locale {
  if (typeof document !== "undefined") {
    const docLang = document.documentElement?.lang;
    if (docLang && docLang.toLowerCase().startsWith("en")) {
      return "en";
    }
    const cookie = getClientCookie(COOKIE_NAMES.LOCALE);
    if (cookie === "en") {
      return "en";
    }
  }
  return "pt";
}

function isRawTechnicalMessage(msg: string): boolean {
  return RAW_TECHNICAL_PATTERNS.some((pattern) => pattern.test(msg));
}

function translateDomainMessage(msg: string, locale: Locale): string | null {
  const domainKey = KNOWN_ERROR_TO_DOMAIN_KEY[msg];
  if (domainKey) {
    return dictionaries[locale].apiErrors.domain[domainKey];
  }

  if (msg.includes("Insufficient permissions")) {
    if (msg.includes("[owner]")) {
      return dictionaries[locale].apiErrors.permissions.ownerOnly;
    }
    return dictionaries[locale].apiErrors.permissions.editorOrOwner;
  }

  return null;
}

function extractAxiosErrorMessage(
  error: AxiosError<ApiProblem>,
  fallback: string,
  targetLocale?: Locale,
): string {
  const locale = targetLocale ?? resolveActiveLocale();
  const isNetworkFailure =
    error.code === "ERR_NETWORK" ||
    error.message === "Network Error" ||
    error.message?.toLowerCase().includes("timeout");

  if (isNetworkFailure) {
    return dictionaries[locale].apiErrors.network;
  }

  const data = error.response?.data;
  const rawMsg = data?.message
    ? Array.isArray(data.message)
      ? data.message.join(", ")
      : data.message
    : data?.error;

  if (rawMsg) {
    const translated = translateDomainMessage(rawMsg, locale);
    if (translated) {
      return translated;
    }
    if (!isRawTechnicalMessage(rawMsg)) {
      return rawMsg;
    }
  }

  if (fallback && !isRawTechnicalMessage(fallback) && fallback !== "An unexpected error occurred") {
    return fallback;
  }

  const status = error.response?.status;
  if (status) {
    const statusKey = String(status) as ApiStatusKey;
    const mappedStatus = dictionaries[locale].apiErrors.status[statusKey];
    if (mappedStatus) {
      return mappedStatus;
    }
  }

  return dictionaries[locale].apiErrors.generic;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred",
  locale?: Locale,
): string {
  const activeLocale = locale ?? resolveActiveLocale();

  if (axios.isAxiosError<ApiProblem>(error)) {
    return extractAxiosErrorMessage(error, fallback, activeLocale);
  }

  if (error instanceof Error) {
    const translated = translateDomainMessage(error.message, activeLocale);
    if (translated) {
      return translated;
    }
    if (!isRawTechnicalMessage(error.message)) {
      return error.message;
    }
  }

  if (typeof error === "string") {
    const translated = translateDomainMessage(error, activeLocale);
    if (translated) {
      return translated;
    }
    if (!isRawTechnicalMessage(error)) {
      return error;
    }
  }

  if (fallback && !isRawTechnicalMessage(fallback) && fallback !== "An unexpected error occurred") {
    return fallback;
  }

  return dictionaries[activeLocale].apiErrors.generic;
}

function parseRequestBody(body: unknown): unknown {
  if (typeof body !== "string") {
    return body;
  }
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export interface ApiFetchOptions extends AxiosRequestConfig {
  body?: unknown;
}

export async function apiFetch<T>(path: string, init?: ApiFetchOptions): Promise<T> {
  const { body, ...config } = init || {};
  const data = config.data !== undefined ? config.data : parseRequestBody(body);

  const response = await api.request<T>({
    url: path.startsWith("/") ? path : `/${path}`,
    ...config,
    data,
  });
  return response.data;
}
