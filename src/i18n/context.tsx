"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { Locale, TranslationKey, Translations } from "./types";
import pt from "./locales/pt.json";
import en from "./locales/en.json";

const dictionaries: Record<Locale, Translations> = {
  pt,
  en,
};

const STORAGE_KEY = "wb_locale";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  let result = text;
  for (const [key, val] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(val));
  }
  return result;
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "pt";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "pt" || stored === "en") {
      return stored;
    }
    const browserLang = navigator.language?.toLowerCase();
    if (browserLang && browserLang.startsWith("pt")) {
      return "pt";
    }
    if (browserLang && browserLang.startsWith("en")) {
      return "en";
    }
  } catch (err) {
    console.warn("Failed to read locale from localStorage:", err);
  }
  return "pt";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    document.documentElement.lang = dictionaries[locale].common.dateLocale;
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = dictionaries[newLocale].common.dateLocale;
    } catch (err) {
      console.warn("Failed to save locale to localStorage:", err);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const currentDict = dictionaries[locale];
      const fallbackDict = dictionaries.en;

      const message = getNestedValue(currentDict, key) ?? getNestedValue(fallbackDict, key) ?? key;
      return interpolate(message, params);
    },
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const fallbackT = (key: TranslationKey, params?: Record<string, string | number>) => {
      const msg = getNestedValue(pt, key) ?? key;
      return interpolate(msg, params);
    };
    return {
      locale: "pt",
      setLocale: () => {},
      t: fallbackT,
    };
  }
  return ctx;
}
