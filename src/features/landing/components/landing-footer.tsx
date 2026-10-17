import type React from "react";
import Link from "next/link";
import { AppLogo } from "@/components/brand";
import { LanguageSwitcher } from "@/components/preferences/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getServerTranslator } from "@/i18n/server";

export async function LandingFooter() {
  const { t } = await getServerTranslator();

  return (
    <footer className="border-t border-border-subtle bg-surface/70 py-10 sm:py-12 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-border-subtle/80">
          <div className="space-y-2 max-w-sm">
            <AppLogo size="md" />
            <p className="text-xs text-text-muted leading-relaxed">
              {t("landing.footer.brand")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-text-secondary font-medium">
            <Link href="/boards" className="hover:text-text-primary transition-colors">
              {t("landing.footer.links.dashboard")}
            </Link>
            <Link href="/login" className="hover:text-text-primary transition-colors">
              {t("landing.footer.links.login")}
            </Link>
            <Link href="/register" className="hover:text-text-primary transition-colors">
              {t("landing.footer.links.register")}
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <LanguageSwitcher variant="compact" />
            <ThemeToggle />
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {t("landing.footer.status")}
            </span>
          </div>

          <p>{t("landing.footer.rights")}</p>
        </div>
      </div>
    </footer>
  );
}
