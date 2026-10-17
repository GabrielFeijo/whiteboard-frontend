import { ElementData } from "../../shared";
import { drawArrow, drawDiamond, drawEllipse, drawLine, drawRect } from "./shape-renderer";
import { drawFreehand } from "./freehand-renderer";
import { drawSticky } from "./sticky-renderer";
import { drawText } from "./text-renderer";
import { drawImageElement } from "./image-renderer";

type ElementDrawHandler = (
  ctx: CanvasRenderingContext2D,
  el: ElementData,
  getElementById?: (id: string) => ElementData | null,
  onImageLoaded?: () => void,
) => void;

const ELEMENT_DRAW_REGISTRY: Partial<Record<ElementData["type"], ElementDrawHandler>> = {
  rect: (ctx, el) => drawRect(ctx, el),
  ellipse: (ctx, el) => drawEllipse(ctx, el),
  diamond: (ctx, el) => drawDiamond(ctx, el),
  line: (ctx, el, getElementById) => drawLine(ctx, el, getElementById),
  arrow: (ctx, el, getElementById) => drawArrow(ctx, el, getElementById),
  freehand: (ctx, el) => drawFreehand(ctx, el),
  sticky: (ctx, el) => drawSticky(ctx, el),
  text: (ctx, el) => drawText(ctx, el),
  image: (ctx, el, _getById, onImageLoaded) => drawImageElement(ctx, el, onImageLoaded),
};

export function renderElement(
  ctx: CanvasRenderingContext2D,
  el: ElementData,
  getElementById?: (id: string) => ElementData | null,
  onImageLoaded?: () => void,
): void {
  ctx.save();
  ctx.globalAlpha = el.style.opacity ?? 1;

  if (el.rotation && el.rotation !== 0) {
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  const drawHandler = ELEMENT_DRAW_REGISTRY[el.type];
  drawHandler?.(ctx, el, getElementById, onImageLoaded);

  ctx.restore();
}
