import { ElementData } from "@/shared";

const MAX_CACHE_ENTRIES = 100;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;
const imageCache = new Map<string, HTMLImageElement>();
const imageRetryCounts = new Map<string, number>();

function extractBoardAssetRef(
  assetId?: string,
  rawSrc?: string,
): { boardId: string; filename: string } | null {
  const assetMatch = assetId?.match(/^boards\/([^/]+)\/([^/?#]+)$/);
  if (assetMatch) {
    return { boardId: assetMatch[1], filename: assetMatch[2] };
  }

  if (!rawSrc || rawSrc.startsWith("data:") || rawSrc.startsWith("blob:")) {
    return null;
  }

  const apiViewMatch = rawSrc.match(/\/boards\/([^/]+)\/assets\/([^/?#]+)\/view/);
  const filename = apiViewMatch ? decodeURIComponent(apiViewMatch[2]).split("/").pop() : null;
  if (apiViewMatch && filename) {
    return { boardId: apiViewMatch[1], filename };
  }

  const s3PathMatch = rawSrc.match(/\/boards\/([^/]+)\/([^/?#]+)(?:\?|$)/);
  if (s3PathMatch) {
    return { boardId: s3PathMatch[1], filename: s3PathMatch[2] };
  }

  return null;
}

export function resolveRenderableImageSrc(el: ElementData): string | null {
  const ref = extractBoardAssetRef(el.assetId, el.src);
  if (!ref) {
    return el.src ?? null;
  }

  let url = `/api/v1/boards/${ref.boardId}/assets/${encodeURIComponent(ref.filename)}/view`;
  const token =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token")
      : null;
  if (token) {
    url += `?token=${encodeURIComponent(token)}`;
  }
  return url;
}

function pruneImageCache(): void {
  if (imageCache.size < MAX_CACHE_ENTRIES) return;
  const oldest = imageCache.keys().next().value;
  if (!oldest) return;
  imageCache.delete(oldest);
}

function pruneOldestRetryEntry(src: string): void {
  if (imageRetryCounts.size < MAX_CACHE_ENTRIES || imageRetryCounts.has(src)) {
    return;
  }
  const oldest = imageRetryCounts.keys().next().value;
  if (oldest) {
    imageRetryCounts.delete(oldest);
  }
}

function recordRetryAttempt(src: string): number {
  pruneOldestRetryEntry(src);
  const attempts = (imageRetryCounts.get(src) ?? 0) + 1;
  imageRetryCounts.set(src, attempts);
  return attempts;
}

export function clearImageRendererCache(): void {
  imageCache.clear();
  imageRetryCounts.clear();
}

function getOrLoadImage(src: string, onImageLoaded?: () => void): HTMLImageElement {
  const existing = imageCache.get(src);
  if (existing) return existing;

  pruneImageCache();

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    imageRetryCounts.delete(src);
    onImageLoaded?.();
  };
  img.onerror = () => {
    imageCache.delete(src);
    const attempts = recordRetryAttempt(src);
    if (attempts <= MAX_RETRY_ATTEMPTS && onImageLoaded) {
      setTimeout(() => {
        onImageLoaded();
      }, RETRY_DELAY_MS * attempts);
    }
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
  const resolvedSrc = resolveRenderableImageSrc(el);
  if (!resolvedSrc) return false;

  const img = getOrLoadImage(resolvedSrc, onImageLoaded);
  if (!img.complete || img.naturalWidth <= 0) return false;

  imageCache.delete(resolvedSrc);
  imageCache.set(resolvedSrc, img);
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
