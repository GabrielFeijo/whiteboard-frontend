import type React from "react";
import { getServerTranslator } from "@/i18n/server";

export async function FeaturesGrid() {
  const { t } = await getServerTranslator();

  const features = [
    {
      title: t("landing.features.crdt.title"),
      description: t("landing.features.crdt.desc"),
      icon: (
        <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="18" r="3" />
          <circle cx="6" cy="6" r="3" />
          <path d="M13 6h3a2 2 0 0 1 2 2v7" />
          <line x1="6" y1="9" x2="6" y2="21" />
        </svg>
      ),
      pill: "CRDT Engine",
    },
    {
      title: t("landing.features.canvas.title"),
      description: t("landing.features.canvas.desc"),
      icon: (
        <svg className="h-6 w-6 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      ),
      pill: "Infinite Grid",
    },
    {
      title: t("landing.features.presence.title"),
      description: t("landing.features.presence.desc"),
      icon: (
        <svg className="h-6 w-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      pill: "Live Cursors",
    },
    {
      title: t("landing.features.history.title"),
      description: t("landing.features.history.desc"),
      icon: (
        <svg className="h-6 w-6 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 14 14" />
        </svg>
      ),
      pill: "Snapshots & SVG",
    },
  ];

  return (
    <section className="relative py-16 sm:py-24 border-t border-border-subtle/60 bg-surface/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {t("landing.features.title")}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
            {t("landing.features.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((feat) => (
            <div
              key={feat.title}
              className="group relative flex flex-col justify-between rounded-2xl border border-border-strong bg-surface p-5 sm:p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-accent-primary/40"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-raised border border-border-subtle/80 shadow-2xs">
                    {feat.icon}
                  </div>
                  <span className="rounded-md border border-border-subtle bg-surface-raised px-2 py-0.5 font-mono text-[10px] font-semibold text-text-muted">
                    {feat.pill}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-text-primary tracking-tight">
                  {feat.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed">
                  {feat.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-border-subtle/60 flex items-center text-[11px] font-semibold text-accent-primary group-hover:text-accent-hover transition-colors">
                <span>Real-Time Optimized</span>
                <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
