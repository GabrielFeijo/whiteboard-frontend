"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { CanvasEngine } from "../canvas/canvas-engine";
import { useI18n } from "../i18n";
import { Badge } from "./ui/badge";

interface PropertiesPaletteProps {
  engine?: CanvasEngine | null;
  onClose?: () => void;
}

interface TextContentEditorProps {
  initialText: string;
  onChange: (text: string) => void;
  engine?: CanvasEngine | null;
  placeholder: string;
  title: string;
}

function TextContentEditor({
  initialText,
  onChange,
  engine,
  placeholder,
  title,
}: TextContentEditorProps) {
  const [text, setText] = useState(initialText);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!engine) return;
    const handleFocus = () => {
      textInputRef.current?.focus();
      textInputRef.current?.select();
    };
    return engine.events.on("focusTextInput", handleFocus);
  }, [engine]);

  useEffect(() => {
    const timer = setTimeout(() => {
      textInputRef.current?.focus();
      textInputRef.current?.select();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setText(next);
    onChange(next);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-text-secondary">
          {title}
        </label>
        <span className="text-[10px] font-mono text-text-muted">{text.length}</span>
      </div>
      <textarea
        ref={textInputRef}
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-border-strong bg-surface p-2 text-xs text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 resize-y min-h-14 shadow-2xs"
      />
    </div>
  );
}

export function PropertiesPalette({ engine, onClose }: PropertiesPaletteProps) {
  const { t } = useI18n();
  const {
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    strokeWidth,
    setStrokeWidth,
    opacity,
    setOpacity,
    selectedIds,
  } = useCanvasStore();

  const selectedElements = selectedIds.length > 0 && engine ? engine.getSelectedElements() : [];
  const primaryElement = selectedElements[0];
  const currentId = primaryElement?.id ?? null;

  const isTextual = primaryElement?.type === "sticky" || primaryElement?.type === "text";
  const hasFill =
    !primaryElement ||
    primaryElement.type === "rect" ||
    primaryElement.type === "ellipse" ||
    primaryElement.type === "diamond" ||
    primaryElement.type === "sticky";

  const strokeColors = [
    "#0f172a",
    "#f8fafc",
    "#64748b",
    "#ef4444",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
  ];

  const fillColors = [
    "transparent",
    "#ffffff",
    "#1e293b",
    "#fee2e2",
    "#fef3c7",
    "#d1fae5",
    "#dbeafe",
    "#ede9fe",
    "#fce7f3",
  ];

  const strokeWidths = [1, 2, 4, 8];

  const handleStrokeChange = (color: string) => {
    setStrokeColor(color);
    engine?.updateSelectedStyle({ stroke: color });
  };

  const handleFillChange = (color: string) => {
    setFillColor(color);
    engine?.updateSelectedStyle({ fill: color });
  };

  const handleWidthChange = (width: number) => {
    setStrokeWidth(width);
    engine?.updateSelectedStyle({ strokeWidth: width });
  };

  const handleOpacityChange = (value: number) => {
    setOpacity(value);
    engine?.updateSelectedStyle({ opacity: value });
  };

  const getElementTypeName = (type?: string) => {
    switch (type) {
      case "rect":
        return t("properties.elementTypes.rect");
      case "ellipse":
        return t("properties.elementTypes.ellipse");
      case "diamond":
        return t("properties.elementTypes.diamond");
      case "line":
        return t("properties.elementTypes.line");
      case "arrow":
        return t("properties.elementTypes.arrow");
      case "sticky":
        return t("properties.elementTypes.sticky");
      case "text":
        return t("properties.elementTypes.text");
      case "freehand":
        return t("properties.elementTypes.freehand");
      default:
        return t("properties.elementTypes.element");
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-strong bg-surface-raised/95 p-3.5 shadow-xl backdrop-blur-md w-64 select-none animate-in fade-in zoom-in-95 duration-100">
      <div className="flex items-center justify-between border-b border-border-subtle pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-text-primary truncate">
              {selectedIds.length === 0
                ? t("properties.defaultStyle")
                : selectedIds.length === 1
                  ? getElementTypeName(primaryElement?.type)
                  : t("properties.selectedCount", { count: selectedIds.length })}
            </span>
            {selectedIds.length > 0 && (
              <Badge variant="default" className="text-[9px] px-1.5 py-0">
                {selectedIds.length}
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-text-muted truncate">
            {selectedIds.length === 0
              ? t("properties.forNewElements")
              : t("properties.editActiveElement")}
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover"
            title="Fechar inspetor"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {isTextual && selectedIds.length > 0 && currentId && (
        <TextContentEditor
          key={currentId}
          initialText={primaryElement?.text ?? ""}
          onChange={(newText) => engine?.updateSelectedText(newText)}
          engine={engine}
          placeholder={t("properties.typeTextPlaceholder")}
          title={t("properties.textContent")}
        />
      )}

      <div>
        <label className="text-[11px] font-medium text-text-secondary">
          {t("properties.strokeColor")}
        </label>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {strokeColors.map((color) => {
            const isSelected = strokeColor.toLowerCase() === color.toLowerCase();
            return (
              <button
                key={color}
                onClick={() => handleStrokeChange(color)}
                className={`h-5 w-5 rounded-full border transition-transform duration-100 ${
                  isSelected
                    ? "scale-110 ring-2 ring-accent-primary ring-offset-1 ring-offset-surface"
                    : "border-border-strong hover:scale-105"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            );
          })}

          <label
            className="relative flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-conic-[from_0deg,red,yellow,lime,aqua,blue,magenta,red] hover:scale-105"
            title={t("properties.customColor")}
          >
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => handleStrokeChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>
      </div>

      {hasFill && (
        <div>
          <label className="text-[11px] font-medium text-text-secondary">
            {t("properties.fillColor")}
          </label>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {fillColors.map((color) => {
              const isTransparent = color === "transparent";
              const isSelected = fillColor.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  onClick={() => handleFillChange(color)}
                  className={`flex h-5 w-5 items-center justify-center rounded-full border transition-transform duration-100 ${
                    isSelected
                      ? "scale-110 ring-2 ring-accent-primary ring-offset-1 ring-offset-surface"
                      : "border-border-strong hover:scale-105"
                  }`}
                  style={{ backgroundColor: isTransparent ? "transparent" : color }}
                  title={isTransparent ? t("properties.transparent") : color}
                >
                  {isTransparent && (
                    <div className="h-4 w-0.5 rotate-45 bg-red-500 rounded-full" />
                  )}
                </button>
              );
            })}

            <label
              className="relative flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-conic-[from_0deg,red,yellow,lime,aqua,blue,magenta,red] hover:scale-105"
              title={t("properties.customFillColor")}
            >
              <input
                type="color"
                value={fillColor === "transparent" ? "#ffffff" : fillColor}
                onChange={(e) => handleFillChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>
        </div>
      )}

      <div>
        <label className="text-[11px] font-medium text-text-secondary">
          {t("properties.strokeWidth")}
        </label>
        <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-lg border border-border-subtle bg-surface p-0.5">
          {strokeWidths.map((w) => {
            const isSelected = strokeWidth === w;
            return (
              <button
                key={w}
                onClick={() => handleWidthChange(w)}
                className={`rounded-md py-1 text-center text-xs font-mono font-medium transition-all ${
                  isSelected
                    ? "bg-surface-raised text-text-primary shadow-2xs border border-border-subtle/80"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {w}px
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-text-secondary">
            {t("properties.opacity")}
          </label>
          <span className="text-[11px] font-mono text-text-muted">
            {Math.round(opacity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={opacity}
          onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
          className="mt-1.5 w-full accent-accent-primary cursor-pointer h-1.5 rounded-lg bg-border-strong"
        />
      </div>
    </div>
  );
}
