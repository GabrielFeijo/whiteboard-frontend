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
import { YjsElementRepository } from "@/canvas/repositories/yjs-element-repository";
import {
  CanvasInputController,
  InputControllerHost,
} from "@/canvas/controllers/canvas-input-controller";
import {
  CanvasKeyboardController,
  KeyboardControllerTarget,
} from "@/canvas/controllers/canvas-keyboard-controller";
import {
  AlignmentType,
  computeElementsBounds,
  DistributionType,
  SpacingGuide,
} from "@/canvas/alignment-helper";
import { CanvasAssetService } from "@/canvas/services/canvas-asset.service";
import { CanvasClipboardService } from "@/canvas/services/canvas-clipboard.service";

export type ElementStyle = ElementData["style"];

export class CanvasEngine
  implements CanvasHost, InputControllerHost, KeyboardControllerTarget
{
  readonly viewport = new Viewport();
  readonly spatialIndex = new SpatialIndex();
  readonly undoManager: LocalUndoManager;
  readonly events = new CanvasEventEmitter();
  private readonly repository: YjsElementRepository;
  private readonly clipboard = new CanvasClipboardService();

  private bgCtx: CanvasRenderingContext2D;
  private contentCtx: CanvasRenderingContext2D;
  private overlayCtx: CanvasRenderingContext2D;

  private isContentDirty = true;
  private isBackgroundDirty = true;
  private isOverlayDirty = true;
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
  private guides: {
    vertical?: number[];
    horizontal?: number[];
    spacing?: SpacingGuide[];
  } | null = null;
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
    this.isOverlayDirty = true;
  }

  setBackgroundDirty(): void {
    this.isBackgroundDirty = true;
  }

  setSelectBox(box: { x: number; y: number; w: number; h: number } | null): void {
    this.selectBox = box;
    this.isOverlayDirty = true;
  }

  getSelectBox(): { x: number; y: number; w: number; h: number } | null {
    return this.selectBox;
  }

  setFreehandDraft(draft: number[]): void {
    this.freehandDraft = draft;
    this.isOverlayDirty = true;
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
    this.isOverlayDirty = true;
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
    this.isOverlayDirty = true;
  }

  private selectAndSync(ids: string[]): void {
    useCanvasStore.getState().setSelectedIds(ids);
    this.syncStoreWithSelection(ids);
    this.setDirty();
  }

  private mutateSelected(fn: (selectedIds: string[]) => void): void {
    if (this.role === Role.VIEWER) return;
    const { selectedIds } = useCanvasStore.getState();
    if (selectedIds.length === 0) return;
    fn(selectedIds);
    this.setDirty();
  }

  private syncViewportStore(): void {
    const store = useCanvasStore.getState();
    store.setZoom(this.viewport.zoom);
    store.setPan({ ...this.viewport.pan });
    this.onViewportMutated();
  }

  onDoubleClickAtWorld(worldPt: Point): void {
    if (this.role === Role.VIEWER) return;
    const hitId = this.hitTest(worldPt);
    if (!hitId) return;

    const el = this.repository.getById(hitId);
    if (!el || el.locked) return;

    const canEditText =
      el.type === ElementType.STICKY ||
      el.type === ElementType.TEXT ||
      el.type === ElementType.RECT ||
      el.type === ElementType.ELLIPSE ||
      el.type === ElementType.DIAMOND;

    if (canEditText) {
      this.selectAndSync([hitId]);
      this.events.emit("focusTextInput", { elementId: hitId });
    }
  }

  onDropFile(file: File, worldPt: Point): void {
    void this.insertImage(file, worldPt);
  }

  pasteImage(file: File): void {
    void this.insertImage(file);
  }

  private handleAwarenessChange = (): void => {
    this.isOverlayDirty = true;
  };

  private setupListeners(): void {
    this.repoUnsub = this.repository.observeChanges(() => {
      this.isContentDirty = true;
      this.isOverlayDirty = true;
    });

    this.providerUnsub = this.provider.onStatusChange((status) => {
      if (status === "synced") {
        this.repository.indexAllElements();
        this.isBackgroundDirty = true;
        this.isContentDirty = true;
        this.isOverlayDirty = true;
      }
    });

    this.provider.awareness.on("change", this.handleAwarenessChange);

    window.addEventListener("resize", this.handleResize);

    this.storeUnsub = useCanvasStore.subscribe((state, prevState) => {
      if (
        state.activeTool !== prevState.activeTool ||
        state.selectedIds !== prevState.selectedIds
      ) {
        this.inputController.refreshHoverCursor();
        this.isContentDirty = true;
        this.isOverlayDirty = true;
      }
    });
  }

  private handleResize = (): void => {
    this.resizeCanvases();
    this.isBackgroundDirty = true;
    this.isContentDirty = true;
    this.isOverlayDirty = true;
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
        this.isOverlayDirty = true;
      }

      if (this.isOverlayDirty) {
        this.renderOverlay();
        this.isOverlayDirty = false;
      }

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
    this.viewport.reset();
    this.syncViewportStore();
  }

  public zoomTo(targetZoom: number): void {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    this.viewport.zoomToPoint(targetZoom, { x: w / 2, y: h / 2 });
    this.syncViewportStore();
  }

  public fitToContent(): void {
    const elements = this.repository.getAllElements();
    if (elements.length === 0) {
      this.resetViewport();
      return;
    }
    const bounds = computeElementsBounds(elements);
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 600;
    this.viewport.fitToBounds(bounds, w, h, 80);
    this.syncViewportStore();
  }

  public setViewport(pan: { x: number; y: number }, zoom: number): void {
    this.viewport.pan = { ...pan };
    this.viewport.zoom = zoom;
    this.syncViewportStore();
  }

  public undo(): void {
    this.undoManager.undo();
    this.setDirty();
  }

  public redo(): void {
    this.undoManager.redo();
    this.setDirty();
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
    this.mutateSelected((ids) =>
      this.repository.updateStyleForIds(ids, styleUpdates),
    );
  }

  public updateSelectedText(text: string): void {
    this.mutateSelected((ids) => this.repository.updateTextForIds(ids, text));
  }

  public selectAll(): void {
    const allIds = this.repository.getAllElementIds();
    const expanded = this.repository.expandSelectionGroups(allIds);
    this.selectAndSync(expanded);
  }

  public nudgeSelected(dx: number, dy: number): void {
    this.mutateSelected((ids) => this.repository.nudgeElements(ids, dx, dy));
  }

  public getAllElements(): ElementData[] {
    return this.repository.getAllElements();
  }

  public deleteElements(ids: readonly string[]): void {
    if (this.role === Role.VIEWER) return;
    this.repository.deleteByIds(ids);
    this.setDirty();
  }

  public deleteSelected(): void {
    this.mutateSelected((ids) => {
      this.repository.deleteByIds(ids);
      useCanvasStore.getState().setSelectedIds([]);
    });
  }

  public duplicateSelected(): void {
    this.mutateSelected((ids) => {
      const newSelectedIds = this.repository.duplicateByIds(ids, this.userId);
      if (newSelectedIds.length > 0) {
        this.selectAndSync(newSelectedIds);
      }
    });
  }

  public bringSelectedToFront(): void {
    this.mutateSelected((ids) => this.repository.bringToFront(ids));
  }

  public sendSelectedToBack(): void {
    this.mutateSelected((ids) => this.repository.sendToBack(ids));
  }

  public bringSelectedForward(): void {
    this.mutateSelected((ids) => this.repository.bringForward(ids));
  }

  public sendSelectedBackward(): void {
    this.mutateSelected((ids) => this.repository.sendBackward(ids));
  }

  public updateSelectedRotation(rotation: number): void {
    this.mutateSelected((ids) =>
      this.repository.updateRotationForIds(ids, rotation),
    );
  }

  public copySelected(): void {
    const selected = this.getSelectedElements();
    this.clipboard.copy(selected);
  }

  public cutSelected(): void {
    if (this.role === Role.VIEWER) return;
    const selected = this.getSelectedElements();
    if (selected.length === 0) return;
    this.clipboard.copy(selected);
    this.deleteSelected();
  }

  public hasCopiedElements(): boolean {
    return this.clipboard.hasCopiedElements();
  }

  public pasteCopiedElements(targetWorldPt?: Point): boolean {
    if (this.role === Role.VIEWER || !this.clipboard.hasCopiedElements()) {
      return false;
    }
    const newIds = this.clipboard.pasteIntoRepository(
      this.repository,
      this.userId,
      targetWorldPt,
    );
    if (newIds.length > 0) {
      this.selectAndSync(newIds);
      return true;
    }
    return false;
  }

  public pasteText(text: string, targetWorldPt?: Point): void {
    if (this.role === Role.VIEWER || !text.trim()) return;
    const center =
      targetWorldPt ??
      this.viewport.screenToWorld({
        x: this.container.clientWidth / 2,
        y: this.container.clientHeight / 2,
      });
    const sticky = CanvasClipboardService.createStickyFromText(
      text,
      center,
      this.getNextZIndex(),
      this.userId,
    );
    this.commitElement(sticky);
    this.selectAndSync([sticky.id]);
  }

  public openShortcutsHelp(): void {
    this.events.emit("openShortcutsHelp", {});
  }

  public reindexElements(): void {
    this.repository.indexAllElements();
    this.isBackgroundDirty = true;
    this.setDirty();
  }

  public observeChanges(onDirty: () => void): () => void {
    return this.repository.observeChanges(onDirty);
  }

  public groupSelected(): void {
    this.mutateSelected((ids) => {
      this.repository.groupElements(ids);
    });
  }

  public ungroupSelected(): void {
    this.mutateSelected((ids) => this.repository.ungroupElements(ids));
  }

  public lockSelected(): void {
    this.mutateSelected((ids) => this.repository.lockElements(ids));
  }

  public unlockSelected(): void {
    this.mutateSelected((ids) => this.repository.unlockElements(ids));
  }

  public toggleLockSelected(): void {
    this.mutateSelected((ids) => this.repository.toggleLockElements(ids));
  }

  public expandSelectionGroups(ids: readonly string[]): string[] {
    return this.repository.expandSelectionGroups(ids);
  }

  setGuides(
    guides: {
      vertical?: number[];
      horizontal?: number[];
      spacing?: SpacingGuide[];
    } | null,
  ): void {
    this.guides = guides;
    this.isContentDirty = true;
    this.isOverlayDirty = true;
  }

  getGuides(): {
    vertical?: number[];
    horizontal?: number[];
    spacing?: SpacingGuide[];
  } | null {
    return this.guides;
  }

  setSnapIndicator(indicator: { active: Point | null; candidates: Point[] } | null): void {
    this.snapIndicator = indicator;
    this.isOverlayDirty = true;
  }

  getSnapIndicator(): { active: Point | null; candidates: Point[] } | null {
    return this.snapIndicator;
  }

  getElementById(id: string): ElementData | null {
    return this.repository.getById(id);
  }

  getOtherElements(excludeIds: readonly string[]): ElementData[] {
    const excludeSet = new Set(excludeIds);
    return this.repository
      .getAllElements()
      .filter((el) => !excludeSet.has(el.id));
  }

  public alignSelected(alignment: AlignmentType): void {
    this.mutateSelected((ids) => this.repository.alignElements(ids, alignment));
  }

  public distributeSelected(direction: DistributionType): void {
    this.mutateSelected((ids) =>
      this.repository.distributeElements(ids, direction),
    );
  }

  public standardizeSpacingSelected(
    direction: "horizontal" | "vertical",
    customGap?: number,
  ): void {
    this.mutateSelected((ids) =>
      this.repository.standardizeSpacing(ids, direction, customGap),
    );
  }

  syncConnectedArrows(movedIds: readonly string[]): void {
    this.repository.syncConnectedArrows(movedIds);
    this.setDirty();
  }

  public async insertImage(
    file: File,
    targetWorldPt?: Point,
  ): Promise<string | null> {
    if (this.role === Role.VIEWER) return null;

    const targetCenter =
      targetWorldPt ??
      this.viewport.screenToWorld({
        x: this.container.clientWidth / 2,
        y: this.container.clientHeight / 2,
      });

    const element = await CanvasAssetService.prepareImageElement({
      file,
      boardId: this.provider.boardId,
      userId: this.userId,
      targetCenter,
      z: this.getNextZIndex(),
    });

    if (!element) return null;

    this.commitElement(element);
    this.selectAndSync([element.id]);
    return element.id;
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener("resize", this.handleResize);
    this.provider.awareness.off("change", this.handleAwarenessChange);
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
