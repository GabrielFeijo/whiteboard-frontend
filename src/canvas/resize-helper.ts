import { Point, Viewport } from "./viewport";
import { ElementData } from "../shared";

export type ResizeHandleType =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

export interface ResizeHandle {
  type: ResizeHandleType;
  x: number;
  y: number;
  cursor: string;
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function getElementHandles(bounds: Bounds): ResizeHandle[] {
  const minX = bounds.x;
  const minY = bounds.y;
  const maxX = bounds.x + bounds.w;
  const maxY = bounds.y + bounds.h;
  const midX = bounds.x + bounds.w / 2;
  const midY = bounds.y + bounds.h / 2;

  return [
    { type: "nw", x: minX, y: minY, cursor: "nwse-resize" },
    { type: "n", x: midX, y: minY, cursor: "ns-resize" },
    { type: "ne", x: maxX, y: minY, cursor: "nesw-resize" },
    { type: "e", x: maxX, y: midY, cursor: "ew-resize" },
    { type: "se", x: maxX, y: maxY, cursor: "nwse-resize" },
    { type: "s", x: midX, y: maxY, cursor: "ns-resize" },
    { type: "sw", x: minX, y: maxY, cursor: "nesw-resize" },
    { type: "w", x: minX, y: midY, cursor: "ew-resize" },
  ];
}

export function getHandleAt(
  screenPt: Point,
  bounds: Bounds,
  viewport: Viewport,
  hitRadius = 10,
): ResizeHandle | null {
  const handles = getElementHandles(bounds);

  for (const handle of handles) {
    const handleScreenPt = viewport.worldToScreen({ x: handle.x, y: handle.y });
    const dist = Math.hypot(screenPt.x - handleScreenPt.x, screenPt.y - handleScreenPt.y);
    if (dist <= hitRadius) {
      return handle;
    }
  }

  return null;
}

export interface ResizeOptions {
  handle: ResizeHandleType;
  initialBounds: Bounds;
  dx: number;
  dy: number;
  minWidth?: number;
  minHeight?: number;
  keepAspectRatio?: boolean;
}

export function calculateResizedBounds({
  handle,
  initialBounds,
  dx,
  dy,
  minWidth = 10,
  minHeight = 10,
  keepAspectRatio = false,
}: ResizeOptions): Bounds {
  const { x, y, w, h } = initialBounds;
  let newX = x;
  let newY = y;
  let newW = w;
  let newH = h;

  const ratio = w > 0 && h > 0 ? w / h : 1;

  switch (handle) {
    case "se": {
      newW = Math.max(minWidth, w + dx);
      newH = Math.max(minHeight, h + dy);
      if (keepAspectRatio) {
        if (newW / ratio >= minHeight) {
          newH = newW / ratio;
        } else {
          newW = newH * ratio;
        }
      }
      break;
    }
    case "e": {
      newW = Math.max(minWidth, w + dx);
      if (keepAspectRatio) {
        newH = Math.max(minHeight, newW / ratio);
      }
      break;
    }
    case "s": {
      newH = Math.max(minHeight, h + dy);
      if (keepAspectRatio) {
        newW = Math.max(minWidth, newH * ratio);
      }
      break;
    }
    case "ne": {
      newW = Math.max(minWidth, w + dx);
      newH = Math.max(minHeight, h - dy);
      if (keepAspectRatio) {
        newH = newW / ratio;
      }
      newY = y + (h - newH);
      break;
    }
    case "n": {
      newH = Math.max(minHeight, h - dy);
      if (keepAspectRatio) {
        newW = Math.max(minWidth, newH * ratio);
      }
      newY = y + (h - newH);
      break;
    }
    case "nw": {
      newW = Math.max(minWidth, w - dx);
      newH = Math.max(minHeight, h - dy);
      if (keepAspectRatio) {
        newH = newW / ratio;
      }
      newX = x + (w - newW);
      newY = y + (h - newH);
      break;
    }
    case "w": {
      newW = Math.max(minWidth, w - dx);
      if (keepAspectRatio) {
        newH = Math.max(minHeight, newW / ratio);
      }
      newX = x + (w - newW);
      break;
    }
    case "sw": {
      newW = Math.max(minWidth, w - dx);
      newH = Math.max(minHeight, h + dy);
      if (keepAspectRatio) {
        newH = newW / ratio;
      }
      newX = x + (w - newW);
      break;
    }
  }

  return {
    x: Math.round(newX),
    y: Math.round(newY),
    w: Math.round(Math.max(minWidth, newW)),
    h: Math.round(Math.max(minHeight, newH)),
  };
}

export function scaleFreehandPoints(
  points: number[],
  initialBounds: Bounds,
  newBounds: Bounds,
): number[] {
  if (!points || points.length === 0 || initialBounds.w === 0 || initialBounds.h === 0) {
    return points;
  }

  const scaleX = newBounds.w / initialBounds.w;
  const scaleY = newBounds.h / initialBounds.h;

  return points.map((val, idx) => {
    if (idx % 3 === 0) {
      return Math.round(newBounds.x + (val - initialBounds.x) * scaleX);
    } else if (idx % 3 === 1) {
      return Math.round(newBounds.y + (val - initialBounds.y) * scaleY);
    }
    return val;
  });
}

export function isPointInElement(point: Point, el: ElementData): boolean {
  let px = point.x;
  let py = point.y;
  const cx = el.x + el.w / 2;
  const cy = el.y + el.h / 2;

  if (el.rotation && el.rotation !== 0) {
    const rad = (-el.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = px - cx;
    const dy = py - cy;
    px = cx + dx * cos - dy * sin;
    py = cy + dx * sin + dy * cos;
  }

  if (el.type === "ellipse") {
    const rx = Math.abs(el.w / 2);
    const ry = Math.abs(el.h / 2);
    if (rx <= 0 || ry <= 0) return false;
    const normX = (px - cx) / rx;
    const normY = (py - cy) / ry;
    return normX * normX + normY * normY <= 1;
  }

  if (el.type === "diamond") {
    const rx = Math.abs(el.w / 2);
    const ry = Math.abs(el.h / 2);
    if (rx <= 0 || ry <= 0) return false;
    return Math.abs(px - cx) / rx + Math.abs(py - cy) / ry <= 1;
  }

  if (el.type === "line" || el.type === "arrow") {
    const x1 = el.x;
    const y1 = el.y;
    const x2 = el.x + el.w;
    const y2 = el.y + el.h;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    const tolerance = Math.max((el.style?.strokeWidth || 2) + 6, 8);

    if (lenSq === 0) {
      return Math.hypot(px - x1, py - y1) <= tolerance;
    }

    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.hypot(px - projX, py - projY) <= tolerance;
  }

  if (el.type === "freehand") {
    const pad = Math.max((el.style?.strokeWidth || 2) + 4, 6);
    return (
      px >= el.x - pad &&
      px <= el.x + el.w + pad &&
      py >= el.y - pad &&
      py <= el.y + el.h + pad
    );
  }

  return (
    px >= el.x &&
    px <= el.x + el.w &&
    py >= el.y &&
    py <= el.y + el.h
  );
}
