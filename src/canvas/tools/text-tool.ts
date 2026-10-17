import { nanoid } from "nanoid";
import { CanvasHost, CanvasTool, ToolContext } from "./tool.interface";
import { ElementData, ElementType, Role } from "../../shared";
import { CanvasToolType, useCanvasStore } from "../../store/canvas-store";

export class TextTool implements CanvasTool {
  readonly id = CanvasToolType.TEXT;

  constructor(private readonly host: CanvasHost) {}

  onPointerDown(ctx: ToolContext): void {
    if (this.host.role === Role.VIEWER) return;

    const id = nanoid(10);
    const z = this.host.getNextZIndex();
    const store = useCanvasStore.getState();

    const element: ElementData = {
      id,
      type: ElementType.TEXT,
      x: Math.round(ctx.worldPt.x),
      y: Math.round(ctx.worldPt.y),
      w: 120,
      h: 36,
      rotation: 0,
      z,
      text: "",
      style: {
        fill: "transparent",
        stroke: store.strokeColor,
        strokeWidth: store.strokeWidth,
        opacity: store.opacity,
      },
      createdBy: this.host.userId,
    };

    this.host.commitElement(element);
    store.setSelectedIds([id]);
    this.host.syncStoreWithSelection([id]);
    store.setActiveTool(CanvasToolType.SELECT);
    this.host.events.emit("focusTextInput", { elementId: id });
    this.host.setDirty();
  }

  onPointerMove(_ctx: ToolContext): void {}

  onPointerUp(_ctx: ToolContext): void {}

  getCursor(_ctx: ToolContext): string {
    return "text";
  }
}
