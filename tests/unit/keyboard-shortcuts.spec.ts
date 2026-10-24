import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CanvasKeyboardController,
  type KeyboardControllerTarget,
} from "@/canvas/controllers/canvas-keyboard-controller";
import { YjsElementRepository } from "@/canvas/repositories/yjs-element-repository";
import { CanvasClipboardService } from "@/canvas/services/canvas-clipboard.service";
import { SpatialIndex } from "@/canvas/spatial-index";
import { useCanvasStore } from "@/store/canvas-store";
import * as Y from "yjs";

class MockEventTarget {
  private listeners: Record<string, ((e: unknown) => void)[]> = {};

  addEventListener(type: string, fn: (e: unknown) => void) {
    (this.listeners[type] ??= []).push(fn);
  }

  removeEventListener(type: string, fn: (e: unknown) => void) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((l) => l !== fn);
  }

  dispatchEvent(event: { type: string }) {
    for (const listener of this.listeners[event.type] ?? []) {
      listener(event);
    }
  }
}

class MockHTMLElement extends MockEventTarget {
  tagName: string;
  isContentEditable = false;
  constructor(tagName = "DIV") {
    super();
    this.tagName = tagName;
  }
}

class MockKeyboardEvent {
  type: string;
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  target: unknown;
  defaultPrevented = false;

