import { nanoid } from "nanoid";
import {
  calculateImagePlacement,
  fileToDataUrl,
  loadImageDimensions,
} from "@/canvas/image-helper";
import { Point } from "@/canvas/viewport";
import { api } from "@/lib/api/client";
import { ElementData, ElementType } from "@/shared";

export interface PrepareImageOptions {
  file: File;
  boardId: string;
  userId: string;
  targetCenter: Point;
  z: string;
}

const MAX_INLINE_DATA_URL_LENGTH = 500_000;

export class CanvasAssetService {
  static isSupportedImageFile(file: File): boolean {
    return file.type.startsWith("image/") || file.name.endsWith(".svg");
  }

  static async prepareImageElement(
    options: PrepareImageOptions,
  ): Promise<ElementData | null> {
    const { file, boardId, userId, targetCenter, z } = options;
    if (!CanvasAssetService.isSupportedImageFile(file)) {
      return null;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      const dimensions = await loadImageDimensions(dataUrl);
      const placement = calculateImagePlacement(dimensions, targetCenter);
      const id = nanoid(10);

      let imageSrc = dataUrl;
      let assetId: string | undefined;

      try {
        const presignRes = await api.post<{
          uploadUrl: string;
          assetUrl: string;
          readUrl?: string;
          key: string;
        }>(`/boards/${boardId}/assets/presign`, {
          filename: file.name,
          contentType: file.type,
          size: file.size,
        });

        const uploadRes = await fetch(presignRes.data.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (uploadRes.ok) {
          const assetFilename =
            presignRes.data.key.split("/").pop() || presignRes.data.key;
          imageSrc = `/api/v1/boards/${boardId}/assets/${encodeURIComponent(assetFilename)}/view`;
          assetId = presignRes.data.key;
        }
      } catch {
        if (dataUrl.length > MAX_INLINE_DATA_URL_LENGTH) {
          return null;
        }
      }

      return {
        id,
        type: ElementType.IMAGE,
        x: placement.x,
        y: placement.y,
        w: placement.w,
        h: placement.h,
        rotation: 0,
        z,
        style: {
          fill: "transparent",
          stroke: "transparent",
          strokeWidth: 0,
          opacity: 1,
        },
        src: imageSrc,
        assetId,
        createdBy: userId,
      };
    } catch {
      return null;
    }
  }
}
