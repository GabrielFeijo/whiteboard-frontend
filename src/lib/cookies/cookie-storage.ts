import type { StateStorage } from "zustand/middleware";

export const COOKIE_NAMES = {
  ACCESS_TOKEN: "wb_access_token",
  REFRESH_TOKEN: "wb_refresh_token",
  THEME: "wb_theme",
  LOCALE: "wb_locale",
  DASHBOARD_PREFS: "wb_dashboard_prefs",
} as const;

export type CookieName = (typeof COOKIE_NAMES)[keyof typeof COOKIE_NAMES];

export interface CookieOptions {
  maxAgeSeconds?: number;
  path?: string;
  sameSite?: "Lax" | "Strict" | "None";
}

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function parseCookieString(
  cookieHeader: string | undefined | null,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`));
  if (!match || match[1] === undefined) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function getClientCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  return parseCookieString(document.cookie, name);
}

export function setClientCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): void {
  if (typeof document === "undefined") return;
  const maxAge = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  const path = options.path ?? "/";
  const sameSite = options.sameSite ?? "Lax";
  const isHttps = typeof window !== "undefined" && window.location?.protocol === "https:";
  const secureFlag = isHttps || sameSite === "None" ? "; Secure" : "";

  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; SameSite=${sameSite}${secureFlag}`;
}

export function removeClientCookie(name: string, path = "/"): void {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=; Path=${path}; Max-Age=0; SameSite=Lax`;
}

export const zustandCookieStorage: StateStorage = {
  getItem: (name: string): string | null => getClientCookie(name),
  setItem: (name: string, value: string): void => {
    setClientCookie(name, value);
  },
  removeItem: (name: string): void => {
    removeClientCookie(name);
  },
};
