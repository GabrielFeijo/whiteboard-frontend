import { cookies } from "next/headers";
import { COOKIE_NAMES } from "@/lib/cookies/cookie-storage";
import type { Theme } from "@/providers/theme-provider";

export function isValidTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export async function getServerTheme(): Promise<Theme> {
  try {
    const cookieStore = await cookies();
    const stored = cookieStore.get(COOKIE_NAMES.THEME)?.value;
    if (isValidTheme(stored)) {
      return stored;
    }
  } catch {
    return "system";
  }
  return "system";
}
