import { afterEach, describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  exportBoardAsJson,
  importBoardFromJson,
} from "@/features/export/services/json-exporter";
import { getDocRoots } from "@/shared";
import { YjsElementAdapter } from "@/canvas/yjs-element-adapter";

describe("JSON Exporter & Importer Service", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalDocument = (globalThis as Record<string, unknown>).document;

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    if (originalDocument === undefined) {
      delete (globalThis as Record<string, unknown>).document;
    } else {
      (globalThis as Record<string, unknown>).document = originalDocument;
    }
  });

  it("exports elements from Y.Doc to valid JSON structure and roundtrips back", async () => {
    const doc = new Y.Doc();
    const roots = getDocRoots(doc);

    const el1 = {
      id: "rect-1",
      type: "rect" as const,
      x: 100,
      y: 150,
      w: 200,
      h: 80,
      rotation: 0,
      z: "a0",
      style: {
        fill: "#e0e7ff",
        stroke: "#4338ca",
        strokeWidth: 2,
        opacity: 1,
      },
      createdBy: "user-1",
    };

    const map1 = YjsElementAdapter.createYMap(el1);
    roots.elements.set(el1.id, map1);

    let capturedBlob: Blob | null = null;
    let clickedDownloadName: string | null = null;

    URL.createObjectURL = (blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    };
    URL.revokeObjectURL = () => {};

    (globalThis as Record<string, unknown>).document = {
      createElement: (tag: string) => {
        if (tag === "a") {
          return {
            tagName: "A",
            download: "",
            href: "",
            click: function (this: { download: string }) {
              clickedDownloadName = this.download;
            },
          };
        }
        return {};
      },
    };

    exportBoardAsJson(doc, "Architecture Board");

    expect(capturedBlob).not.toBeNull();
    expect(clickedDownloadName).toBe("architecture-board.json");

    const exportedText = await (capturedBlob as unknown as Blob).text();
    const targetDoc = new Y.Doc();
    const result = importBoardFromJson(targetDoc, exportedText, "importer-user");

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);

    const targetRoots = getDocRoots(targetDoc);
    expect(targetRoots.elements.has("rect-1")).toBe(true);

    const importedData = YjsElementAdapter.toElementData(
      targetRoots.elements.get("rect-1")!,
    );
    expect(importedData?.type).toBe("rect");
    expect(importedData?.x).toBe(100);
    expect(importedData?.w).toBe(200);
  });

  it("handles corrupted or invalid JSON import gracefully without throwing", () => {
    const doc = new Y.Doc();
    const badJson = "{ invalid json string ";

    const result = importBoardFromJson(doc, badJson);
    expect(result.success).toBe(false);
    expect(result.count).toBe(0);
    expect(result.error).toBeDefined();

    const missingElements = JSON.stringify({ title: "No elements" });
    const result2 = importBoardFromJson(doc, missingElements);
    expect(result2.success).toBe(false);
    expect(result2.count).toBe(0);
  });

  it("drops elements that fail ElementDataSchema validation during JSON import", () => {
    const doc = new Y.Doc();
    const payload = JSON.stringify({
      version: 1,
      elements: [
        {
          id: "invalid-el",
          type: "not-a-valid-type",
          x: 0,
          y: 0,
        },
        {
          id: "valid-el",
          type: "rect",
          x: 10,
          y: 20,
          w: 100,
          h: 80,
          rotation: 0,
          z: "a0",
          style: {
            fill: "#ffffff",
            stroke: "#000000",
            strokeWidth: 2,
            opacity: 1,
          },
        },
      ],
    });

    const result = importBoardFromJson(doc, payload, "u1");
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    const roots = getDocRoots(doc);
    expect(roots.elements.has("invalid-el")).toBe(false);
    expect(roots.elements.has("valid-el")).toBe(true);
  });
});
