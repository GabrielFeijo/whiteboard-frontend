import { ElementData } from "../../shared";
import { wrapText } from "./text-wrap-helper";

export function drawSticky(
  ctx: CanvasRenderingContext2D,
  el: ElementData,
  placeholder = "Note...",
) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.12)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  ctx.beginPath();
  ctx.roundRect(el.x, el.y, el.w, el.h, 4);
  ctx.fillStyle = el.style.fill || "#fef08a";
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = "14px Inter, sans-serif";
  ctx.textBaseline = "top";
  const text = el.text ?? "";

  const padding = 12;
  const contentX = el.x + padding;
  const contentY = el.y + padding;
  const contentWidth = Math.max(0, el.w - padding * 2);
  const contentHeight = Math.max(0, el.h - padding * 2);

  if (!text) {
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(placeholder, contentX, contentY);
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(contentX, contentY, contentWidth, contentHeight);
  ctx.clip();

  ctx.fillStyle = "#1e293b";
  const lineHeight = 20;
  const lines = wrapText(ctx, text, contentWidth);

  for (let idx = 0; idx < lines.length; idx++) {
    const lineY = contentY + idx * lineHeight;
    if (lineY > contentY + contentHeight) {
      break;
    }
    ctx.fillText(lines[idx], contentX, lineY);
  }

  ctx.restore();
}
