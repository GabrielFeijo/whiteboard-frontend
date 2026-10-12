import { nanoid } from "nanoid";
import { CanvasHost, CanvasTool, ToolContext } from "./tool.interface";
import { ElementData } from "../../shared";
import { useCanvasStore } from "../../store/canvas-store";

export class ShapeTool implements CanvasTool {
  private startPoint = { x: 0, y: 0 };
  private isDrawing = false;

  constructor(
    readonly id: "rect" | "ellipse" | "diamond" | "line" | "arrow",
    private readonly host: CanvasHost,
  ) {}

  onPointerDown(ctx: ToolContext): void {
    if (this.host.role === "VIEWER") return;
    this.startPoint = { ...ctx.worldPt };
    this.isDrawing = true;
    this.host.setShapeDraft({
      type: this.id,
      x: ctx.worldPt.x,
      y: ctx.worldPt.y,
      w: 0,
      h: 0,
    });
  }

  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isPointerDown || !this.isDrawing) return;

    const w = ctx.worldPt.x - this.startPoint.x;
    const h = ctx.worldPt.y - this.startPoint.y;

    if (this.id === "line" || this.id === "arrow") {
      this.host.setShapeDraft({
        type: this.id,
        x: this.startPoint.x,
        y: this.startPoint.y,
        w,
        h,
      });
    } else {
      this.host.setShapeDraft({
        type: this.id,
        x: Math.min(this.startPoint.x, ctx.worldPt.x),
        y: Math.min(this.startPoint.y, ctx.worldPt.y),
        w: Math.abs(w),
        h: Math.abs(h),
      });
    }

    this.host.setDirty();
  }

  onPointerUp(ctx: ToolContext): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.host.setShapeDraft(null);

    const store = useCanvasStore.getState();
    const w = ctx.worldPt.x - this.startPoint.x;
    const h = ctx.worldPt.y - this.startPoint.y;

    if (Math.abs(w) > 5 || Math.abs(h) > 5) {
      const id = nanoid(10);
      const z = this.host.getNextZIndex();

      let posX = Math.min(this.startPoint.x, ctx.worldPt.x);
      let posY = Math.min(this.startPoint.y, ctx.worldPt.y);
      let width = Math.abs(w);
      let height = Math.abs(h);

      if (this.id === "line" || this.id === "arrow") {
        posX = this.startPoint.x;
        posY = this.startPoint.y;
        width = w;
        height = h;
      }

      const element: ElementData = {
        id,
        type: this.id,
        x: Math.round(posX),
        y: Math.round(posY),
        w: Math.round(width),
        h: Math.round(height),
        rotation: 0,
        z,
        style: {
          fill: store.fillColor,
          stroke: store.strokeColor,
          strokeWidth: store.strokeWidth,
          opacity: store.opacity,
        },
        createdBy: this.host.userId,
      };

      this.host.commitElement(element);
      store.setSelectedIds([id]);
      this.host.syncStoreWithSelection([id]);
      store.setActiveTool("select");
    }

    this.host.setDirty();
  }

  getCursor(_ctx: ToolContext): string {
    return "crosshair";
  }

  onDeactivate(): void {
    this.isDrawing = false;
    this.host.setShapeDraft(null);
  }
}
