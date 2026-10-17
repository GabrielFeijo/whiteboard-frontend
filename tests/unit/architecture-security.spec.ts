import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { CanvasEventEmitter } from "@/canvas/canvas-events";
import { YjsElementAdapter } from "@/canvas/yjs-element-adapter";
import { parseAwarenessStates } from "@/collab/typed-awareness";
import {
  computeExportBoundingBox,
  sanitizeExportFilename,
} from "@/features/export/services/bounding-box";
import { queryKeys } from "@/lib/api/query-keys";
import {
  COOKIE_NAMES,
  parseCookieString,
  zustandCookieStorage,
} from "@/lib/cookies/cookie-storage";

describe("Architecture, Security, and Strict Typing Modules", () => {
  it("parses cookie headers and exposes typed COOKIE_NAMES without localStorage", () => {
    expect(COOKIE_NAMES.ACCESS_TOKEN).toBe("wb_access_token");
    expect(COOKIE_NAMES.REFRESH_TOKEN).toBe("wb_refresh_token");
    expect(COOKIE_NAMES.THEME).toBe("wb_theme");
    expect(COOKIE_NAMES.LOCALE).toBe("wb_locale");
    expect(COOKIE_NAMES.DASHBOARD_PREFS).toBe("wb_dashboard_prefs");

    const header =
      "wb_theme=dark; wb_locale=pt; wb_dashboard_prefs=%7B%22viewMode%22%3A%22grid%22%7D";
    expect(parseCookieString(header, COOKIE_NAMES.THEME)).toBe("dark");
    expect(parseCookieString(header, COOKIE_NAMES.LOCALE)).toBe("pt");
    expect(parseCookieString(header, COOKIE_NAMES.DASHBOARD_PREFS)).toBe(
      '{"viewMode":"grid"}'
    );
    expect(zustandCookieStorage).toBeDefined();
  });

  it("emits and unsubscribes typed canvas events via CanvasEventEmitter", () => {
    const emitter = new CanvasEventEmitter();
    const receivedCount: number[] = [];

    const unsub = emitter.on("focusTextInput", () => {
      receivedCount.push(1);
    });

    emitter.emit("focusTextInput", { elementId: "el-1" });
    expect(receivedCount).toEqual([1]);

    unsub();
    emitter.emit("focusTextInput", { elementId: "el-2" });
    expect(receivedCount).toEqual([1]);
  });

  it("validates Y.Map structures at runtime in YjsElementAdapter without unsafe casts", () => {
    const doc = new Y.Doc();
    const invalidMap = new Y.Map<unknown>();
    doc.getMap("test").set("invalid", invalidMap);
    invalidMap.set("id", 12345);

    expect(YjsElementAdapter.toElementData(invalidMap)).toBeNull();

    const validMap = YjsElementAdapter.createYMap({
      id: "el-1",
      type: "rect",
      x: 10,
      y: 20,
      w: 100,
      h: 50,
      rotation: 0,
      z: "a0",
      createdBy: "u-1",
      style: {
        fill: "#ffffff",
        stroke: "#0f172a",
        strokeWidth: 2,
        opacity: 1,
      },
    });
    doc.getMap("test").set("valid", validMap);

    const parsed = YjsElementAdapter.toElementData(validMap);
    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe("el-1");
    expect(parsed?.type).toBe("rect");
    expect(parsed?.w).toBe(100);
  });

  it("computes export bounding boxes and sanitizes filenames", () => {
    const emptyBox = computeExportBoundingBox([]);
    expect(emptyBox.width).toBe(800);
    expect(emptyBox.height).toBe(600);

    const box = computeExportBoundingBox(
      [
        {
          id: "1",
          type: "rect",
          x: 10,
          y: 20,
          w: 100,
          h: 80,
          rotation: 0,
          z: "a0",
          createdBy: "u1",
          style: { fill: "#fff", stroke: "#000", strokeWidth: 2, opacity: 1 },
        },
      ],
      20
    );
    expect(box.minX).toBe(-10);
    expect(box.minY).toBe(0);
    expect(box.width).toBe(140);
    expect(box.height).toBe(120);

    expect(sanitizeExportFilename("Sprint Planning 2026", "svg")).toBe(
      "sprint-planning-2026.svg"
    );
  });

  it("filters awareness states safely with Zod runtime validation", () => {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    awareness.setLocalStateField("user", {
      id: "u1",
      name: "Alice",
      color: "#3b82f6",
      role: "OWNER",
    });
    awareness.setLocalStateField("cursor", { x: 42, y: 84 });

    const collaborators = parseAwarenessStates(awareness);
    expect(collaborators).toHaveLength(1);
    expect(collaborators[0].user.name).toBe("Alice");
    expect(collaborators[0].cursor).toEqual({ x: 42, y: 84 });
  });

  it("builds consistent hierarchical TanStack Query keys", () => {
    expect(queryKeys.boards.all).toEqual(["boards"]);
    expect(queryKeys.boards.detail("b-1", "tok", "u-1")).toEqual([
      "board",
      "b-1",
      "tok",
      "u-1",
    ]);
    expect(queryKeys.boards.snapshots("b-1")).toEqual(["snapshots", "b-1"]);
  });
});
