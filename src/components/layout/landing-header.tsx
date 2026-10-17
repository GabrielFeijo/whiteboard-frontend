"use client";

import Link from "next/link";
import { AppLogo } from "@/components/brand";
import { LanguageSwitcher } from "@/components/preferences/language-switcher";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useI18n } from "@/i18n/context";

export function LandingHeader() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center transition-opacity hover:opacity-90">
          <AppLogo size="md" />
        </Link>

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
