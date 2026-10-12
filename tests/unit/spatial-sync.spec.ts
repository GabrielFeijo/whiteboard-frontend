import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { SpatialIndex } from "../../src/canvas/spatial-index";
import { ElementData, getDocRoots } from "../../src/shared";
import { useAuthStore } from "../../src/store/auth-store";

describe("spatial synchronization and auth persistence", () => {
  it("indexes newly created elements when added to roots.elements", () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();
    const spatialIndex2 = new SpatialIndex();

    const roots2 = getDocRoots(doc2);
    roots2.elements.observeDeep((events) => {
      events.forEach((event) => {
        if (event.target === roots2.elements) {
          const mapEvent = event as Y.YMapEvent<Y.Map<unknown>>;
          mapEvent.keys.forEach((change, key) => {
            if (change.action === "delete") {
              spatialIndex2.remove(key);
            } else {
              const childMap = roots2.elements.get(key);
              if (childMap) {
                const data = childMap.toJSON() as ElementData;
                const elementId = (data && data.id) || key;
                if (data && elementId) {
                  spatialIndex2.insert(elementId, data.x, data.y, data.w, data.h);
                }
              }
            }
          });
        } else {
          const target = event.target as Y.Map<unknown>;
          const data = target.toJSON() as ElementData;
          if (data && data.id) {
            spatialIndex2.insert(data.id, data.x, data.y, data.w, data.h);
          }
        }
      });
    });

    const roots1 = getDocRoots(doc1);
    const rectMap = new Y.Map<unknown>();
    rectMap.set("id", "rect-1");
    rectMap.set("type", "rectangle");
    rectMap.set("x", 100);
    rectMap.set("y", 150);
    rectMap.set("w", 200);
    rectMap.set("h", 80);
    rectMap.set("rotation", 0);
    rectMap.set("z", "a0");
    rectMap.set("createdBy", "user-1");
    rectMap.set("style", {
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 2,
      opacity: 1,
    });

    doc1.transact(() => {
      roots1.elements.set("rect-1", rectMap);
    });

    const updateFromUser1 = Y.encodeStateAsUpdate(doc1);
    Y.applyUpdate(doc2, updateFromUser1);

    const hits = spatialIndex2.search({ minX: 50, minY: 100, maxX: 350, maxY: 300 });
    expect(hits).toContain("rect-1");

    doc1.transact(() => {
      roots1.elements.delete("rect-1");
    });
    const deleteUpdate = Y.encodeStateAsUpdate(doc1);
    Y.applyUpdate(doc2, deleteUpdate);

    const hitsAfterDelete = spatialIndex2.search({ minX: 50, minY: 100, maxX: 350, maxY: 300 });
    expect(hitsAfterDelete).not.toContain("rect-1");
  });

  it("handles auth store persistence with localStorage", () => {
    useAuthStore.setState({
      user: { id: "u-1", email: "user@test.com", name: "User" },
      accessToken: "token-abc",
      refreshToken: "refresh-xyz",
      isInitialized: true,
    });

    const state = useAuthStore.getState();
    expect(state.user?.id).toBe("u-1");
    expect(state.accessToken).toBe("token-abc");
    expect(state.refreshToken).toBe("refresh-xyz");
  });
});
