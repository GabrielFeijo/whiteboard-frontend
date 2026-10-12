import { CanvasHost, CanvasTool, ToolContext } from "./tool.interface";
import { useCanvasStore } from "../../store/canvas-store";
import { getDocRoots } from "../../shared";
import { LOCAL_ORIGIN } from "../../collab/undo-manager";

export class EraserTool implements CanvasTool {
  readonly id = "eraser";

  constructor(private readonly host: CanvasHost) {}

  onPointerDown(ctx: ToolContext): void {
    this.eraseAt(ctx.worldPt);
  }

  onPointerMove(ctx: ToolContext): void {
    if (ctx.isPointerDown) {
      this.eraseAt(ctx.worldPt);
    }
  }

  onPointerUp(_ctx: ToolContext): void {
    this.host.undoManager.stopCapturing();
  }

  getCursor(_ctx: ToolContext): string {
    return "crosshair";
  }

  private eraseAt(worldPt: { x: number; y: number }): void {
    if (this.host.role === "VIEWER") return;

    const hitId = this.host.hitTest(worldPt);
    if (!hitId) return;

    const roots = getDocRoots(this.host.doc);
    this.host.doc.transact(() => {
      roots.elements.delete(hitId);
      this.host.spatialIndex.remove(hitId);
    }, LOCAL_ORIGIN);

    const store = useCanvasStore.getState();
    if (store.selectedIds.includes(hitId)) {
      store.setSelectedIds(store.selectedIds.filter((id) => id !== hitId));
    }

    this.host.setDirty();
  }
}
