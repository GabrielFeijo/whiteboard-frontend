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
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
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
        className={`fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl transition-all duration-200 dark:border-zinc-800 dark:bg-[#121215] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${className}`}
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
      className={`flex flex-col text-left ${className}`}
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
      className={`mt-6 flex items-center justify-end gap-3 ${className}`}
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
      className={`text-lg font-bold text-zinc-900 dark:text-zinc-100 ${className}`}
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
      className={`mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 ${className}`}
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
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 ${className}`}
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
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.98] dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description: React.ReactNode;
  cancelText?: React.ReactNode;
  confirmText?: React.ReactNode;
  variant?: "destructive" | "primary";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelText = "Cancel",
  confirmText = "Confirm",
  variant = "destructive",
  isLoading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const confirmClasses =
    variant === "destructive"
      ? "bg-red-600 text-white hover:bg-red-700 dark:bg-[#4a1515] dark:hover:bg-[#5c1b1b] dark:text-red-200 dark:border dark:border-red-900/60"
      : "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            className={confirmClasses}
            disabled={isLoading}
            onClick={async (e) => {
              e.preventDefault();
              await onConfirm();
              onOpenChange(false);
            }}
          >
            {isLoading ? "..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
