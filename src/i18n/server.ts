import { cookies, headers } from "next/headers";
import { COOKIE_NAMES } from "@/lib/cookies/cookie-storage";
import { Locale } from "./types";
import { createTranslator, dictionaries, isValidLocale, TranslateFn } from "./translator";

export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const stored = cookieStore.get(COOKIE_NAMES.LOCALE)?.value;
    if (isValidLocale(stored)) {
      return stored;
    }

    const headerStore = await headers();
    const acceptLang = headerStore.get("accept-language")?.toLowerCase() ?? "";
    if (acceptLang.startsWith("en")) {
      return "en";
    }
  } catch {
    void 0;
  }
  return "pt";
}

export async function getServerI18n(): Promise<{
  locale: Locale;
  htmlLang: string;
  t: TranslateFn;
}> {
  const locale = await getServerLocale();
  return {
    locale,
    htmlLang: dictionaries[locale].common.app.dateLocale,
    t: createTranslator(locale),
  };
}

export const getServerTranslator = getServerI18n;
