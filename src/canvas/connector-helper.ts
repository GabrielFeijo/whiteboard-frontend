import { AnchorPoint, ElementData, ElementType } from "@/shared";
import { Point } from "@/canvas/viewport";

const ANCHOR_CALCULATORS: Record<AnchorPoint, (el: ElementData) => Point> = {
  [AnchorPoint.TOP]: (el) => ({ x: el.x + el.w / 2, y: el.y }),
  [AnchorPoint.BOTTOM]: (el) => ({ x: el.x + el.w / 2, y: el.y + el.h }),
  [AnchorPoint.LEFT]: (el) => ({ x: el.x, y: el.y + el.h / 2 }),
  [AnchorPoint.RIGHT]: (el) => ({ x: el.x + el.w, y: el.y + el.h / 2 }),
};

export function getAnchorPoint(el: ElementData, anchor: AnchorPoint): Point {
  const basePt = ANCHOR_CALCULATORS[anchor](el);
  if (!el.rotation || el.rotation % 360 === 0) {
    return basePt;
  }
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;
  const rad = (el.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = basePt.x - cx;
  const dy = basePt.y - cy;
  return {
    x: Math.round(cx + dx * cos - dy * sin),
    y: Math.round(cy + dx * sin + dy * cos),
  };
}

export function getAllAnchorPoints(
  el: ElementData,
): { anchor: AnchorPoint; pt: Point }[] {
  return [
    { anchor: AnchorPoint.TOP, pt: getAnchorPoint(el, AnchorPoint.TOP) },
    { anchor: AnchorPoint.RIGHT, pt: getAnchorPoint(el, AnchorPoint.RIGHT) },
    { anchor: AnchorPoint.BOTTOM, pt: getAnchorPoint(el, AnchorPoint.BOTTOM) },
    { anchor: AnchorPoint.LEFT, pt: getAnchorPoint(el, AnchorPoint.LEFT) },
  ];
}

function isConnectableElement(el: ElementData): boolean {
  return (
    el.type !== ElementType.ARROW &&
    el.type !== ElementType.LINE &&
    el.type !== ElementType.FREEHAND
  );
}

function isPointInsideElementBounds(pt: Point, el: ElementData): boolean {
  return (
    pt.x >= el.x &&
    pt.x <= el.x + el.w &&
    pt.y >= el.y &&
    pt.y <= el.y + el.h
  );
}

function findClosestAnchor(
  pt: Point,
  anchors: readonly { anchor: AnchorPoint; pt: Point }[],
  maxDistance = Infinity,
): { anchor: AnchorPoint; pt: Point; distance: number } | null {
  let closest: { anchor: AnchorPoint; pt: Point; distance: number } | null = null;
  let minDistance = maxDistance;

  for (const item of anchors) {
    const dist = Math.hypot(item.pt.x - pt.x, item.pt.y - pt.y);
    if (dist < minDistance) {
      minDistance = dist;
      closest = { anchor: item.anchor, pt: item.pt, distance: dist };
    }
  }

  return closest;
}

function getDistanceToBoundingBox(pt: Point, el: ElementData): number {
  const dx = Math.max(el.x - pt.x, 0, pt.x - (el.x + el.w));
  const dy = Math.max(el.y - pt.y, 0, pt.y - (el.y + el.h));
  return Math.hypot(dx, dy);
}

function tryGetInsideAnchorMatch(
  worldPt: Point,
  el: ElementData,
  anchors: readonly { anchor: AnchorPoint; pt: Point }[],
): { elementId: string; anchor: AnchorPoint; pt: Point } | null {
  if (!isPointInsideElementBounds(worldPt, el)) {
    return null;
  }
  const match = findClosestAnchor(worldPt, anchors);
  if (!match) {
    return null;
  }
  return {
    elementId: el.id,
    anchor: match.anchor,
    pt: match.pt,
  };
}

export function findNearestAnchor(
  worldPt: Point,
  elements: readonly ElementData[],
  threshold = 36,
): { elementId: string; anchor: AnchorPoint; pt: Point } | null {
  let closest: { elementId: string; anchor: AnchorPoint; pt: Point } | null = null;
  let minDistance = threshold;

  for (const el of elements) {
    if (!isConnectableElement(el)) {
      continue;
    }

    const anchors = getAllAnchorPoints(el);
    const insideMatch = tryGetInsideAnchorMatch(worldPt, el, anchors);
    if (insideMatch) {
      return insideMatch;
    }

    if (getDistanceToBoundingBox(worldPt, el) > threshold) {
      continue;
    }

    const match = findClosestAnchor(worldPt, anchors, minDistance);
    if (match) {
      minDistance = match.distance;
      closest = {
        elementId: el.id,
        anchor: match.anchor,
        pt: match.pt,
      };
    }
  }

  return closest;
}

export function getNearbyAnchorPoints(
  worldPt: Point,
  elements: readonly ElementData[],
  maxDist = 140,
): Point[] {
  const points: Point[] = [];
  for (const el of elements) {
    if (!isConnectableElement(el) || getDistanceToBoundingBox(worldPt, el) > maxDist) {
      continue;
    }
    const anchors = getAllAnchorPoints(el);
    for (const a of anchors) {
      points.push(a.pt);
    }
  }
  return points;
}

function resolveBoundEndpoint(
  binding: ElementData["startBinding"],
  getElementById?: (id: string) => ElementData | null,
): Point | null {
  if (!binding || !getElementById) {
    return null;
  }
  const boundEl = getElementById(binding.elementId);
  if (!boundEl) {
    return null;
  }
  return getAnchorPoint(boundEl, binding.anchor);
}

export function resolveArrowEndpoints(
  arrow: ElementData,
  getElementById?: (id: string) => ElementData | null,
): { from: Point; to: Point } {
  const defaultFrom: Point =
    arrow.points && arrow.points.length >= 4
      ? { x: arrow.points[0], y: arrow.points[1] }
      : { x: arrow.x, y: arrow.y };
  const defaultTo: Point =
    arrow.points && arrow.points.length >= 4
      ? { x: arrow.points[2], y: arrow.points[3] }
      : { x: arrow.x + arrow.w, y: arrow.y + arrow.h };

  return {
    from: resolveBoundEndpoint(arrow.startBinding, getElementById) ?? defaultFrom,
    to: resolveBoundEndpoint(arrow.endBinding, getElementById) ?? defaultTo,
  };
}

const ANCHOR_VECTORS: Record<AnchorPoint, { x: number; y: number }> = {
  [AnchorPoint.TOP]: { x: 0, y: -1 },
  [AnchorPoint.BOTTOM]: { x: 0, y: 1 },
  [AnchorPoint.LEFT]: { x: -1, y: 0 },
  [AnchorPoint.RIGHT]: { x: 1, y: 0 },
};

function computeControlPoint(
  origin: Point,
  anchor: AnchorPoint | undefined,
  curvature: number,
  fallbackDelta: { x: number; y: number },
): Point {
  if (anchor && ANCHOR_VECTORS[anchor]) {
    const vec = ANCHOR_VECTORS[anchor];
    return {
      x: origin.x + vec.x * curvature,
      y: origin.y + vec.y * curvature,
    };
  }
  return {
    x: origin.x + fallbackDelta.x,
    y: origin.y + fallbackDelta.y,
  };
}

export function computeConnectorCurve(
  from: Point,
  to: Point,
  startAnchor?: AnchorPoint,
  endAnchor?: AnchorPoint,
): { cp1: Point; cp2: Point } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const curvature = Math.max(30, dist * 0.35);

  const cp1 = computeControlPoint(from, startAnchor, curvature, {
    x: dx * 0.25,
    y: dy * 0.1,
  });
  const cp2 = computeControlPoint(to, endAnchor, curvature, {
    x: -dx * 0.25,
    y: -dy * 0.1,
  });

  return { cp1, cp2 };
}

