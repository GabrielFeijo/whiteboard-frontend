import React from "react";

export function Kbd({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={`inline-flex items-center justify-center min-w-4.5 px-1 py-0.5 text-[10px] font-mono font-medium rounded border border-border-strong bg-surface-raised text-text-muted shadow-2xs select-none ${className}`}
    >
      {children}
    </kbd>
  );
}
