import { ElementData } from "@/shared";

export interface TranslatedGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
  points?: number[];
}

export function translateGeometry(
  el: Pick<ElementData, "type" | "x" | "y" | "w" | "h" | "points">,
  dx: number,
  dy: number,
): TranslatedGeometry {
  if (el.type === "line" || el.type === "arrow") {
    const initPts =
      el.points && el.points.length >= 4
        ? el.points
        : [el.x, el.y, el.x + el.w, el.y + el.h];
    const p1x = Math.round(initPts[0] + dx);
    const p1y = Math.round(initPts[1] + dy);
    const p2x = Math.round(initPts[2] + dx);
    const p2y = Math.round(initPts[3] + dy);
    return {
      x: Math.min(p1x, p2x),
      y: Math.min(p1y, p2y),
      w: Math.max(1, Math.abs(p2x - p1x)),
      h: Math.max(1, Math.abs(p2y - p1y)),
      points: [p1x, p1y, p2x, p2y],
    };
  }

  if (el.type === "freehand") {
    const points = el.points?.map((val, idx) =>
      idx % 3 === 0
        ? Math.round(val + dx)
        : idx % 3 === 1
          ? Math.round(val + dy)
          : val,
    );
    return {
      x: Math.round(el.x + dx),
      y: Math.round(el.y + dy),
      w: el.w,
      h: el.h,
      points,
    };
  }

  return {
    x: Math.round(el.x + dx),
    y: Math.round(el.y + dy),
    w: el.w,
    h: el.h,
  };
}
