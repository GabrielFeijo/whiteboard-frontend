"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  MousePointer2,
  Pen,
  Square,
  StickyNote,
  Zap,
  MousePointerClick,
} from "lucide-react";
import { useI18n } from "@/i18n/context";

interface DraggableItem {
  id: string;
  x: number;
  y: number;
  type: "sticky" | "service" | "gateway" | "database";
  title: string;
  subtitle?: string;
  badge?: string;
  hasIcon?: boolean;
  color: string;
}

const INITIAL_ITEMS: DraggableItem[] = [
  {
    id: "note-1",
    x: 40,
    y: 35,
    type: "sticky",
    title: "Sprint 2026",
    subtitle: "Yjs CRDT state vectors + distributed WebSocket mesh",
    hasIcon: true,
    color: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700",
  },
  {
    id: "gateway-1",
    x: 290,
    y: 50,
    type: "gateway",
    title: "API Gateway",
    subtitle: "Auth & Rate Limit",
    badge: ":3001",
    color: "bg-blue-50 text-blue-900 border-blue-400 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-700",
  },
  {
    id: "service-1",
    x: 480,
    y: 90,
    type: "service",
    title: "WebSocket Mesh",
    subtitle: "CRDT Awareness Protocol",
    badge: ":3002",
    color: "bg-emerald-50 text-emerald-900 border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700",
  },
  {
    id: "db-1",
    x: 320,
    y: 190,
    type: "database",
    title: "Yjs State Vectors",
    subtitle: "Immutable Snapshots",
    badge: "RocksDB / Redis",
    color: "bg-purple-50 text-purple-900 border-purple-400 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-700",
  },
];

export function HeroCanvasInteractive() {
  const { t } = useI18n();
  const [items, setItems] = useState<DraggableItem[]>(INITIAL_ITEMS);
  const [activeTool, setActiveTool] = useState<"select" | "pen" | "rect" | "sticky">("select");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const item = items.find((i) => i.id === id);
    if (!item || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    dragStartOffset.current = {
      x: e.clientX - rect.left - item.x,
      y: e.clientY - rect.top - item.y,
    };
    setDraggingId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newX = Math.max(10, Math.min(rect.width - 180, e.clientX - rect.left - dragStartOffset.current.x));
      const newY = Math.max(10, Math.min(rect.height - 100, e.clientY - rect.top - dragStartOffset.current.y));

      setItems((prev) =>
        prev.map((item) => (item.id === draggingId ? { ...item, x: newX, y: newY } : item)),
      );
    },
    [draggingId],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (draggingId) {
        setDraggingId(null);
        try {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          void 0;
        }
      }
    },
    [draggingId],
  );

  return (
    <div className="relative mx-auto w-full max-w-5xl rounded-2xl border border-border-strong bg-surface p-2 sm:p-3 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border-subtle/80 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80 inline-block" />
          </div>
          <span className="hidden sm:inline font-mono text-[11px] text-text-muted">
            whiteboard://playground.canvas
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t("landing.interactive.latency")}</span>
          </span>
          <span className="hidden md:inline text-[11px] text-text-muted">
            {t("landing.interactive.activeUsers")}
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative h-[340px] sm:h-[400px] md:h-[440px] w-full overflow-hidden rounded-xl border border-border-subtle bg-canvas select-none touch-none"
      >
        <div
          className="absolute inset-0 opacity-40 dark:opacity-25 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            color: "var(--color-text-muted)",
          }}
        />

        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-xl border border-border-strong bg-surface-raised px-2 py-1 shadow-md">
          <button
            type="button"
            onClick={() => setActiveTool("select")}
            title={t("landing.interactive.toolSelect")}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
              activeTool === "select"
                ? "bg-accent-primary text-white"
                : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
            }`}
          >
            <MousePointer2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("pen")}
            title={t("landing.interactive.toolPen")}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
              activeTool === "pen"
                ? "bg-accent-primary text-white"
                : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
            }`}
          >
            <Pen className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("rect")}
            title={t("landing.interactive.toolRect")}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
              activeTool === "rect"
                ? "bg-accent-primary text-white"
                : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
            }`}
          >
            <Square className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTool("sticky")}
            title={t("landing.interactive.toolSticky")}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
              activeTool === "sticky"
                ? "bg-accent-primary text-white"
                : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
            }`}
          >
            <StickyNote className="h-3.5 w-3.5" />
          </button>
        </div>

        <svg className="absolute inset-0 h-full w-full pointer-events-none">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="currentColor" className="text-border-strong" />
            </marker>
          </defs>
          <path
            d={`M ${items[1].x + 75} ${items[1].y + 40} C ${items[1].x + 130} ${items[1].y + 40}, ${items[2].x - 30} ${items[2].y + 35}, ${items[2].x} ${items[2].y + 35}`}
            fill="none"
            stroke="currentColor"
            className="text-border-strong"
            strokeWidth="2"
            strokeDasharray="4 4"
            markerEnd="url(#arrow)"
          />
          <path
            d={`M ${items[1].x + 75} ${items[1].y + 60} C ${items[1].x + 75} ${items[3].y - 20}, ${items[3].x + 60} ${items[3].y - 20}, ${items[3].x + 60} ${items[3].y}`}
            fill="none"
            stroke="currentColor"
            className="text-border-strong"
            strokeWidth="2"
            strokeDasharray="4 4"
            markerEnd="url(#arrow)"
          />
        </svg>

        {items.map((item) => (
          <div
            key={item.id}
            onPointerDown={(e) => handlePointerDown(item.id, e)}
            style={{ transform: `translate3d(${item.x}px, ${item.y}px, 0)` }}
            className={`absolute cursor-grab active:cursor-grabbing rounded-xl border p-3 shadow-md transition-shadow hover:shadow-lg ${item.color} ${
              draggingId === item.id ? "ring-2 ring-accent-primary z-30" : "z-10"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {item.hasIcon && <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                <span className="text-xs font-bold tracking-tight">{item.title}</span>
              </div>
              {item.badge && (
                <span className="rounded-md bg-surface/60 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-text-muted">
                  {item.badge}
                </span>
              )}
            </div>
            {item.subtitle && (
              <p className="mt-1 text-[11px] leading-tight opacity-90 max-w-44">
                {item.subtitle}
              </p>
            )}
          </div>
        ))}

        <div className="absolute top-[28%] left-[22%] z-20 flex items-center gap-1.5 pointer-events-none animate-pulse">
          <MousePointer2 className="h-4 w-4 fill-blue-500 text-blue-500 drop-shadow" />
          <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
            Alice (Lead)
          </span>
        </div>

        <div className="absolute bottom-[20%] right-[18%] z-20 flex items-center gap-1.5 pointer-events-none">
          <MousePointer2 className="h-4 w-4 fill-purple-500 text-purple-500 drop-shadow" />
          <span className="rounded-full bg-purple-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
            Bruno (Arch)
          </span>
        </div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none rounded-full border border-border-subtle bg-surface/75 px-3 py-1 text-[11px] text-text-muted backdrop-blur-xs">
          <span className="flex items-center gap-1.5">
            <MousePointerClick className="h-3.5 w-3.5 text-accent-primary" />
            <span>{t("landing.interactive.tryDrag")}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
