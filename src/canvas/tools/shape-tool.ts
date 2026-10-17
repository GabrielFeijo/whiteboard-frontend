import { nanoid } from "nanoid";
import { CanvasHost, CanvasTool, ToolContext } from "./tool.interface";
import { ArrowBinding, ElementData, ElementType, Role } from "../../shared";
import { CanvasToolType, useCanvasStore } from "../../store/canvas-store";
import { findNearestAnchor, getNearbyAnchorPoints } from "@/canvas/connector-helper";

function snapAnglePoint(
  origin: { x: number; y: number },
  target: { x: number; y: number },
): { x: number; y: number } {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const angle = Math.atan2(dy, dx);
  const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  const dist = Math.hypot(dx, dy);
  return {
    x: origin.x + dist * Math.cos(snapAngle),
    y: origin.y + dist * Math.sin(snapAngle),
  };
}

function computeBoxBounds(
  startPt: { x: number; y: number },
  targetPt: { x: number; y: number },
  isSquare: boolean,
): { x: number; y: number; w: number; h: number } {
  const rawW = Math.abs(targetPt.x - startPt.x);
  const rawH = Math.abs(targetPt.y - startPt.y);

  if (!isSquare) {
    return {
      x: Math.min(startPt.x, targetPt.x),
      y: Math.min(startPt.y, targetPt.y),
      w: rawW,
      h: rawH,
    };
  }

  const side = Math.max(rawW, rawH);
  return {
    x: targetPt.x < startPt.x ? startPt.x - side : startPt.x,
    y: targetPt.y < startPt.y ? startPt.y - side : startPt.y,
    w: side,
    h: side,
  };
}

export type SupportedShapeType =
  | typeof ElementType.RECT
  | typeof ElementType.ELLIPSE
  | typeof ElementType.DIAMOND
  | typeof ElementType.LINE
  | typeof ElementType.ARROW;

export class ShapeTool implements CanvasTool {
  private startPoint = { x: 0, y: 0 };
  private isDrawing = false;
  private startBinding: ArrowBinding | undefined = undefined;
  private endBinding: ArrowBinding | undefined = undefined;

  constructor(
    readonly id: SupportedShapeType,
    private readonly host: CanvasHost,
  ) {}

  private isConnector(): boolean {
    return this.id === ElementType.ARROW || this.id === ElementType.LINE;
  }

  onPointerHover(ctx: ToolContext): void {
    if (this.host.role === Role.VIEWER) return;
    if (!this.isConnector()) {
      this.host.setSnapIndicator(null);
      return;
    }

    const others = this.host.getOtherElements([]);
    const match = findNearestAnchor(ctx.worldPt, others, 36);
    const candidates = getNearbyAnchorPoints(ctx.worldPt, others, 140);
    this.host.setSnapIndicator({
      active: match?.pt ?? null,
      candidates,
    });
  }

  onPointerDown(ctx: ToolContext): void {
    if (this.host.role === Role.VIEWER) return;

    if (this.isConnector()) {
      const others = this.host.getOtherElements([]);
      const match = findNearestAnchor(ctx.worldPt, others, 36);
      this.startPoint = match ? { ...match.pt } : { ...ctx.worldPt };
      this.startBinding = match
        ? { elementId: match.elementId, anchor: match.anchor }
        : undefined;
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

    if (this.isConnector()) {
      const { targetPt, binding } = this.resolveConnectorTarget(
        ctx.worldPt,
        ctx.event.shiftKey,
      );
      this.endBinding = binding;
      this.host.setShapeDraft({
        type: this.id,
        x: this.startPoint.x,
        y: this.startPoint.y,
        w: targetPt.x - this.startPoint.x,
        h: targetPt.y - this.startPoint.y,
      });
      this.host.setDirty();
      return;
    }

    const bounds = computeBoxBounds(this.startPoint, ctx.worldPt, ctx.event.shiftKey);
    this.host.setShapeDraft({
      type: this.id,
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h,
    });
    this.host.setDirty();
  }

  onPointerUp(ctx: ToolContext): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.host.setShapeDraft(null);

    const isConnector = this.isConnector();
    const { targetPt, binding } = isConnector
      ? this.resolveConnectorTarget(ctx.worldPt, ctx.event.shiftKey)
      : { targetPt: { ...ctx.worldPt }, binding: undefined };

    if (isConnector) {
      this.endBinding = binding;
    }
    this.host.setSnapIndicator(null);

    const rawW = targetPt.x - this.startPoint.x;
    const rawH = targetPt.y - this.startPoint.y;
    if (Math.abs(rawW) > 5 || Math.abs(rawH) > 5) {
      this.commitShape(targetPt, ctx.event.shiftKey);
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

  private resolveConnectorTarget(
    worldPt: { x: number; y: number },
    isShift: boolean,
  ): { targetPt: { x: number; y: number }; binding?: ArrowBinding } {
    const excludeIds = this.startBinding ? [this.startBinding.elementId] : [];
    const others = this.host.getOtherElements(excludeIds);
    const match = findNearestAnchor(worldPt, others, 36);
    const candidates = getNearbyAnchorPoints(worldPt, others, 140);
    this.host.setSnapIndicator({
      active: match?.pt ?? null,
      candidates,
    });

    const basePt = match ? { ...match.pt } : { ...worldPt };
    const targetPt = isShift ? snapAnglePoint(this.startPoint, basePt) : basePt;
    const binding = match
      ? { elementId: match.elementId, anchor: match.anchor }
      : undefined;

    return { targetPt, binding };
  }

  private commitShape(targetPt: { x: number; y: number }, isShift: boolean): void {
    const store = useCanvasStore.getState();
    const id = nanoid(10);
    const z = this.host.getNextZIndex();
    const isConnector = this.isConnector();

    const bounds = isConnector
      ? {
          x: Math.min(this.startPoint.x, targetPt.x),
          y: Math.min(this.startPoint.y, targetPt.y),
          w: Math.max(1, Math.abs(targetPt.x - this.startPoint.x)),
          h: Math.max(1, Math.abs(targetPt.y - this.startPoint.y)),
        }
      : computeBoxBounds(this.startPoint, targetPt, isShift);

    const points = isConnector
      ? [this.startPoint.x, this.startPoint.y, targetPt.x, targetPt.y]
      : undefined;

    const element: ElementData = {
      id,
      type: this.id,
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      w: Math.round(Math.max(1, bounds.w)),
      h: Math.round(Math.max(1, bounds.h)),
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
    store.setActiveTool(CanvasToolType.SELECT);
  }
}
