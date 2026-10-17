"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/preferences/language-switcher";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useI18n } from "@/i18n/context";

export function LandingHeader() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
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
        </div>

        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm">
              {t("landing.hero.signIn")}
            </Button>
          </Link>
          <Link href="/boards">
            <Button variant="primary" size="sm">
              {t("landing.hero.openDashboard")}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
