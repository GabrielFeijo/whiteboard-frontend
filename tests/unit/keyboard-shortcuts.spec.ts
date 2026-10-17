import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CanvasKeyboardController,
  type KeyboardControllerTarget,
} from "@/canvas/controllers/canvas-keyboard-controller";
import { useCanvasStore } from "@/store/canvas-store";

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
      ctrlKey?: boolean;
      metaKey?: boolean;
      shiftKey?: boolean;
      altKey?: boolean;
      target?: unknown;
    },
  ) {
    this.type = type;
    this.key = init?.key ?? "";
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
      pasteImage: vi.fn(),
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
});
