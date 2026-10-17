"use client";

import type React from "react";
import { useI18n } from "@/i18n/context";

export interface AppLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

const SIZE_VARIANTS = {
  sm: {
    container: "h-6 w-6 rounded-md",
    svg: "h-3.5 w-3.5",
    text: "text-xs tracking-tight",
    gap: "gap-2",
  },
  md: {
    container: "h-8 w-8 rounded-lg",
    svg: "h-4.5 w-4.5",
    text: "text-sm tracking-tight",
    gap: "gap-2.5",
  },
  lg: {
    container: "h-10 w-10 rounded-xl",
    svg: "h-5.5 w-5.5",
    text: "text-base tracking-tight",
    gap: "gap-3",
  },
  xl: {
    container: "h-12 w-12 rounded-2xl",
    svg: "h-7 w-7",
    text: "text-lg tracking-tight",
    gap: "gap-3.5",
  },
} as const;

export function AppLogoIcon({
  className = "h-8 w-8",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="wb-logo-grad"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>

      <rect
        width="32"
        height="32"
        rx="8"
        fill="url(#wb-logo-grad)"
      />
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="7.25"
        stroke="white"
        strokeOpacity="0.18"
        strokeWidth="1"
      />

      <path
        d="M10 16h12M16 10v12"
        stroke="white"
        strokeOpacity="0.2"
        strokeWidth="1"
        strokeDasharray="2 2"
      />

      <path
        d="M7.5 10.5L11.8 22.5L16 14.5L20.2 22.5L24.5 10.5"
        stroke="white"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="16" cy="9.5" r="1.75" fill="#38bdf8" />
    </svg>
  );
}

export function AppLogo({
  size = "md",
  showText = true,
  className = "",
  iconClassName = "",
  textClassName = "",
}: AppLogoProps) {
  const { t } = useI18n();
  const config = SIZE_VARIANTS[size];

  return (
    <div className={`inline-flex items-center ${config.gap} select-none ${className}`}>
      <div
        className={`flex items-center justify-center shadow-xs transition-transform duration-150 group-hover:scale-105 ${iconClassName}`}
      >
        <AppLogoIcon className={config.container} />
      </div>

      {showText && (
        <span
          className={`font-semibold text-text-primary ${config.text} ${textClassName}`}
        >
          {t("common.app.name")}
        </span>
      )}
    </div>
  );
}
