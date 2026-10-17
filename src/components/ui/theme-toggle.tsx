"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../providers/theme-provider";
import { Tooltip } from "./tooltip";
import { useI18n } from "@/i18n";

export interface ThemeToggleProps {
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "center" | "start" | "end";
}

export function ThemeToggle({
  className = "",
  side = "bottom",
  align = "end",
}: ThemeToggleProps = {}) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();

  const toggleNext = () => {
    if (resolvedTheme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  const label =
    resolvedTheme === "dark"
      ? t("common.theme.toLight")
      : t("common.theme.toDark");

  return (
    <Tooltip label={label} side={side} align={align}>
      <button
        onClick={toggleNext}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-surface text-text-secondary transition-all hover:bg-surface-hover hover:text-text-primary hover:border-border-strong active:scale-95 shadow-2xs ${className}`}
        aria-label={label}
      >
        {resolvedTheme === "dark" ? (
          <Moon className="h-4 w-4" />
        ) : (
          <Sun className="h-4 w-4" />
        )}
      </button>
    </Tooltip>
  );
}
