import { Viewport } from "@/canvas/viewport";

export function renderBackgroundGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: Viewport,
): void {
  ctx.clearRect(0, 0, width, height);

  const zoom = viewport.zoom;
  const pan = viewport.pan;
  const gridSize = 24 * zoom;

  if (gridSize < 8) return;

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  ctx.fillStyle = isDark
    ? "rgba(255, 255, 255, 0.07)"
    : "rgba(15, 23, 42, 0.08)";

  const startX = pan.x % gridSize;
  const startY = pan.y % gridSize;

  ctx.beginPath();
  for (let x = startX; x < width; x += gridSize) {
    for (let y = startY; y < height; y += gridSize) {
      ctx.rect(x - 0.5, y - 0.5, 1, 1);
    }
  }
  ctx.fill();
}
