import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSidebarDockStore } from '@/store/sidebarDockStore';
import { useGraphSettings } from './graphSettings';
import { useDocumentStore } from '@/store/documentStore';
import { dbAdapter } from '@/lib/db/adapter';
import { getAllDocuments, getDocumentPath } from '@/lib/db/documents';
import {
  Search01Icon,
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  CenterFocusIcon,
  BubblesIcon,
  Cancel01Icon,
  NeuralNetworkIcon,
} from '@/components/common/Icons';
import { Tooltip } from '@/components/common/Tooltip';
import { PageSubHeader } from '@/components/layout/PageSubHeader';
import { DocumentItem } from '@/types';

function getGraphNodeTitle(doc: DocumentItem, allDocs: DocumentItem[]): string {
  return getDocumentPath(doc, allDocs) || doc.title || 'Untitled';
}

interface GraphNode {
  id: string;
  title: string;
  displayTitle?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isFolder: boolean;
  linkCount: number;
  createdAt: number;
  textOffset?: number;
  hoverAlpha?: number;
  dimAlpha?: number;
  connectAlpha?: number;
  popScale?: number;
  popAlpha?: number;
  floatPhaseX?: number;
  floatPhaseY?: number;
  floatFreq?: number;
}

interface GraphLink {
  source: string;
  target: string;
  hoverAlpha?: number;
  dimAlpha?: number;
  hoverOriginId?: string;
}

// Deterministic seed helper (ensures 100% identical layout across refreshes)
function hashStringToUnit(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function getStorageKey(vaultPath?: string): string {
  const vp = vaultPath || useWorkspaceStore.getState().vaultPath || 'default';
  return `flint_graph_positions_v6:${vp}`;
}

function getTransformStorageKey(vaultPath?: string): string {
  const vp = vaultPath || useWorkspaceStore.getState().vaultPath || 'default';
  return `flint_graph_transform_v1:${vp}`;
}

function getSavedPositions(vaultPath?: string): Record<string, { x: number; y: number }> {
  try {
    const key = getStorageKey(vaultPath);
    const raw = localStorage.getItem(key) || localStorage.getItem('flint_graph_positions_v5');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const clean: Record<string, { x: number; y: number }> = {};
    for (const [id, pos] of Object.entries(parsed)) {
      if (
        pos &&
        typeof pos === 'object' &&
        typeof (pos as any).x === 'number' &&
        typeof (pos as any).y === 'number' &&
        Number.isFinite((pos as any).x) &&
        Number.isFinite((pos as any).y)
      ) {
        clean[id] = { x: (pos as any).x, y: (pos as any).y };
      }
    }
    return clean;
  } catch {
    return {};
  }
}

function saveNodePositions(positions: Record<string, { x: number; y: number }>, vaultPath?: string) {
  try {
    const key = getStorageKey(vaultPath);
    localStorage.setItem(key, JSON.stringify(positions));
  } catch {}
}

function getSavedTransform(vaultPath?: string): { x: number; y: number; scale: number } | null {
  try {
    const key = getTransformStorageKey(vaultPath);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.x === 'number' &&
      typeof parsed.y === 'number' &&
      typeof parsed.scale === 'number' &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y) &&
      Number.isFinite(parsed.scale) &&
      parsed.scale > 0.05
    ) {
      return parsed;
    }
  } catch {}
  return null;
}

function saveTransform(transform: { x: number; y: number; scale: number }, vaultPath?: string) {
  try {
    const key = getTransformStorageKey(vaultPath);
    localStorage.setItem(key, JSON.stringify(transform));
  } catch {}
}

function getDeterministicNodePos(docId: string, index = 0): { x: number; y: number } {
  // Golden ratio angle (~137.5 degrees) provides natural, non-repeating 360-degree radial dispersion
  const goldenAngle = 2.399963229728653;
  const hashVar = (hashStringToUnit(docId + ':angleOffset') - 0.5) * 0.7;
  const angle = index * goldenAngle + hashVar;
  const uDist = hashStringToUnit(docId + ':dist');
  const dist = 80 + Math.sqrt(index + 1) * 60 + (uDist - 0.5) * 45;
  return {
    x: Math.round(Math.cos(angle) * dist),
    y: Math.round(Math.sin(angle) * dist),
  };
}

export interface GraphViewProps {
  isSidebar?: boolean;
  tabId?: string;
  documentId?: string;
}

function getFloatingTabsStorageKey(vaultPath?: string): string {
  const vp = (vaultPath || 'default').trim();
  return `flint_graph_floating_tabs_v1:${vp}`;
}

function isTabFloating(tabId?: string, vaultPath?: string): boolean {
  if (!tabId) return false;
  // 1. Check workspaceStore / sidebarDockStore metadata
  try {
    const ws = useWorkspaceStore.getState();
    for (const p of Object.values(ws.panes || {})) {
      const t = p.tabs.find((tab) => tab.id === tabId);
      if (t && t.metadata?.isFloating !== undefined) {
        return !!t.metadata.isFloating;
      }
    }
    const mainTab = ws.tabs.find((t) => t.id === tabId);
    if (mainTab && mainTab.metadata?.isFloating !== undefined) {
      return !!mainTab.metadata.isFloating;
    }
    const dockItem = useSidebarDockStore.getState().items.find((it) => it.id === tabId);
    if (dockItem && dockItem.metadata?.isFloating !== undefined) {
      return !!dockItem.metadata.isFloating;
    }
  } catch {}

  // 2. Check localStorage set
  try {
    const key = getFloatingTabsStorageKey(vaultPath);
    const raw = localStorage.getItem(key);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list.includes(tabId);
      }
    }
  } catch {}
  return false;
}

function setTabFloatingState(tabId: string | undefined, isFloating: boolean, vaultPath?: string) {
  if (!tabId) return;
  // 1. Update localStorage set
  try {
    const key = getFloatingTabsStorageKey(vaultPath);
    const raw = localStorage.getItem(key);
    let set = new Set<string>();
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) set = new Set(list);
    }
    if (isFloating) {
      set.add(tabId);
    } else {
      set.delete(tabId);
    }
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {}

  // 2. Update metadata in workspaceStore / sidebarDockStore
  try {
    useWorkspaceStore.setState((state) => {
      const updateTab = (t: any) => (t.id === tabId ? { ...t, metadata: { ...t.metadata, isFloating } } : t);
      const newPanes: Record<string, any> = {};
      for (const [pId, pModel] of Object.entries(state.panes || {})) {
        newPanes[pId] = {
          ...pModel,
          tabs: pModel.tabs.map(updateTab),
        };
      }
      return {
        tabs: state.tabs.map(updateTab),
        splitTabs: state.splitTabs.map(updateTab),
        panes: newPanes,
      };
    });

    useSidebarDockStore.setState((state) => ({
      items: state.items.map((it) => (it.id === tabId ? { ...it, metadata: { ...it.metadata, isFloating } } : it)),
    }));
  } catch {}
}

