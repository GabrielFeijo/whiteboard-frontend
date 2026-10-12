import { ElementData } from "../../shared";

export function drawSticky(ctx: CanvasRenderingContext2D, el: ElementData) {
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

  if (el.text) {
    ctx.fillStyle = "#1e293b";
    ctx.font = "14px Inter, sans-serif";
    ctx.textBaseline = "top";
    const lines = el.text.split("\n");
    lines.forEach((line, idx) => {
      ctx.fillText(line, el.x + 12, el.y + 12 + idx * 20, el.w - 24);
    });
  }
}
