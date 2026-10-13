"use client";

import React, { useState } from "react";
import { Kbd } from "./kbd";

interface TooltipProps {
  label: string;
  shortcut?: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "center" | "start" | "end";
}

export function Tooltip({
  label,
  shortcut,
  children,
  side = "top",
  align = "center",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const sidePositions = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2",
  }[side];

  const alignPositions = {
    center: "left-1/2 -translate-x-1/2",
    start: "left-0",
    end: "right-0",
  }[align];

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute z-50 flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border-strong bg-surface-raised px-2 py-1 text-xs font-medium text-text-primary shadow-md backdrop-blur-md transition-opacity duration-150 ${sidePositions} ${alignPositions}`}
        >
          <span>{label}</span>
          {shortcut && <Kbd>{shortcut}</Kbd>}
        </div>
      )}
    </div>
  );
}
