import { nanoid } from "nanoid";
import { CanvasHost, CanvasTool, ToolContext } from "./tool.interface";
import { ElementData } from "../../shared";
import { useCanvasStore } from "../../store/canvas-store";

export class StickyTool implements CanvasTool {
  readonly id = "sticky";

  constructor(private readonly host: CanvasHost) {}

  onPointerDown(ctx: ToolContext): void {
    if (this.host.role === "VIEWER") return;

    const id = nanoid(10);
    const z = this.host.getNextZIndex();
    const store = useCanvasStore.getState();

    const element: ElementData = {
      id,
      type: "sticky",
      x: Math.round(ctx.worldPt.x - 100),
      y: Math.round(ctx.worldPt.y - 100),
      w: 200,
      h: 200,
      rotation: 0,
      z,
      text: "",
      style: {
        fill: store.fillColor === "transparent" ? "#fef08a" : store.fillColor,
        stroke: store.strokeColor,
        strokeWidth: 1,
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
    return "crosshair";
  }
}
