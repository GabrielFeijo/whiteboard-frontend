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
}
