import { Point, Viewport } from "@/canvas/viewport";
import { CanvasTool } from "@/canvas/tools/tool.interface";
import { useCanvasStore } from "@/store/canvas-store";

export interface InputControllerHost {
  readonly overlayCanvas: HTMLCanvasElement;
  readonly viewport: Viewport;
  getActiveTool(): CanvasTool;
  onCursorWorldMove(worldPt: Point): void;
  onDoubleClickAtWorld(worldPt: Point): void;
  onViewportMutated(): void;
}

export class CanvasInputController {
  private isPointerDown = false;
  private currentWorldPoint: Point = { x: 0, y: 0 };

  constructor(private readonly host: InputControllerHost) {
    const canvas = this.host.overlayCanvas;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("dblclick", this.onDoubleClick);
  }

  getCurrentWorldPoint(): Point {
    return this.currentWorldPoint;
  }

  refreshHoverCursor(): void {
    const screenPt = this.host.viewport.worldToScreen(this.currentWorldPoint);
    this.updateHoverCursor(screenPt, this.currentWorldPoint);
  }

  private getScreenAndWorldPoint(e: PointerEvent): {
    screenPt: Point;
    worldPt: Point;
  } {
    const rect = this.host.overlayCanvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPt = this.host.viewport.screenToWorld(screenPt);
    return { screenPt, worldPt };
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.isPointerDown = true;
    const { screenPt, worldPt } = this.getScreenAndWorldPoint(e);
    this.currentWorldPoint = worldPt;

    this.host.getActiveTool().onPointerDown({
      worldPt,
      screenPt,
      event: e,
      isPointerDown: true,
    });
  };

  private onPointerMove = (e: PointerEvent): void => {
    const { screenPt, worldPt } = this.getScreenAndWorldPoint(e);
    this.currentWorldPoint = worldPt;
    this.host.onCursorWorldMove(worldPt);

    if (!this.isPointerDown) {
      this.updateHoverCursor(screenPt, worldPt);
      return;
    }

    this.host.getActiveTool().onPointerMove({
      worldPt,
      screenPt,
      event: e,
      isPointerDown: this.isPointerDown,
    });
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;

    const { screenPt, worldPt } = this.getScreenAndWorldPoint(e);
    this.host.getActiveTool().onPointerUp({
      worldPt,
      screenPt,
      event: e,
      isPointerDown: false,
    });
    this.updateHoverCursor(screenPt, worldPt);
  };

  private onPointerLeave = (): void => {
    if (!this.isPointerDown) {
      this.setCursor("default");
    }
  };

  private updateHoverCursor(screenPt: Point, worldPt: Point): void {
    const cursor = this.host.getActiveTool().getCursor({
      worldPt,
      screenPt,
      event: new PointerEvent("pointermove"),
      isPointerDown: this.isPointerDown,
    });
    this.setCursor(cursor);
  }

  private setCursor(cursor: string): void {
    if (this.host.overlayCanvas.style.cursor !== cursor) {
      this.host.overlayCanvas.style.cursor = cursor;
    }
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const viewport = this.host.viewport;

    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = Math.pow(0.995, e.deltaY);
      const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.1), 5.0);

      const rect = this.host.overlayCanvas.getBoundingClientRect();
      const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      viewport.pan.x =
        mouseScreen.x -
        (mouseScreen.x - viewport.pan.x) * (newZoom / viewport.zoom);
      viewport.pan.y =
        mouseScreen.y -
        (mouseScreen.y - viewport.pan.y) * (newZoom / viewport.zoom);
      viewport.zoom = newZoom;

      useCanvasStore.getState().setZoom(newZoom);
      useCanvasStore.getState().setPan({ ...viewport.pan });
    } else {
      viewport.pan.x -= e.deltaX;
      viewport.pan.y -= e.deltaY;
      useCanvasStore.getState().setPan({ ...viewport.pan });
    }

    this.host.onViewportMutated();
  };

  private onDoubleClick = (e: MouseEvent): void => {
    const worldPt = this.host.viewport.screenToWorld({
      x: e.offsetX,
      y: e.offsetY,
    });
    this.host.onDoubleClickAtWorld(worldPt);
  };

  destroy(): void {
    const canvas = this.host.overlayCanvas;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    canvas.removeEventListener("pointerleave", this.onPointerLeave);
    canvas.removeEventListener("wheel", this.onWheel);
    canvas.removeEventListener("dblclick", this.onDoubleClick);
  }
}
