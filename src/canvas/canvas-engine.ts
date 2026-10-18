import * as Y from "yjs";
import { ElementData, ElementType, Role } from "@/shared";
import { Point, Viewport } from "@/canvas/viewport";
import { SpatialIndex } from "@/canvas/spatial-index";
import { renderElement } from "@/canvas/renderers/element-renderer";
import { renderBackgroundGrid } from "@/canvas/renderers/background-grid-renderer";
import { renderSelectionAndDraftsOverlay } from "@/canvas/renderers/selection-overlay-renderer";
import { renderRemoteCursorsOverlay } from "@/canvas/renderers/remote-cursors-renderer";
import { CanvasToolType, Tool, useCanvasStore } from "@/store/canvas-store";
import { LocalUndoManager } from "@/collab/undo-manager";
import { SyncProvider } from "@/collab/sync-provider";
import {
  setLocalCursorAwareness,
  setLocalViewportAwareness,
} from "@/collab/typed-awareness";
import { CanvasEventEmitter } from "@/canvas/canvas-events";
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
} from "@/canvas/tools";
import { YjsElementAdapter } from "@/canvas/yjs-element-adapter";
import { YjsElementRepository } from "@/canvas/repositories/yjs-element-repository";
import {
  CanvasInputController,
  InputControllerHost,
} from "@/canvas/controllers/canvas-input-controller";
import {
  CanvasKeyboardController,
  KeyboardControllerTarget,
} from "@/canvas/controllers/canvas-keyboard-controller";
import { AlignmentType, DistributionType } from "@/canvas/alignment-helper";
import {
  calculateImagePlacement,
  fileToDataUrl,
  loadImageDimensions,
} from "@/canvas/image-helper";
import { nanoid } from "nanoid";

export type ElementStyle = ElementData["style"];

