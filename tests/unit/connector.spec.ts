import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  findNearestAnchor,
  getAnchorPoint,
  getNearbyAnchorPoints,
  resolveArrowEndpoints,
} from "@/canvas/connector-helper";
import { YjsElementRepository } from "@/canvas/repositories/yjs-element-repository";
import { SpatialIndex } from "@/canvas/spatial-index";
import { YjsElementAdapter } from "@/canvas/yjs-element-adapter";
import { ElementData } from "@/shared";

function makeShape(id: string, x: number, y: number, w: number, h: number): ElementData {
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

describe("Smart Connectors and Magnetic Arrows", () => {
  it("calculates anchor points correctly", () => {
    const shape = makeShape("s1", 100, 200, 100, 80);
    expect(getAnchorPoint(shape, "top")).toEqual({ x: 150, y: 200 });
    expect(getAnchorPoint(shape, "bottom")).toEqual({ x: 150, y: 280 });
    expect(getAnchorPoint(shape, "left")).toEqual({ x: 100, y: 240 });
    expect(getAnchorPoint(shape, "right")).toEqual({ x: 200, y: 240 });
  });

  it("finds the nearest anchor point within threshold", () => {
    const shape = makeShape("s1", 100, 200, 100, 80);
    const match = findNearestAnchor({ x: 152, y: 202 }, [shape], 10);
    expect(match).not.toBeNull();
    expect(match?.elementId).toBe("s1");
    expect(match?.anchor).toBe("top");
    expect(match?.pt).toEqual({ x: 150, y: 200 });

    const tooFar = findNearestAnchor({ x: 0, y: 0 }, [shape], 10);
    expect(tooFar).toBeNull();
  });

  it("finds the nearest anchor when point is inside shape bounds", () => {
    const shape = makeShape("s1", 100, 100, 200, 200);
    const insideNearTop = findNearestAnchor({ x: 200, y: 130 }, [shape], 10);
    expect(insideNearTop).not.toBeNull();
    expect(insideNearTop?.elementId).toBe("s1");
    expect(insideNearTop?.anchor).toBe("top");
    expect(insideNearTop?.pt).toEqual({ x: 200, y: 100 });

    const insideNearRight = findNearestAnchor({ x: 280, y: 200 }, [shape], 10);
    expect(insideNearRight).not.toBeNull();
    expect(insideNearRight?.anchor).toBe("right");
    expect(insideNearRight?.pt).toEqual({ x: 300, y: 200 });
  });

  it("collects candidate anchor points from nearby shapes", () => {
    const shape = makeShape("s1", 100, 100, 100, 100);
    const nearby = getNearbyAnchorPoints({ x: 120, y: 120 }, [shape], 100);
    expect(nearby).toHaveLength(4);
    expect(nearby).toContainEqual({ x: 150, y: 100 });
    expect(nearby).toContainEqual({ x: 200, y: 150 });
  });

  it("resolves dynamic arrow endpoints based on bound shapes", () => {
    const shapeA = makeShape("a", 0, 0, 100, 100);
    const shapeB = makeShape("b", 300, 0, 100, 100);

    const arrow: ElementData = {
      id: "arr",
      type: "arrow",
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      rotation: 0,
      z: "a1",
      style: { fill: "transparent", stroke: "#000", strokeWidth: 2, opacity: 1 },
      createdBy: "user-1",
      startBinding: { elementId: "a", anchor: "right" },
      endBinding: { elementId: "b", anchor: "left" },
    };

    const getEl = (id: string) => (id === "a" ? shapeA : id === "b" ? shapeB : null);
    const resolved = resolveArrowEndpoints(arrow, getEl);

    expect(resolved.from).toEqual({ x: 100, y: 50 });
    expect(resolved.to).toEqual({ x: 300, y: 50 });
  });

  it("syncs connected arrows coordinates in repository when shape moves", () => {
    const doc = new Y.Doc();
    const spatialIndex = new SpatialIndex();
    const repo = new YjsElementRepository(doc, spatialIndex);

    const shapeA = makeShape("a", 0, 0, 100, 100);
    const shapeB = makeShape("b", 300, 0, 100, 100);
    const arrow: ElementData = {
      id: "arr",
      type: "arrow",
      x: 100,
      y: 50,
      w: 200,
      h: 0,
      rotation: 0,
      z: "a2",
      style: { fill: "transparent", stroke: "#000", strokeWidth: 2, opacity: 1 },
      createdBy: "user-1",
      startBinding: { elementId: "a", anchor: "right" },
      endBinding: { elementId: "b", anchor: "left" },
    };

    repo.commitElement(shapeA);
    repo.commitElement(shapeB);
    repo.commitElement(arrow);

    const elementsMap = repo.getElementsMap();
    const mapA = elementsMap.get("a")!;
    mapA.set("x", 50);
    mapA.set("y", 100);

    repo.syncConnectedArrows(["a"]);

    const updatedArrow = repo.getById("arr");
    expect(updatedArrow?.x).toBe(150);
    expect(updatedArrow?.y).toBe(50);
    expect(updatedArrow?.w).toBe(150);
    expect(updatedArrow?.h).toBe(100);
    expect(updatedArrow?.points).toEqual([150, 150, 300, 50]);
  });

  it("removes startBinding/endBinding when updated with null and preserves when undefined", () => {
    const arrow: ElementData = {
      id: "arr-unbind",
      type: "arrow",
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      rotation: 0,
      z: "a1",
      style: { fill: "transparent", stroke: "#000", strokeWidth: 2, opacity: 1 },
      createdBy: "user-1",
      startBinding: { elementId: "a", anchor: "right" },
      endBinding: { elementId: "b", anchor: "left" },
    };

    const doc = new Y.Doc();
    const ymap = YjsElementAdapter.createYMap(arrow);
    doc.getMap("elements").set(arrow.id, ymap);
    expect(ymap.get("startBinding")).toEqual({ elementId: "a", anchor: "right" });

    YjsElementAdapter.updateYMap(ymap, { x: 10 });
    expect(ymap.get("startBinding")).toEqual({ elementId: "a", anchor: "right" });

    YjsElementAdapter.updateYMap(ymap, { startBinding: null });
    expect(ymap.get("startBinding")).toBeUndefined();
    expect(ymap.get("endBinding")).toEqual({ elementId: "b", anchor: "left" });
  });

  it("clears orphaned arrow bindings when a bound shape is deleted", () => {
    const doc = new Y.Doc();
    const spatialIndex = new SpatialIndex();
    const repo = new YjsElementRepository(doc, spatialIndex);

    const shapeA = makeShape("a", 0, 0, 100, 100);
    const shapeB = makeShape("b", 300, 0, 100, 100);
    const arrow: ElementData = {
      id: "arr",
      type: "arrow",
      x: 100,
      y: 50,
      w: 200,
      h: 0,
      rotation: 0,
      z: "a2",
      style: { fill: "transparent", stroke: "#000", strokeWidth: 2, opacity: 1 },
      createdBy: "user-1",
      startBinding: { elementId: "a", anchor: "right" },
      endBinding: { elementId: "b", anchor: "left" },
    };

    repo.commitElement(shapeA);
    repo.commitElement(shapeB);
    repo.commitElement(arrow);

    repo.deleteByIds(["a"]);

    const updatedArrow = repo.getById("arr");
    expect(updatedArrow?.startBinding).toBeUndefined();
    expect(updatedArrow?.endBinding).toEqual({ elementId: "b", anchor: "left" });
  });

  it("does not emit untagged Y.Doc mutations during indexAllElements and cleans up observer on destroy", () => {
    const doc = new Y.Doc();
    const spatialIndex = new SpatialIndex();
    const repo = new YjsElementRepository(doc, spatialIndex);

    const arrow: ElementData = {
      id: "arr-readonly",
      type: "arrow",
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      points: [25, 30, 125, 180],
      rotation: 0,
      z: "a1",
      style: { fill: "transparent", stroke: "#000", strokeWidth: 2, opacity: 1 },
      createdBy: "user-1",
    };

    repo.commitElement(arrow);

    let updateCount = 0;
    doc.on("update", () => {
      updateCount += 1;
    });

    repo.indexAllElements();
    expect(updateCount).toBe(0);
    expect(spatialIndex.search({ minX: 20, minY: 20, maxX: 130, maxY: 190 })).toContain(
      "arr-readonly",
    );

    let dirtyNotifications = 0;
    repo.observeChanges(() => {
      dirtyNotifications += 1;
    });
    repo.destroy();

    const map = repo.getElementsMap().get("arr-readonly");
    map?.set("x", 99);
    expect(dirtyNotifications).toBe(0);
  });
});
