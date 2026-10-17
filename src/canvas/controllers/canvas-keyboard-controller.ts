import { Role } from "@/shared";
import { Tool, useCanvasStore } from "@/store/canvas-store";

export interface KeyboardControllerTarget {
  readonly role: Role;
  deleteSelected(): void;
  duplicateSelected(): void;
  undo(): void;
  redo(): void;
  selectAll?(): void;
  nudgeSelected?(dx: number, dy: number): void;
  groupSelected?(): void;
  ungroupSelected?(): void;
  toggleLockSelected?(): void;
  pasteImage?(file: File): void;
  setDirty?(): void;
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

const ARROW_DELTAS: Record<string, { dx: number; dy: number }> = {
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
};

interface ShortcutContext {
  event: KeyboardEvent;
  store: ReturnType<typeof useCanvasStore.getState>;
  target: KeyboardControllerTarget;
}

function isEditableDomElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

function tryHandleEscape(ctx: ShortcutContext): boolean {
  if (ctx.event.key !== "Escape") return false;
  ctx.event.preventDefault();
  if (ctx.store.selectedIds.length > 0) {
    ctx.store.setSelectedIds([]);
    ctx.target.setDirty?.();
  } else if (ctx.store.activeTool !== "select") {
    ctx.store.setActiveTool("select");
  }
  return true;
}

function tryHandleNudge(ctx: ShortcutContext): boolean {
  const dir = ARROW_DELTAS[ctx.event.key];
  if (!dir || ctx.store.selectedIds.length === 0) return false;
  if (ctx.target.role === "VIEWER") return true;
  ctx.event.preventDefault();
  const step = ctx.event.shiftKey ? 10 : 1;
  ctx.target.nudgeSelected?.(dir.dx * step, dir.dy * step);
  return true;
}

function tryHandleDelete(ctx: ShortcutContext): boolean {
  if (ctx.event.key !== "Delete" && ctx.event.key !== "Backspace") return false;
  if (ctx.store.selectedIds.length === 0) return false;
  if (ctx.target.role !== "VIEWER") {
    ctx.target.deleteSelected();
  }
  return true;
}

type ModifierAction = (ctx: ShortcutContext) => void;

const MODIFIER_ACTIONS: Record<string, ModifierAction> = {
  "ctrl+a": (ctx) => {
    if (!ctx.event.shiftKey) ctx.target.selectAll?.();
  },
  "ctrl+d": (ctx) => {
    if (ctx.store.selectedIds.length > 0) ctx.target.duplicateSelected();
  },
  "ctrl+z": (ctx) => {
    if (ctx.event.shiftKey) ctx.target.redo();
    else ctx.target.undo();
  },
  "ctrl+y": (ctx) => {
    ctx.target.redo();
  },
  "ctrl+g": (ctx) => {
    if (ctx.store.selectedIds.length === 0) return;
    if (ctx.event.shiftKey) ctx.target.ungroupSelected?.();
    else ctx.target.groupSelected?.();
  },
  "ctrl+shift+l": (ctx) => {
    if (ctx.store.selectedIds.length > 0) ctx.target.toggleLockSelected?.();
  },
};

export class CanvasKeyboardController {
  constructor(private readonly target: KeyboardControllerTarget) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("paste", this.onPaste);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isEditableDomElement(e.target)) return;

    const ctx: ShortcutContext = {
      event: e,
      store: useCanvasStore.getState(),
      target: this.target,
    };

    if (tryHandleEscape(ctx)) return;
    if (tryHandleNudge(ctx)) return;
    if (tryHandleDelete(ctx)) return;

    const isModifier = e.ctrlKey || e.metaKey;
    if (isModifier) {
      const parts: string[] = ["ctrl"];
      if (e.shiftKey) parts.push("shift");
      parts.push(e.key.toLowerCase());
      const action = MODIFIER_ACTIONS[parts.join("+")];
      if (action) {
        e.preventDefault();
        action(ctx);
        return;
      }
    }

    if (!isModifier && !e.altKey) {
      const tool = SHORTCUT_TOOL_MAP[e.key.toLowerCase()];
      if (tool) ctx.store.setActiveTool(tool);
    }
  };

  private onPaste = (e: ClipboardEvent): void => {
    if (isEditableDomElement(e.target) || this.target.role === "VIEWER") return;

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
