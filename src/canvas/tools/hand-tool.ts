import { CanvasHost, CanvasTool, ToolContext } from "./tool.interface";
import { CanvasToolType, useCanvasStore } from "../../store/canvas-store";

export class HandTool implements CanvasTool {
  readonly id = CanvasToolType.HAND;

  constructor(private readonly host: CanvasHost) {}

  onPointerDown(_ctx: ToolContext): void {}

  onPointerMove(ctx: ToolContext): void {
    if (!ctx.isPointerDown) return;

    this.host.viewport.pan.x += ctx.event.movementX;
    this.host.viewport.pan.y += ctx.event.movementY;
    useCanvasStore.getState().setPan({ ...this.host.viewport.pan });
    this.host.onViewportMutated?.();
    this.host.setDirty();
  }

  onPointerUp(_ctx: ToolContext): void {}

  getCursor(ctx: ToolContext): string {
    return ctx.isPointerDown ? "grabbing" : "grab";
  }
}
