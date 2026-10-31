import { Role } from "@/shared";
import { CanvasAssetService } from "@/canvas/services/canvas-asset.service";
import { CanvasToolType, type Tool, useCanvasStore } from "@/store/canvas-store";

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
  bringSelectedToFront?(): void;
  sendSelectedToBack?(): void;
  bringSelectedForward?(): void;
  sendSelectedBackward?(): void;
  zoomIn?(): void;
  zoomOut?(): void;
  resetViewport?(): void;
  fitToContent?(): void;
  copySelected?(): void;
  cutSelected?(): void;
  pasteCopiedElements?(): boolean;
  pasteImage?(file: File): void;
  pasteText?(text: string): void;
  openShortcutsHelp?(): void;
  setDirty?(): void;
}

const SHORTCUT_TOOL_MAP: Record<string, Tool> = {
  v: CanvasToolType.SELECT,
  h: CanvasToolType.HAND,
  r: CanvasToolType.RECT,
  o: CanvasToolType.ELLIPSE,
  d: CanvasToolType.DIAMOND,
  l: CanvasToolType.LINE,
  a: CanvasToolType.ARROW,
  p: CanvasToolType.FREEHAND,
  s: CanvasToolType.STICKY,
  t: CanvasToolType.TEXT,
  e: CanvasToolType.ERASER,
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

export function isEditableDomElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function isModalDialogOpen(): boolean {
  if (typeof document === "undefined" || typeof document.querySelector !== "function") {
    return false;
  }
  return Boolean(document.querySelector('[role="dialog"], [aria-modal="true"]'));
}

function normalizeLetterKey(e: KeyboardEvent): string {
  if (typeof e.code === "string" && e.code.startsWith("Key") && e.code.length === 4) {
    return e.code.slice(3).toLowerCase();
  }
  return (e.key || "").toLowerCase();
}

function tryHandleEscape(ctx: ShortcutContext): boolean {
  if (ctx.event.key !== "Escape") return false;
  ctx.event.preventDefault();
  if (ctx.store.selectedIds.length > 0) {
    ctx.store.setSelectedIds([]);
    ctx.target.setDirty?.();
  } else if (ctx.store.activeTool !== CanvasToolType.SELECT) {
    ctx.store.setActiveTool(CanvasToolType.SELECT);
  }
  return true;
}

function tryHandleNudge(ctx: ShortcutContext): boolean {
  const dir = ARROW_DELTAS[ctx.event.key];
  if (!dir || ctx.store.selectedIds.length === 0) return false;
  ctx.event.preventDefault();
  if (ctx.target.role === Role.VIEWER) return true;
  const step = ctx.event.shiftKey ? 10 : 1;
  ctx.target.nudgeSelected?.(dir.dx * step, dir.dy * step);
  return true;
}

function tryHandleDelete(ctx: ShortcutContext): boolean {
  if (ctx.event.key !== "Delete" && ctx.event.key !== "Backspace") return false;
  if (ctx.store.selectedIds.length === 0) return false;
  ctx.event.preventDefault();
  if (ctx.target.role !== Role.VIEWER) {
    ctx.target.deleteSelected();
  }
  return true;
}

function tryHandleModifierZoom(ctx: ShortcutContext): boolean {
  const { event, target } = ctx;
  const key = event.key;
  const code = event.code;

  if (key === "=" || key === "+" || code === "Equal" || code === "NumpadAdd") {
    event.preventDefault();
    target.zoomIn?.();
    return true;
  }

  if (key === "-" || key === "_" || code === "Minus" || code === "NumpadSubtract") {
    event.preventDefault();
    target.zoomOut?.();
    return true;
  }

  if (key === "0" || code === "Digit0" || code === "Numpad0") {
    event.preventDefault();
    target.resetViewport?.();
    return true;
  }

  return false;
}

function tryHandleShiftExtras(ctx: ShortcutContext): boolean {
  const { event, store, target } = ctx;
  const key = event.key;

  if (key === "?" || (event.shiftKey && event.code === "Slash")) {
    event.preventDefault();
    target.openShortcutsHelp?.();
    return true;
  }

  if (event.shiftKey && (key === "1" || key === "!" || event.code === "Digit1")) {
    event.preventDefault();
    target.fitToContent?.();
    return true;
  }

  if (event.shiftKey && normalizeLetterKey(event) === "l") {
    if (store.selectedIds.length > 0 && target.role !== Role.VIEWER) {
      event.preventDefault();
      target.toggleLockSelected?.();
    }
    return true;
  }

  return false;
}

function tryHandlePlainExtras(ctx: ShortcutContext): boolean {
  const { event, store, target } = ctx;
  const key = event.key;

  if (event.shiftKey) return false;

  if (key === "=" || key === "+") {
    event.preventDefault();
    target.zoomIn?.();
    return true;
  }

  if (key === "-") {
    event.preventDefault();
    target.zoomOut?.();
    return true;
  }

  if (key === "0") {
    event.preventDefault();
    target.resetViewport?.();
    return true;
  }

  if (key === "[" || key === "]") {
    if (store.selectedIds.length > 0 && target.role !== Role.VIEWER) {
      event.preventDefault();
      if (key === "[") {
        target.sendSelectedToBack?.();
      } else {
        target.bringSelectedToFront?.();
      }
    }
    return true;
  }

  return false;
}

function tryHandleUnmodifiedExtras(ctx: ShortcutContext): boolean {
  return tryHandleShiftExtras(ctx) || tryHandlePlainExtras(ctx);
}

type ModifierAction = (ctx: ShortcutContext) => void;

const MODIFIER_ACTIONS: Record<string, ModifierAction> = {
  "ctrl+a": (ctx) => {
    ctx.target.selectAll?.();
  },
  "ctrl+d": (ctx) => {
    if (ctx.store.selectedIds.length > 0 && ctx.target.role !== Role.VIEWER) {
      ctx.target.duplicateSelected();
    }
  },
  "ctrl+z": (ctx) => {
    if (ctx.target.role !== Role.VIEWER) {
      ctx.target.undo();
    }
  },
  "ctrl+shift+z": (ctx) => {
    if (ctx.target.role !== Role.VIEWER) {
      ctx.target.redo();
    }
  },
  "ctrl+y": (ctx) => {
    if (ctx.target.role !== Role.VIEWER) {
      ctx.target.redo();
    }
  },
  "ctrl+g": (ctx) => {
    if (ctx.store.selectedIds.length > 0 && ctx.target.role !== Role.VIEWER) {
      ctx.target.groupSelected?.();
    }
  },
  "ctrl+shift+g": (ctx) => {
    if (ctx.store.selectedIds.length > 0 && ctx.target.role !== Role.VIEWER) {
      ctx.target.ungroupSelected?.();
    }
  },
  "ctrl+shift+l": (ctx) => {
    if (ctx.store.selectedIds.length > 0 && ctx.target.role !== Role.VIEWER) {
      ctx.target.toggleLockSelected?.();
    }
  },
  "ctrl+c": (ctx) => {
    if (ctx.store.selectedIds.length > 0) {
      ctx.target.copySelected?.();
    }
  },
  "ctrl+x": (ctx) => {
    if (ctx.store.selectedIds.length > 0 && ctx.target.role !== Role.VIEWER) {
      ctx.target.cutSelected?.();
    }
  },
};

function isImageFile(file: File): boolean {
  return CanvasAssetService.isSupportedImageFile(file);
}

function findImageInFiles(files: FileList | null | undefined): File | null {
  if (!files || files.length === 0) return null;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (isImageFile(file)) return file;
  }
  return null;
}

