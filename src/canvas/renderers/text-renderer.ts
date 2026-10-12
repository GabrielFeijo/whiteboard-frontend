import { ElementData } from "../../shared";

let cachedMeasureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!cachedMeasureCtx) {
    const canvas = document.createElement("canvas");
    cachedMeasureCtx = canvas.getContext("2d");
  }
  return cachedMeasureCtx;
}

export function measureTextDimensions(
  text: string,
  font = "16px Inter, sans-serif",
): { w: number; h: number } {
  const content = text || " ";
  const lines = content.split("\n");
  let maxW = 40;
  const ctx = getMeasureContext();

  if (ctx) {
    ctx.font = font;
    lines.forEach((line) => {
      const metrics = ctx.measureText(line || " ");
      if (metrics.width > maxW) maxW = metrics.width;
    });
  }

  const w = Math.ceil(maxW + 16);
  const h = Math.max(32, lines.length * 24 + 8);
  return { w, h };
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  el: ElementData,
  placeholder = "Text...",
) {
  ctx.save();
  ctx.font = "16px Inter, sans-serif";
  ctx.textBaseline = "top";
  const text = el.text ?? "";

  if (!text) {
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(placeholder, el.x, el.y);
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
