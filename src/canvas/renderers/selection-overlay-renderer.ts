import { ElementData } from "@/shared";
import { getElementHandles } from "@/canvas/resize-helper";
import { drawFreehand } from "@/canvas/renderers/freehand-renderer";
import { Point } from "@/canvas/viewport";
import { drawCurvedConnector, resolveArrowEndpoints } from "@/canvas/connector-helper";

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
  snapIndicator?: { active: Point | null; candidates: Point[] } | null;
  getElementById?: (id: string) => ElementData | null;
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
    snapIndicator,
    getElementById,
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
      if (el.type === "line" || el.type === "arrow") {
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
            el.type === "arrow",
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
        return;
      }

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

  if (snapIndicator) {
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
      const pulseRadius = 9 / zoom;
      const dotRadius = 5 / zoom;
      const innerRadius = 2 / zoom;

      ctx.fillStyle = "rgba(99, 102, 241, 0.25)";
      ctx.beginPath();
      ctx.arc(activePt.x, activePt.y, pulseRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#4f46e5";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5 / zoom;
      ctx.beginPath();
      ctx.arc(activePt.x, activePt.y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(activePt.x, activePt.y, innerRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (shapeDraft) {
    if (shapeDraft.type === "arrow") {
      const fromX = shapeDraft.x;
      const fromY = shapeDraft.y;
      const toX = shapeDraft.x + shapeDraft.w;
      const toY = shapeDraft.y + shapeDraft.h;
      const headLen = Math.max(10, Math.min(16, (draftStyle.strokeWidth || 2) * 5));
      const angle = Math.atan2(toY - fromY, toX - fromX);

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.strokeStyle = draftStyle.strokeColor || "#4f46e5";
      ctx.lineWidth = draftStyle.strokeWidth || 2;
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
      ctx.fillStyle = draftStyle.strokeColor || "#4f46e5";
      ctx.fill();
    } else if (shapeDraft.type === "line") {
      ctx.beginPath();
      ctx.moveTo(shapeDraft.x, shapeDraft.y);
      ctx.lineTo(shapeDraft.x + shapeDraft.w, shapeDraft.y + shapeDraft.h);
      ctx.strokeStyle = draftStyle.strokeColor || "#4f46e5";
      ctx.lineWidth = draftStyle.strokeWidth || 2;
      ctx.lineCap = "round";
      ctx.stroke();
    } else {
      ctx.strokeStyle = "#4f46e5";
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.strokeRect(shapeDraft.x, shapeDraft.y, shapeDraft.w, shapeDraft.h);
      ctx.setLineDash([]);
    }
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
