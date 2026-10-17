import { Point } from "@/canvas/viewport";

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === "undefined") {
      reject(new Error("FileReader is not available"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as data URL"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function loadImageDimensions(
  src: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") {
      resolve({ width: 300, height: 200 });
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || 300,
        height: img.naturalHeight || 200,
      });
    };
    img.onerror = () => {
      resolve({ width: 300, height: 200 });
    };
    img.src = src;
  });
}

export function calculateImagePlacement(
  dimensions: { width: number; height: number },
  centerPt: Point,
  maxDimension = 600,
): { x: number; y: number; w: number; h: number } {
  let w = Math.max(20, dimensions.width);
  let h = Math.max(20, dimensions.height);

  if (w > maxDimension || h > maxDimension) {
    const ratio = Math.min(maxDimension / w, maxDimension / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  return {
    x: Math.round(centerPt.x - w / 2),
    y: Math.round(centerPt.y - h / 2),
    w,
    h,
  };
}
