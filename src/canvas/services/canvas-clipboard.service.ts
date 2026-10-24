import { nanoid } from "nanoid";
import { YjsElementRepository } from "@/canvas/repositories/yjs-element-repository";
import { Point } from "@/canvas/viewport";
import { ElementData, ElementType } from "@/shared";

function offsetClonedPoints(
  points: number[] | undefined,
  type: ElementData["type"],
  dx: number,
  dy: number,
): number[] | undefined {
  if (!points) return undefined;
  if (type === ElementType.LINE || type === ElementType.ARROW) {
    return points.map((pt, idx) => (idx % 2 === 0 ? pt + dx : pt + dy));
  }
  return points.map((pt, idx) => {
    if (idx % 3 === 0) return pt + dx;
    if (idx % 3 === 1) return pt + dy;
    return pt;
  });
}

export class CanvasClipboardService {
  private copiedElements: ElementData[] = [];
  private pasteStep = 0;

  copy(elements: readonly ElementData[]): void {
    if (elements.length === 0) return;
    this.copiedElements = elements.map((el) => ({
      ...el,
      style: { ...el.style },
      points: el.points ? [...el.points] : undefined,
      startBinding: el.startBinding ? { ...el.startBinding } : undefined,
      endBinding: el.endBinding ? { ...el.endBinding } : undefined,
    }));
    this.pasteStep = 0;
  }

  hasCopiedElements(): boolean {
    return this.copiedElements.length > 0;
  }

  pasteIntoRepository(
    repository: YjsElementRepository,
    userId: string,
    targetWorldPt?: Point,
  ): string[] {
    if (this.copiedElements.length === 0) return [];

    this.pasteStep += 1;
    let dx = 24 * this.pasteStep;
    let dy = 24 * this.pasteStep;

    if (targetWorldPt) {
      let minX = Infinity;
      let minY = Infinity;
      for (const el of this.copiedElements) {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
      }
      if (Number.isFinite(minX) && Number.isFinite(minY)) {
        dx = Math.round(targetWorldPt.x - minX);
        dy = Math.round(targetWorldPt.y - minY);
      }
    }

    const idMap = new Map<string, string>();
    const groupMap = new Map<string, string>();

    for (const el of this.copiedElements) {
      idMap.set(el.id, nanoid(10));
      if (el.groupId && !groupMap.has(el.groupId)) {
        groupMap.set(el.groupId, nanoid(10));
      }
    }

    const createdIds: string[] = [];

    for (const el of this.copiedElements) {
      const newId = idMap.get(el.id)!;
      const newZ = repository.getNextZIndex();
      const remappedStart =
        el.startBinding && idMap.has(el.startBinding.elementId)
          ? {
              elementId: idMap.get(el.startBinding.elementId)!,
              anchor: el.startBinding.anchor,
            }
          : undefined;
      const remappedEnd =
        el.endBinding && idMap.has(el.endBinding.elementId)
          ? {
              elementId: idMap.get(el.endBinding.elementId)!,
              anchor: el.endBinding.anchor,
            }
          : undefined;

      const cloned: ElementData = {
        ...el,
        id: newId,
        x: Math.round(el.x + dx),
        y: Math.round(el.y + dy),
        z: newZ,
        createdBy: userId,
        locked: false,
        groupId: el.groupId ? groupMap.get(el.groupId) : undefined,
        points: offsetClonedPoints(el.points, el.type, dx, dy),
        startBinding: remappedStart,
        endBinding: remappedEnd,
      };

      repository.commitElement(cloned);
      createdIds.push(newId);
    }

    return createdIds;
  }

  static createStickyFromText(
    text: string,
    center: Point,
    z: string,
    userId: string,
  ): ElementData {
    const w = 200;
    const h = 200;
    return {
      id: nanoid(10),
      type: ElementType.STICKY,
      x: Math.round(center.x - w / 2),
      y: Math.round(center.y - h / 2),
      w,
      h,
      rotation: 0,
      z,
      text: text.slice(0, 5000),
      createdBy: userId,
      style: {
        fill: "#fef08a",
        stroke: "#eab308",
        strokeWidth: 2,
        opacity: 1,
      },
    };
  }
}
