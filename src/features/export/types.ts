import type { ElementData } from "@/shared";

export const ExportFormat = {
  PNG: "png",
  SVG: "svg",
  JSON: "json",
} as const;

export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

export interface ExportBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface WhiteboardExportData {
  version: 1;
  generator: "whiteboard-canvas";
  title: string;
  exportedAt: string;
  elements: ElementData[];
}
