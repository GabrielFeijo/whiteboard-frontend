"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronDown, Map } from "lucide-react";
import type { CanvasEngine } from "@/canvas/canvas-engine";
import { computeExportBoundingBox } from "@/features/export/services/bounding-box";
import { useI18n } from "@/i18n/context";
import { useCanvasStore } from "@/store/canvas-store";

interface MinimapProps {
  engine: CanvasEngine | null;
}

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 110;

export function Minimap({ engine }: MinimapProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);

  const { pan, zoom } = useCanvasStore();

  const drawMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engine) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const elements = engine.getAllElements();
    const bbox = computeExportBoundingBox(elements, 300);

    const scaleX = MINIMAP_WIDTH / bbox.width;
    const scaleY = MINIMAP_HEIGHT / bbox.height;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (MINIMAP_WIDTH - bbox.width * scale) / 2;
    const offsetY = (MINIMAP_HEIGHT - bbox.height * scale) / 2;

    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    for (const el of elements) {
      const ex = (el.x - bbox.minX) * scale + offsetX;
      const ey = (el.y - bbox.minY) * scale + offsetY;
      const ew = Math.max(2, el.w * scale);
      const eh = Math.max(2, el.h * scale);

      ctx.fillStyle = el.style.fill && el.style.fill !== "transparent"
        ? el.style.fill
        : (el.style.stroke || "#6366f1");
      ctx.globalAlpha = Math.max(0.3, el.style.opacity ?? 0.8);

      if (el.type === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(ex + ew / 2, ey + eh / 2, ew / 2, eh / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(ex, ey, ew, eh);
      }
    }

    ctx.globalAlpha = 1;

    const visibleWorld = engine.viewport.getVisibleWorldBounds(
      engine.overlayCanvas.width / (window.devicePixelRatio || 1),
      engine.overlayCanvas.height / (window.devicePixelRatio || 1)
    );

    const vx = (visibleWorld.minX - bbox.minX) * scale + offsetX;
    const vy = (visibleWorld.minY - bbox.minY) * scale + offsetY;
    const vw = (visibleWorld.maxX - visibleWorld.minX) * scale;
    const vh = (visibleWorld.maxY - visibleWorld.minY) * scale;

    ctx.fillStyle = "rgba(99, 102, 241, 0.12)";
    ctx.fillRect(vx, vy, vw, vh);

    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx, vy, vw, vh);
  }, [engine]);

  useEffect(() => {
    if (!isOpen) return;
    drawMinimap();
  }, [isOpen, pan, zoom, drawMinimap]);

  useEffect(() => {
    if (!isOpen || !engine) return;
    const interval = setInterval(drawMinimap, 500);
    return () => clearInterval(interval);
  }, [isOpen, engine, drawMinimap]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engine) return;
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleMinimapNavigation(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    handleMinimapNavigation(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleMinimapNavigation = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engine || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const elements = engine.getAllElements();
    const bbox = computeExportBoundingBox(elements, 300);

    const scaleX = MINIMAP_WIDTH / bbox.width;
    const scaleY = MINIMAP_HEIGHT / bbox.height;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (MINIMAP_WIDTH - bbox.width * scale) / 2;
    const offsetY = (MINIMAP_HEIGHT - bbox.height * scale) / 2;

    const targetWorldX = bbox.minX + (clickX - offsetX) / scale;
    const targetWorldY = bbox.minY + (clickY - offsetY) / scale;

    const screenW = engine.overlayCanvas.width / (window.devicePixelRatio || 1);
    const screenH = engine.overlayCanvas.height / (window.devicePixelRatio || 1);

    const newPanX = screenW / 2 - targetWorldX * engine.viewport.zoom;
    const newPanY = screenH / 2 - targetWorldY * engine.viewport.zoom;

    engine.setViewport({ x: newPanX, y: newPanY }, engine.viewport.zoom);
    drawMinimap();
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong bg-surface-raised/95 text-text-secondary shadow-md backdrop-blur-md transition-all hover:bg-surface-hover hover:text-text-primary active:scale-95"
        title={t("studio.minimap.toggle")}
        aria-label={t("studio.minimap.toggle")}
      >
        <Map className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border-strong bg-surface-raised/95 shadow-xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-100 select-none">
      <div className="flex items-center justify-between border-b border-border-subtle px-2.5 py-1.5 bg-surface/50">
        <span className="text-[11px] font-semibold text-text-secondary flex items-center gap-1.5">
          <Map className="h-3 w-3 text-accent-primary" />
          {t("studio.minimap.title")}
        </span>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded p-0.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          title={t("common.actions.close")}
          aria-label={t("common.actions.close")}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative p-1 bg-canvas/60">
        <canvas
          ref={canvasRef}
          width={MINIMAP_WIDTH}
          height={MINIMAP_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="cursor-crosshair rounded-lg border border-border-subtle bg-surface/80"
          style={{ width: `${MINIMAP_WIDTH}px`, height: `${MINIMAP_HEIGHT}px` }}
        />
      </div>
    </div>
  );
}
