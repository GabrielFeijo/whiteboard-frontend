import {
  CanvasHost,
  CanvasTool,
  spawnEditableTextElement,
  ToolContext,
} from "./tool.interface";
import { ElementType } from "../../shared";
import { CanvasToolType, useCanvasStore } from "../../store/canvas-store";

export class StickyTool implements CanvasTool {
  readonly id = CanvasToolType.STICKY;

  constructor(private readonly host: CanvasHost) {}

  onPointerDown(ctx: ToolContext): void {
    const store = useCanvasStore.getState();
    spawnEditableTextElement(this.host, {
      type: ElementType.STICKY,
      x: ctx.worldPt.x - 100,
      y: ctx.worldPt.y - 100,
      w: 200,
      h: 200,
      style: {
        fill: store.fillColor === "transparent" ? "#fef08a" : store.fillColor,
        stroke: store.strokeColor,
        strokeWidth: 1,
        opacity: store.opacity,
      },
    });
  }

  onPointerMove(_ctx: ToolContext): void {}

  onPointerUp(_ctx: ToolContext): void {}

  getCursor(_ctx: ToolContext): string {
    return "crosshair";
  }
}