function findImageInItems(items: DataTransferItemList | null | undefined): File | null {
  if (!items) return null;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (file) return file;
  }
  return null;
}

function extractImageFromClipboard(clipboardData: DataTransfer | null): File | null {
  if (!clipboardData) return null;
  return findImageInFiles(clipboardData.files) ?? findImageInItems(clipboardData.items);
}

function tryHandleModifierShortcut(
  ctx: ShortcutContext,
  target: KeyboardControllerTarget,
  normalizedKey: string,
  onPasteSuccess: () => void,
): boolean {
  const { event } = ctx;
  const isModifier = event.ctrlKey || event.metaKey;
  if (!isModifier || event.altKey) return false;

  if (tryHandleModifierZoom(ctx)) return true;

  if (normalizedKey === "v" && !event.shiftKey) {
    if (target.role !== Role.VIEWER && target.pasteCopiedElements?.()) {
      onPasteSuccess();
    }
    return true;
  }

  const parts = event.shiftKey ? ["ctrl", "shift", normalizedKey] : ["ctrl", normalizedKey];
  const action = MODIFIER_ACTIONS[parts.join("+")];
  if (action) {
    event.preventDefault();
    action(ctx);
    return true;
  }
  return false;
}

function tryHandleAltShortcut(
  ctx: ShortcutContext,
  target: KeyboardControllerTarget,
  normalizedKey: string,
): boolean {
  const { event, store } = ctx;
  if (!event.altKey || event.ctrlKey || event.metaKey) return false;
  if (store.selectedIds.length === 0) return false;

  const isD = normalizedKey === "d";
  const isBracketOpen = event.key === "[";
  const isBracketClose = event.key === "]";

  if (!isD && !isBracketOpen && !isBracketClose) return false;

  event.preventDefault();
  if (target.role === Role.VIEWER) return true;

  if (isD) {
    target.duplicateSelected();
  } else if (isBracketOpen) {
    target.sendSelectedBackward?.();
  } else if (isBracketClose) {
    target.bringSelectedForward?.();
  }
  return true;
}

