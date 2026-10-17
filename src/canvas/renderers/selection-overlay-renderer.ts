import { ElementData } from "@/shared";
import { getElementHandles } from "@/canvas/resize-helper";
import { drawFreehand } from "@/canvas/renderers/freehand-renderer";

export interface SelectionOverlayRenderParams {
  ctx: CanvasRenderingContext2D;
  zoom: number;
  selectedElements: ElementData[];
  selectBox: { x: number; y: number; w: number; h: number } | null;
  shapeDraft: {
    type: ElementData["type"];
    x: number;
    y: number;
    w: number;
    h: number;
  } | null;
  freehandDraft: number[];
  draftStyle: {
    strokeColor: string;
    strokeWidth: number;
    opacity: number;
  };
  userId: string;
  guides?: {
    vertical?: number[];
    horizontal?: number[];
  } | null;
}

export function renderSelectionAndDraftsOverlay(
  params: SelectionOverlayRenderParams,
): void {
  const {
    ctx,
    zoom,
    selectedElements,
    selectBox,
    shapeDraft,
    freehandDraft,
    draftStyle,
    userId,
    guides,
  } = params;

  if (guides) {
    ctx.save();
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);

    guides.vertical?.forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, -1e6);
      ctx.lineTo(x, 1e6);
      ctx.stroke();
    });

    guides.horizontal?.forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(-1e6, y);
      ctx.lineTo(1e6, y);
      ctx.stroke();
    });

    ctx.restore();
  }

  if (selectedElements.length > 0) {
    selectedElements.forEach((el) => {
      ctx.strokeStyle = el.locked ? "#f43f5e" : "#4f46e5";
      ctx.lineWidth = 1.5 / zoom;
      ctx.strokeRect(el.x, el.y, el.w, el.h);

      if (el.locked) {
        const badgeSize = 16 / zoom;
        const bx = el.x + el.w - badgeSize;
        const by = el.y - badgeSize - 4 / zoom;
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeSize, badgeSize, 4 / zoom);
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2 / zoom;
        ctx.beginPath();
        ctx.arc(
          bx + badgeSize / 2,
          by + badgeSize * 0.42,
          badgeSize * 0.18,
          Math.PI,
          0,
          false,
        );
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          bx + badgeSize * 0.28,
          by + badgeSize * 0.42,
          badgeSize * 0.44,
          badgeSize * 0.36,
        );
      } else if (selectedElements.length === 1) {
        const handleSize = 8 / zoom;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#4f46e5";
        ctx.lineWidth = 1.5 / zoom;
        const handles = getElementHandles(el);
        handles.forEach((handle) => {
          ctx.fillRect(
            handle.x - handleSize / 2,
            handle.y - handleSize / 2,
            handleSize,
            handleSize,
          );
          ctx.strokeRect(
            handle.x - handleSize / 2,
            handle.y - handleSize / 2,
            handleSize,
            handleSize,
          );
        });
      }
    });
  }

  if (selectBox) {
    ctx.fillStyle = "rgba(99, 102, 241, 0.08)";
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 1 / zoom;
    ctx.fillRect(selectBox.x, selectBox.y, selectBox.w, selectBox.h);
    ctx.strokeRect(selectBox.x, selectBox.y, selectBox.w, selectBox.h);
  }

  if (shapeDraft) {
    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.strokeRect(shapeDraft.x, shapeDraft.y, shapeDraft.w, shapeDraft.h);
    ctx.setLineDash([]);
  }

  if (freehandDraft.length >= 6) {
    const draftEl: ElementData = {
      id: "draft",
      type: "freehand",
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      rotation: 0,
      z: "a0",
      style: {
        fill: "transparent",
        stroke: draftStyle.strokeColor,
        strokeWidth: draftStyle.strokeWidth,
        opacity: draftStyle.opacity,
      },
      points: freehandDraft,
      createdBy: userId,
    };
    drawFreehand(ctx, draftEl);
  }
}
