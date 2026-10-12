import { CanvasHost, CanvasTool, ToolContext } from "./tool.interface";
import { useCanvasStore } from "../../store/canvas-store";
import { getDocRoots } from "../../shared";
import { LOCAL_ORIGIN } from "../../collab/undo-manager";
import {
  calculateResizedBounds,
  getHandleAt,
  ResizeHandleType,
  scaleFreehandPoints,
} from "../resize-helper";
import { YjsElementAdapter } from "../yjs-element-adapter";

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
        if (el) {
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
      const isAlreadySelected = store.selectedIds.includes(hitId);

      if (ctx.event.shiftKey) {
        if (isAlreadySelected) {
          store.setSelectedIds(store.selectedIds.filter((id) => id !== hitId));
        } else {
          store.setSelectedIds([...store.selectedIds, hitId]);
        }
      } else if (!isAlreadySelected) {
        store.setSelectedIds([hitId]);
      }

      this.host.syncStoreWithSelection(useCanvasStore.getState().selectedIds);

      this.dragMode = "move";
      this.moveInitialPositions.clear();
      const roots = getDocRoots(this.host.doc);
      useCanvasStore.getState().selectedIds.forEach((id) => {
        const map = roots.elements.get(id);
        if (map) {
          this.moveInitialPositions.set(id, {
            x: (map.get("x") as number) || 0,
            y: (map.get("y") as number) || 0,
          });
        }
      });
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
        const type = map.get("type") as string;
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
          map.set("x", newBounds.x);
          map.set("y", newBounds.y);
          map.set("w", newBounds.w);
          map.set("h", newBounds.h);

          if (type === "freehand" && this.resizeInfo?.initialPoints) {
            const scaled = scaleFreehandPoints(
              this.resizeInfo.initialPoints,
              this.resizeInfo.initialBounds,
              newBounds,
            );
            map.set("points", scaled);
          }
        }, LOCAL_ORIGIN);

        this.host.setDirty();
      }
      return;
    }

    if (this.dragMode === "move") {
      const dx = ctx.worldPt.x - this.startPoint.x;
      const dy = ctx.worldPt.y - this.startPoint.y;
      const roots = getDocRoots(this.host.doc);

      this.host.doc.transact(() => {
        this.moveInitialPositions.forEach((initial, id) => {
          const map = roots.elements.get(id);
          if (map) {
            map.set("x", Math.round(initial.x + dx));
            map.set("y", Math.round(initial.y + dy));
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
    if (this.dragMode === "selectBox") {
      const box = this.host.getSelectBox();
      if (box && (box.w > 2 || box.h > 2)) {
        const found = this.host.spatialIndex.search({
          minX: box.x,
          minY: box.y,
          maxX: box.x + box.w,
          maxY: box.y + box.h,
        });
        useCanvasStore.getState().setSelectedIds(found);
        this.host.syncStoreWithSelection(found);
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
        if (el) {
          const handle = getHandleAt(ctx.screenPt, el, this.host.viewport);
          if (handle) {
            return handle.cursor;
          }
        }
      }
    }

    const hitId = this.host.hitTest(ctx.worldPt);
    if (hitId) {
      return "move";
    }

    return "default";
  }

  onDeactivate(): void {
    this.dragMode = "none";
    this.resizeInfo = null;
    this.moveInitialPositions.clear();
    this.host.setSelectBox(null);
  }
}
