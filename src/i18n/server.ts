import { cookies, headers } from "next/headers";
import { COOKIE_NAMES } from "@/lib/cookies/cookie-storage";
import { Locale } from "./types";
import { createTranslator, dictionaries, isValidLocale, TranslateFn } from "./translator";

export function parseAcceptLanguage(acceptLanguageHeader?: string | null): Locale {
  if (!acceptLanguageHeader) return "pt";

  const entries = acceptLanguageHeader
    .split(",")
    .map((item) => {
      const [lang, qPart] = item.trim().split(";");
      const q =
        qPart && qPart.trim().startsWith("q=")
          ? parseFloat(qPart.trim().slice(2)) || 0
          : 1.0;
      return { lang: lang.toLowerCase(), q };
    })
    .sort((a, b) => b.q - a.q);

  for (const entry of entries) {
    if (entry.lang.startsWith("en")) return "en";
    if (entry.lang.startsWith("pt")) return "pt";
  }
  return "pt";
}

export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const stored = cookieStore.get(COOKIE_NAMES.LOCALE)?.value;
    if (isValidLocale(stored)) {
      return stored;
    }

    const headerStore = await headers();
    const acceptLang = headerStore.get("accept-language");
    return parseAcceptLanguage(acceptLang);
  } catch {
    return "pt";
  }
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
