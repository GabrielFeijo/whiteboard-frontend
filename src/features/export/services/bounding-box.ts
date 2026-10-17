import * as Y from "yjs";
import { type ElementData, getDocRoots } from "@/shared";
import { YjsElementAdapter } from "@/canvas/yjs-element-adapter";

export interface ExportBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function extractSortedElementsFromDoc(doc: Y.Doc): ElementData[] {
  const roots = getDocRoots(doc);
  const elements: ElementData[] = [];
  roots.elements.forEach((map) => {
    const data = YjsElementAdapter.toElementData(map);
    if (data) elements.push(data);
  });
  return elements.sort((a, b) => (a.z > b.z ? 1 : a.z < b.z ? -1 : 0));
}

export function computeExportBoundingBox(
  elements: readonly ElementData[],
  padding = 60
): ExportBoundingBox {
  if (elements.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 800,
      maxY: 600,
      width: 800,
      height: 600,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.w);
    maxY = Math.max(maxY, el.y + el.h);
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: Math.max(100, maxX - minX + padding * 2),
    height: Math.max(100, maxY - minY + padding * 2),
  };
}

export function sanitizeExportFilename(
  title: string,
  ext: "png" | "svg" | "json",
): string {
  const slug = title.toLowerCase().trim().replace(/\s+/g, "-") || "whiteboard";
  return `${slug}.${ext}`;
}
