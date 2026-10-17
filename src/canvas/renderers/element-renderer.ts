import { ElementData } from "../../shared";
import { drawArrow, drawDiamond, drawEllipse, drawLine, drawRect } from "./shape-renderer";
import { drawFreehand } from "./freehand-renderer";
import { drawSticky } from "./sticky-renderer";
import { drawText } from "./text-renderer";
import { drawImageElement } from "./image-renderer";

export function renderElement(
  ctx: CanvasRenderingContext2D,
  el: ElementData,
  getElementById?: (id: string) => ElementData | null,
  onImageLoaded?: () => void,
) {
  ctx.save();
  ctx.globalAlpha = el.style.opacity ?? 1;

  if (el.rotation && el.rotation !== 0) {
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  switch (el.type) {
    case "rect":
      drawRect(ctx, el);
      break;
    case "ellipse":
      drawEllipse(ctx, el);
      break;
    case "diamond":
      drawDiamond(ctx, el);
      break;
    case "line":
      drawLine(ctx, el, getElementById);
      break;
    case "arrow":
      drawArrow(ctx, el, getElementById);
      break;
    case "freehand":
      drawFreehand(ctx, el);
      break;
    case "sticky":
      drawSticky(ctx, el);
      break;
    case "text":
      drawText(ctx, el);
      break;
    case "image":
      drawImageElement(ctx, el, onImageLoaded);
      break;
  }

  ctx.restore();
}
