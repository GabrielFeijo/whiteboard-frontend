"use client";

import { Tooltip } from "@/components/ui/tooltip";
import { ShapeToolMenu } from "@/features/studio/components/toolbar/shape-tool-menu";
import { useI18n } from "@/i18n/context";
import { useCanvasStore } from "@/store/canvas-store";
import {
  Eraser,
  Hand,
  Image as ImageIcon,
  MousePointer2,
  Pencil,
  Redo2,
  StickyNote,
  Type,
  Undo2,
} from "lucide-react";
import { useRef } from "react";

interface StudioToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  readOnly?: boolean;
  onInsertImage?: (file: File) => void;
}

export function StudioToolbar({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  readOnly,
  onInsertImage,
}: StudioToolbarProps) {
  const { activeTool, setActiveTool } = useCanvasStore();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onInsertImage) {
      onInsertImage(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
          <MousePointer2 className="h-4 w-4" />
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
          <Hand className="h-4 w-4" />
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
          <Pencil className="h-4 w-4" />
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
          <StickyNote className="h-4 w-4" />
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
          <Type className="h-4 w-4" />
        </button>
      </Tooltip>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.svg"
        className="hidden"
        onChange={handleFileChange}
      />

      <Tooltip label={t("studio.toolbar.tools.image")} side="top">
        <button
          type="button"
          disabled={readOnly}
          onClick={() => fileInputRef.current?.click()}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 text-text-secondary hover:text-text-primary hover:bg-surface-hover ${
            readOnly ? "opacity-40 cursor-not-allowed" : ""
          }`}
          aria-label={t("studio.toolbar.tools.image")}
        >
          <ImageIcon className="h-4 w-4" />
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
          <Eraser className="h-4 w-4" />
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
          <Undo2 className="h-4 w-4" />
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
          <Redo2 className="h-4 w-4" />
        </button>
      </Tooltip>
    </nav>
  );
}
