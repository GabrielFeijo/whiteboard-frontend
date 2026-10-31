import { Point, Viewport } from "@/canvas/viewport";
import { CanvasTool } from "@/canvas/tools/tool.interface";
import {
  isEditableDomElement,
  isModalDialogOpen,
} from "@/canvas/controllers/canvas-keyboard-controller";
import { CanvasAssetService } from "@/canvas/services/canvas-asset.service";
import { useCanvasStore } from "@/store/canvas-store";

export interface InputControllerHost {
  readonly overlayCanvas: HTMLCanvasElement;
  readonly viewport: Viewport;
  getActiveTool(): CanvasTool;
  onCursorWorldMove(worldPt: Point): void;
  onDoubleClickAtWorld(worldPt: Point): void;
  onViewportMutated(): void;
  onDropFile?(file: File, worldPt: Point): void;
}

export class CanvasInputController {
  private isPointerDown = false;
  private currentWorldPoint: Point = { x: 0, y: 0 };
  private isSpacePressed = false;
  private isMiddlePanning = false;
  private isSpacePanning = false;

  constructor(private readonly host: InputControllerHost) {
    const canvas = this.host.overlayCanvas;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("dblclick", this.onDoubleClick);
    canvas.addEventListener("dragover", this.onDragOver);
    canvas.addEventListener("drop", this.onDrop);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  getCurrentWorldPoint(): Point {
    return this.currentWorldPoint;
  }

  refreshHoverCursor(): void {
    if (this.isSpacePressed) {
      this.setCursor("grab");
      return;
    }
    const screenPt = this.host.viewport.worldToScreen(this.currentWorldPoint);
    this.updateHoverCursor(screenPt, this.currentWorldPoint);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isEditableDomElement(e.target) || isModalDialogOpen()) return;
    if (e.code === "Space" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (
        typeof document !== "undefined" &&
        document.activeElement instanceof HTMLElement &&
        document.activeElement.tagName === "BUTTON"
      ) {
        document.activeElement.blur();
      }
      if (!this.isSpacePressed) {
        this.isSpacePressed = true;
        if (!this.isPointerDown) {
          this.setCursor("grab");
        }
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === "Space") {
      this.isSpacePressed = false;
      this.isSpacePanning = false;
      this.refreshHoverCursor();
    }
  };

  private getScreenAndWorldPoint(e: MouseEvent): {
    screenPt: Point;
    worldPt: Point;
  } {
    const rect = this.host.overlayCanvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPt = this.host.viewport.screenToWorld(screenPt);
    return { screenPt, worldPt };
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button === 1 || (e.button === 0 && this.isSpacePressed)) {
      e.preventDefault();
      if (e.button === 1) this.isMiddlePanning = true;
      if (this.isSpacePressed) this.isSpacePanning = true;
      this.isPointerDown = true;
      this.setCursor("grabbing");
      return;
    }

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
    if (this.isMiddlePanning || this.isSpacePanning) {
      this.host.viewport.pan.x += e.movementX;
      this.host.viewport.pan.y += e.movementY;
      useCanvasStore.getState().setPan({ ...this.host.viewport.pan });
      this.host.onViewportMutated();
      return;
    }

    const { screenPt, worldPt } = this.getScreenAndWorldPoint(e);
    this.currentWorldPoint = worldPt;
    this.host.onCursorWorldMove(worldPt);

    if (!this.isPointerDown) {
      this.updateHoverCursor(screenPt, worldPt);
      this.host.getActiveTool().onPointerHover?.({
        worldPt,
        screenPt,
        event: e,
        isPointerDown: false,
      });
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
    if (this.isMiddlePanning || this.isSpacePanning) {
      this.isMiddlePanning = false;
      this.isSpacePanning = false;
      this.isPointerDown = false;
      this.setCursor(this.isSpacePressed ? "grab" : "default");
      return;
    }

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
      const rect = this.host.overlayCanvas.getBoundingClientRect();
      const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      viewport.zoomToPoint(viewport.zoom * zoomFactor, mouseScreen);

      useCanvasStore.getState().setZoom(viewport.zoom);
      useCanvasStore.getState().setPan({ ...viewport.pan });
    } else {
      viewport.pan.x -= e.deltaX;
      viewport.pan.y -= e.deltaY;
      useCanvasStore.getState().setPan({ ...viewport.pan });
    }

    this.host.onViewportMutated();
  };

  private onDoubleClick = (e: MouseEvent): void => {
    const { worldPt } = this.getScreenAndWorldPoint(e);
    this.host.onDoubleClickAtWorld(worldPt);
  };

  private onDragOver = (e: DragEvent): void => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  private onDrop = (e: DragEvent): void => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (CanvasAssetService.isSupportedImageFile(file)) {
        const { worldPt } = this.getScreenAndWorldPoint(e);
        this.host.onDropFile?.(file, worldPt);
        break;
      }
    }
  };

  destroy(): void {
    const canvas = this.host.overlayCanvas;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    canvas.removeEventListener("pointerleave", this.onPointerLeave);
    canvas.removeEventListener("wheel", this.onWheel);
    canvas.removeEventListener("dblclick", this.onDoubleClick);
    canvas.removeEventListener("dragover", this.onDragOver);
    canvas.removeEventListener("drop", this.onDrop);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}