function tryHandlePlainShortcut(ctx: ShortcutContext, normalizedKey: string): boolean {
  const { event, store } = ctx;
  const isModifier = event.ctrlKey || event.metaKey;
  if (isModifier || event.altKey) return false;

  if (tryHandleUnmodifiedExtras(ctx)) return true;
  if (event.shiftKey) return false;

  const tool = SHORTCUT_TOOL_MAP[normalizedKey];
  if (tool) {
    event.preventDefault();
    store.setActiveTool(tool);
    return true;
  }
  return false;
}

export class CanvasKeyboardController {
  private lastInternalPasteMs = 0;

  constructor(private readonly target: KeyboardControllerTarget) {
    window.addEventListener("keydown", this.onKeyDown, { capture: true });
    window.addEventListener("paste", this.onPaste);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (isEditableDomElement(e.target) || isModalDialogOpen()) return;
    if (e.ctrlKey && e.altKey) return;

    const ctx: ShortcutContext = {
      event: e,
      store: useCanvasStore.getState(),
      target: this.target,
    };

    if (tryHandleEscape(ctx)) return;
    if (tryHandleNudge(ctx)) return;
    if (tryHandleDelete(ctx)) return;

    const normalizedKey = normalizeLetterKey(e);

    if (
      tryHandleModifierShortcut(ctx, this.target, normalizedKey, () => {
        this.lastInternalPasteMs = Date.now();
      })
    ) {
      return;
    }

    if (tryHandleAltShortcut(ctx, this.target, normalizedKey)) return;
    tryHandlePlainShortcut(ctx, normalizedKey);
  };

  private onPaste = (e: ClipboardEvent): void => {
    if (
      isEditableDomElement(e.target) ||
      isModalDialogOpen() ||
      this.target.role === Role.VIEWER
    ) {
      return;
    }

    const file = extractImageFromClipboard(e.clipboardData);
    if (file) {
      e.preventDefault();
      this.target.pasteImage?.(file);
      return;
    }

    if (Date.now() - this.lastInternalPasteMs < 100) {
      return;
    }

    const plainText = e.clipboardData?.getData?.("text/plain")?.trim();
    if (plainText) {
      e.preventDefault();
      this.target.pasteText?.(plainText);
      return;
    }

    if (this.target.pasteCopiedElements?.()) {
      e.preventDefault();
    }
  };

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown, { capture: true });
    window.removeEventListener("paste", this.onPaste);
  }
}
