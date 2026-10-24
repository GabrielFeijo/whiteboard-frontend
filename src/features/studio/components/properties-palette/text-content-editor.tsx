"use client";

import type React from "react";
import type { CanvasEngine } from "@/canvas/canvas-engine";

interface TextContentEditorProps {
  initialText: string;
  onChange: (text: string) => void;
  engine?: CanvasEngine | null;
  placeholder: string;
  title: string;
}

export function TextContentEditor({
  initialText,
  onChange,
  placeholder,
  title,
}: TextContentEditorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-text-secondary">
          {title}
        </label>
        <span className="text-[10px] font-mono text-text-muted">
          {initialText.length}
        </span>
      </div>
      <textarea
        value={initialText}
        onChange={handleChange}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-border-strong bg-surface p-2 text-xs text-text-primary placeholder:text-text-muted outline-none transition focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 resize-y min-h-14 shadow-2xs"
      />
    </div>
  );
}
