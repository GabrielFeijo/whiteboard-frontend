import * as Y from "yjs";
import { ElementData, Role } from "../../shared";
import { Point, Viewport } from "../viewport";
import { SpatialIndex } from "../spatial-index";
import { LocalUndoManager } from "../../collab/undo-manager";
import { CanvasEventEmitter } from "../canvas-events";

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
  setGuides(guides: { vertical?: number[]; horizontal?: number[] } | null): void;
  getGuides(): { vertical?: number[]; horizontal?: number[] } | null;
  getOtherElements(excludeIds: readonly string[]): ElementData[];
  syncConnectedArrows(movedIds: readonly string[]): void;
  setSnapIndicator(indicator: { active: Point | null; candidates: Point[] } | null): void;
  getSnapIndicator(): { active: Point | null; candidates: Point[] } | null;
  getElementById(id: string): ElementData | null;
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
