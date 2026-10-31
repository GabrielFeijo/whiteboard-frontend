import * as Y from "yjs";
import DOMPurify from "dompurify";
import {
  computeConnectorCurve,
  resolveArrowEndpoints,
} from "@/canvas/connector-helper";
import { resolveRenderableImageSrc } from "@/canvas/renderers/image-renderer";
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

function renderMultilineSvgText(
  text: string,
  x: number,
  startY: number,
  lineHeight: number,
  fontSize: number,
  fill: string,
  textAnchor: "start" | "middle" = "start",
): string {
  const lines = text.split("\n");
  if (lines.length === 1) {
    return `<text x="${x}" y="${startY}" font-family="sans-serif" font-size="${fontSize}" fill="${fill}" text-anchor="${textAnchor}">${escapeXml(lines[0])}</text>\n`;
  }
  const tspans = lines
    .map(
      (line, idx) =>
        `<tspan x="${x}" dy="${idx === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  return `<text x="${x}" y="${startY}" font-family="sans-serif" font-size="${fontSize}" fill="${fill}" text-anchor="${textAnchor}">${tspans}</text>\n`;
}

function renderCenteredShapeText(el: ElementData, fill: string): string {
  if (!el.text) return "";
  const lines = el.text.split("\n");
  const lineHeight = 18;
  const totalHeight = lines.length * lineHeight;
  const startY = el.y + el.h / 2 - totalHeight / 2 + lineHeight * 0.75;
  return renderMultilineSvgText(
    el.text,
    el.x + el.w / 2,
    startY,
    lineHeight,
    14,
    fill,
    "middle",
  );
}

function renderArrowHead(
  toX: number,
  toY: number,
  angle: number,
  stroke: string,
  strokeWidth: number,
  opacity: number,
): string {
  const headLen = Math.max(10, Math.min(16, strokeWidth * 5));
  const a1X = toX - headLen * Math.cos(angle - Math.PI / 6);
  const a1Y = toY - headLen * Math.sin(angle - Math.PI / 6);
  const a2X = toX - headLen * Math.cos(angle + Math.PI / 6);
  const a2Y = toY - headLen * Math.sin(angle + Math.PI / 6);
  return `<path d="M ${toX} ${toY} L ${a1X} ${a1Y} L ${a2X} ${a2Y} Z" fill="${stroke}" opacity="${opacity}" />\n`;
}

export function renderElementToSvgMarkup(
  el: ElementData,
  getElementById?: (id: string) => ElementData | null,
): string {
  const fill = escapeXml(el.style.fill || "transparent");
  const stroke = escapeXml(el.style.stroke || "#0f172a");
  const strokeWidth = el.style.strokeWidth || 2;
  const opacity = el.style.opacity ?? 1;

  let markup = "";

  switch (el.type) {
    case "rect":
      markup =
        `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" rx="4" />\n` +
        renderCenteredShapeText(el, stroke);
      break;
    case "ellipse":
      markup =
        `<ellipse cx="${el.x + el.w / 2}" cy="${el.y + el.h / 2}" rx="${el.w / 2}" ry="${el.h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />\n` +
        renderCenteredShapeText(el, stroke);
      break;
    case "diamond": {
      const cx = el.x + el.w / 2;
      const cy = el.y + el.h / 2;
      const d = `M ${cx} ${el.y} L ${el.x + el.w} ${cy} L ${cx} ${el.y + el.h} L ${el.x} ${cy} Z`;
      markup =
        `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />\n` +
        renderCenteredShapeText(el, stroke);
      break;
    }
    case "line": {
      const { from, to } = resolveArrowEndpoints(el, getElementById);
      if (el.startBinding || el.endBinding) {
        const { cp1, cp2 } = computeConnectorCurve(
          from,
          to,
          el.startBinding?.anchor,
          el.endBinding?.anchor,
        );
        const d = `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`;
        markup = `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" stroke-linecap="round" />\n`;
      } else {
        markup = `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />\n`;
      }
      break;
    }
    case "arrow": {
      const { from, to } = resolveArrowEndpoints(el, getElementById);
      if (el.startBinding || el.endBinding) {
        const { cp1, cp2 } = computeConnectorCurve(
          from,
          to,
          el.startBinding?.anchor,
          el.endBinding?.anchor,
        );
        const d = `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`;
        const angle = Math.atan2(to.y - cp2.y, to.x - cp2.x);
        markup =
          `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" stroke-linecap="round" />\n` +
          renderArrowHead(to.x, to.y, angle, stroke, strokeWidth, opacity);
      } else {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        markup =
          `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" />\n` +
          renderArrowHead(to.x, to.y, angle, stroke, strokeWidth, opacity);
      }
      break;
    }
    case "freehand": {
      if (!el.points || el.points.length < 6) return "";
      let d = `M ${el.points[0]} ${el.points[1]}`;
      for (let i = 3; i < el.points.length; i += 3) {
        d += ` L ${el.points[i]} ${el.points[i + 1]}`;
      }
      markup = `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" />\n`;
      break;
    }
    case "sticky": {
      markup = `<rect x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" fill="${fill || "#fef08a"}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="4" />\n`;
      if (el.text) {
        markup += renderMultilineSvgText(
          el.text,
          el.x + 12,
          el.y + 24,
          18,
          14,
          "#0f172a",
        );
      }
      break;
    }
    case "text": {
      markup = renderMultilineSvgText(
        el.text || "",
        el.x,
        el.y + 20,
        20,
        16,
        stroke,
      );
      break;
    }
    case "image": {
      const resolvedSrc = resolveRenderableImageSrc(el);
      if (!resolvedSrc) return "";
      const safeSrc = escapeXml(resolvedSrc);
      markup = `<image href="${safeSrc}" x="${el.x}" y="${el.y}" width="${el.w}" height="${el.h}" preserveAspectRatio="none" opacity="${opacity}" />\n`;
      break;
    }
    default:
      return "";
  }

  const deg = el.rotation ?? 0;
  if (deg % 360 !== 0) {
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    return `<g transform="rotate(${deg} ${cx} ${cy})">\n${markup}</g>\n`;
  }

  return markup;
}

export function exportBoardAsSvg(
  doc: Y.Doc,
  boardTitle: string,
  isDarkTheme: boolean,
): void {
  const elements = extractSortedElementsFromDoc(doc);
  const elementById = new Map<string, ElementData>(
    elements.map((el) => [el.id, el]),
  );
  const bbox = computeExportBoundingBox(elements);

  const body = elements
    .map((el) => renderElementToSvgMarkup(el, (id) => elementById.get(id) ?? null))
    .join("");
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
