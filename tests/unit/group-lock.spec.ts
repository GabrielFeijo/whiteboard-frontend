import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { YjsElementRepository } from "@/canvas/repositories/yjs-element-repository";
import { SpatialIndex } from "@/canvas/spatial-index";
import { ElementData } from "@/shared";

function createTestElement(id: string, x: number, y: number, locked = false): ElementData {
  return {
    id,
    type: "rect",
    x,
    y,
    w: 100,
    h: 60,
    rotation: 0,
    z: "a0",
    style: { fill: "#fff", stroke: "#000", strokeWidth: 1, opacity: 1 },
    createdBy: "user-1",
    locked,
  };
}

describe("Group and Lock functionality", () => {
  it("groups elements and expands selection to group members", () => {
    const doc = new Y.Doc();
    const spatialIndex = new SpatialIndex();
    const repo = new YjsElementRepository(doc, spatialIndex);

    const el1 = createTestElement("el-1", 10, 10);
    const el2 = createTestElement("el-2", 150, 10);
    const el3 = createTestElement("el-3", 300, 10);

    repo.commitElement(el1);
    repo.commitElement(el2);
    repo.commitElement(el3);

    const groupId = repo.groupElements(["el-1", "el-2"]);
    expect(groupId).toBeDefined();

    const stored1 = repo.getById("el-1");
    const stored2 = repo.getById("el-2");
    const stored3 = repo.getById("el-3");

    expect(stored1?.groupId).toBe(groupId);
    expect(stored2?.groupId).toBe(groupId);
    expect(stored3?.groupId).toBeUndefined();

    const expanded = repo.expandSelectionGroups(["el-1"]);
    expect(expanded).toContain("el-1");
    expect(expanded).toContain("el-2");
    expect(expanded).not.toContain("el-3");

    repo.ungroupElements(["el-1"]);
    expect(repo.getById("el-1")?.groupId).toBeUndefined();
    expect(repo.getById("el-2")?.groupId).toBeUndefined();
  });

  it("locks and unlocks elements and prevents deletion when locked", () => {
    const doc = new Y.Doc();
    const spatialIndex = new SpatialIndex();
    const repo = new YjsElementRepository(doc, spatialIndex);

    const el1 = createTestElement("el-1", 10, 10);
    const el2 = createTestElement("el-2", 150, 10);

    repo.commitElement(el1);
    repo.commitElement(el2);

    repo.lockElements(["el-1"]);
    expect(repo.getById("el-1")?.locked).toBe(true);
    expect(repo.getById("el-2")?.locked).toBeFalsy();

    repo.deleteByIds(["el-1", "el-2"]);
    expect(repo.getById("el-1")).not.toBeNull();
    expect(repo.getById("el-2")).toBeNull();

    repo.toggleLockElements(["el-1"]);
    expect(repo.getById("el-1")?.locked).toBeFalsy();

    repo.deleteByIds(["el-1"]);
    expect(repo.getById("el-1")).toBeNull();
  });
});