export function drawCurvedConnector(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  style: ElementData["style"],
  startAnchor?: AnchorPoint,
  endAnchor?: AnchorPoint,
  withArrow = true,
): void {
  const { cp1, cp2 } = computeConnectorCurve(from, to, startAnchor, endAnchor);

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, to.x, to.y);
  ctx.strokeStyle = style.stroke || "#000000";
  ctx.lineWidth = style.strokeWidth || 2;
  ctx.lineCap = "round";
  ctx.stroke();

  if (withArrow) {
    const arrowAngle = Math.atan2(to.y - cp2.y, to.x - cp2.x);
    const headLen = Math.max(10, Math.min(16, (style.strokeWidth || 2) * 5));

    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - headLen * Math.cos(arrowAngle - Math.PI / 6),
      to.y - headLen * Math.sin(arrowAngle - Math.PI / 6),
    );
    ctx.lineTo(
      to.x - headLen * Math.cos(arrowAngle + Math.PI / 6),
      to.y - headLen * Math.sin(arrowAngle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fillStyle = style.stroke || "#000000";
    ctx.fill();
  }
}

export function drawCurvedArrow(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  style: ElementData["style"],
  startAnchor?: AnchorPoint,
  endAnchor?: AnchorPoint,
): void {
  drawCurvedConnector(ctx, from, to, style, startAnchor, endAnchor, true);
}

