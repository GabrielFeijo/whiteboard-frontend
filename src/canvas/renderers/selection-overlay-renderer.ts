import { ElementData, ElementType } from "@/shared";
import { getElementHandles } from "@/canvas/resize-helper";
import { drawFreehand } from "@/canvas/renderers/freehand-renderer";
import { Point } from "@/canvas/viewport";
import { drawCurvedConnector, resolveArrowEndpoints } from "@/canvas/connector-helper";
import { SpacingGuide } from "@/canvas/alignment-helper";

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
    spacing?: SpacingGuide[];
  } | null;
  snapIndicator?: { active: Point | null; candidates: Point[] } | null;
  getElementById?: (id: string) => ElementData | null;
}

function drawSpacingBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  zoom: number,
): void {
  const fontSize = Math.max(9, Math.round(10 / zoom));
  ctx.font = `600 ${fontSize}px sans-serif`;
  const textMetrics = ctx.measureText(text);
  const paddingX = 4 / zoom;
  const paddingY = 2 / zoom;
  const badgeWidth = textMetrics.width + paddingX * 2;
  const badgeHeight = fontSize + paddingY * 2;

  ctx.fillStyle = "#ec4899";
  ctx.beginPath();
  ctx.roundRect(
    centerX - badgeWidth / 2,
    centerY - badgeHeight / 2,
    badgeWidth,
    badgeHeight,
    3 / zoom,
  );
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, centerX, centerY);
}

function renderSpacingGuides(
  ctx: CanvasRenderingContext2D,
  spacing: SpacingGuide[] | undefined,
  zoom: number,
): void {
  if (!spacing || spacing.length === 0) return;

  ctx.save();
  ctx.strokeStyle = "#ec4899";
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([]);

  for (const guide of spacing) {
    if (guide.axis === "horizontal") {
      const midY = (guide.crossStart + guide.crossEnd) / 2;
      const tickHalf = 6 / zoom;

      ctx.beginPath();
      ctx.moveTo(guide.start, midY - tickHalf);
      ctx.lineTo(guide.start, midY + tickHalf);
      ctx.moveTo(guide.start, midY);
      ctx.lineTo(guide.end, midY);
      ctx.moveTo(guide.end, midY - tickHalf);
      ctx.lineTo(guide.end, midY + tickHalf);
      ctx.stroke();

      const midX = (guide.start + guide.end) / 2;
      drawSpacingBadge(ctx, `${Math.round(guide.gap)}px`, midX, midY, zoom);
      continue;
    }

    const midX = (guide.crossStart + guide.crossEnd) / 2;
    const tickHalf = 6 / zoom;

    ctx.beginPath();
    ctx.moveTo(midX - tickHalf, guide.start);
    ctx.lineTo(midX + tickHalf, guide.start);
    ctx.moveTo(midX, guide.start);
    ctx.lineTo(midX, guide.end);
    ctx.moveTo(midX - tickHalf, guide.end);
    ctx.lineTo(midX + tickHalf, guide.end);
    ctx.stroke();

    const midY = (guide.start + guide.end) / 2;
    drawSpacingBadge(ctx, `${Math.round(guide.gap)}px`, midX, midY, zoom);
  }

  ctx.restore();
}

