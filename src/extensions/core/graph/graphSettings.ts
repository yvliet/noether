import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GraphColorMode = 'default' | 'folder' | 'tag';

export interface GraphSettingsState {
  // Time-lapse
  timelapseSpeed: number; // in milliseconds per node (e.g., 30ms - 1000ms)
  timelapseFocusCamera: boolean;
  timelapseNodePopScale: number;

  // Forces & Physics
  nodeRepulsion: number; // e.g. 50 - 500 (default 150)
  linkDistance: number; // e.g. 30 - 300 (default 100)
  linkStrength: number; // e.g. 0.1 - 2.0 (default 1.0)
  centerGravity: number; // e.g. 0.01 - 0.2 (default 0.05)

  // Display & Filters
  nodeSize: number; // scale multiplier e.g. 0.5 - 3.0 (default 1.0)
  linkThickness: number; // multiplier e.g. 0.5 - 3.0 (default 1.0)
  showLabels: boolean;
  showArrows: boolean;
  showOrphans: boolean;
  showTags: boolean;
  colorMode: GraphColorMode;

  // Actions
  setTimelapseSpeed: (val: number) => void;
  setTimelapseFocusCamera: (val: boolean) => void;
  setTimelapseNodePopScale: (val: number) => void;
  setNodeRepulsion: (val: number) => void;
  setLinkDistance: (val: number) => void;
  setLinkStrength: (val: number) => void;
  setCenterGravity: (val: number) => void;
  setNodeSize: (val: number) => void;
  setLinkThickness: (val: number) => void;
  setShowLabels: (val: boolean) => void;
  setShowArrows: (val: boolean) => void;
  setShowOrphans: (val: boolean) => void;
  setShowTags: (val: boolean) => void;
  setColorMode: (val: GraphColorMode) => void;
  restoreDefaults: () => void;
}

export const DEFAULT_GRAPH_SETTINGS = {
  timelapseSpeed: 120,
  timelapseFocusCamera: false,
  timelapseNodePopScale: 1.6,

  nodeRepulsion: 150,
  linkDistance: 100,
  linkStrength: 1.0,
  centerGravity: 0.05,

  nodeSize: 1.0,
  linkThickness: 1.0,
  showLabels: true,
  showArrows: false,
  showOrphans: true,
  showTags: true,
  colorMode: 'default' as GraphColorMode,
};

export const useGraphSettings = create<GraphSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_GRAPH_SETTINGS,

      setTimelapseSpeed: (timelapseSpeed) => set({ timelapseSpeed }),
      setTimelapseFocusCamera: (timelapseFocusCamera) => set({ timelapseFocusCamera }),
      setTimelapseNodePopScale: (timelapseNodePopScale) => set({ timelapseNodePopScale }),

      setNodeRepulsion: (nodeRepulsion) => set({ nodeRepulsion }),
      setLinkDistance: (linkDistance) => set({ linkDistance }),
      setLinkStrength: (linkStrength) => set({ linkStrength }),
      setCenterGravity: (centerGravity) => set({ centerGravity }),

      setNodeSize: (nodeSize) => set({ nodeSize }),
      setLinkThickness: (linkThickness) => set({ linkThickness }),
      setShowLabels: (showLabels) => set({ showLabels }),
      setShowArrows: (showArrows) => set({ showArrows }),
      setShowOrphans: (showOrphans) => set({ showOrphans }),
      setShowTags: (showTags) => set({ showTags }),
      setColorMode: (colorMode) => set({ colorMode }),

      restoreDefaults: () => set({ ...DEFAULT_GRAPH_SETTINGS }),
    }),
    {
      name: 'flint_plugin_data_graph-view',
    }
  )
);
