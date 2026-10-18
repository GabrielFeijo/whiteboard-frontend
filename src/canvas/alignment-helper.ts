import { ElementData, isStructuralElement } from "@/shared";
import { Bounds, HANDLE_DIRECTIONS, ResizeHandleType } from "./resize-helper";

export { isStructuralElement };

export const AlignmentType = {
  LEFT: "left",
  CENTER: "center",
  RIGHT: "right",
  TOP: "top",
  MIDDLE: "middle",
  BOTTOM: "bottom",
} as const;
export type AlignmentType = (typeof AlignmentType)[keyof typeof AlignmentType];

export const DistributionType = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
} as const;
export type DistributionType =
  (typeof DistributionType)[keyof typeof DistributionType];

export interface SpacingGuide {
  axis: "horizontal" | "vertical";
  start: number;
  end: number;
  crossStart: number;
  crossEnd: number;
  gap: number;
}

export interface SmartGuideMatch {
  snappedX?: number;
  snappedY?: number;
  verticalGuides: number[];
  horizontalGuides: number[];
  spacingGuides: SpacingGuide[];
}

export interface ResizeSmartGuideMatch {
  snappedBounds: Bounds;
  verticalGuides: number[];
  horizontalGuides: number[];
}

interface AlignmentBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
}

const ALIGNMENT_CALCULATORS: Record<
  AlignmentType,
  (el: ElementData, bounds: AlignmentBounds) => { x?: number; y?: number }
> = {
  [AlignmentType.LEFT]: (_el, b) => ({ x: b.minX }),
  [AlignmentType.CENTER]: (el, b) => ({ x: Math.round(b.centerX - el.w / 2) }),
  [AlignmentType.RIGHT]: (el, b) => ({ x: b.maxX - el.w }),
  [AlignmentType.TOP]: (_el, b) => ({ y: b.minY }),
  [AlignmentType.MIDDLE]: (el, b) => ({ y: Math.round(b.centerY - el.h / 2) }),
  [AlignmentType.BOTTOM]: (el, b) => ({ y: b.maxY - el.h }),
};

export function computeElementsBounds(
  elements: readonly ElementData[],
): AlignmentBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    minX = Math.min(minX, el.x);
    maxX = Math.max(maxX, el.x + el.w);
    minY = Math.min(minY, el.y);
    maxY = Math.max(maxY, el.y + el.h);
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

export function calculateAlignedPositions(
  elements: readonly ElementData[],
  alignment: AlignmentType,
): Map<string, { x?: number; y?: number }> {
  const result = new Map<string, { x?: number; y?: number }>();
  const structuralElements = elements.filter(isStructuralElement);
  if (structuralElements.length < 2) return result;

  const bounds = computeElementsBounds(structuralElements);
  const calculator = ALIGNMENT_CALCULATORS[alignment];

  for (const el of structuralElements) {
    if (!el.locked) {
      result.set(el.id, calculator(el, bounds));
    }
  }

  return result;
}

