import {
  CanvasHost,
  CanvasTool,
  spawnEditableTextElement,
  ToolContext,
} from "./tool.interface";
import { ElementType } from "../../shared";
import { CanvasToolType, useCanvasStore } from "../../store/canvas-store";

export class TextTool implements CanvasTool {
  readonly id = CanvasToolType.TEXT;

  constructor(private readonly host: CanvasHost) {}

  onPointerDown(ctx: ToolContext): void {
    const store = useCanvasStore.getState();
    spawnEditableTextElement(this.host, {
      type: ElementType.TEXT,
      x: ctx.worldPt.x,
      y: ctx.worldPt.y,
      w: 120,
      h: 36,
      style: {
        fill: "transparent",
        stroke: store.strokeColor,
        strokeWidth: store.strokeWidth,
        opacity: store.opacity,
      },
    });
  }

  onPointerMove(_ctx: ToolContext): void {}

  onPointerUp(_ctx: ToolContext): void {}

  getCursor(_ctx: ToolContext): string {
    return "text";
  }
}
