import * as Y from "yjs";
import { nanoid } from "nanoid";
import { generateKeyBetween } from "fractional-indexing";
import { ElementData, getDocRoots, Role } from "../shared";

export type ElementStyle = ElementData["style"];
import { Viewport } from "./viewport";
import { SpatialIndex } from "./spatial-index";
import { renderElement } from "./renderers/element-renderer";
import { drawFreehand } from "./renderers/freehand-renderer";
import { Tool, useCanvasStore } from "../store/canvas-store";
import { LocalUndoManager, LOCAL_ORIGIN } from "../collab/undo-manager";
import { SyncProvider } from "../collab/sync-provider";

export class CanvasEngine {
  readonly viewport = new Viewport();
  readonly spatialIndex = new SpatialIndex();
  readonly undoManager: LocalUndoManager;

  private bgCtx!: CanvasRenderingContext2D;
  private contentCtx!: CanvasRenderingContext2D;
  private overlayCtx!: CanvasRenderingContext2D;

  private isDirty = true;
  private animFrameId: number | null = null;
  private isDestroyed = false;

  private isPointerDown = false;
  private dragMode: "none" | "pan" | "draw" | "move" | "selectBox" = "none";
  private startPoint = { x: 0, y: 0 };
  private currentPoint = { x: 0, y: 0 };
  private freehandDraft: number[] = [];
  private moveInitialPositions = new Map<string, { x: number; y: number }>();
  private selectBox: { x: number; y: number; w: number; h: number } | null = null;
  private elementsObserver: Parameters<Y.Map<unknown>["observeDeep"]>[0] | null = null;
  private providerUnsub: (() => void) | null = null;
  private docUpdateHandler: (() => void) | null = null;
  private activeTextarea: HTMLTextAreaElement | null = null;

  constructor(
    private readonly container: HTMLDivElement,
    private readonly bgCanvas: HTMLCanvasElement,
    private readonly contentCanvas: HTMLCanvasElement,
    private readonly overlayCanvas: HTMLCanvasElement,
    private readonly doc: Y.Doc,
    private readonly provider: SyncProvider,
    private readonly role: Role,
    private readonly userId: string,
  ) {
    this.undoManager = new LocalUndoManager(doc);

    const bgCtx = bgCanvas.getContext("2d");
    const contentCtx = contentCanvas.getContext("2d");
    const overlayCtx = overlayCanvas.getContext("2d");
    if (!bgCtx || !contentCtx || !overlayCtx) {
      throw new Error("Canvas 2D context not supported");
    }
    this.bgCtx = bgCtx;
    this.contentCtx = contentCtx;
    this.overlayCtx = overlayCtx;

    this.resizeCanvases();
    this.setupListeners();
    this.indexExistingElements();
    this.startRenderLoop();
  }

  private indexExistingElements() {
    const roots = getDocRoots(this.doc);
    roots.elements.forEach((map, id) => {
      const data = map.toJSON() as ElementData;
      if (data) {
        this.spatialIndex.insert(id, data.x, data.y, data.w, data.h);
      }
    });
  }

  private setupListeners() {
    const roots = getDocRoots(this.doc);
    this.elementsObserver = (events) => {
      events.forEach((event) => {
        if (event.target === roots.elements) {
          const mapEvent = event as Y.YMapEvent<Y.Map<unknown>>;
          mapEvent.keys.forEach((change, key) => {
            if (change.action === "delete") {
              this.spatialIndex.remove(key);
            } else {
              const childMap = roots.elements.get(key);
              if (childMap) {
                const data = childMap.toJSON() as ElementData;
                const elementId = (data && data.id) || key;
                if (data && elementId) {
                  this.spatialIndex.insert(elementId, data.x, data.y, data.w, data.h);
                }
              }
            }
          });
        } else {
          const target = event.target as Y.Map<unknown>;
          const data = target.toJSON() as ElementData;
          if (data && data.id) {
            this.spatialIndex.insert(data.id, data.x, data.y, data.w, data.h);
          }
        }
      });
      this.isDirty = true;
    };
    roots.elements.observeDeep(this.elementsObserver);

    this.providerUnsub = this.provider.onStatusChange((status) => {
      if (status === "synced") {
        this.indexExistingElements();
        this.isDirty = true;
      }
    });

    this.docUpdateHandler = () => {
      this.isDirty = true;
    };
    this.doc.on("update", this.docUpdateHandler);

    window.addEventListener("resize", this.handleResize);

    this.overlayCanvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    this.overlayCanvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.overlayCanvas.addEventListener("dblclick", this.onDoubleClick);
    window.addEventListener("keydown", this.onKeyDown);
  }

