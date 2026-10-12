"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCanvasStore } from "../store/canvas-store";
import { CanvasEngine } from "../canvas/canvas-engine";
import { useI18n } from "../i18n";

interface PropertiesPaletteProps {
  engine?: CanvasEngine | null;
}

export function PropertiesPalette({ engine }: PropertiesPaletteProps) {
  const { t } = useI18n();
  const textInputRef = useRef<HTMLTextAreaElement>(null);
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

  const [prevId, setPrevId] = useState<string | null>(null);
  const [textValue, setTextValue] = useState("");

  if (currentId !== prevId) {
    setPrevId(currentId);
    setTextValue(primaryElement?.text ?? "");
  }

  const isTextual = primaryElement?.type === "sticky" || primaryElement?.type === "text";
  const hasFill =
    !primaryElement ||
    primaryElement.type === "rect" ||
    primaryElement.type === "ellipse" ||
    primaryElement.type === "diamond" ||
    primaryElement.type === "sticky";

  useEffect(() => {
    const handleFocus = () => {
      textInputRef.current?.focus();
      textInputRef.current?.select();
    };
    window.addEventListener("wb-focus-text-input", handleFocus);
    return () => {
      window.removeEventListener("wb-focus-text-input", handleFocus);
    };
  }, []);

  useEffect(() => {
    if (isTextual && currentId) {
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
        textInputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentId, isTextual]);

  const strokeColors = [
    "#0f172a",
    "#ef4444",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
  ];

  const fillColors = [
    "transparent",
    "#fee2e2",
    "#fef3c7",
    "#d1fae5",
    "#dbeafe",
    "#ede9fe",
    "#fce7f3",
    "#ffffff",
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

  const handleTextChange = (newText: string) => {
    setTextValue(newText);
    engine?.updateSelectedText(newText);
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
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white/95 p-3.5 shadow-lg backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/95 w-60">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
        <div>
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            {selectedIds.length === 0
              ? t("properties.defaultStyle")
              : selectedIds.length === 1
                ? getElementTypeName(primaryElement?.type)
                : t("properties.selectedCount", { count: selectedIds.length })}
          </span>
          <p className="text-[10px] text-zinc-400">
            {selectedIds.length === 0
              ? t("properties.forNewElements")
              : t("properties.editActiveElement")}
          </p>
        </div>
        {selectedIds.length > 0 && (
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
            {t("properties.editingBadge")}
          </span>
        )}
      </div>

      {isTextual && selectedIds.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              {t("properties.textContent")}
            </label>
            <span className="text-[10px] text-zinc-400">
              {textValue.length}
            </span>
          </div>
          <textarea
            ref={textInputRef}
            value={textValue}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={t("properties.typeTextPlaceholder")}
            rows={3}
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-indigo-500 dark:focus:bg-zinc-800 dark:focus:ring-indigo-500/30 selection:bg-indigo-600 selection:text-white resize-y min-h-15"
          />
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {t("properties.strokeColor")}
        </label>
        <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
          {strokeColors.map((color) => (
            <button
              key={color}
              onClick={() => handleStrokeChange(color)}
              className={`h-6 w-6 rounded-full border transition ${strokeColor === color
                  ? "scale-110 ring-2 ring-indigo-500 ring-offset-2"
                  : "border-zinc-300 dark:border-zinc-700"
                }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => handleStrokeChange(e.target.value)}
            className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
            title={t("properties.customColor")}
          />
        </div>
      </div>

      {hasFill && (
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {t("properties.fillColor")}
          </label>
          <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
            {fillColors.map((color) => {
              const isTransparent = color === "transparent";
              const isSelected = fillColor === color;
              return (
                <button
                  key={color}
                  onClick={() => handleFillChange(color)}
                  className={`h-6 w-6 rounded-full border transition flex items-center justify-center ${isSelected
                      ? "scale-110 ring-2 ring-indigo-500 ring-offset-2"
                      : "border-zinc-300 dark:border-zinc-700"
                    }`}
                  style={{ backgroundColor: isTransparent ? "#ffffff" : color }}
                  title={isTransparent ? t("properties.transparent") : color}
                >
                  {isTransparent && <span className="text-[10px] text-red-500 font-bold">∅</span>}
                </button>
              );
            })}
            <input
              type="color"
              value={fillColor === "transparent" ? "#ffffff" : fillColor}
              onChange={(e) => handleFillChange(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
              title={t("properties.customFillColor")}
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {t("properties.strokeWidth")}
        </label>
        <div className="mt-1.5 flex gap-1.5">
          {strokeWidths.map((w) => (
            <button
              key={w}
              onClick={() => handleWidthChange(w)}
              className={`flex-1 rounded-lg py-1 text-xs font-semibold transition ${strokeWidth === w
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
            >
              {w}px
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          <span>{t("properties.opacity")}</span>
          <span>{Math.round(opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={opacity}
          onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
          className="mt-1.5 w-full accent-indigo-600"
        />
      </div>

      {selectedIds.length > 0 && (
        <div className="border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => engine?.duplicateSelected()}
              className="flex items-center justify-center gap-1 rounded-lg bg-zinc-100 py-1.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              title={t("properties.duplicate")}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{t("common.duplicate")}</span>
            </button>

            <button
              onClick={() => engine?.deleteSelected()}
              className="flex items-center justify-center gap-1 rounded-lg bg-red-50 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70"
              title={t("properties.delete")}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>{t("common.delete")}</span>
            </button>

            <button
              onClick={() => engine?.bringSelectedToFront()}
              className="flex items-center justify-center gap-1 rounded-lg bg-zinc-100 py-1 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              title={t("properties.bringToFront")}
            >
              <span>{t("properties.bringToFront")}</span>
            </button>

            <button
              onClick={() => engine?.sendSelectedToBack()}
              className="flex items-center justify-center gap-1 rounded-lg bg-zinc-100 py-1 text-[10px] font-semibold text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              title={t("properties.sendToBack")}
            >
              <span>{t("properties.sendToBack")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
