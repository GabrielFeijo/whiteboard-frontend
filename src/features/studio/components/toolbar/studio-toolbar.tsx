"use client";

import { Tooltip } from "@/components/ui/tooltip";
import { ShapeToolMenu } from "@/features/studio/components/toolbar/shape-tool-menu";
import { useI18n } from "@/i18n/context";
import { useCanvasStore } from "@/store/canvas-store";

interface StudioToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  readOnly?: boolean;
}

export function StudioToolbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  readOnly,
}: StudioToolbarProps) {
  const { activeTool, setActiveTool } = useCanvasStore();
  const { t } = useI18n();

  return (
    <nav
      aria-label={t("studio.toolbar.ariaLabel")}
      className="flex items-center gap-1 rounded-xl border border-border-strong bg-surface-raised/95 px-1.5 py-1 shadow-lg backdrop-blur-md select-none transition-all duration-150"
    >
      <Tooltip label={t("studio.toolbar.tools.select")} shortcut="V" side="top">
        <button
          type="button"
          onClick={() => setActiveTool("select")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${
            activeTool === "select"
              ? "bg-accent-primary text-white shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
          }`}
          aria-label={t("studio.toolbar.tools.select")}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 3l7 18 3-7 7-3L3 3z" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip label={t("studio.toolbar.tools.hand")} shortcut="H" side="top">
        <button
          type="button"
          onClick={() => setActiveTool("hand")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${
            activeTool === "hand"
              ? "bg-accent-primary text-white shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
          }`}
          aria-label={t("studio.toolbar.tools.hand")}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v7M10 10.5V6a2 2 0 0 0-4 0v8a7 7 0 0 0 14 0v-3a2 2 0 0 0-2-2z" />
          </svg>
        </button>
      </Tooltip>

      <div className="mx-0.5 h-4 w-px bg-border-subtle" />

      <ShapeToolMenu readOnly={readOnly} />

      <Tooltip label={t("studio.toolbar.tools.freehand")} shortcut="P" side="top">
        <button
          type="button"
          disabled={readOnly}
          onClick={() => setActiveTool("freehand")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${
            activeTool === "freehand"
              ? "bg-accent-primary text-white shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
          } ${readOnly ? "opacity-40 cursor-not-allowed" : ""}`}
          aria-label={t("studio.toolbar.tools.freehand")}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip label={t("studio.toolbar.tools.sticky")} shortcut="S" side="top">
        <button
          type="button"
          disabled={readOnly}
          onClick={() => setActiveTool("sticky")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${
            activeTool === "sticky"
              ? "bg-accent-primary text-white shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
          } ${readOnly ? "opacity-40 cursor-not-allowed" : ""}`}
          aria-label={t("studio.toolbar.tools.sticky")}
        >
          <svg
            className="h-4 w-4"
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
        </button>
      </Tooltip>

      <Tooltip label={t("studio.toolbar.tools.text")} shortcut="T" side="top">
        <button
          type="button"
          disabled={readOnly}
          onClick={() => setActiveTool("text")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${
            activeTool === "text"
              ? "bg-accent-primary text-white shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
          } ${readOnly ? "opacity-40 cursor-not-allowed" : ""}`}
          aria-label={t("studio.toolbar.tools.text")}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip label={t("studio.toolbar.tools.eraser")} shortcut="E" side="top">
        <button
          type="button"
          disabled={readOnly}
          onClick={() => setActiveTool("eraser")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${
            activeTool === "eraser"
              ? "bg-accent-primary text-white shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
          } ${readOnly ? "opacity-40 cursor-not-allowed" : ""}`}
          aria-label={t("studio.toolbar.tools.eraser")}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
            <path d="M22 21H7" />
            <path d="m5 11 9 9" />
          </svg>
        </button>
      </Tooltip>

      <div className="mx-0.5 h-4 w-px bg-border-subtle" />

      <Tooltip label={t("studio.toolbar.history.undo")} shortcut="Ctrl+Z" side="top">
        <button
          type="button"
          disabled={!canUndo || readOnly}
          onClick={onUndo}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-all hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none"
          aria-label={t("studio.toolbar.history.undo")}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip label={t("studio.toolbar.history.redo")} shortcut="Ctrl+Y" side="top">
        <button
          type="button"
          disabled={!canRedo || readOnly}
          onClick={onRedo}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-all hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none"
          aria-label={t("studio.toolbar.history.redo")}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
          </svg>
        </button>
      </Tooltip>
    </nav>
  );
}
