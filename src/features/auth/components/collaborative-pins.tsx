"use client";

import React, { useRef, useState } from "react";
import { Zap, Pencil } from "lucide-react";

interface DraggablePinProps {
  initialClass: string;
  animationClass: string;
  name: string;
  role?: string;
  colorBg: string;
  colorBorder: string;
  colorText: string;
  cursorFill: string;
  children?: React.ReactNode;
}

function DraggablePin({
  initialClass,
  animationClass,
  name,
  role,
  colorBg,
  colorBorder,
  colorText,
  cursorFill,
  children,
}: DraggablePinProps) {
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    startPos.current = {
      x: e.clientX - currentOffset.current.x,
      y: e.clientY - currentOffset.current.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newX = e.clientX - startPos.current.x;
    const newY = e.clientY - startPos.current.y;
    currentOffset.current = { x: newX, y: newY };
    setDragOffset({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const transformStyle = dragOffset
    ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`
    : undefined;

  return (
    <div
      className={`absolute pointer-events-auto select-none ${initialClass} ${
        dragOffset ? "" : animationClass
      } ${isDragging ? "cursor-grabbing z-50 scale-105" : "cursor-grab z-20"}`}
      style={{
        transform: transformStyle,
        transition: isDragging ? "none" : "transform 0.15s ease-out",
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="relative flex flex-col items-start group">
        <div className="flex items-center gap-1.5 transition-transform group-hover:scale-105">
          <svg
            className="h-4 w-4 drop-shadow-md shrink-0 -translate-x-0.5 -translate-y-0.5"
            viewBox="0 0 24 24"
            fill={cursorFill}
          >
            <path d="M3 3l7 18 3-7 7-3L3 3z" />
          </svg>

          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-md backdrop-blur-xs border ${colorBg} ${colorBorder} ${colorText}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <span>{name}</span>
            {role && (
              <span className="opacity-80 text-[10px] font-medium">
                ({role})
              </span>
            )}
          </div>
        </div>

        {children && (
          <div className="mt-2.5 transition-all group-hover:opacity-100">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export function CollaborativePins() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-20 overflow-hidden"
      aria-hidden="true"
    >
      <DraggablePin
        initialClass="top-[18%] right-[8%] sm:right-[14%] md:right-[18%]"
        animationClass="animate-wander-alice"
        name="Alice"
        role="Editor"
        colorBg="bg-blue-600"
        colorBorder="border-blue-400"
        colorText="text-white"
        cursorFill="#2563eb"
      >
        <div className="w-36 h-20 rounded-lg border-2 border-dashed border-blue-500/70 bg-blue-500/10 flex flex-col items-center justify-center p-2 shadow-sm pointer-events-none">
          <div className="w-full flex items-center justify-between text-[9px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
            <span>#rect-card</span>
            <span>120x80</span>
          </div>
          <div className="mt-1 h-1.5 w-16 rounded-full bg-blue-500/30" />
        </div>
      </DraggablePin>

      <DraggablePin
        initialClass="bottom-[20%] left-[6%] sm:left-[12%] md:left-[16%]"
        animationClass="animate-wander-bruno"
        name="Bruno"
        colorBg="bg-purple-600"
        colorBorder="border-purple-400"
        colorText="text-white"
        cursorFill="#7c3aed"
      >
        <div className="w-36 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-950/70 p-2.5 shadow-md -rotate-2 pointer-events-none">
          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-900 dark:text-amber-200">
            <Zap className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Ideias de Sprint</span>
          </div>
          <p className="mt-1 text-[10px] text-amber-800 dark:text-amber-300 leading-tight">
            CRDT + Sincronização em tempo real
          </p>
        </div>
      </DraggablePin>

      <div className="hidden lg:block">
        <DraggablePin
          initialClass="top-[32%] left-[8%] xl:left-[12%]"
          animationClass="animate-wander-elena"
          name="Elena"
          role="Live"
          colorBg="bg-emerald-600"
          colorBorder="border-emerald-400"
          colorText="text-white"
          cursorFill="#059669"
        >
          <div className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 shadow-2xs pointer-events-none">
            <Pencil className="h-2.5 w-2.5 shrink-0" />
            <span>Desenhando formas...</span>
          </div>
        </DraggablePin>
      </div>
    </div>
  );
}
