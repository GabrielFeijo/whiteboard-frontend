import type { ReactNode } from "react";
import Link from "next/link";

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
  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <Link
          href="/"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary text-white shadow-md mb-4 transition-transform hover:scale-105 active:scale-95"
        >
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 7h10M7 12h7M7 17h4" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {title}
        </h1>
        <p className="mt-1.5 text-xs text-text-muted">{subtitle}</p>
      </div>

      <div className="rounded-2xl border border-border-strong bg-surface p-7 shadow-xl">
        {children}

        <div className="mt-6 border-t border-border-subtle pt-5 text-center text-xs text-text-muted">
          {footerPrompt}{" "}
          <Link
            href={footerLinkHref}
            className="font-semibold text-accent-primary hover:underline"
          >
            {footerLinkText}
          </Link>
        </div>
      </div>
    </div>
  );
}
