import * as Y from "yjs";
import { type ElementData, getDocRoots } from "@/shared";
import { LOCAL_ORIGIN } from "@/collab/undo-manager";
import { YjsElementAdapter } from "@/canvas/yjs-element-adapter";
import {
  extractSortedElementsFromDoc,
  sanitizeExportFilename,
} from "./bounding-box";

import type { WhiteboardExportData } from "../types";

export type { WhiteboardExportData };

export function exportBoardAsJson(doc: Y.Doc, boardTitle: string): void {
  const elements = extractSortedElementsFromDoc(doc);
  const data: WhiteboardExportData = {
    version: 1,
    generator: "whiteboard-canvas",
    title: boardTitle,
    exportedAt: new Date().toISOString(),
    elements,
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = sanitizeExportFilename(boardTitle, "json");
  anchor.click();
  URL.revokeObjectURL(url);
}

export function importBoardFromJson(
  doc: Y.Doc,
  jsonString: string,
  userId = "imported",
): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonString) as Partial<WhiteboardExportData>;
    if (!parsed || !Array.isArray(parsed.elements)) {
      return {
        success: false,
        count: 0,
        error: "Invalid whiteboard JSON: missing elements array",
      };
    }

    const roots = getDocRoots(doc);
    let insertedCount = 0;

    doc.transact(() => {
      for (const el of parsed.elements!) {
        if (!el || !el.id || !el.type) continue;
        const validElement: ElementData = {
          ...el,
          createdBy: el.createdBy || userId,
        };
        const ymap = YjsElementAdapter.createYMap(validElement);
        roots.elements.set(validElement.id, ymap);
        insertedCount++;
      }
    }, LOCAL_ORIGIN);

    return { success: true, count: insertedCount };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to parse JSON file";
    return { success: false, count: 0, error: message };
  }
}