function distributeAxis(
  elements: readonly ElementData[],
  pos: "x" | "y",
  size: "w" | "h",
): Map<string, { x?: number; y?: number }> {
  const result = new Map<string, { x?: number; y?: number }>();
  const sorted = [...elements].sort((a, b) => a[pos] - b[pos]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  let totalInnerSize = 0;
  for (let i = 1; i < sorted.length - 1; i++) {
    totalInnerSize += sorted[i][size];
  }

  const availableSpace = last[pos] - (first[pos] + first[size]) - totalInnerSize;
  const gap = Math.max(0, availableSpace / (sorted.length - 1));

  let current = first[pos] + first[size] + gap;
  for (let i = 1; i < sorted.length - 1; i++) {
    const el = sorted[i];
    if (!el.locked) {
      result.set(el.id, { [pos]: Math.round(current) });
    }
    current += el[size] + gap;
  }

  return result;
}

export function calculateDistributedPositions(
  elements: readonly ElementData[],
  direction: DistributionType,
): Map<string, { x?: number; y?: number }> {
  const structuralElements = elements.filter(isStructuralElement);
  if (structuralElements.length < 3) return new Map();

  return direction === DistributionType.HORIZONTAL
    ? distributeAxis(structuralElements, "x", "w")
    : distributeAxis(structuralElements, "y", "h");
}

function resolveDragAxisSnap(
  draggedPos: number,
  draggedSize: number,
  eligibleOthers: readonly ElementData[],
  getCoords: (el: ElementData) => { start: number; center: number; end: number },
  threshold: number,
): { snappedPos?: number; guides: number[]; minDelta: number } {
  const dStart = draggedPos;
  const dCenter = draggedPos + draggedSize / 2;
  const dEnd = draggedPos + draggedSize;

  let minDelta = threshold + 1;
  let snappedPos: number | undefined;
  const guides: number[] = [];

  for (const other of eligibleOthers) {
    const o = getCoords(other);
    const pairs = [
      { d: dCenter, o: o.center, offset: -draggedSize / 2 },
      { d: dStart, o: o.start, offset: 0 },
      { d: dEnd, o: o.end, offset: -draggedSize },
      { d: dStart, o: o.end, offset: 0 },
      { d: dEnd, o: o.start, offset: -draggedSize },
    ];

    for (const pair of pairs) {
      const diff = Math.abs(pair.d - pair.o);
      if (diff > threshold || diff > minDelta) continue;

      const candidatePos = pair.o + pair.offset;
      if (diff < minDelta) {
        minDelta = diff;
        snappedPos = candidatePos;
        guides.length = 0;
        guides.push(pair.o);
      } else if (
        snappedPos !== undefined &&
        Math.abs(candidatePos - snappedPos) < 0.001 &&
        !guides.includes(pair.o)
      ) {
        guides.push(pair.o);
      }
    }
  }

  return {
    snappedPos: snappedPos !== undefined ? Math.round(snappedPos) : undefined,
    guides,
    minDelta,
  };
}

interface SpacingSnapResult {
  snappedPos?: number;
  spacingGuides: SpacingGuide[];
  delta: number;
}

function resolveAxisSpacingSnap(
  draggedPos: number,
  draggedSize: number,
  draggedCrossPos: number,
  draggedCrossSize: number,
  axis: "horizontal" | "vertical",
  elements: readonly ElementData[],
  threshold: number,
): SpacingSnapResult {
  const posKey = axis === "horizontal" ? "x" : "y";
  const sizeKey = axis === "horizontal" ? "w" : "h";
  const crossPosKey = axis === "horizontal" ? "y" : "x";
  const crossSizeKey = axis === "horizontal" ? "h" : "w";

  let bestDelta = threshold + 1;
  let bestSnappedPos: number | undefined;
  let bestGuides: SpacingGuide[] = [];

  const sorted = [...elements].sort((a, b) => a[posKey] - b[posKey]);

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];

    const aEnd = a[posKey] + a[sizeKey];
    const bStart = b[posKey];
    const gap = bStart - aEnd;

    if (gap < 0) continue;

    const crossOverlap =
      Math.max(a[crossPosKey], b[crossPosKey]) <
      Math.min(a[crossPosKey] + a[crossSizeKey], b[crossPosKey] + b[crossSizeKey]) + 80;

    if (!crossOverlap) continue;

    const referenceGuide: SpacingGuide = {
      axis,
      start: aEnd,
      end: bStart,
      crossStart: Math.min(a[crossPosKey], b[crossPosKey]),
      crossEnd: Math.max(a[crossPosKey] + a[crossSizeKey], b[crossPosKey] + b[crossSizeKey]),
      gap,
    };

    const bEnd = b[posKey] + b[sizeKey];
    const targetRight = bEnd + gap;
    const deltaRight = Math.abs(draggedPos - targetRight);

    if (deltaRight <= threshold && deltaRight < bestDelta) {
      bestDelta = deltaRight;
      bestSnappedPos = targetRight;
      bestGuides = [
        referenceGuide,
        {
          axis,
          start: bEnd,
          end: targetRight,
          crossStart: Math.min(b[crossPosKey], draggedCrossPos),
          crossEnd: Math.max(b[crossPosKey] + b[crossSizeKey], draggedCrossPos + draggedCrossSize),
          gap,
        },
      ];
    }

    const aStart = a[posKey];
    const targetLeft = aStart - gap - draggedSize;
    const deltaLeft = Math.abs(draggedPos - targetLeft);

    if (deltaLeft <= threshold && deltaLeft < bestDelta) {
      bestDelta = deltaLeft;
      bestSnappedPos = targetLeft;
      bestGuides = [
        {
          axis,
          start: targetLeft + draggedSize,
          end: aStart,
          crossStart: Math.min(a[crossPosKey], draggedCrossPos),
          crossEnd: Math.max(a[crossPosKey] + a[crossSizeKey], draggedCrossPos + draggedCrossSize),
          gap,
        },
        referenceGuide,
      ];
    }

    if (gap > draggedSize) {
      const centerGap = (gap - draggedSize) / 2;
      const targetCenter = aEnd + centerGap;
      const deltaCenter = Math.abs(draggedPos - targetCenter);

      if (deltaCenter <= threshold && deltaCenter < bestDelta) {
        bestDelta = deltaCenter;
        bestSnappedPos = targetCenter;
        bestGuides = [
          {
            axis,
            start: aEnd,
            end: targetCenter,
            crossStart: Math.min(a[crossPosKey], draggedCrossPos),
            crossEnd: Math.max(a[crossPosKey] + a[crossSizeKey], draggedCrossPos + draggedCrossSize),
            gap: centerGap,
          },
          {
            axis,
            start: targetCenter + draggedSize,
            end: bStart,
            crossStart: Math.min(b[crossPosKey], draggedCrossPos),
            crossEnd: Math.max(b[crossPosKey] + b[crossSizeKey], draggedCrossPos + draggedCrossSize),
            gap: centerGap,
          },
        ];
      }
    }
  }

  return {
    snappedPos: bestSnappedPos !== undefined ? Math.round(bestSnappedPos) : undefined,
    spacingGuides: bestGuides,
    delta: bestDelta,
  };
}

