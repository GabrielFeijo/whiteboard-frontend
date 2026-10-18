import { CanvasHost, CanvasTool, ToolContext } from "./tool.interface";
import { CanvasToolType, useCanvasStore } from "@/store/canvas-store";
import { ArrowBinding, ElementData, ElementType, getDocRoots, isStructuralElement, Role } from "@/shared";
import { LOCAL_ORIGIN } from "@/collab/undo-manager";
import {
  Bounds,
  calculateResizedBounds,
  getHandleAt,
  ResizeHandleType,
  scaleFreehandPoints,
} from "@/canvas/resize-helper";
import { YjsElementAdapter } from "@/canvas/yjs-element-adapter";
import {
  calculateResizeSmartGuides,
  calculateSmartGuides,
  SpacingGuide,
} from "@/canvas/alignment-helper";
import { findNearestAnchor, getNearbyAnchorPoints } from "@/canvas/connector-helper";
import { translateGeometry } from "@/canvas/geometry-helper";
import * as Y from "yjs";

export const SelectDragMode = {
  NONE: "none",
  MOVE: "move",
  RESIZE: "resize",
  SELECT_BOX: "selectBox",
} as const;
export type SelectDragMode =
  (typeof SelectDragMode)[keyof typeof SelectDragMode];

interface MoveInitialItem {
  x: number;
  y: number;
  w: number;
  h: number;
  type: ElementData["type"];
  points?: number[];
  startBinding?: ArrowBinding;
  endBinding?: ArrowBinding;
}

interface ResizeState {
  handle: ResizeHandleType;
  elementId: string;
  initialBounds: { x: number; y: number; w: number; h: number };
  initialPoints?: number[];
  startWorldPt: { x: number; y: number };
}

export class SelectTool implements CanvasTool {
  readonly id = CanvasToolType.SELECT;

  private dragMode: SelectDragMode = SelectDragMode.NONE;
  private startPoint = { x: 0, y: 0 };
  private moveInitialElements = new Map<string, MoveInitialItem>();
  private resizeInfo: ResizeState | null = null;

  constructor(private readonly host: CanvasHost) {}

