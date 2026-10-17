import * as Y from "yjs";
import {
  ELEMENT_TYPES,
  ElementData,
  ElementDataSchema,
  ElementType,
} from "@/shared";

function isYMap(value: unknown): value is Y.Map<unknown> {
  return value instanceof Y.Map;
}

function isElementType(value: unknown): value is ElementType {
  return (
    typeof value === "string" &&
    (ELEMENT_TYPES as readonly string[]).includes(value)
  );
}

export class YjsElementAdapter {
  static toElementData(map: Y.Map<unknown>): ElementData | null {
    try {
      const raw = map.toJSON();
      const parsed = ElementDataSchema.safeParse(raw);
      if (parsed.success) {
        return parsed.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  static getZIndex(map: Y.Map<unknown>): string {
    const z = map.get("z");
    return typeof z === "string" && z.length > 0 ? z : "a0";
  }

  static getType(map: Y.Map<unknown>): ElementType | null {
    const type = map.get("type");
    return isElementType(type) ? type : null;
  }

  static getPosition(map: Y.Map<unknown>): { x: number; y: number } {
    const rawX = map.get("x");
    const rawY = map.get("y");
    return {
      x: typeof rawX === "number" && Number.isFinite(rawX) ? rawX : 0,
      y: typeof rawY === "number" && Number.isFinite(rawY) ? rawY : 0,
    };
  }

  static createYMap(data: ElementData): Y.Map<unknown> {
    const elementMap = new Y.Map<unknown>();
    elementMap.set("id", data.id);
    elementMap.set("type", data.type);
    elementMap.set("x", Math.round(data.x));
    elementMap.set("y", Math.round(data.y));
    elementMap.set("w", Math.round(data.w));
    elementMap.set("h", Math.round(data.h));
    elementMap.set("rotation", data.rotation ?? 0);
    elementMap.set("z", data.z);

    const styleMap = new Y.Map<unknown>();
    styleMap.set("fill", data.style.fill);
    styleMap.set("stroke", data.style.stroke);
    styleMap.set("strokeWidth", data.style.strokeWidth);
    styleMap.set("opacity", data.style.opacity);
    elementMap.set("style", styleMap);

    if (data.text !== undefined) elementMap.set("text", data.text);
    if (data.points !== undefined) elementMap.set("points", data.points);
    if (data.parentId !== undefined) elementMap.set("parentId", data.parentId);
    if (data.assetId !== undefined) elementMap.set("assetId", data.assetId);
    elementMap.set("createdBy", data.createdBy);

    return elementMap;
  }

  static updateYMap(
    map: Y.Map<unknown>,
    patch: Omit<Partial<ElementData>, "style"> & {
      style?: Partial<ElementData["style"]>;
    },
  ): void {
    if (patch.x !== undefined) map.set("x", Math.round(patch.x));
    if (patch.y !== undefined) map.set("y", Math.round(patch.y));
    if (patch.w !== undefined) map.set("w", Math.round(patch.w));
    if (patch.h !== undefined) map.set("h", Math.round(patch.h));
    if (patch.rotation !== undefined) map.set("rotation", patch.rotation);
    if (patch.z !== undefined) map.set("z", patch.z);
    if (patch.text !== undefined) map.set("text", patch.text);
    if (patch.points !== undefined) map.set("points", patch.points);

    if (patch.style) {
      const rawStyle = map.get("style");
      let styleMap: Y.Map<unknown>;
      if (isYMap(rawStyle)) {
        styleMap = rawStyle;
      } else {
        styleMap = new Y.Map<unknown>();
        map.set("style", styleMap);
      }
      if (patch.style.fill !== undefined) styleMap.set("fill", patch.style.fill);
      if (patch.style.stroke !== undefined)
        styleMap.set("stroke", patch.style.stroke);
      if (patch.style.strokeWidth !== undefined)
        styleMap.set("strokeWidth", patch.style.strokeWidth);
      if (patch.style.opacity !== undefined)
        styleMap.set("opacity", patch.style.opacity);
    }
  }
}
