import { Role } from "@/shared";
import { Tool, useCanvasStore } from "@/store/canvas-store";

export interface KeyboardControllerTarget {
  readonly role: Role;
  deleteSelected(): void;
  duplicateSelected(): void;
  undo(): void;
  redo(): void;
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
      if (e.shiftKey) {
        this.target.redo();
      } else {
        this.target.undo();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      this.target.redo();
      return;
    }

    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const tool = SHORTCUT_TOOL_MAP[e.key.toLowerCase()];
      if (tool) {
        store.setActiveTool(tool);
      }
    }
  };

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
  }
}
