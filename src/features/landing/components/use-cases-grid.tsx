import type React from "react";
import { getServerTranslator } from "@/i18n/server";

export async function UseCasesGrid() {
  const { t } = await getServerTranslator();

  const useCases = [
    {
      tag: t("landing.useCases.architecture.tag"),
      title: t("landing.useCases.architecture.title"),
      description: t("landing.useCases.architecture.desc"),
      visual: (
        <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border-subtle bg-canvas p-4 flex items-center justify-center gap-3">
          <div className="rounded-lg border border-blue-400 bg-blue-50/80 dark:bg-blue-950/40 p-2.5 text-center shadow-xs">
            <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-300">Next.js Client</span>
            <div className="mt-1 h-1 w-12 mx-auto rounded-full bg-blue-300 dark:bg-blue-700" />
          </div>
          <span className="text-text-muted text-xs font-mono">⇄</span>
          <div className="rounded-lg border border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 p-2.5 text-center shadow-xs">
            <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-300">Yjs CRDT Node</span>
            <div className="mt-1 h-1 w-12 mx-auto rounded-full bg-indigo-300 dark:bg-indigo-700" />
          </div>
        </div>
      ),
    },
    {
      tag: t("landing.useCases.brainstorming.tag"),
      title: t("landing.useCases.brainstorming.title"),
      description: t("landing.useCases.brainstorming.desc"),
      visual: (
        <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border-subtle bg-canvas p-3 flex items-center justify-around gap-2">
          <div className="w-28 rounded-lg border border-amber-300 bg-amber-100/90 dark:bg-amber-950/60 p-2 shadow-xs rotate-[-2deg]">
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-200">UX Review</span>
            <p className="text-[9px] text-amber-700 dark:text-amber-300 mt-0.5">Simplify share modal tabs</p>
          </div>
          <div className="w-28 rounded-lg border border-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/60 p-2 shadow-xs rotate-[3deg]">
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-200">Performance</span>
            <p className="text-[9px] text-emerald-700 dark:text-emerald-300 mt-0.5">Spatial indexing pass</p>
          </div>
        </div>
      ),
    },
    {
      tag: t("landing.useCases.wireframes.tag"),
      title: t("landing.useCases.wireframes.title"),
      description: t("landing.useCases.wireframes.desc"),
      visual: (
        <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border-subtle bg-canvas p-4 flex flex-col justify-center items-center">
          <div className="w-48 rounded-lg border border-border-strong bg-surface p-2 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between border-b border-border-subtle pb-1">
              <div className="h-1.5 w-10 bg-border-strong rounded" />
              <div className="h-2 w-2 rounded-full bg-accent-primary" />
            </div>
            <div className="h-3 w-full bg-surface-raised rounded border border-border-subtle" />
            <div className="flex gap-1">
              <div className="h-4 flex-1 bg-accent-primary/20 rounded" />
              <div className="h-4 flex-1 bg-surface-raised rounded" />
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="relative py-16 sm:py-20 border-t border-border-subtle/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            {t("landing.useCases.title")}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-text-secondary leading-relaxed">
            {t("landing.useCases.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {useCases.map((uc) => (
            <div
              key={uc.title}
              className="flex flex-col rounded-2xl border border-border-strong bg-surface p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-md"
            >
              {uc.visual}
              <div className="mt-4 flex-1 flex flex-col justify-between">
                <div>
                  <span className="inline-block rounded-md bg-accent-subtle/60 px-2 py-0.5 text-[10px] font-bold text-accent-primary uppercase tracking-wider mb-2">
                    {uc.tag}
                  </span>
                  <h3 className="text-base font-semibold text-text-primary tracking-tight">
                    {uc.title}
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-text-secondary leading-relaxed">
                    {uc.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
