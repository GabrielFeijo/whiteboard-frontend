"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { useI18n } from "../i18n";
import { Tooltip } from "./ui/tooltip";

interface ToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  readOnly?: boolean;
}

type ShapeToolType = "rect" | "ellipse" | "diamond" | "arrow" | "line";

export function Toolbar({ onUndo, onRedo, canUndo, canRedo, readOnly }: ToolbarProps) {
  const { activeTool, setActiveTool } = useCanvasStore();
  const { t } = useI18n();

  const [lastShapeTool, setLastShapeTool] = useState<ShapeToolType>("rect");
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const shapeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(e.target as Node)) {
        setIsShapeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const shapeTools: { id: ShapeToolType; label: string; shortcut: string; icon: React.ReactNode }[] = [
    {
      id: "rect",
      label: t("toolbar.rect"),
      shortcut: "R",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      ),
    },
    {
      id: "ellipse",
      label: t("toolbar.ellipse"),
      shortcut: "O",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
        </svg>
      ),
    },
    {
      id: "diamond",
      label: t("toolbar.diamond"),
      shortcut: "D",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l10 10-10 10L2 12z" />
        </svg>
      ),
    },
    {
      id: "arrow",
      label: t("toolbar.arrow"),
      shortcut: "A",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 19L19 5M19 5h-7M19 5v7" />
        </svg>
      ),
    },
    {
      id: "line",
      label: t("toolbar.line"),
      shortcut: "L",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 20L20 4" />
        </svg>
      ),
    },
  ];

  const currentShape = shapeTools.find((s) => s.id === lastShapeTool) || shapeTools[0];
  const isAnyShapeActive = shapeTools.some((s) => s.id === activeTool);

  const selectShape = (id: ShapeToolType) => {
    setLastShapeTool(id);
    setActiveTool(id);
    setIsShapeMenuOpen(false);
  };

  return (
    <nav
      aria-label="Ferramentas do Quadro"
      className="flex items-center gap-1 rounded-xl border border-border-strong bg-surface-raised/95 px-1.5 py-1 shadow-lg backdrop-blur-md select-none transition-all duration-150"
    >
      <Tooltip label={t("toolbar.select")} shortcut="V" side="top">
        <button
          onClick={() => setActiveTool("select")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${activeTool === "select"
              ? "bg-accent-primary text-white shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            }`}
          aria-label={t("toolbar.select")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l7 18 3-7 7-3L3 3z" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip label={t("toolbar.hand")} shortcut="H" side="top">
        <button
          onClick={() => setActiveTool("hand")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${activeTool === "hand"
              ? "bg-accent-primary text-white shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            }`}
          aria-label={t("toolbar.hand")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v7M10 10.5V6a2 2 0 0 0-4 0v8a7 7 0 0 0 14 0v-3a2 2 0 0 0-2-2z" />
          </svg>
        </button>
      </Tooltip>

      <div className="mx-0.5 h-4 w-px bg-border-subtle" />

      <div className="relative inline-flex items-center" ref={shapeMenuRef}>
        <Tooltip label={currentShape.label} shortcut={currentShape.shortcut} side="top">
          <button
            disabled={readOnly}
            onClick={() => setActiveTool(lastShapeTool)}
            className={`flex h-8 w-8 items-center justify-center rounded-l-lg transition-all duration-150 ${isAnyShapeActive
                ? "bg-accent-primary text-white shadow-xs"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              } ${readOnly ? "opacity-40 cursor-not-allowed" : ""}`}
            aria-label={currentShape.label}
          >
            {currentShape.icon}
          </button>
        </Tooltip>

        <button
          disabled={readOnly}
          onClick={() => setIsShapeMenuOpen(!isShapeMenuOpen)}
          className={`flex h-8 w-4 items-center justify-center rounded-r-lg border-l border-border-subtle transition-all duration-150 ${isAnyShapeActive
              ? "bg-accent-primary text-white border-accent-hover"
              : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
            } ${readOnly ? "opacity-40 cursor-not-allowed" : ""}`}
          aria-label="Mais formas geométricas"
        >
          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {isShapeMenuOpen && (
          <div className="absolute bottom-full mb-2 left-0 z-50 flex items-center gap-1 rounded-xl border border-border-strong bg-surface-raised p-1 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
            {shapeTools.map((shape) => {
              const isSelected = activeTool === shape.id;
              return (
                <Tooltip key={shape.id} label={shape.label} shortcut={shape.shortcut} side="top">
                  <button
                    onClick={() => selectShape(shape.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${isSelected
                        ? "bg-accent-primary text-white shadow-xs"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                      }`}
                  >
                    {shape.icon}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>

      <Tooltip label={t("toolbar.freehand")} shortcut="P" side="top">
        <button
          disabled={readOnly}
          onClick={() => setActiveTool("freehand")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${activeTool === "freehand"
              ? "bg-accent-primary text-white shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            } ${readOnly ? "opacity-40 cursor-not-allowed" : ""}`}
          aria-label={t("toolbar.freehand")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip label={t("toolbar.sticky")} shortcut="S" side="top">
        <button
          disabled={readOnly}
          onClick={() => setActiveTool("sticky")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${activeTool === "sticky"
              ? "bg-accent-primary text-white shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            } ${readOnly ? "opacity-40 cursor-not-allowed" : ""}`}
          aria-label={t("toolbar.sticky")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip label={t("toolbar.text")} shortcut="T" side="top">
        <button
          disabled={readOnly}
          onClick={() => setActiveTool("text")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${activeTool === "text"
              ? "bg-accent-primary text-white shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            } ${readOnly ? "opacity-40 cursor-not-allowed" : ""}`}
          aria-label={t("toolbar.text")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip label={t("toolbar.eraser")} shortcut="E" side="top">
        <button
          disabled={readOnly}
          onClick={() => setActiveTool("eraser")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${activeTool === "eraser"
              ? "bg-accent-primary text-white shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            } ${readOnly ? "opacity-40 cursor-not-allowed" : ""}`}
          aria-label={t("toolbar.eraser")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
            <path d="M22 21H7" />
            <path d="m5 11 9 9" />
          </svg>
        </button>
      </Tooltip>

      <div className="mx-0.5 h-4 w-px bg-border-subtle" />

      <Tooltip label={t("toolbar.undo")} shortcut="Ctrl+Z" side="top">
        <button
          disabled={!canUndo || readOnly}
          onClick={onUndo}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-all hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none"
          aria-label={t("toolbar.undo")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>
      </Tooltip>

      <Tooltip label={t("toolbar.redo")} shortcut="Ctrl+Y" side="top">
        <button
          disabled={!canRedo || readOnly}
          onClick={onRedo}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-all hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none"
          aria-label={t("toolbar.redo")}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
          </svg>
        </button>
      </Tooltip>
    </nav>
  );
}
