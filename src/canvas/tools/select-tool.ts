import { CanvasHost, CanvasTool, ToolContext } from "./tool.interface";
import { useCanvasStore } from "@/store/canvas-store";
import { ArrowBinding, ElementData, getDocRoots } from "@/shared";
import { LOCAL_ORIGIN } from "@/collab/undo-manager";
import {
  calculateResizedBounds,
  getHandleAt,
  ResizeHandleType,
  scaleFreehandPoints,
} from "@/canvas/resize-helper";
import { YjsElementAdapter } from "@/canvas/yjs-element-adapter";
import { calculateSmartGuides } from "@/canvas/alignment-helper";
import { findNearestAnchor, getNearbyAnchorPoints } from "@/canvas/connector-helper";
import { translateGeometry } from "@/canvas/geometry-helper";
import * as Y from "yjs";

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
  readonly id = "select";

  private dragMode: "none" | "move" | "resize" | "selectBox" = "none";
  private startPoint = { x: 0, y: 0 };
  private moveInitialElements = new Map<string, MoveInitialItem>();
  private resizeInfo: ResizeState | null = null;

  constructor(private readonly host: CanvasHost) {}

  onPointerDown(ctx: ToolContext): void {
    if (this.host.role === "VIEWER") return;

    this.startPoint = { ...ctx.worldPt };

    const singleHandle = this.getSingleSelectedResizeHandle(ctx);
    if (singleHandle) {
      this.dragMode = "resize";
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
      this.dragMode = "selectBox";
      this.host.setSelectBox({ x: ctx.worldPt.x, y: ctx.worldPt.y, w: 0, h: 0 });
      return;
    }

    this.handleHitSelection(hitId, ctx.event.shiftKey);
  }

  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isPointerDown || this.host.role === "VIEWER") return;

    if (this.dragMode === "resize") {
      this.handleResizeMove(ctx);
    } else if (this.dragMode === "move") {
      this.handleMoveElements(ctx);
    } else if (this.dragMode === "selectBox") {
      this.handleSelectBoxMove(ctx);
    }
  }

  onPointerUp(): void {
    this.host.setGuides(null);
    this.host.setSnapIndicator(null);

    if (this.dragMode === "selectBox") {
      this.finishSelectBox();
    } else if (this.dragMode === "move") {
      this.finishMove();
    } else if (this.dragMode === "resize") {
      this.finishResize();
    }

    this.dragMode = "none";
    this.host.setDirty();
  }

  getCursor(ctx: ToolContext): string {
    if (this.host.role === "VIEWER") return "default";

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
    this.dragMode = "none";
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
      this.dragMode = "none";
      return;
    }

    this.dragMode = "move";
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
      this.resizeInfo.handle === "start" ||
      this.resizeInfo.handle === "end"
    ) {
      this.handleConnectorResize(map, ctx);
      return;
    }

    this.handleBoundsResize(map, ctx);
  }

  private handleConnectorResize(map: Y.Map<unknown>, ctx: ToolContext): void {
    if (!this.resizeInfo) return;
    const excludeIds = [this.resizeInfo.elementId];
    const others = this.host.getOtherElements(excludeIds);
    const match = findNearestAnchor(ctx.worldPt, others, 36);
    const targetPt = match ? { ...match.pt } : { ...ctx.worldPt };
    const candidates = getNearbyAnchorPoints(ctx.worldPt, others, 140);
    this.host.setSnapIndicator({
      active: match?.pt ?? null,
      candidates,
    });

    const initPts = this.resizeInfo.initialPoints || [0, 0, 0, 0];
    const p1 =
      this.resizeInfo.handle === "start"
        ? targetPt
        : { x: initPts[0], y: initPts[1] };
    const p2 =
      this.resizeInfo.handle === "end"
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
      this.resizeInfo.handle === "start"
        ? match
          ? { elementId: match.elementId, anchor: match.anchor }
          : undefined
        : currentStartBinding;

    const updatedEndBinding =
      this.resizeInfo.handle === "end"
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
    const minSize = type === "sticky" ? 40 : 10;

    const newBounds = calculateResizedBounds({
      handle: this.resizeInfo.handle,
      initialBounds: this.resizeInfo.initialBounds,
      dx,
      dy,
      minWidth: minSize,
      minHeight: minSize,
      keepAspectRatio: ctx.event.shiftKey,
    });

    this.host.doc.transact(() => {
      const scaledPoints =
        type === "freehand" && this.resizeInfo?.initialPoints
          ? scaleFreehandPoints(
              this.resizeInfo.initialPoints,
              this.resizeInfo.initialBounds,
              newBounds,
            )
          : undefined;

      YjsElementAdapter.updateYMap(map, {
        x: newBounds.x,
        y: newBounds.y,
        w: newBounds.w,
        h: newBounds.h,
        points: scaledPoints,
      });
    }, LOCAL_ORIGIN);

    this.host.syncConnectedArrows([this.resizeInfo.elementId]);
    this.host.setDirty();
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

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    this.moveInitialElements.forEach((initial) => {
      const curX = initial.x + dx;
      const curY = initial.y + dy;
      if (curX < minX) minX = curX;
      if (curX + initial.w > maxX) maxX = curX + initial.w;
      if (curY < minY) minY = curY;
      if (curY + initial.h > maxY) maxY = curY + initial.h;
    });

    const draggedBounds = {
      x: minX,
      y: minY,
      w: Math.max(0, maxX - minX),
      h: Math.max(0, maxY - minY),
    };

    const others = this.host.getOtherElements(store.selectedIds);
    const match = calculateSmartGuides(draggedBounds, others, 8);

    if (match.snappedX !== undefined) {
      dx += match.snappedX - draggedBounds.x;
    }
    if (match.snappedY !== undefined) {
      dy += match.snappedY - draggedBounds.y;
    }

    const hasGuides =
      match.verticalGuides.length > 0 || match.horizontalGuides.length > 0;
    this.host.setGuides(
      hasGuides
        ? {
            vertical: match.verticalGuides,
            horizontal: match.horizontalGuides,
          }
        : null,
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
    this.host.undoManager.stopCapturing();
    this.resizeInfo = null;
    this.host.syncConnectedArrows(useCanvasStore.getState().selectedIds);
  }
}
