import { describe, it, expect, vi } from "vitest";
import { wrapText } from "@/canvas/renderers/text-wrap-helper";
import { drawSticky } from "@/canvas/renderers/sticky-renderer";
import { ElementData, ElementType } from "@/shared";

function createMockContext(charWidth = 8): CanvasRenderingContext2D {
  return {
    measureText: (text: string) => ({ width: text.length * charWidth }),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    clip: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    font: "",
    textBaseline: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetY: 0,
  } as unknown as CanvasRenderingContext2D;
}

describe("Canvas Text Wrapping", () => {
  it("returns empty array for empty text", () => {
    const ctx = createMockContext();
    expect(wrapText(ctx, "", 100)).toEqual([]);
  });

  it("keeps short text on a single line when within maxWidth", () => {
    const ctx = createMockContext(8);
    const text = "Hello world";
    const lines = wrapText(ctx, text, 200);
    expect(lines).toEqual(["Hello world"]);
  });

  it("wraps long sentences by words when width is constrained", () => {
    const ctx = createMockContext(8);
    const text = "Lorem Ipsum is simply dummy text of the printing and typesetting industry.";
    const lines = wrapText(ctx, text, 120);

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(ctx.measureText(line).width).toBeLessThanOrEqual(120);
    }
    expect(lines.join(" ")).toBe(text);
  });

  it("breaks an excessively long word across lines if it exceeds maxWidth", () => {
    const ctx = createMockContext(8);
    const longWord = "Supercalifragilisticexpialidocious";
    const lines = wrapText(ctx, longWord, 80);

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(ctx.measureText(line).width).toBeLessThanOrEqual(80);
    }
    expect(lines.join("")).toBe(longWord);
  });

  it("preserves explicit line breaks in paragraphs", () => {
    const ctx = createMockContext(8);
    const text = "First line\nSecond line is longer and should wrap\nThird line";
    const lines = wrapText(ctx, text, 120);

    expect(lines[0]).toBe("First line");
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines[lines.length - 1]).toBe("Third line");
  });

  it("drawSticky wraps text and renders without maxWidth parameter in fillText", () => {
    const ctx = createMockContext(8);
    const fillTextSpy = vi.spyOn(ctx, "fillText");

    const element: ElementData = {
      id: "note-1",
      type: ElementType.STICKY,
      x: 100,
      y: 100,
      w: 120,
      h: 150,
      rotation: 0,
      z: "z_1",
      text: "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
      style: {
        fill: "#ffffff",
        stroke: "#000000",
        strokeWidth: 1,
        opacity: 1,
      },
      createdBy: "u1",
    };

    drawSticky(ctx, element);

    expect(fillTextSpy).toHaveBeenCalled();
    const calls = fillTextSpy.mock.calls;
    expect(calls.length).toBeGreaterThan(1);

    for (const call of calls) {
      expect(call.length).toBe(3);
    }
  });

  it("dynamically increases wrapped line count when resized to a narrower width", () => {
    const ctx = createMockContext(8);
    const text = "Lorem Ipsum is simply dummy text of the printing and typesetting industry.";

    const wideLines = wrapText(ctx, text, 300);
    const narrowLines = wrapText(ctx, text, 120);

    expect(narrowLines.length).toBeGreaterThan(wideLines.length);
  });
});
