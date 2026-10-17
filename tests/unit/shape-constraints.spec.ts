import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { CanvasEventEmitter } from "@/canvas/canvas-events";
import { SpatialIndex } from "@/canvas/spatial-index";
import { ShapeTool } from "@/canvas/tools/shape-tool";
import type { CanvasHost, ToolContext } from "@/canvas/tools/tool.interface";
import { Viewport } from "@/canvas/viewport";
import { LocalUndoManager } from "@/collab/undo-manager";
import type { ElementData } from "@/shared";

function createMockHost(): CanvasHost {
  const doc = new Y.Doc();
  let draft: { type: ElementData["type"]; x: number; y: number; w: number; h: number } | null = null;

  return {
    doc,
    viewport: new Viewport(),
    spatialIndex: new SpatialIndex(),
    undoManager: new LocalUndoManager(doc),
    userId: "user-1",
    role: "EDITOR",
    events: new CanvasEventEmitter(),
    setDirty: vi.fn(),
    getNextZIndex: vi.fn(() => "a0"),
    hitTest: vi.fn(() => null),
    getSelectedElements: vi.fn(() => []),
    syncStoreWithSelection: vi.fn(),
    setSelectBox: vi.fn(),
    getSelectBox: vi.fn(() => null),
    setFreehandDraft: vi.fn(),
    getFreehandDraft: vi.fn(() => []),
    setShapeDraft: vi.fn((d) => {
      draft = d;
    }),
    getShapeDraft: vi.fn(() => draft),
    commitElement: vi.fn(),
    expandSelectionGroups: vi.fn((ids) => [...ids]),
    setGuides: vi.fn(),
    getGuides: vi.fn(() => null),
    getOtherElements: vi.fn(() => []),
    syncConnectedArrows: vi.fn(),
    setSnapIndicator: vi.fn(),
    getSnapIndicator: vi.fn(() => null),
    getElementById: vi.fn(() => null),
  };
}

function createPointerContext(
  worldPt: { x: number; y: number },
  shiftKey = false,
  isPointerDown = true,
): ToolContext {
  return {
    worldPt,
    screenPt: worldPt,
    isPointerDown,
    event: { shiftKey } as unknown as PointerEvent,
  };
}

describe("ShapeTool Aspect Ratio Constraints", () => {
  let host: ReturnType<typeof createMockHost>;

  beforeEach(() => {
    host = createMockHost();
  });

  it("draws non-constrained rectangle with free dimensions when Shift is not held", () => {
    const tool = new ShapeTool("rect", host);

    tool.onPointerDown(createPointerContext({ x: 100, y: 100 }));
    tool.onPointerMove(createPointerContext({ x: 250, y: 180 }, false));

    const draft = host.getShapeDraft();
    expect(draft).toEqual({
      type: "rect",
      x: 100,
      y: 100,
      w: 150,
      h: 80,
    });

    tool.onPointerUp(createPointerContext({ x: 250, y: 180 }, false));
    expect(host.commitElement).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "rect",
        x: 100,
        y: 100,
        w: 150,
        h: 80,
      }),
    );
  });

  it("constrains rectangle to a perfect 1:1 square when Shift is held", () => {
    const tool = new ShapeTool("rect", host);

    tool.onPointerDown(createPointerContext({ x: 100, y: 100 }));
    tool.onPointerMove(createPointerContext({ x: 250, y: 180 }, true));

    const draft = host.getShapeDraft();
    expect(draft).toEqual({
      type: "rect",
      x: 100,
      y: 100,
      w: 150,
      h: 150,
    });

    tool.onPointerUp(createPointerContext({ x: 250, y: 180 }, true));
    expect(host.commitElement).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "rect",
        x: 100,
        y: 100,
        w: 150,
        h: 150,
      }),
    );
  });

  it("constrains ellipse to a perfect circle when Shift is held", () => {
    const tool = new ShapeTool("ellipse", host);

    tool.onPointerDown(createPointerContext({ x: 50, y: 50 }));
    tool.onPointerMove(createPointerContext({ x: 90, y: 150 }, true));

    const draft = host.getShapeDraft();
    expect(draft?.w).toBe(100);
    expect(draft?.h).toBe(100);

    tool.onPointerUp(createPointerContext({ x: 90, y: 150 }, true));
    expect(host.commitElement).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ellipse",
        w: 100,
        h: 100,
      }),
    );
  });

  it("handles negative quadrant dragging with Shift constraint correctly", () => {
    const tool = new ShapeTool("rect", host);

    tool.onPointerDown(createPointerContext({ x: 200, y: 200 }));
    tool.onPointerMove(createPointerContext({ x: 80, y: 140 }, true));

    const draft = host.getShapeDraft();
    expect(draft).toEqual({
      type: "rect",
      x: 200 - 120,
      y: 200 - 120,
      w: 120,
      h: 120,
    });
  });

  it("snaps line to 45 degree increments when Shift is held", () => {
    const tool = new ShapeTool("line", host);

    tool.onPointerDown(createPointerContext({ x: 0, y: 0 }));
    tool.onPointerMove(createPointerContext({ x: 100, y: 15 }, true));

    const draft = host.getShapeDraft();
    expect(draft?.type).toBe("line");
    expect(draft?.x).toBe(0);
    expect(draft?.y).toBe(0);
    expect(draft?.h).toBeCloseTo(0, 1);
    expect(draft?.w).toBeCloseTo(101.1, 0);
  });

  it("does not start drawing if role is VIEWER", () => {
    const viewerHost: CanvasHost = {
      ...host,
      role: "VIEWER",
    };
    const tool = new ShapeTool("rect", viewerHost);

    tool.onPointerDown(createPointerContext({ x: 10, y: 10 }));
    expect(viewerHost.setShapeDraft).not.toHaveBeenCalled();
  });
});
