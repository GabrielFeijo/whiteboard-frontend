"use client";

import React, { forwardRef, useState } from "react";
import { useI18n } from "@/i18n";

export interface PasswordFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ id, label, error, hint, className = "", ...props }, ref) {
    const { t } = useI18n();
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="block text-xs font-medium text-text-secondary"
          >
            {label}
          </label>
          {hint && !error && (
            <span className="text-[11px] text-text-muted">{hint}</span>
          )}
        </div>

        <div className="relative flex items-center">
          <div className="absolute left-3 flex items-center pointer-events-none text-text-muted">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <input
            ref={ref}
            id={id}
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className={`w-full rounded-lg border bg-surface py-2 pl-9.5 pr-10 text-sm text-text-primary placeholder:text-text-muted transition-all duration-150 outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 shadow-2xs ${
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                : "border-border-strong hover:border-text-secondary/50"
            } ${className}`}
            {...props}
          />

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            title={showPassword ? t("auth.fields.hidePassword") : t("auth.fields.showPassword")}
            aria-label={showPassword ? t("auth.fields.hidePassword") : t("auth.fields.showPassword")}
            className="absolute right-2.5 flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            {showPassword ? (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {error && (
          <p className="flex items-center gap-1 text-xs text-red-500">
            <svg
              className="h-3.5 w-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  },
);

PasswordField.displayName = "PasswordField";
