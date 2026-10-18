import { Point, Viewport } from "./viewport";
import { ElementData, ElementType } from "../shared";
import { resolveArrowEndpoints } from "./connector-helper";

export const ResizeHandleType = {
  NW: "nw",
  N: "n",
  NE: "ne",
  E: "e",
  SE: "se",
  S: "s",
  SW: "sw",
  W: "w",
  START: "start",
  END: "end",
} as const;
export type ResizeHandleType =
  (typeof ResizeHandleType)[keyof typeof ResizeHandleType];

export interface ResizeHandle {
  type: ResizeHandleType;
  x: number;
  y: number;
  cursor: string;
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function getLineHandles(
  el: ElementData,
  getElementById?: (id: string) => ElementData | null,
): ResizeHandle[] {
  const { from, to } = resolveArrowEndpoints(el, getElementById);
  return [
    { type: ResizeHandleType.START, x: from.x, y: from.y, cursor: "crosshair" },
    { type: ResizeHandleType.END, x: to.x, y: to.y, cursor: "crosshair" },
  ];
}

export function getElementHandles(bounds: Bounds): ResizeHandle[] {
  const minX = bounds.x;
  const minY = bounds.y;
  const maxX = bounds.x + bounds.w;
  const maxY = bounds.y + bounds.h;
  const midX = bounds.x + bounds.w / 2;
  const midY = bounds.y + bounds.h / 2;

  return [
    { type: ResizeHandleType.NW, x: minX, y: minY, cursor: "nwse-resize" },
    { type: ResizeHandleType.N, x: midX, y: minY, cursor: "ns-resize" },
    { type: ResizeHandleType.NE, x: maxX, y: minY, cursor: "nesw-resize" },
    { type: ResizeHandleType.E, x: maxX, y: midY, cursor: "ew-resize" },
    { type: ResizeHandleType.SE, x: maxX, y: maxY, cursor: "nwse-resize" },
    { type: ResizeHandleType.S, x: midX, y: maxY, cursor: "ns-resize" },
    { type: ResizeHandleType.SW, x: minX, y: maxY, cursor: "nesw-resize" },
    { type: ResizeHandleType.W, x: minX, y: midY, cursor: "ew-resize" },
  ];
}

function findHitHandle(
  handles: ResizeHandle[],
  screenPt: Point,
  viewport: Viewport,
  hitRadius: number,
): ResizeHandle | null {
  for (const handle of handles) {
    const handleScreenPt = viewport.worldToScreen({ x: handle.x, y: handle.y });
    const dist = Math.hypot(screenPt.x - handleScreenPt.x, screenPt.y - handleScreenPt.y);
    if (dist <= hitRadius) {
      return handle;
    }
  }
  return null;
}

function getTargetHandles(
  bounds: Bounds | ElementData,
  getElementById?: (id: string) => ElementData | null,
): ResizeHandle[] {
  const el = bounds as ElementData;
  if (el.type === ElementType.LINE || el.type === ElementType.ARROW) {
    return getLineHandles(el, getElementById);
  }
  return getElementHandles(bounds);
}

export function getHandleAt(
  screenPt: Point,
  bounds: Bounds | ElementData,
  viewport: Viewport,
  hitRadius = 10,
  getElementById?: (id: string) => ElementData | null,
): ResizeHandle | null {
  const handles = getTargetHandles(bounds, getElementById);
  return findHitHandle(handles, screenPt, viewport, hitRadius);
}

export interface ResizeOptions {
  handle: ResizeHandleType;
  initialBounds: Bounds;
  dx: number;
  dy: number;
  minWidth?: number;
  minHeight?: number;
  keepAspectRatio?: boolean;
}

export interface HandleDirection {
  dirX: -1 | 0 | 1;
  dirY: -1 | 0 | 1;
}

export const HANDLE_DIRECTIONS: Partial<Record<ResizeHandleType, HandleDirection>> = {
  [ResizeHandleType.NW]: { dirX: -1, dirY: -1 },
  [ResizeHandleType.N]: { dirX: 0, dirY: -1 },
  [ResizeHandleType.NE]: { dirX: 1, dirY: -1 },
  [ResizeHandleType.E]: { dirX: 1, dirY: 0 },
  [ResizeHandleType.SE]: { dirX: 1, dirY: 1 },
  [ResizeHandleType.S]: { dirX: 0, dirY: 1 },
  [ResizeHandleType.SW]: { dirX: -1, dirY: 1 },
  [ResizeHandleType.W]: { dirX: -1, dirY: 0 },
};

function adjustDimensionsForAspectRatio(
  w: number,
  h: number,
  ratio: number,
  minWidth: number,
  minHeight: number,
  handle: ResizeHandleType,
  config: HandleDirection,
): { w: number; h: number } {
  if (config.dirX !== 0 && config.dirY === 0) {
    return { w, h: Math.max(minHeight, w / ratio) };
  }
  if (config.dirX === 0 && config.dirY !== 0) {
    return { w: Math.max(minWidth, h * ratio), h };
  }
  if (handle === ResizeHandleType.SE) {
    const candidateH = w / ratio;
    if (candidateH >= minHeight) {
      return { w, h: candidateH };
    }
    return { w: h * ratio, h };
  }
  return { w, h: w / ratio };
}

export function calculateResizedBounds({
  handle,
  initialBounds,
  dx,
  dy,
  minWidth = 10,
  minHeight = 10,
  keepAspectRatio = false,
}: ResizeOptions): Bounds {
  const { x, y, w, h } = initialBounds;
  let newX = x;
  let newY = y;
  let newW = w;
  let newH = h;

  const ratio = w > 0 && h > 0 ? w / h : 1;
  const config = HANDLE_DIRECTIONS[handle] ?? { dirX: 1, dirY: 1 };

  if (config.dirX !== 0) {
    newW = Math.max(minWidth, w + config.dirX * dx);
  }
  if (config.dirY !== 0) {
    newH = Math.max(minHeight, h + config.dirY * dy);
  }

  if (keepAspectRatio) {
    const adjusted = adjustDimensionsForAspectRatio(
      newW,
      newH,
      ratio,
      minWidth,
      minHeight,
      handle,
      config,
    );
    newW = adjusted.w;
    newH = adjusted.h;
  }

  if (config.dirX === -1) {
    newX = x + (w - newW);
  }
  if (config.dirY === -1) {
    newY = y + (h - newH);
  }

  return {
    x: Math.round(newX),
    y: Math.round(newY),
    w: Math.round(Math.max(minWidth, newW)),
    h: Math.round(Math.max(minHeight, newH)),
  };
}

export function scaleFreehandPoints(
  points: number[],
  initialBounds: Bounds,
  newBounds: Bounds,
): number[] {
  if (!points || points.length === 0 || initialBounds.w === 0 || initialBounds.h === 0) {
    return points;
  }

  const scaleX = newBounds.w / initialBounds.w;
  const scaleY = newBounds.h / initialBounds.h;

  return points.map((val, idx) => {
    if (idx % 3 === 0) {
      return Math.round(newBounds.x + (val - initialBounds.x) * scaleX);
    } else if (idx % 3 === 1) {
      return Math.round(newBounds.y + (val - initialBounds.y) * scaleY);
    }
    return val;
  });
}

function applyInverseRotation(point: Point, el: ElementData): Point {
  if (!el.rotation || el.rotation === 0) {
    return point;
  }
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const rad = (-el.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - cx;
  const dy = point.y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

function testRectHit(p: Point, el: ElementData): boolean {
  return p.x >= el.x && p.x <= el.x + el.w && p.y >= el.y && p.y <= el.y + el.h;
}

function testLineHit(p: Point, el: ElementData): boolean {
  const x1 = el.points && el.points.length >= 4 ? el.points[0] : el.x;
  const y1 = el.points && el.points.length >= 4 ? el.points[1] : el.y;
  const x2 = el.points && el.points.length >= 4 ? el.points[2] : el.x + el.w;
  const y2 = el.points && el.points.length >= 4 ? el.points[3] : el.y + el.h;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  const tolerance = Math.max((el.style?.strokeWidth || 2) + 8, 12);

  if (lenSq === 0) {
    return Math.hypot(p.x - x1, p.y - y1) <= tolerance;
  }

  const t = Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(p.x - projX, p.y - projY) <= tolerance;
}

type ShapeHitTester = (p: Point, el: ElementData, cx: number, cy: number) => boolean;

const SHAPE_HIT_TESTERS: Partial<Record<ElementData["type"], ShapeHitTester>> = {
  [ElementType.ELLIPSE]: (p, el, cx, cy) => {
    const rx = Math.abs(el.w / 2);
    const ry = Math.abs(el.h / 2);
    if (rx <= 0 || ry <= 0) return false;
    const normX = (p.x - cx) / rx;
    const normY = (p.y - cy) / ry;
    return normX * normX + normY * normY <= 1;
  },
  [ElementType.DIAMOND]: (p, el, cx, cy) => {
    const rx = Math.abs(el.w / 2);
    const ry = Math.abs(el.h / 2);
    if (rx <= 0 || ry <= 0) return false;
    return Math.abs(p.x - cx) / rx + Math.abs(p.y - cy) / ry <= 1;
  },
  [ElementType.LINE]: testLineHit,
  [ElementType.ARROW]: testLineHit,
  [ElementType.FREEHAND]: (p, el) => {
    const pad = Math.max((el.style?.strokeWidth || 2) + 4, 6);
    return (
      p.x >= el.x - pad &&
      p.x <= el.x + el.w + pad &&
      p.y >= el.y - pad &&
      p.y <= el.y + el.h + pad
    );
  },
};

export function isPointInElement(point: Point, el: ElementData): boolean {
  const transformed = applyInverseRotation(point, el);
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const tester = SHAPE_HIT_TESTERS[el.type] ?? testRectHit;
  return tester(transformed, el, cx, cy);
}
