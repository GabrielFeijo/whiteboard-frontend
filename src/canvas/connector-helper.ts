import { AnchorPoint, ElementData } from "@/shared";
import { Point } from "@/canvas/viewport";

export function getAnchorPoint(el: ElementData, anchor: AnchorPoint): Point {
  switch (anchor) {
    case "top":
      return { x: el.x + el.w / 2, y: el.y };
    case "bottom":
      return { x: el.x + el.w / 2, y: el.y + el.h };
    case "left":
      return { x: el.x, y: el.y + el.h / 2 };
    case "right":
      return { x: el.x + el.w, y: el.y + el.h / 2 };
  }
}

export function getAllAnchorPoints(
  el: ElementData,
): { anchor: AnchorPoint; pt: Point }[] {
  return [
    { anchor: "top", pt: getAnchorPoint(el, "top") },
    { anchor: "right", pt: getAnchorPoint(el, "right") },
    { anchor: "bottom", pt: getAnchorPoint(el, "bottom") },
    { anchor: "left", pt: getAnchorPoint(el, "left") },
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
    if (el.type === "arrow" || el.type === "line" || el.type === "freehand") {
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
    if (el.type === "arrow" || el.type === "line" || el.type === "freehand") {
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

  let cp1x = from.x;
  let cp1y = from.y;
  let cp2x = to.x;
  let cp2y = to.y;

  const curvature = Math.max(30, dist * 0.35);

  if (startAnchor === "top") cp1y -= curvature;
  else if (startAnchor === "bottom") cp1y += curvature;
  else if (startAnchor === "left") cp1x -= curvature;
  else if (startAnchor === "right") cp1x += curvature;
  else {
    cp1x += dx * 0.25;
    cp1y += dy * 0.1;
  }

  if (endAnchor === "top") cp2y -= curvature;
  else if (endAnchor === "bottom") cp2y += curvature;
  else if (endAnchor === "left") cp2x -= curvature;
  else if (endAnchor === "right") cp2x += curvature;
  else {
    cp2x -= dx * 0.25;
    cp2y -= dy * 0.1;
  }

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, to.x, to.y);
  ctx.strokeStyle = style.stroke || "#000000";
  ctx.lineWidth = style.strokeWidth || 2;
  ctx.lineCap = "round";
  ctx.stroke();

  if (withArrow) {
    const arrowAngle = Math.atan2(to.y - cp2y, to.x - cp2x);
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
    (data.type === "line" || data.type === "arrow") &&
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

