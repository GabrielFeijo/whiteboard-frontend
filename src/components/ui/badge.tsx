import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "neutral" | "success" | "warning" | "destructive" | "outline";
}

export function Badge({
  className = "",
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  const base =
    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium tracking-tight select-none transition-colors";

  const variantStyles = {
    default:
      "bg-accent-subtle text-accent-primary border border-accent-primary/20",
    neutral:
      "bg-surface-hover text-text-secondary border border-border-subtle",
    success:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50",
    warning:
      "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50",
    destructive:
      "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50",
    outline:
      "bg-transparent text-text-secondary border border-border-strong",
  }[variant];

  return (
    <span className={`${base} ${variantStyles} ${className}`} {...props}>
      {children}
    </span>
  );
}
