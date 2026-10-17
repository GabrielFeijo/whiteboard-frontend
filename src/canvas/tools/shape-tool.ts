import { nanoid } from "nanoid";
import { CanvasHost, CanvasTool, ToolContext } from "./tool.interface";
import { ArrowBinding, ElementData } from "../../shared";
import { useCanvasStore } from "../../store/canvas-store";
import { findNearestAnchor, getNearbyAnchorPoints } from "@/canvas/connector-helper";

export class ShapeTool implements CanvasTool {
  private startPoint = { x: 0, y: 0 };
  private isDrawing = false;
  private startBinding: ArrowBinding | undefined = undefined;
  private endBinding: ArrowBinding | undefined = undefined;

  constructor(
    readonly id: "rect" | "ellipse" | "diamond" | "line" | "arrow",
    private readonly host: CanvasHost,
  ) {}

  onPointerHover(ctx: ToolContext): void {
    if (this.host.role === "VIEWER") return;
    if (this.id === "arrow" || this.id === "line") {
      const others = this.host.getOtherElements([]);
      const match = findNearestAnchor(ctx.worldPt, others, 36);
      const candidates = getNearbyAnchorPoints(ctx.worldPt, others, 140);
      this.host.setSnapIndicator({
        active: match?.pt ?? null,
        candidates,
      });
    } else {
      this.host.setSnapIndicator(null);
    }
  }

