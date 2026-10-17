import { describe, expect, it } from "vitest";
import { Viewport } from "@/canvas/viewport";

describe("Viewport Coordinate Transformation", () => {
  it("initializes with default pan (0, 0) and zoom 1", () => {
    const vp = new Viewport();
    expect(vp.pan).toEqual({ x: 0, y: 0 });
    expect(vp.zoom).toBe(1);
  });

  it("transforms screen coordinates to world coordinates with 1:1 scale", () => {
    const vp = new Viewport({ x: 0, y: 0 }, 1);
    expect(vp.screenToWorld({ x: 100, y: 200 })).toEqual({ x: 100, y: 200 });
  });

  it("handles pan offset during screenToWorld transformation", () => {
    const vp = new Viewport({ x: 50, y: -30 }, 1);
    // screen - pan => 150 - 50 = 100, 70 - (-30) = 100
    expect(vp.screenToWorld({ x: 150, y: 70 })).toEqual({ x: 100, y: 100 });
  });

  it("handles zoom scaling during screenToWorld transformation", () => {
    const vp = new Viewport({ x: 0, y: 0 }, 2);
    // screen / zoom => 200 / 2 = 100, 400 / 2 = 200
    expect(vp.screenToWorld({ x: 200, y: 400 })).toEqual({ x: 100, y: 200 });
  });

  it("combines pan and zoom in screenToWorld", () => {
    const vp = new Viewport({ x: 100, y: 100 }, 0.5);
    // (screen - pan) / zoom => (300 - 100) / 0.5 = 400
    expect(vp.screenToWorld({ x: 300, y: 200 })).toEqual({ x: 400, y: 200 });
  });

  it("transforms world coordinates back to screen coordinates invertibly", () => {
    const vp = new Viewport({ x: -150, y: 80 }, 1.75);
    const originalWorld = { x: 340, y: 720 };
    const screen = vp.worldToScreen(originalWorld);
    const convertedWorld = vp.screenToWorld(screen);

    expect(convertedWorld.x).toBeCloseTo(originalWorld.x, 5);
    expect(convertedWorld.y).toBeCloseTo(originalWorld.y, 5);
  });

  it("computes visible world bounds for a given screen dimension", () => {
    const vp = new Viewport({ x: 100, y: 50 }, 2);
    const bounds = vp.getVisibleWorldBounds(1000, 600);

    // topLeft: (0 - 100)/2 = -50, (0 - 50)/2 = -25
    // bottomRight: (1000 - 100)/2 = 450, (600 - 50)/2 = 275
    expect(bounds.minX).toBe(-50);
    expect(bounds.minY).toBe(-25);
    expect(bounds.maxX).toBe(450);
    expect(bounds.maxY).toBe(275);
  });
});
