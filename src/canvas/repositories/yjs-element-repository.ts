import * as Y from "yjs";
import { nanoid } from "nanoid";
import { generateKeyBetween } from "fractional-indexing";
import { ElementData, ElementType, getDocRoots } from "@/shared";
import { LOCAL_ORIGIN } from "@/collab/undo-manager";
import { SpatialIndex } from "@/canvas/spatial-index";
import { isPointInElement } from "@/canvas/resize-helper";
import { measureTextDimensions } from "@/canvas/renderers/text-renderer";
import { YjsElementAdapter } from "@/canvas/yjs-element-adapter";
import {
  AlignmentType,
  calculateAlignedPositions,
  calculateDistributedPositions,
  calculateStandardizedSpacingPositions,
  DistributionType,
} from "@/canvas/alignment-helper";
import { getElementBoundingBox, resolveArrowEndpoints } from "@/canvas/connector-helper";
import { translateGeometry } from "@/canvas/geometry-helper";

export type ElementStylePatch = Partial<ElementData["style"]>;

function offsetPoints(
  points: number[] | undefined,
  type: ElementData["type"],
  offset = 20,
): number[] | undefined {
  if (!points) return undefined;
  if (type === ElementType.LINE || type === ElementType.ARROW) {
    return points.map((pt) => pt + offset);
  }
  return points.map((pt, i) => (i % 3 === 2 ? pt : pt + offset));
}

export class YjsElementRepository {
  private readonly elementCache = new Map<string, ElementData>();
  private readonly dirtyListeners = new Set<() => void>();
  private readonly observer: Parameters<Y.Map<unknown>["observeDeep"]>[0];

  constructor(
    private readonly doc: Y.Doc,
    private readonly spatialIndex: SpatialIndex,
  ) {
    const elementsMap = this.getElementsMap();
    this.observer = (events) => {
      events.forEach((event) => {
        if (event.target === elementsMap) {
          event.keys.forEach((change, key) => {
            if (change.action === "delete") {
              this.elementCache.delete(key);
              this.spatialIndex.remove(key);
              return;
            }
            const childMap = elementsMap.get(key);
            if (childMap) {
              this.syncCacheAndSpatialIndex(childMap, key);
            }
          });
          return;
        }

        if (event.target instanceof Y.Map) {
          let curr: Y.Map<unknown> = event.target;
          while (curr.parent instanceof Y.Map && curr.parent !== elementsMap) {
            curr = curr.parent;
          }
          if (curr.parent === elementsMap) {
            this.syncCacheAndSpatialIndex(curr);
          }
        }
      });
      this.dirtyListeners.forEach((cb) => cb());
    };
    elementsMap.observeDeep(this.observer);
  }

  destroy(): void {
    this.getElementsMap().unobserveDeep(this.observer);
    this.dirtyListeners.clear();
    this.elementCache.clear();
  }

  getElementsMap(): Y.Map<Y.Map<unknown>> {
    return getDocRoots(this.doc).elements;
  }

  private syncCacheAndSpatialIndex(
    map: Y.Map<unknown>,
    fallbackId?: string,
  ): ElementData | null {
    const data = YjsElementAdapter.toElementData(map);
    const elementId = data?.id || fallbackId;
    if (data && elementId) {
      this.elementCache.set(elementId, data);
      const box = getElementBoundingBox(data);
      this.spatialIndex.insert(elementId, box.x, box.y, box.w, box.h);
      return data;
    }
    if (elementId) {
      this.elementCache.delete(elementId);
      this.spatialIndex.remove(elementId);
    }
    return null;
  }

  indexAllElements(): void {
    this.spatialIndex.clear();
    this.elementCache.clear();
    const elementsMap = this.getElementsMap();
    elementsMap.forEach((map, id) => {
      const data = this.syncCacheAndSpatialIndex(map, id);
      if (!data) return;

      const box = getElementBoundingBox(data);
      const isConnector = data.type === ElementType.LINE || data.type === ElementType.ARROW;
      const boundsDiffer =
        data.x !== box.x ||
        data.y !== box.y ||
        data.w !== box.w ||
        data.h !== box.h;

      if (isConnector && boundsDiffer) {
        YjsElementAdapter.updateYMap(map, {
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
        });
      }
    });
  }

  observeChanges(onDirty?: () => void): () => void {
    if (!onDirty) return () => {};
    this.dirtyListeners.add(onDirty);
    return () => {
      this.dirtyListeners.delete(onDirty);
    };
  }

