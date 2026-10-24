import { describe, expect, it } from "vitest";
import {
  calculateAlignedPositions,
  calculateAutoStandardizedSpacingPositions,
  calculateDistributedPositions,
  calculateSmartGuides,
  calculateStandardizedSpacingPositions,
} from "@/canvas/alignment-helper";
import { ElementData } from "@/shared";

function makeEl(id: string, x: number, y: number, w: number, h: number): ElementData {
  return {
    id,
    type: "rect",
    x,
    y,
    w,
    h,
    rotation: 0,
    z: "a0",
    style: { fill: "#fff", stroke: "#000", strokeWidth: 1, opacity: 1 },
    createdBy: "user-1",
  };
}

describe("Alignment and Distribution Helpers", () => {
  it("aligns elements to left, center, right, top, middle, bottom", () => {
    const el1 = makeEl("1", 10, 20, 100, 50);
    const el2 = makeEl("2", 80, 100, 60, 40);

    const left = calculateAlignedPositions([el1, el2], "left");
    expect(left.get("1")?.x).toBe(10);
    expect(left.get("2")?.x).toBe(10);

    const right = calculateAlignedPositions([el1, el2], "right");
    expect(right.get("1")?.x).toBe(40);
    expect(right.get("2")?.x).toBe(80);

    const top = calculateAlignedPositions([el1, el2], "top");
    expect(top.get("1")?.y).toBe(20);
    expect(top.get("2")?.y).toBe(20);

    const bottom = calculateAlignedPositions([el1, el2], "bottom");
    expect(bottom.get("1")?.y).toBe(90);
    expect(bottom.get("2")?.y).toBe(100);
  });

  it("distributes elements horizontally and vertically with equal spacing", () => {
    const el1 = makeEl("1", 0, 0, 50, 50);
    const el2 = makeEl("2", 30, 0, 50, 50);
    const el3 = makeEl("3", 200, 0, 50, 50);

    const distH = calculateDistributedPositions([el1, el2, el3], "horizontal");
    expect(distH.has("2")).toBe(true);
    expect(distH.get("2")?.x).toBe(100);
  });

  it("snaps to nearby elements and outputs smart guides", () => {
    const staticEl = makeEl("static", 100, 100, 100, 100);
    const dragged = { x: 98, y: 300, w: 80, h: 80 };

    const match = calculateSmartGuides(dragged, [staticEl], 6);
    expect(match.snappedX).toBe(100);
    expect(match.verticalGuides).toContain(100);
  });

  it("ignores lines, arrows and freehand in calculateSmartGuides avoiding false positives", () => {
    const arrowEl: ElementData = {
      id: "arrow-1",
      type: "arrow",
      x: 100,
      y: 200,
      w: 10,
      h: 100,
      rotation: 0,
      z: "a1",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 1, opacity: 1 },
      createdBy: "user-1",
      points: [100, 200, 110, 300],
    };
    const freehandEl: ElementData = {
      id: "freehand-1",
      type: "freehand",
      x: 50,
      y: 50,
      w: 200,
      h: 200,
      rotation: 0,
      z: "a2",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 1, opacity: 1 },
      createdBy: "user-1",
      points: [50, 50, 1, 100, 100, 1],
    };

    const dragged = { x: 98, y: 300, w: 80, h: 80 };
    const match = calculateSmartGuides(dragged, [arrowEl, freehandEl], 8);
    expect(match.snappedX).toBeUndefined();
    expect(match.snappedY).toBeUndefined();
    expect(match.verticalGuides).toHaveLength(0);
    expect(match.horizontalGuides).toHaveLength(0);
  });

  it("aligns perfectly center-to-center when card is dragged below a connected card without phantom guides", () => {
    const cardA = makeEl("card-a", 561, 71, 378, 163);
    const connector: ElementData = {
      id: "conn-1",
      type: "arrow",
      x: 750,
      y: 234,
      w: 7,
      h: 94,
      rotation: 0,
      z: "a1",
      style: { fill: "transparent", stroke: "#ef4444", strokeWidth: 2, opacity: 1 },
      createdBy: "user-1",
      startBinding: { elementId: "card-a", anchor: "bottom" },
      endBinding: { elementId: "card-b", anchor: "top" },
    };

    const draggedCardB = { x: 568, y: 328, w: 378, h: 163 };
    const match = calculateSmartGuides(draggedCardB, [cardA, connector], 8);

    expect(match.snappedX).toBe(561);
    expect(match.verticalGuides).toContain(750);
    expect(match.horizontalGuides).toHaveLength(0);
    expect(match.snappedY).toBeUndefined();
  });

  it("ignores arrows and lines in calculateAlignedPositions without distorting bounds", () => {
    const el1 = makeEl("1", 10, 20, 100, 50);
    const el2 = makeEl("2", 80, 100, 60, 40);
    const arrow: ElementData = {
      id: "arrow-1",
      type: "arrow",
      x: 500,
      y: 500,
      w: 200,
      h: 100,
      rotation: 0,
      z: "a1",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 1, opacity: 1 },
      createdBy: "user-1",
    };

    const left = calculateAlignedPositions([el1, el2, arrow], "left");
    expect(left.has("arrow-1")).toBe(false);
    expect(left.get("1")?.x).toBe(10);
    expect(left.get("2")?.x).toBe(10);
  });

  it("standardizes horizontal spacing between rectangles based on the first pair's 4px gap", () => {
    const el1 = makeEl("1", 0, 0, 50, 50);
    const el2 = makeEl("2", 54, 0, 50, 50);
    const el3 = makeEl("3", 200, 0, 50, 50);

    const updates = calculateStandardizedSpacingPositions([el1, el2, el3], "horizontal");
    expect(updates.get("2")?.x).toBe(54);
    expect(updates.get("3")?.x).toBe(108);
  });

  it("standardizes horizontal spacing with user-chosen custom gap (e.g. 16px)", () => {
    const el1 = makeEl("1", 0, 0, 50, 50);
    const el2 = makeEl("2", 30, 0, 50, 50);
    const el3 = makeEl("3", 200, 0, 50, 50);

    const updates = calculateStandardizedSpacingPositions([el1, el2, el3], "horizontal", 16);
    expect(updates.get("2")?.x).toBe(66);
    expect(updates.get("3")?.x).toBe(132);
  });

  it("standardizes vertical spacing with custom gap", () => {
    const el1 = makeEl("1", 0, 0, 50, 40);
    const el2 = makeEl("2", 0, 100, 50, 40);

    const updates = calculateStandardizedSpacingPositions([el1, el2], "vertical", 8);
    expect(updates.get("2")?.y).toBe(48);
  });

  it("snaps dragged element to match existing 4px gap between adjacent pairs and outputs spacing guides", () => {
    const staticA = makeEl("a", 0, 100, 50, 50);
    const staticB = makeEl("b", 54, 100, 50, 50);
    const draggedC = { x: 106, y: 100, w: 50, h: 50 };

    const match = calculateSmartGuides(draggedC, [staticA, staticB], 6);
    expect(match.snappedX).toBe(108);
    expect(match.spacingGuides.length).toBeGreaterThanOrEqual(2);
    expect(match.spacingGuides.every((g) => g.gap === 4)).toBe(true);
  });

  it("preserves locked elements during spacing standardization", () => {
    const el1 = makeEl("1", 0, 0, 50, 50);
    const el2: ElementData = { ...makeEl("2", 50, 0, 50, 50), locked: true };
    const el3 = makeEl("3", 200, 0, 50, 50);

    const updates = calculateStandardizedSpacingPositions([el1, el2, el3], "horizontal", 10);
    expect(updates.has("2")).toBe(false);
    expect(updates.get("3")?.x).toBe(120);
  });

  it("standardizes horizontal and vertical spacing independently across rows and columns in a 2x2 grid", () => {
    const topLeft = makeEl("tl", 423, 110, 200, 183);
    const topRight = makeEl("tr", 897, 100, 200, 183);
    const bottomLeft = makeEl("bl", 423, 309, 200, 183);
    const bottomRight = makeEl("br", 897, 299, 200, 183);
    const grid = [topLeft, topRight, bottomLeft, bottomRight];

    const horizUpdates = calculateStandardizedSpacingPositions(grid, "horizontal", 8);
    expect(horizUpdates.has("tl")).toBe(false);
    expect(horizUpdates.has("bl")).toBe(false);
    expect(horizUpdates.get("tr")?.x).toBe(631);
    expect(horizUpdates.get("br")?.x).toBe(631);

    const vertUpdates = calculateStandardizedSpacingPositions(grid, "vertical", 8);
    expect(vertUpdates.get("tl")?.y).toBe(100);
    expect(vertUpdates.has("tr")).toBe(false);
    expect(vertUpdates.get("bl")?.y).toBe(291);
    expect(vertUpdates.get("br")?.y).toBe(291);

    const autoUpdates = calculateAutoStandardizedSpacingPositions(grid, 8);
    expect(autoUpdates.get("tl")).toEqual({ y: 100 });
    expect(autoUpdates.get("tr")).toEqual({ x: 631 });
    expect(autoUpdates.get("bl")).toEqual({ y: 291 });
    expect(autoUpdates.get("br")).toEqual({ x: 631, y: 291 });
  });
});
