import type * as awarenessProtocol from "y-protocols/awareness";
import { parseAwarenessStates } from "@/collab/typed-awareness";

export function renderRemoteCursorsOverlay(
  ctx: CanvasRenderingContext2D,
  awareness: awarenessProtocol.Awareness,
  localClientId: number,
  zoom: number,
): void {
  const collaborators = parseAwarenessStates(awareness);

  for (const collab of collaborators) {
    if (collab.clientId === localClientId || !collab.cursor) {
      continue;
    }

    const { x, y } = collab.cursor;
    const color = collab.user.color || "#6366f1";
    const name = collab.user.name || "Guest";

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 16 / zoom);
    ctx.lineTo(4 / zoom, 12 / zoom);
    ctx.lineTo(9 / zoom, 21 / zoom);
    ctx.lineTo(12 / zoom, 19 / zoom);
    ctx.lineTo(7 / zoom, 11 / zoom);
    ctx.lineTo(13 / zoom, 10 / zoom);
    ctx.closePath();
    ctx.fill();

    ctx.font = `${11 / zoom}px Inter, sans-serif`;
    const textWidth = ctx.measureText(name).width;
    const pad = 4 / zoom;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(
      12 / zoom,
      14 / zoom,
      textWidth + pad * 2,
      16 / zoom,
      4 / zoom,
    );
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillText(name, 12 / zoom + pad, 14 / zoom + 12 / zoom);

    ctx.restore();
  }
}
