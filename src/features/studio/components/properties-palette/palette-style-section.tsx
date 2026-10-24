"use client";

import type { CanvasEngine } from "@/canvas/canvas-engine";
import { ElementData, ElementType } from "@/shared";
import { ColorSwatchPicker } from "@/features/studio/components/properties-palette/color-swatch-picker";
import {
  FILL_COLORS,
  STROKE_COLORS,
  STROKE_WIDTHS,
} from "@/features/studio/components/properties-palette/constants";
import { TextContentEditor } from "@/features/studio/components/properties-palette/text-content-editor";
import { useI18n } from "@/i18n/context";

const FILLABLE_ELEMENT_TYPES = new Set<ElementType>([
  ElementType.RECT,
  ElementType.ELLIPSE,
  ElementType.DIAMOND,
  ElementType.STICKY,
]);

const TEXT_EDITABLE_ELEMENT_TYPES = new Set<ElementType>([
  ElementType.STICKY,
  ElementType.TEXT,
  ElementType.RECT,
  ElementType.ELLIPSE,
  ElementType.DIAMOND,
]);

const ROTATABLE_ELEMENT_TYPES = new Set<ElementType>([
  ElementType.RECT,
  ElementType.ELLIPSE,
  ElementType.DIAMOND,
  ElementType.STICKY,
  ElementType.TEXT,
  ElementType.IMAGE,
]);

interface PaletteStyleSectionProps {
  engine?: CanvasEngine | null;
  primaryElement?: ElementData;
  selectedCount: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  onStrokeChange: (color: string) => void;
  onFillChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onOpacityChange: (value: number) => void;
}

export function PaletteStyleSection({
  engine,
  primaryElement,
  selectedCount,
  strokeColor,
  fillColor,
  strokeWidth,
  opacity,
  onStrokeChange,
  onFillChange,
  onWidthChange,
  onOpacityChange,
}: PaletteStyleSectionProps) {
  const { t } = useI18n();

  const currentId = primaryElement?.id ?? null;
  const isTextual =
    primaryElement !== undefined &&
    TEXT_EDITABLE_ELEMENT_TYPES.has(primaryElement.type);
  const hasFill =
    !primaryElement || FILLABLE_ELEMENT_TYPES.has(primaryElement.type);
  const canRotate =
    primaryElement !== undefined &&
    ROTATABLE_ELEMENT_TYPES.has(primaryElement.type);

  const currentRotation = Math.round(primaryElement?.rotation ?? 0);

  return (
    <>
      {isTextual && selectedCount > 0 && currentId && (
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
        onChange={onStrokeChange}
        customPickerTitle={t("studio.inspector.fields.customStrokeColor")}
      />

      {hasFill && (
        <ColorSwatchPicker
          label={t("studio.inspector.fields.fillColor")}
          colors={FILL_COLORS}
          value={fillColor}
          onChange={onFillChange}
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
                onClick={() => onWidthChange(w)}
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
          onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
          className="mt-1.5 w-full accent-accent-primary cursor-pointer h-1.5 rounded-lg bg-border-strong"
        />
      </div>

      {canRotate && selectedCount > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-text-secondary">
              {t("studio.inspector.fields.rotation")}
            </label>
            <div className="flex items-center gap-1">
              {[0, 45, 90, 180].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => engine?.updateSelectedRotation(deg)}
                  className={`h-5 px-1.5 text-[10px] rounded font-mono transition-all ${
                    currentRotation === deg
                      ? "bg-accent-primary text-accent-text"
                      : "bg-surface border border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  {deg}°
                </button>
              ))}
              <span className="text-[11px] font-mono text-text-muted ml-1 w-9 text-right">
                {currentRotation}°
              </span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={currentRotation}
            onChange={(e) =>
              engine?.updateSelectedRotation(parseInt(e.target.value, 10) || 0)
            }
            className="mt-1.5 w-full accent-accent-primary cursor-pointer h-1.5 rounded-lg bg-border-strong"
          />
        </div>
      )}
    </>
  );
}
