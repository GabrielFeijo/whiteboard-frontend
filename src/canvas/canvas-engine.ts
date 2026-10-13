import * as Y from "yjs";
import { nanoid } from "nanoid";
import { generateKeyBetween } from "fractional-indexing";
import { ElementData, getDocRoots, Role } from "../shared";
import { Point, Viewport } from "./viewport";
import { SpatialIndex } from "./spatial-index";
import { renderElement } from "./renderers/element-renderer";
import { drawFreehand } from "./renderers/freehand-renderer";
import { measureTextDimensions } from "./renderers/text-renderer";
import { Tool, useCanvasStore } from "../store/canvas-store";
import { LocalUndoManager, LOCAL_ORIGIN } from "../collab/undo-manager";
import { SyncProvider } from "../collab/sync-provider";
import { getElementHandles, isPointInElement } from "./resize-helper";
import { CanvasEventEmitter } from "./canvas-events";
import {
  CanvasHost,
  CanvasTool,
  EraserTool,
  FreehandTool,
  HandTool,
  SelectTool,
  ShapeTool,
  StickyTool,
  TextTool,
} from "./tools";
import { YjsElementAdapter } from "./yjs-element-adapter";

export type ElementStyle = ElementData["style"];

export class CanvasEngine implements CanvasHost {
  readonly viewport = new Viewport();
  readonly spatialIndex = new SpatialIndex();
  readonly undoManager: LocalUndoManager;
  readonly events = new CanvasEventEmitter();

  private bgCtx!: CanvasRenderingContext2D;
  private contentCtx!: CanvasRenderingContext2D;
  private overlayCtx!: CanvasRenderingContext2D;

  private isDirty = true;
  private animFrameId: number | null = null;
  private isDestroyed = false;
  private isPointerDown = false;
  private currentPoint = { x: 0, y: 0 };

  private tools: Map<Tool, CanvasTool>;
  private selectBox: { x: number; y: number; w: number; h: number } | null = null;
  private freehandDraft: number[] = [];
  private shapeDraft: {
    type: ElementData["type"];
    x: number;
    y: number;
    w: number;
    h: number;
  } | null = null;

  private storeUnsub: (() => void) | null = null;
  private elementsObserver: Parameters<Y.Map<unknown>["observeDeep"]>[0] | null = null;
  private providerUnsub: (() => void) | null = null;
  private docUpdateHandler: (() => void) | null = null;

  constructor(
    private readonly container: HTMLDivElement,
    private readonly bgCanvas: HTMLCanvasElement,
    private readonly contentCanvas: HTMLCanvasElement,
    private readonly overlayCanvas: HTMLCanvasElement,
    readonly doc: Y.Doc,
    private readonly provider: SyncProvider,
    readonly role: Role,
    readonly userId: string,
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

    this.tools = new Map<Tool, CanvasTool>([
      ["select", new SelectTool(this)],
      ["hand", new HandTool(this)],
      ["rect", new ShapeTool("rect", this)],
      ["ellipse", new ShapeTool("ellipse", this)],
      ["diamond", new ShapeTool("diamond", this)],
      ["line", new ShapeTool("line", this)],
      ["arrow", new ShapeTool("arrow", this)],
      ["freehand", new FreehandTool(this)],
      ["sticky", new StickyTool(this)],
      ["text", new TextTool(this)],
      ["eraser", new EraserTool(this)],
    ]);

    this.resizeCanvases();
    this.setupListeners();
    this.indexExistingElements();
    this.startRenderLoop();
  }

  setDirty(): void {
    this.isDirty = true;
  }

  setSelectBox(box: { x: number; y: number; w: number; h: number } | null): void {
    this.selectBox = box;
  }

  getSelectBox(): { x: number; y: number; w: number; h: number } | null {
    return this.selectBox;
  }

  setFreehandDraft(draft: number[]): void {
    this.freehandDraft = draft;
  }

  getFreehandDraft(): number[] {
    return this.freehandDraft;
  }

