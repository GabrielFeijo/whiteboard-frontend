import * as Y from "yjs";
import { renderElement } from "@/canvas/renderers/element-renderer";
import {
  computeExportBoundingBox,
  extractSortedElementsFromDoc,
  sanitizeExportFilename,
} from "./bounding-box";

export function exportBoardAsPng(
  doc: Y.Doc,
  boardTitle: string,
  isDarkTheme: boolean
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const elements = extractSortedElementsFromDoc(doc);
      const bbox = computeExportBoundingBox(elements);

      const offscreen = document.createElement("canvas");
      const dpr = 2;
      offscreen.width = bbox.width * dpr;
      offscreen.height = bbox.height * dpr;

      const ctx = offscreen.getContext("2d");
      if (!ctx) {
        resolve();
        return;
      }

      ctx.fillStyle = isDarkTheme ? "#09090b" : "#ffffff";
      ctx.fillRect(0, 0, offscreen.width, offscreen.height);

      ctx.scale(dpr, dpr);
      ctx.translate(-bbox.minX, -bbox.minY);

      for (const el of elements) {
        renderElement(ctx, el);
      }

      offscreen.toBlob((blob) => {
        if (!blob) {
          resolve();
          return;
        }
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = sanitizeExportFilename(boardTitle, "png");
        anchor.click();
        URL.revokeObjectURL(url);
        resolve();
      }, "image/png");
    } catch (error) {
      reject(error);
    }
  });
}
