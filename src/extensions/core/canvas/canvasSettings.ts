import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CanvasSettingsState {
  canvasSnapGrid: boolean;
  gridSize: number;
  defaultNodeColor: string;

  setCanvasSnapGrid: (val: boolean) => void;
  setGridSize: (val: number) => void;
  setDefaultNodeColor: (val: string) => void;
  restoreDefaults: () => void;
}

export const DEFAULT_CANVAS_SETTINGS = {
  canvasSnapGrid: true,
  gridSize: 20,
  defaultNodeColor: '#2a2a2a',
};

export const useCanvasSettings = create<CanvasSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_CANVAS_SETTINGS,

      setCanvasSnapGrid: (canvasSnapGrid) => set({ canvasSnapGrid }),
      setGridSize: (gridSize) => set({ gridSize }),
      setDefaultNodeColor: (defaultNodeColor) => set({ defaultNodeColor }),

      restoreDefaults: () => set({ ...DEFAULT_CANVAS_SETTINGS }),
    }),
    {
      name: 'flint_plugin_data_canvas',
    }
  )
);