  private handleResize = () => {
    this.resizeCanvases();
    this.isDirty = true;
  };

  private resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    [this.bgCanvas, this.contentCanvas, this.overlayCanvas].forEach((canvas) => {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    });
  }

  private startRenderLoop() {
    const render = () => {
      if (this.isDestroyed) return;

      if (this.isDirty) {
        this.renderBackground();
        this.renderContent();
        this.isDirty = false;
      }
      this.renderOverlay();

      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);
  }

  private renderBackground() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.bgCtx.clearRect(0, 0, w, h);

    const zoom = this.viewport.zoom;
    const pan = this.viewport.pan;
    const gridSize = 24 * zoom;

    this.bgCtx.fillStyle = "#cbd5e1";
    const startX = pan.x % gridSize;
    const startY = pan.y % gridSize;

    this.bgCtx.beginPath();
    for (let x = startX; x < w; x += gridSize) {
      for (let y = startY; y < h; y += gridSize) {
        this.bgCtx.rect(x - 0.75, y - 0.75, 1.5, 1.5);
      }
    }
    this.bgCtx.fill();
  }

  private renderContent() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.contentCtx.clearRect(0, 0, w, h);

    this.contentCtx.save();
    this.contentCtx.translate(this.viewport.pan.x, this.viewport.pan.y);
    this.contentCtx.scale(this.viewport.zoom, this.viewport.zoom);

    const bounds = this.viewport.getVisibleWorldBounds(w, h);
    const visibleIds = new Set(this.spatialIndex.search(bounds));

    const roots = getDocRoots(this.doc);
    const elements: ElementData[] = [];

    visibleIds.forEach((id) => {
      const map = roots.elements.get(id);
      if (map) {
        elements.push(map.toJSON() as ElementData);
      }
    });

    elements.sort((a, b) => (a.z > b.z ? 1 : a.z < b.z ? -1 : 0));

    elements.forEach((el) => {
      renderElement(this.contentCtx, el);
    });

    this.contentCtx.restore();
  }

  private renderOverlay() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.overlayCtx.clearRect(0, 0, w, h);

    this.overlayCtx.save();
    this.overlayCtx.translate(this.viewport.pan.x, this.viewport.pan.y);
    this.overlayCtx.scale(this.viewport.zoom, this.viewport.zoom);

    const store = useCanvasStore.getState();

    if (store.selectedIds.length > 0) {
      const roots = getDocRoots(this.doc);
      store.selectedIds.forEach((id) => {
        const map = roots.elements.get(id);
        if (map) {
          const el = map.toJSON() as ElementData;
          this.overlayCtx.strokeStyle = "#4f46e5";
          this.overlayCtx.lineWidth = 1.5 / this.viewport.zoom;
          this.overlayCtx.strokeRect(el.x - 4, el.y - 4, el.w + 8, el.h + 8);

          const handleSize = 6 / this.viewport.zoom;
          this.overlayCtx.fillStyle = "#ffffff";
          this.overlayCtx.strokeStyle = "#4f46e5";
          this.overlayCtx.lineWidth = 1.5 / this.viewport.zoom;
          const corners = [
            { x: el.x - 4, y: el.y - 4 },
            { x: el.x + el.w + 4, y: el.y - 4 },
            { x: el.x + el.w + 4, y: el.y + el.h + 4 },
            { x: el.x - 4, y: el.y + el.h + 4 },
          ];
          corners.forEach((c) => {
            this.overlayCtx.fillRect(
              c.x - handleSize / 2,
              c.y - handleSize / 2,
              handleSize,
              handleSize,
            );
            this.overlayCtx.strokeRect(
              c.x - handleSize / 2,
              c.y - handleSize / 2,
              handleSize,
              handleSize,
            );
          });
        }
      });
    }

    if (this.selectBox) {
      this.overlayCtx.fillStyle = "rgba(99, 102, 241, 0.08)";
      this.overlayCtx.strokeStyle = "#6366f1";
      this.overlayCtx.lineWidth = 1 / this.viewport.zoom;
      this.overlayCtx.fillRect(
        this.selectBox.x,
        this.selectBox.y,
        this.selectBox.w,
        this.selectBox.h,
      );
      this.overlayCtx.strokeRect(
        this.selectBox.x,
        this.selectBox.y,
        this.selectBox.w,
        this.selectBox.h,
      );
    }

    if (this.dragMode === "draw" && store.activeTool !== "freehand") {
      const previewEl: ElementData = {
        id: "preview",
        type: store.activeTool as ElementData["type"],
        x: Math.min(this.startPoint.x, this.currentPoint.x),
        y: Math.min(this.startPoint.y, this.currentPoint.y),
        w: Math.abs(this.currentPoint.x - this.startPoint.x),
        h: Math.abs(this.currentPoint.y - this.startPoint.y),
        rotation: 0,
        z: "preview",
        style: {
          fill: store.fillColor,
          stroke: store.strokeColor,
          strokeWidth: store.strokeWidth,
          opacity: store.opacity,
        },
        createdBy: this.userId,
      };
      renderElement(this.overlayCtx, previewEl);
    }

    if (this.freehandDraft.length >= 2) {
      drawFreehand(this.overlayCtx, {
        id: "draft",
        type: "freehand",
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        rotation: 0,
        z: "draft",
        points: this.freehandDraft,
        style: {
          fill: "transparent",
          stroke: store.strokeColor,
          strokeWidth: store.strokeWidth,
          opacity: 1,
        },
        createdBy: this.userId,
      });
    }

    const states = this.provider.awareness.getStates();
    states.forEach((state, clientId) => {
      if (clientId === this.doc.clientID || !state.cursor) return;
      const { x, y } = state.cursor;
      const user = state.user || { name: "Collaborator", color: "#6366f1" };

      this.overlayCtx.fillStyle = user.color || "#6366f1";
      this.overlayCtx.beginPath();
      this.overlayCtx.moveTo(x, y);
      this.overlayCtx.lineTo(x + 12 / this.viewport.zoom, y + 16 / this.viewport.zoom);
      this.overlayCtx.lineTo(x + 4 / this.viewport.zoom, y + 16 / this.viewport.zoom);
      this.overlayCtx.closePath();
      this.overlayCtx.fill();

      this.overlayCtx.fillStyle = user.color || "#6366f1";
      this.overlayCtx.font = `${Math.max(11 / this.viewport.zoom, 8)}px sans-serif`;
      this.overlayCtx.fillText(user.name, x + 12 / this.viewport.zoom, y + 24 / this.viewport.zoom);
    });

    this.overlayCtx.restore();
  }

  private onPointerDown = (e: PointerEvent) => {
    this.isPointerDown = true;
    const store = useCanvasStore.getState();
    const screenPt = { x: e.offsetX, y: e.offsetY };
    const worldPt = this.viewport.screenToWorld(screenPt);

    this.startPoint = worldPt;
    this.currentPoint = worldPt;

    if (e.button === 1 || store.activeTool === "hand") {
      this.dragMode = "pan";
      return;
    }

    if (this.role === "VIEWER") return;

    if (store.activeTool === "select") {
      const hitId = this.hitTest(worldPt);
      if (hitId) {
        const isAlreadySelected = store.selectedIds.includes(hitId);
        const newSelected = e.shiftKey
          ? isAlreadySelected
            ? store.selectedIds.filter((id) => id !== hitId)
            : [...store.selectedIds, hitId]
          : isAlreadySelected
            ? store.selectedIds
            : [hitId];

        store.setSelectedIds(newSelected);
        this.syncStoreWithSelection(newSelected);
        this.dragMode = "move";

        const roots = getDocRoots(this.doc);
        this.moveInitialPositions.clear();
        newSelected.forEach((id) => {
          const map = roots.elements.get(id);
          if (map) {
            this.moveInitialPositions.set(id, {
              x: map.get("x") as number,
              y: map.get("y") as number,
            });
          }
        });
      } else {
        if (!e.shiftKey) store.setSelectedIds([]);
        this.dragMode = "selectBox";
        this.selectBox = { x: worldPt.x, y: worldPt.y, w: 0, h: 0 };
      }
    } else if (store.activeTool === "eraser") {
      const hitId = this.hitTest(worldPt);
      if (hitId) {
        const roots = getDocRoots(this.doc);
        this.doc.transact(() => {
          roots.elements.delete(hitId);
          this.spatialIndex.remove(hitId);
        }, LOCAL_ORIGIN);
        if (store.selectedIds.includes(hitId)) {
          store.setSelectedIds(store.selectedIds.filter((id) => id !== hitId));
        }
        this.isDirty = true;
      }
      return;
    } else if (store.activeTool === "freehand") {
      this.dragMode = "draw";
      this.freehandDraft = [worldPt.x, worldPt.y, e.pressure || 0.5];
    } else if (store.activeTool === "sticky") {
      this.createStickyNote(worldPt);
      store.setActiveTool("select");
    } else if (store.activeTool === "text") {
      this.createTextElement(worldPt);
      store.setActiveTool("select");
    } else {
      this.dragMode = "draw";
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    const rect = this.overlayCanvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPt = this.viewport.screenToWorld(screenPt);
    this.currentPoint = worldPt;

    this.provider.awareness.setLocalStateField("cursor", { x: worldPt.x, y: worldPt.y });

    if (!this.isPointerDown) return;

    if (this.dragMode === "pan") {
      const dx = e.movementX;
      const dy = e.movementY;
      this.viewport.pan.x += dx;
      this.viewport.pan.y += dy;
      useCanvasStore.getState().setPan({ ...this.viewport.pan });
      this.isDirty = true;
      return;
    }

    if (this.dragMode === "move") {
      const dx = worldPt.x - this.startPoint.x;
      const dy = worldPt.y - this.startPoint.y;
      const roots = getDocRoots(this.doc);

      this.doc.transact(() => {
        this.moveInitialPositions.forEach((initial, id) => {
          const map = roots.elements.get(id);
          if (map) {
            map.set("x", Math.round(initial.x + dx));
            map.set("y", Math.round(initial.y + dy));
          }
        });
      }, LOCAL_ORIGIN);
    } else if (this.dragMode === "selectBox") {
      this.selectBox = {
        x: Math.min(this.startPoint.x, worldPt.x),
        y: Math.min(this.startPoint.y, worldPt.y),
        w: Math.abs(worldPt.x - this.startPoint.x),
        h: Math.abs(worldPt.y - this.startPoint.y),
      };
    } else if (this.dragMode === "draw") {
      const store = useCanvasStore.getState();
      if (store.activeTool === "freehand") {
        this.freehandDraft.push(worldPt.x, worldPt.y, e.pressure || 0.5);
      }
    }
  };

  private onPointerUp = () => {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;
    const store = useCanvasStore.getState();

    if (this.dragMode === "draw") {
      if (store.activeTool === "freehand") {
        if (this.freehandDraft.length >= 6) {
          this.commitFreehandElement(this.freehandDraft);
        }
        this.freehandDraft = [];
      } else {
        const w = Math.abs(this.currentPoint.x - this.startPoint.x);
        const h = Math.abs(this.currentPoint.y - this.startPoint.y);
        if (w > 5 || h > 5) {
          this.commitShapeElement(
            store.activeTool as ElementData["type"],
            Math.min(this.startPoint.x, this.currentPoint.x),
            Math.min(this.startPoint.y, this.currentPoint.y),
            w,
            h,
          );
          store.setActiveTool("select");
        }
      }
    } else if (this.dragMode === "selectBox" && this.selectBox) {
      const found = this.spatialIndex.search({
        minX: this.selectBox.x,
        minY: this.selectBox.y,
        maxX: this.selectBox.x + this.selectBox.w,
        maxY: this.selectBox.y + this.selectBox.h,
      });
      store.setSelectedIds(found);
      this.syncStoreWithSelection(found);
      this.selectBox = null;
    } else if (this.dragMode === "move") {
      this.undoManager.stopCapturing();
    }

    this.dragMode = "none";
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(this.viewport.zoom * zoomFactor, 0.1), 5.0);

      const mouseX = e.offsetX;
      const mouseY = e.offsetY;
      this.viewport.pan.x =
        mouseX - (mouseX - this.viewport.pan.x) * (newZoom / this.viewport.zoom);
      this.viewport.pan.y =
        mouseY - (mouseY - this.viewport.pan.y) * (newZoom / this.viewport.zoom);
      this.viewport.zoom = newZoom;

      const store = useCanvasStore.getState();
      store.setZoom(newZoom);
      store.setPan({ ...this.viewport.pan });
    } else {
      this.viewport.pan.x -= e.deltaX;
      this.viewport.pan.y -= e.deltaY;
      useCanvasStore.getState().setPan({ ...this.viewport.pan });
    }
    this.isDirty = true;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      target?.isContentEditable
    ) {
      return;
    }

    const store = useCanvasStore.getState();

    if ((e.key === "Delete" || e.key === "Backspace") && store.selectedIds.length > 0) {
      if (this.role === "VIEWER") return;
      this.deleteSelected();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && store.selectedIds.length > 0) {
      e.preventDefault();
      this.duplicateSelected();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      if (e.shiftKey) {
        this.undoManager.redo();
      } else {
        this.undoManager.undo();
      }
      this.isDirty = true;
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      this.undoManager.redo();
      this.isDirty = true;
    } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const toolMap: Record<string, Tool> = {
        v: "select",
        h: "hand",
        r: "rect",
        o: "ellipse",
        d: "diamond",
        l: "line",
        a: "arrow",
        p: "freehand",
        s: "sticky",
        t: "text",
        e: "eraser",
      };
      const key = e.key.toLowerCase();
      if (toolMap[key]) {
        store.setActiveTool(toolMap[key]);
      }
    }
  };

  private hitTest(worldPt: { x: number; y: number }): string | null {
    const hits = this.spatialIndex.search({
      minX: worldPt.x,
      minY: worldPt.y,
      maxX: worldPt.x,
      maxY: worldPt.y,
    });
    return hits[hits.length - 1] || null;
  }

  private getNextZIndex(): string {
    const roots = getDocRoots(this.doc);
    let highest = "a0";
    roots.elements.forEach((map) => {
      const z = map.get("z") as string;
      if (z && z > highest) highest = z;
    });
    return generateKeyBetween(highest, null);
  }

  private commitShapeElement(
    type: ElementData["type"],
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    const store = useCanvasStore.getState();
    const id = nanoid(10);
    const z = this.getNextZIndex();

    const elementMap = new Y.Map<unknown>();
    elementMap.set("id", id);
    elementMap.set("type", type);
    elementMap.set("x", Math.round(x));
    elementMap.set("y", Math.round(y));
    elementMap.set("w", Math.round(w));
    elementMap.set("h", Math.round(h));
    elementMap.set("rotation", 0);
    elementMap.set("z", z);
    elementMap.set("createdBy", this.userId);
    elementMap.set("style", {
      fill: store.fillColor,
      stroke: store.strokeColor,
      strokeWidth: store.strokeWidth,
      opacity: store.opacity,
    });

    this.doc.transact(() => {
      getDocRoots(this.doc).elements.set(id, elementMap);
    }, LOCAL_ORIGIN);

    this.spatialIndex.insert(id, x, y, w, h);
    this.isDirty = true;
  }

  private commitFreehandElement(points: number[]) {
    const store = useCanvasStore.getState();
    const id = nanoid(10);
    const z = this.getNextZIndex();

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < points.length; i += 3) {
      minX = Math.min(minX, points[i]);
      minY = Math.min(minY, points[i + 1]);
      maxX = Math.max(maxX, points[i]);
      maxY = Math.max(maxY, points[i + 1]);
    }

    const elementMap = new Y.Map<unknown>();
    elementMap.set("id", id);
    elementMap.set("type", "freehand");
    elementMap.set("x", Math.round(minX));
    elementMap.set("y", Math.round(minY));
    elementMap.set("w", Math.round(maxX - minX));
    elementMap.set("h", Math.round(maxY - minY));
    elementMap.set("rotation", 0);
    elementMap.set("z", z);
    elementMap.set("points", points);
    elementMap.set("createdBy", this.userId);
    elementMap.set("style", {
      fill: "transparent",
      stroke: store.strokeColor,
      strokeWidth: store.strokeWidth,
      opacity: store.opacity,
    });

    this.doc.transact(() => {
      getDocRoots(this.doc).elements.set(id, elementMap);
    }, LOCAL_ORIGIN);

    this.spatialIndex.insert(id, minX, minY, maxX - minX, maxY - minY);
    this.isDirty = true;
  }

  private createStickyNote(worldPt: { x: number; y: number }) {
    const id = nanoid(10);
    const z = this.getNextZIndex();
    const elementMap = new Y.Map<unknown>();
    elementMap.set("id", id);
    elementMap.set("type", "sticky");
    elementMap.set("x", Math.round(worldPt.x));
    elementMap.set("y", Math.round(worldPt.y));
    elementMap.set("w", 180);
    elementMap.set("h", 160);
    elementMap.set("rotation", 0);
    elementMap.set("z", z);
    elementMap.set("text", "New Sticky Note\nDouble click to edit");
    elementMap.set("createdBy", this.userId);
    elementMap.set("style", {
      fill: "#fef08a",
      stroke: "rgba(0,0,0,0.1)",
      strokeWidth: 1,
      opacity: 1,
    });

    this.doc.transact(() => {
      getDocRoots(this.doc).elements.set(id, elementMap);
    }, LOCAL_ORIGIN);

    this.spatialIndex.insert(id, worldPt.x, worldPt.y, 180, 160);
    this.isDirty = true;
  }

  private createTextElement(worldPt: { x: number; y: number }) {
    const id = nanoid(10);
    const z = this.getNextZIndex();
    const elementMap = new Y.Map<unknown>();
    elementMap.set("id", id);
    elementMap.set("type", "text");
    elementMap.set("x", Math.round(worldPt.x));
    elementMap.set("y", Math.round(worldPt.y));
    elementMap.set("w", 120);
    elementMap.set("h", 30);
    elementMap.set("rotation", 0);
    elementMap.set("z", z);
    elementMap.set("text", "Text Element");
    elementMap.set("createdBy", this.userId);
    elementMap.set("style", {
      fill: "transparent",
      stroke: "#0f172a",
      strokeWidth: 1,
      opacity: 1,
    });

    this.doc.transact(() => {
      getDocRoots(this.doc).elements.set(id, elementMap);
    }, LOCAL_ORIGIN);

    this.spatialIndex.insert(id, worldPt.x, worldPt.y, 120, 30);
    this.isDirty = true;
  }

  public zoomIn() {
    this.zoomTo(Math.min(5.0, this.viewport.zoom * 1.25));
  }

  public zoomOut() {
    this.zoomTo(Math.max(0.1, this.viewport.zoom * 0.8));
  }

  public resetViewport() {
    this.viewport.zoom = 1;
    this.viewport.pan = { x: 0, y: 0 };
    useCanvasStore.getState().setZoom(1);
    useCanvasStore.getState().setPan({ x: 0, y: 0 });
    this.broadcastViewport();
    this.isDirty = true;
  }

  public zoomTo(targetZoom: number) {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    const cx = w / 2;
    const cy = h / 2;
    const newZoom = Math.min(Math.max(targetZoom, 0.1), 5.0);
    this.viewport.pan.x = cx - (cx - this.viewport.pan.x) * (newZoom / this.viewport.zoom);
    this.viewport.pan.y = cy - (cy - this.viewport.pan.y) * (newZoom / this.viewport.zoom);
    this.viewport.zoom = newZoom;
    useCanvasStore.getState().setZoom(newZoom);
    useCanvasStore.getState().setPan({ ...this.viewport.pan });
    this.broadcastViewport();
    this.isDirty = true;
  }

  public setViewport(pan: { x: number; y: number }, zoom: number) {
    this.viewport.pan = { ...pan };
    this.viewport.zoom = zoom;
    useCanvasStore.getState().setZoom(zoom);
    useCanvasStore.getState().setPan({ ...pan });
    this.broadcastViewport();
    this.isDirty = true;
  }

  public undo() {
    this.undoManager.undo();
    this.isDirty = true;
  }

  public redo() {
    this.undoManager.redo();
    this.isDirty = true;
  }

  public broadcastViewport() {
    this.provider.awareness.setLocalStateField("viewport", {
      pan: this.viewport.pan,
      zoom: this.viewport.zoom,
    });
  }

  public updateSelectedStyle(styleUpdates: Partial<ElementStyle>) {
    if (this.role === "VIEWER") return;
    const store = useCanvasStore.getState();
    if (store.selectedIds.length === 0) return;

    const roots = getDocRoots(this.doc);
    this.doc.transact(() => {
      store.selectedIds.forEach((id) => {
        const map = roots.elements.get(id);
        if (map) {
          const currentStyle = (map.get("style") as ElementStyle) || {
            fill: "transparent",
            stroke: "#0f172a",
            strokeWidth: 2,
            opacity: 1,
          };
          map.set("style", {
            ...currentStyle,
            ...styleUpdates,
          });
        }
      });
    }, LOCAL_ORIGIN);
    this.isDirty = true;
  }

  public updateSelectedText(text: string) {
    if (this.role === "VIEWER") return;
    const store = useCanvasStore.getState();
    if (store.selectedIds.length === 0) return;

    const roots = getDocRoots(this.doc);
    this.doc.transact(() => {
      store.selectedIds.forEach((id) => {
        const map = roots.elements.get(id);
        if (map) {
          map.set("text", text);
        }
      });
    }, LOCAL_ORIGIN);
    this.isDirty = true;
  }

  public deleteSelected() {
    if (this.role === "VIEWER") return;
    const store = useCanvasStore.getState();
    if (store.selectedIds.length === 0) return;

    const roots = getDocRoots(this.doc);
    this.doc.transact(() => {
      store.selectedIds.forEach((id) => {
        roots.elements.delete(id);
        this.spatialIndex.remove(id);
      });
    }, LOCAL_ORIGIN);
    store.setSelectedIds([]);
    this.isDirty = true;
  }

  public duplicateSelected() {
    if (this.role === "VIEWER") return;
    const store = useCanvasStore.getState();
    if (store.selectedIds.length === 0) return;

    const roots = getDocRoots(this.doc);
    const newSelectedIds: string[] = [];

    this.doc.transact(() => {
      store.selectedIds.forEach((id) => {
        const map = roots.elements.get(id);
        if (map) {
          const data = map.toJSON() as ElementData;
          const newId = nanoid(10);
          const newZ = this.getNextZIndex();
          const newMap = new Y.Map<unknown>();
          newMap.set("id", newId);
          newMap.set("type", data.type);
          newMap.set("x", data.x + 20);
          newMap.set("y", data.y + 20);
          newMap.set("w", data.w);
          newMap.set("h", data.h);
          newMap.set("rotation", data.rotation || 0);
          newMap.set("z", newZ);
          newMap.set("createdBy", this.userId);
          newMap.set("style", { ...data.style });
          if (data.text !== undefined) newMap.set("text", data.text);
          if (data.points !== undefined) {
            const shifted = data.points.map((pt, i) => (i % 3 === 2 ? pt : pt + 20));
            newMap.set("points", shifted);
          }

          roots.elements.set(newId, newMap);
          this.spatialIndex.insert(newId, data.x + 20, data.y + 20, data.w, data.h);
          newSelectedIds.push(newId);
        }
      });
    }, LOCAL_ORIGIN);

    if (newSelectedIds.length > 0) {
      store.setSelectedIds(newSelectedIds);
      this.syncStoreWithSelection(newSelectedIds);
    }
    this.isDirty = true;
  }

  public bringSelectedToFront() {
    if (this.role === "VIEWER") return;
    const store = useCanvasStore.getState();
    if (store.selectedIds.length === 0) return;

    const roots = getDocRoots(this.doc);
    let highest = "a0";
    roots.elements.forEach((map) => {
      const z = map.get("z") as string;
      if (z && z > highest) highest = z;
    });

    this.doc.transact(() => {
      store.selectedIds.forEach((id) => {
        const map = roots.elements.get(id);
        if (map) {
          highest = generateKeyBetween(highest, null);
          map.set("z", highest);
        }
      });
    }, LOCAL_ORIGIN);
    this.isDirty = true;
  }

  public sendSelectedToBack() {
    if (this.role === "VIEWER") return;
    const store = useCanvasStore.getState();
    if (store.selectedIds.length === 0) return;

    const roots = getDocRoots(this.doc);
    let lowest = "a0";
    roots.elements.forEach((map) => {
      const z = map.get("z") as string;
      if (z && (!lowest || z < lowest)) lowest = z;
    });

    this.doc.transact(() => {
      store.selectedIds.forEach((id) => {
        const map = roots.elements.get(id);
        if (map) {
          lowest = generateKeyBetween(null, lowest);
          map.set("z", lowest);
        }
      });
    }, LOCAL_ORIGIN);
    this.isDirty = true;
  }

  public getSelectedElements(): ElementData[] {
    const store = useCanvasStore.getState();
    if (store.selectedIds.length === 0) return [];

    const roots = getDocRoots(this.doc);
    const elements: ElementData[] = [];
    store.selectedIds.forEach((id) => {
      const map = roots.elements.get(id);
      if (map) {
        elements.push(map.toJSON() as ElementData);
      }
    });
    return elements;
  }

  private syncStoreWithSelection(selectedIds: string[]) {
    if (selectedIds.length === 0) return;
    const store = useCanvasStore.getState();
    const roots = getDocRoots(this.doc);
    const map = roots.elements.get(selectedIds[0]);
    if (map) {
      const data = map.toJSON() as ElementData;
      if (data && data.style) {
        if (data.style.stroke) store.setStrokeColor(data.style.stroke);
        if (data.style.fill) store.setFillColor(data.style.fill);
        if (data.style.strokeWidth) store.setStrokeWidth(data.style.strokeWidth);
        if (data.style.opacity !== undefined) store.setOpacity(data.style.opacity);
      }
    }
  }

  private onDoubleClick = (e: MouseEvent) => {
    if (this.role === "VIEWER") return;
    const worldPt = this.viewport.screenToWorld({ x: e.offsetX, y: e.offsetY });
    const hitId = this.hitTest(worldPt);
    if (!hitId) return;

    const roots = getDocRoots(this.doc);
    const map = roots.elements.get(hitId);
    if (!map) return;

    const el = map.toJSON() as ElementData;
    if (el.type === "sticky" || el.type === "text") {
      this.startInlineTextEdit(hitId, el);
    }
  };

  private startInlineTextEdit(id: string, el: ElementData) {
    if (this.activeTextarea) {
      this.finishInlineTextEdit();
    }

    const screenPos = this.viewport.worldToScreen({ x: el.x, y: el.y });
    const zoom = this.viewport.zoom;

    const textarea = document.createElement("textarea");
    textarea.value = el.text || "";
    textarea.style.position = "absolute";
    textarea.style.left = `${screenPos.x}px`;
    textarea.style.top = `${screenPos.y}px`;
    textarea.style.width = `${Math.max(el.w * zoom, 120)}px`;
    textarea.style.height = `${Math.max(el.h * zoom, 40)}px`;
    textarea.style.zIndex = "35";
    textarea.style.padding = el.type === "sticky" ? `${12 * zoom}px` : "2px";
    textarea.style.background = el.type === "sticky" ? (el.style.fill || "#fef08a") : "rgba(255, 255, 255, 0.95)";
    textarea.style.color = el.type === "sticky" ? "#1e293b" : (el.style.stroke || "#000000");
    textarea.style.font = el.type === "sticky" ? `${14 * zoom}px Inter, sans-serif` : `${16 * zoom}px Inter, sans-serif`;
    textarea.style.lineHeight = el.type === "sticky" ? `${20 * zoom}px` : `${22 * zoom}px`;
    textarea.style.border = "2px solid #6366f1";
    textarea.style.borderRadius = el.type === "sticky" ? "4px" : "2px";
    textarea.style.outline = "none";
    textarea.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
    textarea.style.resize = "none";

    const commitChange = () => {
      const roots = getDocRoots(this.doc);
      const map = roots.elements.get(id);
      if (map) {
        this.doc.transact(() => {
          map.set("text", textarea.value);
        }, LOCAL_ORIGIN);
        this.isDirty = true;
      }
    };

    textarea.addEventListener("input", commitChange);

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.finishInlineTextEdit();
      } else if (e.key === "Enter" && !e.shiftKey && el.type === "text") {
        e.preventDefault();
        this.finishInlineTextEdit();
      }
    });

    textarea.addEventListener("blur", () => {
      this.finishInlineTextEdit();
    });

    this.container.appendChild(textarea);
    this.activeTextarea = textarea;
    textarea.focus();
    textarea.select();
  }

  private finishInlineTextEdit() {
    if (this.activeTextarea) {
      if (this.activeTextarea.parentElement) {
        this.activeTextarea.parentElement.removeChild(this.activeTextarea);
      }
      this.activeTextarea = null;
      this.isDirty = true;
    }
  }

  destroy() {
    this.isDestroyed = true;
    this.finishInlineTextEdit();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener("resize", this.handleResize);
    this.overlayCanvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.overlayCanvas.removeEventListener("wheel", this.onWheel);
    this.overlayCanvas.removeEventListener("dblclick", this.onDoubleClick);
    window.removeEventListener("keydown", this.onKeyDown);
    if (this.elementsObserver) {
      const roots = getDocRoots(this.doc);
      roots.elements.unobserveDeep(this.elementsObserver);
    }
    if (this.docUpdateHandler) {
      this.doc.off("update", this.docUpdateHandler);
    }
    if (this.providerUnsub) {
      this.providerUnsub();
    }
    this.undoManager.destroy();
  }
}