export const GraphView: React.FC<GraphViewProps> = React.memo(({ isSidebar: propIsSidebar, tabId: propTabId, documentId: propDocId }) => {
  const setMainViewMode = useWorkspaceStore((s) => s.setMainViewMode);
  const openTab = useWorkspaceStore((s) => s.openTab);
  const setActiveDocumentById = useDocumentStore((s) => s.setActiveDocumentById);
  const vaultPath = useWorkspaceStore((s) => s.vaultPath);
  const activeTabId = useWorkspaceStore((s) => s.activeTabId);
  const resolvedTabId = propTabId || activeTabId || propDocId || 'graph-main';

  const graphFocusCamera = useGraphSettings((s) => s.timelapseFocusCamera);
  const graphFocusCameraRef = useRef(graphFocusCamera);
  useEffect(() => {
    graphFocusCameraRef.current = graphFocusCamera;
  }, [graphFocusCamera]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isSidebarDetected, setIsSidebarDetected] = useState(false);

  useEffect(() => {
    if (propIsSidebar !== undefined) {
      setIsSidebarDetected(propIsSidebar);
      return;
    }
    if (containerRef.current) {
      const inSidebar = !!containerRef.current.closest(
        '[data-sidebar], [data-dock-zone], [data-sidebar-root], [data-sidebar-dock-pane], aside'
      );
      setIsSidebarDetected(inSidebar);
    }
  }, [propIsSidebar]);

  const isSidebar = propIsSidebar ?? isSidebarDetected;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [filterText, setFilterText] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchMatchIndexRef = useRef(-1);

  // Hover state stored in refs to avoid 60fps re-renders on mousemove
  const hoveredNodeRef = useRef<GraphNode | null>(null);
  const connectedNodeIdsRef = useRef<Set<string> | null>(null);

  // Timelapse State (idle / playing / paused)
  const [isTimelapseActive, setIsTimelapseActive] = useState(false);
  const [isTimelapsePaused, setIsTimelapsePaused] = useState(false);
  const isTimelapseActiveRef = useRef(false);
  const isTimelapsePausedRef = useRef(false);
  const timelapseStepRef = useRef(0);
  const timelapseTimerRef = useRef<any>(null);
  const timelapseEndTimerRef = useRef<any>(null);
  const savedTimelapseAlphaRef = useRef(0.5);

  // Float Mode State (zero-gravity continuous ambient hovering motion per graph instance)
  const [isFloatActive, setIsFloatActive] = useState(() => isTabFloating(resolvedTabId, vaultPath));
  const isFloatActiveRef = useRef(isFloatActive);
  const floatStartTimeRef = useRef(0);

  useEffect(() => {
    isFloatActiveRef.current = isFloatActive;
    if (isFloatActive) {
      if (floatStartTimeRef.current === 0) {
        floatStartTimeRef.current = performance.now();
      }
      alphaRef.current = Math.max(alphaRef.current, 0.15);
      startAnimationRef.current();
    }
  }, [isFloatActive]);

  // Pre-timelapse snapshot of node positions to guarantee 100% exact layout convergence
  const preTimelapseLayoutRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    return () => {
      if (timelapseTimerRef.current) clearInterval(timelapseTimerRef.current);
      if (timelapseEndTimerRef.current) clearTimeout(timelapseEndTimerRef.current);
    };
  }, []);

  // Physics & Transform State with smooth kinematic camera easing & pan momentum
  const targetTransformRef = useRef({ x: 400, y: 300, scale: 1 });
  const currentTransformRef = useRef({ x: 400, y: 300, scale: 1 });
  (window as any).__graphTransform = targetTransformRef;
  const panVelocityRef = useRef({ vx: 0, vy: 0 });
  const panHistoryRef = useRef<Array<{ x: number; y: number; t: number }>>([]);
  const isDraggingRef = useRef(false);
  const dragNodeRef = useRef<GraphNode | null>(null);
  const clickedNodeCandidateRef = useRef<GraphNode | null>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);
  const startAnimationRef = useRef<() => void>(() => {});
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const alphaRef = useRef(0.8); // Energy cooldown
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{
    dist: number;
    scale: number;
    center: { x: number; y: number };
    transform: { x: number; y: number };
  } | null>(null);

  // Persistent reusable data structures (avoids 60 allocations/sec)
  const visibleNodeIdsRef = useRef(new Set<string>());
  const nodeMapRef = useRef(new Map<string, GraphNode>());
  const physicsNodeMapRef = useRef(new Map<string, GraphNode>());

  // Update canvas resolution to match exact DOM dimensions without resetting layout
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = canvas.getBoundingClientRect();
    const width = (rect.width > 0 ? rect.width : container.clientWidth) || 800;
    const height = (rect.height > 0 ? rect.height : (container.clientHeight ? container.clientHeight - 32 : 600)) || 600;
    const dpr = window.devicePixelRatio || 1;

    const targetWidth = Math.max(100, Math.round(width * dpr));
    const targetHeight = Math.max(100, Math.round(height * dpr));

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
  }, []);

  // High-performance layout observer that resizes canvas without synchronous DOM layout thrashing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const canvas = canvasRef.current;
        if (!canvas || width <= 0 || height <= 0) continue;
        const dpr = window.devicePixelRatio || 1;
        const targetWidth = Math.max(100, Math.round(width * dpr));
        const targetHeight = Math.max(100, Math.round(height * dpr));
        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          startAnimationRef.current();
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Compute bounding box and center all nodes to be 100% visible on screen
  const centerGraph = useCallback((nodesList: GraphNode[]) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || nodesList.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const width = (rect.width > 0 ? rect.width : container.clientWidth) || 800;
    const height = (rect.height > 0 ? rect.height : (container.clientHeight ? container.clientHeight - 32 : 600)) || 600;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let validCount = 0;

    for (const n of nodesList) {
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
      validCount++;
    }

    if (validCount === 0 || !Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
      targetTransformRef.current = { x: width / 2, y: height / 2, scale: 1 };
      return;
    }

    const graphWidth = Math.max(180, maxX - minX + 160);
    const graphHeight = Math.max(180, maxY - minY + 160);
    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    const scaleX = (width * 0.85) / graphWidth;
    const scaleY = (height * 0.85) / graphHeight;
    const fitScale = Math.min(1.4, Math.max(0.25, Math.min(scaleX, scaleY)));

    const tx = width / 2 - graphCenterX * fitScale;
    const ty = height / 2 - graphCenterY * fitScale;

    targetTransformRef.current = {
      x: Number.isFinite(tx) ? tx : width / 2,
      y: Number.isFinite(ty) ? ty : height / 2,
      scale: fitScale,
    };
  }, []);

  // Dynamic Focus Camera for Time-lapse (Cinematic growth-following auto framing)
  const updateTimelapseFocusCamera = useCallback((stepCount: number, immediate = false) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = canvas.getBoundingClientRect();
    const width = (rect.width > 0 ? rect.width : container.clientWidth) || 800;
    const height = (rect.height > 0 ? rect.height : (container.clientHeight ? container.clientHeight - 32 : 600)) || 600;

    const currentNodes = nodesRef.current;
    const count = Math.min(Math.max(1, stepCount), currentNodes.length);
    if (count === 0 || currentNodes.length === 0) return;

    if (count === 1) {
      const n0 = currentNodes[0];
      if (!Number.isFinite(n0.x) || !Number.isFinite(n0.y)) return;
      const targetScale = 1.35;
      const tx = width / 2 - n0.x * targetScale;
      const ty = height / 2 - n0.y * targetScale;
      targetTransformRef.current = { x: tx, y: ty, scale: targetScale };
      if (immediate) {
        currentTransformRef.current = { x: tx, y: ty, scale: targetScale };
      }
      return;
    }

    if (count === 2) {
      const n0 = currentNodes[0];
      const n1 = currentNodes[1];
      if (!Number.isFinite(n0.x) || !Number.isFinite(n0.y) || !Number.isFinite(n1.x) || !Number.isFinite(n1.y)) return;
      const midX = (n0.x + n1.x) / 2;
      const midY = (n0.y + n1.y) / 2;
      const spanX = Math.abs(n1.x - n0.x) + 200;
      const spanY = Math.abs(n1.y - n0.y) + 200;
      const scaleX = (width * 0.72) / Math.max(180, spanX);
      const scaleY = (height * 0.72) / Math.max(180, spanY);
      const targetScale = Math.min(1.25, Math.max(0.35, Math.min(scaleX, scaleY)));
      const tx = width / 2 - midX * targetScale;
      const ty = height / 2 - midY * targetScale;
      targetTransformRef.current = { x: tx, y: ty, scale: targetScale };
      if (immediate) {
        currentTransformRef.current = { x: tx, y: ty, scale: targetScale };
      }
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let valid = 0;

    for (let i = 0; i < count; i++) {
      const n = currentNodes[i];
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
      valid++;
    }

    if (valid === 0 || !Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) return;

    const graphWidth = Math.max(180, maxX - minX + 220);
    const graphHeight = Math.max(180, maxY - minY + 220);
    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    const scaleX = (width * 0.80) / graphWidth;
    const scaleY = (height * 0.80) / graphHeight;
    const fitScale = Math.min(1.25, Math.max(0.25, Math.min(scaleX, scaleY)));

    const tx = width / 2 - graphCenterX * fitScale;
    const ty = height / 2 - graphCenterY * fitScale;

    targetTransformRef.current = {
      x: Number.isFinite(tx) ? tx : width / 2,
      y: Number.isFinite(ty) ? ty : height / 2,
      scale: fitScale,
    };
    if (immediate) {
      currentTransformRef.current = { ...targetTransformRef.current };
    }
  }, []);

  // Save current node layout to storage (debounced by default to prevent UI thread blocking)
  const persistPositionsTimerRef = useRef<any>(null);
  const persistPositions = useCallback((immediate = false) => {
    if (nodesRef.current.length === 0) return;
    const doSave = () => {
      const map: Record<string, { x: number; y: number }> = {};
      for (const n of nodesRef.current) {
        if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
          map[n.id] = { x: Math.round(n.x), y: Math.round(n.y) };
        }
      }
      saveNodePositions(map, vaultPath);
    };

    if (persistPositionsTimerRef.current) {
      clearTimeout(persistPositionsTimerRef.current);
      persistPositionsTimerRef.current = null;
    }

    if (immediate) {
      doSave();
    } else {
      persistPositionsTimerRef.current = setTimeout(doSave, 800);
    }
  }, [vaultPath]);

  const persistTransformTimerRef = useRef<any>(null);
  const persistTransform = useCallback(() => {
    if (persistTransformTimerRef.current) clearTimeout(persistTransformTimerRef.current);
    persistTransformTimerRef.current = setTimeout(() => {
      saveTransform(targetTransformRef.current, vaultPath);
    }, 250);
  }, [vaultPath]);

  const handleResetView = useCallback(() => {
    resizeCanvas();
    centerGraph(nodesRef.current);
    persistTransform();
    alphaRef.current = 0.65;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    startAnimationRef.current();
  }, [resizeCanvas, centerGraph, persistTransform]);

  // Toggle Float Mode: ambient zero-gravity hovering motion where nodes move around themselves
  const toggleFloatMode = useCallback(() => {
    if (isTimelapseActiveRef.current) return;
    const next = !isFloatActiveRef.current;
    isFloatActiveRef.current = next;
    setIsFloatActive(next);
    setTabFloatingState(resolvedTabId, next, vaultPath);
    if (next) {
      floatStartTimeRef.current = performance.now();
      alphaRef.current = Math.max(alphaRef.current, 0.15);
      if (graphFocusCameraRef.current) {
        centerGraph(nodesRef.current);
      }
    } else {
      alphaRef.current = 0.35;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    startAnimationRef.current();
  }, [centerGraph, resolvedTabId, vaultPath]);

  const handleFitToCenter = useCallback(() => {
    if (
      ((isTimelapseActiveRef.current && !isTimelapsePausedRef.current) || isFloatActiveRef.current) &&
      graphFocusCameraRef.current
    )
      return;
    handleResetView();
  }, [handleResetView]);

  const lastPersistTimeRef = useRef(0);

  // Track the doc IDs we last built the graph from, to detect incremental changes
  const prevDocIdsRef = useRef<Set<string>>(new Set());
  const loadSeqRef = useRef(0);

  const prevVaultPathRef = useRef(vaultPath);
  if (prevVaultPathRef.current !== vaultPath) {
    prevVaultPathRef.current = vaultPath;
    prevDocIdsRef.current = new Set();
    nodesRef.current = [];
    linksRef.current = [];
  }

  // Load Graph Data with deterministic positions & persistence
  useEffect(() => {
    let disposed = false;

    async function loadData(incomingDocs?: DocumentItem[]) {
      const loadSeq = ++loadSeqRef.current;
      try {
        const storeDocs = useDocumentStore.getState().documents;
        const allDocs = Array.isArray(incomingDocs)
          ? incomingDocs
          : Array.isArray(storeDocs)
          ? storeDocs
          : await getAllDocuments();
        if (disposed || loadSeq !== loadSeqRef.current) return;

        const docs = allDocs.filter((d) => !d.is_folder);
        docs.sort((a, b) => (a.created_at || 0) - (b.created_at || 0));

        const currentDocIds = new Set(docs.map((d) => d.id));
        const prevIds = prevDocIdsRef.current;

        // --- Incremental path: instant 0ms pop-up for newly added / removed nodes ---
        if (prevIds.size > 0 && nodesRef.current.length > 0) {
          const removedIds = new Set<string>();
          for (const id of prevIds) {
            if (!currentDocIds.has(id)) removedIds.add(id);
          }
          const addedDocs = docs.filter((d) => !prevIds.has(d.id));

          // Nothing changed (e.g. metadata update or title edit)
          if (removedIds.size === 0 && addedDocs.length === 0) {
            let titleOrMetaChanged = false;
            for (const d of docs) {
              const existingNode = nodesRef.current.find((n) => n.id === d.id);
              if (existingNode) {
                const newTitle = getGraphNodeTitle(d, allDocs);
                if (existingNode.title !== newTitle) {
                  existingNode.title = newTitle;
                  existingNode.displayTitle = newTitle.includes('/') ? newTitle.split('/').pop() || newTitle : newTitle;
                  titleOrMetaChanged = true;
                }
              }
            }
            if (titleOrMetaChanged) {
              startAnimationRef.current();
            }
            prevDocIdsRef.current = currentDocIds;
            return;
          }

          // Remove deleted nodes in-place (keep all positions)
          if (removedIds.size > 0) {
            nodesRef.current = nodesRef.current.filter((n) => !removedIds.has(n.id));
            linksRef.current = linksRef.current.filter(
              (l) => !removedIds.has(l.source) && !removedIds.has(l.target)
            );
            for (const id of removedIds) {
              preTimelapseLayoutRef.current.delete(id);
            }
          }

          // Add new nodes
          if (addedDocs.length > 0) {
            const isTimelapse = isTimelapseActiveRef.current;
            const existingNodeMap = new Map(nodesRef.current.map((n) => [n.id, n]));

            if (isTimelapse) {
              // During active or paused timelapse: append newly created files to the end of the timelapse sequence
              for (const d of addedDocs) {
                if (existingNodeMap.has(d.id)) continue;

                const fullPath = getGraphNodeTitle(d, allDocs);
                const displayTitle = fullPath.includes('/') ? fullPath.split('/').pop() || fullPath : fullPath;
                const defaultPos = getDeterministicNodePos(d.id, nodesRef.current.length);

                const newNode: GraphNode = {
                  id: d.id,
                  title: fullPath,
                  displayTitle,
                  x: 0,
                  y: 0,
                  vx: 0,
                  vy: 0,
                  radius: 5.5,
                  isFolder: !!d.is_folder,
                  linkCount: 0,
                  createdAt: d.created_at || Date.now(),
                  textOffset: 14,
                  hoverAlpha: 0,
                  dimAlpha: 0,
                  connectAlpha: 0,
                  popScale: 0.01,
                  popAlpha: 0.01,
                  floatPhaseX: hashStringToUnit(d.id + ':floatX') * Math.PI * 2,
                  floatPhaseY: hashStringToUnit(d.id + ':floatY') * Math.PI * 2,
                  floatFreq: 0.00065 + (hashStringToUnit(d.id + ':freq') - 0.5) * 0.00025,
                };
                nodesRef.current.push(newNode);
                existingNodeMap.set(d.id, newNode);

                if (!preTimelapseLayoutRef.current.has(d.id)) {
                  preTimelapseLayoutRef.current.set(d.id, defaultPos);
                }
              }
            } else {
              // Normal non-timelapse mode: emerge instantly with pop animation on frame 0
              const saved = getSavedPositions(vaultPath);

              // Compute current cluster centroid
              let sumX = 0;
              let sumY = 0;
              let validNodesCount = 0;
              for (const n of nodesRef.current) {
                if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
                  sumX += n.x;
                  sumY += n.y;
                  validNodesCount++;
                }
              }
              const clusterCentroidX = validNodesCount > 0 ? sumX / validNodesCount : 0;
              const clusterCentroidY = validNodesCount > 0 ? sumY / validNodesCount : 0;

              for (const d of addedDocs) {
                if (existingNodeMap.has(d.id)) continue;

                const fullPath = getGraphNodeTitle(d, allDocs);
                const displayTitle = fullPath.includes('/') ? fullPath.split('/').pop() || fullPath : fullPath;
                const hasSaved = saved[d.id];
                let initX: number;
                let initY: number;
                const launchAngle = Math.random() * Math.PI * 2;
                const launchSpeed = 3.5 + Math.random() * 2.5;
                let initVx = Math.cos(launchAngle) * launchSpeed;
                let initVy = Math.sin(launchAngle) * launchSpeed;
                let initPopScale = 0.05;
                let initPopAlpha = 0.2;

                if (
                  hasSaved &&
                  typeof hasSaved.x === 'number' &&
                  typeof hasSaved.y === 'number' &&
                  Number.isFinite(hasSaved.x) &&
                  Number.isFinite(hasSaved.y)
                ) {
                  initX = hasSaved.x;
                  initY = hasSaved.y;
                  initVx = 0;
                  initVy = 0;
                } else if (validNodesCount > 0) {
                  const jitter = (Math.random() - 0.5) * 8;
                  initX = clusterCentroidX + Math.cos(launchAngle) * 4 + jitter;
                  initY = clusterCentroidY + Math.sin(launchAngle) * 4 + jitter;
                } else {
                  const defaultPos = getDeterministicNodePos(d.id, nodesRef.current.length);
                  initX = defaultPos.x;
                  initY = defaultPos.y;
                }

                const newNode: GraphNode = {
                  id: d.id,
                  title: fullPath,
                  displayTitle,
                  x: initX,
                  y: initY,
                  vx: initVx,
                  vy: initVy,
                  radius: 5.5,
                  isFolder: !!d.is_folder,
                  linkCount: 0,
                  createdAt: d.created_at || Date.now(),
                  textOffset: 14,
                  hoverAlpha: 0,
                  dimAlpha: 0,
                  connectAlpha: 0,
                  popScale: initPopScale,
                  popAlpha: initPopAlpha,
                  floatPhaseX: hashStringToUnit(d.id + ':floatX') * Math.PI * 2,
                  floatPhaseY: hashStringToUnit(d.id + ':floatY') * Math.PI * 2,
                  floatFreq: 0.00065 + (hashStringToUnit(d.id + ':freq') - 0.5) * 0.00025,
                };
                nodesRef.current.push(newNode);
                existingNodeMap.set(d.id, newNode);
              }
            }
          }

          // Deduplicate
          const seen = new Set<string>();
          nodesRef.current = nodesRef.current.filter((n) => {
            if (seen.has(n.id)) return false;
            seen.add(n.id);
            return true;
          });

          prevDocIdsRef.current = currentDocIds;

          if (!isTimelapseActiveRef.current) {
            timelapseStepRef.current = nodesRef.current.length;
            alphaRef.current = Math.max(alphaRef.current, 0.65);
            startAnimationRef.current();
          }

          // Only query database links if nodes were deleted or content was modified
          if (removedIds.size > 0) {
            (async () => {
              try {
                const rawLinks = await dbAdapter.query<{ source_document_id: string; target_document_id: string }>(
                  `SELECT source_document_id, target_document_id FROM document_links`
                );
                if (disposed || loadSeq !== loadSeqRef.current) return;

                const linkCounts: Record<string, number> = {};
                rawLinks.forEach((l) => {
                  if (l.source_document_id) linkCounts[l.source_document_id] = (linkCounts[l.source_document_id] || 0) + 1;
                  if (l.target_document_id) linkCounts[l.target_document_id] = (linkCounts[l.target_document_id] || 0) + 1;
                });

                for (const n of nodesRef.current) {
                  const count = linkCounts[n.id] || 0;
                  n.linkCount = count;
                  n.radius = Math.min(9, 5.5 + count * 1.4);
                }

                linksRef.current = rawLinks.map((l) => ({
                  source: l.source_document_id,
                  target: l.target_document_id,
                  hoverAlpha: 0,
                  dimAlpha: 0,
                }));
              } catch (e) {}
            })();
          }

          persistPositions(false);
          return;
        }

        // --- Full initial load path (first time only) ---
        let rawLinks: Array<{ source_document_id: string; target_document_id: string }> = [];
        try {
          rawLinks = await dbAdapter.query<{ source_document_id: string; target_document_id: string }>(
            `SELECT source_document_id, target_document_id FROM document_links`
          );
        } catch (e) {
          rawLinks = [];
        }

        if (disposed || loadSeq !== loadSeqRef.current) return;

        const linkCounts: Record<string, number> = {};
        rawLinks.forEach((l) => {
          if (l.source_document_id) linkCounts[l.source_document_id] = (linkCounts[l.source_document_id] || 0) + 1;
          if (l.target_document_id) linkCounts[l.target_document_id] = (linkCounts[l.target_document_id] || 0) + 1;
        });

        const saved = getSavedPositions(vaultPath);
        const seenInit = new Set<string>();
        const graphNodes: GraphNode[] = [];

        for (let i = 0; i < docs.length; i++) {
          const d = docs[i];
          if (seenInit.has(d.id)) continue;
          seenInit.add(d.id);

          const fullPath = getGraphNodeTitle(d, allDocs);
          const displayTitle = fullPath.includes('/') ? fullPath.split('/').pop() || fullPath : fullPath;
          const hasSaved = saved[d.id];
          let initX: number;
          let initY: number;

          if (
            hasSaved &&
            typeof hasSaved.x === 'number' &&
            typeof hasSaved.y === 'number' &&
            Number.isFinite(hasSaved.x) &&
            Number.isFinite(hasSaved.y)
          ) {
            initX = hasSaved.x;
            initY = hasSaved.y;
          } else {
            // Check if this document connects to an already-placed node in this initial batch
            const existingGraphMap = new Map(graphNodes.map((n) => [n.id, n]));
            const connLink = rawLinks.find(
              (l) =>
                (l.source_document_id === d.id && existingGraphMap.has(l.target_document_id)) ||
                (l.target_document_id === d.id && existingGraphMap.has(l.source_document_id))
            );

            if (connLink) {
              const parentId =
                connLink.source_document_id === d.id
                  ? connLink.target_document_id
                  : connLink.source_document_id;
              const parentNode = existingGraphMap.get(parentId);
              if (parentNode && Number.isFinite(parentNode.x) && Number.isFinite(parentNode.y)) {
                const siblingCount = graphNodes.filter((gn) =>
                  rawLinks.some(
                    (l) =>
                      (l.source_document_id === gn.id && l.target_document_id === parentId) ||
                      (l.target_document_id === gn.id && l.source_document_id === parentId)
                  )
                ).length;
                const goldenAngle = 2.399963;
                const hashOffset = (hashStringToUnit(d.id + ':initAngle') - 0.5) * 0.8;
                const angle = siblingCount * goldenAngle + hashOffset;
                const linkDist = 110 + (hashStringToUnit(d.id + ':initDist') - 0.5) * 40;
                initX = Math.round(parentNode.x + Math.cos(angle) * linkDist);
                initY = Math.round(parentNode.y + Math.sin(angle) * linkDist);
              } else {
                const defaultPos = getDeterministicNodePos(d.id, i);
                initX = defaultPos.x;
                initY = defaultPos.y;
              }
            } else {
              const defaultPos = getDeterministicNodePos(d.id, i);
              initX = defaultPos.x;
              initY = defaultPos.y;
            }
          }

          graphNodes.push({
            id: d.id,
            title: fullPath,
            displayTitle,
            x: initX,
            y: initY,
            vx: 0,
            vy: 0,
            radius: Math.min(9, 5.5 + (linkCounts[d.id] || 0) * 1.4),
            isFolder: !!d.is_folder,
            linkCount: linkCounts[d.id] || 0,
            createdAt: d.created_at || Date.now(),
            textOffset: 14,
            hoverAlpha: 0,
            dimAlpha: 0,
            connectAlpha: 0,
            popScale: 1,
            popAlpha: 1,
            floatPhaseX: hashStringToUnit(d.id + ':floatX') * Math.PI * 2,
            floatPhaseY: hashStringToUnit(d.id + ':floatY') * Math.PI * 2,
            floatFreq: 0.00065 + (hashStringToUnit(d.id + ':freq') - 0.5) * 0.00025,
          });
        }

        const graphLinks: GraphLink[] = rawLinks.map((l) => ({
          source: l.source_document_id,
          target: l.target_document_id,
          hoverAlpha: 0,
          dimAlpha: 0,
        }));

        if (disposed || loadSeq !== loadSeqRef.current) return;

        prevDocIdsRef.current = currentDocIds;
        nodesRef.current = graphNodes;
        linksRef.current = graphLinks;
        timelapseStepRef.current = graphNodes.length;

        resizeCanvas();

        // Restore saved camera transform or center if first launch
        const savedTransform = getSavedTransform(vaultPath);
        if (savedTransform) {
          targetTransformRef.current = savedTransform;
          currentTransformRef.current = { ...savedTransform };
        } else {
          centerGraph(graphNodes);
          currentTransformRef.current = { ...targetTransformRef.current };
        }

        alphaRef.current = 0.65;

        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        startAnimationRef.current();
      } catch (error) {
        console.error('[Flint Graph] Failed to load graph data:', error);
      }
    }

    if (dbAdapter.isReady()) {
      loadData();
    }

    const unsubStore = useDocumentStore.subscribe((state, prevState) => {
      if (state.documents !== prevState.documents) {
        loadData(state.documents);
      }
    });

    const unsubscribe = dbAdapter.onStatusChange((isReady) => {
      if (isReady) loadData();
    });

    const handleBeforeUnload = () => {
      persistPositions(true);
      saveTransform(targetTransformRef.current, vaultPath);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      disposed = true;
      unsubStore();
      unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      persistPositions(true);
      saveTransform(targetTransformRef.current, vaultPath);
    };
  }, [vaultPath, centerGraph, persistPositions, resizeCanvas]);

  // Fluid High-Performance Physics Step with Inertia, Spring Dynamics & Obstacle Avoidance
  const stepPhysics = useCallback(() => {
    // Completely freeze physics when timelapse is paused
    if (isTimelapsePausedRef.current && !dragNodeRef.current) return;
    if (alphaRef.current < 0.002 && !dragNodeRef.current && !isTimelapseActiveRef.current) return;

    const currentNodes = nodesRef.current;
    const currentLinks = linksRef.current;
    const container = containerRef.current;
    if (currentNodes.length === 0 || !container) return;

    const currentAlpha = alphaRef.current;

    const visibleCount = isTimelapseActiveRef.current ? timelapseStepRef.current : currentNodes.length;
    const visibleNodes = currentNodes.slice(0, visibleCount);
    if (visibleNodes.length === 0) return;

    const progress = visibleNodes.length / Math.max(1, currentNodes.length);
    const easeProgress = Math.pow(progress, 3);

    // Target equilibrium spacing between adjacent nodes
    const graphSettings = useGraphSettings.getState();
    const desiredDistSetting = graphSettings.linkDistance || 100;
    const repulsionMult = (graphSettings.nodeRepulsion || 150) / 150;
    const linkStrengthMult = graphSettings.linkStrength || 1.0;
    const customCenterGravity = graphSettings.centerGravity || 0.05;
    const targetSpacing = Math.max(100, Math.min(260, desiredDistSetting * 1.6));
    const maxRepulseDist = targetSpacing * 1.5;
    const maxRepulseDistSq = maxRepulseDist * maxRepulseDist;

    // 1. Short-Range Neighborhood Repulsion
    for (let i = 0; i < visibleNodes.length; i++) {
      for (let j = i + 1; j < visibleNodes.length; j++) {
        const n1 = visibleNodes[i];
        const n2 = visibleNodes[j];
        if (!Number.isFinite(n1.x) || !Number.isFinite(n1.y) || !Number.isFinite(n2.x) || !Number.isFinite(n2.y)) continue;

        let dx = n2.x - n1.x;
        let dy = n2.y - n1.y;
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
          const repAngle = hashStringToUnit(n1.id + n2.id + ':sep') * Math.PI * 2;
          dx = Math.cos(repAngle) * 4;
          dy = Math.sin(repAngle) * 4;
        }

        const distSq = dx * dx + dy * dy;
        if (distSq > maxRepulseDistSq) continue;

        const dist = Math.sqrt(distSq + 1.0);
        if (dist < targetSpacing) {
          const overlap = (targetSpacing - dist) / targetSpacing;
          const force = overlap * overlap * 18.0 * repulsionMult * currentAlpha;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (n1 !== dragNodeRef.current) {
            n1.vx = (Number.isFinite(n1.vx) ? n1.vx : 0) - fx;
            n1.vy = (Number.isFinite(n1.vy) ? n1.vy : 0) - fy;
          }
          if (n2 !== dragNodeRef.current) {
            n2.vx = (Number.isFinite(n2.vx) ? n2.vx : 0) + fx;
            n2.vy = (Number.isFinite(n2.vy) ? n2.vy : 0) + fy;
          }
        }
      }
    }

    // 2. Spring attraction along links with progressive rubber-band tension & organic angular torque
    const springK = 0.045;
    const nodeMap = physicsNodeMapRef.current;
    nodeMap.clear();
    for (let i = 0; i < visibleNodes.length; i++) {
      nodeMap.set(visibleNodes[i].id, visibleNodes[i]);
    }
    for (const link of currentLinks) {
      const s = nodeMap.get(link.source);
      const t = nodeMap.get(link.target);
      if (s && t && Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(t.x) && Number.isFinite(t.y)) {
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const delta = dist - targetSpacing;

        const stretchBonus = delta > 25 ? Math.min(10.0, Math.pow((delta - 25) / 40, 1.35) * 0.5) : 0;
        const force = (delta * springK + stretchBonus) * currentAlpha;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        // Organic angular torque: prevents isolated pairs from locking onto the exact same diagonal angle
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const pairHash = (hashStringToUnit(link.source + link.target + ':torque') - 0.5) * 2;
        const torqueForce = pairHash * 0.55 * currentAlpha;

        if (s !== dragNodeRef.current) {
          s.vx = (Number.isFinite(s.vx) ? s.vx : 0) + fx + perpX * torqueForce;
          s.vy = (Number.isFinite(s.vy) ? s.vy : 0) + fy + perpY * torqueForce;
        }
        if (t !== dragNodeRef.current) {
          t.vx = (Number.isFinite(t.vx) ? t.vx : 0) - fx - perpX * torqueForce;
          t.vy = (Number.isFinite(t.vy) ? t.vy : 0) - fy - perpY * torqueForce;
        }
      }
    }

    // 3. Node-to-Edge Obstacle Avoidance (prevents lines from cutting through other nodes)
    const minObstacleLenSq = targetSpacing * targetSpacing * 1.2;
    for (const link of currentLinks) {
      const s = nodeMap.get(link.source);
      const t = nodeMap.get(link.target);
      if (!s || !t || !Number.isFinite(s.x) || !Number.isFinite(s.y) || !Number.isFinite(t.x) || !Number.isFinite(t.y)) continue;

      const segDx = t.x - s.x;
      const segDy = t.y - s.y;
      const segLenSq = segDx * segDx + segDy * segDy;
      if (segLenSq < minObstacleLenSq) continue;

      const margin = 48;
      const minX = Math.min(s.x, t.x) - margin;
      const maxX = Math.max(s.x, t.x) + margin;
      const minY = Math.min(s.y, t.y) - margin;
      const maxY = Math.max(s.y, t.y) + margin;

      for (let i = 0; i < visibleNodes.length; i++) {
        const n = visibleNodes[i];
        if (n.id === link.source || n.id === link.target) continue;
        if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
        if (n.x < minX || n.x > maxX || n.y < minY || n.y > maxY) continue;

        // Project node N onto segment S -> T
        const proj = ((n.x - s.x) * segDx + (n.y - s.y) * segDy) / segLenSq;
        if (proj < 0.04 || proj > 0.96) continue;

        const closeX = s.x + proj * segDx;
        const closeY = s.y + proj * segDy;

        let diffX = n.x - closeX;
        let diffY = n.y - closeY;

        if (Math.abs(diffX) < 0.05 && Math.abs(diffY) < 0.05) {
          const segLen = Math.sqrt(segLenSq) || 1;
          const perpX = -segDy / segLen;
          const perpY = segDx / segLen;
          const side = hashStringToUnit(n.id + link.source + link.target) > 0.5 ? 1 : -1;
          diffX = perpX * side * 2;
          diffY = perpY * side * 2;
        }

        const distSq = diffX * diffX + diffY * diffY;
        const minClearance = (n.radius || 6) + 36;
        const minClearanceSq = minClearance * minClearance;

        if (distSq < minClearanceSq) {
          const dist = Math.sqrt(distSq + 1.0);
          const overlap = (minClearance - dist) / minClearance;
          const forceMag = overlap * overlap * 16.0 * currentAlpha;

          const fx = (diffX / dist) * forceMag;
          const fy = (diffY / dist) * forceMag;

          if (n !== dragNodeRef.current) {
            n.vx = (Number.isFinite(n.vx) ? n.vx : 0) + fx;
            n.vy = (Number.isFinite(n.vy) ? n.vy : 0) + fy;
          }

          if (s !== dragNodeRef.current) {
            s.vx = (Number.isFinite(s.vx) ? s.vx : 0) - fx * (1 - proj) * 0.4;
            s.vy = (Number.isFinite(s.vy) ? s.vy : 0) - fy * (1 - proj) * 0.4;
          }
          if (t !== dragNodeRef.current) {
            t.vx = (Number.isFinite(t.vx) ? t.vx : 0) - fx * proj * 0.4;
            t.vy = (Number.isFinite(t.vy) ? t.vy : 0) - fy * proj * 0.4;
          }
        }
      }
    }

    // 4. Centroid Auto-Centering & Uniform Clumping on All Sides (Zero Empty Gaps)
    let sumX = 0;
    let sumY = 0;
    let validCount = 0;
    for (let i = 0; i < visibleNodes.length; i++) {
      const node = visibleNodes[i];
      if (Number.isFinite(node.x) && Number.isFinite(node.y)) {
        sumX += node.x;
        sumY += node.y;
        validCount++;
      }
    }
    const centroidX = validCount > 0 ? sumX / validCount : 0;
    const centroidY = validCount > 0 ? sumY / validCount : 0;
    const centroidCorrectionX = (0 - centroidX) * 0.03 * currentAlpha;
    const centroidCorrectionY = (0 - centroidY) * 0.03 * currentAlpha;

    // Natural compact cluster radius (scales with ~160px node spacing)
    const clusterRadius = 90 + Math.sqrt(visibleNodes.length) * 80;

    for (let i = 0; i < visibleNodes.length; i++) {
      const n = visibleNodes[i];
      if (n === dragNodeRef.current) continue;
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;

      const dxCent = n.x - centroidX;
      const dyCent = n.y - centroidY;
      const distCentSq = dxCent * dxCent + dyCent * dyCent;
      const distCent = Math.sqrt(distCentSq + 0.001);

      // 4a. Inward Centripetal Pressure: gently compresses all nodes together so they fill internal gaps
      const inwardPressure = Math.min(3.5, distCent * 0.0025) * currentAlpha;
      n.vx -= (dxCent / distCent) * inwardPressure;
      n.vy -= (dyCent / distCent) * inwardPressure;

      // 4b. Cluster boundary clamp: strong pull if dropped or pushed far away
      if (distCent > clusterRadius) {
        const excess = distCent - clusterRadius;
        const pullMag = (excess * 0.055 + Math.min(14.0, Math.pow(excess / 45, 1.35) * 0.6)) * currentAlpha;
        n.vx -= (dxCent / distCent) * pullMag;
        n.vy -= (dyCent / distCent) * pullMag;
      }

      // 4c. Nearest-Neighbor Multi-Side Gap-Closing (KNN Cohesion - Zero Allocation Top 3)
      // Pulls towards closest 2-3 neighbors to fill any empty gaps and ensure even spacing on all sides
      if (visibleNodes.length > 1) {
        let d1 = Infinity, dx1 = 0, dy1 = 0;
        let d2 = Infinity, dx2 = 0, dy2 = 0;
        let d3 = Infinity, dx3 = 0, dy3 = 0;

        for (let j = 0; j < visibleNodes.length; j++) {
          if (i === j) continue;
          const other = visibleNodes[j];
          if (!Number.isFinite(other.x) || !Number.isFinite(other.y)) continue;
          const dxx = other.x - n.x;
          const dyy = other.y - n.y;
          const dSq = dxx * dxx + dyy * dyy;

          if (dSq < d1) {
            d3 = d2; dx3 = dx2; dy3 = dy2;
            d2 = d1; dx2 = dx1; dy2 = dy1;
            d1 = dSq; dx1 = dxx; dy1 = dyy;
          } else if (dSq < d2) {
            d3 = d2; dx3 = dx2; dy3 = dy2;
            d2 = dSq; dx2 = dxx; dy2 = dyy;
          } else if (dSq < d3) {
            d3 = dSq; dx3 = dxx; dy3 = dyy;
          }
        }

        const maxGap = targetSpacing * 1.35; // ~215px max gap
        const maxGapSq = maxGap * maxGap;
        let countToCheck = 0;
        if (d1 !== Infinity) countToCheck++;
        if (d2 !== Infinity) countToCheck++;
        if (d3 !== Infinity) countToCheck++;

        if (countToCheck > 0) {
          if (d1 !== Infinity && d1 > maxGapSq) {
            const dist1 = Math.sqrt(d1);
            const excess = dist1 - maxGap;
            const pull = (excess * 0.045 + Math.min(9.0, Math.pow(excess / 35, 1.35) * 0.5)) * currentAlpha;
            n.vx += (dx1 / dist1) * (pull / countToCheck);
            n.vy += (dy1 / dist1) * (pull / countToCheck);
          }
          if (d2 !== Infinity && d2 > maxGapSq) {
            const dist2 = Math.sqrt(d2);
            const excess = dist2 - maxGap;
            const pull = (excess * 0.045 + Math.min(9.0, Math.pow(excess / 35, 1.35) * 0.5)) * currentAlpha;
            n.vx += (dx2 / dist2) * (pull / countToCheck);
            n.vy += (dy2 / dist2) * (pull / countToCheck);
          }
          if (d3 !== Infinity && d3 > maxGapSq) {
            const dist3 = Math.sqrt(d3);
            const excess = dist3 - maxGap;
            const pull = (excess * 0.045 + Math.min(9.0, Math.pow(excess / 35, 1.35) * 0.5)) * currentAlpha;
            n.vx += (dx3 / dist3) * (pull / countToCheck);
            n.vy += (dy3 / dist3) * (pull / countToCheck);
          }
        }
      }
    }

    // 5. Velocity Integration, Inertia Damping & Velvety Eased Flotation
    const softCenterGravity = isTimelapseActiveRef.current ? 0.0008 : (customCenterGravity * 0.007);
    const friction = 0.85; // Natural smooth inertia
    const maxSpeed = 14.0; // Brisk takeoff speed

    for (let i = 0; i < visibleNodes.length; i++) {
      const node = visibleNodes[i];
      if (node === dragNodeRef.current) continue;
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;

      if (!Number.isFinite(node.vx)) node.vx = 0;
      if (!Number.isFinite(node.vy)) node.vy = 0;

      // Soft center gravity towards (0, 0)
      node.vx += (0 - node.x) * softCenterGravity * currentAlpha;
      node.vy += (0 - node.y) * softCenterGravity * currentAlpha;

      // Group centroid balancing
      node.vx += centroidCorrectionX;
      node.vy += centroidCorrectionY;

      // Fluid deceleration easing
      const speedSq = node.vx * node.vx + node.vy * node.vy;
      const speed = Math.sqrt(speedSq);
      const easeDamping = speed > 1.5 ? 1.0 - Math.min(0.08, (speed - 1.5) * 0.009) : 1.0;

      node.vx *= friction * easeDamping;
      node.vy *= friction * easeDamping;

      // Float Mode & Timelapse Zero-Gravity Motion: Nodes gently float and move organically around themselves
      if ((isFloatActiveRef.current || isTimelapseActiveRef.current) && !isTimelapsePausedRef.current) {
        const perfNow = performance.now();
        const floatElapsed = Math.max(0, perfNow - floatStartTimeRef.current);
        // Smoothstep acceleration curve from 0.15 (slow) to 1.0 (normal) over 1.4 seconds
        const rawT = isTimelapseActiveRef.current ? 1.0 : Math.min(1.0, floatElapsed / 1400);
        const floatRamp = rawT * rawT * (3 - 2 * rawT);
        const speedScale = 0.15 + 0.85 * floatRamp;

        const phaseX = node.floatPhaseX ?? (hashStringToUnit(node.id + ':floatX') * Math.PI * 2);
        const phaseY = node.floatPhaseY ?? (hashStringToUnit(node.id + ':floatY') * Math.PI * 2);
        const freq = node.floatFreq ?? (0.00065 + (hashStringToUnit(node.id + ':freq') - 0.5) * 0.00025);

        const waveX = (Math.sin(perfNow * freq + phaseX) * 0.18 + Math.cos(perfNow * freq * 1.5 + phaseY) * 0.09) * speedScale;
        const waveY = (Math.cos(perfNow * freq + phaseY) * 0.18 + Math.sin(perfNow * freq * 1.3 + phaseX) * 0.09) * speedScale;

        node.vx += waveX;
        node.vy += waveY;
      }

      // Time-lapse Guided Organic Trajectory: Smooth laminar flow towards pre-timelapse locations
      if (isTimelapseActiveRef.current && !isTimelapsePausedRef.current) {
        const targetPos = preTimelapseLayoutRef.current.get(node.id);
        if (targetPos && Number.isFinite(targetPos.x) && Number.isFinite(targetPos.y)) {
          const dx = targetPos.x - node.x;
          const dy = targetPos.y - node.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq + 0.001);
          const progress = Math.min(1.0, visibleNodes.length / Math.max(1, currentNodes.length));

          // Progressive laminar attractor: starts very soft (0.005) so center pop repulsion pushes freely,
          // then smoothly eases (0.030) as graph matures, guiding nodes into their exact pre-timelapse positions
          const homingK = (0.005 + Math.pow(progress, 2.0) * 0.028) * currentAlpha;
          const pullMag = Math.min(6.5, dist * homingK);
          if (dist > 0.05) {
            node.vx += (dx / dist) * pullMag;
            node.vy += (dy / dist) * pullMag;
          }
        }
      }

      // Speed limit clamp
      if (speed > maxSpeed) {
        node.vx = (node.vx / speed) * maxSpeed;
        node.vy = (node.vy / speed) * maxSpeed;
      }

      // Dynamic position step
      node.x += node.vx;
      node.y += node.vy;
    }

    if (isTimelapseActiveRef.current && !isTimelapsePausedRef.current && graphFocusCameraRef.current) {
      updateTimelapseFocusCamera(timelapseStepRef.current);
    } else if (isFloatActiveRef.current && graphFocusCameraRef.current && !dragNodeRef.current && !isDraggingRef.current) {
      centerGraph(nodesRef.current);
    }

    // Cooling curve: smooth settling and floaty sleep
    if (!dragNodeRef.current) {
      if (isFloatActiveRef.current) {
        const perfNow = performance.now();
        const floatElapsed = Math.max(0, perfNow - floatStartTimeRef.current);
        const rawT = Math.min(1.0, floatElapsed / 1400);
        const floatRamp = rawT * rawT * (3 - 2 * rawT);
        const targetMinAlpha = 0.06 + 0.12 * floatRamp;
        alphaRef.current = Math.max(alphaRef.current * 0.992, targetMinAlpha);
      } else {
        alphaRef.current *= isTimelapseActiveRef.current ? 0.985 : 0.978;
        if (alphaRef.current < 0.002) {
          alphaRef.current = 0;
          if (!isTimelapseActiveRef.current) {
            persistPositions();
          }
        }
      }
    } else {
      alphaRef.current = Math.max(alphaRef.current, 0.38);
    }
  }, [persistPositions, updateTimelapseFocusCamera, centerGraph]);

  // Render Loop
  const render = useCallback(() => {
    animFrameRef.current = null;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      stepPhysics();

      const dpr = window.devicePixelRatio || 1;
      const target = targetTransformRef.current;
      const current = currentTransformRef.current;

      let isLerping = false;

      // 1. Inertial Pan Momentum & Drift Physics (Lighter, silkier drift glide)
      const pVel = panVelocityRef.current;
      const panSpeed = Math.hypot(pVel.vx, pVel.vy);
      if (panSpeed > 0.04) {
        target.x += pVel.vx;
        target.y += pVel.vy;
        current.x += pVel.vx;
        current.y += pVel.vy;
        // Lighter exponential friction deceleration (0.952 for airy, fluid coasting)
        pVel.vx *= 0.952;
        pVel.vy *= 0.952;
        isLerping = true;
      } else if (panSpeed > 0) {
        panVelocityRef.current = { vx: 0, vy: 0 };
        persistTransform();
      }

      // 2. Camera Zoom & Pan Easing (Cinematic velvety easing during focus camera time-lapse)
      const easeFactor =
        isDraggingRef.current || dragNodeRef.current
          ? 1.0
          : isTimelapseActiveRef.current && graphFocusCameraRef.current
          ? 0.095
          : 0.16;

      const diffScale = target.scale - current.scale;
      const diffX = target.x - current.x;
      const diffY = target.y - current.y;

      if (Math.abs(diffScale) > 0.0002 || Math.abs(diffX) > 0.03 || Math.abs(diffY) > 0.03) {
        current.scale += diffScale * easeFactor;
        current.x += diffX * easeFactor;
        current.y += diffY * easeFactor;
        isLerping = true;
      } else {
        current.scale = target.scale;
        current.x = target.x;
        current.y = target.y;
      }

      const safeScale = Number.isFinite(current.scale) && current.scale > 0 ? current.scale : 1;
      const safeX = Number.isFinite(current.x) ? current.x : 0;
      const safeY = Number.isFinite(current.y) ? current.y : 0;

      const currentNodes = nodesRef.current;
      const currentLinks = linksRef.current;

      const visibleCount = isTimelapseActiveRef.current ? timelapseStepRef.current : currentNodes.length;
      const visibleNodes = currentNodes.slice(0, visibleCount);

      const visibleNodeIds = visibleNodeIdsRef.current;
      visibleNodeIds.clear();
      const nodeMap = nodeMapRef.current;
      nodeMap.clear();
      for (let i = 0; i < visibleNodes.length; i++) {
        const n = visibleNodes[i];
        visibleNodeIds.add(n.id);
        nodeMap.set(n.id, n);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Retina crisp scaling with strict numeric safety
      ctx.scale(dpr, dpr);
      ctx.translate(safeX, safeY);
      ctx.scale(safeScale, safeScale);

      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Graph-space viewport bounds for high-performance offscreen culling
      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;
      const viewLeft = -safeX / safeScale;
      const viewTop = -safeY / safeScale;
      const viewRight = viewLeft + viewW / safeScale;
      const viewBottom = viewTop + viewH / safeScale;
      const cullMargin = 60; // Cushion so node circles & text don't pop abruptly

      // Zoom-Aware Text Opacity: Smoothly starts fading earlier (1.12 scale down to 0.52 baseline cutoff)
      const zoomTextOpacity = Math.min(1, Math.max(0, (safeScale - 0.52) / 0.60));

      const currentHovered = hoveredNodeRef.current;
      const isAnyHovered = !!currentHovered;
      const connectedNodeIds = connectedNodeIdsRef.current;
      const lerpSpeed = 0.12;

      // 1. Draw Links
      const nonHoveredLinks: { link: GraphLink; s: GraphNode; t: GraphNode }[] = [];
      const activeHoveredLinks: { link: GraphLink; s: GraphNode; t: GraphNode }[] = [];

      for (const link of currentLinks) {
        if (!link || !visibleNodeIds.has(link.source) || !visibleNodeIds.has(link.target)) continue;
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (s && t && Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(t.x) && Number.isFinite(t.y)) {
          // Offscreen link culling: skip if both endpoints are outside the viewport on the same side
          if (
            (s.x < viewLeft - cullMargin && t.x < viewLeft - cullMargin) ||
            (s.x > viewRight + cullMargin && t.x > viewRight + cullMargin) ||
            (s.y < viewTop - cullMargin && t.y < viewTop - cullMargin) ||
            (s.y > viewBottom + cullMargin && t.y > viewBottom + cullMargin)
          ) {
            continue;
          }

          const isFilterActive = filterText.trim() !== '';
          const sMatch = !isFilterActive || (s.title || '').toLowerCase().includes(filterText.toLowerCase());
          const tMatch = !isFilterActive || (t.title || '').toLowerCase().includes(filterText.toLowerCase());
          const isLinkFilteredOut = isFilterActive && (!sMatch || !tMatch);

          const isConnectedToHovered =
            isAnyHovered && currentHovered && (link.source === currentHovered.id || link.target === currentHovered.id);

          if (isConnectedToHovered && currentHovered) {
            link.hoverOriginId = currentHovered.id;
          }

          const targetLinkHover = isConnectedToHovered ? 1 : 0;
          const targetLinkDim = (isAnyHovered && !isConnectedToHovered) || isLinkFilteredOut ? 1 : 0;
          const curLinkHover = link.hoverAlpha ?? 0;
          const curLinkDim = link.dimAlpha ?? 0;

          link.hoverAlpha = curLinkHover + (targetLinkHover - curLinkHover) * lerpSpeed;
          link.dimAlpha = curLinkDim + (targetLinkDim - curLinkDim) * lerpSpeed;

          if (Math.abs(targetLinkHover - link.hoverAlpha) < 0.002) link.hoverAlpha = targetLinkHover;
          if (Math.abs(targetLinkDim - link.dimAlpha) < 0.002) link.dimAlpha = targetLinkDim;

          if (link.hoverAlpha < 0.002) {
            link.hoverOriginId = undefined;
          }

          if (
            Math.abs(targetLinkHover - link.hoverAlpha) > 0.001 ||
            Math.abs(targetLinkDim - link.dimAlpha) > 0.001
          ) {
            isLerping = true;
          }

          const item = { link, s, t };
          if ((link.hoverAlpha ?? 0) > 0.005) {
            activeHoveredLinks.push(item);
          }
          if ((link.hoverAlpha ?? 0) < 0.99) {
            nonHoveredLinks.push(item);
          }
        }
      }

      // Layer 1: Draw Background / Passive Links (Batched into <= 2 draw calls for 2,000x faster rendering)
      const linkThicknessMult = useGraphSettings.getState().linkThickness || 1.0;
      ctx.lineWidth = 1 * linkThicknessMult;

      if (!isAnyHovered && filterText.trim() === '') {
        // Fast-path: 100% of passive links share identical style -> Single draw call!
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(110, 115, 125, 0.450)';
        for (let i = 0; i < nonHoveredLinks.length; i++) {
          const { s, t } = nonHoveredLinks[i];
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
        }
        ctx.stroke();
      } else {
        // Group into normal and dimmed buckets
        const normalBatch: { s: GraphNode; t: GraphNode }[] = [];
        const dimmedBatch: { s: GraphNode; t: GraphNode }[] = [];

        for (let i = 0; i < nonHoveredLinks.length; i++) {
          const item = nonHoveredLinks[i];
          const da = item.link.dimAlpha ?? 0;
          if (da > 0.5) {
            dimmedBatch.push(item);
          } else {
            normalBatch.push(item);
          }
        }

        if (normalBatch.length > 0) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(110, 115, 125, 0.450)';
          for (let i = 0; i < normalBatch.length; i++) {
            const { s, t } = normalBatch[i];
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(t.x, t.y);
          }
          ctx.stroke();
        }

        if (dimmedBatch.length > 0) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(65, 65, 70, 0.180)';
          for (let i = 0; i < dimmedBatch.length; i++) {
            const { s, t } = dimmedBatch[i];
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(t.x, t.y);
          }
          ctx.stroke();
        }
      }

      // Layer 2: Draw Active Connector Lines (drawn below nodes so node circles cleanly cap line endpoints)
      for (const { link, s, t } of activeHoveredLinks) {
        const ha = link.hoverAlpha ?? 0;
        if (ha <= 0.005) continue;

        const isSourceOrigin = (link.hoverOriginId || (currentHovered && link.source === currentHovered.id ? link.source : '')) === link.source;
        const fromNode = isSourceOrigin ? s : t;
        const toNode = isSourceOrigin ? t : s;

        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const dist = Math.hypot(dx, dy);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);

        if (dist > 1) {
          const grad = ctx.createLinearGradient(fromNode.x, fromNode.y, toNode.x, toNode.y);

          // White gradient that smoothly fades into view over other links with ha alpha
          const startA = 0.95 * ha;
          grad.addColorStop(0, `rgba(255, 255, 255, ${startA.toFixed(3)})`);

          // Fades out to normal node colour (156, 163, 175)
          const endR = Math.round(110 * (1 - ha) + 156 * ha);
          const endG = Math.round(115 * (1 - ha) + 163 * ha);
          const endB = Math.round(125 * (1 - ha) + 175 * ha);
          const endA = 0.55 * ha;
          grad.addColorStop(1, `rgba(${endR}, ${endG}, ${endB}, ${endA.toFixed(3)})`);

          ctx.strokeStyle = grad;
        } else {
          ctx.strokeStyle = `rgba(255, 255, 255, ${(0.95 * ha).toFixed(3)})`;
        }

        const activeLinkThicknessMult = useGraphSettings.getState().linkThickness || 1.0;
        ctx.lineWidth = (1 + 0.6 * ha) * activeLinkThicknessMult;
        ctx.stroke();
      }

      // Group nodes into passive background nodes, connected neighbor nodes, and hovered node
      const passiveNodes: GraphNode[] = [];
      const connectedNeighborNodes: GraphNode[] = [];
      let hoveredNode: GraphNode | null = null;

      for (let i = 0; i < visibleNodes.length; i++) {
        const node = visibleNodes[i];
        if (currentHovered && node.id === currentHovered.id) {
          hoveredNode = node;
        } else if (connectedNodeIds && connectedNodeIds.has(node.id) && isAnyHovered) {
          connectedNeighborNodes.push(node);
        } else {
          passiveNodes.push(node);
        }
      }

      // Node Renderer Helper with Viewport Culling & Zoom-Aware Text Fading
      const renderNode = (node: GraphNode) => {
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

        // Viewport Culling: Skip nodes completely outside the screen
        if (
          node.x < viewLeft - cullMargin ||
          node.x > viewRight + cullMargin ||
          node.y < viewTop - cullMargin ||
          node.y > viewBottom + cullMargin
        ) {
          return;
        }

        if (!isTimelapsePausedRef.current) {
          if (node.popAlpha !== undefined && node.popAlpha < 0.99) {
            node.popAlpha += (1 - node.popAlpha) * 0.16;
            isLerping = true;
          } else {
            node.popAlpha = 1;
          }

          if (node.popScale !== undefined && node.popScale < 0.99) {
            node.popScale += (1 - node.popScale) * 0.18;
            isLerping = true;
          } else {
            node.popScale = 1;
          }
        }

        const isFilterActive = filterText.trim() !== '';
        const isMatch =
          !isFilterActive ||
          (node.title || '').toLowerCase().includes(filterText.toLowerCase());

        const isHovered = currentHovered?.id === node.id;
        const isConnected = connectedNodeIds ? connectedNodeIds.has(node.id) : false;

        const targetHover = isHovered ? 1 : 0;
        const targetConnect = !isHovered && isConnected && isAnyHovered ? 1 : 0;
        const targetDim =
          (isAnyHovered && !isHovered && !isConnected) ||
          (isFilterActive && !isMatch)
            ? 1
            : 0;
        const defaultTextOffset = 13;

        const curHoverAlpha = node.hoverAlpha ?? 0;
        const curConnectAlpha = node.connectAlpha ?? 0;
        const curDimAlpha = node.dimAlpha ?? 0;

        node.hoverAlpha = curHoverAlpha + (targetHover - curHoverAlpha) * lerpSpeed;
        node.connectAlpha = curConnectAlpha + (targetConnect - curConnectAlpha) * lerpSpeed;
        node.dimAlpha = curDimAlpha + (targetDim - curDimAlpha) * lerpSpeed;

        if (Math.abs(targetHover - node.hoverAlpha) < 0.002) node.hoverAlpha = targetHover;
        if (Math.abs(targetConnect - node.connectAlpha) < 0.002) node.connectAlpha = targetConnect;
        if (Math.abs(targetDim - node.dimAlpha) < 0.002) node.dimAlpha = targetDim;

        if (
          Math.abs(targetHover - node.hoverAlpha) > 0.001 ||
          Math.abs(targetConnect - node.connectAlpha) > 0.001 ||
          Math.abs(targetDim - node.dimAlpha) > 0.001
        ) {
          isLerping = true;
        }

        const baseR = isFilterActive && isMatch ? 235 : 156;
        const baseG = isFilterActive && isMatch ? 240 : 163;
        const baseB = isFilterActive && isMatch ? 255 : 175;

        // Clean transition to pure white (255, 255, 255) on hover or bright search match
        const nr = Math.min(255, Math.max(0, Math.round(baseR * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 255 * node.hoverAlpha + 45 * node.dimAlpha)));
        const ng = Math.min(255, Math.max(0, Math.round(baseG * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 255 * node.hoverAlpha + 45 * node.dimAlpha)));
        const nb = Math.min(255, Math.max(0, Math.round(baseB * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 255 * node.hoverAlpha + 45 * node.dimAlpha)));

        // Constant radius scaled by nodeSize setting (exact constant size, no enlargement on hover)
        const nodeSizeMult = useGraphSettings.getState().nodeSize || 1.0;
        const radius = Math.max(3.5, (node.radius || 5.5) * (node.popScale || 1) * nodeSizeMult);
        const nodeAlpha = Number.isFinite(node.popAlpha) && node.popAlpha! > 0.05 ? node.popAlpha! : 1;

        // Glowing outline for search matched nodes
        if (isFilterActive && isMatch) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(${nr}, ${ng}, ${nb}, ${nodeAlpha.toFixed(3)})`;
        ctx.fill();

        // Node Label: smoothly fades opacity when zooming out until invisible, but stays fully visible when hovered or search matched
        const showLabelsSetting = useGraphSettings.getState().showLabels;
        const isPriorityLabel = (isFilterActive && isMatch) || isHovered || (isConnected && isAnyHovered);
        const labelAlpha = isPriorityLabel ? nodeAlpha : nodeAlpha * zoomTextOpacity;
        const isHighDensity = visibleNodes.length > 250;
        const shouldRenderLabel = showLabelsSetting && labelAlpha > 0.01 && (!isHighDensity || isPriorityLabel || safeScale >= 0.75);

        if (shouldRenderLabel) {
          ctx.font = isFilterActive && isMatch
            ? '600 11.5px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            : '11px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

          const tr = Math.min(255, Math.max(0, Math.round(220 * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 255 * node.hoverAlpha + 60 * node.dimAlpha)));
          const tg = Math.min(255, Math.max(0, Math.round(221 * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 255 * node.hoverAlpha + 60 * node.dimAlpha)));
          const tb = Math.min(255, Math.max(0, Math.round(222 * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 255 * node.hoverAlpha + 60 * node.dimAlpha)));

          ctx.fillStyle = isFilterActive && isMatch ? `rgba(255, 255, 255, ${labelAlpha.toFixed(3)})` : `rgba(${tr}, ${tg}, ${tb}, ${labelAlpha.toFixed(3)})`;
          ctx.textAlign = 'center';
          const displayTitle = node.displayTitle || (node.title?.includes('/') ? node.title.split('/').pop() || node.title : node.title || 'Untitled');
          ctx.fillText(displayTitle, node.x, node.y + radius + defaultTextOffset);
        }
      };

      // Layer 3: Draw Passive/Background Nodes
      for (const node of passiveNodes) {
        renderNode(node);
      }

      // Layer 4: Draw Connected Neighbor Nodes (cleanly capping the connector line ends)
      for (const node of connectedNeighborNodes) {
        renderNode(node);
      }

      // Layer 5: Draw Hovered Node on the very top
      if (hoveredNode) {
        renderNode(hoveredNode);
      }

      ctx.restore();

      // Only request next frame if physics active, float mode running, dragging, timelapse running, or transform/color lerping
      if (
        (!isTimelapsePausedRef.current && (alphaRef.current > 0.002 || isFloatActiveRef.current)) ||
        isDraggingRef.current ||
        dragNodeRef.current !== null ||
        (isTimelapseActiveRef.current && !isTimelapsePausedRef.current) ||
        isLerping
      ) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    } catch (err) {
      console.error('[Flint Graph] Error during render:', err);
    }
  }, [filterText, stepPhysics]);

  // Expose starter
  startAnimationRef.current = () => {
    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(render);
    }
  };

  const startAnimation = useCallback(() => {
    startAnimationRef.current();
  }, []);

  // Helper to clear all active timelapse timers
  const clearTimelapseTimers = useCallback(() => {
    if (timelapseTimerRef.current) {
      clearInterval(timelapseTimerRef.current);
      timelapseTimerRef.current = null;
    }
    if (timelapseEndTimerRef.current) {
      clearTimeout(timelapseEndTimerRef.current);
      timelapseEndTimerRef.current = null;
    }
  }, []);

  // Spawns a node in a random position within an invisible circle in the center.
  // Initial velocity is 0 (does NOT fly off) — its presence & repulsion naturally push nearby nodes outward.
  const spawnTimelapseNode = useCallback((idx: number) => {
    const currentNodes = nodesRef.current;
    if (idx < 0 || idx >= currentNodes.length) return;
    const node = currentNodes[idx];
    if (!node) return;

    if (idx === 0) {
      node.x = 0;
      node.y = 0;
      node.popScale = 1;
      node.popAlpha = 1;
      node.vx = 0;
      node.vy = 0;
      return;
    }

    // Calculate cluster centroid of currently visible nodes
    let sumX = 0;
    let sumY = 0;
    let validCount = 0;
    for (let i = 0; i < idx; i++) {
      const vn = currentNodes[i];
      if (Number.isFinite(vn.x) && Number.isFinite(vn.y)) {
        sumX += vn.x;
        sumY += vn.y;
        validCount++;
      }
    }
    const centroidX = validCount > 0 ? sumX / validCount : 0;
    const centroidY = validCount > 0 ? sumY / validCount : 0;

    // Spawn at a random position inside an invisible circle at the center (radius ~32px)
    const spawnRadius = 32;
    const randAngle = hashStringToUnit(node.id + ':tAngle') * Math.PI * 2;
    const randR = Math.sqrt(hashStringToUnit(node.id + ':tRadius')) * spawnRadius;

    node.x = centroidX + Math.cos(randAngle) * randR;
    node.y = centroidY + Math.sin(randAngle) * randR;

    // ZERO initial launch velocity: does NOT fly off!
    node.vx = 0;
    node.vy = 0;

    node.popScale = 0.05;
    node.popAlpha = 0.2;
  }, []);

  // Timelapse Player: Start from beginning
  const startTimelapse = useCallback(() => {
    if (nodesRef.current.length === 0) return;
    clearTimelapseTimers();

    // Capture exact pre-timelapse layout snapshot
    preTimelapseLayoutRef.current.clear();
    for (const n of nodesRef.current) {
      if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
        preTimelapseLayoutRef.current.set(n.id, { x: n.x, y: n.y });
      }
    }

    setIsTimelapseActive(true);
    setIsTimelapsePaused(false);
    isTimelapseActiveRef.current = true;
    isTimelapsePausedRef.current = false;
    timelapseStepRef.current = 1;

    // Reset physics pop scales and velocities
    nodesRef.current.forEach((n, idx) => {
      delete (n as any)._savedVx;
      delete (n as any)._savedVy;
      n.popScale = idx === 0 ? 1 : 0.01;
      n.popAlpha = idx === 0 ? 1 : 0.01;
      n.vx = 0;
      n.vy = 0;
    });

    if (graphFocusCameraRef.current) {
      updateTimelapseFocusCamera(1, false);
    }

    alphaRef.current = 0.8;
    startAnimation();

    const speed = 120;
    timelapseTimerRef.current = setInterval(() => {
      const nextIdx = timelapseStepRef.current;
      if (nextIdx < nodesRef.current.length) {
        spawnTimelapseNode(nextIdx);
      }
      timelapseStepRef.current += 1;
      if (graphFocusCameraRef.current) {
        updateTimelapseFocusCamera(timelapseStepRef.current);
      }
      alphaRef.current = Math.max(alphaRef.current, 0.45);
      startAnimation();

      if (timelapseStepRef.current >= nodesRef.current.length) {
        if (timelapseTimerRef.current) {
          clearInterval(timelapseTimerRef.current);
          timelapseTimerRef.current = null;
        }
        timelapseEndTimerRef.current = setTimeout(() => {
          setIsTimelapseActive(false);
          setIsTimelapsePaused(false);
          isTimelapseActiveRef.current = false;
          isTimelapsePausedRef.current = false;
          nodesRef.current.forEach((n) => {
            n.popScale = 1;
            n.popAlpha = 1;
          });
          if (graphFocusCameraRef.current) {
            centerGraph(nodesRef.current);
          }
          alphaRef.current = 0.15;
          startAnimation();
        }, 1200);
      }
    }, speed);
  }, [clearTimelapseTimers, spawnTimelapseNode, updateTimelapseFocusCamera, centerGraph, startAnimation]);

  // Timelapse Player: Pause EXACTLY as it is (freeze all motion, physics, and pop transitions)
  const pauseTimelapse = useCallback(() => {
    clearTimelapseTimers();
    savedTimelapseAlphaRef.current = alphaRef.current;
    setIsTimelapsePaused(true);
    isTimelapsePausedRef.current = true;

    // Freeze all node velocities completely so no physics can occur
    nodesRef.current.forEach((n) => {
      (n as any)._savedVx = n.vx;
      (n as any)._savedVy = n.vy;
      n.vx = 0;
      n.vy = 0;
    });

    alphaRef.current = 0;
    startAnimation();
  }, [clearTimelapseTimers, startAnimation]);

  // Timelapse Player: Resume from paused state
  const resumeTimelapse = useCallback(() => {
    clearTimelapseTimers();
    setIsTimelapsePaused(false);
    isTimelapsePausedRef.current = false;

    // Restore saved node velocities
    nodesRef.current.forEach((n) => {
      if ((n as any)._savedVx !== undefined) {
        n.vx = (n as any)._savedVx;
        n.vy = (n as any)._savedVy;
        delete (n as any)._savedVx;
        delete (n as any)._savedVy;
      }
    });

    if (graphFocusCameraRef.current) {
      updateTimelapseFocusCamera(timelapseStepRef.current);
    }

    alphaRef.current = Math.max(0.45, savedTimelapseAlphaRef.current || 0.45);
    startAnimation();

    // If already at or beyond max nodes, conclude smoothly
    if (timelapseStepRef.current >= nodesRef.current.length) {
      timelapseEndTimerRef.current = setTimeout(() => {
        setIsTimelapseActive(false);
        setIsTimelapsePaused(false);
        isTimelapseActiveRef.current = false;
        isTimelapsePausedRef.current = false;
        nodesRef.current.forEach((n) => {
          const targetPos = preTimelapseLayoutRef.current.get(n.id);
          if (targetPos) {
            n.x = targetPos.x;
            n.y = targetPos.y;
          }
          n.vx = 0;
          n.vy = 0;
          n.popScale = 1;
          n.popAlpha = 1;
        });
        if (graphFocusCameraRef.current) {
          centerGraph(nodesRef.current);
        }
        alphaRef.current = 0.2;
        startAnimation();
      }, 500);
      return;
    }

    const speed = Math.max(20, useGraphSettings.getState().timelapseSpeed || 120);
    timelapseTimerRef.current = setInterval(() => {
      const nextIdx = timelapseStepRef.current;
      if (nextIdx < nodesRef.current.length) {
        spawnTimelapseNode(nextIdx);
      }
      timelapseStepRef.current += 1;
      if (graphFocusCameraRef.current) {
        updateTimelapseFocusCamera(timelapseStepRef.current);
      }
      alphaRef.current = Math.max(alphaRef.current, 0.45);
      startAnimation();

      if (timelapseStepRef.current >= nodesRef.current.length) {
        if (timelapseTimerRef.current) {
          clearInterval(timelapseTimerRef.current);
          timelapseTimerRef.current = null;
        }
        timelapseEndTimerRef.current = setTimeout(() => {
          setIsTimelapseActive(false);
          setIsTimelapsePaused(false);
          isTimelapseActiveRef.current = false;
          isTimelapsePausedRef.current = false;
          nodesRef.current.forEach((n) => {
            n.popScale = 1;
            n.popAlpha = 1;
          });
          if (graphFocusCameraRef.current) {
            centerGraph(nodesRef.current);
          }
          alphaRef.current = 0.15;
          startAnimation();
        }, 1200);
      }
    }, speed);
  }, [clearTimelapseTimers, spawnTimelapseNode, updateTimelapseFocusCamera, centerGraph, startAnimation]);

  // Toggle Timelapse (Play / Pause / Resume)
  const handleToggleTimelapse = useCallback(() => {
    if (!isTimelapseActive) {
      startTimelapse();
    } else if (!isTimelapsePaused) {
      pauseTimelapse();
    } else {
      resumeTimelapse();
    }
  }, [isTimelapseActive, isTimelapsePaused, startTimelapse, pauseTimelapse, resumeTimelapse]);

  // Restore graph to full finished version & conclude timelapse
  const handleRestoreGraph = useCallback(() => {
    if (!isTimelapseActiveRef.current && !isTimelapseActive) return;

    clearTimelapseTimers();
    setIsTimelapseActive(false);
    setIsTimelapsePaused(false);
    isTimelapseActiveRef.current = false;
    isTimelapsePausedRef.current = false;
    timelapseStepRef.current = nodesRef.current.length;

    nodesRef.current.forEach((n) => {
      delete (n as any)._savedVx;
      delete (n as any)._savedVy;
      const targetPos = preTimelapseLayoutRef.current.get(n.id);
      if (targetPos) {
        n.x = targetPos.x;
        n.y = targetPos.y;
      }
      n.popScale = 1;
      n.popAlpha = 1;
      n.vx = 0;
      n.vy = 0;
    });

    if (graphFocusCameraRef.current) {
      centerGraph(nodesRef.current);
    }

    alphaRef.current = 0.35;
    startAnimation();
  }, [isTimelapseActive, clearTimelapseTimers, centerGraph, startAnimation]);

  // Search matches count
  const matchCount = useMemo(() => {
    if (!filterText.trim()) return 0;
    const lower = filterText.toLowerCase();
    return nodesRef.current.filter((n) => (n.title || '').toLowerCase().includes(lower)).length;
  }, [filterText]);

  // Center canvas on matched node when cycling with Enter
  const handleFocusNextMatch = useCallback(() => {
    if (!filterText.trim() || nodesRef.current.length === 0) return;
    const lower = filterText.toLowerCase();
    const matches = nodesRef.current.filter((n) =>
      (n.title || '').toLowerCase().includes(lower)
    );
    if (matches.length === 0) return;
    const nextIdx = (searchMatchIndexRef.current + 1) % matches.length;
    searchMatchIndexRef.current = nextIdx;
    const targetNode = matches[nextIdx];
    const canvas = canvasRef.current;
    if (canvas && Number.isFinite(targetNode.x) && Number.isFinite(targetNode.y)) {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const currentScale = targetTransformRef.current.scale || 1;
      targetTransformRef.current = {
        x: width / 2 - targetNode.x * currentScale,
        y: height / 2 - targetNode.y * currentScale,
        scale: currentScale,
      };
      hoveredNodeRef.current = targetNode;
      const set = new Set<string>([targetNode.id]);
      for (const link of linksRef.current) {
        if (link.source === targetNode.id) set.add(link.target);
        if (link.target === targetNode.id) set.add(link.source);
      }
      connectedNodeIdsRef.current = set;
      startAnimation();
    }
  }, [filterText, startAnimation]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 30);
    }
  }, [isSearchOpen]);

  // Global Ctrl+F / Cmd+F, Escape, and Ctrl +/- Zoom keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearchOpen((prev) => {
          const next = !prev;
          if (!next) {
            setFilterText('');
            startAnimation();
          }
          return next;
        });
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.code === 'Equal' || e.code === 'NumpadAdd')) {
        if (isTimelapseActiveRef.current && graphFocusCameraRef.current) return;
        // Trackpad pinch simulation or Ctrl + Plus with easing
        e.preventDefault();
        e.stopPropagation();
        const canvas = canvasRef.current;
        const rect = canvas?.getBoundingClientRect() || { width: 800, height: 600, left: 0, top: 0 };
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const currentScale = targetTransformRef.current.scale || 1;
        const newScale = Math.min(4.0, currentScale * 1.25);
        targetTransformRef.current = {
          x: centerX - ((centerX - targetTransformRef.current.x) * (newScale / currentScale)),
          y: centerY - ((centerY - targetTransformRef.current.y) * (newScale / currentScale)),
          scale: newScale,
        };
        persistTransform();
        startAnimation();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract')) {
        if (isTimelapseActiveRef.current && graphFocusCameraRef.current) return;
        // Trackpad pinch simulation or Ctrl + Minus with easing
        e.preventDefault();
        e.stopPropagation();
        const canvas = canvasRef.current;
        const rect = canvas?.getBoundingClientRect() || { width: 800, height: 600, left: 0, top: 0 };
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const currentScale = targetTransformRef.current.scale || 1;
        const newScale = Math.max(0.1, currentScale * 0.8);
        targetTransformRef.current = {
          x: centerX - ((centerX - targetTransformRef.current.x) * (newScale / currentScale)),
          y: centerY - ((centerY - targetTransformRef.current.y) * (newScale / currentScale)),
          scale: newScale,
        };
        persistTransform();
        startAnimation();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0')) {
        if (isTimelapseActiveRef.current && graphFocusCameraRef.current) return;
        // Ctrl + 0 -> Reset view
        e.preventDefault();
        e.stopPropagation();
        handleResetView();
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        setFilterText('');
        startAnimation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isSearchOpen, startAnimation, handleResetView, persistTransform]);

  // Window resize, ResizeObserver & non-passive wheel listeners
  useEffect(() => {
    resizeCanvas();
    startAnimation();

    const container = containerRef.current;
    const canvas = canvasRef.current;
    let observer: ResizeObserver | null = null;

    if (typeof ResizeObserver !== 'undefined' && container) {
      observer = new ResizeObserver(() => {
        resizeCanvas();
        startAnimation();
      });
      observer.observe(container);
    }

    const handleResize = () => {
      resizeCanvas();
      startAnimation();
    };
    window.addEventListener('resize', handleResize);

    const handleGlobalPointerUp = (e: PointerEvent) => {
      activePointersRef.current.delete(e.pointerId);
      if (activePointersRef.current.size === 0) {
        pinchStartRef.current = null;
        if (dragNodeRef.current) {
          persistPositions();
          alphaRef.current = Math.max(alphaRef.current, 0.72);
          dragNodeRef.current = null;
        }
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          const now = performance.now();
          const history = panHistoryRef.current;
          if (history.length >= 2) {
            const oldest = history[0];
            const dt = now - oldest.t;
            if (dt > 10 && dt < 120) {
              const dx = e.clientX - oldest.x;
              const dy = e.clientY - oldest.y;
              const rawVx = (dx / dt) * 17.5;
              const rawVy = (dy / dt) * 17.5;
              const maxV = 65;
              const speed = Math.hypot(rawVx, rawVy);
              const scale = speed > maxV ? maxV / speed : 1;
              panVelocityRef.current = {
                vx: rawVx * scale,
                vy: rawVy * scale,
              };
            }
          }
          panHistoryRef.current = [];
        }
        startAnimation();
      }
    };
    const handleBlur = () => {
      activePointersRef.current.clear();
      pinchStartRef.current = null;
      isDraggingRef.current = false;
      dragNodeRef.current = null;
      panVelocityRef.current = { vx: 0, vy: 0 };
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    window.addEventListener('blur', handleBlur);

    // Unified Window & Global Gestures: Wheel, Trackpad Pinch, macOS Gesture, and Touch Tracking
    const handleNativeWheel = (e: WheelEvent) => {
      panVelocityRef.current = { vx: 0, vy: 0 };
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      // Coordinate-based bounds checking ensures trackpad pinch events dispatched to
      // the root document or body by WebView2 / Chromium are never dropped.
      const rect = canvas.getBoundingClientRect();
      const isInside = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      const target = e.target as Node | null;
      const isTargetInside = target ? (container.contains(target) || target === canvas) : false;

      if (!isInside && !isTargetInside) return;

      // Prevent native browser viewport scaling
      e.preventDefault();

      // Lock manual zooming & panning while in actively playing focus camera time-lapse
      if (isTimelapseActiveRef.current && !isTimelapsePausedRef.current && graphFocusCameraRef.current) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const currentScale = Number.isFinite(targetTransformRef.current.scale) && targetTransformRef.current.scale > 0 ? targetTransformRef.current.scale : 1;
      const currentX = Number.isFinite(targetTransformRef.current.x) ? targetTransformRef.current.x : 0;
      const currentY = Number.isFinite(targetTransformRef.current.y) ? targetTransformRef.current.y : 0;

      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === 1) {
        dx *= 16;
        dy *= 16;
      } else if (e.deltaMode === 2) {
        dx *= window.innerHeight;
        dy *= window.innerHeight;
      }

      if (e.ctrlKey || e.metaKey) {
        // Trackpad pinch-to-zoom (Windows Precision Touchpad sends WheelEvent with ctrlKey=true) OR Ctrl + Wheel.
        // Uses a continuous exponential curve Math.exp(-dy * 0.012) for silky, responsive zoom scaling.
        const zoomFactor = Math.exp(-dy * 0.012);
        const newScale = Math.min(4.0, Math.max(0.1, currentScale * zoomFactor));

        if (Math.abs(newScale - currentScale) > 0.0001) {
          targetTransformRef.current = {
            x: mouseX - ((mouseX - currentX) * (newScale / currentScale)),
            y: mouseY - ((mouseY - currentY) * (newScale / currentScale)),
            scale: newScale,
          };
          persistTransform();
          startAnimation();
        }
      } else if (e.shiftKey) {
        // Shift + Wheel -> Horizontal Pan
        targetTransformRef.current = {
          x: currentX - (Math.abs(dy) > 0 ? dy : dx),
          y: currentY,
          scale: currentScale,
        };
        persistTransform();
        startAnimation();
      } else if (Math.abs(dx) > 0) {
        // Trackpad 2-Finger Horizontal / Diagonal Pan
        targetTransformRef.current = {
          x: currentX - dx,
          y: currentY - dy,
          scale: currentScale,
        };
        persistTransform();
        startAnimation();
      } else {
        // Mouse Wheel Scroll (without Ctrl) OR Trackpad Vertical Scroll -> Zoom centered at mouse cursor
        // Note: targetTransformRef is updated here while currentTransformRef lerps smoothly via render loop easing.
        let zoomFactor: number;
        if (Math.abs(dy) < 30 && e.deltaMode === 0) {
          zoomFactor = Math.exp(-dy * 0.008);
        } else {
          zoomFactor = dy < 0 ? 1.18 : 0.84;
        }

        const newScale = Math.min(4.0, Math.max(0.1, currentScale * zoomFactor));

        if (Math.abs(newScale - currentScale) > 0.0001) {
          targetTransformRef.current = {
            x: mouseX - ((mouseX - currentX) * (newScale / currentScale)),
            y: mouseY - ((mouseY - currentY) * (newScale / currentScale)),
            scale: newScale,
          };
          persistTransform();
          startAnimation();
        }
      }
    };

    // WebKit / Safari Gesture Events (macOS trackpad pinch gestures).
    // Uses pinned initial transform coordinates from gesturestart to prevent exponential frame-to-frame drift.
    let gestureInitialScale = 1;
    let gestureInitialTransform = { x: 0, y: 0 };
    const handleGestureStart = (e: any) => {
      e.preventDefault();
      if (isTimelapseActiveRef.current && !isTimelapsePausedRef.current && graphFocusCameraRef.current) return;
      gestureInitialScale = targetTransformRef.current.scale || 1;
      gestureInitialTransform = {
        x: targetTransformRef.current.x || 0,
        y: targetTransformRef.current.y || 0,
      };
    };
    const handleGestureChange = (e: any) => {
      e.preventDefault();
      if (isTimelapseActiveRef.current && !isTimelapsePausedRef.current && graphFocusCameraRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX || rect.width / 2) - rect.left;
      const mouseY = (e.clientY || rect.height / 2) - rect.top;
      const newScale = Math.min(4.0, Math.max(0.1, gestureInitialScale * (e.scale || 1)));

      targetTransformRef.current = {
        x: mouseX - ((mouseX - gestureInitialTransform.x) * (newScale / gestureInitialScale)),
        y: mouseY - ((mouseY - gestureInitialTransform.y) * (newScale / gestureInitialScale)),
        scale: newScale,
      };
      currentTransformRef.current.x = targetTransformRef.current.x;
      currentTransformRef.current.y = targetTransformRef.current.y;
      currentTransformRef.current.scale = targetTransformRef.current.scale;
      persistTransform();
      startAnimation();
    };
    const handleGestureEnd = (e: any) => {
      e.preventDefault();
      if (isTimelapseActiveRef.current && !isTimelapsePausedRef.current && graphFocusCameraRef.current) return;
      persistTransform();
      startAnimation();
    };

    window.addEventListener('wheel', handleNativeWheel, { passive: false });

    if (container) {
      container.addEventListener('gesturestart', handleGestureStart, { passive: false });
      container.addEventListener('gesturechange', handleGestureChange, { passive: false });
      container.addEventListener('gestureend', handleGestureEnd, { passive: false });
    }

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('wheel', handleNativeWheel);
      if (container) {
        container.removeEventListener('gesturestart', handleGestureStart);
        container.removeEventListener('gesturechange', handleGestureChange);
        container.removeEventListener('gestureend', handleGestureEnd);
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [resizeCanvas, startAnimation, persistPositions, persistTransform]);

  // Unified Pointer interactions for mouse, touchscreen & stylus
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {}

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Halt any active momentum drift immediately on touch down
    panVelocityRef.current = { vx: 0, vy: 0 };

    if (activePointersRef.current.size >= 2) {
      // Multi-Touch Pinch: When 2+ pointers touch down, immediately cancel any active
      // single-pointer dragging or node dragging to prevent gesture conflicts.
      if (dragNodeRef.current) {
        dragNodeRef.current = null;
      }
      isDraggingRef.current = false;
      panHistoryRef.current = [];

      if (isTimelapseActiveRef.current && !isTimelapsePausedRef.current && graphFocusCameraRef.current) return;

      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const rect = canvas.getBoundingClientRect();
      pinchStartRef.current = {
        dist: Math.max(dist, 1),
        scale: targetTransformRef.current.scale || 1,
        center: {
          x: (pts[0].x + pts[1].x) / 2 - rect.left,
          y: (pts[0].y + pts[1].y) / 2 - rect.top,
        },
        transform: {
          x: targetTransformRef.current.x || 0,
          y: targetTransformRef.current.y || 0,
        },
      };
      startAnimation();
      return;
    }

    // Single pointer down
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    panHistoryRef.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }];

    const rect = canvas.getBoundingClientRect();
    const safeScale = Number.isFinite(currentTransformRef.current.scale) && currentTransformRef.current.scale > 0 ? currentTransformRef.current.scale : 1;
    const mouseX = (e.clientX - rect.left - (currentTransformRef.current.x || 0)) / safeScale;
    const mouseY = (e.clientY - rect.top - (currentTransformRef.current.y || 0)) / safeScale;

    const isTimelapse = isTimelapseActiveRef.current;
    const isCameraLocked = isTimelapse && !isTimelapsePausedRef.current && graphFocusCameraRef.current;

    const clickedNode = nodesRef.current.find((n) => {
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) return false;
      const dx = n.x - mouseX;
      const dy = n.y - mouseY;
      return Math.sqrt(dx * dx + dy * dy) <= (n.radius || 6) + 6;
    });

    if (clickedNode) {
      clickedNodeCandidateRef.current = clickedNode;
      if (!isTimelapse) {
        dragNodeRef.current = clickedNode;
        alphaRef.current = 0.55;
      } else {
        dragNodeRef.current = null;
        isDraggingRef.current = !isCameraLocked;
      }
    } else {
      clickedNodeCandidateRef.current = null;
      isDraggingRef.current = !isCameraLocked;
    }
    startAnimation();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Multi-Touch Pinch Zoom: Scale & translate relative to the dynamic center midpoint
    if (activePointersRef.current.size >= 2 && pinchStartRef.current && pinchStartRef.current.dist > 0) {
      const pinchStart = pinchStartRef.current;
      const pts = Array.from(activePointersRef.current.values());
      const currentDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const ratio = currentDist / pinchStart.dist;
      const newScale = Math.min(4.0, Math.max(0.1, pinchStart.scale * ratio));
      const rect = canvas.getBoundingClientRect();
      const currentCenter = {
        x: (pts[0].x + pts[1].x) / 2 - rect.left,
        y: (pts[0].y + pts[1].y) / 2 - rect.top,
      };

      targetTransformRef.current = {
        x: currentCenter.x - ((pinchStart.center.x - pinchStart.transform.x) * (newScale / pinchStart.scale)),
        y: currentCenter.y - ((pinchStart.center.y - pinchStart.transform.y) * (newScale / pinchStart.scale)),
        scale: newScale,
      };
      currentTransformRef.current.x = targetTransformRef.current.x;
      currentTransformRef.current.y = targetTransformRef.current.y;
      currentTransformRef.current.scale = targetTransformRef.current.scale;

      persistTransform();
      startAnimation();
      return;
    }

    // Single Pointer Interactions
    const rect = canvas.getBoundingClientRect();
    const safeScale = Number.isFinite(currentTransformRef.current.scale) && currentTransformRef.current.scale > 0 ? currentTransformRef.current.scale : 1;
    const mouseX = (e.clientX - rect.left - (currentTransformRef.current.x || 0)) / safeScale;
    const mouseY = (e.clientY - rect.top - (currentTransformRef.current.y || 0)) / safeScale;

    if (dragNodeRef.current && !isTimelapseActiveRef.current) {
      const dx = mouseX - dragNodeRef.current.x;
      const dy = mouseY - dragNodeRef.current.y;
      dragNodeRef.current.vx = dx * 0.45;
      dragNodeRef.current.vy = dy * 0.45;
      dragNodeRef.current.x = mouseX;
      dragNodeRef.current.y = mouseY;
      alphaRef.current = Math.max(alphaRef.current, 0.42);
      startAnimation();
    } else if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      targetTransformRef.current.x = (targetTransformRef.current.x || 0) + dx;
      targetTransformRef.current.y = (targetTransformRef.current.y || 0) + dy;
      currentTransformRef.current.x = targetTransformRef.current.x;
      currentTransformRef.current.y = targetTransformRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      const now = performance.now();
      panHistoryRef.current.push({ x: e.clientX, y: e.clientY, t: now });
      if (panHistoryRef.current.length > 8) panHistoryRef.current.shift();
      while (panHistoryRef.current.length > 2 && now - panHistoryRef.current[0].t > 90) {
        panHistoryRef.current.shift();
      }

      persistTransform();
      startAnimation();
    } else if (e.pointerType === 'mouse') {
      const prevHoveredId = hoveredNodeRef.current?.id || null;
      const hovered = nodesRef.current.find((n) => {
        if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) return false;
        const dx = n.x - mouseX;
        const dy = n.y - mouseY;
        return Math.sqrt(dx * dx + dy * dy) <= (n.radius || 6) + 6;
      }) || null;
      const nextHoveredId = hovered?.id || null;

      if (prevHoveredId !== nextHoveredId) {
        hoveredNodeRef.current = hovered;
        if (hovered) {
          const set = new Set<string>([hovered.id]);
          for (const link of linksRef.current) {
            if (link.source === hovered.id) set.add(link.target);
            if (link.target === hovered.id) set.add(link.source);
          }
          connectedNodeIdsRef.current = set;
        } else {
          connectedNodeIdsRef.current = null;
        }
        startAnimation();
      }
    }
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);

    if (activePointersRef.current.size >= 1) {
      // Transition remaining pointer smoothly to pan without jump
      pinchStartRef.current = null;
      dragNodeRef.current = null;
      const remaining = Array.from(activePointersRef.current.values())[0];
      lastMousePosRef.current = { x: remaining.x, y: remaining.y };
      dragStartPosRef.current = { x: remaining.x, y: remaining.y };
      panHistoryRef.current = [{ x: remaining.x, y: remaining.y, t: performance.now() }];
      isDraggingRef.current = true;
      return;
    }

    pinchStartRef.current = null;

    const distMoved = Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y);
    const targetCandidate = dragNodeRef.current || (distMoved < 6 ? clickedNodeCandidateRef.current : null);
    clickedNodeCandidateRef.current = null;

    if (dragNodeRef.current) {
      if (distMoved < 6) {
        const targetId = dragNodeRef.current.id;
        const allDocs = await getAllDocuments();
        const targetDoc = allDocs.find((d) => d.id === targetId);
        openTab(targetId, targetDoc?.title || dragNodeRef.current.title);
        await setActiveDocumentById(targetId);
        setMainViewMode('document');
      } else {
        persistPositions();
      }
      alphaRef.current = Math.max(alphaRef.current, 0.72);
      dragNodeRef.current = null;
    } else if (distMoved < 6 && targetCandidate) {
      const targetId = targetCandidate.id;
      const allDocs = useDocumentStore.getState().documents;
      const targetDoc = allDocs.find((d: any) => d.id === targetId);
      openTab(targetId, targetDoc?.title || targetCandidate.title);
      await setActiveDocumentById(targetId);
      setMainViewMode('document');
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      const now = performance.now();
      const history = panHistoryRef.current;
      if (history.length >= 2) {
        const oldest = history[0];
        const dt = now - oldest.t;
        if (dt > 10 && dt < 120) {
          const dx = e.clientX - oldest.x;
          const dy = e.clientY - oldest.y;
          const rawVx = (dx / dt) * 17.5;
          const rawVy = (dy / dt) * 17.5;
          const maxV = 65;
          const speed = Math.hypot(rawVx, rawVy);
          const scale = speed > maxV ? maxV / speed : 1;
          panVelocityRef.current = {
            vx: rawVx * scale,
            vy: rawVy * scale,
          };
        }
      }
      panHistoryRef.current = [];
    }

    startAnimation();
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size === 0) {
      pinchStartRef.current = null;
      clickedNodeCandidateRef.current = null;
      if (dragNodeRef.current) {
        persistPositions();
        alphaRef.current = Math.max(alphaRef.current, 0.72);
        dragNodeRef.current = null;
      }
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        panHistoryRef.current = [];
      }
      if (hoveredNodeRef.current) {
        hoveredNodeRef.current = null;
        connectedNodeIdsRef.current = null;
      }
      startAnimation();
    }
  };

  return (
    <div
      ref={containerRef}
      data-pinchable="true"
      data-graph-view="true"
      data-is-sidebar={isSidebar ? 'true' : undefined}
      style={{
        touchAction: 'none',
        background: isSidebar
          ? 'var(--flint-bg-sidebar-gradient, var(--flint-bg-sidebar, #151515))'
          : '#181818',
      }}
      className={`flint-graph-view flint-pinchable relative flex-1 h-full w-full overflow-hidden select-none touch-none ${
        isSidebar ? 'bg-transparent' : 'bg-[#181818]'
      }`}
    >
      {/* Shared Modular Document Sub-Header */}
      <PageSubHeader
        title="Graph view"
        icon={<NeuralNetworkIcon size={13} />}
        document={null}
        hideBar={true}
        isSidebar={isSidebar}
        showReadingToggle={false}
        showBookmark={false}
        customRightActions={
          <>
            {/* Animate Graph / Time-lapse Button (Play / Pause / Resume) */}
            <button
              type="button"
              onClick={handleToggleTimelapse}
              disabled={isFloatActive}
              title={
                isFloatActive
                  ? 'Time-lapse (Disabled while float mode is active)'
                  : !isTimelapseActive
                  ? 'Animate graph (Time-lapse)'
                  : isTimelapsePaused
                  ? 'Resume time-lapse'
                  : 'Pause time-lapse'
              }
              className={`p-1 rounded transition-colors ${
                isFloatActive
                  ? 'text-[#444] opacity-40 cursor-not-allowed'
                  : isTimelapseActive
                  ? 'text-white bg-[#282828] cursor-pointer'
                  : 'text-[#777] hover:text-[#dcddde] hover:bg-[#222] cursor-pointer'
              }`}
            >
              {isTimelapseActive && !isTimelapsePaused ? (
                <PauseIcon size={14} />
              ) : (
                <PlayIcon size={14} />
              )}
            </button>

            {/* Restore Graph Button (Active during timelapse or pause, otherwise grayed out) */}
            <button
              type="button"
              onClick={handleRestoreGraph}
              disabled={!isTimelapseActive}
              title={
                isTimelapseActive
                  ? 'Restore graph (Finish time-lapse)'
                  : 'Restore graph'
              }
              className={`p-1 rounded transition-colors ${
                isTimelapseActive
                  ? 'text-[#777] hover:text-[#dcddde] hover:bg-[#222] cursor-pointer'
                  : 'text-[#444] opacity-40 cursor-not-allowed'
              }`}
            >
              <RotateCcwIcon size={14} />
            </button>

            {/* Fit to Center Button */}
            <button
              type="button"
              onClick={handleFitToCenter}
              disabled={((isTimelapseActive && !isTimelapsePaused) || isFloatActive) && graphFocusCamera}
              title={
                ((isTimelapseActive && !isTimelapsePaused) || isFloatActive) && graphFocusCamera
                  ? 'Fit to center (Disabled when focus camera is active)'
                  : 'Fit to center'
              }
              className={`p-1 rounded transition-colors ${
                ((isTimelapseActive && !isTimelapsePaused) || isFloatActive) && graphFocusCamera
                  ? 'text-[#444] opacity-40 cursor-not-allowed'
                  : 'text-[#777] hover:text-[#dcddde] hover:bg-[#222] cursor-pointer'
              }`}
            >
              <CenterFocusIcon size={14} />
            </button>

            {/* Float Button */}
            <button
              type="button"
              onClick={toggleFloatMode}
              disabled={isTimelapseActive}
              title={
                isTimelapseActive
                  ? 'Float (Disabled during time-lapse)'
                  : isFloatActive
                  ? 'Stop float'
                  : 'Float'
              }
              className={`p-1 rounded transition-colors ${
                isTimelapseActive
                  ? 'text-[#444] opacity-40 cursor-not-allowed'
                  : isFloatActive
                  ? 'text-white bg-[#282828] cursor-pointer'
                  : 'text-[#777] hover:text-[#dcddde] hover:bg-[#222] cursor-pointer'
              }`}
            >
              <BubblesIcon size={14} />
            </button>
          </>
        }
        isFindOpen={isSearchOpen}
        onToggleFind={() => {
          setIsSearchOpen((prev) => {
            const next = !prev;
            if (!next) {
              setFilterText('');
              startAnimation();
            }
            return next;
          });
        }}
      />

      {/* Main Canvas Area */}
      <div style={{ touchAction: 'none' }} className="absolute inset-0 w-full h-full touch-none">
        {/* Top-Right: Search Nodes Overlay Bar */}
        {isSearchOpen && (
          <div className="absolute top-10 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1e1e]/95 border border-[#2e2e2e] backdrop-blur-md text-xs text-[#dcddde] shadow-2xl">
            <Search01Icon size={14} className="text-[#888] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                searchMatchIndexRef.current = -1;
                startAnimation();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsSearchOpen(false);
                  setFilterText('');
                  startAnimation();
                } else if (e.key === 'Enter') {
                  handleFocusNextMatch();
                }
              }}
              placeholder="Search nodes..."
              className="bg-transparent outline-none text-xs text-white placeholder-[#555] w-44 font-sans"
            />
            {filterText.trim() !== '' && (
              <span className="text-[11px] text-[#777] font-mono px-1 select-none whitespace-nowrap">
                {matchCount} {matchCount === 1 ? 'match' : 'matches'}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setIsSearchOpen(false);
                setFilterText('');
                startAnimation();
              }}
              title="Close search (Esc)"
              className="p-0.5 rounded text-[#777] hover:text-[#dcddde] hover:bg-[#282828] transition-colors cursor-pointer"
            >
              <Cancel01Icon size={14} />
            </button>
          </div>
        )}

        {/* Interactive Canvas */}
        <canvas
          ref={canvasRef}
          data-pinchable="true"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className="block w-full h-full cursor-grab active:cursor-grabbing touch-none"
        />
      </div>
    </div>
  );
});
