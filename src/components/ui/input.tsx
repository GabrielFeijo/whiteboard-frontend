"use client";

import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, label, id, leftIcon, rightElement, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-text-muted">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={`w-full rounded-lg border bg-surface py-2 text-sm text-text-primary placeholder:text-text-muted transition-all duration-150 outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:cursor-not-allowed disabled:opacity-50 shadow-2xs ${
              leftIcon ? "pl-9.5 pr-3" : "px-3"
            } ${rightElement ? "pr-10" : ""} ${
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                : "border-border-strong hover:border-text-secondary/50"
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-2.5 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
