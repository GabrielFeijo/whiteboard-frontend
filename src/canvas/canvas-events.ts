export type CanvasEventMap = {
  focusTextInput: { elementId: string };
  selectionChange: { selectedIds: string[] };
  viewportChange: { pan: { x: number; y: number }; zoom: number };
};

type Listener<T> = (data: T) => void;
type AnyListener = (data: never) => void;

export class CanvasEventEmitter {
  private listeners = new Map<string, Set<AnyListener>>();

  on<K extends keyof CanvasEventMap>(event: K, listener: Listener<CanvasEventMap[K]>): () => void {
    const key = String(event);
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener as unknown as AnyListener);
    return () => this.off(event, listener);
  }

  off<K extends keyof CanvasEventMap>(event: K, listener: Listener<CanvasEventMap[K]>): void {
    const key = String(event);
    this.listeners.get(key)?.delete(listener as unknown as AnyListener);
  }

  emit<K extends keyof CanvasEventMap>(event: K, data: CanvasEventMap[K]): void {
    const key = String(event);
    this.listeners.get(key)?.forEach((fn) => {
      try {
        (fn as unknown as Listener<CanvasEventMap[K]>)(data);
      } catch (err) {
        console.error(`Error in CanvasEventEmitter listener for event "${key}":`, err);
      }
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}
