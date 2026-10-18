"use client";

import { useState } from "react";
import type { CanvasEngine } from "@/canvas/canvas-engine";
import { AlignmentType, DistributionType } from "@/canvas/alignment-helper";
import { ElementType } from "@/shared";
import { Badge } from "@/components/ui/badge";
import { ColorSwatchPicker } from "@/features/studio/components/properties-palette/color-swatch-picker";
import {
  FILL_COLORS,
  STROKE_COLORS,
  STROKE_WIDTHS,
} from "@/features/studio/components/properties-palette/constants";
import { TextContentEditor } from "@/features/studio/components/properties-palette/text-content-editor";
import { useI18n } from "@/i18n/context";
import type { TranslationKey } from "@/i18n/types";
import { useCanvasStore } from "@/store/canvas-store";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignHorizontalSpaceAround,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  AlignVerticalSpaceAround,
  Group,
  Lock,
  Unlock,
  Ungroup,
  X,
} from "lucide-react";

const FILLABLE_ELEMENT_TYPES = new Set<ElementType>([
  ElementType.RECT,
  ElementType.ELLIPSE,
  ElementType.DIAMOND,
  ElementType.STICKY,
]);

const ELEMENT_TYPE_I18N_KEYS: Partial<Record<ElementType, TranslationKey>> = {
  [ElementType.RECT]: "studio.inspector.elementTypes.rect",
  [ElementType.ELLIPSE]: "studio.inspector.elementTypes.ellipse",
  [ElementType.DIAMOND]: "studio.inspector.elementTypes.diamond",
  [ElementType.LINE]: "studio.inspector.elementTypes.line",
  [ElementType.ARROW]: "studio.inspector.elementTypes.arrow",
  [ElementType.STICKY]: "studio.inspector.elementTypes.sticky",
  [ElementType.TEXT]: "studio.inspector.elementTypes.text",
  [ElementType.FREEHAND]: "studio.inspector.elementTypes.freehand",
};

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

  const [spacingGap, setSpacingGap] = useState<number>(4);

  const selectedElements =
    selectedIds.length > 0 && engine ? engine.getSelectedElements() : [];
  const primaryElement = selectedElements[0];
  const currentId = primaryElement?.id ?? null;

  const isTextual =
    primaryElement?.type === ElementType.STICKY ||
    primaryElement?.type === ElementType.TEXT;
  const hasFill =
    !primaryElement || FILLABLE_ELEMENT_TYPES.has(primaryElement.type);

  const isLocked =
    selectedElements.length > 0 && selectedElements.every((el) => el.locked);
  const hasMultiple = selectedElements.length >= 2;
  const isGrouped = selectedElements.some((el) => !!el.groupId);

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

  const getElementTypeName = (type?: ElementType) => {
    const key = type ? ELEMENT_TYPE_I18N_KEYS[type] : undefined;
    return key ? t(key) : t("studio.inspector.elementTypes.element");
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
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-1.5 border-b border-border-subtle pb-2.5">
          <button
            type="button"
            onClick={() => engine?.toggleLockSelected()}
            className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md font-medium transition-all ${
              isLocked
                ? "bg-rose-500/15 text-rose-500 border border-rose-500/30 hover:bg-rose-500/25"
                : "bg-surface text-text-secondary border border-border-subtle hover:text-text-primary hover:bg-surface-hover"
            }`}
            title={
              isLocked
                ? t("studio.inspector.actions.unlockShortcut")
                : t("studio.inspector.actions.lockShortcut")
            }
          >
            {isLocked ? (
              <Unlock className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
            <span>
              {isLocked
                ? t("studio.inspector.actions.unlock")
                : t("studio.inspector.actions.lock")}
            </span>
          </button>

          {hasMultiple && !isGrouped && (
            <button
              type="button"
              onClick={() => engine?.groupSelected()}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md font-medium bg-surface text-text-secondary border border-border-subtle hover:text-text-primary hover:bg-surface-hover transition-all"
              title={t("studio.inspector.actions.groupShortcut")}
            >
              <Group className="h-3.5 w-3.5" />
              <span>{t("studio.inspector.actions.group")}</span>
            </button>
          )}

          {isGrouped && (
            <button
              type="button"
              onClick={() => engine?.ungroupSelected()}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md font-medium bg-surface text-text-secondary border border-border-subtle hover:text-text-primary hover:bg-surface-hover transition-all"
              title={t("studio.inspector.actions.ungroupShortcut")}
            >
              <Ungroup className="h-3.5 w-3.5" />
              <span>{t("studio.inspector.actions.ungroup")}</span>
            </button>
          )}
        </div>
      )}

      {selectedIds.length >= 2 && !isLocked && (
        <div className="border-b border-border-subtle pb-2.5">
          <div className="flex items-center justify-between gap-0.5 rounded-lg border border-border-subtle bg-surface p-0.5">
            <button
              type="button"
              onClick={() => engine?.alignSelected(AlignmentType.LEFT)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
              title={t("studio.inspector.actions.alignLeft")}
            >
              <AlignStartHorizontal className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => engine?.alignSelected(AlignmentType.CENTER)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
              title={t("studio.inspector.actions.alignCenter")}
            >
              <AlignCenterHorizontal className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => engine?.alignSelected(AlignmentType.RIGHT)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
              title={t("studio.inspector.actions.alignRight")}
            >
              <AlignEndHorizontal className="h-3.5 w-3.5" />
            </button>
            <div className="h-4 w-px bg-border-subtle" />
            <button
              type="button"
              onClick={() => engine?.alignSelected(AlignmentType.TOP)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
              title={t("studio.inspector.actions.alignTop")}
            >
              <AlignStartVertical className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => engine?.alignSelected(AlignmentType.MIDDLE)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
              title={t("studio.inspector.actions.alignMiddle")}
            >
              <AlignCenterVertical className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => engine?.alignSelected(AlignmentType.BOTTOM)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
              title={t("studio.inspector.actions.alignBottom")}
            >
              <AlignEndVertical className="h-3.5 w-3.5" />
            </button>
            {selectedIds.length >= 3 && (
              <>
                <div className="h-4 w-px bg-border-subtle" />
                <button
                  type="button"
                  onClick={() => engine?.distributeSelected(DistributionType.HORIZONTAL)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
                  title={t("studio.inspector.actions.distributeHorizontal")}
                >
                  <AlignHorizontalDistributeCenter className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => engine?.distributeSelected(DistributionType.VERTICAL)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
                  title={t("studio.inspector.actions.distributeVertical")}
                >
                  <AlignVerticalDistributeCenter className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-border-subtle flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted">
                {t("studio.inspector.actions.standardizeSpacing")}
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={spacingGap}
                  onChange={(e) => setSpacingGap(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-12 h-6 px-1.5 text-center text-xs rounded bg-surface border border-border-subtle text-text-primary focus:outline-none focus:border-brand-primary"
                  title={t("studio.inspector.actions.spacingGap")}
                />
                <span className="text-[10px] text-text-muted">px</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1">
                {[0, 4, 8, 16, 24].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSpacingGap(preset)}
                    className={`h-5 px-1.5 text-[10px] rounded transition-all ${
                      spacingGap === preset
                        ? "bg-brand-primary text-white font-medium"
                        : "bg-surface text-text-muted hover:text-text-primary hover:bg-surface-raised"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => engine?.standardizeSpacingSelected("horizontal", spacingGap)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
                  title={t("studio.inspector.actions.standardizeHorizontal")}
                >
                  <AlignHorizontalSpaceAround className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => engine?.standardizeSpacingSelected("vertical", spacingGap)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
                  title={t("studio.inspector.actions.standardizeVertical")}
                >
                  <AlignVerticalSpaceAround className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLocked ? (
        <div className="rounded-lg bg-surface p-3 text-center border border-border-subtle text-text-muted text-xs">
          {t("studio.inspector.actions.lockedNotice")}
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
