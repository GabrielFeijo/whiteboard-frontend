"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, LayoutDashboard, RotateCcw } from "lucide-react";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  const { t } = useI18n();

  useEffect(() => {
    console.error("Whiteboard runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas p-4 text-text-primary selection:bg-accent-primary/20 selection:text-accent-primary">
      <div className="w-full max-w-md text-center rounded-2xl border border-red-500/20 bg-surface p-8 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-center mb-6">
          <AppLogo size="lg" />
        </div>

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
          {t("errorPage.title")}
        </h1>

        <p className="mt-2 text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
          {error.message || t("errorPage.description")}
        </p>

        {error.digest && (
          <p className="mt-2 font-mono text-[10px] text-text-muted">
            Digest: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Button
            variant="primary"
            size="md"
            onClick={reset}
            className="w-full sm:w-auto gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{t("errorPage.tryAgain")}</span>
          </Button>

          <Link href="/boards" className="w-full sm:w-auto">
            <Button variant="ghost" size="md" className="w-full gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span>{t("errorPage.backHome")}</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