  constructor(
    type: string,
    init?: {
      key?: string;
      code?: string;
      ctrlKey?: boolean;
      metaKey?: boolean;
      shiftKey?: boolean;
      altKey?: boolean;
      target?: unknown;
    },
  ) {
    this.type = type;
    this.key = init?.key ?? "";
    this.code = init?.code ?? "";
    this.ctrlKey = !!init?.ctrlKey;
    this.metaKey = !!init?.metaKey;
    this.shiftKey = !!init?.shiftKey;
    this.altKey = !!init?.altKey;
    this.target = init?.target ?? null;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

describe("CanvasKeyboardController shortcuts", () => {
  let mockTarget: KeyboardControllerTarget;
  let controller: CanvasKeyboardController;
  let mockWindow: MockEventTarget;

  const originalWindow = (globalThis as Record<string, unknown>).window;
  const originalHTMLElement = (globalThis as Record<string, unknown>).HTMLElement;
  const originalKeyboardEvent = (globalThis as Record<string, unknown>).KeyboardEvent;

  beforeAll(() => {
    mockWindow = new MockEventTarget();
    (globalThis as Record<string, unknown>).window = mockWindow;
    (globalThis as Record<string, unknown>).HTMLElement = MockHTMLElement;
    (globalThis as Record<string, unknown>).KeyboardEvent = MockKeyboardEvent;
  });

  afterAll(() => {
    if (originalWindow === undefined) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      (globalThis as Record<string, unknown>).window = originalWindow;
    }
    if (originalHTMLElement === undefined) {
      delete (globalThis as Record<string, unknown>).HTMLElement;
    } else {
      (globalThis as Record<string, unknown>).HTMLElement = originalHTMLElement;
    }
    if (originalKeyboardEvent === undefined) {
      delete (globalThis as Record<string, unknown>).KeyboardEvent;
    } else {
      (globalThis as Record<string, unknown>).KeyboardEvent = originalKeyboardEvent;
    }
  });

  beforeEach(() => {
    useCanvasStore.setState({
      selectedIds: [],
      activeTool: "select",
    });

    mockTarget = {
      role: "EDITOR",
      deleteSelected: vi.fn(),
      duplicateSelected: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      selectAll: vi.fn(),
      nudgeSelected: vi.fn(),
      groupSelected: vi.fn(),
      ungroupSelected: vi.fn(),
      toggleLockSelected: vi.fn(),
      bringSelectedToFront: vi.fn(),
      sendSelectedToBack: vi.fn(),
      bringSelectedForward: vi.fn(),
      sendSelectedBackward: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      resetViewport: vi.fn(),
      fitToContent: vi.fn(),
      copySelected: vi.fn(),
      cutSelected: vi.fn(),
      pasteCopiedElements: vi.fn().mockReturnValue(false),
      pasteImage: vi.fn(),
      pasteText: vi.fn(),
      openShortcutsHelp: vi.fn(),
      setDirty: vi.fn(),
    };

    controller = new CanvasKeyboardController(mockTarget);
  });

  afterEach(() => {
    controller.destroy();
  });

  it("handles Ctrl+A / Cmd+A to select all elements", () => {
    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "a", ctrlKey: true }),
    );
    expect(mockTarget.selectAll).toHaveBeenCalledTimes(1);
  });

  it("handles Escape to clear selection when items are selected", () => {
    useCanvasStore.setState({ selectedIds: ["id-1", "id-2"] });

    mockWindow.dispatchEvent(new MockKeyboardEvent("keydown", { key: "Escape" }));

    expect(useCanvasStore.getState().selectedIds).toEqual([]);
    expect(mockTarget.setDirty).toHaveBeenCalledTimes(1);
  });

  it("handles Escape to switch back to select tool when no items are selected", () => {
    useCanvasStore.setState({ selectedIds: [], activeTool: "rect" });

    mockWindow.dispatchEvent(new MockKeyboardEvent("keydown", { key: "Escape" }));

    expect(useCanvasStore.getState().activeTool).toBe("select");
  });

  it("nudges selected elements by 1px with arrow keys", () => {
    useCanvasStore.setState({ selectedIds: ["id-1"] });

    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "ArrowRight" }),
    );
    expect(mockTarget.nudgeSelected).toHaveBeenCalledWith(1, 0);

    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "ArrowLeft" }),
    );
    expect(mockTarget.nudgeSelected).toHaveBeenCalledWith(-1, 0);

    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "ArrowUp" }),
    );
    expect(mockTarget.nudgeSelected).toHaveBeenCalledWith(0, -1);

    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "ArrowDown" }),
    );
    expect(mockTarget.nudgeSelected).toHaveBeenCalledWith(0, 1);
  });

  it("nudges selected elements by 10px when Shift key is held", () => {
    useCanvasStore.setState({ selectedIds: ["id-1"] });

    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", {
        key: "ArrowRight",
        shiftKey: true,
      }),
    );
    expect(mockTarget.nudgeSelected).toHaveBeenCalledWith(10, 0);

    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", {
        key: "ArrowDown",
        shiftKey: true,
      }),
    );
    expect(mockTarget.nudgeSelected).toHaveBeenCalledWith(0, 10);
  });

  it("ignores nudging if the user role is VIEWER", () => {
    controller.destroy();
    const viewerTarget: KeyboardControllerTarget = {
      ...mockTarget,
      role: "VIEWER",
    };
    controller = new CanvasKeyboardController(viewerTarget);

    useCanvasStore.setState({ selectedIds: ["id-1"] });

    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "ArrowRight" }),
    );
    expect(viewerTarget.nudgeSelected).not.toHaveBeenCalled();
  });

  it("switches tools with single-letter shortcuts", () => {
    mockWindow.dispatchEvent(new MockKeyboardEvent("keydown", { key: "r" }));
    expect(useCanvasStore.getState().activeTool).toBe("rect");

    mockWindow.dispatchEvent(new MockKeyboardEvent("keydown", { key: "o" }));
    expect(useCanvasStore.getState().activeTool).toBe("ellipse");

    mockWindow.dispatchEvent(new MockKeyboardEvent("keydown", { key: "h" }));
    expect(useCanvasStore.getState().activeTool).toBe("hand");
  });

  it("ignores shortcuts when focus is inside an input element", () => {
    const input = new MockHTMLElement("INPUT");

    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "r", target: input }),
    );
    expect(useCanvasStore.getState().activeTool).toBe("select");
  });

  it("cleans up event listeners upon destroy", () => {
    controller.destroy();

    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "a", ctrlKey: true }),
    );
    expect(mockTarget.selectAll).not.toHaveBeenCalled();
  });

  it("handles Ctrl+Shift+G (ungroup) and Ctrl+Shift+Z (redo) and prevents browser default", () => {
    useCanvasStore.setState({ selectedIds: ["id-1", "id-2"] });

    const ungroupEvent = new MockKeyboardEvent("keydown", {
      key: "G",
      code: "KeyG",
      ctrlKey: true,
      shiftKey: true,
    });
    mockWindow.dispatchEvent(ungroupEvent);
    expect(ungroupEvent.defaultPrevented).toBe(true);
    expect(mockTarget.ungroupSelected).toHaveBeenCalledTimes(1);

    const redoEvent = new MockKeyboardEvent("keydown", {
      key: "Z",
      code: "KeyZ",
      ctrlKey: true,
      shiftKey: true,
    });
    mockWindow.dispatchEvent(redoEvent);
    expect(redoEvent.defaultPrevented).toBe(true);
    expect(mockTarget.redo).toHaveBeenCalledTimes(1);
  });

  it("intercepts Ctrl/Cmd zoom shortcuts (=, -, 0) to zoom canvas instead of browser DOM", () => {
    const zoomInEv = new MockKeyboardEvent("keydown", {
      key: "=",
      code: "Equal",
      ctrlKey: true,
    });
    mockWindow.dispatchEvent(zoomInEv);
    expect(zoomInEv.defaultPrevented).toBe(true);
    expect(mockTarget.zoomIn).toHaveBeenCalledTimes(1);

    const zoomOutEv = new MockKeyboardEvent("keydown", {
      key: "-",
      code: "Minus",
      ctrlKey: true,
    });
    mockWindow.dispatchEvent(zoomOutEv);
    expect(zoomOutEv.defaultPrevented).toBe(true);
    expect(mockTarget.zoomOut).toHaveBeenCalledTimes(1);

    const resetEv = new MockKeyboardEvent("keydown", {
      key: "0",
      code: "Digit0",
      ctrlKey: true,
    });
    mockWindow.dispatchEvent(resetEv);
    expect(resetEv.defaultPrevented).toBe(true);
    expect(mockTarget.resetViewport).toHaveBeenCalledTimes(1);
  });

  it("ignores AltGr combinations (ctrlKey + altKey) so international characters do not trigger shortcuts", () => {
    useCanvasStore.setState({ selectedIds: ["id-1"] });
    const altGrEv = new MockKeyboardEvent("keydown", {
      key: "d",
      code: "KeyD",
      ctrlKey: true,
      altKey: true,
    });
    mockWindow.dispatchEvent(altGrEv);
    expect(altGrEv.defaultPrevented).toBe(false);
    expect(mockTarget.duplicateSelected).not.toHaveBeenCalled();
  });

  it("supports conflict-free alternatives (Alt+D, Shift+L, [, ], Shift+1, ?)", () => {
    useCanvasStore.setState({ selectedIds: ["id-1"] });

    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "d", code: "KeyD", altKey: true }),
    );
    expect(mockTarget.duplicateSelected).toHaveBeenCalledTimes(1);

    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "L", code: "KeyL", shiftKey: true }),
    );
    expect(mockTarget.toggleLockSelected).toHaveBeenCalledTimes(1);

    mockWindow.dispatchEvent(new MockKeyboardEvent("keydown", { key: "[" }));
    expect(mockTarget.sendSelectedToBack).toHaveBeenCalledTimes(1);

    mockWindow.dispatchEvent(new MockKeyboardEvent("keydown", { key: "]" }));
    expect(mockTarget.bringSelectedToFront).toHaveBeenCalledTimes(1);

    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "!", code: "Digit1", shiftKey: true }),
    );
    expect(mockTarget.fitToContent).toHaveBeenCalledTimes(1);

    mockWindow.dispatchEvent(new MockKeyboardEvent("keydown", { key: "?" }));
    expect(mockTarget.openShortcutsHelp).toHaveBeenCalledTimes(1);
  });

  it("ignores canvas shortcuts while a modal dialog is open", () => {
    const originalDocument = (globalThis as Record<string, unknown>).document;
    (globalThis as Record<string, unknown>).document = {
      querySelector: vi.fn().mockReturnValue({}),
    };

    try {
      mockWindow.dispatchEvent(new MockKeyboardEvent("keydown", { key: "r" }));
      expect(useCanvasStore.getState().activeTool).toBe("select");
    } finally {
      if (originalDocument === undefined) {
        delete (globalThis as Record<string, unknown>).document;
      } else {
        (globalThis as Record<string, unknown>).document = originalDocument;
      }
    }
  });

  it("handles Ctrl+C, Ctrl+X, Ctrl+V and remaps groupIds and bindings in CanvasClipboardService", () => {
    useCanvasStore.setState({ selectedIds: ["el-1"] });

    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "c", code: "KeyC", ctrlKey: true }),
    );
    expect(mockTarget.copySelected).toHaveBeenCalledTimes(1);

    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "x", code: "KeyX", ctrlKey: true }),
    );
    expect(mockTarget.cutSelected).toHaveBeenCalledTimes(1);

    mockWindow.dispatchEvent(
      new MockKeyboardEvent("keydown", { key: "v", code: "KeyV", ctrlKey: true }),
    );
    expect(mockTarget.pasteCopiedElements).toHaveBeenCalledTimes(1);

    const doc = new Y.Doc();
    const repo = new YjsElementRepository(doc, new SpatialIndex());
    const clipboard = new CanvasClipboardService();

    clipboard.copy([
      {
        id: "node-1",
        type: "rect",
        x: 10,
        y: 20,
        w: 100,
        h: 80,
        rotation: 0,
        z: "a0",
        groupId: "g-old",
        createdBy: "u1",
        style: { fill: "#fff", stroke: "#000", strokeWidth: 2, opacity: 1 },
      },
      {
        id: "arrow-1",
        type: "arrow",
        x: 110,
        y: 60,
        w: 80,
        h: 0,
        rotation: 0,
        z: "a1",
        groupId: "g-old",
        points: [110, 60, 190, 60],
        startBinding: { elementId: "node-1", anchor: "right" },
        createdBy: "u1",
        style: { fill: "transparent", stroke: "#000", strokeWidth: 2, opacity: 1 },
      },
    ]);

    const newIds = clipboard.pasteIntoRepository(repo, "u2");
    expect(newIds).toHaveLength(2);

    const pastedNode = repo.getById(newIds[0])!;
    const pastedArrow = repo.getById(newIds[1])!;
    expect(pastedNode.x).toBe(34);
    expect(pastedNode.y).toBe(44);
    expect(pastedNode.groupId).toBeDefined();
    expect(pastedNode.groupId).not.toBe("g-old");
    expect(pastedArrow.groupId).toBe(pastedNode.groupId);
    expect(pastedArrow.startBinding?.elementId).toBe(pastedNode.id);
  });
});
