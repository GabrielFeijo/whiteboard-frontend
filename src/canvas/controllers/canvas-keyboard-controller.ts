import { Role } from "@/shared";
import { Tool, useCanvasStore } from "@/store/canvas-store";

export interface KeyboardControllerTarget {
  readonly role: Role;
  deleteSelected(): void;
  duplicateSelected(): void;
  undo(): void;
  redo(): void;
  groupSelected?(): void;
  ungroupSelected?(): void;
  toggleLockSelected?(): void;
  pasteImage?(file: File): void;
}

const SHORTCUT_TOOL_MAP: Record<string, Tool> = {
  v: "select",
  h: "hand",
  r: "rect",
  o: "ellipse",
  d: "diamond",
  l: "line",
  a: "arrow",
  p: "freehand",
  s: "sticky",
  t: "text",
  e: "eraser",
};

function isEditableDomElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

export class CanvasKeyboardController {
  constructor(private readonly target: KeyboardControllerTarget) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("paste", this.onPaste);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isEditableDomElement(e.target)) {
      return;
    }

    const store = useCanvasStore.getState();

    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      store.selectedIds.length > 0
    ) {
      if (this.target.role === "VIEWER") return;
      this.target.deleteSelected();
      return;
    }

    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "d" &&
      store.selectedIds.length > 0
    ) {
      e.preventDefault();
      this.target.duplicateSelected();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        this.target.redo();
      } else {
        this.target.undo();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      this.target.redo();
      return;
    }

    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "g" &&
      store.selectedIds.length > 0
    ) {
      e.preventDefault();
      if (e.shiftKey) {
        this.target.ungroupSelected?.();
      } else {
        this.target.groupSelected?.();
      }
      return;
    }

    if (
      (e.ctrlKey || e.metaKey) &&
      e.shiftKey &&
      e.key.toLowerCase() === "l" &&
      store.selectedIds.length > 0
    ) {
      e.preventDefault();
      this.target.toggleLockSelected?.();
      return;
    }

    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const tool = SHORTCUT_TOOL_MAP[e.key.toLowerCase()];
      if (tool) {
        store.setActiveTool(tool);
      }
    }
  };

  private onPaste = (e: ClipboardEvent): void => {
    if (isEditableDomElement(e.target)) {
      return;
    }
    if (this.target.role === "VIEWER") return;

    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/") || file.name.endsWith(".svg")) {
          e.preventDefault();
          this.target.pasteImage?.(file);
          return;
        }
      }
    }

    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            this.target.pasteImage?.(file);
            return;
          }
        }
      }
    }
  };

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("paste", this.onPaste);
  }
}
