import * as Y from "yjs";
import DOMPurify from "dompurify";
import type { ElementData } from "@/shared";
import {
  computeExportBoundingBox,
  extractSortedElementsFromDoc,
  sanitizeExportFilename,
} from "./bounding-box";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderElementToSvgMarkup(el: ElementData): string {
  const fill = el.style.fill || "transparent";
  const stroke = el.style.stroke || "#0f172a";
  const strokeWidth = el.style.strokeWidth || 2;
  const opacity = el.style.opacity ?? 1;

  switch (el.type) {
    case "rect":
      return `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" rx="4" />\n`;
    case "ellipse":
      return `<ellipse cx="${el.x + el.w / 2}" cy="${el.y + el.h / 2}" rx="${el.w / 2}" ry="${el.h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />\n`;
    case "diamond": {
      const cx = el.x + el.w / 2;
      const cy = el.y + el.h / 2;
      const d = `M ${cx} ${el.y} L ${el.x + el.w} ${cy} L ${cx} ${el.y + el.h} L ${el.x} ${cy} Z`;
      return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />\n`;
    }
    case "line":
      return `<line x1="${el.x}" y1="${el.y}" x2="${el.x + el.w}" y2="${el.y + el.h}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />\n`;
    case "arrow": {
      const fromX = el.x;
      const fromY = el.y;
      const toX = el.x + el.w;
      const toY = el.y + el.h;
      const headLen = 14;
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const a1X = toX - headLen * Math.cos(angle - Math.PI / 6);
      const a1Y = toY - headLen * Math.sin(angle - Math.PI / 6);
      const a2X = toX - headLen * Math.cos(angle + Math.PI / 6);
      const a2Y = toY - headLen * Math.sin(angle + Math.PI / 6);
      return `<line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />\n<path d="M ${toX} ${toY} L ${a1X} ${a1Y} L ${a2X} ${a2Y} Z" fill="${stroke}" opacity="${opacity}" />\n`;
    }
    case "freehand": {
      if (!el.points || el.points.length < 6) return "";
      let d = `M ${el.points[0]} ${el.points[1]}`;
      for (let i = 3; i < el.points.length; i += 3) {
        d += ` L ${el.points[i]} ${el.points[i + 1]}`;
      }
      return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" />\n`;
    }
    case "sticky": {
      let svg = `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" fill="${fill || "#fef08a"}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="4" />\n`;
      if (el.text) {
        svg += `<text x="${el.x + 12}" y="${el.y + 24}" font-family="sans-serif" font-size="14" fill="#0f172a">${escapeXml(el.text)}</text>\n`;
      }
      return svg;
    }
    case "text": {
      const safeText = escapeXml(el.text || "");
      return `<text x="${el.x}" y="${el.y + 20}" font-family="sans-serif" font-size="16" fill="${stroke}">${safeText}</text>\n`;
    }
    default:
      return "";
  }
}

export function exportBoardAsSvg(
  doc: Y.Doc,
  boardTitle: string,
  isDarkTheme: boolean
): void {
  const elements = extractSortedElementsFromDoc(doc);
  const bbox = computeExportBoundingBox(elements);

  const body = elements.map((el) => renderElementToSvgMarkup(el)).join("");
  const bgColor = isDarkTheme ? "#09090b" : "#ffffff";

  const rawSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}" width="${bbox.width}" height="${bbox.height}">
  <rect x="${bbox.minX}" y="${bbox.minY}" width="${bbox.width}" height="${bbox.height}" fill="${bgColor}" />
  ${body}
</svg>`;

  const cleanSvg = DOMPurify.sanitize(rawSvg, {
    USE_PROFILES: { svg: true, svgFilters: true },
  });

  const blob = new Blob([cleanSvg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = sanitizeExportFilename(boardTitle, "svg");
  anchor.click();
  URL.revokeObjectURL(url);
}
