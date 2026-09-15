import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CanvasEdgeStyle, CanvasEdgeDirection } from './types';

export type CanvasWheelBehavior = 'pan' | 'zoom';
export type CanvasDoubleClickAction = 'card' | 'reset-zoom' | 'fit-center' | 'none';
export type CanvasZoomSensitivity = 'smooth' | 'standard' | 'fast';
export type CanvasShiftVerticalDirection = 'up-expand' | 'down-expand';
export type CanvasShiftHorizontalDirection = 'right-expand' | 'left-expand';
export type CanvasShiftResizeMode = 'axis-locked' | 'dual-axis';
export type CanvasGridStyle = 'dots' | 'lines' | 'crosshairs' | 'blank';

export interface CanvasSettingsState {
  // Grid & Snapping
  canvasSnapGrid: boolean;
  canvasSnapObjects: boolean;
  canvasReadOnly: boolean;
  gridSize: number;
  gridStyle: CanvasGridStyle;

  // Navigation & Camera
  wheelBehavior: CanvasWheelBehavior;
  doubleClickAction: CanvasDoubleClickAction;
  zoomSensitivity: CanvasZoomSensitivity;

  // Gestures & Resizing
  shiftVerticalResizeDirection: CanvasShiftVerticalDirection;
  shiftHorizontalResizeDirection: CanvasShiftHorizontalDirection;
  shiftResizeMode: CanvasShiftResizeMode;

  // Connection Lines & Edges
  defaultEdgeStyle: CanvasEdgeStyle;
  defaultArrowDirection: CanvasEdgeDirection;
  defaultEdgeColor: string;

  // Card Defaults & Layout
  defaultNodeColor: string;
  showBottomDock: boolean;

  // Setters
  setCanvasSnapGrid: (val: boolean) => void;
  setCanvasSnapObjects: (val: boolean) => void;
  setCanvasReadOnly: (val: boolean) => void;
  setGridSize: (val: number) => void;
  setGridStyle: (val: CanvasGridStyle) => void;
  setWheelBehavior: (val: CanvasWheelBehavior) => void;
  setDoubleClickAction: (val: CanvasDoubleClickAction) => void;
  setZoomSensitivity: (val: CanvasZoomSensitivity) => void;
  setShiftVerticalResizeDirection: (val: CanvasShiftVerticalDirection) => void;
  setShiftHorizontalResizeDirection: (val: CanvasShiftHorizontalDirection) => void;
  setShiftResizeMode: (val: CanvasShiftResizeMode) => void;
  setDefaultEdgeStyle: (val: CanvasEdgeStyle) => void;
  setDefaultArrowDirection: (val: CanvasEdgeDirection) => void;
  setDefaultEdgeColor: (val: string) => void;
  setDefaultNodeColor: (val: string) => void;
  setShowBottomDock: (val: boolean) => void;
  restoreDefaults: () => void;
}

export const DEFAULT_CANVAS_SETTINGS = {
  canvasSnapGrid: true,
  canvasSnapObjects: true,
  canvasReadOnly: false,
  gridSize: 20,
  gridStyle: 'dots' as CanvasGridStyle,
  wheelBehavior: 'pan' as CanvasWheelBehavior,
  doubleClickAction: 'card' as CanvasDoubleClickAction,
  zoomSensitivity: 'standard' as CanvasZoomSensitivity,
  shiftVerticalResizeDirection: 'up-expand' as CanvasShiftVerticalDirection,
  shiftHorizontalResizeDirection: 'right-expand' as CanvasShiftHorizontalDirection,
  shiftResizeMode: 'axis-locked' as CanvasShiftResizeMode,
  defaultEdgeStyle: 'bezier' as CanvasEdgeStyle,
  defaultArrowDirection: 'unidirectional' as CanvasEdgeDirection,
  defaultEdgeColor: '#888888',
  defaultNodeColor: '#2a2a2a',
  showBottomDock: true,
};

export const useCanvasSettings = create<CanvasSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_CANVAS_SETTINGS,

      setCanvasSnapGrid: (canvasSnapGrid) => set({ canvasSnapGrid }),
      setCanvasSnapObjects: (canvasSnapObjects) => set({ canvasSnapObjects }),
      setCanvasReadOnly: (canvasReadOnly) => set({ canvasReadOnly }),
      setGridSize: (gridSize) => set({ gridSize }),
      setGridStyle: (gridStyle) => set({ gridStyle }),
      setWheelBehavior: (wheelBehavior) => set({ wheelBehavior }),
      setDoubleClickAction: (doubleClickAction) => set({ doubleClickAction }),
      setZoomSensitivity: (zoomSensitivity) => set({ zoomSensitivity }),
      setShiftVerticalResizeDirection: (shiftVerticalResizeDirection) =>
        set({ shiftVerticalResizeDirection }),
      setShiftHorizontalResizeDirection: (shiftHorizontalResizeDirection) =>
        set({ shiftHorizontalResizeDirection }),
      setShiftResizeMode: (shiftResizeMode) => set({ shiftResizeMode }),
      setDefaultEdgeStyle: (defaultEdgeStyle) => set({ defaultEdgeStyle }),
      setDefaultArrowDirection: (defaultArrowDirection) => set({ defaultArrowDirection }),
      setDefaultEdgeColor: (defaultEdgeColor) => set({ defaultEdgeColor }),
      setDefaultNodeColor: (defaultNodeColor) => set({ defaultNodeColor }),
      setShowBottomDock: (showBottomDock) => set({ showBottomDock }),

      restoreDefaults: () => set({ ...DEFAULT_CANVAS_SETTINGS }),
    }),
    {
      name: 'noether_extension_data_canvas',
    }
  )
);

