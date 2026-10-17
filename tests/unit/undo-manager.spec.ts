import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { LocalUndoManager, LOCAL_ORIGIN } from "@/collab/undo-manager";
import { getDocRoots } from "@/shared";

describe("LocalUndoManager", () => {
  it("tracks only local transactions and reverts user edits", () => {
    const doc = new Y.Doc();
    const roots = getDocRoots(doc);
    const undoManager = new LocalUndoManager(doc);

    expect(undoManager.canUndo()).toBe(false);
    expect(undoManager.canRedo()).toBe(false);

    const map = new Y.Map<unknown>();
    map.set("id", "el-1");
    map.set("type", "rect");
    map.set("x", 10);
    map.set("y", 20);
    map.set("w", 100);
    map.set("h", 50);
    map.set("rotation", 0);
    map.set("z", "a0");
    map.set("createdBy", "user-1");

    doc.transact(() => {
      roots.elements.set("el-1", map);
    }, LOCAL_ORIGIN);

    expect(roots.elements.has("el-1")).toBe(true);
    expect(undoManager.canUndo()).toBe(true);

    undoManager.undo();
    expect(roots.elements.has("el-1")).toBe(false);
    expect(undoManager.canUndo()).toBe(false);
    expect(undoManager.canRedo()).toBe(true);

    undoManager.redo();
    expect(roots.elements.has("el-1")).toBe(true);
    expect(undoManager.canUndo()).toBe(true);
    expect(undoManager.canRedo()).toBe(false);

    undoManager.destroy();
  });

  it("does not undo remote collaborators changes", () => {
    const doc = new Y.Doc();
    const roots = getDocRoots(doc);
    const undoManager = new LocalUndoManager(doc);

    const remoteMap = new Y.Map<unknown>();
    remoteMap.set("id", "remote-1");
    remoteMap.set("type", "ellipse");
    remoteMap.set("x", 200);
    remoteMap.set("y", 200);
    remoteMap.set("w", 50);
    remoteMap.set("h", 50);
    remoteMap.set("rotation", 0);
    remoteMap.set("z", "a1");
    remoteMap.set("createdBy", "remote-user");

    doc.transact(() => {
      roots.elements.set("remote-1", remoteMap);
    }, "remote-client-origin");

    expect(roots.elements.has("remote-1")).toBe(true);
    expect(undoManager.canUndo()).toBe(false);

    undoManager.undo();
    expect(roots.elements.has("remote-1")).toBe(true);

    undoManager.destroy();
  });

  it("notifies listeners on stack changes", () => {
    const doc = new Y.Doc();
    const roots = getDocRoots(doc);
    const undoManager = new LocalUndoManager(doc);

    const events: { canUndo: boolean; canRedo: boolean }[] = [];
    const unsubscribe = undoManager.onStackChange((status) => {
      events.push(status);
    });

    const map = new Y.Map<unknown>();
    map.set("id", "el-2");
    map.set("type", "rect");
    map.set("x", 0);
    map.set("y", 0);
    map.set("w", 10);
    map.set("h", 10);
    map.set("rotation", 0);
    map.set("z", "a0");
    map.set("createdBy", "user-1");

    doc.transact(() => {
      roots.elements.set("el-2", map);
    }, LOCAL_ORIGIN);

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[events.length - 1].canUndo).toBe(true);

    unsubscribe();
    undoManager.destroy();
  });
});
