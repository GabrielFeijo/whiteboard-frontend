import { ElementData, isStructuralElement } from "@/shared";
import { Bounds, HANDLE_DIRECTIONS, ResizeHandleType } from "./resize-helper";

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

interface AxisSnapResult {
  snappedPos?: number;
  guides: number[];
  minDelta: number;
}

interface SpacingSnapResult {
  snappedPos?: number;
  spacingGuides: SpacingGuide[];
  delta: number;
}

interface PairContext {
  axis: "horizontal" | "vertical";
  aStart: number;
  aEnd: number;
  bStart: number;
  bEnd: number;
  aCrossStart: number;
  aCrossEnd: number;
  bCrossStart: number;
  bCrossEnd: number;
  gap: number;
  referenceGuide: SpacingGuide;
  draggedPos: number;
  draggedSize: number;
  draggedCrossStart: number;
  draggedCrossEnd: number;
}

function recordGuideMatch(
  guides: number[],
  val: number,
  isCloser: boolean,
  isEquivalent: boolean,
): void {
  if (isCloser) {
    guides.length = 0;
    guides.push(val);
    return;
  }
  if (isEquivalent && !guides.includes(val)) {
    guides.push(val);
  }
}

function resolveDragAxisSnap(
  draggedPos: number,
  draggedSize: number,
  eligibleOthers: readonly ElementData[],
  getCoords: (el: ElementData) => { start: number; center: number; end: number },
  threshold: number,
): AxisSnapResult {
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
        recordGuideMatch(guides, pair.o, true, false);
        continue;
      }

      const isEquivalent =
        snappedPos !== undefined && Math.abs(candidatePos - snappedPos) < 0.001;
      recordGuideMatch(guides, pair.o, false, isEquivalent);
    }
  }

  return {
    snappedPos: snappedPos !== undefined ? Math.round(snappedPos) : undefined,
    guides,
    minDelta,
  };
}

function collectPairSpacingCandidates(ctx: PairContext): SpacingSnapResult[] {
  const candidates: SpacingSnapResult[] = [];

  const targetRight = ctx.bEnd + ctx.gap;
  candidates.push({
    snappedPos: targetRight,
    delta: Math.abs(ctx.draggedPos - targetRight),
    spacingGuides: [
      ctx.referenceGuide,
      {
        axis: ctx.axis,
        start: ctx.bEnd,
        end: targetRight,
        crossStart: Math.min(ctx.bCrossStart, ctx.draggedCrossStart),
        crossEnd: Math.max(ctx.bCrossEnd, ctx.draggedCrossEnd),
        gap: ctx.gap,
      },
    ],
  });

  const targetLeft = ctx.aStart - ctx.gap - ctx.draggedSize;
  candidates.push({
    snappedPos: targetLeft,
    delta: Math.abs(ctx.draggedPos - targetLeft),
    spacingGuides: [
      {
        axis: ctx.axis,
        start: targetLeft + ctx.draggedSize,
        end: ctx.aStart,
        crossStart: Math.min(ctx.aCrossStart, ctx.draggedCrossStart),
        crossEnd: Math.max(ctx.aCrossEnd, ctx.draggedCrossEnd),
        gap: ctx.gap,
      },
      ctx.referenceGuide,
    ],
  });

  if (ctx.gap > ctx.draggedSize) {
    const centerGap = (ctx.gap - ctx.draggedSize) / 2;
    const targetCenter = ctx.aEnd + centerGap;
    candidates.push({
      snappedPos: targetCenter,
      delta: Math.abs(ctx.draggedPos - targetCenter),
      spacingGuides: [
        {
          axis: ctx.axis,
          start: ctx.aEnd,
          end: targetCenter,
          crossStart: Math.min(ctx.aCrossStart, ctx.draggedCrossStart),
          crossEnd: Math.max(ctx.aCrossEnd, ctx.draggedCrossEnd),
          gap: centerGap,
        },
        {
          axis: ctx.axis,
          start: targetCenter + ctx.draggedSize,
          end: ctx.bStart,
          crossStart: Math.min(ctx.bCrossStart, ctx.draggedCrossStart),
          crossEnd: Math.max(ctx.bCrossEnd, ctx.draggedCrossEnd),
          gap: centerGap,
        },
      ],
    });
  }

  return candidates;
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

    const aStart = a[posKey];
    const aEnd = aStart + a[sizeKey];
    const bStart = b[posKey];
    const bEnd = bStart + b[sizeKey];
    const gap = bStart - aEnd;
    if (gap < 0) continue;

    const aCrossStart = a[crossPosKey];
    const aCrossEnd = aCrossStart + a[crossSizeKey];
    const bCrossStart = b[crossPosKey];
    const bCrossEnd = bCrossStart + b[crossSizeKey];

    const crossOverlap =
      Math.max(aCrossStart, bCrossStart) < Math.min(aCrossEnd, bCrossEnd) + 80;
    if (!crossOverlap) continue;

    const referenceGuide: SpacingGuide = {
      axis,
      start: aEnd,
      end: bStart,
      crossStart: Math.min(aCrossStart, bCrossStart),
      crossEnd: Math.max(aCrossEnd, bCrossEnd),
      gap,
    };

    const candidates = collectPairSpacingCandidates({
      axis,
      aStart,
      aEnd,
      bStart,
      bEnd,
      aCrossStart,
      aCrossEnd,
      bCrossStart,
      bCrossEnd,
      gap,
      referenceGuide,
      draggedPos,
      draggedSize,
      draggedCrossStart: draggedCrossPos,
      draggedCrossEnd: draggedCrossPos + draggedCrossSize,
    });

    for (const candidate of candidates) {
      if (candidate.delta <= threshold && candidate.delta < bestDelta) {
        bestDelta = candidate.delta;
        bestSnappedPos = candidate.snappedPos;
        bestGuides = candidate.spacingGuides;
      }
    }
  }

  return {
    snappedPos: bestSnappedPos !== undefined ? Math.round(bestSnappedPos) : undefined,
    spacingGuides: bestGuides,
    delta: bestDelta,
  };
}

function mergeAxisAndSpacingSnap(
  axisSnap: AxisSnapResult,
  spacingSnap: SpacingSnapResult,
): { snappedPos?: number; guides: number[]; spacingGuides: SpacingGuide[] } {
  const shouldApplySpacing =
    spacingSnap.snappedPos !== undefined &&
    (axisSnap.snappedPos === undefined || spacingSnap.delta <= axisSnap.minDelta);

  if (!shouldApplySpacing) {
    return {
      snappedPos: axisSnap.snappedPos,
      guides: axisSnap.guides,
      spacingGuides: [],
    };
  }

  return {
    snappedPos: spacingSnap.snappedPos,
    guides: spacingSnap.delta < axisSnap.minDelta ? [] : axisSnap.guides,
    spacingGuides: spacingSnap.spacingGuides,
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

  const mergedX = mergeAxisAndSpacingSnap(snapX, spacingSnapX);
  const mergedY = mergeAxisAndSpacingSnap(snapY, spacingSnapY);

  return {
    snappedX: mergedX.snappedPos,
    snappedY: mergedY.snappedPos,
    verticalGuides: mergedX.guides,
    horizontalGuides: mergedY.guides,
    spacingGuides: [...mergedX.spacingGuides, ...mergedY.spacingGuides],
  };
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
      recordGuideMatch(guides, target, true, false);
      continue;
    }

    const isEquivalent =
      bestTarget !== undefined && Math.abs(target - bestTarget) < 0.001;
    recordGuideMatch(guides, target, false, isEquivalent);
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
