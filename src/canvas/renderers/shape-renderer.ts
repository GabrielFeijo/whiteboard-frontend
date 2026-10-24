import { ElementData } from "../../shared";
import {
  drawCurvedArrow,
  drawCurvedLine,
  resolveArrowEndpoints,
} from "@/canvas/connector-helper";
import { wrapText } from "./text-wrap-helper";

function drawWrappedShapeText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxTextWidth: number,
  color: string,
): void {
  ctx.save();
  ctx.font = "14px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;

  const lines = wrapText(ctx, text, Math.max(20, maxTextWidth));
  const lineHeight = 18;
  const totalHeight = lines.length * lineHeight;
  const startY = cy - totalHeight / 2 + lineHeight / 2;

  lines.forEach((line, idx) => {
    ctx.fillText(line, cx, startY + idx * lineHeight);
  });

  ctx.restore();
}

export function drawRect(ctx: CanvasRenderingContext2D, el: ElementData) {
  ctx.beginPath();
  ctx.roundRect(el.x, el.y, el.w, el.h, 6);
  if (el.style.fill && el.style.fill !== "transparent") {
    ctx.fillStyle = el.style.fill;
    ctx.fill();
  }
  if (el.style.stroke && el.style.strokeWidth > 0) {
    ctx.strokeStyle = el.style.stroke;
    ctx.lineWidth = el.style.strokeWidth;
    ctx.stroke();
  }
  if (el.text) {
    drawWrappedShapeText(
      ctx,
      el.text,
      el.x + el.w / 2,
      el.y + el.h / 2,
      el.w - 16,
      el.style.stroke || "#0f172a",
    );
  }
}

export function drawEllipse(ctx: CanvasRenderingContext2D, el: ElementData) {
  ctx.beginPath();
  const rx = Math.abs(el.w / 2);
  const ry = Math.abs(el.h / 2);
  const cx = el.x + rx;
  const cy = el.y + ry;
  ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
  if (el.style.fill && el.style.fill !== "transparent") {
    ctx.fillStyle = el.style.fill;
    ctx.fill();
  }
  if (el.style.stroke && el.style.strokeWidth > 0) {
    ctx.strokeStyle = el.style.stroke;
    ctx.lineWidth = el.style.strokeWidth;
    ctx.stroke();
  }
  if (el.text) {
    drawWrappedShapeText(
      ctx,
      el.text,
      cx,
      cy,
      el.w * 0.72,
      el.style.stroke || "#0f172a",
    );
  }
}

export function drawDiamond(ctx: CanvasRenderingContext2D, el: ElementData) {
  ctx.beginPath();
  const midX = el.x + el.w / 2;
  const midY = el.y + el.h / 2;
  ctx.moveTo(midX, el.y);
  ctx.lineTo(el.x + el.w, midY);
  ctx.lineTo(midX, el.y + el.h);
  ctx.lineTo(el.x, midY);
  ctx.closePath();
  if (el.style.fill && el.style.fill !== "transparent") {
    ctx.fillStyle = el.style.fill;
    ctx.fill();
  }
  if (el.style.stroke && el.style.strokeWidth > 0) {
    ctx.strokeStyle = el.style.stroke;
    ctx.lineWidth = el.style.strokeWidth;
    ctx.stroke();
  }
  if (el.text) {
    drawWrappedShapeText(
      ctx,
      el.text,
      midX,
      midY,
      el.w * 0.56,
      el.style.stroke || "#0f172a",
    );
  }
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  el: ElementData,
  getElementById?: (id: string) => ElementData | null,
) {
  const { from, to } = resolveArrowEndpoints(el, getElementById);

  if (el.startBinding || el.endBinding) {
    drawCurvedLine(
      ctx,
      from,
      to,
      el.style,
      el.startBinding?.anchor,
      el.endBinding?.anchor,
    );
    return;
  }

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = el.style.stroke || "#000000";
  ctx.lineWidth = el.style.strokeWidth || 2;
  ctx.lineCap = "round";
  ctx.stroke();
}

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  el: ElementData,
  getElementById?: (id: string) => ElementData | null,
) {
  const { from, to } = resolveArrowEndpoints(el, getElementById);

  if (el.startBinding || el.endBinding) {
    drawCurvedArrow(
      ctx,
      from,
      to,
      el.style,
      el.startBinding?.anchor,
      el.endBinding?.anchor,
    );
    return;
  }

  const fromX = from.x;
  const fromY = from.y;
  const toX = to.x;
  const toY = to.y;
  const headLen = Math.max(10, Math.min(16, (el.style.strokeWidth || 2) * 5));
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.strokeStyle = el.style.stroke || "#000000";
  ctx.lineWidth = el.style.strokeWidth || 2;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLen * Math.cos(angle - Math.PI / 6),
    toY - headLen * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    toX - headLen * Math.cos(angle + Math.PI / 6),
    toY - headLen * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fillStyle = el.style.stroke || "#000000";
  ctx.fill();
}
