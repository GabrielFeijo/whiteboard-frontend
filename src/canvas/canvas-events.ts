export type CanvasEventMap = {
  focusTextInput: { elementId: string };
  selectionChange: { selectedIds: string[] };
  viewportChange: { pan: { x: number; y: number }; zoom: number };
  openShortcutsHelp: Record<string, never>;
};

type Listener<T> = (data: T) => void;

type ListenerRegistry = {
  [K in keyof CanvasEventMap]: Set<Listener<CanvasEventMap[K]>>;
};

export class CanvasEventEmitter {
  private readonly listeners: ListenerRegistry = {
    focusTextInput: new Set(),
    selectionChange: new Set(),
    viewportChange: new Set(),
    openShortcutsHelp: new Set(),
  };

  on<K extends keyof CanvasEventMap>(
    event: K,
    listener: Listener<CanvasEventMap[K]>,
  ): () => void {
    this.listeners[event].add(listener);
    return () => this.off(event, listener);
  }

  off<K extends keyof CanvasEventMap>(
    event: K,
    listener: Listener<CanvasEventMap[K]>,
  ): void {
    this.listeners[event].delete(listener);
  }

  emit<K extends keyof CanvasEventMap>(
    event: K,
    data: CanvasEventMap[K],
  ): void {
    this.listeners[event].forEach((fn) => {
      fn(data);
    });
  }

  clear(): void {
    this.listeners.focusTextInput.clear();
    this.listeners.selectionChange.clear();
    this.listeners.viewportChange.clear();
    this.listeners.openShortcutsHelp.clear();
  }
}
