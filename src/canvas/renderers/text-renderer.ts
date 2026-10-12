import { ElementData } from "../../shared";

export function measureTextDimensions(
  text: string,
  font = "16px Inter, sans-serif",
): { w: number; h: number } {
  const content = text || "Texto";
  const lines = content.split("\n");
  let maxW = 40;
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = font;
      lines.forEach((line) => {
        const metrics = ctx.measureText(line || " ");
        if (metrics.width > maxW) maxW = metrics.width;
      });
    }
  }
  const w = Math.ceil(maxW + 16);
  const h = Math.max(32, lines.length * 24 + 8);
  return { w, h };
}

export function drawText(ctx: CanvasRenderingContext2D, el: ElementData) {
  ctx.save();
  ctx.font = "16px Inter, sans-serif";
  ctx.textBaseline = "top";
  const text = el.text ?? "";
  if (!text) {
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Texto...", el.x, el.y);
    ctx.restore();
    return;
  }
  ctx.fillStyle = el.style.stroke || "#0f172a";
  const lines = text.split("\n");
  lines.forEach((line, idx) => {
    ctx.fillText(line, el.x, el.y + idx * 24);
  });
  ctx.restore();
}
