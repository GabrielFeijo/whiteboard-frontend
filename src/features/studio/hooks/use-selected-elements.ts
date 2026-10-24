"use client";

import { useEffect, useState } from "react";
import type { CanvasEngine } from "@/canvas/canvas-engine";
import type { ElementData } from "@/shared";
import { useCanvasStore } from "@/store/canvas-store";

export function useSelectedElements(
  engine: CanvasEngine | null | undefined,
): ElementData[] {
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const [, setRevision] = useState(0);

  useEffect(() => {
    if (!engine) return;
    return engine.observeChanges(() => {
      setRevision((r) => r + 1);
    });
  }, [engine]);

  if (!engine || selectedIds.length === 0) {
    return [];
  }

  return engine.getSelectedElements();
}
