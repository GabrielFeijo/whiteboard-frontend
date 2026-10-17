import type React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getServerTranslator } from "@/i18n/server";

export async function LandingCta() {
  const { t } = await getServerTranslator();

  return (
    <section className="relative py-16 sm:py-24 border-t border-border-subtle/80 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--color-accent-primary)_0%,transparent_60%)] opacity-[0.08] dark:opacity-[0.14] pointer-events-none" />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-accent-primary/30 bg-accent-subtle/60 px-3 py-1 text-xs font-semibold text-accent-primary shadow-2xs mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-primary animate-pulse" />
          <span>{t("landing.cta.badge")}</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
          {t("landing.cta.title")}
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-text-secondary leading-relaxed">
          {t("landing.cta.subtitle")}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register">
            <Button variant="primary" size="lg" className="px-7 h-11 text-sm font-semibold shadow-md">
              {t("landing.cta.primary")}
            </Button>
          </Link>
          <Link href="/boards">
            <Button variant="secondary" size="lg" className="px-6 h-11 text-sm font-medium">
              {t("landing.cta.secondary")}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
