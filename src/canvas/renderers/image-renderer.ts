import { ElementData } from "@/shared";

const imageCache = new Map<string, HTMLImageElement>();

export function drawImageElement(
  ctx: CanvasRenderingContext2D,
  el: ElementData,
  onImageLoaded?: () => void,
): void {
  const src = el.src;

  if (src) {
    let img = imageCache.get(src);
    if (!img) {
      img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        onImageLoaded?.();
      };
      img.src = src;
      imageCache.set(src, img);
    }

    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, el.x, el.y, el.w, el.h);
      return;
    }
  }

  ctx.fillStyle = "#f3f4f6";
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(el.x, el.y, el.w, el.h, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#9ca3af";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Image", el.x + el.w / 2, el.y + el.h / 2);
}
