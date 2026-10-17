"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Circle, Diamond, Minus, Square } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { useI18n } from "@/i18n/context";
import { useCanvasStore, type ToolType } from "@/store/canvas-store";

export type ShapeToolType = "rect" | "ellipse" | "diamond" | "arrow" | "line";

interface ShapeToolMenuProps {
  readOnly?: boolean;
}

export function ShapeToolMenu({ readOnly }: ShapeToolMenuProps) {
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

  const shapeTools: {
    id: ShapeToolType;
    label: string;
    shortcut: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "rect",
      label: t("studio.toolbar.tools.rect"),
      shortcut: "R",
      icon: <Square className="h-4 w-4" />,
    },
    {
      id: "ellipse",
      label: t("studio.toolbar.tools.ellipse"),
      shortcut: "O",
      icon: <Circle className="h-4 w-4" />,
    },
    {
      id: "diamond",
      label: t("studio.toolbar.tools.diamond"),
      shortcut: "D",
      icon: <Diamond className="h-4 w-4" />,
    },
    {
      id: "arrow",
      label: t("studio.toolbar.tools.arrow"),
      shortcut: "A",
      icon: <ArrowUpRight className="h-4 w-4" />,
    },
    {
      id: "line",
      label: t("studio.toolbar.tools.line"),
      shortcut: "L",
      icon: <Minus className="h-4 w-4" />,
    },
  ];

  const activeShapeMatch = shapeTools.find((s) => s.id === (activeTool as ToolType));
  const currentShape =
    activeShapeMatch ||
    shapeTools.find((s) => s.id === lastShapeTool) ||
    shapeTools[0];
  const isAnyShapeActive = Boolean(activeShapeMatch);

  const selectShape = (id: ShapeToolType) => {
    setLastShapeTool(id);
    setActiveTool(id);
    setIsShapeMenuOpen(false);
  };

  return (
    <div className="relative inline-flex items-center" ref={shapeMenuRef}>
      <Tooltip label={currentShape.label} shortcut={currentShape.shortcut} side="top">
        <button
          type="button"
          disabled={readOnly}
          onClick={() => setActiveTool(currentShape.id)}
          className={`flex h-8 w-8 items-center justify-center rounded-l-lg transition-all duration-150 ${
            isAnyShapeActive
              ? "bg-accent-primary text-white shadow-xs"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
          } ${readOnly ? "opacity-40 cursor-not-allowed" : ""}`}
          aria-label={currentShape.label}
        >
          {currentShape.icon}
        </button>
      </Tooltip>

      <button
        type="button"
        disabled={readOnly}
        onClick={() => setIsShapeMenuOpen(!isShapeMenuOpen)}
        className={`flex h-8 w-4 items-center justify-center rounded-r-lg border-l border-border-subtle transition-all duration-150 ${
          isAnyShapeActive
            ? "bg-accent-primary text-white border-accent-hover"
            : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
        } ${readOnly ? "opacity-40 cursor-not-allowed" : ""}`}
        aria-label={t("studio.toolbar.moreShapes")}
      >
        <ChevronDown className="h-2.5 w-2.5" />
      </button>

      {isShapeMenuOpen && (
        <div className="absolute bottom-full mb-2 left-0 z-50 flex items-center gap-1 rounded-xl border border-border-strong bg-surface-raised p-1 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
          {shapeTools.map((shape) => {
            const isSelected = activeTool === shape.id;
            return (
              <Tooltip
                key={shape.id}
                label={shape.label}
                shortcut={shape.shortcut}
                side="top"
              >
                <button
                  type="button"
                  onClick={() => selectShape(shape.id)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150 ${
                    isSelected
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
  );
}