export function calculateSmartGuides(
  draggedBounds: Bounds,
  otherElements: readonly ElementData[],
  threshold = 6,
): SmartGuideMatch {
  const eligibleOthers = otherElements.filter(isStructuralElement);
  if (eligibleOthers.length === 0) {
    return { verticalGuides: [], horizontalGuides: [], spacingGuides: [] };
  }

  const snapX = resolveDragAxisSnap(
    draggedBounds.x,
    draggedBounds.w,
    eligibleOthers,
    (el) => ({ start: el.x, center: el.x + el.w / 2, end: el.x + el.w }),
    threshold,
  );

  const snapY = resolveDragAxisSnap(
    draggedBounds.y,
    draggedBounds.h,
    eligibleOthers,
    (el) => ({ start: el.y, center: el.y + el.h / 2, end: el.y + el.h }),
    threshold,
  );

  const spacingSnapX = resolveAxisSpacingSnap(
    draggedBounds.x,
    draggedBounds.w,
    draggedBounds.y,
    draggedBounds.h,
    "horizontal",
    eligibleOthers,
    threshold,
  );

  const spacingSnapY = resolveAxisSpacingSnap(
    draggedBounds.y,
    draggedBounds.h,
    draggedBounds.x,
    draggedBounds.w,
    "vertical",
    eligibleOthers,
    threshold,
  );

  let finalSnappedX = snapX.snappedPos;
  let finalVerticalGuides = snapX.guides;
  const finalSpacingGuides: SpacingGuide[] = [];

  const shouldApplySpacingX =
    spacingSnapX.snappedPos !== undefined &&
    (finalSnappedX === undefined || spacingSnapX.delta <= snapX.minDelta);

  if (shouldApplySpacingX) {
    finalSnappedX = spacingSnapX.snappedPos;
    finalSpacingGuides.push(...spacingSnapX.spacingGuides);
    if (spacingSnapX.delta < snapX.minDelta) {
      finalVerticalGuides = [];
    }
  }

  let finalSnappedY = snapY.snappedPos;
  let finalHorizontalGuides = snapY.guides;

  const shouldApplySpacingY =
    spacingSnapY.snappedPos !== undefined &&
    (finalSnappedY === undefined || spacingSnapY.delta <= snapY.minDelta);

  if (shouldApplySpacingY) {
    finalSnappedY = spacingSnapY.snappedPos;
    finalSpacingGuides.push(...spacingSnapY.spacingGuides);
    if (spacingSnapY.delta < snapY.minDelta) {
      finalHorizontalGuides = [];
    }
  }

  return {
    snappedX: finalSnappedX,
    snappedY: finalSnappedY,
    verticalGuides: finalVerticalGuides,
    horizontalGuides: finalHorizontalGuides,
    spacingGuides: finalSpacingGuides,
  };
}

