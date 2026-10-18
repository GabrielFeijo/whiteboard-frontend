import { ElementData } from "@/shared";

const MAX_CACHE_ENTRIES = 100;
const imageCache = new Map<string, HTMLImageElement>();

function pruneImageCache(): void {
  if (imageCache.size < MAX_CACHE_ENTRIES) return;
  const oldest = imageCache.keys().next().value;
  if (!oldest) return;
  imageCache.delete(oldest);
}

function getOrLoadImage(src: string, onImageLoaded?: () => void): HTMLImageElement {
  const existing = imageCache.get(src);
  if (existing) return existing;

  pruneImageCache();

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    onImageLoaded?.();
  };
  img.onerror = () => {
    imageCache.delete(src);
  };
  img.src = src;
  imageCache.set(src, img);
  return img;
}

function tryRenderLoadedImage(
  ctx: CanvasRenderingContext2D,
  el: ElementData,
  onImageLoaded?: () => void,
): boolean {
  if (!el.src) return false;

  const img = getOrLoadImage(el.src, onImageLoaded);
  if (!img.complete || img.naturalWidth <= 0) return false;

  imageCache.delete(el.src);
  imageCache.set(el.src, img);
  ctx.drawImage(img, el.x, el.y, el.w, el.h);
  return true;
}

function renderImagePlaceholder(ctx: CanvasRenderingContext2D, el: ElementData): void {
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

export function drawImageElement(
  ctx: CanvasRenderingContext2D,
  el: ElementData,
  onImageLoaded?: () => void,
): void {
  if (tryRenderLoadedImage(ctx, el, onImageLoaded)) return;
  renderImagePlaceholder(ctx, el);
}
