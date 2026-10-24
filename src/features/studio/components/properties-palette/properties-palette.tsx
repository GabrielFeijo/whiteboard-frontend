"use client";

import type { CanvasEngine } from "@/canvas/canvas-engine";
import { ElementType } from "@/shared";
import { Badge } from "@/components/ui/badge";
import { PaletteAlignmentSection } from "@/features/studio/components/properties-palette/palette-alignment-section";
import { PaletteQuickActions } from "@/features/studio/components/properties-palette/palette-quick-actions";
import { PaletteStyleSection } from "@/features/studio/components/properties-palette/palette-style-section";
import { useSelectedElements } from "@/features/studio/hooks/use-selected-elements";
import { useI18n } from "@/i18n/context";
import type { TranslationKey } from "@/i18n/types";
import { useCanvasStore } from "@/store/canvas-store";
import { X } from "lucide-react";

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

  const selectedElements = useSelectedElements(engine);
  const primaryElement = selectedElements[0];

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
        <PaletteQuickActions
          engine={engine}
          isLocked={isLocked}
          hasMultiple={hasMultiple}
          isGrouped={isGrouped}
        />
      )}

      {selectedIds.length >= 2 && !isLocked && (
        <PaletteAlignmentSection
          engine={engine}
          selectedCount={selectedIds.length}
        />
      )}

      {isLocked ? (
        <div className="rounded-lg bg-surface p-3 text-center border border-border-subtle text-text-muted text-xs">
          {t("studio.inspector.actions.lockedNotice")}
        </div>
      ) : (
        <PaletteStyleSection
          engine={engine}
          primaryElement={primaryElement}
          selectedCount={selectedIds.length}
          strokeColor={strokeColor}
          fillColor={fillColor}
          strokeWidth={strokeWidth}
          opacity={opacity}
          onStrokeChange={handleStrokeChange}
          onFillChange={handleFillChange}
          onWidthChange={handleWidthChange}
          onOpacityChange={handleOpacityChange}
        />
      )}
    </div>
  );
}
