"use client";

import { Minus, Plus } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/context";
import { useCanvasStore } from "@/store/canvas-store";

interface ZoomControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
}

export function ZoomControls({
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: ZoomControlsProps) {
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
    <div className="flex items-center gap-0.5 rounded-lg border border-border-strong bg-surface-raised/95 px-1 py-0.5 shadow-lg backdrop-blur-md select-none">
      <Tooltip label={t("studio.viewport.zoomOut")} shortcut="-" side="top">
        <button
          type="button"
          onClick={handleZoomOut}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-all hover:bg-surface-hover hover:text-text-primary active:scale-95"
          aria-label={t("studio.viewport.zoomOut")}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      </Tooltip>

      <Tooltip label={t("studio.viewport.resetZoom")} shortcut="0" side="top">
        <button
          type="button"
          onClick={handleReset}
          className="min-w-12 px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold text-text-secondary transition-all hover:text-accent-primary hover:bg-surface-hover rounded-md"
        >
          {Math.round(zoom * 100)}%
        </button>
      </Tooltip>

      <Tooltip label={t("studio.viewport.zoomIn")} shortcut="+" side="top">
        <button
          type="button"
          onClick={handleZoomIn}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-all hover:bg-surface-hover hover:text-text-primary active:scale-95"
          aria-label={t("studio.viewport.zoomIn")}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
    </div>
  );
}
