"use client";

import type React from "react";
import { useEffect } from "react";

export interface ModalOverlayProps {
  isOpen?: boolean;
  onClose: () => void;
  ariaLabel: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function ModalOverlay({
  isOpen = true,
  onClose,
  ariaLabel,
  contentClassName = "w-full max-w-md rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl",
  children,
}: ModalOverlayProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
