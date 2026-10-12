import { nanoid } from "nanoid";
import { CanvasHost, CanvasTool, ToolContext } from "./tool.interface";
import { ElementData } from "../../shared";
import { useCanvasStore } from "../../store/canvas-store";

export class TextTool implements CanvasTool {
  readonly id = "text";

  constructor(private readonly host: CanvasHost) {}

  onPointerDown(ctx: ToolContext): void {
    if (this.host.role === "VIEWER") return;

    const id = nanoid(10);
    const z = this.host.getNextZIndex();
    const store = useCanvasStore.getState();

    const element: ElementData = {
      id,
      type: "text",
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
    store.setActiveTool("select");
    this.host.events.emit("focusTextInput", { elementId: id });
    this.host.setDirty();
  }

  onPointerMove(_ctx: ToolContext): void {}

  onPointerUp(_ctx: ToolContext): void {}

  getCursor(_ctx: ToolContext): string {
    return "text";
  }
}