  onPointerDown(ctx: ToolContext): void {
    if (this.host.role === Role.VIEWER) return;

    this.startPoint = { ...ctx.worldPt };

    const singleHandle = this.getSingleSelectedResizeHandle(ctx);
    if (singleHandle) {
      this.dragMode = SelectDragMode.RESIZE;
      this.resizeInfo = {
        handle: singleHandle.handle.type,
        elementId: singleHandle.selectedId,
        initialBounds: {
          x: singleHandle.el.x,
          y: singleHandle.el.y,
          w: singleHandle.el.w,
          h: singleHandle.el.h,
        },
        initialPoints: singleHandle.el.points
          ? [...singleHandle.el.points]
          : [
              singleHandle.el.x,
              singleHandle.el.y,
              singleHandle.el.x + singleHandle.el.w,
              singleHandle.el.y + singleHandle.el.h,
            ],
        startWorldPt: { ...ctx.worldPt },
      };
      return;
    }

    const hitId = this.host.hitTest(ctx.worldPt);
    if (!hitId) {
      if (!ctx.event.shiftKey) {
        useCanvasStore.getState().setSelectedIds([]);
      }
      this.dragMode = SelectDragMode.SELECT_BOX;
      this.host.setSelectBox({ x: ctx.worldPt.x, y: ctx.worldPt.y, w: 0, h: 0 });
      return;
    }

    this.handleHitSelection(hitId, ctx.event.shiftKey);
  }

  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isPointerDown || this.host.role === Role.VIEWER) return;

    if (this.dragMode === SelectDragMode.RESIZE) {
      this.handleResizeMove(ctx);
    } else if (this.dragMode === SelectDragMode.MOVE) {
      this.handleMoveElements(ctx);
    } else if (this.dragMode === SelectDragMode.SELECT_BOX) {
      this.handleSelectBoxMove(ctx);
    }
  }

  onPointerUp(): void {
    this.host.setGuides(null);
    this.host.setSnapIndicator(null);

    if (this.dragMode === SelectDragMode.SELECT_BOX) {
      this.finishSelectBox();
    } else if (this.dragMode === SelectDragMode.MOVE) {
      this.finishMove();
    } else if (this.dragMode === SelectDragMode.RESIZE) {
      this.finishResize();
    }

    this.dragMode = SelectDragMode.NONE;
    this.host.setDirty();
  }

  getCursor(ctx: ToolContext): string {
    if (this.host.role === Role.VIEWER) return "default";

    const singleHandle = this.getSingleSelectedResizeHandle(ctx);
    if (singleHandle) {
      return singleHandle.handle.cursor;
    }

    const hitId = this.host.hitTest(ctx.worldPt);
    if (!hitId) return "default";

    const roots = getDocRoots(this.host.doc);
    const map = roots.elements.get(hitId);
    if (map?.get("locked") === true) {
      return "default";
    }

    return "move";
  }

  onDeactivate(): void {
    this.dragMode = SelectDragMode.NONE;
    this.resizeInfo = null;
    this.moveInitialElements.clear();
    this.host.setSelectBox(null);
    this.host.setGuides(null);
    this.host.setSnapIndicator(null);
  }

  private getSingleSelectedResizeHandle(ctx: ToolContext) {
    const store = useCanvasStore.getState();
    if (store.selectedIds.length !== 1) return null;

    const selectedId = store.selectedIds[0];
    const roots = getDocRoots(this.host.doc);
    const map = roots.elements.get(selectedId);
    if (!map) return null;

    const el = YjsElementAdapter.toElementData(map);
    if (!el || el.locked) return null;

    const handle = getHandleAt(
      ctx.screenPt,
      el,
      this.host.viewport,
      12,
      (id) => this.host.getElementById(id),
    );
    if (!handle) return null;

    return { handle, el, selectedId };
  }

  private handleHitSelection(hitId: string, isShift: boolean): void {
    const store = useCanvasStore.getState();
    const expandedIds = this.host.expandSelectionGroups([hitId]);
    const isAlreadySelected = expandedIds.some((id) =>
      store.selectedIds.includes(id),
    );

    if (isShift) {
      const nextIds = isAlreadySelected
        ? store.selectedIds.filter((id) => !expandedIds.includes(id))
        : [...store.selectedIds, ...expandedIds];
      store.setSelectedIds(nextIds);
    } else if (!isAlreadySelected) {
      store.setSelectedIds(expandedIds);
    }

    const activeSelectedIds = useCanvasStore.getState().selectedIds;
    this.host.syncStoreWithSelection(activeSelectedIds);

    const selectedElements = this.host.getSelectedElements();
    const allLocked =
      selectedElements.length > 0 &&
      selectedElements.every((el) => el.locked);

    if (allLocked) {
      this.dragMode = SelectDragMode.NONE;
      return;
    }

    this.dragMode = SelectDragMode.MOVE;
    this.initMoveElements(activeSelectedIds);
  }

  private initMoveElements(selectedIds: string[]): void {
    this.moveInitialElements.clear();
    const roots = getDocRoots(this.host.doc);
    selectedIds.forEach((id) => {
      const map = roots.elements.get(id);
      if (!map || map.get("locked") === true) return;
      const el = YjsElementAdapter.toElementData(map);
      if (!el) return;
      this.moveInitialElements.set(id, {
        x: el.x,
        y: el.y,
        w: el.w,
        h: el.h,
        type: el.type,
        points: el.points ? [...el.points] : undefined,
        startBinding: el.startBinding,
        endBinding: el.endBinding,
      });
    });
  }

  private handleResizeMove(ctx: ToolContext): void {
    if (!this.resizeInfo) return;
    const roots = getDocRoots(this.host.doc);
    const map = roots.elements.get(this.resizeInfo.elementId);
    if (!map) return;

    if (
      this.resizeInfo.handle === ResizeHandleType.START ||
      this.resizeInfo.handle === ResizeHandleType.END
    ) {
      this.handleConnectorResize(map, ctx);
      return;
    }

    this.handleBoundsResize(map, ctx);
  }

  private handleConnectorResize(map: Y.Map<unknown>, ctx: ToolContext): void {
    if (!this.resizeInfo) return;
    this.host.setGuides(null);
    const others = this.getEligibleOtherElements([this.resizeInfo.elementId]);
    const match = findNearestAnchor(ctx.worldPt, others, 36);
    const targetPt = match ? { ...match.pt } : { ...ctx.worldPt };
    const candidates = getNearbyAnchorPoints(ctx.worldPt, others, 140);
    this.host.setSnapIndicator({
      active: match?.pt ?? null,
      candidates,
    });

    const initPts = this.resizeInfo.initialPoints || [0, 0, 0, 0];
    const p1 =
      this.resizeInfo.handle === ResizeHandleType.START
        ? targetPt
        : { x: initPts[0], y: initPts[1] };
    const p2 =
      this.resizeInfo.handle === ResizeHandleType.END
        ? targetPt
        : { x: initPts[2], y: initPts[3] };

    const newPoints = [p1.x, p1.y, p2.x, p2.y];
    const newX = Math.round(Math.min(p1.x, p2.x));
    const newY = Math.round(Math.min(p1.y, p2.y));
    const newW = Math.round(Math.max(1, Math.abs(p2.x - p1.x)));
    const newH = Math.round(Math.max(1, Math.abs(p2.y - p1.y)));

    const currentStartBinding = map.get("startBinding") as
      | ArrowBinding
      | undefined;
    const currentEndBinding = map.get("endBinding") as
      | ArrowBinding
      | undefined;

    const updatedStartBinding =
      this.resizeInfo.handle === ResizeHandleType.START
        ? match
          ? { elementId: match.elementId, anchor: match.anchor }
          : undefined
        : currentStartBinding;

    const updatedEndBinding =
      this.resizeInfo.handle === ResizeHandleType.END
        ? match
          ? { elementId: match.elementId, anchor: match.anchor }
          : undefined
        : currentEndBinding;

    this.host.doc.transact(() => {
      YjsElementAdapter.updateYMap(map, {
        x: newX,
        y: newY,
        w: newW,
        h: newH,
        points: newPoints,
        startBinding: updatedStartBinding,
        endBinding: updatedEndBinding,
      });
    }, LOCAL_ORIGIN);

    this.host.setDirty();
  }

  private handleBoundsResize(map: Y.Map<unknown>, ctx: ToolContext): void {
    if (!this.resizeInfo) return;
    const dx = ctx.worldPt.x - this.resizeInfo.startWorldPt.x;
    const dy = ctx.worldPt.y - this.resizeInfo.startWorldPt.y;
    const type = YjsElementAdapter.getType(map);
    const minSize = type === ElementType.STICKY ? 40 : 10;

    const rawBounds = calculateResizedBounds({
      handle: this.resizeInfo.handle,
      initialBounds: this.resizeInfo.initialBounds,
      dx,
      dy,
      minWidth: minSize,
      minHeight: minSize,
      keepAspectRatio: ctx.event.shiftKey,
    });

    const others = this.getEligibleOtherElements([this.resizeInfo.elementId]);

    const match = ctx.event.shiftKey
      ? { snappedBounds: rawBounds, verticalGuides: [], horizontalGuides: [] }
      : calculateResizeSmartGuides(
          this.resizeInfo.handle,
          this.resizeInfo.initialBounds,
          rawBounds,
          others,
          8,
          minSize,
          minSize,
        );

    const finalBounds = match.snappedBounds;
    this.updateHostGuides(match.verticalGuides, match.horizontalGuides);

    this.host.doc.transact(() => {
      const scaledPoints =
        type === ElementType.FREEHAND && this.resizeInfo?.initialPoints
          ? scaleFreehandPoints(
              this.resizeInfo.initialPoints,
              this.resizeInfo.initialBounds,
              finalBounds,
            )
          : undefined;

      YjsElementAdapter.updateYMap(map, {
        x: finalBounds.x,
        y: finalBounds.y,
        w: finalBounds.w,
        h: finalBounds.h,
        points: scaledPoints,
      });
    }, LOCAL_ORIGIN);

    this.host.syncConnectedArrows([this.resizeInfo.elementId]);
    this.host.setDirty();
  }

  private getEligibleOtherElements(excludeIds: readonly string[]): ElementData[] {
    const excludeSet = new Set(excludeIds);
    return this.host.getOtherElements(excludeIds).filter((el) => {
      const boundStart = el.startBinding && excludeSet.has(el.startBinding.elementId);
      const boundEnd = el.endBinding && excludeSet.has(el.endBinding.elementId);
      return !boundStart && !boundEnd;
    });
  }

  private updateHostGuides(
    vertical: number[],
    horizontal: number[],
    spacing: SpacingGuide[] = [],
  ): void {
    const hasGuides =
      vertical.length > 0 || horizontal.length > 0 || spacing.length > 0;
    this.host.setGuides(hasGuides ? { vertical, horizontal, spacing } : null);
  }

  private computeDraggedBounds(dx: number, dy: number): Bounds {
    const allInitials = Array.from(this.moveInitialElements.values());
    const structural = allInitials.filter(isStructuralElement);
    const targets = structural.length > 0 ? structural : allInitials;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const item of targets) {
      minX = Math.min(minX, item.x + dx);
      maxX = Math.max(maxX, item.x + dx + item.w);
      minY = Math.min(minY, item.y + dy);
      maxY = Math.max(maxY, item.y + dy + item.h);
    }

    return {
      x: minX,
      y: minY,
      w: Math.max(0, maxX - minX),
      h: Math.max(0, maxY - minY),
    };
  }

  private calculateMovementDelta(worldPt: { x: number; y: number }): {
    dx: number;
    dy: number;
  } {
    let dx = worldPt.x - this.startPoint.x;
    let dy = worldPt.y - this.startPoint.y;

    const store = useCanvasStore.getState();
    if (store.selectedIds.length === 0) {
      return { dx, dy };
    }

    const draggedBounds = this.computeDraggedBounds(dx, dy);
    const others = this.getEligibleOtherElements(store.selectedIds);
    const match = calculateSmartGuides(draggedBounds, others, 8);

    if (match.snappedX !== undefined) {
      dx += match.snappedX - draggedBounds.x;
    }
    if (match.snappedY !== undefined) {
      dy += match.snappedY - draggedBounds.y;
    }

    this.updateHostGuides(
      match.verticalGuides,
      match.horizontalGuides,
      match.spacingGuides,
    );

    return { dx, dy };
  }

  private handleMoveElements(ctx: ToolContext): void {
    const { dx, dy } = this.calculateMovementDelta(ctx.worldPt);
    const store = useCanvasStore.getState();
    const roots = getDocRoots(this.host.doc);
    const selectedSet = new Set(store.selectedIds);

    this.host.doc.transact(() => {
      this.moveInitialElements.forEach((initial, id) => {
        const map = roots.elements.get(id);
        if (!map) return;

        const translated = translateGeometry(initial, dx, dy);
        const keepStartBinding =
          initial.startBinding &&
          selectedSet.has(initial.startBinding.elementId);
        const keepEndBinding =
          initial.endBinding &&
          selectedSet.has(initial.endBinding.elementId);

        YjsElementAdapter.updateYMap(map, {
          ...translated,
          startBinding: keepStartBinding ? initial.startBinding : undefined,
          endBinding: keepEndBinding ? initial.endBinding : undefined,
        });
      });
    }, LOCAL_ORIGIN);

    this.host.syncConnectedArrows(store.selectedIds);
    this.host.setDirty();
  }

  private handleSelectBoxMove(ctx: ToolContext): void {
    this.host.setSelectBox({
      x: Math.min(this.startPoint.x, ctx.worldPt.x),
      y: Math.min(this.startPoint.y, ctx.worldPt.y),
      w: Math.abs(ctx.worldPt.x - this.startPoint.x),
      h: Math.abs(ctx.worldPt.y - this.startPoint.y),
    });
    this.host.setDirty();
  }

  private finishSelectBox(): void {
    const box = this.host.getSelectBox();
    if (box && (box.w > 2 || box.h > 2)) {
      const found = this.host.spatialIndex.search({
        minX: box.x,
        minY: box.y,
        maxX: box.x + box.w,
        maxY: box.y + box.h,
      });
      const expanded = this.host.expandSelectionGroups(found);
      useCanvasStore.getState().setSelectedIds(expanded);
      this.host.syncStoreWithSelection(expanded);
    }
    this.host.setSelectBox(null);
  }

  private finishMove(): void {
    this.host.undoManager.stopCapturing();
    this.moveInitialElements.clear();
    this.host.syncConnectedArrows(useCanvasStore.getState().selectedIds);
  }

  private finishResize(): void {
    this.host.setGuides(null);
    this.host.undoManager.stopCapturing();
    this.resizeInfo = null;
    this.host.syncConnectedArrows(useCanvasStore.getState().selectedIds);
  }
}
