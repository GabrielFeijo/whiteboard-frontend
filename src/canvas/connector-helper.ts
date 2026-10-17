import { AnchorPoint, ElementData, ElementType } from "@/shared";
import { Point } from "@/canvas/viewport";

const ANCHOR_CALCULATORS: Record<AnchorPoint, (el: ElementData) => Point> = {
  [AnchorPoint.TOP]: (el) => ({ x: el.x + el.w / 2, y: el.y }),
  [AnchorPoint.BOTTOM]: (el) => ({ x: el.x + el.w / 2, y: el.y + el.h }),
  [AnchorPoint.LEFT]: (el) => ({ x: el.x, y: el.y + el.h / 2 }),
  [AnchorPoint.RIGHT]: (el) => ({ x: el.x + el.w, y: el.y + el.h / 2 }),
};

export function getAnchorPoint(el: ElementData, anchor: AnchorPoint): Point {
  return ANCHOR_CALCULATORS[anchor](el);
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

export function findNearestAnchor(
  worldPt: Point,
  elements: readonly ElementData[],
  threshold = 36,
): { elementId: string; anchor: AnchorPoint; pt: Point } | null {
  let closest: { elementId: string; anchor: AnchorPoint; pt: Point } | null = null;
  let minDistance = threshold;

  for (const el of elements) {
    if (
      el.type === ElementType.ARROW ||
      el.type === ElementType.LINE ||
      el.type === ElementType.FREEHAND
    ) {
      continue;
    }

    const isInside =
      worldPt.x >= el.x &&
      worldPt.x <= el.x + el.w &&
      worldPt.y >= el.y &&
      worldPt.y <= el.y + el.h;

    const anchors = getAllAnchorPoints(el);

    if (isInside) {
      let shapeClosest: { anchor: AnchorPoint; pt: Point } | null = null;
      let shapeMinDist = Infinity;
      for (const item of anchors) {
        const dist = Math.hypot(item.pt.x - worldPt.x, item.pt.y - worldPt.y);
        if (dist < shapeMinDist) {
          shapeMinDist = dist;
          shapeClosest = item;
        }
      }
      if (shapeClosest) {
        return {
          elementId: el.id,
          anchor: shapeClosest.anchor,
          pt: shapeClosest.pt,
        };
      }
    }

    const dx = Math.max(el.x - worldPt.x, 0, worldPt.x - (el.x + el.w));
    const dy = Math.max(el.y - worldPt.y, 0, worldPt.y - (el.y + el.h));
    const boxDist = Math.hypot(dx, dy);

    if (boxDist <= threshold) {
      for (const item of anchors) {
        const dist = Math.hypot(item.pt.x - worldPt.x, item.pt.y - worldPt.y);
        if (dist < minDistance) {
          minDistance = dist;
          closest = {
            elementId: el.id,
            anchor: item.anchor,
            pt: item.pt,
          };
        }
      }
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
    if (
      el.type === ElementType.ARROW ||
      el.type === ElementType.LINE ||
      el.type === ElementType.FREEHAND
    ) {
      continue;
    }
    const dx = Math.max(el.x - worldPt.x, 0, worldPt.x - (el.x + el.w));
    const dy = Math.max(el.y - worldPt.y, 0, worldPt.y - (el.y + el.h));
    const boxDist = Math.hypot(dx, dy);
    if (boxDist <= maxDist) {
      const anchors = getAllAnchorPoints(el);
      anchors.forEach((a) => points.push(a.pt));
    }
  }
  return points;
}

export function resolveArrowEndpoints(
  arrow: ElementData,
  getElementById?: (id: string) => ElementData | null,
): { from: Point; to: Point } {
  let from: Point =
    arrow.points && arrow.points.length >= 4
      ? { x: arrow.points[0], y: arrow.points[1] }
      : { x: arrow.x, y: arrow.y };
  let to: Point =
    arrow.points && arrow.points.length >= 4
      ? { x: arrow.points[2], y: arrow.points[3] }
      : { x: arrow.x + arrow.w, y: arrow.y + arrow.h };

  if (getElementById) {
    if (arrow.startBinding) {
      const startEl = getElementById(arrow.startBinding.elementId);
      if (startEl) {
        from = getAnchorPoint(startEl, arrow.startBinding.anchor);
      }
    }
    if (arrow.endBinding) {
      const endEl = getElementById(arrow.endBinding.elementId);
      if (endEl) {
        to = getAnchorPoint(endEl, arrow.endBinding.anchor);
      }
    }
  }

  return { from, to };
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

export function drawCurvedConnector(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  style: ElementData["style"],
  startAnchor?: AnchorPoint,
  endAnchor?: AnchorPoint,
  withArrow = true,
): void {
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

export function getElementBoundingBox(data: ElementData): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  if (
    (data.type === ElementType.LINE || data.type === ElementType.ARROW) &&
    data.points &&
    data.points.length >= 4
  ) {
    const minX = Math.min(data.points[0], data.points[2]);
    const minY = Math.min(data.points[1], data.points[3]);
    const w = Math.max(1, Math.abs(data.points[2] - data.points[0]));
    const h = Math.max(1, Math.abs(data.points[3] - data.points[1]));
    return { x: minX, y: minY, w, h };
  }
  return { x: data.x, y: data.y, w: data.w, h: data.h };
}