export function calculateStandardizedSpacingPositions(
  elements: readonly ElementData[],
  axis: "horizontal" | "vertical",
  customGap?: number,
): Map<string, { x?: number; y?: number }> {
  const result = new Map<string, { x?: number; y?: number }>();
  const structuralElements = elements.filter(isStructuralElement);
  if (structuralElements.length < 2) return result;

  const posKey = axis === "horizontal" ? "x" : "y";
  const sizeKey = axis === "horizontal" ? "w" : "h";

  const sorted = [...structuralElements].sort((a, b) => a[posKey] - b[posKey]);
  const first = sorted[0];
  const second = sorted[1];

  const targetGap =
    customGap !== undefined
      ? Math.max(0, customGap)
      : Math.max(0, second[posKey] - (first[posKey] + first[sizeKey]));

  let current = first[posKey] + first[sizeKey] + targetGap;

  for (let i = 1; i < sorted.length; i++) {
    const el = sorted[i];
    if (!el.locked) {
      result.set(el.id, { [posKey]: Math.round(current) });
    }
    current += el[sizeKey] + targetGap;
  }

  return result;
}

function snapResizeAxis(
  dir: -1 | 0 | 1,
  initialPos: number,
  initialSize: number,
  rawPos: number,
  rawSize: number,
  targets: readonly number[],
  threshold: number,
  minSize: number,
): { pos: number; size: number; guides: number[] } {
  if (dir === 0) {
    return { pos: rawPos, size: rawSize, guides: [] };
  }

  const isPositive = dir === 1;
  const activeCoord = isPositive ? rawPos + rawSize : rawPos;
  const fixedCoord = isPositive ? rawPos : initialPos + initialSize;

  let minDelta = threshold + 1;
  let bestTarget: number | undefined;
  const guides: number[] = [];

  for (const target of targets) {
    const size = isPositive ? target - fixedCoord : fixedCoord - target;
    if (size < minSize) continue;

    const diff = Math.abs(activeCoord - target);
    if (diff > threshold || diff > minDelta) continue;

    if (diff < minDelta) {
      minDelta = diff;
      bestTarget = target;
      guides.length = 0;
      guides.push(target);
    } else if (
      bestTarget !== undefined &&
      Math.abs(target - bestTarget) < 0.001 &&
      !guides.includes(target)
    ) {
      guides.push(target);
    }
  }

  if (bestTarget === undefined) {
    return { pos: rawPos, size: rawSize, guides: [] };
  }

  const newPos = isPositive ? rawPos : Math.round(bestTarget);
  const newSize = isPositive
    ? Math.round(bestTarget - rawPos)
    : Math.round(fixedCoord - newPos);

  return { pos: newPos, size: newSize, guides };
}

function extractElementTargets(elements: readonly ElementData[]) {
  const xTargets: number[] = [];
  const yTargets: number[] = [];
  for (const el of elements) {
    xTargets.push(el.x, el.x + el.w / 2, el.x + el.w);
    yTargets.push(el.y, el.y + el.h / 2, el.y + el.h);
  }
  return { xTargets, yTargets };
}

export function calculateResizeSmartGuides(
  handle: ResizeHandleType,
  initialBounds: Bounds,
  rawBounds: Bounds,
  otherElements: readonly ElementData[],
  threshold = 6,
  minWidth = 10,
  minHeight = 10,
): ResizeSmartGuideMatch {
  const dir = HANDLE_DIRECTIONS[handle];
  if (!dir) {
    return {
      snappedBounds: { ...rawBounds },
      verticalGuides: [],
      horizontalGuides: [],
    };
  }

  const eligibleOthers = otherElements.filter(isStructuralElement);
  if (eligibleOthers.length === 0) {
    return {
      snappedBounds: { ...rawBounds },
      verticalGuides: [],
      horizontalGuides: [],
    };
  }

  const { xTargets, yTargets } = extractElementTargets(eligibleOthers);

  const snappedX = snapResizeAxis(
    dir.dirX,
    initialBounds.x,
    initialBounds.w,
    rawBounds.x,
    rawBounds.w,
    xTargets,
    threshold,
    minWidth,
  );

  const snappedY = snapResizeAxis(
    dir.dirY,
    initialBounds.y,
    initialBounds.h,
    rawBounds.y,
    rawBounds.h,
    yTargets,
    threshold,
    minHeight,
  );

  return {
    snappedBounds: {
      x: snappedX.pos,
      y: snappedY.pos,
      w: snappedX.size,
      h: snappedY.size,
    },
    verticalGuides: snappedX.guides,
    horizontalGuides: snappedY.guides,
  };
}
