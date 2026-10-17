"use client";

import React, { forwardRef, useState } from "react";
import { useI18n } from "@/i18n";

export interface PasswordFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  id: string;
  label: string;
  error?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ id, label, error, className = "", ...props }, ref) {
    const { t } = useI18n();
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="space-y-1.5 relative">
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="block text-xs font-medium text-text-secondary"
          >
            {label}
          </label>
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="text-[11px] text-text-muted hover:text-text-primary transition-colors"
          >
            {showPassword ? t("auth.fields.hidePassword") : t("auth.fields.showPassword")}
          </button>
        </div>
        <input
          ref={ref}
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-all duration-150 outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 shadow-2xs ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
              : "border-border-strong hover:border-text-secondary/50"
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);
