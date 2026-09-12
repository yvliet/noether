import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GraphColorMode = 'type' | 'folder' | 'tag' | 'random';

export type GraphNodeType = 'note' | 'canvas' | 'image' | 'media' | 'document' | 'tag' | 'other';

export interface GraphPalette {
  id: string;
  name: string;
  description: string;
  colors: {
    note: string;
    canvas: string;
    image: string;
    media: string;
    document: string;
    tag: string;
    other: string;
    sequential: string[];
  };
}

export const GRAPH_PALETTES: Record<string, GraphPalette> = {
  amber: {
    id: 'amber',
    name: 'Amber',
    description: 'Warm amber, sapphire blue, and emerald accents',
    colors: {
      note: '#f59e0b',
      canvas: '#3b82f6',
      image: '#10b981',
      media: '#8b5cf6',
      document: '#ec4899',
      tag: '#06b6d4',
      other: '#a1a1aa',
      sequential: ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6'],
    },
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    description: 'Botanic emerald, jade, mint, and sea teal',
    colors: {
      note: '#10b981',
      canvas: '#06b6d4',
      image: '#84cc16',
      media: '#14b8a6',
      document: '#3b82f6',
      tag: '#a855f7',
      other: '#94a3b8',
      sequential: ['#10b981', '#14b8a6', '#06b6d4', '#84cc16', '#22c55e', '#3b82f6', '#059669', '#6ee7b7'],
    },
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    description: 'Vibrant synthwave cyan, magenta, and solar yellow',
    colors: {
      note: '#00f0ff',
      canvas: '#ff007f',
      image: '#ffe600',
      media: '#b026ff',
      document: '#00ff66',
      tag: '#ff5500',
      other: '#71717a',
      sequential: ['#00f0ff', '#ff007f', '#ffe600', '#b026ff', '#00ff66', '#ff5500', '#38bdf8', '#e879f9'],
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Arctic frost sky, maritime teal, and deep blue',
    colors: {
      note: '#38bdf8',
      canvas: '#6366f1',
      image: '#2dd4bf',
      media: '#818cf8',
      document: '#0284c7',
      tag: '#f472b6',
      other: '#94a3b8',
      sequential: ['#38bdf8', '#6366f1', '#2dd4bf', '#0284c7', '#818cf8', '#0ea5e9', '#67e8f9', '#a5b4fc'],
    },
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Dusk rose, coral orange, fuchsia, and apricot',
    colors: {
      note: '#f43f5e',
      canvas: '#f97316',
      image: '#d946ef',
      media: '#e11d48',
      document: '#fb923c',
      tag: '#a855f7',
      other: '#a1a1aa',
      sequential: ['#f43f5e', '#f97316', '#d946ef', '#fbbf24', '#e11d48', '#fb923c', '#c084fc', '#fda4af'],
    },
  },
  pastel: {
    id: 'pastel',
    name: 'Pastel',
    description: 'Soft rose, baby blue, mint, and lavender',
    colors: {
      note: '#f472b6',
      canvas: '#93c5fd',
      image: '#86efac',
      media: '#c4b5fd',
      document: '#fde047',
      tag: '#fdba74',
      other: '#cbd5e1',
      sequential: ['#93c5fd', '#86efac', '#c4b5fd', '#fdba74', '#f472b6', '#67e8f9', '#fde047', '#cbd5e1'],
    },
  },
};

export const DEFAULT_CUSTOM_TYPE_COLORS: Record<GraphNodeType, string | null> = {
  note: null,
  canvas: null,
  image: null,
  media: null,
  document: null,
  tag: null,
  other: null,
};

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
  enableNodeColors: boolean;
  colorMode: GraphColorMode;
  paletteId: string;
  customTypeColors: Record<GraphNodeType, string | null>;
  dockDefaultMode: 'global' | 'local';

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
  setEnableNodeColors: (val: boolean) => void;
  setColorMode: (val: GraphColorMode) => void;
  setPaletteId: (val: string) => void;
  setCustomTypeColor: (type: GraphNodeType, color: string | null) => void;
  resetCustomTypeColors: () => void;
  setDockDefaultMode: (val: 'global' | 'local') => void;
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
  enableNodeColors: false,
  colorMode: 'random' as GraphColorMode,
  paletteId: 'amber',
  customTypeColors: { ...DEFAULT_CUSTOM_TYPE_COLORS },
  dockDefaultMode: 'global' as 'global' | 'local',
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
      setEnableNodeColors: (enableNodeColors) => set({ enableNodeColors }),
      setColorMode: (colorMode) => set({ colorMode }),
      setPaletteId: (paletteId) => set({ paletteId }),
      setCustomTypeColor: (type, color) =>
        set((state) => ({
          customTypeColors: {
            ...state.customTypeColors,
            [type]: color,
          },
        })),
      resetCustomTypeColors: () =>
        set({ customTypeColors: { ...DEFAULT_CUSTOM_TYPE_COLORS } }),

      setDockDefaultMode: (dockDefaultMode) => set({ dockDefaultMode }),

      restoreDefaults: () => set({ ...DEFAULT_GRAPH_SETTINGS }),
    }),
    {
      name: 'noether_extension_data_graph-view',
    }
  )
);

