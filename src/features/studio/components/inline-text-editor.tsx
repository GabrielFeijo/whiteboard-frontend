"use client";

import { useEffect, useRef, useState } from "react";
import type { CanvasEngine } from "@/canvas/canvas-engine";
import { ElementType } from "@/shared";
import { useCanvasStore } from "@/store/canvas-store";

interface InlineTextEditorProps {
  engine: CanvasEngine | null;
}

export function InlineTextEditor({ engine }: InlineTextEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const zoom = useCanvasStore((s) => s.zoom);
  const pan = useCanvasStore((s) => s.pan);
  const selectedIds = useCanvasStore((s) => s.selectedIds);

  useEffect(() => {
    if (!engine) return;
    return engine.events.on("focusTextInput", ({ elementId }) => {
      const el = engine.getElementById(elementId);
      if (!el || el.locked) return;
      setEditingId(elementId);
      setDraftText(el.text ?? "");
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      });
    });
  }, [engine]);

  const activeEditingId =
    editingId && selectedIds.includes(editingId) ? editingId : null;

  if (!engine || !activeEditingId) return null;

  const element = engine.getElementById(activeEditingId);
  if (!element) return null;

  const screenPos = {
    x: element.x * zoom + pan.x,
    y: element.y * zoom + pan.y,
  };
  const width = Math.max(120, element.w * zoom);
  const height = Math.max(44, element.h * zoom);

  const isCenteredShape =
    element.type === ElementType.RECT ||
    element.type === ElementType.ELLIPSE ||
    element.type === ElementType.DIAMOND;

  const handleClose = () => {
    engine.undoManager.stopCapturing();
    setEditingId(null);
  };

  return (
    <div
      style={{
        left: `${screenPos.x}px`,
        top: `${screenPos.y}px`,
        width: `${width}px`,
        minHeight: `${height}px`,
      }}
      className="absolute z-30 pointer-events-auto"
    >
      <textarea
        ref={textareaRef}
        value={draftText}
        onChange={(e) => {
          const val = e.target.value;
          setDraftText(val);
          engine.updateSelectedText(val);
        }}
        onBlur={handleClose}
        onKeyDown={(e) => {
          if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
            e.preventDefault();
            e.stopPropagation();
            handleClose();
          }
        }}
        style={{
          fontSize: `${Math.max(12, Math.round((element.type === ElementType.TEXT ? 16 : 14) * zoom))}px`,
          minHeight: `${height}px`,
        }}
        className={`w-full h-full rounded-lg border-2 border-accent-primary bg-surface-raised/95 p-2 text-text-primary shadow-xl outline-none resize-none backdrop-blur-xs ${
          isCenteredShape ? "text-center" : "text-left"
        }`}
      />
    </div>
  );
}
