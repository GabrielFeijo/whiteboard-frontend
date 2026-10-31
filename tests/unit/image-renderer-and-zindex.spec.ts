import { describe, expect, it } from "vitest";
import { ElementData, ElementType } from "@/shared";
import { resolveRenderableImageSrc } from "@/canvas/renderers/image-renderer";
import {
  compareZIndex,
  isValidOrderKey,
  safeGenerateKeyBetween,
} from "@/canvas/repositories/yjs-element-repository";

function createMockImageElement(overrides: Partial<ElementData>): ElementData {
  return {
    id: "img-1",
    type: ElementType.IMAGE,
    x: 100,
    y: 100,
    w: 200,
    h: 150,
    rotation: 0,
    z: "a0",
    createdBy: "user-1",
    style: {
      fill: "transparent",
      stroke: "transparent",
      strokeWidth: 0,
      opacity: 1,
    },
    ...overrides,
  };
}

describe("resolveRenderableImageSrc", () => {
  it("resolves assetId to canonical non-expiring BFF view endpoint even when src is an expired S3 presigned URL", () => {
    const el = createMockImageElement({
      assetId: "boards/cmvwod41d00042dtvwejyvf6d/IJJJNe6AZynaV_2m.png",
      src: "http://localhost:9000/whiteboard-assets/boards/cmvwod41d00042dtvwejyvf6d/IJJJNe6AZynaV_2m.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300",
    });

    expect(resolveRenderableImageSrc(el)).toBe(
      "/api/v1/boards/cmvwod41d00042dtvwejyvf6d/assets/IJJJNe6AZynaV_2m.png/view",
    );
  });

  it("extracts boardId and filename from legacy S3 presigned URL when assetId is missing", () => {
    const el = createMockImageElement({
      assetId: undefined,
      src: "http://localhost:9000/whiteboard-assets/boards/board-abc/legacy-image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300",
    });

    expect(resolveRenderableImageSrc(el)).toBe(
      "/api/v1/boards/board-abc/assets/legacy-image.png/view",
    );
  });

  it("preserves data URLs and existing BFF asset view URLs", () => {
    const dataEl = createMockImageElement({
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
    });
    expect(resolveRenderableImageSrc(dataEl)).toBe(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
    );

    const bffEl = createMockImageElement({
      src: "/api/v1/boards/board-1/assets/pic.png/view",
    });
    expect(resolveRenderableImageSrc(bffEl)).toBe(
      "/api/v1/boards/board-1/assets/pic.png/view",
    );
  });
});

describe("Fractional Z-Index Resilience", () => {
  it("identifies valid and invalid fractional-indexing order keys", () => {
    expect(isValidOrderKey("a0")).toBe(true);
    expect(isValidOrderKey("a1")).toBe(true);
    expect(isValidOrderKey("z_rect-redis")).toBe(false);
    expect(isValidOrderKey("")).toBe(false);
    expect(isValidOrderKey(null)).toBe(false);
  });

  it("generates a valid order key even when given legacy invalid order keys", () => {
    const next = safeGenerateKeyBetween("z_rect-redis", null);
    expect(isValidOrderKey(next)).toBe(true);
  });

  it("sorts valid fractional-indexing keys above legacy invalid z_* keys", () => {
    expect(compareZIndex("z_rect-redis", "a0")).toBeLessThan(0);
    expect(compareZIndex("a0", "z_rect-redis")).toBeGreaterThan(0);
    expect(compareZIndex("a0", "a1")).toBeLessThan(0);
  });
});
