"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/preferences/language-switcher";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useI18n } from "@/i18n/context";

export function AuthHeader() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border-subtle/80 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary text-white shadow-xs">
              <svg
                className="h-4.5 w-4.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 7h10M7 12h7M7 17h4" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-text-primary">
              {t("common.app.name")}
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <LanguageSwitcher />
          <ThemeToggle />
          <div className="hidden sm:block h-4 w-px bg-border-subtle mx-0.5" />
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-text-muted hover:text-text-primary font-medium"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>{t("auth.backToHome")}</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
