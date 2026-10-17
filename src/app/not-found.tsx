"use client";

import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas p-4 text-text-primary selection:bg-accent-primary/20 selection:text-accent-primary">
      <div className="w-full max-w-md text-center rounded-2xl border border-border-strong bg-surface p-8 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-center mb-6">
          <AppLogo size="lg" />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-4">
          <span>404</span>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
          {t("notFound.title")}
        </h1>

        <p className="mt-2 text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
          {t("notFound.description")}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link href="/boards" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span>{t("notFound.backHome")}</span>
            </Button>
          </Link>

          <Link href="/" className="w-full sm:w-auto">
            <Button variant="ghost" size="md" className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Home</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
