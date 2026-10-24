"use client";

import { Keyboard, X } from "lucide-react";
import { useI18n } from "@/i18n/context";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutRow {
  label: string;
  keys: string[];
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const { t } = useI18n();

  if (!isOpen) return null;

  const sections: Array<{ title: string; items: ShortcutRow[] }> = [
    {
      title: t("studio.shortcutsModal.tools"),
      items: [
        { label: t("studio.toolbar.tools.select"), keys: ["V"] },
        { label: t("studio.toolbar.tools.hand"), keys: ["H", "Space"] },
        { label: t("studio.toolbar.tools.rect"), keys: ["R"] },
        { label: t("studio.toolbar.tools.ellipse"), keys: ["O"] },
        { label: t("studio.toolbar.tools.diamond"), keys: ["D"] },
        { label: t("studio.toolbar.tools.arrow"), keys: ["A"] },
        { label: t("studio.toolbar.tools.line"), keys: ["L"] },
        { label: t("studio.toolbar.tools.freehand"), keys: ["P"] },
        { label: t("studio.toolbar.tools.sticky"), keys: ["S"] },
        { label: t("studio.toolbar.tools.text"), keys: ["T"] },
        { label: t("studio.toolbar.tools.eraser"), keys: ["E"] },
      ],
    },
    {
      title: t("studio.shortcutsModal.editing"),
      items: [
        { label: t("studio.toolbar.history.undo"), keys: ["Ctrl+Z"] },
        { label: t("studio.toolbar.history.redo"), keys: ["Ctrl+Shift+Z", "Ctrl+Y"] },
        { label: t("studio.contextMenu.copy"), keys: ["Ctrl+C"] },
        { label: t("studio.contextMenu.cut"), keys: ["Ctrl+X"] },
        { label: t("studio.contextMenu.paste"), keys: ["Ctrl+V"] },
        { label: t("studio.contextMenu.duplicate"), keys: ["Ctrl+D", "Alt+D"] },
        { label: t("studio.contextMenu.selectAll"), keys: ["Ctrl+A"] },
        { label: t("studio.contextMenu.delete"), keys: ["Del", "Backspace"] },
      ],
    },
    {
      title: t("studio.shortcutsModal.arrangement"),
      items: [
        { label: t("studio.inspector.actions.group"), keys: ["Ctrl+G"] },
        { label: t("studio.inspector.actions.ungroup"), keys: ["Ctrl+Shift+G"] },
        { label: t("studio.inspector.actions.lock"), keys: ["Shift+L", "Ctrl+Shift+L"] },
        { label: t("studio.inspector.actions.bringToFront"), keys: ["]"] },
        { label: t("studio.inspector.actions.sendToBack"), keys: ["["] },
        { label: t("studio.inspector.actions.bringForward"), keys: ["Alt+]"] },
        { label: t("studio.inspector.actions.sendBackward"), keys: ["Alt+["] },
      ],
    },
    {
      title: t("studio.shortcutsModal.navigation"),
      items: [
        { label: t("studio.viewport.zoomIn"), keys: ["+", "Ctrl++"] },
        { label: t("studio.viewport.zoomOut"), keys: ["-", "Ctrl+-"] },
        { label: t("studio.viewport.resetZoom"), keys: ["0", "Ctrl+0"] },
        { label: t("studio.viewport.fitToContent"), keys: ["Shift+1"] },
        { label: t("studio.viewport.shortcutsHelp"), keys: ["?"] },
      ],
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("studio.shortcutsModal.title")}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border border-border-strong bg-surface-raised p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-border-subtle pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                {t("studio.shortcutsModal.title")}
              </h2>
              <p className="text-xs text-text-muted">
                {t("studio.shortcutsModal.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
            aria-label={t("common.actions.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 max-h-[65vh] overflow-y-auto pr-1">
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {section.title}
              </h3>
              <div className="space-y-1.5 rounded-xl border border-border-subtle bg-surface p-2.5">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-text-secondary truncate">
                      {item.label.replace(/\s*\([^)]*\)\s*$/, "")}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="rounded border border-border-strong bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] font-semibold text-text-primary shadow-2xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
