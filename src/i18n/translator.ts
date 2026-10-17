import { Locale, TranslationKey, Translations } from "./types";
import pt from "./locales/pt.json";
import en from "./locales/en.json";

export { pt, en };
export type { Locale, TranslationKey, Translations };

export const dictionaries: Record<Locale, Translations> = {
  pt,
  en,
};

export function isValidLocale(value: unknown): value is Locale {
  return value === "pt" || value === "en";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getNestedValue(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (isRecord(current) && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

export function interpolate(
  text: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return text;
  let result = text;
  for (const [key, val] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(val));
  }
  return result;
}

export type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

export function createTranslator(locale: Locale): TranslateFn {
  return (key: TranslationKey, params?: Record<string, string | number>): string => {
    const currentDict = dictionaries[locale];
    const fallbackDict = dictionaries.en;
    const message =
      getNestedValue(currentDict, key) ??
      getNestedValue(fallbackDict, key) ??
      key;
    return interpolate(message, params);
  };
}
