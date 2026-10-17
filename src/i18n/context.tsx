"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { COOKIE_NAMES, setClientCookie } from "@/lib/cookies/cookie-storage";
import { Locale } from "./types";
import {
  createTranslator,
  dictionaries,
  isValidLocale,
  TranslateFn,
} from "./translator";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveInitialClientLocale(initialLocale?: Locale): Locale {
  if (initialLocale && isValidLocale(initialLocale)) {
    return initialLocale;
  }
  return "pt";
}

export interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [prevInitialLocale, setPrevInitialLocale] = useState(initialLocale);
  const [locale, setLocaleState] = useState<Locale>(() =>
    resolveInitialClientLocale(initialLocale),
  );

  if (initialLocale && isValidLocale(initialLocale) && initialLocale !== prevInitialLocale) {
    setPrevInitialLocale(initialLocale);
    setLocaleState(initialLocale);
  }

  useEffect(() => {
    document.documentElement.lang = dictionaries[locale].common.app.dateLocale;
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setClientCookie(COOKIE_NAMES.LOCALE, newLocale);
    if (typeof document !== "undefined") {
      document.documentElement.lang = dictionaries[newLocale].common.app.dateLocale;
    }
  }, []);

  const t = useMemo(() => createTranslator(locale), [locale]);

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

const defaultTranslator = createTranslator("pt");

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: "pt",
      setLocale: () => {},
      t: defaultTranslator,
    };
  }
  return ctx;
}
