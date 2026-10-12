import { getStroke } from "perfect-freehand";
import { ElementData } from "../../shared";

export function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return "";
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"],
  );
  d.push("Z");
  return d.join(" ");
}

export function drawFreehand(ctx: CanvasRenderingContext2D, el: ElementData) {
  if (!el.points || el.points.length < 2) return;

  const inputPoints: [number, number, number][] = [];
  for (let i = 0; i < el.points.length; i += 3) {
    inputPoints.push([el.points[i], el.points[i + 1], el.points[i + 2] ?? 0.5]);
  }

  const stroke = getStroke(inputPoints, {
    size: el.style.strokeWidth * 3 || 6,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
  });

  if (!stroke.length) return;

  const pathStr = getSvgPathFromStroke(stroke);
  const path = new Path2D(pathStr);
  ctx.fillStyle = el.style.stroke || "#000000";
  ctx.fill(path);
}
