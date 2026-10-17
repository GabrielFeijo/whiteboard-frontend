"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/context";

export interface AuthCardShellProps {
  title: string;
  subtitle: string;
  footerPrompt: string;
  footerLinkText: string;
  footerLinkHref: string;
  children: ReactNode;
}

export function AuthCardShell({
  title,
  subtitle,
  footerPrompt,
  footerLinkText,
  footerLinkHref,
  children,
}: AuthCardShellProps) {
  const { t } = useI18n();

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative rounded-2xl border border-border-strong bg-surface/95 p-6 sm:p-8 shadow-2xl backdrop-blur-md transition-all">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface-raised px-3 py-1 text-xs font-medium text-text-secondary shadow-2xs mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t("auth.badge")}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            {title}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-text-muted leading-relaxed">
            {subtitle}
          </p>
        </div>

        {children}

        <div className="mt-6 border-t border-border-subtle pt-5 text-center text-xs text-text-muted">
          <span>{footerPrompt}</span>{" "}
          <Link
            href={footerLinkHref}
            className="font-semibold text-accent-primary hover:text-accent-hover transition-colors underline-offset-4 hover:underline"
          >
            {footerLinkText}
          </Link>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-text-muted select-none">
          <svg
            className="h-3.5 w-3.5 text-emerald-500/80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>{t("auth.secureNote")}</span>
        </div>
      </div>
    </div>
  );
}
