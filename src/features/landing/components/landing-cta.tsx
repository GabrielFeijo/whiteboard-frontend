import type React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getServerTranslator } from "@/i18n/server";

export async function LandingCta() {
  const { t } = await getServerTranslator();

  return (
    <section className="relative py-16 sm:py-24 border-t border-border-subtle/80 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--color-accent-primary)_0%,transparent_60%)] opacity-[0.08] dark:opacity-[0.14] pointer-events-none" />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
          {t("landing.cta.title")}
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-text-secondary leading-relaxed">
          {t("landing.cta.subtitle")}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register">
            <Button variant="primary" size="lg" className="px-7 h-11 text-sm font-semibold shadow-md gap-2">
              <Sparkles className="h-4 w-4" />
              <span>{t("landing.cta.primary")}</span>
            </Button>
          </Link>
          <Link href="/boards">
            <Button variant="secondary" size="lg" className="px-6 h-11 text-sm font-medium gap-2">
              <span>{t("landing.cta.secondary")}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
