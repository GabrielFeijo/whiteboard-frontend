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

export class SelectTool implements CanvasTool {
  readonly id = "select";

  private dragMode: "none" | "move" | "resize" | "selectBox" = "none";
  private startPoint = { x: 0, y: 0 };
  private moveInitialElements = new Map<string, MoveInitialItem>();
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
          const handle = getHandleAt(
            ctx.screenPt,
            el,
            this.host.viewport,
            12,
            (id) => this.host.getElementById(id),
          );
          if (handle) {
            this.dragMode = "resize";
            this.resizeInfo = {
              handle: handle.type,
              elementId: selectedId,
              initialBounds: { x: el.x, y: el.y, w: el.w, h: el.h },
              initialPoints: el.points
                ? [...el.points]
                : [el.x, el.y, el.x + el.w, el.y + el.h],
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
        this.moveInitialElements.clear();
        const roots = getDocRoots(this.host.doc);
        activeSelectedIds.forEach((id) => {
          const map = roots.elements.get(id);
          if (map && map.get("locked") !== true) {
            const el = YjsElementAdapter.toElementData(map);
            if (el) {
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
            }
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
        if (
          this.resizeInfo.handle === "start" ||
          this.resizeInfo.handle === "end"
        ) {
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
          return;
        }

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

      const selectedSet = new Set(store.selectedIds);

      this.host.doc.transact(() => {
        this.moveInitialElements.forEach((initial, id) => {
          const map = roots.elements.get(id);
          if (!map) return;

          if (initial.type === "line" || initial.type === "arrow") {
            const initPts =
              initial.points && initial.points.length >= 4
                ? initial.points
                : [
                    initial.x,
                    initial.y,
                    initial.x + initial.w,
                    initial.y + initial.h,
                  ];
            const p1x = Math.round(initPts[0] + dx);
            const p1y = Math.round(initPts[1] + dy);
            const p2x = Math.round(initPts[2] + dx);
            const p2y = Math.round(initPts[3] + dy);
            const newPoints = [p1x, p1y, p2x, p2y];
            const newX = Math.min(p1x, p2x);
            const newY = Math.min(p1y, p2y);
            const newW = Math.max(1, Math.abs(p2x - p1x));
            const newH = Math.max(1, Math.abs(p2y - p1y));

            const keepStartBinding =
              initial.startBinding &&
              selectedSet.has(initial.startBinding.elementId);
            const keepEndBinding =
              initial.endBinding &&
              selectedSet.has(initial.endBinding.elementId);

            YjsElementAdapter.updateYMap(map, {
              x: newX,
              y: newY,
              w: newW,
              h: newH,
              points: newPoints,
              startBinding: keepStartBinding
                ? initial.startBinding
                : undefined,
              endBinding: keepEndBinding ? initial.endBinding : undefined,
            });
          } else if (initial.type === "freehand") {
            const newPoints = initial.points?.map((val, idx) =>
              idx % 3 === 0
                ? Math.round(val + dx)
                : idx % 3 === 1
                  ? Math.round(val + dy)
                  : val,
            );
            YjsElementAdapter.updateYMap(map, {
              x: Math.round(initial.x + dx),
              y: Math.round(initial.y + dy),
              points: newPoints,
            });
          } else {
            YjsElementAdapter.updateYMap(map, {
              x: Math.round(initial.x + dx),
              y: Math.round(initial.y + dy),
            });
          }
        });
      }, LOCAL_ORIGIN);

      this.host.syncConnectedArrows(store.selectedIds);
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
    this.host.setSnapIndicator(null);
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
      this.moveInitialElements.clear();
      this.host.syncConnectedArrows(useCanvasStore.getState().selectedIds);
    } else if (this.dragMode === "resize") {
      this.host.undoManager.stopCapturing();
      this.resizeInfo = null;
      this.host.syncConnectedArrows(useCanvasStore.getState().selectedIds);
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
          const handle = getHandleAt(
            ctx.screenPt,
            el,
            this.host.viewport,
            12,
            (id) => this.host.getElementById(id),
          );
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
    this.moveInitialElements.clear();
    this.host.setSelectBox(null);
    this.host.setGuides(null);
    this.host.setSnapIndicator(null);
  }
}
