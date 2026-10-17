import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { YjsElementRepository } from "@/canvas/repositories/yjs-element-repository";
import { SpatialIndex } from "@/canvas/spatial-index";
import { useSessionStore } from "@/features/auth/store/session-store";
import { useDashboardPrefsStore } from "@/features/boards/store/dashboard-prefs-store";
import { getDocRoots, type ElementData } from "@/shared";

describe("spatial synchronization and cookie/in-memory stores", () => {
  it("indexes newly created elements when added to YjsElementRepository", () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();
    const spatialIndex2 = new SpatialIndex();

    const repo2 = new YjsElementRepository(doc2, spatialIndex2);
    const unsub = repo2.observeChanges(() => {});
    const roots1 = getDocRoots(doc1);

    const rectMap = new Y.Map<unknown>();
    rectMap.set("id", "rect-1");
    rectMap.set("type", "rect");
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

    const parsed: ElementData | null = repo2.getById("rect-1");
    expect(parsed?.id).toBe("rect-1");

    doc1.transact(() => {
      roots1.elements.delete("rect-1");
    });
    const deleteUpdate = Y.encodeStateAsUpdate(doc1);
    Y.applyUpdate(doc2, deleteUpdate);

    const hitsAfterDelete = spatialIndex2.search({
      minX: 50,
      minY: 100,
      maxX: 350,
      maxY: 300,
    });
    expect(hitsAfterDelete).not.toContain("rect-1");
    unsub();
  });

  it("hydrates non-sensitive user metadata in useSessionStore without storing tokens", () => {
    useSessionStore.getState().hydrateUser({
      id: "u-1",
      email: "user@test.com",
      name: "User",
    });

    const state = useSessionStore.getState();
    expect(state.user?.id).toBe("u-1");
    expect(state.isInitialized).toBe(true);
    expect("accessToken" in state).toBe(false);
    expect("refreshToken" in state).toBe(false);
  });

  it("updates dashboard UI preferences via cookie-backed store", () => {
    useDashboardPrefsStore.getState().setViewMode("list");
    useDashboardPrefsStore.getState().setFilterRole("OWNER");

    const state = useDashboardPrefsStore.getState();
    expect(state.viewMode).toBe("list");
    expect(state.filterRole).toBe("OWNER");
  });
});
