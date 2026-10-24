import { nanoid } from "nanoid";
import { CanvasHost, CanvasTool, ToolContext } from "./tool.interface";
import { ElementData, ElementType, Role } from "../../shared";
import { CanvasToolType, useCanvasStore } from "../../store/canvas-store";

export class FreehandTool implements CanvasTool {
  readonly id = CanvasToolType.FREEHAND;
  private isDrawing = false;

  constructor(private readonly host: CanvasHost) {}

  onPointerDown(ctx: ToolContext): void {
    if (this.host.role === Role.VIEWER) return;
    this.isDrawing = true;
    const initialDraft = [ctx.worldPt.x, ctx.worldPt.y, ctx.event.pressure || 0.5];
    this.host.setFreehandDraft(initialDraft);
    this.host.setDirty();
  }

  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isPointerDown || !this.isDrawing) return;

    const draft = this.host.getFreehandDraft();
    draft.push(ctx.worldPt.x, ctx.worldPt.y, ctx.event.pressure || 0.5);
    this.host.setFreehandDraft(draft);
    this.host.setDirty();
  }

  onPointerUp(_ctx: ToolContext): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    const draft = this.host.getFreehandDraft();
    if (draft.length < 6) {
      this.host.setFreehandDraft([]);
      this.host.setDirty();
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < draft.length; i += 3) {
      const px = draft[i];
      const py = draft[i + 1];
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }

    const w = Math.max(10, maxX - minX);
    const h = Math.max(10, maxY - minY);
    const store = useCanvasStore.getState();
    const id = nanoid(10);
    const z = this.host.getNextZIndex();

    const element: ElementData = {
      id,
      type: ElementType.FREEHAND,
      x: Math.round(minX),
      y: Math.round(minY),
      w: Math.round(w),
      h: Math.round(h),
      rotation: 0,
      z,
      style: {
        fill: "transparent",
        stroke: store.strokeColor,
        strokeWidth: store.strokeWidth,
        opacity: store.opacity,
      },
      points: draft,
      createdBy: this.host.userId,
    };

    this.host.commitElement(element);
    this.host.setFreehandDraft([]);
    this.host.setDirty();
  }

  getCursor(_ctx: ToolContext): string {
    return "crosshair";
  }

  onDeactivate(): void {
    this.isDrawing = false;
    this.host.setFreehandDraft([]);
  }
}