  onPointerDown(ctx: ToolContext): void {
    if (this.host.role === "VIEWER") return;

    if (this.id === "arrow" || this.id === "line") {
      const others = this.host.getOtherElements([]);
      const match = findNearestAnchor(ctx.worldPt, others, 36);
      if (match) {
        this.startPoint = { ...match.pt };
        this.startBinding = {
          elementId: match.elementId,
          anchor: match.anchor,
        };
      } else {
        this.startPoint = { ...ctx.worldPt };
        this.startBinding = undefined;
      }
      const candidates = getNearbyAnchorPoints(ctx.worldPt, others, 140);
      this.host.setSnapIndicator({
        active: match?.pt ?? null,
        candidates,
      });
    } else {
      this.startPoint = { ...ctx.worldPt };
      this.startBinding = undefined;
    }

    this.endBinding = undefined;
    this.isDrawing = true;
    this.host.setShapeDraft({
      type: this.id,
      x: this.startPoint.x,
      y: this.startPoint.y,
      w: 0,
      h: 0,
    });
  }

  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isPointerDown || !this.isDrawing) return;

    let targetPt = { ...ctx.worldPt };

    if (this.id === "arrow" || this.id === "line") {
      const excludeIds = this.startBinding ? [this.startBinding.elementId] : [];
      const others = this.host.getOtherElements(excludeIds);
      const match = findNearestAnchor(ctx.worldPt, others, 36);
      if (match) {
        targetPt = { ...match.pt };
        this.endBinding = {
          elementId: match.elementId,
          anchor: match.anchor,
        };
      } else {
        this.endBinding = undefined;
      }
      const candidates = getNearbyAnchorPoints(ctx.worldPt, others, 140);
      this.host.setSnapIndicator({
        active: match?.pt ?? null,
        candidates,
      });

      if (ctx.event.shiftKey) {
        const dx = targetPt.x - this.startPoint.x;
        const dy = targetPt.y - this.startPoint.y;
        const angle = Math.atan2(dy, dx);
        const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        const dist = Math.hypot(dx, dy);
        targetPt = {
          x: this.startPoint.x + dist * Math.cos(snapAngle),
          y: this.startPoint.y + dist * Math.sin(snapAngle),
        };
      }
    }

    const w = targetPt.x - this.startPoint.x;
    const h = targetPt.y - this.startPoint.y;

    if (this.id === "line" || this.id === "arrow") {
      this.host.setShapeDraft({
        type: this.id,
        x: this.startPoint.x,
        y: this.startPoint.y,
        w,
        h,
      });
    } else {
      let finalW = Math.abs(w);
      let finalH = Math.abs(h);
      let posX = Math.min(this.startPoint.x, targetPt.x);
      let posY = Math.min(this.startPoint.y, targetPt.y);

      if (ctx.event.shiftKey) {
        const side = Math.max(finalW, finalH);
        finalW = side;
        finalH = side;
        posX =
          targetPt.x < this.startPoint.x
            ? this.startPoint.x - side
            : this.startPoint.x;
        posY =
          targetPt.y < this.startPoint.y
            ? this.startPoint.y - side
            : this.startPoint.y;
      }

      this.host.setShapeDraft({
        type: this.id,
        x: posX,
        y: posY,
        w: finalW,
        h: finalH,
      });
    }

    this.host.setDirty();
  }

  onPointerUp(ctx: ToolContext): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.host.setShapeDraft(null);

    const store = useCanvasStore.getState();

    let targetPt = { ...ctx.worldPt };
    if (this.id === "arrow" || this.id === "line") {
      const excludeIds = this.startBinding ? [this.startBinding.elementId] : [];
      const others = this.host.getOtherElements(excludeIds);
      const match = findNearestAnchor(ctx.worldPt, others, 36);
      if (match) {
        targetPt = { ...match.pt };
        this.endBinding = {
          elementId: match.elementId,
          anchor: match.anchor,
        };
      }

      if (ctx.event.shiftKey) {
        const dx = targetPt.x - this.startPoint.x;
        const dy = targetPt.y - this.startPoint.y;
        const angle = Math.atan2(dy, dx);
        const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
        const dist = Math.hypot(dx, dy);
        targetPt = {
          x: this.startPoint.x + dist * Math.cos(snapAngle),
          y: this.startPoint.y + dist * Math.sin(snapAngle),
        };
      }
    }

    this.host.setSnapIndicator(null);

    const w = targetPt.x - this.startPoint.x;
    const h = targetPt.y - this.startPoint.y;

    if (Math.abs(w) > 5 || Math.abs(h) > 5) {
      const id = nanoid(10);
      const z = this.host.getNextZIndex();

      let posX = Math.min(this.startPoint.x, targetPt.x);
      let posY = Math.min(this.startPoint.y, targetPt.y);
      let width = Math.max(1, Math.abs(w));
      let height = Math.max(1, Math.abs(h));

      if (ctx.event.shiftKey && this.id !== "line" && this.id !== "arrow") {
        const side = Math.max(width, height);
        width = side;
        height = side;
        posX =
          targetPt.x < this.startPoint.x
            ? this.startPoint.x - side
            : this.startPoint.x;
        posY =
          targetPt.y < this.startPoint.y
            ? this.startPoint.y - side
            : this.startPoint.y;
      }

      const points =
        this.id === "line" || this.id === "arrow"
          ? [this.startPoint.x, this.startPoint.y, targetPt.x, targetPt.y]
          : undefined;

      const element: ElementData = {
        id,
        type: this.id,
        x: Math.round(posX),
        y: Math.round(posY),
        w: Math.round(width),
        h: Math.round(height),
        rotation: 0,
        z,
        points,
        style: {
          fill: store.fillColor,
          stroke: store.strokeColor,
          strokeWidth: store.strokeWidth,
          opacity: store.opacity,
        },
        createdBy: this.host.userId,
        startBinding: this.startBinding,
        endBinding: this.endBinding,
      };

      this.host.commitElement(element);
      store.setSelectedIds([id]);
      this.host.syncStoreWithSelection([id]);
      store.setActiveTool("select");
    }

    this.startBinding = undefined;
    this.endBinding = undefined;
    this.host.setDirty();
  }

  getCursor(_ctx: ToolContext): string {
    return "crosshair";
  }

  onDeactivate(): void {
    this.isDrawing = false;
    this.startBinding = undefined;
    this.endBinding = undefined;
    this.host.setShapeDraft(null);
    this.host.setSnapIndicator(null);
  }
}
