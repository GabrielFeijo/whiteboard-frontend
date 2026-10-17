import { Suspense } from "react";
import Link from "next/link";
import { LandingHeader } from "@/components/layout/landing-header";
import { Button } from "@/components/ui/button";
import { getServerTranslator } from "@/i18n/server";

async function LandingContent() {
  const { t } = await getServerTranslator();

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-primary selection:bg-accent-primary/20 selection:text-accent-primary">
      <LandingHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-border-subtle)_0%,transparent_70%)] opacity-40 pointer-events-none" />

          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-1 text-xs font-medium text-text-secondary shadow-2xs mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t("landing.hero.badge")}</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-text-primary sm:text-6xl sm:leading-[1.15]">
              {t("landing.hero.title")}
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base text-text-secondary sm:text-lg">
              {t("landing.hero.description")}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/boards">
                <Button variant="primary" size="lg" className="px-6 h-11 text-sm font-medium">
                  {t("landing.hero.openDashboard")}
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg" className="px-6 h-11 text-sm font-medium">
                  {t("landing.hero.signIn")}
                </Button>
              </Link>
            </div>

            <div className="mt-14 relative mx-auto rounded-2xl border border-border-strong bg-surface p-3 shadow-2xl">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border-subtle bg-canvas">
                <div
                  className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                    color: "var(--color-text-muted)",
                  }}
                />

                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  <div className="mx-auto flex items-center gap-1.5 rounded-xl border border-border-strong bg-surface-raised px-2.5 py-1.5 shadow-md">
                    <span className="rounded-lg bg-accent-primary p-1 text-white">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 3l7 18 3-7 7-3L3 3z" />
                      </svg>
                    </span>
                    <span className="p-1 text-text-muted">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                      </svg>
                    </span>
                    <span className="p-1 text-text-muted">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    </span>
                    <span className="p-1 text-text-muted">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      </svg>
                    </span>
                  </div>

                  <div className="relative h-full w-full flex items-center justify-around">
                    <div className="rounded-lg border border-amber-300 bg-amber-100 p-4 shadow-sm w-44 text-left dark:bg-amber-950/40 dark:border-amber-800">
                      <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                        ⚡ {t("landing.preview.noteTitle")}
                      </span>
                      <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
                        {t("landing.preview.noteBody")}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="h-20 w-36 rounded-xl border-2 border-accent-primary bg-accent-subtle/50 flex items-center justify-center text-xs font-semibold text-accent-primary shadow-xs">
                        {t("landing.preview.restApi")}
                      </div>
                      <div className="text-text-muted flex items-center">
                        <span className="h-0.5 w-12 bg-border-strong inline-block" />
                        <span className="text-xs">▶</span>
                      </div>
                      <div className="h-20 w-36 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 flex items-center justify-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-xs">
                        {t("landing.preview.collabServer")}
                      </div>
                    </div>

                    <div className="absolute top-1/4 left-1/3 flex items-center gap-1.5 animate-bounce">
                      <svg
                        className="h-5 w-5 text-accent-primary"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M3 3l7 18 3-7 7-3L3 3z" />
                      </svg>
                      <span className="rounded-full bg-accent-primary px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                        Alice (Editor)
                      </span>
                    </div>

                    <div className="absolute bottom-1/4 right-1/4 flex items-center gap-1.5">
                      <svg
                        className="h-5 w-5 text-purple-500"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M3 3l7 18 3-7 7-3L3 3z" />
                      </svg>
                      <span className="rounded-full bg-purple-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                        Bruno
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border-subtle py-6 bg-surface text-center text-xs text-text-muted">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{t("landing.footer.brand")}</span>
          <span>{t("landing.footer.rights")}</span>
        </div>
      </footer>
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
