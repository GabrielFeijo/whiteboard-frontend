"use client";

import { useEffect, useState } from "react";
import type { CanvasEngine } from "@/canvas/canvas-engine";
import { Point } from "@/canvas/viewport";
import { useSelectedElements } from "@/features/studio/hooks/use-selected-elements";
import { useI18n } from "@/i18n/context";
import { Role } from "@/shared";
import { useCanvasStore } from "@/store/canvas-store";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Group,
  Lock,
  Maximize2,
  MousePointerClick,
  RotateCcw,
  Scissors,
  Trash2,
  Ungroup,
  type LucideIcon,
} from "lucide-react";

interface CanvasContextMenuProps {
  engine: CanvasEngine | null;
}

interface MenuState {
  screenPt: Point;
  worldPt: Point;
}

interface ContextMenuItemProps {
  icon: LucideIcon;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}

function ContextMenuItem({
  icon: Icon,
  label,
  destructive = false,
  onClick,
}: ContextMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
        destructive
          ? "text-rose-500 hover:bg-rose-500/10"
          : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

export function CanvasContextMenu({ engine }: CanvasContextMenuProps) {
  const { t } = useI18n();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const selectedElements = useSelectedElements(engine);

  useEffect(() => {
    if (!engine) return;
    const canvas = engine.overlayCanvas;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const worldPt = engine.viewport.screenToWorld(screenPt);

      const hitId = engine.hitTest(worldPt);
      const currentSelected = useCanvasStore.getState().selectedIds;
      if (hitId && !currentSelected.includes(hitId)) {
        const expanded = engine.expandSelectionGroups([hitId]);
        useCanvasStore.getState().setSelectedIds(expanded);
        engine.syncStoreWithSelection(expanded);
      }

      const menuX = Math.min(e.clientX, window.innerWidth - 220);
      const menuY = Math.min(e.clientY, window.innerHeight - 320);
      setMenu({
        screenPt: { x: menuX, y: menuY },
        worldPt,
      });
    };

    const handleDismiss = () => setMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };

    canvas.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("pointerdown", handleDismiss);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      canvas.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("pointerdown", handleDismiss);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [engine]);

  if (!engine || !menu) return null;

  const isViewer = engine.role === Role.VIEWER;
  const hasSelection = selectedElements.length > 0;
  const hasMultiple = selectedElements.length >= 2;
  const isGrouped = selectedElements.some((el) => Boolean(el.groupId));
  const canPaste = !isViewer && engine.hasCopiedElements();

  const runAction = (fn: () => void) => {
    fn();
    setMenu(null);
  };

  return (
    <div
      style={{ left: `${menu.screenPt.x}px`, top: `${menu.screenPt.y}px` }}
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed z-40 w-56 rounded-xl border border-border-strong bg-surface-raised/95 p-1.5 shadow-2xl backdrop-blur-md text-xs select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {hasSelection ? (
        <>
          <ContextMenuItem
            icon={Copy}
            label={t("studio.contextMenu.copy")}
            onClick={() => runAction(() => engine.copySelected())}
          />

          {!isViewer && (
            <>
              <ContextMenuItem
                icon={Scissors}
                label={t("studio.contextMenu.cut")}
                onClick={() => runAction(() => engine.cutSelected())}
              />
              <ContextMenuItem
                icon={CopyPlus}
                label={t("studio.contextMenu.duplicate")}
                onClick={() => runAction(() => engine.duplicateSelected())}
              />

              <div className="my-1 h-px bg-border-subtle" />

              <ContextMenuItem
                icon={ArrowUpToLine}
                label={t("studio.contextMenu.bringToFront")}
                onClick={() => runAction(() => engine.bringSelectedToFront())}
              />
              <ContextMenuItem
                icon={ArrowDownToLine}
                label={t("studio.contextMenu.sendToBack")}
                onClick={() => runAction(() => engine.sendSelectedToBack())}
              />

              {hasMultiple && !isGrouped && (
                <ContextMenuItem
                  icon={Group}
                  label={t("studio.contextMenu.group")}
                  onClick={() => runAction(() => engine.groupSelected())}
                />
              )}

              {isGrouped && (
                <ContextMenuItem
                  icon={Ungroup}
                  label={t("studio.contextMenu.ungroup")}
                  onClick={() => runAction(() => engine.ungroupSelected())}
                />
              )}

              <ContextMenuItem
                icon={Lock}
                label={t("studio.contextMenu.lock")}
                onClick={() => runAction(() => engine.toggleLockSelected())}
              />

              <div className="my-1 h-px bg-border-subtle" />

              <ContextMenuItem
                icon={Trash2}
                label={t("studio.contextMenu.delete")}
                destructive
                onClick={() => runAction(() => engine.deleteSelected())}
              />
            </>
          )}
        </>
      ) : (
        <>
          {canPaste && (
            <ContextMenuItem
              icon={ClipboardPaste}
              label={t("studio.contextMenu.paste")}
              onClick={() =>
                runAction(() => {
                  engine.pasteCopiedElements(menu.worldPt);
                })
              }
            />
          )}

          <ContextMenuItem
            icon={MousePointerClick}
            label={t("studio.contextMenu.selectAll")}
            onClick={() => runAction(() => engine.selectAll())}
          />

          <div className="my-1 h-px bg-border-subtle" />

          <ContextMenuItem
            icon={Maximize2}
            label={t("studio.contextMenu.fitToContent")}
            onClick={() => runAction(() => engine.fitToContent())}
          />
          <ContextMenuItem
            icon={RotateCcw}
            label={t("studio.contextMenu.resetZoom")}
            onClick={() => runAction(() => engine.resetViewport())}
          />
        </>
      )}
    </div>
  );
}
