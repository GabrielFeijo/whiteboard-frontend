"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;

export function AlertDialogOverlay({
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
      {...props}
    />
  );
}

export function AlertDialogContent({
  className = "",
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        className={`fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl transition-all duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${className}`}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  );
}

export function AlertDialogHeader({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col text-left space-y-1.5 ${className}`}
      {...props}
    />
  );
}

export function AlertDialogFooter({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-border-subtle ${className}`}
      {...props}
    />
  );
}

export function AlertDialogTitle({
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      className={`text-base font-bold text-text-primary ${className}`}
      {...props}
    />
  );
}

export function AlertDialogDescription({
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      className={`text-xs leading-relaxed text-text-muted ${className}`}
      {...props}
    />
  );
}

export function AlertDialogAction({
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      className={`inline-flex items-center justify-center rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 select-none shadow-xs ${className}`}
      {...props}
    />
  );
}

export function AlertDialogCancel({
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={`inline-flex items-center justify-center rounded-lg px-3.5 py-1.5 text-xs font-medium text-text-secondary transition-all hover:bg-surface-hover hover:text-text-primary active:scale-[0.98] disabled:opacity-50 select-none ${className}`}
      {...props}
    />
  );
}

export interface ConfirmDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCancel?: () => void;
  title: React.ReactNode;
  description: React.ReactNode;
  cancelText?: React.ReactNode;
  confirmText?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  variant?: "destructive" | "primary";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  isOpen,
  onOpenChange,
  onCancel,
  title,
  description,
  cancelText = "Cancel",
  confirmText = "Confirm",
  confirmLabel,
  variant = "destructive",
  isLoading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const isDialogActive = Boolean(open ?? isOpen);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && onCancel) {
      onCancel();
    }
    if (onOpenChange) {
      onOpenChange(nextOpen);
    }
  };

  const confirmClasses =
    variant === "destructive"
      ? "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border border-red-700/20"
      : "bg-accent-primary text-white hover:bg-accent-hover active:bg-accent-hover border border-accent-primary/20";

  const resolvedConfirmText = confirmLabel ?? confirmText;

  return (
    <AlertDialog open={isDialogActive} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} onClick={onCancel}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            className={confirmClasses}
            disabled={isLoading}
            onClick={async (e) => {
              e.preventDefault();
              await onConfirm();
              handleOpenChange(false);
            }}
          >
            {isLoading ? "..." : resolvedConfirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
