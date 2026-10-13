"use client";

import type { ReactNode } from "react";
import { useI18n, Locale } from "../i18n";
import { BrazilFlagIcon, USFlagIcon } from "./icons";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "pill" | "compact";
}

const LANGUAGES: { code: Locale; icon: ReactNode; label: string }[] = [
  { code: "pt", icon: <BrazilFlagIcon />, label: "PT" },
  { code: "en", icon: <USFlagIcon />, label: "EN" },
];

export function LanguageSwitcher({ className = "", variant = "pill" }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();
  const isCompact = variant === "compact";

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-border-subtle bg-surface p-0.5 shadow-2xs ${className}`}
      title={t("language.selectLanguage")}
    >
      {LANGUAGES.map((lang) => {
        const isActive = locale === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLocale(lang.code)}
            className={`flex items-center ${isCompact ? "gap-1 px-1.5 py-0.5 text-[10px]" : "gap-1.5 px-2 py-1 text-xs"} rounded-md font-medium transition-all duration-150 select-none ${
              isActive
                ? "bg-surface-raised text-text-primary shadow-2xs border border-border-subtle/80"
                : "text-text-muted hover:text-text-primary hover:bg-surface-hover border border-transparent"
            }`}
          >
            <span className="inline-flex items-center opacity-90">{lang.icon}</span>
            <span className="font-mono text-[11px]">{lang.label}</span>
          </button>
        );
      })}
    </div>
  );
}
