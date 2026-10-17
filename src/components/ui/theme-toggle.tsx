"use client";

import { useTheme } from "../../providers/theme-provider";
import { Tooltip } from "./tooltip";

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

  const toggleNext = () => {
    if (resolvedTheme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  const getLabel = () => {
    return resolvedTheme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro";
  };

  return (
    <Tooltip label={getLabel()} side={side} align={align}>
      <button
        onClick={toggleNext}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-surface text-text-secondary transition-all hover:bg-surface-hover hover:text-text-primary hover:border-border-strong active:scale-95 shadow-2xs ${className}`}
        aria-label={getLabel()}
      >
        {resolvedTheme === "dark" ? (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        )}
      </button>
    </Tooltip>
  );
}
