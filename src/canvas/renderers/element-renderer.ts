import { ElementData, ElementType } from "../../shared";
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
  [ElementType.RECT]: (ctx, el) => drawRect(ctx, el),
  [ElementType.ELLIPSE]: (ctx, el) => drawEllipse(ctx, el),
  [ElementType.DIAMOND]: (ctx, el) => drawDiamond(ctx, el),
  [ElementType.LINE]: (ctx, el, getElementById) => drawLine(ctx, el, getElementById),
  [ElementType.ARROW]: (ctx, el, getElementById) => drawArrow(ctx, el, getElementById),
  [ElementType.FREEHAND]: (ctx, el) => drawFreehand(ctx, el),
  [ElementType.STICKY]: (ctx, el) => drawSticky(ctx, el),
  [ElementType.TEXT]: (ctx, el) => drawText(ctx, el),
  [ElementType.IMAGE]: (ctx, el, _getById, onImageLoaded) => drawImageElement(ctx, el, onImageLoaded),
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
