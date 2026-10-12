import RBush from 'rbush';
import { Rect } from './viewport';

export interface SpatialItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: string;
}

export class SpatialIndex {
  private tree = new RBush<SpatialItem>();
  private itemsById = new Map<string, SpatialItem>();

  insert(id: string, x: number, y: number, w: number, h: number) {
    this.remove(id);
    const item: SpatialItem = {
      minX: Math.min(x, x + w),
      minY: Math.min(y, y + h),
      maxX: Math.max(x, x + w),
      maxY: Math.max(y, y + h),
      id,
    };
    this.itemsById.set(id, item);
    this.tree.insert(item);
  }

  remove(id: string) {
    const existing = this.itemsById.get(id);
    if (existing) {
      this.tree.remove(existing);
      this.itemsById.delete(id);
    }
  }

  search(bounds: Rect): string[] {
    const results = this.tree.search(bounds);
    return results.map((item) => item.id);
  }

  clear() {
    this.tree.clear();
    this.itemsById.clear();
  }
}
