export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class Viewport {
  constructor(
    public pan: Point = { x: 0, y: 0 },
    public zoom: number = 1,
  ) {}

  screenToWorld(screen: Point): Point {
    return {
      x: (screen.x - this.pan.x) / this.zoom,
      y: (screen.y - this.pan.y) / this.zoom,
    };
  }

  worldToScreen(world: Point): Point {
    return {
      x: world.x * this.zoom + this.pan.x,
      y: world.y * this.zoom + this.pan.y,
    };
  }

  getVisibleWorldBounds(screenWidth: number, screenHeight: number): Rect {
    const topLeft = this.screenToWorld({ x: 0, y: 0 });
    const bottomRight = this.screenToWorld({ x: screenWidth, y: screenHeight });
    return {
      minX: topLeft.x,
      minY: topLeft.y,
      maxX: bottomRight.x,
      maxY: bottomRight.y,
    };
  }

  zoomToPoint(targetZoom: number, focalScreen: Point): void {
    const newZoom = Math.min(Math.max(targetZoom, 0.1), 5.0);
    const ratio = newZoom / this.zoom;
    this.pan = {
      x: focalScreen.x - (focalScreen.x - this.pan.x) * ratio,
      y: focalScreen.y - (focalScreen.y - this.pan.y) * ratio,
    };
    this.zoom = newZoom;
  }

  reset(): void {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
  }

  fitToBounds(
    bounds: Rect,
    screenWidth: number,
    screenHeight: number,
    padding = 64,
  ): void {
    const contentW = Math.max(1, bounds.maxX - bounds.minX);
    const contentH = Math.max(1, bounds.maxY - bounds.minY);
    const availW = Math.max(100, screenWidth - padding * 2);
    const availH = Math.max(100, screenHeight - padding * 2);

    const scale = Math.min(availW / contentW, availH / contentH, 2.0);
    this.zoom = Math.min(Math.max(scale, 0.1), 5.0);

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    this.pan = {
      x: Math.round(screenWidth / 2 - centerX * this.zoom),
      y: Math.round(screenHeight / 2 - centerY * this.zoom),
    };
  }
}