  getById(id: string): ElementData | null {
    const cached = this.elementCache.get(id);
    if (cached) return cached;
    const map = this.getElementsMap().get(id);
    return map ? this.syncCacheAndSpatialIndex(map, id) : null;
  }

  getManyByIds(ids: readonly string[]): ElementData[] {
    if (ids.length === 0) return [];
    const elementsMap = this.getElementsMap();
    const result: ElementData[] = [];
    for (const id of ids) {
      const cached = this.elementCache.get(id);
      if (cached) {
        result.push(cached);
        continue;
      }
      const map = elementsMap.get(id);
      if (map) {
        const data = this.syncCacheAndSpatialIndex(map, id);
        if (data) result.push(data);
      }
    }
    return result;
  }

  getVisibleElements(bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }): ElementData[] {
    const visibleIds = new Set(this.spatialIndex.search(bounds));
    const elements = this.getManyByIds(Array.from(visibleIds));
    return elements.sort((a, b) => (a.z > b.z ? 1 : a.z < b.z ? -1 : 0));
  }

  hitTest(worldPt: { x: number; y: number }): string | null {
    const pad = 12;
    const hits = this.spatialIndex.search({
      minX: worldPt.x - pad,
      minY: worldPt.y - pad,
      maxX: worldPt.x + pad,
      maxY: worldPt.y + pad,
    });
    if (hits.length === 0) return null;

    const candidateElements = this.getManyByIds(hits);
    if (candidateElements.length === 0) return null;

    candidateElements.sort((a, b) =>
      (b.z || "") > (a.z || "") ? 1 : (b.z || "") < (a.z || "") ? -1 : 0,
    );

    for (const el of candidateElements) {
      if (isPointInElement(worldPt, el)) {
        return el.id;
      }
    }

    return null;
  }

  getNextZIndex(): string {
    const elementsMap = this.getElementsMap();
    let highest = "a0";
    elementsMap.forEach((map) => {
      const z = YjsElementAdapter.getZIndex(map);
      if (z > highest) highest = z;
    });
    return generateKeyBetween(highest, null);
  }

  commitElement(data: ElementData): void {
    const elementsMap = this.getElementsMap();
    const elementMap = YjsElementAdapter.createYMap(data);

    this.doc.transact(() => {
      elementsMap.set(data.id, elementMap);
    }, LOCAL_ORIGIN);

    this.elementCache.set(data.id, data);
    const box = getElementBoundingBox(data);
    this.spatialIndex.insert(data.id, box.x, box.y, box.w, box.h);
  }

  updateStyleForIds(ids: readonly string[], styleUpdates: ElementStylePatch): void {
    if (ids.length === 0) return;
    const elementsMap = this.getElementsMap();
    this.doc.transact(() => {
      ids.forEach((id) => {
        const map = elementsMap.get(id);
        if (map && map.get("locked") !== true) {
          YjsElementAdapter.updateYMap(map, { style: styleUpdates });
        }
      });
    }, LOCAL_ORIGIN);
  }

  updateRotationForIds(ids: readonly string[], rotation: number): void {
    if (ids.length === 0) return;
    const normalized = ((rotation % 360) + 360) % 360;
    const elementsMap = this.getElementsMap();
    this.doc.transact(() => {
      ids.forEach((id) => {
        const map = elementsMap.get(id);
        if (map && map.get("locked") !== true) {
          YjsElementAdapter.updateYMap(map, { rotation: Math.round(normalized) });
        }
      });
    }, LOCAL_ORIGIN);
  }

  updateTextForIds(ids: readonly string[], text: string): void {
    if (ids.length === 0) return;
    const elementsMap = this.getElementsMap();
    this.doc.transact(() => {
      ids.forEach((id) => {
        const map = elementsMap.get(id);
        if (!map || map.get("locked") === true) return;
        YjsElementAdapter.updateYMap(map, { text });
        const type = YjsElementAdapter.getType(map);
        if (type === ElementType.TEXT) {
          const dims = measureTextDimensions(text);
          const pos = YjsElementAdapter.getPosition(map);
          YjsElementAdapter.updateYMap(map, { w: dims.w, h: dims.h });
          this.spatialIndex.remove(id);
          this.spatialIndex.insert(id, pos.x, pos.y, dims.w, dims.h);
        }
      });
    }, LOCAL_ORIGIN);
  }

  deleteByIds(ids: readonly string[]): void {
    if (ids.length === 0) return;
    const elementsMap = this.getElementsMap();
    const deletedSet = new Set<string>();
    this.doc.transact(() => {
      ids.forEach((id) => {
        const map = elementsMap.get(id);
        if (map && map.get("locked") === true) return;
        elementsMap.delete(id);
        this.elementCache.delete(id);
        this.spatialIndex.remove(id);
        deletedSet.add(id);
      });

      if (deletedSet.size > 0) {
        elementsMap.forEach((map) => {
          const type = YjsElementAdapter.getType(map);
          if (type !== ElementType.ARROW && type !== ElementType.LINE) return;
          const start = map.get("startBinding") as
            | { elementId?: string }
            | undefined;
          const end = map.get("endBinding") as
            | { elementId?: string }
            | undefined;
          const clearStart = Boolean(
            start?.elementId && deletedSet.has(start.elementId),
          );
          const clearEnd = Boolean(
            end?.elementId && deletedSet.has(end.elementId),
          );
          if (clearStart || clearEnd) {
            YjsElementAdapter.updateYMap(map, {
              startBinding: clearStart ? null : undefined,
              endBinding: clearEnd ? null : undefined,
            });
          }
        });
      }
    }, LOCAL_ORIGIN);
  }

  duplicateByIds(ids: readonly string[], userId: string): string[] {
    if (ids.length === 0) return [];
    const elementsMap = this.getElementsMap();
    const newSelectedIds: string[] = [];

    this.doc.transact(() => {
      ids.forEach((id) => {
        const map = elementsMap.get(id);
        if (!map) return;
        const data = YjsElementAdapter.toElementData(map);
        if (!data) return;

        const newId = nanoid(10);
        const newZ = this.getNextZIndex();
        const duplicated: ElementData = {
          ...data,
          id: newId,
          x: data.x + 20,
          y: data.y + 20,
          z: newZ,
          createdBy: userId,
          points: offsetPoints(data.points, data.type, 20),
        };

        const newMap = YjsElementAdapter.createYMap(duplicated);
        elementsMap.set(newId, newMap);
        const box = getElementBoundingBox(duplicated);
        this.spatialIndex.insert(newId, box.x, box.y, box.w, box.h);
        newSelectedIds.push(newId);
      });
    }, LOCAL_ORIGIN);

    return newSelectedIds;
  }

  bringToFront(ids: readonly string[]): void {
    if (ids.length === 0) return;
    const elementsMap = this.getElementsMap();
    let highest = "a0";
    elementsMap.forEach((map) => {
      const z = YjsElementAdapter.getZIndex(map);
      if (z > highest) highest = z;
    });

    this.doc.transact(() => {
      ids.forEach((id) => {
        const map = elementsMap.get(id);
        if (map) {
          highest = generateKeyBetween(highest, null);
          YjsElementAdapter.updateYMap(map, { z: highest });
        }
      });
    }, LOCAL_ORIGIN);
  }

  sendToBack(ids: readonly string[]): void {
    if (ids.length === 0) return;
    const elementsMap = this.getElementsMap();
    let lowest = "a0";
    elementsMap.forEach((map) => {
      const z = YjsElementAdapter.getZIndex(map);
      if (!lowest || z < lowest) lowest = z;
    });

    this.doc.transact(() => {
      ids.forEach((id) => {
        const map = elementsMap.get(id);
        if (map) {
          lowest = generateKeyBetween(null, lowest);
          YjsElementAdapter.updateYMap(map, { z: lowest });
        }
      });
    }, LOCAL_ORIGIN);
  }

  bringForward(ids: readonly string[]): void {
    if (ids.length === 0) return;
    const selectedSet = new Set(ids);
    const sorted = this.getAllElements();
    const elementsMap = this.getElementsMap();

    this.doc.transact(() => {
      for (let i = sorted.length - 1; i >= 0; i--) {
        const current = sorted[i];
        if (!selectedSet.has(current.id)) continue;

        let nextUnselectedIdx = -1;
        for (let j = i + 1; j < sorted.length; j++) {
          if (!selectedSet.has(sorted[j].id)) {
            nextUnselectedIdx = j;
            break;
          }
        }
        if (nextUnselectedIdx === -1) continue;

        const aboveEl = sorted[nextUnselectedIdx];
        const afterAboveEl = sorted[nextUnselectedIdx + 1];
        const newZ = generateKeyBetween(aboveEl.z, afterAboveEl ? afterAboveEl.z : null);
        const map = elementsMap.get(current.id);
        if (map) {
          YjsElementAdapter.updateYMap(map, { z: newZ });
          current.z = newZ;
          sorted.sort((a, b) => (a.z > b.z ? 1 : a.z < b.z ? -1 : 0));
        }
      }
    }, LOCAL_ORIGIN);
  }

  sendBackward(ids: readonly string[]): void {
    if (ids.length === 0) return;
    const selectedSet = new Set(ids);
    const sorted = this.getAllElements();
    const elementsMap = this.getElementsMap();

    this.doc.transact(() => {
      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        if (!selectedSet.has(current.id)) continue;

        let prevUnselectedIdx = -1;
        for (let j = i - 1; j >= 0; j--) {
          if (!selectedSet.has(sorted[j].id)) {
            prevUnselectedIdx = j;
            break;
          }
        }
        if (prevUnselectedIdx === -1) continue;

        const belowEl = sorted[prevUnselectedIdx];
        const beforeBelowEl = sorted[prevUnselectedIdx - 1];
        const newZ = generateKeyBetween(beforeBelowEl ? beforeBelowEl.z : null, belowEl.z);
        const map = elementsMap.get(current.id);
        if (map) {
          YjsElementAdapter.updateYMap(map, { z: newZ });
          current.z = newZ;
          sorted.sort((a, b) => (a.z > b.z ? 1 : a.z < b.z ? -1 : 0));
        }
      }
    }, LOCAL_ORIGIN);
  }

  groupElements(ids: readonly string[]): string | null {
    if (ids.length < 2) return null;
    const elementsMap = this.getElementsMap();
    const groupId = nanoid(10);
    this.doc.transact(() => {
      ids.forEach((id) => {
        const map = elementsMap.get(id);
        if (map && map.get("locked") !== true) {
          YjsElementAdapter.updateYMap(map, { groupId });
        }
      });
    }, LOCAL_ORIGIN);
    return groupId;
  }

  ungroupElements(ids: readonly string[]): void {
    if (ids.length === 0) return;
    const elementsMap = this.getElementsMap();
    const groupIdsToClear = new Set<string>();
    ids.forEach((id) => {
      const map = elementsMap.get(id);
      const gid = map?.get("groupId");
      if (typeof gid === "string" && gid.length > 0) {
        groupIdsToClear.add(gid);
      }
    });

    this.doc.transact(() => {
      const targetMaps =
        groupIdsToClear.size > 0
          ? Array.from(elementsMap.values()).filter((map) => {
              const gid = map.get("groupId");
              return typeof gid === "string" && groupIdsToClear.has(gid);
            })
          : (ids.map((id) => elementsMap.get(id)).filter(Boolean) as Y.Map<unknown>[]);

      targetMaps.forEach((map) =>
        YjsElementAdapter.updateYMap(map, { groupId: "" }),
      );
    }, LOCAL_ORIGIN);
  }

  expandSelectionGroups(ids: readonly string[]): string[] {
    if (ids.length === 0) return [];
    const elementsMap = this.getElementsMap();
    const groupIds = new Set<string>();
    ids.forEach((id) => {
      const map = elementsMap.get(id);
      const gid = map?.get("groupId");
      if (typeof gid === "string" && gid.length > 0) {
        groupIds.add(gid);
      }
    });
    if (groupIds.size === 0) return [...ids];

    const resultIds = new Set<string>(ids);
    elementsMap.forEach((map, id) => {
      const gid = map.get("groupId");
      if (typeof gid === "string" && groupIds.has(gid)) {
        resultIds.add(id);
      }
    });
    return Array.from(resultIds);
  }

  lockElements(ids: readonly string[]): void {
    if (ids.length === 0) return;
    const elementsMap = this.getElementsMap();
    this.doc.transact(() => {
      ids.forEach((id) => {
        const map = elementsMap.get(id);
        if (map) {
          YjsElementAdapter.updateYMap(map, { locked: true });
        }
      });
    }, LOCAL_ORIGIN);
  }

  unlockElements(ids: readonly string[]): void {
    if (ids.length === 0) return;
    const elementsMap = this.getElementsMap();
    this.doc.transact(() => {
      ids.forEach((id) => {
        const map = elementsMap.get(id);
        if (map) {
          YjsElementAdapter.updateYMap(map, { locked: false });
        }
      });
    }, LOCAL_ORIGIN);
  }

  toggleLockElements(ids: readonly string[]): void {
    if (ids.length === 0) return;
    const elements = this.getManyByIds(ids);
    const allLocked = elements.length > 0 && elements.every((el) => el.locked);
    if (allLocked) {
      this.unlockElements(ids);
    } else {
      this.lockElements(ids);
    }
  }

  private applyPositionUpdates(
    ids: readonly string[],
    updates: Map<string, { x?: number; y?: number }>,
  ): void {
    if (updates.size === 0) return;

    const elementsMap = this.getElementsMap();
    this.doc.transact(() => {
      updates.forEach((pos, id) => {
        const map = elementsMap.get(id);
        if (!map) return;
        YjsElementAdapter.updateYMap(map, pos);
        const data = YjsElementAdapter.toElementData(map);
        if (data) {
          this.spatialIndex.remove(id);
          this.spatialIndex.insert(id, data.x, data.y, data.w, data.h);
        }
      });
    }, LOCAL_ORIGIN);

    this.syncConnectedArrows(ids);
  }

  alignElements(ids: readonly string[], alignment: AlignmentType): void {
    if (ids.length < 2) return;
    const elements = this.getManyByIds(ids);
    this.applyPositionUpdates(ids, calculateAlignedPositions(elements, alignment));
  }

  distributeElements(ids: readonly string[], direction: DistributionType): void {
    if (ids.length < 3) return;
    const elements = this.getManyByIds(ids);
    this.applyPositionUpdates(ids, calculateDistributedPositions(elements, direction));
  }

  standardizeSpacing(
    ids: readonly string[],
    direction: "horizontal" | "vertical",
    customGap?: number,
  ): void {
    if (ids.length < 2) return;
    const elements = this.getManyByIds(ids);
    this.applyPositionUpdates(
      ids,
      calculateStandardizedSpacingPositions(elements, direction, customGap),
    );
  }

  syncConnectedArrows(movedIds: readonly string[]): void {
    if (movedIds.length === 0) return;
    const movedSet = new Set(movedIds);
    const elementsMap = this.getElementsMap();

    this.doc.transact(() => {
      elementsMap.forEach((map, id) => {
        const type = YjsElementAdapter.getType(map);
        if (type !== ElementType.ARROW && type !== ElementType.LINE) return;

        const el = YjsElementAdapter.toElementData(map);
        if (!el) return;

        const affectsStart =
          el.startBinding && movedSet.has(el.startBinding.elementId);
        const affectsEnd =
          el.endBinding && movedSet.has(el.endBinding.elementId);
        if (!affectsStart && !affectsEnd) return;

        const endpoints = resolveArrowEndpoints(el, (eid) => this.getById(eid));
        const minX = Math.min(endpoints.from.x, endpoints.to.x);
        const minY = Math.min(endpoints.from.y, endpoints.to.y);
        const width = Math.max(1, Math.abs(endpoints.to.x - endpoints.from.x));
        const height = Math.max(1, Math.abs(endpoints.to.y - endpoints.from.y));
        const points = [
          endpoints.from.x,
          endpoints.from.y,
          endpoints.to.x,
          endpoints.to.y,
        ];

        YjsElementAdapter.updateYMap(map, {
          x: minX,
          y: minY,
          w: width,
          h: height,
          points,
        });
        this.spatialIndex.remove(id);
        this.spatialIndex.insert(id, minX, minY, width, height);
      });
    }, LOCAL_ORIGIN);
  }

  getAllElementIds(): string[] {
    const elementsMap = this.getElementsMap();
    return Array.from(elementsMap.keys());
  }

  getAllElements(): ElementData[] {
    const result = this.getManyByIds(this.getAllElementIds());
    return result.sort((a, b) => (a.z > b.z ? 1 : a.z < b.z ? -1 : 0));
  }

  nudgeElements(ids: readonly string[], dx: number, dy: number): void {
    if (ids.length === 0 || (dx === 0 && dy === 0)) return;
    const elementsMap = this.getElementsMap();
    this.doc.transact(() => {
      ids.forEach((id) => {
        const map = elementsMap.get(id);
        if (!map || map.get("locked") === true) return;
        const el = YjsElementAdapter.toElementData(map);
        if (!el) return;

        const geom = translateGeometry(el, dx, dy);
        YjsElementAdapter.updateYMap(map, geom);
        this.spatialIndex.remove(id);
        this.spatialIndex.insert(id, geom.x, geom.y, geom.w, geom.h);
      });
      this.syncConnectedArrows(ids);
    }, LOCAL_ORIGIN);
  }
}
