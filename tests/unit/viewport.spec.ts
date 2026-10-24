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
    expect(vp.screenToWorld({ x: 150, y: 70 })).toEqual({ x: 100, y: 100 });
  });

  it("handles zoom scaling during screenToWorld transformation", () => {
    const vp = new Viewport({ x: 0, y: 0 }, 2);
    expect(vp.screenToWorld({ x: 200, y: 400 })).toEqual({ x: 100, y: 200 });
  });

  it("combines pan and zoom in screenToWorld", () => {
    const vp = new Viewport({ x: 100, y: 100 }, 0.5);
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

    expect(bounds.minX).toBe(-50);
    expect(bounds.minY).toBe(-25);
    expect(bounds.maxX).toBe(450);
    expect(bounds.maxY).toBe(275);
  });

  it("zooms around a focal screen point preserving its world coordinate", () => {
    const vp = new Viewport({ x: 100, y: 50 }, 1);
    const focalScreen = { x: 400, y: 300 };
    const worldBefore = vp.screenToWorld(focalScreen);

    vp.zoomToPoint(2, focalScreen);
    const worldAfter = vp.screenToWorld(focalScreen);

    expect(vp.zoom).toBe(2);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 5);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 5);
  });

  it("fits viewport pan and zoom to encompass content bounds with padding", () => {
    const vp = new Viewport();
    vp.fitToBounds({ minX: 100, minY: 100, maxX: 500, maxY: 300 }, 1000, 800, 100);

    expect(vp.zoom).toBe(2);
    const centerScreen = vp.worldToScreen({ x: 300, y: 200 });
    expect(centerScreen).toEqual({ x: 500, y: 400 });
  });
});
