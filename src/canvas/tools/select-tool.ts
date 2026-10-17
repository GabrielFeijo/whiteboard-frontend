import { CanvasHost, CanvasTool, ToolContext } from "./tool.interface";
import { useCanvasStore } from "@/store/canvas-store";
import { getDocRoots } from "@/shared";
import { LOCAL_ORIGIN } from "@/collab/undo-manager";
import {
  calculateResizedBounds,
  getHandleAt,
  ResizeHandleType,
  scaleFreehandPoints,
} from "@/canvas/resize-helper";
import { YjsElementAdapter } from "@/canvas/yjs-element-adapter";
import { calculateSmartGuides } from "@/canvas/alignment-helper";

export class SelectTool implements CanvasTool {
  readonly id = "select";

  private dragMode: "none" | "move" | "resize" | "selectBox" = "none";
  private startPoint = { x: 0, y: 0 };
  private moveInitialPositions = new Map<string, { x: number; y: number }>();
  private resizeInfo: {
    handle: ResizeHandleType;
    elementId: string;
    initialBounds: { x: number; y: number; w: number; h: number };
    initialPoints?: number[];
    startWorldPt: { x: number; y: number };
  } | null = null;

  constructor(private readonly host: CanvasHost) {}

  onPointerDown(ctx: ToolContext): void {
    if (this.host.role === "VIEWER") return;

    this.startPoint = { ...ctx.worldPt };
    const store = useCanvasStore.getState();

    if (store.selectedIds.length === 1) {
      const selectedId = store.selectedIds[0];
      const roots = getDocRoots(this.host.doc);
      const map = roots.elements.get(selectedId);
      if (map) {
        const el = YjsElementAdapter.toElementData(map);
        if (el && !el.locked) {
          const handle = getHandleAt(ctx.screenPt, el, this.host.viewport);
          if (handle) {
            this.dragMode = "resize";
            this.resizeInfo = {
              handle: handle.type,
              elementId: selectedId,
              initialBounds: { x: el.x, y: el.y, w: el.w, h: el.h },
              initialPoints: el.points ? [...el.points] : undefined,
              startWorldPt: { ...ctx.worldPt },
            };
            return;
          }
        }
      }
    }

    const hitId = this.host.hitTest(ctx.worldPt);

    if (hitId) {
      const expandedIds = this.host.expandSelectionGroups([hitId]);
      const isAlreadySelected = expandedIds.some((id) =>
        store.selectedIds.includes(id),
      );

      if (ctx.event.shiftKey) {
        if (isAlreadySelected) {
          store.setSelectedIds(
            store.selectedIds.filter((id) => !expandedIds.includes(id)),
          );
        } else {
          store.setSelectedIds([...store.selectedIds, ...expandedIds]);
        }
      } else if (!isAlreadySelected) {
        store.setSelectedIds(expandedIds);
      }

      const activeSelectedIds = useCanvasStore.getState().selectedIds;
      this.host.syncStoreWithSelection(activeSelectedIds);

      const selectedElements = this.host.getSelectedElements();
      const allLocked =
        selectedElements.length > 0 &&
        selectedElements.every((el) => el.locked);

      if (!allLocked) {
        this.dragMode = "move";
        this.moveInitialPositions.clear();
        const roots = getDocRoots(this.host.doc);
        activeSelectedIds.forEach((id) => {
          const map = roots.elements.get(id);
          if (map && map.get("locked") !== true) {
            this.moveInitialPositions.set(
              id,
              YjsElementAdapter.getPosition(map),
            );
          }
        });
      } else {
        this.dragMode = "none";
      }
    } else {
      if (!ctx.event.shiftKey) {
        store.setSelectedIds([]);
      }
      this.dragMode = "selectBox";
      this.host.setSelectBox({ x: ctx.worldPt.x, y: ctx.worldPt.y, w: 0, h: 0 });
    }
  }

  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isPointerDown || this.host.role === "VIEWER") return;

    if (this.dragMode === "resize" && this.resizeInfo) {
      const roots = getDocRoots(this.host.doc);
      const map = roots.elements.get(this.resizeInfo.elementId);
      if (map) {
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

        this.host.setDirty();
      }
      return;
    }

    if (this.dragMode === "move") {
      let dx = ctx.worldPt.x - this.startPoint.x;
      let dy = ctx.worldPt.y - this.startPoint.y;

      const store = useCanvasStore.getState();
      const roots = getDocRoots(this.host.doc);

      if (store.selectedIds.length > 0) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        this.moveInitialPositions.forEach((initial, id) => {
          const map = roots.elements.get(id);
          const w = (map?.get("w") as number) ?? 0;
          const h = (map?.get("h") as number) ?? 0;
          const curX = initial.x + dx;
          const curY = initial.y + dy;
          if (curX < minX) minX = curX;
          if (curX + w > maxX) maxX = curX + w;
          if (curY < minY) minY = curY;
          if (curY + h > maxY) maxY = curY + h;
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

        if (
          match.verticalGuides.length > 0 ||
          match.horizontalGuides.length > 0
        ) {
          this.host.setGuides({
            vertical: match.verticalGuides,
            horizontal: match.horizontalGuides,
          });
        } else {
          this.host.setGuides(null);
        }
      }

      this.host.doc.transact(() => {
        this.moveInitialPositions.forEach((initial, id) => {
          const map = roots.elements.get(id);
          if (map) {
            YjsElementAdapter.updateYMap(map, {
              x: initial.x + dx,
              y: initial.y + dy,
            });
          }
        });
      }, LOCAL_ORIGIN);

      this.host.setDirty();
      return;
    }

    if (this.dragMode === "selectBox") {
      this.host.setSelectBox({
        x: Math.min(this.startPoint.x, ctx.worldPt.x),
        y: Math.min(this.startPoint.y, ctx.worldPt.y),
        w: Math.abs(ctx.worldPt.x - this.startPoint.x),
        h: Math.abs(ctx.worldPt.y - this.startPoint.y),
      });
      this.host.setDirty();
    }
  }

  onPointerUp(): void {
    this.host.setGuides(null);
    if (this.dragMode === "selectBox") {
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
    } else if (this.dragMode === "move") {
      this.host.undoManager.stopCapturing();
      this.moveInitialPositions.clear();
    } else if (this.dragMode === "resize") {
      this.host.undoManager.stopCapturing();
      this.resizeInfo = null;
    }

    this.dragMode = "none";
    this.host.setDirty();
  }

  getCursor(ctx: ToolContext): string {
    if (this.host.role === "VIEWER") return "default";

    const store = useCanvasStore.getState();

    if (store.selectedIds.length === 1) {
      const selectedId = store.selectedIds[0];
      const roots = getDocRoots(this.host.doc);
      const map = roots.elements.get(selectedId);
      if (map) {
        const el = YjsElementAdapter.toElementData(map);
        if (el && !el.locked) {
          const handle = getHandleAt(ctx.screenPt, el, this.host.viewport);
          if (handle) {
            return handle.cursor;
          }
        }
      }
    }

    const hitId = this.host.hitTest(ctx.worldPt);
    if (hitId) {
      const roots = getDocRoots(this.host.doc);
      const map = roots.elements.get(hitId);
      if (map && map.get("locked") === true) {
        return "default";
      }
      return "move";
    }

    return "default";
  }

  onDeactivate(): void {
    this.dragMode = "none";
    this.resizeInfo = null;
    this.moveInitialPositions.clear();
    this.host.setSelectBox(null);
    this.host.setGuides(null);
  }
}
