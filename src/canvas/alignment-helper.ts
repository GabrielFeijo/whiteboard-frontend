import { ElementData } from "@/shared";

export type AlignmentType =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

export type DistributionType = "horizontal" | "vertical";

export function calculateAlignedPositions(
  elements: readonly ElementData[],
  alignment: AlignmentType,
): Map<string, { x?: number; y?: number }> {
  const result = new Map<string, { x?: number; y?: number }>();
  if (elements.length < 2) return result;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  elements.forEach((el) => {
    if (el.x < minX) minX = el.x;
    if (el.x + el.w > maxX) maxX = el.x + el.w;
    if (el.y < minY) minY = el.y;
    if (el.y + el.h > maxY) maxY = el.y + el.h;
  });

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  elements.forEach((el) => {
    if (el.locked) return;
    switch (alignment) {
      case "left":
        result.set(el.id, { x: minX });
        break;
      case "center":
        result.set(el.id, { x: Math.round(centerX - el.w / 2) });
        break;
      case "right":
        result.set(el.id, { x: maxX - el.w });
        break;
      case "top":
        result.set(el.id, { y: minY });
        break;
      case "middle":
        result.set(el.id, { y: Math.round(centerY - el.h / 2) });
        break;
      case "bottom":
        result.set(el.id, { y: maxY - el.h });
        break;
    }
  });

  return result;
}

export function calculateDistributedPositions(
  elements: readonly ElementData[],
  direction: DistributionType,
): Map<string, { x?: number; y?: number }> {
  const result = new Map<string, { x?: number; y?: number }>();
  if (elements.length < 3) return result;

  if (direction === "horizontal") {
    const sorted = [...elements].sort((a, b) => a.x - b.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    let totalInnerWidth = 0;
    for (let i = 1; i < sorted.length - 1; i++) {
      totalInnerWidth += sorted[i].w;
    }

    const availableSpace = last.x - (first.x + first.w) - totalInnerWidth;
    const gap = Math.max(0, availableSpace / (sorted.length - 1));

    let currentX = first.x + first.w + gap;
    for (let i = 1; i < sorted.length - 1; i++) {
      const el = sorted[i];
      if (!el.locked) {
        result.set(el.id, { x: Math.round(currentX) });
      }
      currentX += el.w + gap;
    }
  } else {
    const sorted = [...elements].sort((a, b) => a.y - b.y);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    let totalInnerHeight = 0;
    for (let i = 1; i < sorted.length - 1; i++) {
      totalInnerHeight += sorted[i].h;
    }

    const availableSpace = last.y - (first.y + first.h) - totalInnerHeight;
    const gap = Math.max(0, availableSpace / (sorted.length - 1));

    let currentY = first.y + first.h + gap;
    for (let i = 1; i < sorted.length - 1; i++) {
      const el = sorted[i];
      if (!el.locked) {
        result.set(el.id, { y: Math.round(currentY) });
      }
      currentY += el.h + gap;
    }
  }

  return result;
}

export interface SmartGuideMatch {
  snappedX?: number;
  snappedY?: number;
  verticalGuides: number[];
  horizontalGuides: number[];
}

export function calculateSmartGuides(
  draggedBounds: { x: number; y: number; w: number; h: number },
  otherElements: readonly ElementData[],
  threshold = 6,
): SmartGuideMatch {
  const result: SmartGuideMatch = {
    verticalGuides: [],
    horizontalGuides: [],
  };

  const dLeft = draggedBounds.x;
  const dCenterX = draggedBounds.x + draggedBounds.w / 2;
  const dRight = draggedBounds.x + draggedBounds.w;

  const dTop = draggedBounds.y;
  const dCenterY = draggedBounds.y + draggedBounds.h / 2;
  const dBottom = draggedBounds.y + draggedBounds.h;

  let minDeltaX = threshold + 1;
  let snappedX: number | undefined;

  let minDeltaY = threshold + 1;
  let snappedY: number | undefined;

  for (const other of otherElements) {
    const oLeft = other.x;
    const oCenterX = other.x + other.w / 2;
    const oRight = other.x + other.w;

    const xPairs = [
      { d: dLeft, o: oLeft, offset: 0 },
      { d: dLeft, o: oRight, offset: 0 },
      { d: dLeft, o: oCenterX, offset: 0 },
      { d: dCenterX, o: oCenterX, offset: -draggedBounds.w / 2 },
      { d: dRight, o: oLeft, offset: -draggedBounds.w },
      { d: dRight, o: oRight, offset: -draggedBounds.w },
    ];

    for (const pair of xPairs) {
      const diff = Math.abs(pair.d - pair.o);
      if (diff <= threshold && diff < minDeltaX) {
        minDeltaX = diff;
        snappedX = pair.o + pair.offset;
        result.verticalGuides = [pair.o];
      }
    }

    const oTop = other.y;
    const oCenterY = other.y + other.h / 2;
    const oBottom = other.y + other.h;

    const yPairs = [
      { d: dTop, o: oTop, offset: 0 },
      { d: dTop, o: oBottom, offset: 0 },
      { d: dTop, o: oCenterY, offset: 0 },
      { d: dCenterY, o: oCenterY, offset: -draggedBounds.h / 2 },
      { d: dBottom, o: oTop, offset: -draggedBounds.h },
      { d: dBottom, o: oBottom, offset: -draggedBounds.h },
    ];

    for (const pair of yPairs) {
      const diff = Math.abs(pair.d - pair.o);
      if (diff <= threshold && diff < minDeltaY) {
        minDeltaY = diff;
        snappedY = pair.o + pair.offset;
        result.horizontalGuides = [pair.o];
      }
    }
  }

  if (snappedX !== undefined) result.snappedX = Math.round(snappedX);
  if (snappedY !== undefined) result.snappedY = Math.round(snappedY);

  return result;
}
