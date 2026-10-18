import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { Viewport } from "../../src/canvas/viewport";
import {
  calculateResizedBounds,
  getElementHandles,
  getHandleAt,
  getLineHandles,
  isPointInElement,
  ResizeHandleType,
  scaleFreehandPoints,
} from "../../src/canvas/resize-helper";
import { calculateResizeSmartGuides } from "../../src/canvas/alignment-helper";
import { ElementData, getDocRoots } from "../../src/shared";
import { LocalUndoManager, LOCAL_ORIGIN } from "../../src/collab/undo-manager";

describe("element resizing logic", () => {
  it("calculates 8 handle positions and cursors for a given bounding box", () => {
    const bounds = { x: 100, y: 200, w: 300, h: 400 };
    const handles = getElementHandles(bounds);

    expect(handles).toHaveLength(8);

    const handleTypes = handles.map((h) => h.type);
    expect(handleTypes).toEqual(["nw", "n", "ne", "e", "se", "s", "sw", "w"]);

    const nw = handles.find((h) => h.type === "nw")!;
    expect(nw.x).toBe(100);
    expect(nw.y).toBe(200);
    expect(nw.cursor).toBe("nwse-resize");

    const e = handles.find((h) => h.type === "e")!;
    expect(e.x).toBe(400);
    expect(e.y).toBe(400);
    expect(e.cursor).toBe("ew-resize");

    const se = handles.find((h) => h.type === "se")!;
    expect(se.x).toBe(400);
    expect(se.y).toBe(600);
    expect(se.cursor).toBe("nwse-resize");

    const s = handles.find((h) => h.type === "s")!;
    expect(s.x).toBe(250);
    expect(s.y).toBe(600);
    expect(s.cursor).toBe("ns-resize");
  });

  it("detects handle hits in screen space with zoom independence", () => {
    const bounds = { x: 100, y: 100, w: 200, h: 100 };

    const vp1 = new Viewport({ x: 0, y: 0 }, 1.0);
    const hit1 = getHandleAt({ x: 302, y: 198 }, bounds, vp1, 10);
    expect(hit1).not.toBeNull();
    expect(hit1?.type).toBe("se");

    const vp2 = new Viewport({ x: 50, y: 50 }, 2.0);
    const hit2 = getHandleAt({ x: 654, y: 448 }, bounds, vp2, 10);
    expect(hit2).not.toBeNull();
    expect(hit2?.type).toBe("se");

    const miss = getHandleAt({ x: 150, y: 150 }, bounds, vp1, 10);
    expect(miss).toBeNull();
  });

  it("resizes east/west edges modifying width while keeping height unchanged", () => {
    const initialBounds = { x: 100, y: 100, w: 200, h: 100 };

    const eastResize = calculateResizedBounds({
      handle: "e",
      initialBounds,
      dx: 40,
      dy: 20,
    });
    expect(eastResize).toEqual({ x: 100, y: 100, w: 240, h: 100 });

    const westResize = calculateResizedBounds({
      handle: "w",
      initialBounds,
      dx: 30,
      dy: 0,
    });
    expect(westResize).toEqual({ x: 130, y: 100, w: 170, h: 100 });
  });

  it("resizes north/south edges modifying height while keeping width unchanged", () => {
    const initialBounds = { x: 100, y: 100, w: 200, h: 100 };

    const southResize = calculateResizedBounds({
      handle: "s",
      initialBounds,
      dx: 20,
      dy: 50,
    });
    expect(southResize).toEqual({ x: 100, y: 100, w: 200, h: 150 });

    const northResize = calculateResizedBounds({
      handle: "n",
      initialBounds,
      dx: 0,
      dy: 25,
    });
    expect(northResize).toEqual({ x: 100, y: 125, w: 200, h: 75 });
  });

  it("resizes corner handles correctly", () => {
    const initialBounds = { x: 100, y: 100, w: 200, h: 100 };

    const seResize = calculateResizedBounds({
      handle: "se",
      initialBounds,
      dx: 50,
      dy: 40,
    });
    expect(seResize).toEqual({ x: 100, y: 100, w: 250, h: 140 });

    const nwResize = calculateResizedBounds({
      handle: "nw",
      initialBounds,
      dx: 20,
      dy: 10,
    });
    expect(nwResize).toEqual({ x: 120, y: 110, w: 180, h: 90 });
  });

  it("clamps to minimum size when dragging past opposite edge", () => {
    const initialBounds = { x: 100, y: 100, w: 50, h: 50 };

    const clampedEast = calculateResizedBounds({
      handle: "e",
      initialBounds,
      dx: -100,
      dy: 0,
      minWidth: 10,
      minHeight: 10,
    });
    expect(clampedEast.w).toBe(10);
    expect(clampedEast.x).toBe(100);

    const clampedWest = calculateResizedBounds({
      handle: "w",
      initialBounds,
      dx: 100,
      dy: 0,
      minWidth: 10,
      minHeight: 10,
    });
    expect(clampedWest.w).toBe(10);
    expect(clampedWest.x).toBe(140);
  });

  it("scales freehand path points proportionally with new bounds", () => {
    const initialBounds = { x: 100, y: 100, w: 100, h: 100 };
    const points = [100, 100, 0.5, 200, 200, 0.8];
    const newBounds = { x: 150, y: 150, w: 200, h: 300 };

    const scaled = scaleFreehandPoints(points, initialBounds, newBounds);

    expect(scaled).toEqual([
      150,
      150,
      0.5,
      350,
      450,
      0.8,
    ]);
  });

  it("integrates with Yjs and LocalUndoManager to undo/redo resize actions", () => {
    const doc = new Y.Doc();
    const undoManager = new LocalUndoManager(doc);
    const roots = getDocRoots(doc);

    const elMap = new Y.Map<unknown>();
    elMap.set("id", "rect-resize-1");
    elMap.set("type", "rect");
    elMap.set("x", 50);
    elMap.set("y", 60);
    elMap.set("w", 100);
    elMap.set("h", 80);
    elMap.set("rotation", 0);
    elMap.set("z", "a0");
    elMap.set("createdBy", "user-1");
    elMap.set("style", { stroke: "#000", fill: "#fff", strokeWidth: 2, opacity: 1 });

    doc.transact(() => {
      roots.elements.set("rect-resize-1", elMap);
    }, LOCAL_ORIGIN);

    undoManager.stopCapturing();

    doc.transact(() => {
      elMap.set("w", 250);
      elMap.set("h", 180);
    }, LOCAL_ORIGIN);

    undoManager.stopCapturing();

    expect(elMap.get("w")).toBe(250);
    expect(elMap.get("h")).toBe(180);

    undoManager.undo();
    expect(elMap.get("w")).toBe(100);
    expect(elMap.get("h")).toBe(80);

    undoManager.redo();
    expect(elMap.get("w")).toBe(250);
    expect(elMap.get("h")).toBe(180);
  });

  it("checks whether a point is inside an element taking shape into account", () => {
    const rect = {
      id: "rect-1",
      type: "rect" as const,
      x: 100,
      y: 100,
      w: 200,
      h: 200,
      rotation: 0,
      z: "a0",
      createdBy: "u1",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 2, opacity: 1 },
    };
    expect(isPointInElement({ x: 150, y: 150 }, rect)).toBe(true);
    expect(isPointInElement({ x: 50, y: 50 }, rect)).toBe(false);

    const ellipse = {
      id: "el-1",
      type: "ellipse" as const,
      x: 100,
      y: 100,
      w: 200,
      h: 200,
      rotation: 0,
      z: "a0",
      createdBy: "u1",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 2, opacity: 1 },
    };
    expect(isPointInElement({ x: 200, y: 200 }, ellipse)).toBe(true);
    expect(isPointInElement({ x: 105, y: 105 }, ellipse)).toBe(false);

    const diamond = {
      id: "d-1",
      type: "diamond" as const,
      x: 100,
      y: 100,
      w: 200,
      h: 200,
      rotation: 0,
      z: "a0",
      createdBy: "u1",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 2, opacity: 1 },
    };
    expect(isPointInElement({ x: 200, y: 200 }, diamond)).toBe(true);
    expect(isPointInElement({ x: 110, y: 110 }, diamond)).toBe(false);
  });

  it("correctly prioritizes the front element by z-index when elements overlap", () => {
    const parent = {
      id: "parent-rect",
      type: "rect" as const,
      x: 0,
      y: 0,
      w: 500,
      h: 500,
      rotation: 0,
      z: "a0",
      createdBy: "u1",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 2, opacity: 1 },
    };

    const child = {
      id: "child-rect",
      type: "rect" as const,
      x: 100,
      y: 100,
      w: 100,
      h: 100,
      rotation: 0,
      z: "a1",
      createdBy: "u1",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 2, opacity: 1 },
    };

    const clickPoint = { x: 150, y: 150 };

    const candidates = [parent, child];
    candidates.sort((a, b) => ((b.z || "") > (a.z || "") ? 1 : (b.z || "") < (a.z || "") ? -1 : 0));

    let hitId: string | null = null;
    for (const el of candidates) {
      if (isPointInElement(clickPoint, el)) {
        hitId = el.id;
        break;
      }
    }

    expect(hitId).toBe("child-rect");
  });

  it("extracts start and end handles for lines and detects hits", () => {
    const line = {
      id: "l1",
      type: "line" as const,
      x: 100,
      y: 100,
      w: 200,
      h: 150,
      points: [100, 250, 300, 100],
      rotation: 0,
      z: "a1",
      createdBy: "u1",
      style: { fill: "transparent", stroke: "#000", strokeWidth: 2, opacity: 1 },
    };

    const handles = getLineHandles(line);
    expect(handles).toHaveLength(2);
    expect(handles[0]).toEqual({ type: "start", x: 100, y: 250, cursor: "crosshair" });
    expect(handles[1]).toEqual({ type: "end", x: 300, y: 100, cursor: "crosshair" });

    const vp = new Viewport({ x: 0, y: 0 }, 1.0);
    const hitStart = getHandleAt({ x: 102, y: 248 }, line, vp, 10);
    expect(hitStart?.type).toBe("start");

    const hitEnd = getHandleAt({ x: 298, y: 102 }, line, vp, 10);
    expect(hitEnd?.type).toBe("end");

    const miss = getHandleAt({ x: 200, y: 200 }, line, vp, 10);
    expect(miss).toBeNull();
  });

  it("accurately hit tests diagonal lines with reverse slope", () => {
    const line = {
      id: "l1",
      type: "line" as const,
      x: 100,
      y: 100,
      w: 200,
      h: 200,
      points: [100, 300, 300, 100],
      rotation: 0,
      z: "a1",
      createdBy: "u1",
      style: { fill: "transparent", stroke: "#000", strokeWidth: 2, opacity: 1 },
    };

    expect(isPointInElement({ x: 200, y: 200 }, line)).toBe(true);
    expect(isPointInElement({ x: 100, y: 300 }, line)).toBe(true);
    expect(isPointInElement({ x: 300, y: 100 }, line)).toBe(true);

    expect(isPointInElement({ x: 100, y: 100 }, line)).toBe(false);
    expect(isPointInElement({ x: 300, y: 300 }, line)).toBe(false);
  });

  it("snaps east handle to align right edge with another element", () => {
    const topRect: ElementData = {
      id: "top-1",
      type: "rect",
      x: 100,
      y: 50,
      w: 200,
      h: 100,
      rotation: 0,
      z: "a0",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 1, opacity: 1 },
      createdBy: "u1",
    };
    const initialBounds = { x: 100, y: 200, w: 100, h: 80 };
    const rawBounds = { x: 100, y: 200, w: 196, h: 80 };

    const match = calculateResizeSmartGuides(
      ResizeHandleType.E,
      initialBounds,
      rawBounds,
      [topRect],
      6,
    );

    expect(match.snappedBounds.x).toBe(100);
    expect(match.snappedBounds.w).toBe(200);
    expect(match.verticalGuides).toContain(300);
    expect(match.horizontalGuides).toHaveLength(0);
  });

  it("snaps west handle to align left edge while keeping right edge stationary", () => {
    const topRect: ElementData = {
      id: "top-1",
      type: "rect",
      x: 100,
      y: 50,
      w: 200,
      h: 100,
      rotation: 0,
      z: "a0",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 1, opacity: 1 },
      createdBy: "u1",
    };
    const initialBounds = { x: 150, y: 200, w: 150, h: 80 };
    const rawBounds = { x: 104, y: 200, w: 196, h: 80 };

    const match = calculateResizeSmartGuides(
      ResizeHandleType.W,
      initialBounds,
      rawBounds,
      [topRect],
      6,
    );

    expect(match.snappedBounds.x).toBe(100);
    expect(match.snappedBounds.w).toBe(200);
    expect(match.snappedBounds.x + match.snappedBounds.w).toBe(300);
    expect(match.verticalGuides).toContain(100);
    expect(match.horizontalGuides).toHaveLength(0);
  });

  it("snaps south handle to align bottom edge with another element", () => {
    const rightRect: ElementData = {
      id: "right-1",
      type: "rect",
      x: 350,
      y: 50,
      w: 100,
      h: 200,
      rotation: 0,
      z: "a0",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 1, opacity: 1 },
      createdBy: "u1",
    };
    const initialBounds = { x: 100, y: 50, w: 100, h: 100 };
    const rawBounds = { x: 100, y: 50, w: 100, h: 197 };

    const match = calculateResizeSmartGuides(
      ResizeHandleType.S,
      initialBounds,
      rawBounds,
      [rightRect],
      6,
    );

    expect(match.snappedBounds.y).toBe(50);
    expect(match.snappedBounds.h).toBe(200);
    expect(match.horizontalGuides).toContain(250);
    expect(match.verticalGuides).toHaveLength(0);
  });

  it("snaps corner handle se simultaneously on both x and y axes", () => {
    const targetRect: ElementData = {
      id: "target-1",
      type: "rect",
      x: 300,
      y: 300,
      w: 100,
      h: 100,
      rotation: 0,
      z: "a0",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 1, opacity: 1 },
      createdBy: "u1",
    };
    const initialBounds = { x: 100, y: 100, w: 100, h: 100 };
    const rawBounds = { x: 100, y: 100, w: 198, h: 198 };

    const match = calculateResizeSmartGuides(
      ResizeHandleType.SE,
      initialBounds,
      rawBounds,
      [targetRect],
      6,
    );

    expect(match.snappedBounds).toEqual({ x: 100, y: 100, w: 200, h: 200 });
    expect(match.verticalGuides).toContain(300);
    expect(match.horizontalGuides).toContain(300);
  });

  it("ignores non-structural elements during resize snapping", () => {
    const arrowEl: ElementData = {
      id: "arrow-1",
      type: "arrow",
      x: 298,
      y: 50,
      w: 10,
      h: 100,
      rotation: 0,
      z: "a1",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 1, opacity: 1 },
      createdBy: "u1",
      points: [298, 50, 308, 150],
    };
    const initialBounds = { x: 100, y: 50, w: 100, h: 100 };
    const rawBounds = { x: 100, y: 50, w: 198, h: 100 };

    const match = calculateResizeSmartGuides(
      ResizeHandleType.E,
      initialBounds,
      rawBounds,
      [arrowEl],
      6,
    );

    expect(match.snappedBounds).toEqual(rawBounds);
    expect(match.verticalGuides).toHaveLength(0);
    expect(match.horizontalGuides).toHaveLength(0);
  });

  it("does not snap when distance exceeds threshold", () => {
    const topRect: ElementData = {
      id: "top-1",
      type: "rect",
      x: 100,
      y: 50,
      w: 200,
      h: 100,
      rotation: 0,
      z: "a0",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 1, opacity: 1 },
      createdBy: "u1",
    };
    const initialBounds = { x: 100, y: 200, w: 100, h: 80 };
    const rawBounds = { x: 100, y: 200, w: 180, h: 80 };

    const match = calculateResizeSmartGuides(
      ResizeHandleType.E,
      initialBounds,
      rawBounds,
      [topRect],
      6,
    );

    expect(match.snappedBounds).toEqual(rawBounds);
    expect(match.verticalGuides).toHaveLength(0);
  });

  it("respects minWidth preventing inverted resizing during snap", () => {
    const otherRect: ElementData = {
      id: "other-1",
      type: "rect",
      x: 148,
      y: 50,
      w: 100,
      h: 100,
      rotation: 0,
      z: "a0",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 1, opacity: 1 },
      createdBy: "u1",
    };
    const initialBounds = { x: 100, y: 100, w: 50, h: 50 };
    const rawBounds = { x: 147, y: 100, w: 3, h: 50 };

    const match = calculateResizeSmartGuides(
      ResizeHandleType.W,
      initialBounds,
      rawBounds,
      [otherRect],
      6,
      10,
      10,
    );

    expect(match.snappedBounds).toEqual(rawBounds);
    expect(match.verticalGuides).toHaveLength(0);
  });
});