export function drawCurvedLine(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  style: ElementData["style"],
  startAnchor?: AnchorPoint,
  endAnchor?: AnchorPoint,
): void {
  drawCurvedConnector(ctx, from, to, style, startAnchor, endAnchor, false);
}

function getConnectorBoundingBox(data: ElementData): {
  x: number;
  y: number;
  w: number;
  h: number;
} | null {
  const isLineOrArrow = data.type === ElementType.LINE || data.type === ElementType.ARROW;
  if (!isLineOrArrow || !data.points || data.points.length < 4) {
    return null;
  }

  const from: Point = { x: data.points[0], y: data.points[1] };
  const to: Point = { x: data.points[2], y: data.points[3] };
  let minX = Math.min(from.x, to.x);
  let minY = Math.min(from.y, to.y);
  let maxX = Math.max(from.x, to.x);
  let maxY = Math.max(from.y, to.y);

  if (data.startBinding || data.endBinding) {
    const { cp1, cp2 } = computeConnectorCurve(
      from,
      to,
      data.startBinding?.anchor,
      data.endBinding?.anchor,
    );
    minX = Math.min(minX, cp1.x, cp2.x);
    minY = Math.min(minY, cp1.y, cp2.y);
    maxX = Math.max(maxX, cp1.x, cp2.x);
    maxY = Math.max(maxY, cp1.y, cp2.y);
  }

  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  return { x: minX, y: minY, w, h };
}

function getRotatedBoundingBox(data: ElementData): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const rad = ((data.rotation ?? 0) * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(rad));
  const absSin = Math.abs(Math.sin(rad));
  const rotatedW = data.w * absCos + data.h * absSin;
  const rotatedH = data.w * absSin + data.h * absCos;
  const cx = data.x + data.w / 2;
  const cy = data.y + data.h / 2;
  return {
    x: cx - rotatedW / 2,
    y: cy - rotatedH / 2,
    w: Math.max(1, rotatedW),
    h: Math.max(1, rotatedH),
  };
}

export function getElementBoundingBox(data: ElementData): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const connectorBBox = getConnectorBoundingBox(data);
  if (connectorBBox) {
    return connectorBBox;
  }

  if (data.rotation && data.rotation % 360 !== 0) {
    return getRotatedBoundingBox(data);
  }

  return { x: data.x, y: data.y, w: data.w, h: data.h };
}

