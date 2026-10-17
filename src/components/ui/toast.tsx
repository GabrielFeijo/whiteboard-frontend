"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
  action?: React.ReactNode;
}

export interface ToastRecord extends ToastOptions {
  id: string;
  open: boolean;
}

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1000;

type Action =
  | { type: "ADD_TOAST"; toast: ToastRecord }
  | { type: "UPDATE_TOAST"; toast: Partial<ToastRecord> & { id: string } }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string };

interface State {
  toasts: ToastRecord[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
};

let memoryState: State = { toasts: [] };
const listeners: Array<(state: State) => void> = [];

function dispatch(action: Action) {
  switch (action.type) {
    case "ADD_TOAST":
      memoryState = {
        ...memoryState,
        toasts: [action.toast, ...memoryState.toasts].slice(0, TOAST_LIMIT),
      };
      break;

    case "UPDATE_TOAST":
      memoryState = {
        ...memoryState,
        toasts: memoryState.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };
      break;

    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        memoryState.toasts.forEach((t) => addToRemoveQueue(t.id));
      }
      memoryState = {
        ...memoryState,
        toasts: memoryState.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      };
      break;
    }

    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        memoryState = { ...memoryState, toasts: [] };
      } else {
        memoryState = {
          ...memoryState,
          toasts: memoryState.toasts.filter((t) => t.id !== action.toastId),
        };
      }
      break;
  }

  listeners.forEach((listener) => listener(memoryState));
}

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return `toast-${Date.now()}-${count}`;
}

export function toast(opts: ToastOptions | string) {
  const options = typeof opts === "string" ? { title: opts } : opts;
  const id = genId();

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...options,
      id,
      open: true,
      duration: options.duration ?? 4000,
    },
  });

  return {
    id,
    dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }),
    update: (props: Partial<ToastOptions>) =>
      dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } }),
  };
}

toast.success = (title: React.ReactNode, options?: Omit<ToastOptions, "title" | "variant">) =>
  toast({ title, variant: "success", ...options });

toast.error = (title: React.ReactNode, options?: Omit<ToastOptions, "title" | "variant">) =>
  toast({ title, variant: "error", ...options });

toast.warning = (title: React.ReactNode, options?: Omit<ToastOptions, "title" | "variant">) =>
  toast({ title, variant: "warning", ...options });

toast.info = (title: React.ReactNode, options?: Omit<ToastOptions, "title" | "variant">) =>
  toast({ title, variant: "info", ...options });

toast.dismiss = (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId });

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export const ToastProvider = ToastPrimitive.Provider;
export const ToastTitle = ToastPrimitive.Title;
export const ToastDescription = ToastPrimitive.Description;
export const ToastAction = ToastPrimitive.Action;
export const ToastClose = ToastPrimitive.Close;

export function ToastViewport({
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={`fixed bottom-0 right-0 z-100 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-105 pointer-events-none gap-2 ${className}`}
      {...props}
    />
  );
}

const variantStyles: Record<ToastVariant, string> = {
  default: "border-border-strong bg-surface-raised/95 text-text-primary",
  info: "border-accent-primary/40 bg-surface-raised/95 text-text-primary",
  success: "border-emerald-500/40 bg-surface-raised/95 text-text-primary",
  warning: "border-amber-500/40 bg-surface-raised/95 text-text-primary",
  error: "border-red-500/40 bg-surface-raised/95 text-text-primary",
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  switch (variant) {
    case "success":
      return (
        <svg
          className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case "error":
      return (
        <svg
          className="h-4 w-4 text-red-500 shrink-0 mt-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
    case "warning":
      return (
        <svg
          className="h-4 w-4 text-amber-500 shrink-0 mt-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "info":
    case "default":
    default:
      return (
        <svg
          className="h-4 w-4 text-accent-primary shrink-0 mt-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
  }
}

export function Toast({
  className = "",
  variant = "default",
  ...props
}: React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & {
  variant?: ToastVariant;
}) {
  return (
    <ToastPrimitive.Root
      className={`pointer-events-auto relative flex w-full items-start justify-between space-x-3 overflow-hidden rounded-xl border p-3.5 shadow-xl backdrop-blur-md transition-all select-none data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-(--radix-toast-swipe-end-x) data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-full sm:data-[state=open]:slide-in-from-bottom-full ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map((item) => (
        <Toast
          key={item.id}
          variant={item.variant}
          open={item.open}
          duration={item.duration}
          onOpenChange={(open) => {
            if (!open) dismiss(item.id);
          }}
        >
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <ToastIcon variant={item.variant ?? "default"} />
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              {item.title && (
                <ToastTitle className="text-xs font-semibold leading-tight text-text-primary truncate">
                  {item.title}
                </ToastTitle>
              )}
              {item.description && (
                <ToastDescription className="text-[11px] leading-relaxed text-text-muted">
                  {item.description}
                </ToastDescription>
              )}
            </div>
          </div>

          {item.action && (
            <ToastAction asChild altText="Ação do Toast">
              {item.action}
            </ToastAction>
          )}

          <ToastClose
            className="rounded-lg p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors shrink-0 -mr-1 -mt-1"
            aria-label="Fechar notificação"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </ToastClose>
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
