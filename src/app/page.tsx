import { Suspense } from "react";
import Link from "next/link";
import { LandingHeader } from "@/components/layout/landing-header";
import { Button } from "@/components/ui/button";
import {
  FeaturesGrid,
  HeroCanvasInteractive,
  LandingCta,
  LandingFooter,
  UseCasesGrid,
} from "@/features/landing/components";
import { getServerTranslator } from "@/i18n/server";

async function LandingContent() {
  const { t } = await getServerTranslator();

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-primary selection:bg-accent-primary/20 selection:text-accent-primary">
      <LandingHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden py-14 sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-border-subtle)_0%,transparent_70%)] opacity-40 pointer-events-none" />

          <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3.5 py-1 text-xs font-semibold text-text-secondary shadow-2xs mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t("landing.hero.badge")}</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-text-primary sm:text-6xl sm:leading-[1.12]">
              {t("landing.hero.title")}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base text-text-secondary sm:text-lg leading-relaxed">
              {t("landing.hero.description")}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/boards">
                <Button variant="primary" size="lg" className="px-7 h-11 text-sm font-semibold shadow-md">
                  {t("landing.hero.openDashboard")}
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg" className="px-6 h-11 text-sm font-medium">
                  {t("landing.hero.signIn")}
                </Button>
              </Link>
            </div>

            <p className="mt-3 text-xs text-text-muted">
              {t("landing.hero.subnote")}
            </p>

            <div className="mt-12">
              <HeroCanvasInteractive />
            </div>
          </div>
        </section>

        <FeaturesGrid />
        <UseCasesGrid />
        <LandingCta />
      </main>

      <LandingFooter />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <LandingContent />
    </Suspense>
  );
}
