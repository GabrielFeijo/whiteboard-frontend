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
