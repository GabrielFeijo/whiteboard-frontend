"use client";

import Link from "next/link";
import { useI18n } from "../i18n";
import { LanguageSwitcher } from "../components/language-switcher";

export default function Home() {
  const { t } = useI18n();

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-zinc-950">
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300">
          {t("landing.badge")}
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-6xl">
          {t("landing.title")}
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          {t("landing.description")}
        </p>

        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="/boards"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
          >
            {t("landing.openDashboard")}
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t("landing.signIn")}
          </Link>
        </div>
      </div>
    </main>
  );
}
