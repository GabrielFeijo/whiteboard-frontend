"use client";

import React from "react";
import { Tool, useCanvasStore } from "../store/canvas-store";

interface ToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  readOnly?: boolean;
}

export function Toolbar({ onUndo, onRedo, canUndo, canRedo, readOnly }: ToolbarProps) {
  const { activeTool, setActiveTool } = useCanvasStore();

  const tools: { id: Tool; label: string; icon: React.ReactNode; shortcut: string }[] = [
    {
      id: "select",
      label: "Select (V)",
      shortcut: "V",
      icon: (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 3l7 18 3-7 7-3L3 3z" />
        </svg>
      ),
    },
    {
      id: "hand",
      label: "Hand / Pan (H)",
      shortcut: "H",
      icon: (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v7M10 10.5V6a2 2 0 0 0-4 0v8a7 7 0 0 0 14 0v-3a2 2 0 0 0-2-2z" />
        </svg>
      ),
    },
    {
      id: "rect",
      label: "Rectangle (R)",
      shortcut: "R",
      icon: (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      ),
    },
    {
      id: "ellipse",
      label: "Ellipse (O)",
      shortcut: "O",
      icon: (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="9" />
        </svg>
      ),
    },
    {
      id: "diamond",
      label: "Diamond (D)",
      shortcut: "D",
      icon: (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2l10 10-10 10L2 12z" />
        </svg>
      ),
    },
    {
      id: "arrow",
      label: "Arrow (A)",
      shortcut: "A",
      icon: (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 19L19 5M19 5h-7M19 5v7" />
        </svg>
      ),
    },
    {
      id: "line",
      label: "Line (L)",
      shortcut: "L",
      icon: (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 20L20 4" />
        </svg>
      ),
    },
    {
      id: "freehand",
      label: "Pencil (P)",
      shortcut: "P",
      icon: (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      ),
    },
    {
      id: "sticky",
      label: "Sticky Note (S)",
      shortcut: "S",
      icon: (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      id: "text",
      label: "Text (T)",
      shortcut: "T",
      icon: (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      ),
    },
    {
      id: "eraser",
      label: "Eraser (E)",
      shortcut: "E",
      icon: (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
          <path d="M22 21H7" />
          <path d="m5 11 9 9" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-zinc-200/80 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/95">
      {tools.map((t) => {
        const isActive = activeTool === t.id;
        const isDisabled = readOnly && t.id !== "select" && t.id !== "hand";
        return (
          <button
            key={t.id}
            title={t.label}
            disabled={isDisabled}
            onClick={() => setActiveTool(t.id)}
            className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition ${
              isActive
                ? "bg-indigo-600 text-white shadow-sm"
                : isDisabled
                  ? "cursor-not-allowed opacity-40 text-zinc-400"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {t.icon}
          </button>
        );
      })}

      <div className="mx-1 h-6 w-px bg-zinc-200 dark:bg-zinc-800" />

      <button
        title="Undo (Ctrl+Z)"
        disabled={!canUndo || readOnly}
        onClick={onUndo}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      </button>

      <button
        title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
        disabled={!canRedo || readOnly}
        onClick={onRedo}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg>
      </button>
    </div>
  );
}