function renderSmartGuides(
  ctx: CanvasRenderingContext2D,
  guides: SelectionOverlayRenderParams["guides"],
  zoom: number,
): void {
  if (!guides) return;

  renderSpacingGuides(ctx, guides.spacing, zoom);

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

function renderLockBadge(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  badgeSize: number,
  zoom: number,
): void {
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
}

function renderConnectorSelection(
  ctx: CanvasRenderingContext2D,
  el: ElementData,
  zoom: number,
  isSingleSelection: boolean,
  getElementById?: (id: string) => ElementData | null,
): void {
  const { from, to } = resolveArrowEndpoints(el, getElementById);
  ctx.save();
  ctx.strokeStyle = el.locked
    ? "rgba(244, 63, 94, 0.4)"
    : "rgba(79, 70, 229, 0.4)";
  ctx.lineWidth = Math.max((el.style.strokeWidth || 2) + 8 / zoom, 12 / zoom);
  ctx.lineCap = "round";

  if (el.startBinding || el.endBinding) {
    drawCurvedConnector(
      ctx,
      from,
      to,
      {
        ...el.style,
        stroke: ctx.strokeStyle,
        strokeWidth: ctx.lineWidth,
      },
      el.startBinding?.anchor,
      el.endBinding?.anchor,
      el.type === ElementType.ARROW,
    );
  } else {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }
  ctx.restore();

  if (el.locked) {
    const badgeSize = 16 / zoom;
    const bx = (from.x + to.x) / 2 - badgeSize / 2;
    const by = (from.y + to.y) / 2 - badgeSize / 2;
    renderLockBadge(ctx, bx, by, badgeSize, zoom);
  } else if (isSingleSelection) {
    const handleRadius = 5 / zoom;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = 1.5 / zoom;
    [from, to].forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }
}

function renderBoundingBoxSelection(
  ctx: CanvasRenderingContext2D,
  el: ElementData,
  zoom: number,
  isSingleSelection: boolean,
): void {
  ctx.strokeStyle = el.locked ? "#f43f5e" : "#4f46e5";
  ctx.lineWidth = 1.5 / zoom;
  ctx.strokeRect(el.x, el.y, el.w, el.h);

  if (el.locked) {
    const badgeSize = 16 / zoom;
    const bx = el.x + el.w - badgeSize;
    const by = el.y - badgeSize - 4 / zoom;
    renderLockBadge(ctx, bx, by, badgeSize, zoom);
  } else if (isSingleSelection) {
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
}

function renderSelectedElements(
  ctx: CanvasRenderingContext2D,
  selectedElements: ElementData[],
  zoom: number,
  getElementById?: (id: string) => ElementData | null,
): void {
  if (selectedElements.length === 0) return;
  const isSingle = selectedElements.length === 1;

  selectedElements.forEach((el) => {
    if (el.type === ElementType.LINE || el.type === ElementType.ARROW) {
      renderConnectorSelection(ctx, el, zoom, isSingle, getElementById);
    } else {
      renderBoundingBoxSelection(ctx, el, zoom, isSingle);
    }
  });
}

function renderSelectionBox(
  ctx: CanvasRenderingContext2D,
  selectBox: SelectionOverlayRenderParams["selectBox"],
  zoom: number,
): void {
  if (!selectBox) return;
  ctx.fillStyle = "rgba(99, 102, 241, 0.08)";
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 1 / zoom;
  ctx.fillRect(selectBox.x, selectBox.y, selectBox.w, selectBox.h);
  ctx.strokeRect(selectBox.x, selectBox.y, selectBox.w, selectBox.h);
}

function renderSnapIndicators(
  ctx: CanvasRenderingContext2D,
  snapIndicator: SelectionOverlayRenderParams["snapIndicator"],
  zoom: number,
): void {
  if (!snapIndicator) return;

  if (snapIndicator.candidates.length > 0) {
    const candRadius = 4.5 / zoom;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 1.5 / zoom;
    snapIndicator.candidates.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, candRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  if (snapIndicator.active) {
    const activePt = snapIndicator.active;
    ctx.fillStyle = "rgba(99, 102, 241, 0.25)";
    ctx.beginPath();
    ctx.arc(activePt.x, activePt.y, 9 / zoom, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4f46e5";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5 / zoom;
    ctx.beginPath();
    ctx.arc(activePt.x, activePt.y, 5 / zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(activePt.x, activePt.y, 2 / zoom, 0, Math.PI * 2);
    ctx.fill();
  }
}

type DraftRenderer = (
  ctx: CanvasRenderingContext2D,
  draft: NonNullable<SelectionOverlayRenderParams["shapeDraft"]>,
  style: SelectionOverlayRenderParams["draftStyle"],
  zoom: number,
) => void;

const SHAPE_DRAFT_RENDERERS: Record<string, DraftRenderer> = {
  arrow: (ctx, draft, style) => {
    const fromX = draft.x;
    const fromY = draft.y;
    const toX = draft.x + draft.w;
    const toY = draft.y + draft.h;
    const headLen = Math.max(10, Math.min(16, (style.strokeWidth || 2) * 5));
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = style.strokeColor || "#4f46e5";
    ctx.lineWidth = style.strokeWidth || 2;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLen * Math.cos(angle - Math.PI / 6),
      toY - headLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      toX - headLen * Math.cos(angle + Math.PI / 6),
      toY - headLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fillStyle = style.strokeColor || "#4f46e5";
    ctx.fill();
  },
  line: (ctx, draft, style) => {
    ctx.beginPath();
    ctx.moveTo(draft.x, draft.y);
    ctx.lineTo(draft.x + draft.w, draft.y + draft.h);
    ctx.strokeStyle = style.strokeColor || "#4f46e5";
    ctx.lineWidth = style.strokeWidth || 2;
    ctx.lineCap = "round";
    ctx.stroke();
  },
  ellipse: (ctx, draft, _style, zoom) => {
    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.beginPath();
    const rx = Math.abs(draft.w / 2);
    const ry = Math.abs(draft.h / 2);
    ctx.ellipse(draft.x + rx, draft.y + ry, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  },
  diamond: (ctx, draft, _style, zoom) => {
    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.beginPath();
    const midX = draft.x + draft.w / 2;
    const midY = draft.y + draft.h / 2;
    ctx.moveTo(midX, draft.y);
    ctx.lineTo(draft.x + draft.w, midY);
    ctx.lineTo(midX, draft.y + draft.h);
    ctx.lineTo(draft.x, midY);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  },
  rect: (ctx, draft, _style, zoom) => {
    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.beginPath();
    ctx.roundRect(draft.x, draft.y, draft.w, draft.h, 6);
    ctx.stroke();
    ctx.setLineDash([]);
  },
};

function renderShapeDraft(
  ctx: CanvasRenderingContext2D,
  shapeDraft: SelectionOverlayRenderParams["shapeDraft"],
  draftStyle: SelectionOverlayRenderParams["draftStyle"],
  zoom: number,
): void {
  if (!shapeDraft) return;
  const renderer = SHAPE_DRAFT_RENDERERS[shapeDraft.type] ?? SHAPE_DRAFT_RENDERERS.rect;
  renderer(ctx, shapeDraft, draftStyle, zoom);
}

function renderFreehandDraft(
  ctx: CanvasRenderingContext2D,
  freehandDraft: number[],
  draftStyle: SelectionOverlayRenderParams["draftStyle"],
  userId: string,
): void {
  if (freehandDraft.length < 6) return;
  const draftEl: ElementData = {
    id: "draft",
    type: ElementType.FREEHAND,
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

export function renderSelectionAndDraftsOverlay(
  params: SelectionOverlayRenderParams,
): void {
  renderSmartGuides(params.ctx, params.guides, params.zoom);
  renderSelectedElements(
    params.ctx,
    params.selectedElements,
    params.zoom,
    params.getElementById,
  );
  renderSelectionBox(params.ctx, params.selectBox, params.zoom);
  renderSnapIndicators(params.ctx, params.snapIndicator, params.zoom);
  renderShapeDraft(params.ctx, params.shapeDraft, params.draftStyle, params.zoom);
  renderFreehandDraft(
    params.ctx,
    params.freehandDraft,
    params.draftStyle,
    params.userId,
  );
}
