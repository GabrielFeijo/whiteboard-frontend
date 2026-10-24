import { ElementData, isStructuralElement } from "@/shared";

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

export interface AlignmentBounds {
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

function groupByCrossAxisClusters(
  elements: readonly ElementData[],
  axis: "horizontal" | "vertical",
): ElementData[][] {
  const crossPos = axis === "horizontal" ? "y" : "x";
  const crossSize = axis === "horizontal" ? "h" : "w";

  const sortedByCrossCenter = [...elements].sort(
    (a, b) =>
      a[crossPos] + a[crossSize] / 2 - (b[crossPos] + b[crossSize] / 2),
  );

  const clusters: Array<{
    min: number;
    max: number;
    items: ElementData[];
  }> = [];

  for (const el of sortedByCrossCenter) {
    const start = el[crossPos];
    const end = start + el[crossSize];
    const lastCluster = clusters[clusters.length - 1];

    if (!lastCluster) {
      clusters.push({ min: start, max: end, items: [el] });
      continue;
    }

    const overlap = Math.min(end, lastCluster.max) - Math.max(start, lastCluster.min);
    const minSpan = Math.min(el[crossSize], lastCluster.max - lastCluster.min);

    if (overlap >= minSpan * 0.35) {
      lastCluster.items.push(el);
      lastCluster.min = Math.min(lastCluster.min, start);
      lastCluster.max = Math.max(lastCluster.max, end);
    } else {
      clusters.push({ min: start, max: end, items: [el] });
    }
  }

  return clusters.map((c) => c.items);
}

function standardizeSingleLane(
  laneElements: readonly ElementData[],
  posKey: "x" | "y",
  sizeKey: "w" | "h",
  customGap: number | undefined,
  result: Map<string, { x?: number; y?: number }>,
  anchorStart?: number,
): void {
  if (laneElements.length < 2) return;

  const sorted = [...laneElements].sort(
    (a, b) => a[posKey] - b[posKey] || a.id.localeCompare(b.id),
  );
  const first = sorted[0];
  const second = sorted[1];

  const targetGap =
    customGap !== undefined
      ? Math.max(0, customGap)
      : Math.max(0, second[posKey] - (first[posKey] + first[sizeKey]));

  const startPos =
    anchorStart !== undefined ? Math.round(anchorStart) : first[posKey];
  if (anchorStart !== undefined && !first.locked && first[posKey] !== startPos) {
    result.set(first.id, { [posKey]: startPos });
  }

  let current = startPos + first[sizeKey] + targetGap;

  for (let i = 1; i < sorted.length; i++) {
    const el = sorted[i];
    if (!el.locked) {
      result.set(el.id, { [posKey]: Math.round(current) });
    }
    current += el[sizeKey] + targetGap;
  }
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

  const clusters = groupByCrossAxisClusters(structuralElements, axis);
  const isMultiLaneGrid =
    clusters.length >= 2 && clusters.some((cluster) => cluster.length >= 2);

  if (isMultiLaneGrid) {
    const multiElementClusters = clusters.filter((c) => c.length >= 2);
    const gridStart = Math.min(
      ...multiElementClusters.flatMap((c) => c.map((el) => el[posKey])),
    );
    for (const cluster of multiElementClusters) {
      standardizeSingleLane(
        cluster,
        posKey,
        sizeKey,
        customGap,
        result,
        gridStart,
      );
    }
    return result;
  }

  standardizeSingleLane(structuralElements, posKey, sizeKey, customGap, result);
  return result;
}

export function calculateAutoStandardizedSpacingPositions(
  elements: readonly ElementData[],
  customGap: number,
): Map<string, { x?: number; y?: number }> {
  const structuralElements = elements.filter(isStructuralElement);
  if (structuralElements.length < 2) return new Map();

  const rowClusters = groupByCrossAxisClusters(structuralElements, "horizontal");
  const colClusters = groupByCrossAxisClusters(structuralElements, "vertical");

  const hasMultiElementRows = rowClusters.some((c) => c.length >= 2);
  const hasMultiElementCols = colClusters.some((c) => c.length >= 2);

  if (hasMultiElementRows && hasMultiElementCols) {
    const horizontalUpdates = calculateStandardizedSpacingPositions(
      structuralElements,
      "horizontal",
      customGap,
    );
    const updatedElements = structuralElements.map((el) => {
      const hUpdate = horizontalUpdates.get(el.id);
      return hUpdate?.x !== undefined ? { ...el, x: hUpdate.x } : el;
    });
    const verticalUpdates = calculateStandardizedSpacingPositions(
      updatedElements,
      "vertical",
      customGap,
    );

    const merged = new Map<string, { x?: number; y?: number }>(horizontalUpdates);
    verticalUpdates.forEach((vPos, id) => {
      const prev = merged.get(id) ?? {};
      merged.set(id, { ...prev, ...vPos });
    });
    return merged;
  }

  if (hasMultiElementRows) {
    return calculateStandardizedSpacingPositions(
      structuralElements,
      "horizontal",
      customGap,
    );
  }

  if (hasMultiElementCols) {
    return calculateStandardizedSpacingPositions(
      structuralElements,
      "vertical",
      customGap,
    );
  }

  const bounds = computeElementsBounds(structuralElements);
  const dominantAxis =
    bounds.maxX - bounds.minX >= bounds.maxY - bounds.minY
      ? "horizontal"
      : "vertical";

  return calculateStandardizedSpacingPositions(
    structuralElements,
    dominantAxis,
    customGap,
  );
}
