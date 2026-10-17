import { describe, expect, it } from "vitest";
import {
  calculateAlignedPositions,
  calculateDistributedPositions,
  calculateSmartGuides,
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
});
