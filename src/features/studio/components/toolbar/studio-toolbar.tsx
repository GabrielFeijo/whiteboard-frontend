"use client";

import type React from "react";
import { useRef } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { ShapeToolMenu } from "@/features/studio/components/toolbar/shape-tool-menu";
import { useI18n } from "@/i18n/context";
import type { TranslationKey } from "@/i18n/types";
import { CanvasToolType, useCanvasStore, type Tool } from "@/store/canvas-store";

interface StudioToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  readOnly?: boolean;
  onInsertImage?: (file: File) => void;
}

interface ToolbarIconButtonProps {
  label: string;
  shortcut?: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
  dimOnDisable?: boolean;
  onClick?: () => void;
}

function ToolbarIconButton({
  label,
  shortcut,
  icon: Icon,
  active = false,
  disabled = false,
  dimOnDisable = false,
  onClick,
}: ToolbarIconButtonProps) {
  return (
    <Tooltip label={label} shortcut={shortcut} side="top">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label={label}
        className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150 ${
          active
            ? "bg-accent-primary text-white shadow-xs"
            : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
        } ${
          disabled
            ? dimOnDisable
              ? "opacity-30 cursor-not-allowed"
              : "opacity-40 cursor-not-allowed"
            : "active:scale-95"
        }`}
      >
        <Icon className="h-4 w-4" />
      </button>
    </Tooltip>
  );
}

const NAVIGATION_TOOLS: ReadonlyArray<{
  tool: Tool;
  labelKey: TranslationKey;
  shortcut: string;
  icon: LucideIcon;
}> = [
  {
    tool: CanvasToolType.SELECT,
    labelKey: "studio.toolbar.tools.select",
    shortcut: "V",
    icon: MousePointer2,
  },
  {
    tool: CanvasToolType.HAND,
    labelKey: "studio.toolbar.tools.hand",
    shortcut: "H",
    icon: Hand,
  },
];

const CREATION_TOOLS: ReadonlyArray<{
  tool: Tool;
  labelKey: TranslationKey;
  shortcut: string;
  icon: LucideIcon;
}> = [
  {
    tool: CanvasToolType.FREEHAND,
    labelKey: "studio.toolbar.tools.freehand",
    shortcut: "P",
    icon: Pencil,
  },
  {
    tool: CanvasToolType.STICKY,
    labelKey: "studio.toolbar.tools.sticky",
    shortcut: "S",
    icon: StickyNote,
  },
  {
    tool: CanvasToolType.TEXT,
    labelKey: "studio.toolbar.tools.text",
    shortcut: "T",
    icon: Type,
  },
];

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
      className="flex max-w-[calc(100vw-16px)] items-center gap-0.5 sm:gap-1 rounded-xl border border-border-strong bg-surface-raised/95 px-1 sm:px-1.5 py-1 shadow-lg backdrop-blur-md select-none transition-all duration-150"
    >
      {NAVIGATION_TOOLS.map(({ tool, labelKey, shortcut, icon }) => (
        <ToolbarIconButton
          key={tool}
          label={t(labelKey)}
          shortcut={shortcut}
          icon={icon}
          active={activeTool === tool}
          onClick={() => setActiveTool(tool)}
        />
      ))}

      <div className="mx-0.5 h-4 w-px bg-border-subtle" />

      <ShapeToolMenu readOnly={readOnly} />

      {CREATION_TOOLS.map(({ tool, labelKey, shortcut, icon }) => (
        <ToolbarIconButton
          key={tool}
          label={t(labelKey)}
          shortcut={shortcut}
          icon={icon}
          active={activeTool === tool}
          disabled={readOnly}
          onClick={() => setActiveTool(tool)}
        />
      ))}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      <ToolbarIconButton
        label={t("studio.toolbar.tools.image")}
        icon={ImageIcon}
        disabled={readOnly}
        onClick={() => fileInputRef.current?.click()}
      />

      <ToolbarIconButton
        label={t("studio.toolbar.tools.eraser")}
        shortcut="E"
        icon={Eraser}
        active={activeTool === CanvasToolType.ERASER}
        disabled={readOnly}
        onClick={() => setActiveTool(CanvasToolType.ERASER)}
      />

      <div className="mx-0.5 h-4 w-px bg-border-subtle" />

      <ToolbarIconButton
        label={t("studio.toolbar.history.undo")}
        shortcut="Ctrl+Z"
        icon={Undo2}
        disabled={!canUndo}
        dimOnDisable
        onClick={onUndo}
      />

      <ToolbarIconButton
        label={t("studio.toolbar.history.redo")}
        shortcut="Ctrl+Shift+Z"
        icon={Redo2}
        disabled={!canRedo}
        dimOnDisable
        onClick={onRedo}
      />
    </nav>
  );
}
