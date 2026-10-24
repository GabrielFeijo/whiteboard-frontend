"use client";

import type { CanvasEngine } from "@/canvas/canvas-engine";
import { useI18n } from "@/i18n/context";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Group,
  Lock,
  Ungroup,
  Unlock,
} from "lucide-react";

interface PaletteQuickActionsProps {
  engine?: CanvasEngine | null;
  isLocked: boolean;
  hasMultiple: boolean;
  isGrouped: boolean;
}

export function PaletteQuickActions({
  engine,
  isLocked,
  hasMultiple,
  isGrouped,
}: PaletteQuickActionsProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border-subtle pb-2.5">
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

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => engine?.sendSelectedToBack()}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-surface text-text-secondary border border-border-subtle hover:text-text-primary hover:bg-surface-hover transition-all"
          title={t("studio.inspector.actions.sendToBack")}
          aria-label={t("studio.inspector.actions.sendToBack")}
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => engine?.bringSelectedToFront()}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-surface text-text-secondary border border-border-subtle hover:text-text-primary hover:bg-surface-hover transition-all"
          title={t("studio.inspector.actions.bringToFront")}
          aria-label={t("studio.inspector.actions.bringToFront")}
        >
          <ArrowUpToLine className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