  setShapeDraft(
    draft: { type: ElementData["type"]; x: number; y: number; w: number; h: number } | null,
  ): void {
    this.shapeDraft = draft;
  }

  getShapeDraft(): { type: ElementData["type"]; x: number; y: number; w: number; h: number } | null {
    return this.shapeDraft;
  }

  private getActiveTool(): CanvasTool {
    const activeToolId = useCanvasStore.getState().activeTool;
    return this.tools.get(activeToolId) ?? this.tools.get("select")!;
  }

  private indexExistingElements(): void {
    const roots = getDocRoots(this.doc);
    roots.elements.forEach((map, id) => {
      const data = YjsElementAdapter.toElementData(map);
      if (data) {
        this.spatialIndex.insert(id, data.x, data.y, data.w, data.h);
      }
    });
  }

  private setupListeners(): void {
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
                const data = YjsElementAdapter.toElementData(childMap);
                const elementId = data?.id || key;
                if (data && elementId) {
                  this.spatialIndex.insert(elementId, data.x, data.y, data.w, data.h);
                }
              }
            }
          });
        } else {
          const target = event.target as Y.Map<unknown>;
          const data = YjsElementAdapter.toElementData(target);
          if (data?.id) {
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
    this.overlayCanvas.addEventListener("pointerleave", this.onPointerLeave);
    this.overlayCanvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.overlayCanvas.addEventListener("dblclick", this.onDoubleClick);
    window.addEventListener("keydown", this.onKeyDown);

    this.storeUnsub = useCanvasStore.subscribe((state, prevState) => {
      if (
        state.activeTool !== prevState.activeTool ||
        state.selectedIds !== prevState.selectedIds
      ) {
        const screenPt = this.viewport.worldToScreen(this.currentPoint);
        this.updateHoverCursor(screenPt, this.currentPoint);
        this.isDirty = true;
      }
    });
  }

  private handleResize = () => {
    this.resizeCanvases();
    this.isDirty = true;
  };

  private resizeCanvases(): void {
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

  private startRenderLoop(): void {
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

  private renderBackground(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.bgCtx.clearRect(0, 0, w, h);

    const zoom = this.viewport.zoom;
    const pan = this.viewport.pan;
    const gridSize = 24 * zoom;

    if (gridSize < 8) return;

    const isDark = document.documentElement.classList.contains("dark");
    this.bgCtx.fillStyle = isDark
      ? "rgba(255, 255, 255, 0.07)"
      : "rgba(15, 23, 42, 0.08)";

    const startX = pan.x % gridSize;
    const startY = pan.y % gridSize;

    this.bgCtx.beginPath();
    for (let x = startX; x < w; x += gridSize) {
      for (let y = startY; y < h; y += gridSize) {
        this.bgCtx.rect(x - 0.5, y - 0.5, 1, 1);
      }
    }
    this.bgCtx.fill();
  }

  private renderContent(): void {
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
        const data = YjsElementAdapter.toElementData(map);
        if (data) elements.push(data);
      }
    });

    elements.sort((a, b) => (a.z > b.z ? 1 : a.z < b.z ? -1 : 0));

    elements.forEach((el) => {
      renderElement(this.contentCtx, el);
    });

    this.contentCtx.restore();
  }

  private renderOverlay(): void {
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
          const el = YjsElementAdapter.toElementData(map);
          if (el) {
            this.overlayCtx.strokeStyle = "#4f46e5";
            this.overlayCtx.lineWidth = 1.5 / this.viewport.zoom;
            this.overlayCtx.strokeRect(el.x, el.y, el.w, el.h);

            if (store.selectedIds.length === 1) {
              const handleSize = 8 / this.viewport.zoom;
              this.overlayCtx.fillStyle = "#ffffff";
              this.overlayCtx.strokeStyle = "#4f46e5";
              this.overlayCtx.lineWidth = 1.5 / this.viewport.zoom;
              const handles = getElementHandles(el);
              handles.forEach((handle) => {
                this.overlayCtx.fillRect(
                  handle.x - handleSize / 2,
                  handle.y - handleSize / 2,
                  handleSize,
                  handleSize,
                );
                this.overlayCtx.strokeRect(
                  handle.x - handleSize / 2,
                  handle.y - handleSize / 2,
                  handleSize,
                  handleSize,
                );
              });
            }
          }
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

    if (this.shapeDraft) {
      this.overlayCtx.strokeStyle = "#4f46e5";
      this.overlayCtx.lineWidth = 1.5 / this.viewport.zoom;
      this.overlayCtx.setLineDash([4 / this.viewport.zoom, 4 / this.viewport.zoom]);
      this.overlayCtx.strokeRect(
        this.shapeDraft.x,
        this.shapeDraft.y,
        this.shapeDraft.w,
        this.shapeDraft.h,
      );
      this.overlayCtx.setLineDash([]);
    }

    if (this.freehandDraft.length >= 6) {
      const draftEl: ElementData = {
        id: "draft",
        type: "freehand",
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        rotation: 0,
        z: "a0",
        style: {
          fill: "transparent",
          stroke: store.strokeColor,
          strokeWidth: store.strokeWidth,
          opacity: store.opacity,
        },
        points: this.freehandDraft,
        createdBy: this.userId,
      };
      drawFreehand(this.overlayCtx, draftEl);
    }

    this.renderRemoteCursors();

    this.overlayCtx.restore();
  }

  private renderRemoteCursors(): void {
    const states = this.provider.awareness.getStates();
    const localClientId = this.doc.clientID;

    states.forEach((state, clientId) => {
      if (clientId === localClientId || !state.cursor) return;

      const { x, y } = state.cursor;
      const user = state.user || { name: "Guest", color: "#6366f1" };
      const color = user.color || "#6366f1";
      const name = user.name || "Guest";

      this.overlayCtx.save();
      this.overlayCtx.translate(x, y);

      this.overlayCtx.fillStyle = color;
      this.overlayCtx.beginPath();
      this.overlayCtx.moveTo(0, 0);
      this.overlayCtx.lineTo(0, 16 / this.viewport.zoom);
      this.overlayCtx.lineTo(4 / this.viewport.zoom, 12 / this.viewport.zoom);
      this.overlayCtx.lineTo(9 / this.viewport.zoom, 21 / this.viewport.zoom);
      this.overlayCtx.lineTo(12 / this.viewport.zoom, 19 / this.viewport.zoom);
      this.overlayCtx.lineTo(7 / this.viewport.zoom, 11 / this.viewport.zoom);
      this.overlayCtx.lineTo(13 / this.viewport.zoom, 10 / this.viewport.zoom);
      this.overlayCtx.closePath();
      this.overlayCtx.fill();

      this.overlayCtx.font = `${11 / this.viewport.zoom}px Inter, sans-serif`;
      const textWidth = this.overlayCtx.measureText(name).width;
      const pad = 4 / this.viewport.zoom;

      this.overlayCtx.fillStyle = color;
      this.overlayCtx.beginPath();
      this.overlayCtx.roundRect(
        12 / this.viewport.zoom,
        14 / this.viewport.zoom,
        textWidth + pad * 2,
        16 / this.viewport.zoom,
        4 / this.viewport.zoom,
      );
      this.overlayCtx.fill();

      this.overlayCtx.fillStyle = "#ffffff";
      this.overlayCtx.fillText(
        name,
        12 / this.viewport.zoom + pad,
        14 / this.viewport.zoom + 12 / this.viewport.zoom,
      );

      this.overlayCtx.restore();
    });
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.isPointerDown = true;
    const rect = this.overlayCanvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPt = this.viewport.screenToWorld(screenPt);
    this.currentPoint = worldPt;

    const ctx = { worldPt, screenPt, event: e, isPointerDown: true };
    this.getActiveTool().onPointerDown(ctx);
  };

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.overlayCanvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPt = this.viewport.screenToWorld(screenPt);
    this.currentPoint = worldPt;

    this.provider.awareness.setLocalStateField("cursor", { x: worldPt.x, y: worldPt.y });

    const ctx = { worldPt, screenPt, event: e, isPointerDown: this.isPointerDown };

    if (!this.isPointerDown) {
      this.updateHoverCursor(screenPt, worldPt);
      return;
    }

    this.getActiveTool().onPointerMove(ctx);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;

    const rect = this.overlayCanvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPt = this.viewport.screenToWorld(screenPt);

    const ctx = { worldPt, screenPt, event: e, isPointerDown: false };
    this.getActiveTool().onPointerUp(ctx);
    this.updateHoverCursor(screenPt, worldPt);
  };

  private onPointerLeave = (): void => {
    if (!this.isPointerDown) {
      this.setCursor("default");
    }
  };

  private updateHoverCursor(screenPt: Point, worldPt: Point): void {
    const ctx = {
      worldPt,
      screenPt,
      event: new PointerEvent("pointermove"),
      isPointerDown: this.isPointerDown,
    };
    const cursor = this.getActiveTool().getCursor(ctx);
    this.setCursor(cursor);
  }

  private setCursor(cursor: string): void {
    if (this.overlayCanvas.style.cursor !== cursor) {
      this.overlayCanvas.style.cursor = cursor;
    }
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = Math.pow(0.995, e.deltaY);
      const newZoom = Math.min(Math.max(this.viewport.zoom * zoomFactor, 0.1), 5.0);

      const rect = this.overlayCanvas.getBoundingClientRect();
      const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      this.viewport.pan.x =
        mouseScreen.x - (mouseScreen.x - this.viewport.pan.x) * (newZoom / this.viewport.zoom);
      this.viewport.pan.y =
        mouseScreen.y - (mouseScreen.y - this.viewport.pan.y) * (newZoom / this.viewport.zoom);
      this.viewport.zoom = newZoom;

      useCanvasStore.getState().setZoom(newZoom);
      useCanvasStore.getState().setPan({ ...this.viewport.pan });
    } else {
      this.viewport.pan.x -= e.deltaX;
      this.viewport.pan.y -= e.deltaY;
      useCanvasStore.getState().setPan({ ...this.viewport.pan });
    }

    this.broadcastViewport();
    this.isDirty = true;
  };

  private onDoubleClick = (e: MouseEvent): void => {
    if (this.role === "VIEWER") return;
    const worldPt = this.viewport.screenToWorld({ x: e.offsetX, y: e.offsetY });
    const hitId = this.hitTest(worldPt);
    if (!hitId) return;

    const roots = getDocRoots(this.doc);
    const map = roots.elements.get(hitId);
    if (!map) return;

    const el = YjsElementAdapter.toElementData(map);
    if (el?.type === "sticky" || el?.type === "text") {
      const store = useCanvasStore.getState();
      store.setSelectedIds([hitId]);
      this.syncStoreWithSelection([hitId]);
      this.events.emit("focusTextInput", { elementId: hitId });
    }
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    ) {
      return;
    }

    const store = useCanvasStore.getState();

    if ((e.key === "Delete" || e.key === "Backspace") && store.selectedIds.length > 0) {
      if (this.role === "VIEWER") return;
      this.deleteSelected();
    } else if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "d" &&
      store.selectedIds.length > 0
    ) {
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

  hitTest(worldPt: { x: number; y: number }): string | null {
    const hits = this.spatialIndex.search({
      minX: worldPt.x,
      minY: worldPt.y,
      maxX: worldPt.x,
      maxY: worldPt.y,
    });
    if (hits.length === 0) return null;

    const roots = getDocRoots(this.doc);
    const candidateElements: ElementData[] = [];

    for (const id of hits) {
      const map = roots.elements.get(id);
      if (map) {
        const data = YjsElementAdapter.toElementData(map);
        if (data) candidateElements.push(data);
      }
    }

    if (candidateElements.length === 0) return null;

    candidateElements.sort(
      (a, b) => ((b.z || "") > (a.z || "") ? 1 : (b.z || "") < (a.z || "") ? -1 : 0),
    );

    for (const el of candidateElements) {
      if (isPointInElement(worldPt, el)) {
        return el.id;
      }
    }

    return candidateElements[0].id;
  }

  getNextZIndex(): string {
    const roots = getDocRoots(this.doc);
    let highest = "a0";
    roots.elements.forEach((map) => {
      const z = (map.get("z") as string) || "a0";
      if (z > highest) highest = z;
    });
    return generateKeyBetween(highest, null);
  }

  commitElement(data: ElementData): void {
    const roots = getDocRoots(this.doc);
    const elementMap = YjsElementAdapter.createYMap(data);

    this.doc.transact(() => {
      roots.elements.set(data.id, elementMap);
    }, LOCAL_ORIGIN);

    this.spatialIndex.insert(data.id, data.x, data.y, data.w, data.h);
    this.isDirty = true;
  }

  getSelectedElements(): ElementData[] {
    const store = useCanvasStore.getState();
    if (store.selectedIds.length === 0) return [];

    const roots = getDocRoots(this.doc);
    const elements: ElementData[] = [];
    store.selectedIds.forEach((id) => {
      const map = roots.elements.get(id);
      if (map) {
        const data = YjsElementAdapter.toElementData(map);
        if (data) elements.push(data);
      }
    });
    return elements;
  }

  syncStoreWithSelection(selectedIds: string[]): void {
    if (selectedIds.length === 0) return;
    const store = useCanvasStore.getState();
    const roots = getDocRoots(this.doc);
    const map = roots.elements.get(selectedIds[0]);
    if (map) {
      const data = YjsElementAdapter.toElementData(map);
      if (data?.style) {
        if (data.style.stroke) store.setStrokeColor(data.style.stroke);
        if (data.style.fill) store.setFillColor(data.style.fill);
        if (data.style.strokeWidth) store.setStrokeWidth(data.style.strokeWidth);
        if (data.style.opacity !== undefined) store.setOpacity(data.style.opacity);
      }
    }
  }

  public zoomIn(): void {
    this.zoomTo(Math.min(5.0, this.viewport.zoom * 1.25));
  }

  public zoomOut(): void {
    this.zoomTo(Math.max(0.1, this.viewport.zoom * 0.8));
  }

  public resetViewport(): void {
    this.viewport.zoom = 1;
    this.viewport.pan = { x: 0, y: 0 };
    useCanvasStore.getState().setZoom(1);
    useCanvasStore.getState().setPan({ x: 0, y: 0 });
    this.broadcastViewport();
    this.isDirty = true;
  }

  public zoomTo(targetZoom: number): void {
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

  public setViewport(pan: { x: number; y: number }, zoom: number): void {
    this.viewport.pan = { ...pan };
    this.viewport.zoom = zoom;
    useCanvasStore.getState().setZoom(zoom);
    useCanvasStore.getState().setPan({ ...pan });
    this.broadcastViewport();
    this.isDirty = true;
  }

  public undo(): void {
    this.undoManager.undo();
    this.isDirty = true;
  }

  public redo(): void {
    this.undoManager.redo();
    this.isDirty = true;
  }

  public broadcastViewport(): void {
    this.provider.awareness.setLocalStateField("viewport", {
      pan: this.viewport.pan,
      zoom: this.viewport.zoom,
    });
  }

  public updateSelectedStyle(styleUpdates: Partial<ElementStyle>): void {
    if (this.role === "VIEWER") return;
    const store = useCanvasStore.getState();
    if (store.selectedIds.length === 0) return;

    const roots = getDocRoots(this.doc);
    this.doc.transact(() => {
      store.selectedIds.forEach((id) => {
        const map = roots.elements.get(id);
        if (map) {
          YjsElementAdapter.updateYMap(map, { style: styleUpdates as ElementData["style"] });
        }
      });
    }, LOCAL_ORIGIN);
    this.isDirty = true;
  }

  public updateSelectedText(text: string): void {
    if (this.role === "VIEWER") return;
    const store = useCanvasStore.getState();
    if (store.selectedIds.length === 0) return;

    const roots = getDocRoots(this.doc);
    this.doc.transact(() => {
      store.selectedIds.forEach((id) => {
        const map = roots.elements.get(id);
        if (map) {
          map.set("text", text);
          const type = map.get("type") as string;
          if (type === "text") {
            const dims = measureTextDimensions(text);
            const x = (map.get("x") as number) || 0;
            const y = (map.get("y") as number) || 0;
            map.set("w", dims.w);
            map.set("h", dims.h);
            this.spatialIndex.remove(id);
            this.spatialIndex.insert(id, x, y, dims.w, dims.h);
          }
        }
      });
    }, LOCAL_ORIGIN);
    this.isDirty = true;
  }

  public deleteSelected(): void {
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

  public duplicateSelected(): void {
    if (this.role === "VIEWER") return;
    const store = useCanvasStore.getState();
    if (store.selectedIds.length === 0) return;

    const roots = getDocRoots(this.doc);
    const newSelectedIds: string[] = [];

    this.doc.transact(() => {
      store.selectedIds.forEach((id) => {
        const map = roots.elements.get(id);
        if (map) {
          const data = YjsElementAdapter.toElementData(map);
          if (data) {
            const newId = nanoid(10);
            const newZ = this.getNextZIndex();
            const duplicated: ElementData = {
              ...data,
              id: newId,
              x: data.x + 20,
              y: data.y + 20,
              z: newZ,
              createdBy: this.userId,
              points: data.points?.map((pt, i) => (i % 3 === 2 ? pt : pt + 20)),
            };

            const newMap = YjsElementAdapter.createYMap(duplicated);
            roots.elements.set(newId, newMap);
            this.spatialIndex.insert(newId, duplicated.x, duplicated.y, duplicated.w, duplicated.h);
            newSelectedIds.push(newId);
          }
        }
      });
    }, LOCAL_ORIGIN);

    if (newSelectedIds.length > 0) {
      store.setSelectedIds(newSelectedIds);
      this.syncStoreWithSelection(newSelectedIds);
    }
    this.isDirty = true;
  }

  public bringSelectedToFront(): void {
    if (this.role === "VIEWER") return;
    const store = useCanvasStore.getState();
    if (store.selectedIds.length === 0) return;

    const roots = getDocRoots(this.doc);
    let highest = "a0";
    roots.elements.forEach((map) => {
      const z = (map.get("z") as string) || "a0";
      if (z > highest) highest = z;
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

  public sendSelectedToBack(): void {
    if (this.role === "VIEWER") return;
    const store = useCanvasStore.getState();
    if (store.selectedIds.length === 0) return;

    const roots = getDocRoots(this.doc);
    let lowest = "a0";
    roots.elements.forEach((map) => {
      const z = (map.get("z") as string) || "a0";
      if (!lowest || z < lowest) lowest = z;
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

  destroy(): void {
    this.isDestroyed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener("resize", this.handleResize);
    this.overlayCanvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    this.overlayCanvas.removeEventListener("pointerleave", this.onPointerLeave);
    this.overlayCanvas.removeEventListener("wheel", this.onWheel);
    this.overlayCanvas.removeEventListener("dblclick", this.onDoubleClick);
    window.removeEventListener("keydown", this.onKeyDown);
    if (this.storeUnsub) {
      this.storeUnsub();
      this.storeUnsub = null;
    }
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
    this.events.clear();
    this.tools.forEach((tool) => tool.onDeactivate?.());
    this.undoManager.destroy();
  }
}
