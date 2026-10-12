"use client";

import React from "react";
import { useI18n, Locale } from "../i18n";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "pill" | "compact";
}

const LANGUAGES: { code: Locale; flag: string; label: string }[] = [
  { code: "pt", flag: "🇧🇷", label: "PT" },
  { code: "en", flag: "🇺🇸", label: "EN" },
];

export function LanguageSwitcher({ className = "", variant = "pill" }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();

  if (variant === "compact") {
    return (
      <div
        className={`flex items-center rounded-xl border border-zinc-200/80 bg-white/95 p-0.5 shadow-xs backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/95 ${className}`}
        title={t("language.selectLanguage")}
      >
        {LANGUAGES.map((lang) => {
          const isActive = locale === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLocale(lang.code)}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                isActive
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
      title={t("language.selectLanguage")}
    >
      {LANGUAGES.map((lang) => {
        const isActive = locale === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLocale(lang.code)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              isActive
                ? "bg-indigo-600 text-white font-semibold shadow-xs"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        );
      })}
    </div>
  );
}
