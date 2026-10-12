"use client";

import React, { useState } from "react";
import * as Y from "yjs";
import DOMPurify from "dompurify";
import { ElementData, getDocRoots } from "../shared";
import { renderElement } from "../canvas/renderers/element-renderer";
import { YjsElementAdapter } from "../canvas/yjs-element-adapter";
import { useI18n } from "../i18n";

function renderElementToSvg(el: ElementData): string {
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
        const safeText = el.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        svg += `<text x="${el.x + 12}" y="${el.y + 24}" font-family="sans-serif" font-size="14" fill="#0f172a">${safeText}</text>\n`;
      }
      return svg;
    }
    case "text": {
      const safeText = (el.text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<text x="${el.x}" y="${el.y + 20}" font-family="sans-serif" font-size="16" fill="${stroke}">${safeText}</text>\n`;
    }
    default:
      return "";
  }
}

interface ExportModalProps {
  doc: Y.Doc;
  boardTitle: string;
  onClose: () => void;
}

export function ExportModal({ doc, boardTitle, onClose }: ExportModalProps) {
  const { t } = useI18n();
  const [isExporting, setIsExporting] = useState(false);

  const getElements = (): ElementData[] => {
    const roots = getDocRoots(doc);
    const elements: ElementData[] = [];
    roots.elements.forEach((map) => {
      const data = YjsElementAdapter.toElementData(map);
      if (data) elements.push(data);
    });
    return elements.sort((a, b) => (a.z > b.z ? 1 : a.z < b.z ? -1 : 0));
  };

  const computeBoundingBox = (elements: ElementData[]) => {
    if (elements.length === 0) {
      return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    elements.forEach((el) => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.w);
      maxY = Math.max(maxY, el.y + el.h);
    });

    const padding = 40;
    minX = Math.floor(minX - padding);
    minY = Math.floor(minY - padding);
    maxX = Math.ceil(maxX + padding);
    maxY = Math.ceil(maxY + padding);

    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  };

  const handleExportPNG = async () => {
    setIsExporting(true);
    try {
      const elements = getElements();
      const bounds = computeBoundingBox(elements);

      const canvas = document.createElement("canvas");
      const dpr = 2;
      canvas.width = bounds.width * dpr;
      canvas.height = bounds.height * dpr;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context not available");

      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, bounds.width, bounds.height);

      ctx.save();
      ctx.translate(-bounds.minX, -bounds.minY);
      elements.forEach((el) => {
        renderElement(ctx, el);
      });
      ctx.restore();

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${boardTitle.toLowerCase().replace(/\s+/g, "-") || "whiteboard"}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
        onClose();
      }, "image/png");
    } catch (err) {
      console.error("PNG export failed", err);
      setIsExporting(false);
    }
  };

  const handleExportSVG = () => {
    setIsExporting(true);
    try {
      const elements = getElements();
      const bounds = computeBoundingBox(elements);

      let svgElements = "";
      elements.forEach((el) => {
        svgElements += renderElementToSvg(el);
      });

      const rawSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}" width="${bounds.width}" height="${bounds.height}">
  <rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.width}" height="${bounds.height}" fill="#ffffff" />
  ${svgElements}
</svg>`;

      const cleanSvg = DOMPurify.sanitize(rawSvg, {
        USE_PROFILES: { svg: true, svgFilters: true },
      });

      const blob = new Blob([cleanSvg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${boardTitle.toLowerCase().replace(/\s+/g, "-") || "whiteboard"}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
      onClose();
    } catch (err) {
      console.error("SVG export failed", err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {t("exportModal.title")}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          {t("exportModal.subtitle")}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleExportPNG}
            disabled={isExporting}
            className="flex items-center justify-between rounded-xl border border-zinc-200 p-3.5 text-left transition hover:border-indigo-500 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
          >
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t("exportModal.pngTitle")}
              </p>
              <p className="text-xs text-zinc-500">
                {t("exportModal.pngDescription")}
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600">.png</span>
          </button>

          <button
            onClick={handleExportSVG}
            disabled={isExporting}
            className="flex items-center justify-between rounded-xl border border-zinc-200 p-3.5 text-left transition hover:border-indigo-500 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
          >
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t("exportModal.svgTitle")}
              </p>
              <p className="text-xs text-zinc-500">
                {t("exportModal.svgDescription")}
              </p>
            </div>
            <span className="text-xs font-bold text-indigo-600">.svg</span>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
