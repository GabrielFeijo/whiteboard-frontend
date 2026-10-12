import { create } from 'zustand';

export type Tool =
  | 'select'
  | 'hand'
  | 'rect'
  | 'ellipse'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'text'
  | 'sticky'
  | 'freehand'
  | 'eraser';

interface CanvasState {
  activeTool: Tool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  selectedIds: string[];
  zoom: number;
  pan: { x: number; y: number };
  setActiveTool: (tool: Tool) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;
  setSelectedIds: (ids: string[]) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  resetViewport: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  activeTool: 'select',
  strokeColor: '#1e293b',
  fillColor: '#ffffff',
  strokeWidth: 2,
  opacity: 1,
  selectedIds: [],
  zoom: 1,
  pan: { x: 0, y: 0 },

  setActiveTool: (activeTool) => set({ activeTool }),
  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setFillColor: (fillColor) => set({ fillColor }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setOpacity: (opacity) => set({ opacity }),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  setZoom: (updater) =>
    set((state) => ({
      zoom: Math.min(Math.max(typeof updater === 'function' ? updater(state.zoom) : updater, 0.1), 5.0),
    })),
  setPan: (updater) =>
    set((state) => ({
      pan: typeof updater === 'function' ? updater(state.pan) : updater,
    })),
  resetViewport: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),
}));