/**
 * Resolves the categorical node type for graph visualization based on document title,
 * explicit doc_type, or virtual tag flag.
 */
export function resolveGraphNodeType(title: string, docType?: string, isTag?: boolean): GraphNodeType {
  if (isTag) return 'tag';

  const cleanDocType = (docType || '').toLowerCase().trim();
  if (cleanDocType === 'canvas') return 'canvas';
  if (cleanDocType === 'image') return 'image';
  if (cleanDocType === 'audio' || cleanDocType === 'video') return 'media';

  const extMatch = (title || '').match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : '';

  if (!ext || ext === 'md' || ext === 'markdown' || ext === 'txt') {
    return 'note';
  }
  if (ext === 'canvas') {
    return 'canvas';
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'avif'].includes(ext)) {
    return 'image';
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'mp4', 'webm', 'mov', 'mkv', 'avi', 'wmv'].includes(ext)) {
    return 'media';
  }
  if (['pdf', 'epub', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'tsv'].includes(ext)) {
    return 'document';
  }

  return 'other';
}

/**
 * Converts a hex color string to [r, g, b] tuple. Defaults to neutral gray (156, 163, 175) on invalid values.
 */
export function hexToRgb(hex: string): [number, number, number] {
  if (!hex) return [156, 163, 175];
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  const num = parseInt(h, 16);
  if (isNaN(num)) return [156, 163, 175];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Computes deterministic integer hash from string for uniform palette distribution across folders or tags.
 */
export function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Resolves node base RGB color based on the active colorMode, palette, and custom type overrides.
 * Used to precompute and cache RGB on node objects for zero-allocation 60fps canvas rendering.
 */
export function getNodeBaseRgb(
  node: {
    title: string;
    docType?: string;
    isTag?: boolean;
    folderName?: string;
    tags?: string[];
  },
  settings: {
    enableNodeColors?: boolean;
    colorMode: GraphColorMode;
    paletteId: string;
    customTypeColors: Record<GraphNodeType, string | null>;
  }
): [number, number, number] {
  if (settings.enableNodeColors === false) {
    return [156, 163, 175]; // Classic neutral gray
  }

  const palette = GRAPH_PALETTES[settings.paletteId] || GRAPH_PALETTES.amber;

  if (settings.colorMode === 'type') {
    const nodeType = resolveGraphNodeType(node.title, node.docType, node.isTag);
    const customHex = settings.customTypeColors?.[nodeType];
    const hex = customHex || palette.colors[nodeType] || palette.colors.other;
    return hexToRgb(hex);
  }

  if (settings.colorMode === 'folder') {
    if (node.isTag) {
      return hexToRgb(palette.colors.tag);
    }
    const folder = node.folderName || 'Root';
    const hash = Math.abs(hashStringToInt(folder));
    const seq = palette.colors.sequential;
    return hexToRgb(seq[hash % seq.length]);
  }

  if (settings.colorMode === 'tag') {
    if (node.isTag) {
      return hexToRgb(palette.colors.tag);
    }
    const firstTag = node.tags && node.tags.length > 0 ? node.tags[0] : null;
    if (firstTag) {
      const hash = Math.abs(hashStringToInt(firstTag));
      const seq = palette.colors.sequential;
      return hexToRgb(seq[hash % seq.length]);
    }
    return [156, 163, 175];
  }

  if (settings.colorMode === 'random') {
    const key = node.title || 'node';
    const hash = Math.abs(hashStringToInt(key));
    const seq = palette.colors.sequential;
    return hexToRgb(seq[hash % seq.length]);
  }

  return [156, 163, 175];
}
