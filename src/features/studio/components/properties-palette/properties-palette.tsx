"use client";

import type { CanvasEngine } from "@/canvas/canvas-engine";
import { Badge } from "@/components/ui/badge";
import { ColorSwatchPicker } from "@/features/studio/components/properties-palette/color-swatch-picker";
import {
  FILL_COLORS,
  STROKE_COLORS,
  STROKE_WIDTHS,
} from "@/features/studio/components/properties-palette/constants";
import { TextContentEditor } from "@/features/studio/components/properties-palette/text-content-editor";
import { useI18n } from "@/i18n/context";
import { useCanvasStore } from "@/store/canvas-store";

interface PropertiesPaletteProps {
  engine?: CanvasEngine | null;
  onClose?: () => void;
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

  const selectedElements =
    selectedIds.length > 0 && engine ? engine.getSelectedElements() : [];
  const primaryElement = selectedElements[0];
  const currentId = primaryElement?.id ?? null;

  const isTextual =
    primaryElement?.type === "sticky" || primaryElement?.type === "text";
  const hasFill =
    !primaryElement ||
    primaryElement.type === "rect" ||
    primaryElement.type === "ellipse" ||
    primaryElement.type === "diamond" ||
    primaryElement.type === "sticky";

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
        return t("studio.inspector.elementTypes.rect");
      case "ellipse":
        return t("studio.inspector.elementTypes.ellipse");
      case "diamond":
        return t("studio.inspector.elementTypes.diamond");
      case "line":
        return t("studio.inspector.elementTypes.line");
      case "arrow":
        return t("studio.inspector.elementTypes.arrow");
      case "sticky":
        return t("studio.inspector.elementTypes.sticky");
      case "text":
        return t("studio.inspector.elementTypes.text");
      case "freehand":
        return t("studio.inspector.elementTypes.freehand");
      default:
        return t("studio.inspector.elementTypes.element");
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-strong bg-surface-raised/95 p-3.5 shadow-xl backdrop-blur-md w-64 select-none animate-in fade-in zoom-in-95 duration-100">
      <div className="flex items-center justify-between border-b border-border-subtle pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-text-primary truncate">
              {selectedIds.length === 0
                ? t("studio.inspector.header.defaultStyle")
                : selectedIds.length === 1
                  ? getElementTypeName(primaryElement?.type)
                  : t("studio.inspector.header.selectedCount", {
                      count: selectedIds.length,
                    })}
            </span>
            {selectedIds.length > 0 && (
              <Badge variant="default" className="text-[9px] px-1.5 py-0">
                {selectedIds.length}
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-text-muted truncate">
            {selectedIds.length === 0
              ? t("studio.inspector.header.forNewElements")
              : t("studio.inspector.header.editActiveElement")}
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover"
            title={t("studio.inspector.closeButton")}
            aria-label={t("studio.inspector.closeButton")}
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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
          placeholder={t("studio.inspector.fields.typeTextPlaceholder")}
          title={t("studio.inspector.fields.textContent")}
        />
      )}

      <ColorSwatchPicker
        label={t("studio.inspector.fields.strokeColor")}
        colors={STROKE_COLORS}
        value={strokeColor}
        onChange={handleStrokeChange}
        customPickerTitle={t("studio.inspector.fields.customStrokeColor")}
      />

      {hasFill && (
        <ColorSwatchPicker
          label={t("studio.inspector.fields.fillColor")}
          colors={FILL_COLORS}
          value={fillColor}
          onChange={handleFillChange}
          customPickerTitle={t("studio.inspector.fields.customFillColor")}
        />
      )}

      <div>
        <label className="text-[11px] font-medium text-text-secondary">
          {t("studio.inspector.fields.strokeWidth")}
        </label>
        <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-lg border border-border-subtle bg-surface p-0.5">
          {STROKE_WIDTHS.map((w) => {
            const isSelected = strokeWidth === w;
            return (
              <button
                key={w}
                type="button"
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
            {t("studio.inspector.fields.opacity")}
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
