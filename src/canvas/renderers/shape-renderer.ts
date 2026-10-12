import { ElementData } from '../../shared';

export function drawRect(ctx: CanvasRenderingContext2D, el: ElementData) {
  ctx.beginPath();
  ctx.roundRect(el.x, el.y, el.w, el.h, 6);
  if (el.style.fill && el.style.fill !== 'transparent') {
    ctx.fillStyle = el.style.fill;
    ctx.fill();
  }
  if (el.style.stroke && el.style.strokeWidth > 0) {
    ctx.strokeStyle = el.style.stroke;
    ctx.lineWidth = el.style.strokeWidth;
    ctx.stroke();
  }
}

export function drawEllipse(ctx: CanvasRenderingContext2D, el: ElementData) {
  ctx.beginPath();
  const rx = Math.abs(el.w / 2);
  const ry = Math.abs(el.h / 2);
  const cx = el.x + rx;
  const cy = el.y + ry;
  ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
  if (el.style.fill && el.style.fill !== 'transparent') {
    ctx.fillStyle = el.style.fill;
    ctx.fill();
  }
  if (el.style.stroke && el.style.strokeWidth > 0) {
    ctx.strokeStyle = el.style.stroke;
    ctx.lineWidth = el.style.strokeWidth;
    ctx.stroke();
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
  if (el.style.fill && el.style.fill !== 'transparent') {
    ctx.fillStyle = el.style.fill;
    ctx.fill();
  }
  if (el.style.stroke && el.style.strokeWidth > 0) {
    ctx.strokeStyle = el.style.stroke;
    ctx.lineWidth = el.style.strokeWidth;
    ctx.stroke();
  }
}

export function drawLine(ctx: CanvasRenderingContext2D, el: ElementData) {
  ctx.beginPath();
  ctx.moveTo(el.x, el.y);
  ctx.lineTo(el.x + el.w, el.y + el.h);
  ctx.strokeStyle = el.style.stroke || '#000000';
  ctx.lineWidth = el.style.strokeWidth || 2;
  ctx.lineCap = 'round';
  ctx.stroke();
}

export function drawArrow(ctx: CanvasRenderingContext2D, el: ElementData) {
  const fromX = el.x;
  const fromY = el.y;
  const toX = el.x + el.w;
  const toY = el.y + el.h;
  const headLen = 14;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.strokeStyle = el.style.stroke || '#000000';
  ctx.lineWidth = el.style.strokeWidth || 2;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Arrow head
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = el.style.stroke || '#000000';
  ctx.fill();
}
