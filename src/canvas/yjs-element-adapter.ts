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

function setIfDefined(map: Y.Map<unknown>, key: string, value: unknown): void {
  if (value !== undefined) {
    map.set(key, value);
  }
}

function setOrDelete<T>(
  map: Y.Map<unknown>,
  key: string,
  value: T | undefined | null,
  isRemovable: (val: T) => boolean = (v) => v === null,
): void {
  if (value === undefined) return;
  if (value === null || isRemovable(value)) {
    map.delete(key);
  } else {
    map.set(key, value);
  }
}

export class YjsElementAdapter {
  static toElementData(map: Y.Map<unknown>): ElementData | null {
    try {
      const raw = map.toJSON();
      const parsed = ElementDataSchema.safeParse(raw);
      return parsed.success ? parsed.data : null;
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
    const fields: Record<string, unknown> = {
      id: data.id,
      type: data.type,
      x: Math.round(data.x),
      y: Math.round(data.y),
      w: Math.round(data.w),
      h: Math.round(data.h),
      rotation: data.rotation ?? 0,
      z: data.z,
      createdBy: data.createdBy,
      text: data.text,
      points: data.points,
      parentId: data.parentId,
      assetId: data.assetId,
      groupId: data.groupId,
      locked: data.locked,
      startBinding: data.startBinding,
      endBinding: data.endBinding,
      src: data.src,
    };

    for (const [key, value] of Object.entries(fields)) {
      setIfDefined(elementMap, key, value);
    }

    const styleMap = new Y.Map<unknown>();
    styleMap.set("fill", data.style.fill);
    styleMap.set("stroke", data.style.stroke);
    styleMap.set("strokeWidth", data.style.strokeWidth);
    styleMap.set("opacity", data.style.opacity);
    elementMap.set("style", styleMap);

    return elementMap;
  }

  static updateStyle(
    styleMap: Y.Map<unknown>,
    stylePatch?: Partial<ElementData["style"]>,
  ): void {
    if (!stylePatch) return;
    for (const [key, value] of Object.entries(stylePatch)) {
      setIfDefined(styleMap, key, value);
    }
  }

  static updateYMap(
    map: Y.Map<unknown>,
    patch: Omit<
      Partial<ElementData>,
      "style" | "startBinding" | "endBinding" | "groupId"
    > & {
      style?: Partial<ElementData["style"]>;
      startBinding?: ElementData["startBinding"] | null;
      endBinding?: ElementData["endBinding"] | null;
      groupId?: string | null;
    },
  ): void {
    if (patch.x !== undefined) map.set("x", Math.round(patch.x));
    if (patch.y !== undefined) map.set("y", Math.round(patch.y));
    if (patch.w !== undefined) map.set("w", Math.round(patch.w));
    if (patch.h !== undefined) map.set("h", Math.round(patch.h));

    setIfDefined(map, "rotation", patch.rotation);
    setIfDefined(map, "z", patch.z);
    setIfDefined(map, "text", patch.text);
    setIfDefined(map, "points", patch.points);
    setIfDefined(map, "src", patch.src);

    setOrDelete(map, "groupId", patch.groupId, (v) => !v);
    setOrDelete(map, "locked", patch.locked, (v) => !v);
    setOrDelete(map, "startBinding", patch.startBinding);
    setOrDelete(map, "endBinding", patch.endBinding);

    if (patch.style) {
      const rawStyle = map.get("style");
      const styleMap = isYMap(rawStyle) ? rawStyle : new Y.Map<unknown>();
      if (!isYMap(rawStyle)) map.set("style", styleMap);
      YjsElementAdapter.updateStyle(styleMap, patch.style);
    }
  }
}
