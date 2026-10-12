import { ElementData } from "../../shared";

export function drawText(ctx: CanvasRenderingContext2D, el: ElementData) {
  ctx.fillStyle = el.style.stroke || "#000000";
  ctx.font = "16px Inter, sans-serif";
  ctx.textBaseline = "top";
  const text = el.text || "Text";
  const lines = text.split("\n");
  lines.forEach((line, idx) => {
    ctx.fillText(line, el.x, el.y + idx * 22);
  });
}
