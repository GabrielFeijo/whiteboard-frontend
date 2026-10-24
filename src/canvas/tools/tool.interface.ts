import * as Y from "yjs";
import { nanoid } from "nanoid";
import { ElementData, ElementType, Role } from "../../shared";
import { Point, Viewport } from "../viewport";
import { SpatialIndex } from "../spatial-index";
import { LocalUndoManager } from "../../collab/undo-manager";
import { CanvasEventEmitter } from "../canvas-events";
import { SpacingGuide } from "../alignment-helper";
import { CanvasToolType, useCanvasStore } from "../../store/canvas-store";

export interface ToolContext {
  worldPt: Point;
  screenPt: Point;
  event: PointerEvent;
  isPointerDown: boolean;
}

export interface CanvasHost {
  readonly doc: Y.Doc;
  readonly viewport: Viewport;
  readonly spatialIndex: SpatialIndex;
  readonly undoManager: LocalUndoManager;
  readonly userId: string;
  readonly role: Role;
  readonly events: CanvasEventEmitter;
  setDirty(): void;
  getNextZIndex(): string;
  hitTest(worldPt: Point): string | null;
  getSelectedElements(): ElementData[];
  syncStoreWithSelection(selectedIds: string[]): void;
  setSelectBox(box: { x: number; y: number; w: number; h: number } | null): void;
  getSelectBox(): { x: number; y: number; w: number; h: number } | null;
  setFreehandDraft(draft: number[]): void;
  getFreehandDraft(): number[];
  setShapeDraft(
    draft: { type: ElementData["type"]; x: number; y: number; w: number; h: number } | null,
  ): void;
  getShapeDraft(): { type: ElementData["type"]; x: number; y: number; w: number; h: number } | null;
  commitElement(data: ElementData): void;
  expandSelectionGroups(ids: readonly string[]): string[];
  setGuides(
    guides: {
      vertical?: number[];
      horizontal?: number[];
      spacing?: SpacingGuide[];
    } | null,
  ): void;
  getGuides(): {
    vertical?: number[];
    horizontal?: number[];
    spacing?: SpacingGuide[];
  } | null;
  getOtherElements(excludeIds: readonly string[]): ElementData[];
  syncConnectedArrows(movedIds: readonly string[]): void;
  setSnapIndicator(indicator: { active: Point | null; candidates: Point[] } | null): void;
  getSnapIndicator(): { active: Point | null; candidates: Point[] } | null;
  getElementById(id: string): ElementData | null;
  deleteElements?(ids: readonly string[]): void;
  onViewportMutated?(): void;
}

export interface CanvasTool {
  readonly id: string;
  onPointerDown(ctx: ToolContext): void;
  onPointerMove(ctx: ToolContext): void;
  onPointerUp(ctx: ToolContext): void;
  onPointerHover?(ctx: ToolContext): void;
  getCursor(ctx: ToolContext): string;
  onDeactivate?(): void;
}

export interface SpawnEditableElementOptions {
  type: typeof ElementType.TEXT | typeof ElementType.STICKY;
  x: number;
  y: number;
  w: number;
  h: number;
  style: ElementData["style"];
}

export function spawnEditableTextElement(
  host: CanvasHost,
  options: SpawnEditableElementOptions,
): void {
  if (host.role === Role.VIEWER) return;

  const id = nanoid(10);
  const z = host.getNextZIndex();
  const store = useCanvasStore.getState();

  const element: ElementData = {
    id,
    type: options.type,
    x: Math.round(options.x),
    y: Math.round(options.y),
    w: options.w,
    h: options.h,
    rotation: 0,
    z,
    text: "",
    style: options.style,
    createdBy: host.userId,
  };

  host.commitElement(element);
  store.setSelectedIds([id]);
  host.syncStoreWithSelection([id]);
  store.setActiveTool(CanvasToolType.SELECT);
  host.events.emit("focusTextInput", { elementId: id });
  host.setDirty();
}
