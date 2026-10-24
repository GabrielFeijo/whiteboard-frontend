"use client";

import { useState } from "react";
import type { CanvasEngine } from "@/canvas/canvas-engine";
import { AlignmentType, DistributionType } from "@/canvas/alignment-helper";
import { useI18n } from "@/i18n/context";
import type { TranslationKey } from "@/i18n/types";
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
  type LucideIcon,
} from "lucide-react";

interface PaletteAlignmentSectionProps {
  engine?: CanvasEngine | null;
  selectedCount: number;
}

const HORIZONTAL_ALIGNMENTS: ReadonlyArray<{
  type: AlignmentType;
  labelKey: TranslationKey;
  icon: LucideIcon;
}> = [
  {
    type: AlignmentType.LEFT,
    labelKey: "studio.inspector.actions.alignLeft",
    icon: AlignStartHorizontal,
  },
  {
    type: AlignmentType.CENTER,
    labelKey: "studio.inspector.actions.alignCenter",
    icon: AlignCenterHorizontal,
  },
  {
    type: AlignmentType.RIGHT,
    labelKey: "studio.inspector.actions.alignRight",
    icon: AlignEndHorizontal,
  },
];

const VERTICAL_ALIGNMENTS: ReadonlyArray<{
  type: AlignmentType;
  labelKey: TranslationKey;
  icon: LucideIcon;
}> = [
  {
    type: AlignmentType.TOP,
    labelKey: "studio.inspector.actions.alignTop",
    icon: AlignStartVertical,
  },
  {
    type: AlignmentType.MIDDLE,
    labelKey: "studio.inspector.actions.alignMiddle",
    icon: AlignCenterVertical,
  },
  {
    type: AlignmentType.BOTTOM,
    labelKey: "studio.inspector.actions.alignBottom",
    icon: AlignEndVertical,
  },
];

export function PaletteAlignmentSection({
  engine,
  selectedCount,
}: PaletteAlignmentSectionProps) {
  const { t } = useI18n();
  const [spacingGap, setSpacingGap] = useState<number>(4);

  const handleApplySpacingGap = (nextGap: number) => {
    const clamped = Math.max(0, Math.min(500, nextGap));
    setSpacingGap(clamped);
    engine?.standardizeSpacingSelected("auto", clamped);
  };

  return (
    <div className="border-b border-border-subtle pb-2.5">
      <div className="flex items-center justify-between gap-0.5 rounded-lg border border-border-subtle bg-surface p-0.5">
        {HORIZONTAL_ALIGNMENTS.map(({ type, labelKey, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => engine?.alignSelected(type)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
            title={t(labelKey)}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}

        <div className="h-4 w-px bg-border-subtle" />

        {VERTICAL_ALIGNMENTS.map(({ type, labelKey, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => engine?.alignSelected(type)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
            title={t(labelKey)}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}

        {selectedCount >= 3 && (
          <>
            <div className="h-4 w-px bg-border-subtle" />
            <button
              type="button"
              onClick={() =>
                engine?.distributeSelected(DistributionType.HORIZONTAL)
              }
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
              title={t("studio.inspector.actions.distributeHorizontal")}
            >
              <AlignHorizontalDistributeCenter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                engine?.distributeSelected(DistributionType.VERTICAL)
              }
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
              onChange={(e) =>
                handleApplySpacingGap(parseInt(e.target.value, 10) || 0)
              }
              className="w-12 h-6 px-1.5 text-center text-xs rounded bg-surface border border-border-subtle text-text-primary focus:outline-none focus:border-accent-primary"
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
                onClick={() => handleApplySpacingGap(preset)}
                className={`h-5 px-1.5 text-[10px] rounded transition-all font-medium ${
                  spacingGap === preset
                    ? "bg-accent-primary text-accent-text shadow-xs"
                    : "bg-surface-raised border border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-hover"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                engine?.standardizeSpacingSelected("horizontal", spacingGap)
              }
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
              title={t("studio.inspector.actions.standardizeHorizontal")}
            >
              <AlignHorizontalSpaceAround className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                engine?.standardizeSpacingSelected("vertical", spacingGap)
              }
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
              title={t("studio.inspector.actions.standardizeVertical")}
            >
              <AlignVerticalSpaceAround className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