export class CanvasEngine
  implements CanvasHost, InputControllerHost, KeyboardControllerTarget
{
  readonly viewport = new Viewport();
  readonly spatialIndex = new SpatialIndex();
  readonly undoManager: LocalUndoManager;
  readonly events = new CanvasEventEmitter();
  private readonly repository: YjsElementRepository;

  private bgCtx: CanvasRenderingContext2D;
  private contentCtx: CanvasRenderingContext2D;
  private overlayCtx: CanvasRenderingContext2D;

  private isContentDirty = true;
  private isBackgroundDirty = true;
  private animFrameId: number | null = null;
  private isDestroyed = false;

  private readonly tools: Map<Tool, CanvasTool>;
  private readonly inputController: CanvasInputController;
  private readonly keyboardController: CanvasKeyboardController;

  private selectBox: { x: number; y: number; w: number; h: number } | null = null;
  private freehandDraft: number[] = [];
  private shapeDraft: {
    type: ElementData["type"];
    x: number;
    y: number;
    w: number;
    h: number;
  } | null = null;
  private guides: { vertical?: number[]; horizontal?: number[] } | null = null;
  private snapIndicator: { active: Point | null; candidates: Point[] } | null = null;

  private storeUnsub: (() => void) | null = null;
  private repoUnsub: (() => void) | null = null;
  private providerUnsub: (() => void) | null = null;

  constructor(
    private readonly container: HTMLDivElement,
    private readonly bgCanvas: HTMLCanvasElement,
    private readonly contentCanvas: HTMLCanvasElement,
    readonly overlayCanvas: HTMLCanvasElement,
    readonly doc: Y.Doc,
    private readonly provider: SyncProvider,
    readonly role: Role,
    readonly userId: string,
  ) {
    this.undoManager = new LocalUndoManager(doc);
    this.repository = new YjsElementRepository(doc, this.spatialIndex);

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
      [CanvasToolType.SELECT, new SelectTool(this)],
      [CanvasToolType.HAND, new HandTool(this)],
      [CanvasToolType.RECT, new ShapeTool(ElementType.RECT, this)],
      [CanvasToolType.ELLIPSE, new ShapeTool(ElementType.ELLIPSE, this)],
      [CanvasToolType.DIAMOND, new ShapeTool(ElementType.DIAMOND, this)],
      [CanvasToolType.LINE, new ShapeTool(ElementType.LINE, this)],
      [CanvasToolType.ARROW, new ShapeTool(ElementType.ARROW, this)],
      [CanvasToolType.FREEHAND, new FreehandTool(this)],
      [CanvasToolType.STICKY, new StickyTool(this)],
      [CanvasToolType.TEXT, new TextTool(this)],
      [CanvasToolType.ERASER, new EraserTool(this)],
    ]);

    this.resizeCanvases();
    this.inputController = new CanvasInputController(this);
    this.keyboardController = new CanvasKeyboardController(this);
    this.setupListeners();
    this.repository.indexAllElements();
    this.startRenderLoop();

    if (typeof window !== "undefined") {
      (window as unknown as { __CANVAS_ENGINE__?: CanvasEngine }).__CANVAS_ENGINE__ = this;
    }
  }

  setDirty(): void {
    this.isContentDirty = true;
  }

  setBackgroundDirty(): void {
    this.isBackgroundDirty = true;
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
    draft: {
      type: ElementData["type"];
      x: number;
      y: number;
      w: number;
      h: number;
    } | null,
  ): void {
    this.shapeDraft = draft;
  }

  getShapeDraft(): {
    type: ElementData["type"];
    x: number;
    y: number;
    w: number;
    h: number;
  } | null {
    return this.shapeDraft;
  }

  getActiveTool(): CanvasTool {
    const activeToolId = useCanvasStore.getState().activeTool;
    return this.tools.get(activeToolId) ?? this.tools.get(CanvasToolType.SELECT)!;
  }

  onCursorWorldMove(worldPt: Point): void {
    setLocalCursorAwareness(this.provider.awareness, {
      x: worldPt.x,
      y: worldPt.y,
    });
  }

  onViewportMutated(): void {
    this.broadcastViewport();
    this.isBackgroundDirty = true;
    this.isContentDirty = true;
  }

  onDoubleClickAtWorld(worldPt: Point): void {
    if (this.role === Role.VIEWER) return;
    const hitId = this.hitTest(worldPt);
    if (!hitId) return;

    const el = this.repository.getById(hitId);
    if (el?.type === ElementType.STICKY || el?.type === ElementType.TEXT) {
      useCanvasStore.getState().setSelectedIds([hitId]);
      this.syncStoreWithSelection([hitId]);
      this.events.emit("focusTextInput", { elementId: hitId });
    }
  }

  onDropFile(file: File, worldPt: Point): void {
    void this.insertImage(file, worldPt);
  }

  pasteImage(file: File): void {
    void this.insertImage(file);
  }

  private setupListeners(): void {
    this.repoUnsub = this.repository.observeChanges(() => {
      this.isContentDirty = true;
    });

    this.providerUnsub = this.provider.onStatusChange((status) => {
      if (status === "synced") {
        this.repository.indexAllElements();
        this.isBackgroundDirty = true;
        this.isContentDirty = true;
      }
    });

    window.addEventListener("resize", this.handleResize);

    this.storeUnsub = useCanvasStore.subscribe((state, prevState) => {
      if (
        state.activeTool !== prevState.activeTool ||
        state.selectedIds !== prevState.selectedIds
      ) {
        this.inputController.refreshHoverCursor();
        this.isContentDirty = true;
      }
    });
  }

  private handleResize = (): void => {
    this.resizeCanvases();
    this.isBackgroundDirty = true;
    this.isContentDirty = true;
  };

  private resizeCanvases(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    [this.bgCanvas, this.contentCanvas, this.overlayCanvas].forEach(
      (canvas) => {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.scale(dpr, dpr);
      },
    );
  }

  private startRenderLoop(): void {
    const render = () => {
      if (this.isDestroyed) return;

      if (this.isBackgroundDirty) {
        renderBackgroundGrid(
          this.bgCtx,
          this.container.clientWidth,
          this.container.clientHeight,
          this.viewport,
        );
        this.isBackgroundDirty = false;
      }

      if (this.isContentDirty) {
        this.renderContent();
        this.isContentDirty = false;
      }

      this.renderOverlay();

      this.animFrameId = requestAnimationFrame(render);
    };
    this.animFrameId = requestAnimationFrame(render);
  }

  private renderContent(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.contentCtx.clearRect(0, 0, w, h);

    this.contentCtx.save();
    this.contentCtx.translate(this.viewport.pan.x, this.viewport.pan.y);
    this.contentCtx.scale(this.viewport.zoom, this.viewport.zoom);

    const bounds = this.viewport.getVisibleWorldBounds(w, h);
    const elements = this.repository.getVisibleElements(bounds);

    const getEl = (id: string) => this.repository.getById(id);
    const onImgLoaded = () => this.setDirty();
    elements.forEach((el) => {
      renderElement(this.contentCtx, el, getEl, onImgLoaded);
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

    renderSelectionAndDraftsOverlay({
      ctx: this.overlayCtx,
      zoom: this.viewport.zoom,
      selectedElements: this.getSelectedElements(),
      selectBox: this.selectBox,
      shapeDraft: this.shapeDraft,
      freehandDraft: this.freehandDraft,
      draftStyle: {
        strokeColor: store.strokeColor,
        strokeWidth: store.strokeWidth,
        opacity: store.opacity,
      },
      userId: this.userId,
      guides: this.guides,
      snapIndicator: this.snapIndicator,
      getElementById: (id) => this.repository.getById(id),
    });

    renderRemoteCursorsOverlay(
      this.overlayCtx,
      this.provider.awareness,
      this.doc.clientID,
      this.viewport.zoom,
    );

    this.overlayCtx.restore();
  }

  hitTest(worldPt: { x: number; y: number }): string | null {
    return this.repository.hitTest(worldPt);
  }

  getNextZIndex(): string {
    return this.repository.getNextZIndex();
  }

  commitElement(data: ElementData): void {
    this.repository.commitElement(data);
    this.isContentDirty = true;
  }

  getSelectedElements(): ElementData[] {
    const selectedIds = useCanvasStore.getState().selectedIds;
    return this.repository.getManyByIds(selectedIds);
  }

  syncStoreWithSelection(selectedIds: string[]): void {
    if (selectedIds.length === 0) return;
    const store = useCanvasStore.getState();
    const data = this.repository.getById(selectedIds[0]);
    if (data?.style) {
      if (data.style.stroke) store.setStrokeColor(data.style.stroke);
      if (data.style.fill) store.setFillColor(data.style.fill);
      if (data.style.strokeWidth) store.setStrokeWidth(data.style.strokeWidth);
      if (data.style.opacity !== undefined)
        store.setOpacity(data.style.opacity);
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
    this.isContentDirty = true;
  }

  public zoomTo(targetZoom: number): void {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    const cx = w / 2;
    const cy = h / 2;
    const newZoom = Math.min(Math.max(targetZoom, 0.1), 5.0);
    this.viewport.pan.x =
      cx - (cx - this.viewport.pan.x) * (newZoom / this.viewport.zoom);
    this.viewport.pan.y =
      cy - (cy - this.viewport.pan.y) * (newZoom / this.viewport.zoom);
    this.viewport.zoom = newZoom;
    useCanvasStore.getState().setZoom(newZoom);
    useCanvasStore.getState().setPan({ ...this.viewport.pan });
    this.broadcastViewport();
    this.isContentDirty = true;
  }

  public setViewport(pan: { x: number; y: number }, zoom: number): void {
    this.viewport.pan = { ...pan };
    this.viewport.zoom = zoom;
    useCanvasStore.getState().setZoom(zoom);
    useCanvasStore.getState().setPan({ ...pan });
    this.broadcastViewport();
    this.isContentDirty = true;
  }

  public undo(): void {
    this.undoManager.undo();
    this.isContentDirty = true;
  }

  public redo(): void {
    this.undoManager.redo();
    this.isContentDirty = true;
  }

  public canUndo(): boolean {
    return this.undoManager.canUndo();
  }

  public canRedo(): boolean {
    return this.undoManager.canRedo();
  }

  public onUndoStackChange(
    listener: (status: { canUndo: boolean; canRedo: boolean }) => void,
  ): () => void {
    return this.undoManager.onStackChange(listener);
  }

  public broadcastViewport(): void {
    setLocalViewportAwareness(this.provider.awareness, {
      pan: this.viewport.pan,
      zoom: this.viewport.zoom,
    });
  }

  public updateSelectedStyle(styleUpdates: Partial<ElementStyle>): void {
    if (this.role === Role.VIEWER) return;
    const { selectedIds } = useCanvasStore.getState();
    this.repository.updateStyleForIds(selectedIds, styleUpdates);
    this.isContentDirty = true;
  }

  public updateSelectedText(text: string): void {
    if (this.role === Role.VIEWER) return;
    const { selectedIds } = useCanvasStore.getState();
    this.repository.updateTextForIds(selectedIds, text);
    this.isContentDirty = true;
  }

  public selectAll(): void {
    const allIds = this.repository.getAllElementIds();
    const expanded = this.repository.expandSelectionGroups(allIds);
    useCanvasStore.getState().setSelectedIds(expanded);
    this.syncStoreWithSelection(expanded);
    this.isContentDirty = true;
  }

  public nudgeSelected(dx: number, dy: number): void {
    if (this.role === Role.VIEWER) return;
    const { selectedIds } = useCanvasStore.getState();
    this.repository.nudgeElements(selectedIds, dx, dy);
    this.isContentDirty = true;
  }

  public getAllElements(): ElementData[] {
    return this.repository.getAllElements();
  }

  public deleteSelected(): void {
    if (this.role === Role.VIEWER) return;
    const store = useCanvasStore.getState();
    this.repository.deleteByIds(store.selectedIds);
    store.setSelectedIds([]);
    this.isContentDirty = true;
  }

  public duplicateSelected(): void {
    if (this.role === Role.VIEWER) return;
    const store = useCanvasStore.getState();
    const newSelectedIds = this.repository.duplicateByIds(
      store.selectedIds,
      this.userId,
    );
    if (newSelectedIds.length > 0) {
      store.setSelectedIds(newSelectedIds);
      this.syncStoreWithSelection(newSelectedIds);
    }
    this.isContentDirty = true;
  }

  public bringSelectedToFront(): void {
    if (this.role === Role.VIEWER) return;
    const { selectedIds } = useCanvasStore.getState();
    this.repository.bringToFront(selectedIds);
    this.isContentDirty = true;
  }

  public sendSelectedToBack(): void {
    if (this.role === Role.VIEWER) return;
    const { selectedIds } = useCanvasStore.getState();
    this.repository.sendToBack(selectedIds);
    this.isContentDirty = true;
  }

  public groupSelected(): void {
    if (this.role === Role.VIEWER) return;
    const { selectedIds } = useCanvasStore.getState();
    const groupId = this.repository.groupElements(selectedIds);
    if (groupId) {
      this.isContentDirty = true;
    }
  }

  public ungroupSelected(): void {
    if (this.role === Role.VIEWER) return;
    const { selectedIds } = useCanvasStore.getState();
    this.repository.ungroupElements(selectedIds);
    this.isContentDirty = true;
  }

  public lockSelected(): void {
    if (this.role === Role.VIEWER) return;
    const { selectedIds } = useCanvasStore.getState();
    this.repository.lockElements(selectedIds);
    this.isContentDirty = true;
  }

  public unlockSelected(): void {
    if (this.role === Role.VIEWER) return;
    const { selectedIds } = useCanvasStore.getState();
    this.repository.unlockElements(selectedIds);
    this.isContentDirty = true;
  }

  public toggleLockSelected(): void {
    if (this.role === Role.VIEWER) return;
    const { selectedIds } = useCanvasStore.getState();
    this.repository.toggleLockElements(selectedIds);
    this.isContentDirty = true;
  }

  public expandSelectionGroups(ids: readonly string[]): string[] {
    return this.repository.expandSelectionGroups(ids);
  }

  setGuides(guides: { vertical?: number[]; horizontal?: number[] } | null): void {
    this.guides = guides;
    this.isContentDirty = true;
  }

  getGuides(): { vertical?: number[]; horizontal?: number[] } | null {
    return this.guides;
  }

  setSnapIndicator(indicator: { active: Point | null; candidates: Point[] } | null): void {
    this.snapIndicator = indicator;
  }

  getSnapIndicator(): { active: Point | null; candidates: Point[] } | null {
    return this.snapIndicator;
  }

  getElementById(id: string): ElementData | null {
    return this.repository.getById(id);
  }

  getOtherElements(excludeIds: readonly string[]): ElementData[] {
    const excludeSet = new Set(excludeIds);
    const elementsMap = this.repository.getElementsMap();
    const result: ElementData[] = [];
    elementsMap.forEach((map, id) => {
      if (excludeSet.has(id)) return;
      const el = YjsElementAdapter.toElementData(map);
      if (el) result.push(el);
    });
    return result;
  }

  public alignSelected(alignment: AlignmentType): void {
    if (this.role === Role.VIEWER) return;
    const { selectedIds } = useCanvasStore.getState();
    this.repository.alignElements(selectedIds, alignment);
    this.isContentDirty = true;
  }

  public distributeSelected(direction: DistributionType): void {
    if (this.role === Role.VIEWER) return;
    const { selectedIds } = useCanvasStore.getState();
    this.repository.distributeElements(selectedIds, direction);
    this.isContentDirty = true;
  }

  syncConnectedArrows(movedIds: readonly string[]): void {
    this.repository.syncConnectedArrows(movedIds);
    this.isContentDirty = true;
  }

  public async insertImage(
    file: File,
    targetWorldPt?: Point,
  ): Promise<string | null> {
    if (this.role === Role.VIEWER) return null;
    if (!file.type.startsWith("image/") && !file.name.endsWith(".svg")) {
      return null;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const dimensions = await loadImageDimensions(dataUrl);

      const center =
        targetWorldPt ??
        this.viewport.screenToWorld({
          x: this.container.clientWidth / 2,
          y: this.container.clientHeight / 2,
        });

      const placement = calculateImagePlacement(dimensions, center);
      const id = nanoid(10);
      const z = this.getNextZIndex();

      const element: ElementData = {
        id,
        type: ElementType.IMAGE,
        x: placement.x,
        y: placement.y,
        w: placement.w,
        h: placement.h,
        rotation: 0,
        z,
        style: {
          fill: "transparent",
          stroke: "transparent",
          strokeWidth: 0,
          opacity: 1,
        },
        src: dataUrl,
        createdBy: this.userId,
      };

      this.commitElement(element);
      useCanvasStore.getState().setSelectedIds([id]);
      this.syncStoreWithSelection([id]);
      this.isContentDirty = true;
      return id;
    } catch {
      return null;
    }
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener("resize", this.handleResize);
    this.inputController.destroy();
    this.keyboardController.destroy();
    if (this.storeUnsub) {
      this.storeUnsub();
      this.storeUnsub = null;
    }
    if (this.repoUnsub) {
      this.repoUnsub();
      this.repoUnsub = null;
    }
    if (this.providerUnsub) {
      this.providerUnsub();
      this.providerUnsub = null;
    }
    this.events.clear();
    this.tools.forEach((tool) => tool.onDeactivate?.());
    this.undoManager.destroy();
    if (typeof window !== "undefined") {
      delete (window as unknown as { __CANVAS_ENGINE__?: CanvasEngine }).__CANVAS_ENGINE__;
    }
  }
}
