"use client";

import React from "react";
import { useCanvasStore } from "../store/canvas-store";
import { useI18n } from "../i18n";

interface ZoomControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
}

export function ZoomControls({ onZoomIn, onZoomOut, onResetZoom }: ZoomControlsProps) {
  const { zoom, setZoom, resetViewport } = useCanvasStore();
  const { t } = useI18n();

  const handleZoomIn = () => {
    if (onZoomIn) {
      onZoomIn();
    } else {
      setZoom((z) => Math.min(5.0, z * 1.25));
    }
  };

  const handleZoomOut = () => {
    if (onZoomOut) {
      onZoomOut();
    } else {
      setZoom((z) => Math.max(0.1, z * 0.8));
    }
  };

  const handleReset = () => {
    if (onResetZoom) {
      onResetZoom();
    } else {
      resetViewport();
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-zinc-200/80 bg-white/95 px-2 py-1 shadow-lg backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/95">
      <button
        onClick={handleZoomOut}
        title={t("boardStudio.zoomOut")}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <button
        onClick={handleReset}
        title={t("boardStudio.resetZoom")}
        className="min-w-14 px-1.5 py-1 text-center text-xs font-semibold text-zinc-700 transition hover:text-indigo-600 dark:text-zinc-300 dark:hover:text-indigo-400"
      >
        {Math.round(zoom * 100)}%
      </button>

      <button
        onClick={handleZoomIn}
        title={t("boardStudio.zoomIn")}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}
