"use client";

import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "secondary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-1 select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] whitespace-nowrap";

    const variantStyles = {
      primary:
        "bg-accent-primary text-white shadow-xs hover:bg-accent-hover active:bg-accent-hover border border-accent-primary/20",
      secondary:
        "bg-surface border border-border-subtle text-text-primary shadow-xs hover:bg-surface-hover hover:border-border-strong",
      outline:
        "bg-transparent border border-border-strong text-text-primary hover:bg-surface-hover",
      ghost:
        "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-hover",
      destructive:
        "bg-red-600 text-white shadow-xs hover:bg-red-700 active:bg-red-800 border border-red-700/20",
    }[variant];

    const sizeStyles = {
      xs: "text-xs px-2.5 py-1 min-h-7 gap-1.5",
      sm: "text-xs px-3 py-1.5 min-h-8 gap-1.5",
      md: "text-sm px-3.5 py-1.5 min-h-9 gap-2",
      lg: "text-base px-5 py-2.5 min-h-11 gap-2.5",
      icon: "h-9 w-9 p-0",
      "icon-sm": "h-7 w-7 p-0",
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
