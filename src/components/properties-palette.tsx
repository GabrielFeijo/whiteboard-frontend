"use client";

import React from "react";
import { useCanvasStore } from "../store/canvas-store";

export function PropertiesPalette() {
  const {
    strokeColor,
    setStrokeColor,
    fillColor,
    setFillColor,
    strokeWidth,
    setStrokeWidth,
    opacity,
    setOpacity,
  } = useCanvasStore();

  const strokeColors = [
    "#0f172a",
    "#ef4444",
    "#f59e0b",
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
  ];

  const fillColors = [
    "transparent",
    "#ffffff",
    "#fee2e2",
    "#fef3c7",
    "#d1fae5",
    "#dbeafe",
    "#ede9fe",
    "#fce7f3",
    "#fef08a",
  ];

  const strokeWidths = [1, 2, 4, 8];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white/95 p-3.5 shadow-lg backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/95 w-56">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Stroke Color
        </label>
        <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
          {strokeColors.map((color) => (
            <button
              key={color}
              onClick={() => setStrokeColor(color)}
              className={`h-6 w-6 rounded-full border transition ${
                strokeColor === color
                  ? "scale-110 ring-2 ring-indigo-500 ring-offset-2"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
            title="Custom color"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Background Fill
        </label>
        <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
          {fillColors.map((color) => {
            const isTransparent = color === "transparent";
            const isSelected = fillColor === color;
            return (
              <button
                key={color}
                onClick={() => setFillColor(color)}
                className={`h-6 w-6 rounded-full border transition flex items-center justify-center ${
                  isSelected
                    ? "scale-110 ring-2 ring-indigo-500 ring-offset-2"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
                style={{ backgroundColor: isTransparent ? "#ffffff" : color }}
                title={isTransparent ? "Transparent" : color}
              >
                {isTransparent && <span className="text-[10px] text-red-500 font-bold">∅</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Stroke Width
        </label>
        <div className="mt-1.5 flex gap-1.5">
          {strokeWidths.map((w) => (
            <button
              key={w}
              onClick={() => setStrokeWidth(w)}
              className={`flex-1 rounded-lg py-1 text-xs font-semibold transition ${
                strokeWidth === w
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {w}px
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          <span>Opacity</span>
          <span>{Math.round(opacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
          className="mt-1.5 w-full accent-indigo-600"
        />
      </div>
    </div>
  );
}
