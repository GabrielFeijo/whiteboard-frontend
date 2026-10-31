"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { AppLogo } from "@/components/brand";
import { LanguageSwitcher } from "@/components/preferences/language-switcher";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useI18n } from "@/i18n/context";

export function LandingHeader() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center transition-opacity hover:opacity-90">
          <AppLogo size="md" textClassName="hidden sm:inline" />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href="/login" className="hidden md:inline-flex">
            <Button variant="ghost" size="sm" className="whitespace-nowrap">
              {t("landing.hero.signIn")}
            </Button>
          </Link>
          <Link href="/boards">
            <Button
              variant="primary"
              size="sm"
              className="gap-1.5 shadow-2xs whitespace-nowrap px-2.5 sm:px-3"
              aria-label={t("landing.hero.openDashboard")}
            >
              <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline text-xs">
                {t("landing.hero.openDashboard")}
              </span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
