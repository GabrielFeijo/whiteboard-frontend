import { describe, expect, it } from "vitest";
import {
  calculateImagePlacement,
  fileToDataUrl,
  loadImageDimensions,
} from "@/canvas/image-helper";

describe("Image Import Helpers", () => {
  it("centers image placement at given point", () => {
    const placement = calculateImagePlacement(
      { width: 400, height: 200 },
      { x: 500, y: 300 },
      600,
    );

    expect(placement.w).toBe(400);
    expect(placement.h).toBe(200);
    expect(placement.x).toBe(300);
    expect(placement.y).toBe(200);
  });

  it("scales down large images while preserving aspect ratio", () => {
    const placement = calculateImagePlacement(
      { width: 1200, height: 800 },
      { x: 0, y: 0 },
      600,
    );

    expect(placement.w).toBe(600);
    expect(placement.h).toBe(400);
    expect(placement.x).toBe(-300);
    expect(placement.y).toBe(-200);
  });

  it("scales down tall images according to height", () => {
    const placement = calculateImagePlacement(
      { width: 400, height: 1200 },
      { x: 100, y: 100 },
      600,
    );

    expect(placement.w).toBe(200);
    expect(placement.h).toBe(600);
    expect(placement.x).toBe(0);
    expect(placement.y).toBe(-200);
  });

  it("clamps minimum dimensions to avoid invisible elements", () => {
    const placement = calculateImagePlacement(
      { width: 5, height: 2 },
      { x: 50, y: 50 },
      600,
    );

    expect(placement.w).toBe(20);
    expect(placement.h).toBe(20);
    expect(placement.x).toBe(40);
    expect(placement.y).toBe(40);
  });

  it("loads image dimensions with fallback", async () => {
    const dims = await loadImageDimensions("invalid-src");
    expect(dims.width).toBe(300);
    expect(dims.height).toBe(200);
  });

  it("converts file to data URL via FileReader", async () => {
    class MockFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      readAsDataURL() {
        this.result = "data:image/png;base64,mockdata";
        this.onload?.();
      }
    }

    const originalFileReader = globalThis.FileReader;
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;

    try {
      const mockFile = new File(["dummy"], "test.png", { type: "image/png" });
      const dataUrl = await fileToDataUrl(mockFile);
      expect(dataUrl).toBe("data:image/png;base64,mockdata");
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });
});
