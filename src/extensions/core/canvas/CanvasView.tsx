import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCanvasSettings } from './canvasSettings';
import { CanvasNode, CanvasEdge, CanvasNodeSide } from './types';
import {
  getCanvasNodes,
  getCanvasEdges,
  saveCanvasNode,
  deleteCanvasNode,
  saveCanvasEdge,
  deleteCanvasEdge,
  syncCanvasToDisk,
  importCanvasBoard,
} from './canvasDb';
import {
  getSideAnchorPoint,
  computeBezierPath,
  findTargetSideSnap,
  determineDefaultConnectingSides,
  getEdgeLabelBox,
  SideSnapTarget,
} from './utils/canvasEdges';
import {
  PlusSignIcon,
  MinusSignIcon,
  CenterFocusIcon,
  RotateCcwIcon,
  Cancel01Icon,
  File01Icon,
  Delete02Icon,
  SparklesIcon,
  Layout01Icon,
  StickyNote03Icon,
  FileEmpty01Icon,
  FileImageIcon,
} from '@/components/common/Icons';
import { PageSubHeader } from '@/components/layout/PageSubHeader';
import { useNoetherApp, useVaultDocuments, useActiveDocument, useToast } from 'noether';
import type { DocumentItem } from '@/types';
import { CanvasCard, ResizeHandleType } from './components/CanvasCard';
import { CardActionPill, computePillScale } from './components/CardActionPill';
import { MultiSelectActionPill } from './components/MultiSelectActionPill';
import { EdgeActionPill } from './components/EdgeActionPill';
import { EdgeLabel } from './components/EdgeLabel';
import { isImageDocument } from './components/CardContentRenderer';
import { CanvasSettingsRail } from './components/CanvasSettingsRail';
import { CanvasBottomDock, CanvasDockActionType } from './components/CanvasBottomDock';
import { CanvasItemSearchModal } from './components/CanvasItemSearchModal';
import { calculateObjectSnap, AlignmentGuide } from './utils/canvasSnapping';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useAppContextMenu } from '@/components/common/ContextMenu';
import {
  buildCanvasBackgroundContextMenu,
  buildNoteCardContextMenu,
  buildTextCardContextMenu,
  buildLinkCardContextMenu,
  buildMultiSelectContextMenu,
  buildUnconnectedEdgeContextMenu,
} from './utils/canvasContextMenu';
import { platform } from '@/lib/platform/platformAdapter';
import { getDocumentPath } from '@/lib/db/documents';

let measureTitleCtx: CanvasRenderingContext2D | null = null;
let resolvedFontFamily: string | null = null;

function getTitleTextWidth(text: string): number {
  if (!text) return 0;
  if (typeof document !== 'undefined') {
    if (!measureTitleCtx) {
      const c = document.createElement('canvas');
      measureTitleCtx = c.getContext('2d');
    }
    if (!resolvedFontFamily) {
      const root = document.documentElement;
      const comp = window.getComputedStyle(root).getPropertyValue('--font-interface').trim();
      resolvedFontFamily = comp || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif';
    }
    if (measureTitleCtx) {
      measureTitleCtx.font = `500 14px ${resolvedFontFamily}`;
      return measureTitleCtx.measureText(text).width;
    }
  }
  return text.length * 8.5;
}

export interface CanvasViewProps {
  boardId?: string;
  tabId?: string;
}

export const CanvasView: React.FC<CanvasViewProps> = React.memo(({ boardId, tabId }) => {
  const app = useNoetherApp();
  const setMainViewMode = useCallback((m: string) => app.workspace.setMainViewMode(m), [app]);
  const showToast = useToast();
  const canvasSnapGrid = useCanvasSettings((s: any) => s.canvasSnapGrid);
  const setCanvasSnapGrid = useCanvasSettings((s: any) => s.setCanvasSnapGrid);
  const canvasSnapObjects = useCanvasSettings((s: any) => s.canvasSnapObjects);
  const setCanvasSnapObjects = useCanvasSettings((s: any) => s.setCanvasSnapObjects);
  const canvasReadOnly = useCanvasSettings((s: any) => s.canvasReadOnly);
  const setCanvasReadOnly = useCanvasSettings((s: any) => s.setCanvasReadOnly);
  const gridSize = useCanvasSettings((s: any) => s.gridSize);
  const documents = useVaultDocuments();
  const activeDocument = useActiveDocument();
  const isLightboxOpen = useWorkspaceStore((s) => Boolean(s.imageLightbox?.isOpen));
  const openInputDialog = useWorkspaceStore((s) => s.openInputDialog);
  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);
  const openTab = useWorkspaceStore((s) => s.openTab);
  const openSplitTab = useWorkspaceStore((s) => s.openSplitTab);
  const promptFolderSelection = useWorkspaceStore((s) => s.promptFolderSelection);
  const vaultPath = useWorkspaceStore((s) => s.vaultPath);
  const { showContextMenu, closeContextMenu } = useAppContextMenu();
  const [swappingNodeId, setSwappingNodeId] = useState<string | null>(null);
  const setActiveDocumentById = useCallback((id: string) => app.vault.openDocument(id), [app]);

  const effectiveBoardId =
    boardId && !boardId.startsWith('__')
      ? boardId
      : activeDocument?.doc_type === 'canvas'
      ? activeDocument.id
      : 'default';

  const activeDoc =
    documents.find((d: DocumentItem) => d.id === effectiveBoardId) ||
    (activeDocument?.id === effectiveBoardId ? activeDocument : null);

  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const selectedNodeIdsRef = useRef<string[]>([]);
  useEffect(() => { selectedNodeIdsRef.current = selectedNodeIds; }, [selectedNodeIds]);

  const [marqueeBox, setMarqueeBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [isMarqueeActiveState, setIsMarqueeActiveState] = useState(false);
  const marqueeStartRef = useRef<{ clientX: number; clientY: number; canvasX: number; canvasY: number } | null>(null);
  const isMarqueeActiveRef = useRef(false);
  const multiDragInitialPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const selectSingleNode = useCallback((id: string | null) => {
    if (id) {
      setSelectedNodeIds([id]);
      selectedNodeIdsRef.current = [id];
      setSelectedNodeId(id);
    } else {
      setSelectedNodeIds([]);
      selectedNodeIdsRef.current = [];
      setSelectedNodeId(null);
    }
  }, []);

  const [autoEditingNodeId, setAutoEditingNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editingEdgeLabelId, setEditingEdgeLabelId] = useState<string | null>(null);
  const [editingLabelDraft, setEditingLabelDraft] = useState<string>('');
  const [docContentMap, setDocContentMap] = useState<Record<string, string>>({});
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);
  const [dragGhost, setDragGhost] = useState<{
    type: CanvasDockActionType;
    screenX: number;
    screenY: number;
    canvasX: number;
    canvasY: number;
    width?: number;
    height?: number;
  } | null>(null);
  const [searchModalState, setSearchModalState] = useState<{
    isOpen: boolean;
    mode: 'note' | 'media';
    targetCanvasX: number;
    targetCanvasY: number;
  }>({
    isOpen: false,
    mode: 'note',
    targetCanvasX: 0,
    targetCanvasY: 0,
  });

  interface DraftEdgeState {
    fromNodeId: string;
    fromSide: CanvasNodeSide;
    currentCanvasX: number;
    currentCanvasY: number;
    snappedTarget: SideSnapTarget | null;
    mode: 'drag' | 'click' | 'menu';
    editingEdgeId?: string;
    editingEndpoint?: 'source' | 'target';
    fixedNodeId?: string;
    fixedSide?: CanvasNodeSide;
  }

  const [draftEdge, setDraftEdge] = useState<DraftEdgeState | null>(null);
  const draftEdgeRef = useRef<DraftEdgeState | null>(null);
  const selectedEdgeIdRef = useRef<string | null>(null);
  const lastArrowCancelTimeRef = useRef<number>(0);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const canvasSnapGridRef = useRef(canvasSnapGrid);
  const canvasSnapObjectsRef = useRef(canvasSnapObjects);
  const canvasReadOnlyRef = useRef(canvasReadOnly);
  const gridSizeRef = useRef(gridSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingEdgeConnectionRef = useRef<{
    fromNodeId: string;
    fromSide: CanvasNodeSide;
    editingEdgeId?: string;
    editingEndpoint?: 'source' | 'target';
    incomingSide: CanvasNodeSide;
  } | null>(null);
  const isDroppingIntoModalRef = useRef(false);
  const isCompletingUnconnectedDropRef = useRef(false);
  const ghostLeaveTimeoutRef = useRef<any>(null);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { draftEdgeRef.current = draftEdge; }, [draftEdge]);
  useEffect(() => {
    if (draftEdge && draftEdge.mode !== 'menu') {
      document.body.style.cursor = 'grab';
      return () => {
        document.body.style.cursor = '';
      };
    }
  }, [Boolean(draftEdge), draftEdge?.mode]);
  useEffect(() => { selectedEdgeIdRef.current = selectedEdgeId; }, [selectedEdgeId]);
  useEffect(() => { canvasSnapGridRef.current = canvasSnapGrid; }, [canvasSnapGrid]);
  useEffect(() => { canvasSnapObjectsRef.current = canvasSnapObjects; }, [canvasSnapObjects]);
  useEffect(() => { canvasReadOnlyRef.current = canvasReadOnly; }, [canvasReadOnly]);
  useEffect(() => { gridSizeRef.current = gridSize; }, [gridSize]);

  // Asynchronously load note content into memory cache for cards that need it
  useEffect(() => {
    const missingIds = nodes
      .filter((n) => n.document_id && docContentMap[n.document_id] === undefined)
      .map((n) => n.document_id as string);

    if (missingIds.length === 0) return;

    let isMounted = true;
    missingIds.forEach(async (id) => {
      try {
        const doc = await app.vault.readDocument(id);
        if (isMounted && doc) {
          setDocContentMap((prev) => ({ ...prev, [id]: doc.content_json || '' }));
        }
      } catch {}
    });

    return () => {
      isMounted = false;
    };
  }, [nodes, app.vault, docContentMap]);

  const diskSyncTimerRef = useRef<any>(null);

  const triggerDiskSync = useCallback((targetBoardId: string) => {
    if (!targetBoardId || targetBoardId === 'default' || targetBoardId.startsWith('__')) return;
    if (diskSyncTimerRef.current) clearTimeout(diskSyncTimerRef.current);
    diskSyncTimerRef.current = setTimeout(() => {
      syncCanvasToDisk(targetBoardId);
      diskSyncTimerRef.current = null;
    }, 500);
  }, []);

  const triggerDiskSyncRef = useRef(triggerDiskSync);
  useEffect(() => {
    triggerDiskSyncRef.current = triggerDiskSync;
  }, [triggerDiskSync]);

  // Canvas Action History (Undo / Redo for Nodes & Edges)
  interface CanvasSnapshot {
    nodes: CanvasNode[];
    edges: CanvasEdge[];
  }

  const undoStackRef = useRef<CanvasSnapshot[]>([]);
  const redoStackRef = useRef<CanvasSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const recordSnapshot = useCallback(() => {
    const currentSnapshot: CanvasSnapshot = {
      nodes: nodesRef.current.map((n) => ({ ...n })),
      edges: edgesRef.current.map((e) => ({ ...e })),
    };
    undoStackRef.current.push(currentSnapshot);
    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const handleUndo = useCallback(async () => {
    if (canvasReadOnlyRef.current || undoStackRef.current.length === 0) return;
    const previousState = undoStackRef.current.pop();
    if (!previousState) return;

    const currentSnapshot: CanvasSnapshot = {
      nodes: nodesRef.current.map((n) => ({ ...n })),
      edges: edgesRef.current.map((e) => ({ ...e })),
    };
    redoStackRef.current.push(currentSnapshot);

    const prevNodeIds = new Set(previousState.nodes.map((n) => n.id));
    for (const n of nodesRef.current) {
      if (!prevNodeIds.has(n.id)) {
        await deleteCanvasNode(n.id);
      }
    }
    for (const n of previousState.nodes) {
      await saveCanvasNode(n);
    }

    const prevEdgeIds = new Set(previousState.edges.map((e) => e.id));
    for (const e of edgesRef.current) {
      if (!prevEdgeIds.has(e.id)) {
        await deleteCanvasEdge(e.id);
      }
    }
    for (const e of previousState.edges) {
      await saveCanvasEdge(e);
    }

    triggerDiskSync(effectiveBoardId);

    setNodes(previousState.nodes);
    setEdges(previousState.edges);
    nodesRef.current = previousState.nodes;
    edgesRef.current = previousState.edges;
    updateUndoRedoState();
    showToast('Undo', 'info');
  }, [effectiveBoardId, triggerDiskSync, updateUndoRedoState, showToast]);

  const handleRedo = useCallback(async () => {
    if (canvasReadOnlyRef.current || redoStackRef.current.length === 0) return;
    const nextState = redoStackRef.current.pop();
    if (!nextState) return;

    const currentSnapshot: CanvasSnapshot = {
      nodes: nodesRef.current.map((n) => ({ ...n })),
      edges: edgesRef.current.map((e) => ({ ...e })),
    };
    undoStackRef.current.push(currentSnapshot);

    const nextNodeIds = new Set(nextState.nodes.map((n) => n.id));
    for (const n of nodesRef.current) {
      if (!nextNodeIds.has(n.id)) {
        await deleteCanvasNode(n.id);
      }
    }
    for (const n of nextState.nodes) {
      await saveCanvasNode(n);
    }

    const nextEdgeIds = new Set(nextState.edges.map((e) => e.id));
    for (const e of edgesRef.current) {
      if (!nextEdgeIds.has(e.id)) {
        await deleteCanvasEdge(e.id);
      }
    }
    for (const e of nextState.edges) {
      await saveCanvasEdge(e);
    }

    triggerDiskSync(effectiveBoardId);

    setNodes(nextState.nodes);
    setEdges(nextState.edges);
    nodesRef.current = nextState.nodes;
    edgesRef.current = nextState.edges;
    updateUndoRedoState();
    showToast('Redo', 'info');
  }, [effectiveBoardId, triggerDiskSync, updateUndoRedoState, showToast]);

  // Debounced save for card text edits with flush on unmount
  const textPendingNodesRef = useRef<Map<string, { timer: any; node: CanvasNode }>>(new Map());

  const debouncedSaveNode = useCallback(
    (node: CanvasNode) => {
      const existing = textPendingNodesRef.current.get(node.id);
      if (existing) clearTimeout(existing.timer);
      const timer = setTimeout(() => {
        saveCanvasNode(node);
        triggerDiskSync(node.board_id);
        textPendingNodesRef.current.delete(node.id);
      }, 300);
      textPendingNodesRef.current.set(node.id, { timer, node });
    },
    [triggerDiskSync]
  );

  const flushCanvasSaves = useCallback(() => {
    textPendingNodesRef.current.forEach(({ timer, node }) => {
      clearTimeout(timer);
      saveCanvasNode(node);
    });
    textPendingNodesRef.current.clear();

    if (diskSyncTimerRef.current) {
      clearTimeout(diskSyncTimerRef.current);
      diskSyncTimerRef.current = null;
      syncCanvasToDisk(effectiveBoardId);
    }
  }, [effectiveBoardId]);

  useEffect(() => {
    const handleUnload = () => flushCanvasSaves();
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('blur', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('blur', handleUnload);
      flushCanvasSaves();
    };
  }, [flushCanvasSaves]);

  // Pan & Zoom (smooth kinematic easing via target/current dual-ref system)
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [zoom, setZoom] = useState(1);
  const [isPanningState, setIsPanningState] = useState(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panCanvasAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const lastMouseMoveEventRef = useRef<{ clientX: number; clientY: number } | null>(null);

  // Pan modifier mode state and refs (Space or Ctrl/Cmd)
  const [isPanModifierState, setIsPanModifierState] = useState(false);
  const isPanModifierRef = useRef(false);
  const isSpaceHeldRef = useRef(false);
  const isCtrlHeldRef = useRef(false);

  useEffect(() => {
    const isEditableElement = (el: HTMLElement | null): boolean => {
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        el.isContentEditable ||
        Boolean(el.closest('[contenteditable="true"], input, textarea'))
      );
    };

    const isCtrlOrMetaKey = (e: KeyboardEvent): boolean => {
      return (
        e.key === 'Control' ||
        e.key === 'Meta' ||
        e.code === 'ControlLeft' ||
        e.code === 'ControlRight' ||
        e.code === 'MetaLeft' ||
        e.code === 'MetaRight'
      );
    };

    const syncModifierState = () => {
      const active = isSpaceHeldRef.current || isCtrlHeldRef.current;
      if (active !== isPanModifierRef.current) {
        isPanModifierRef.current = active;
        setIsPanModifierState(active);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isSpace = e.code === 'Space';
      const isCtrl = isCtrlOrMetaKey(e);

      if (!isSpace && !isCtrl) return;

      const target = (e.target || document.activeElement) as HTMLElement | null;
      if (isEditableElement(target)) return;

      if (isSpace) {
        e.preventDefault();
        isSpaceHeldRef.current = true;
      }
      if (isCtrl) {
        isCtrlHeldRef.current = true;
      }

      syncModifierState();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const isSpace = e.code === 'Space';
      const isCtrl = isCtrlOrMetaKey(e);

      if (isSpace) {
        isSpaceHeldRef.current = false;
      }
      if (isCtrl || (!e.ctrlKey && !e.metaKey)) {
        isCtrlHeldRef.current = false;
      }

      syncModifierState();
    };

    const handleBlur = () => {
      isSpaceHeldRef.current = false;
      isCtrlHeldRef.current = false;
      isPanModifierRef.current = false;
      setIsPanModifierState(false);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Dual-ref camera transform for smooth lerp easing (same pattern as GraphView).
  // Wheel/gesture events write to targetTransform; the RAF loop interpolates currentTransform
  // toward it and feeds React state each frame, giving velvety smooth zoom and pan.
  const targetTransformRef = useRef({ x: 100, y: 100, scale: 1 });
  const currentTransformRef = useRef({ x: 100, y: 100, scale: 1 });
  const cameraRafRef = useRef<number | null>(null);

  // Direct GPU DOM transform refs for 144Hz+ zero-lag rendering
  const contentPlaneRef = useRef<HTMLDivElement>(null);
  const dotPatternRef = useRef<SVGPatternElement>(null);
  const dotCircleRef = useRef<SVGCircleElement>(null);
  const dotGridRectRef = useRef<SVGRectElement>(null);
  const syncStateRafRef = useRef<number | null>(null);

  // Fast timestamp-based continuous scroll stream tracking (zero timers, zero GC overhead)
  const lastWheelTimeRef = useRef(0);
  const wheelOriginWasCanvasRef = useRef(false);

  const syncDomTransform = useCallback((x: number, y: number, scale: number) => {
    if (contentPlaneRef.current) {
      contentPlaneRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    }
    if (dotPatternRef.current) {
      const step = gridSizeRef.current || 20;
      const originX = x - (step / 2) * scale;
      const originY = y - (step / 2) * scale;
      dotPatternRef.current.setAttribute(
        'patternTransform',
        `translate(${originX}, ${originY}) scale(${scale})`
      );
      if (dotCircleRef.current) {
        const dotRadius = Math.max(0.6, Math.min(1.8, 1 / scale));
        dotCircleRef.current.setAttribute('r', String(dotRadius));
      }
      if (dotGridRectRef.current) {
        const opacity = Math.min(1, Math.max(0, (scale - 0.18) / 0.22));
        dotGridRectRef.current.style.opacity = String(opacity);
      }
    }
  }, []);

  const runCameraEasing = useCallback(() => {
    if (cameraRafRef.current !== null) return; // Already running

    const tick = () => {
      const target = targetTransformRef.current;
      const current = currentTransformRef.current;

      // Smooth kinematic zoom easing (retains fluid motion even while holding mouse/panning)
      const ease = 0.38;

      const ds = target.scale - current.scale;

      // If user is currently holding the pointer down to pan, keep the grabbed canvas anchor
      // perfectly aligned with the pointer during zoom easing, preventing any pan/zoom fighting.
      if (
        isPanningRef.current &&
        panCanvasAnchorRef.current &&
        lastMouseMoveEventRef.current &&
        containerRef.current
      ) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = lastMouseMoveEventRef.current.clientX - rect.left;
        const mouseY = lastMouseMoveEventRef.current.clientY - rect.top;
        const anchor = panCanvasAnchorRef.current;

        current.scale += ds * ease;
        current.x = mouseX - anchor.x * current.scale;
        current.y = mouseY - anchor.y * current.scale;
        target.x = mouseX - anchor.x * target.scale;
        target.y = mouseY - anchor.y * target.scale;
      } else {
        const dx = target.x - current.x;
        const dy = target.y - current.y;
        current.x += dx * ease;
        current.y += dy * ease;
        current.scale += ds * ease;
      }

      const settled =
        Math.abs(target.x - current.x) < 0.05 &&
        Math.abs(target.y - current.y) < 0.05 &&
        Math.abs(target.scale - current.scale) < 0.0005;

      if (settled) {
        // Snap to exact target and stop the loop
        current.x = target.x;
        current.y = target.y;
        current.scale = target.scale;
        panRef.current = { x: current.x, y: current.y };
        zoomRef.current = current.scale;
        syncDomTransform(current.x, current.y, current.scale);
        setPan({ x: current.x, y: current.y });
        setZoom(current.scale);
        cameraRafRef.current = null;
        return;
      }

      panRef.current = { x: current.x, y: current.y };
      zoomRef.current = current.scale;

      syncDomTransform(current.x, current.y, current.scale);
      setPan({ x: current.x, y: current.y });
      setZoom(current.scale);

      cameraRafRef.current = requestAnimationFrame(tick);
    };

    cameraRafRef.current = requestAnimationFrame(tick);
  }, [syncDomTransform]);

  const autoScrollRafRef = useRef<number | null>(null);

  const stopEdgeAutoScroll = useCallback(() => {
    if (autoScrollRafRef.current !== null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (cameraRafRef.current !== null) {
        cancelAnimationFrame(cameraRafRef.current);
        cameraRafRef.current = null;
      }
      if (syncStateRafRef.current !== null) {
        cancelAnimationFrame(syncStateRafRef.current);
        syncStateRafRef.current = null;
      }
      if (mouseMoveRafRef.current !== null) {
        cancelAnimationFrame(mouseMoveRafRef.current);
        mouseMoveRafRef.current = null;
      }
      if (autoScrollRafRef.current !== null) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
    };
  }, []);

  // Dragging node
  const [isDraggingNodeState, setIsDraggingNodeState] = useState(false);
  const draggingNodeIdRef = useRef<string | null>(null);
  const dragCandidateNodeIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Synchronize grabbing cursor on document.body during node dragging or canvas panning
  useEffect(() => {
    if (isDraggingNodeState || isPanningState || (dragGhost && !searchModalState.isOpen)) {
      document.body.style.cursor = 'grabbing';
      return () => {
        document.body.style.cursor = '';
      };
    }
  }, [isDraggingNodeState, isPanningState, Boolean(dragGhost && !searchModalState.isOpen)]);

  // Cancel any canvas drag immediately if lightbox opens
  useEffect(() => {
    if (isLightboxOpen) {
      stopEdgeAutoScroll();
      dragCandidateNodeIdRef.current = null;
      draggingNodeIdRef.current = null;
      dragDidMoveRef.current = false;
      setIsDraggingNodeState(false);
      setActiveGuides([]);
      setDragGhost(null);
    }
  }, [isLightboxOpen, stopEdgeAutoScroll]);

  // Throttled mouse move via requestAnimationFrame
  const mouseMoveRafRef = useRef<number | null>(null);

  // Load Canvas Nodes from SQLite on mount or when effectiveBoardId changes
  useEffect(() => {
    let isMounted = true;
    flushCanvasSaves();

    async function loadBoard() {
      const savedNodes = await getCanvasNodes(effectiveBoardId);
      const savedEdges = await getCanvasEdges(effectiveBoardId);

      if (!isMounted) return;

      if (savedNodes.length > 0 || savedEdges.length > 0) {
        setNodes(savedNodes);
        setEdges(savedEdges);
      } else {
        const currentDoc = app.vault.documents.find((d: DocumentItem) => d.id === effectiveBoardId);
        if (currentDoc?.content_json && currentDoc.content_json.trim().length > 0) {
          try {
            const { nodes: importedNodes, edges: importedEdges } = await importCanvasBoard(
              effectiveBoardId,
              currentDoc.content_json
            );
            if (!isMounted) return;
            setNodes(importedNodes);
            setEdges(importedEdges);
            return;
          } catch (e) {
            console.error('[CanvasView] Error parsing content_json:', e);
          }
        }

        if (effectiveBoardId === 'default') {
          const currentDocs = app.vault.documents;
          const welcomeDoc = currentDocs.find((d: DocumentItem) => d.id === 'welcome-to-noether') || currentDocs[0];
          const initialNodes: CanvasNode[] = [
            {
              id: `node-${Date.now()}-1`,
              board_id: effectiveBoardId,
              type: 'text',
              x: 200,
              y: 150,
              width: 260,
              height: 160,
              text_content: '💡 Welcome to your Infinite Spatial Canvas! You can organize thoughts, drag cards, and connect notes.',
              color: '#1e1e1e',
            },
          ];
          if (welcomeDoc) {
            initialNodes.push({
              id: `node-${Date.now()}-2`,
              board_id: effectiveBoardId,
              type: 'note',
              x: 520,
              y: 150,
              width: 320,
              height: 260,
              document_id: welcomeDoc.id,
              color: '#1e1e1e',
            });
          }
          if (!isMounted) return;
          setNodes(initialNodes);
          setEdges([]);
          for (const n of initialNodes) {
            await saveCanvasNode(n);
          }
        } else {
          if (!isMounted) return;
          setNodes([]);
          setEdges([]);
        }
      }
    }

    loadBoard();

    return () => {
      isMounted = false;
      flushCanvasSaves();
    };
  }, [effectiveBoardId, flushCanvasSaves]);

  // Prune canvas nodes and connected edges in real time if notes are deleted from sidebar or trash
  useEffect(() => {
    if (!app?.events) return;
    const sub = app.events.on('document:deleted', ({ id }) => {
      if (!id) return;
      const toRemove = nodesRef.current.filter(
        (n) => n.id === id || (n.type === 'note' && n.document_id === id)
      );
      if (toRemove.length === 0) return;
      const removeIds = new Set(toRemove.map((n) => n.id));
      const remainingNodes = nodesRef.current.filter((n) => !removeIds.has(n.id));
      const remainingEdges = edgesRef.current.filter(
        (e) => !removeIds.has(e.from_node_id) && !removeIds.has(e.to_node_id)
      );
      nodesRef.current = remainingNodes;
      edgesRef.current = remainingEdges;
      setNodes(remainingNodes);
      setEdges(remainingEdges);
      setSelectedNodeIds((prev) => {
        const next = prev.filter((nid) => !removeIds.has(nid));
        selectedNodeIdsRef.current = next;
        return next;
      });
      setSelectedNodeId((prev) => (prev && removeIds.has(prev) ? null : prev));
      if (selectedEdgeIdRef.current) {
        const edgeStillExists = remainingEdges.some((e) => e.id === selectedEdgeIdRef.current);
        if (!edgeStillExists) {
          selectedEdgeIdRef.current = null;
          setSelectedEdgeId(null);
        }
      }
      triggerDiskSyncRef.current(effectiveBoardId);
    });
    return () => {
      sub.dispose();
    };
  }, [app?.events, effectiveBoardId]);

  const handleAddTextCard = useCallback(async () => {
    if (canvasReadOnlyRef.current) {
      showToast('Canvas is in read-only mode', 'warning');
      return;
    }
    recordSnapshot();
    const step = gridSize || 20;
    const cardHeight = 4 * step;
    let initialX = (-pan.x + 300) / zoom;
    let initialY = (-pan.y + 200) / zoom;
    if (canvasSnapGrid) {
      initialX = Math.round(initialX / step) * step;
      initialY = Math.round(initialY / step) * step;
    }
    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      board_id: effectiveBoardId,
      type: 'text',
      x: initialX,
      y: initialY,
      width: 260,
      height: cardHeight,
      text_content: '',
      color: '#1e1e1e',
    };
    await saveCanvasNode(newNode);
    triggerDiskSync(effectiveBoardId);
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setAutoEditingNodeId(newNode.id);
    showToast('Added note card', 'success');
  }, [pan.x, pan.y, zoom, canvasSnapGrid, gridSize, showToast, effectiveBoardId, triggerDiskSync, recordSnapshot]);

  const handleAddDocCard = useCallback(async (docId: string) => {
    if (canvasReadOnlyRef.current) {
      showToast('Canvas is in read-only mode', 'warning');
      return;
    }
    recordSnapshot();
    const step = gridSize || 20;
    let initialX = (-pan.x + 300) / zoom;
    let initialY = (-pan.y + 200) / zoom;
    if (canvasSnapGrid) {
      initialX = Math.round(initialX / step) * step;
      initialY = Math.round(initialY / step) * step;
    }
    const targetDoc = documents.find((d: DocumentItem) => d.id === docId);
    const isImg = isImageDocument(targetDoc);
    const initialW = isImg ? 340 : 320;
    const initialH = isImg ? 260 : 280;

    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      board_id: effectiveBoardId,
      type: 'note',
      x: initialX,
      y: initialY,
      width: initialW,
      height: initialH,
      document_id: docId,
      color: '#1e1e1e',
    };
    await saveCanvasNode(newNode);
    triggerDiskSync(effectiveBoardId);
    setNodes((prev) => [...prev, newNode]);
    showToast(isImg ? 'Added image to canvas' : 'Added document to canvas', 'success');
  }, [pan.x, pan.y, zoom, canvasSnapGrid, gridSize, showToast, effectiveBoardId, triggerDiskSync, documents, recordSnapshot]);

  const handleColorChange = useCallback(
    (id: string, color: string) => {
      if (canvasReadOnlyRef.current) return;
      recordSnapshot();
      setNodes((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, color } : n));
        const target = updated.find((n) => n.id === id);
        if (target) {
          saveCanvasNode(target);
          triggerDiskSync(target.board_id);
        }
        return updated;
      });
    },
    [triggerDiskSync, recordSnapshot]
  );

  const handleDeleteNode = useCallback(async (id: string, e?: React.MouseEvent) => {
    if (canvasReadOnlyRef.current) {
      showToast('Canvas is in read-only mode', 'warning');
      return;
    }
    if (e) e.stopPropagation();
    recordSnapshot();
    await deleteCanvasNode(id);
    triggerDiskSync(effectiveBoardId);
    setNodes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      nodesRef.current = next;
      return next;
    });
    setEdges((prev) => {
      const next = prev.filter((edge) => edge.from_node_id !== id && edge.to_node_id !== id);
      edgesRef.current = next;
      return next;
    });
    setSelectedNodeIds((prev) => prev.filter((i) => i !== id));
    setSelectedNodeId((prev) => (prev === id ? null : prev));
    showToast('Removed card', 'info');
  }, [effectiveBoardId, showToast, triggerDiskSync, recordSnapshot]);

  const handleDeleteSelectedNodes = useCallback(async () => {
    if (canvasReadOnlyRef.current) {
      showToast('Canvas is in read-only mode', 'warning');
      return;
    }
    const idsToDelete = selectedNodeIdsRef.current.length > 0
      ? [...selectedNodeIdsRef.current]
      : selectedNodeId ? [selectedNodeId] : [];

    if (idsToDelete.length === 0) return;

    recordSnapshot();
    const idSet = new Set(idsToDelete);

    for (const id of idsToDelete) {
      await deleteCanvasNode(id);
    }
    triggerDiskSync(effectiveBoardId);

    setNodes((prev) => {
      const next = prev.filter((n) => !idSet.has(n.id));
      nodesRef.current = next;
      return next;
    });
    setEdges((prev) => {
      const next = prev.filter((edge) => !idSet.has(edge.from_node_id) && !idSet.has(edge.to_node_id));
      edgesRef.current = next;
      return next;
    });
    setSelectedNodeIds([]);
    selectedNodeIdsRef.current = [];
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    selectedEdgeIdRef.current = null;
    showToast(idsToDelete.length > 1 ? `Removed ${idsToDelete.length} cards` : 'Removed card', 'info');
  }, [effectiveBoardId, selectedNodeId, showToast, triggerDiskSync, recordSnapshot]);

  const handleBatchColorChange = useCallback(
    (color: string) => {
      if (canvasReadOnlyRef.current) return;
      const targetIds = new Set(selectedNodeIdsRef.current);
      if (targetIds.size === 0 && selectedNodeId) {
        targetIds.add(selectedNodeId);
      }
      if (targetIds.size === 0) return;

      recordSnapshot();
      setNodes((prev) => {
        const updated = prev.map((n) => (targetIds.has(n.id) ? { ...n, color } : n));
        for (const n of updated) {
          if (targetIds.has(n.id)) {
            saveCanvasNode(n);
          }
        }
        triggerDiskSync(effectiveBoardId);
        return updated;
      });
    },
    [effectiveBoardId, recordSnapshot, selectedNodeId, triggerDiskSync]
  );

  const handleDuplicateSelectedNodes = useCallback(async () => {
    if (canvasReadOnlyRef.current) return;
    const targetIds = selectedNodeIdsRef.current.length > 0
      ? selectedNodeIdsRef.current
      : selectedNodeId ? [selectedNodeId] : [];

    if (targetIds.length === 0) return;

    recordSnapshot();
    const step = gridSizeRef.current || 20;
    const offset = step;
    const targetSet = new Set(targetIds);
    const toClone = nodesRef.current.filter((n) => targetSet.has(n.id));

    const newNodes: CanvasNode[] = [];
    const newIds: string[] = [];
    const oldToNewIdMap = new Map<string, string>();

    for (let i = 0; i < toClone.length; i++) {
      const src = toClone[i];
      const newId = `node-${Date.now()}-${i}`;
      oldToNewIdMap.set(src.id, newId);
      const clone: CanvasNode = {
        ...src,
        id: newId,
        x: src.x + offset,
        y: src.y + offset,
      };
      newNodes.push(clone);
      newIds.push(newId);
      await saveCanvasNode(clone);
    }

    // Clone internal edges connecting duplicated cards
    const newEdges: CanvasEdge[] = [];
    for (const edge of edgesRef.current) {
      if (oldToNewIdMap.has(edge.from_node_id) && oldToNewIdMap.has(edge.to_node_id)) {
        const clonedEdge: CanvasEdge = {
          ...edge,
          id: `edge-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          board_id: effectiveBoardId,
          from_node_id: oldToNewIdMap.get(edge.from_node_id)!,
          to_node_id: oldToNewIdMap.get(edge.to_node_id)!,
        };
        newEdges.push(clonedEdge);
        await saveCanvasEdge(clonedEdge);
      }
    }

    triggerDiskSync(effectiveBoardId);
    setNodes((prev) => {
      const next = [...prev, ...newNodes];
      nodesRef.current = next;
      return next;
    });
    if (newEdges.length > 0) {
      setEdges((prev) => {
        const next = [...prev, ...newEdges];
        edgesRef.current = next;
        return next;
      });
    }
    setSelectedNodeIds(newIds);
    selectedNodeIdsRef.current = newIds;
    setSelectedNodeId(newIds[newIds.length - 1] || null);
    showToast(newNodes.length > 1 ? `Duplicated ${newNodes.length} cards` : 'Duplicated card', 'info');
  }, [effectiveBoardId, recordSnapshot, selectedNodeId, showToast, triggerDiskSync]);

  const handleNudgeSelectedNodes = useCallback(
    (dx: number, dy: number) => {
      if (canvasReadOnlyRef.current) return;
      const targetIds = selectedNodeIdsRef.current.length > 0
        ? new Set(selectedNodeIdsRef.current)
        : selectedNodeId ? new Set([selectedNodeId]) : null;

      if (!targetIds || targetIds.size === 0) return;

      recordSnapshot();
      setNodes((prev) => {
        const updated = prev.map((n) => {
          if (!targetIds.has(n.id)) return n;
          return {
            ...n,
            x: n.x + dx,
            y: n.y + dy,
          };
        });
        nodesRef.current = updated;
        for (const n of updated) {
          if (targetIds.has(n.id)) {
            saveCanvasNode(n);
          }
        }
        triggerDiskSync(effectiveBoardId);
        return updated;
      });
    },
    [effectiveBoardId, recordSnapshot, selectedNodeId, triggerDiskSync]
  );

  const handleOpenDoc = useCallback(
    (docId?: string) => {
      if (docId) {
        setActiveDocumentById(docId);
        setMainViewMode('document');
      }
    },
    [setActiveDocumentById, setMainViewMode]
  );

  const docMap = useMemo(() => {
    const map = new Map<string, DocumentItem>();
    for (const d of documents) {
      map.set(d.id, d);
    }
    return map;
  }, [documents]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, CanvasNode>();
    for (const n of nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [nodes]);

  const createEdge = useCallback(
    async (
      fromNodeId: string,
      fromSide: CanvasNodeSide,
      toNodeId: string,
      toSide: CanvasNodeSide
    ) => {
      if (canvasReadOnlyRef.current) return;
      if (fromNodeId === toNodeId) return;

      const exactDuplicate = edgesRef.current.some(
        (e) =>
          e.from_node_id === fromNodeId &&
          (e.from_side || 'right') === fromSide &&
          e.to_node_id === toNodeId &&
          (e.to_side || 'left') === toSide
      );

      if (exactDuplicate) {
        return;
      }

      recordSnapshot();

      const newEdge: CanvasEdge = {
        id: `edge-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        board_id: effectiveBoardId,
        from_node_id: fromNodeId,
        from_side: fromSide,
        to_node_id: toNodeId,
        to_side: toSide,
      };

      setEdges((prev) => [...prev, newEdge]);
      edgesRef.current = [...edgesRef.current, newEdge];
      await saveCanvasEdge(newEdge);
      triggerDiskSync(effectiveBoardId);
      showToast('Connected cards', 'info');
    },
    [effectiveBoardId, recordSnapshot, showToast, triggerDiskSync]
  );

  const handleDeleteEdge = useCallback(
    async (edgeId: string) => {
      if (canvasReadOnlyRef.current) return;
      recordSnapshot();
      await deleteCanvasEdge(edgeId);
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
      edgesRef.current = edgesRef.current.filter((e) => e.id !== edgeId);
      if (selectedEdgeIdRef.current === edgeId) {
        setSelectedEdgeId(null);
        selectedEdgeIdRef.current = null;
      }
      if (editingEdgeLabelIdRef.current === edgeId) {
        editingEdgeLabelIdRef.current = null;
        editingLabelDraftRef.current = '';
        setEditingEdgeLabelId(null);
        setEditingLabelDraft('');
      }
      triggerDiskSync(effectiveBoardId);
      showToast('Removed connection', 'info');
    },
    [effectiveBoardId, recordSnapshot, showToast, triggerDiskSync]
  );

  const handleDeleteEdgeRef = useRef(handleDeleteEdge);
  useEffect(() => {
    handleDeleteEdgeRef.current = handleDeleteEdge;
  }, [handleDeleteEdge]);

  const handleUpdateEdge = useCallback(
    async (edgeId: string, updates: Partial<CanvasEdge>) => {
      if (canvasReadOnlyRef.current) return;
      const currentEdge = edgesRef.current.find((e) => e.id === edgeId);
      if (!currentEdge) return;

      // Avoid redundant DB writes if nothing changed
      const hasChanges = Object.keys(updates).some((key) => {
        const k = key as keyof CanvasEdge;
        return currentEdge[k] !== updates[k];
      });
      if (!hasChanges) return;

      recordSnapshot();
      const updatedEdge: CanvasEdge = {
        ...currentEdge,
        ...updates,
      };

      await saveCanvasEdge(updatedEdge);
      setEdges((prev) => prev.map((e) => (e.id === edgeId ? updatedEdge : e)));
      edgesRef.current = edgesRef.current.map((e) => (e.id === edgeId ? updatedEdge : e));
      triggerDiskSync(effectiveBoardId);
    },
    [effectiveBoardId, recordSnapshot, triggerDiskSync]
  );

  const editingEdgeLabelIdRef = useRef<string | null>(null);
  const editingLabelDraftRef = useRef<string>('');

  const startEditingEdgeLabel = useCallback((edgeId: string, initialText: string) => {
    editingEdgeLabelIdRef.current = edgeId;
    editingLabelDraftRef.current = initialText;
    setEditingEdgeLabelId(edgeId);
    setEditingLabelDraft(initialText);
  }, []);

  const handleDraftChange = useCallback((draft: string) => {
    editingLabelDraftRef.current = draft;
    setEditingLabelDraft(draft);
  }, []);

  const cancelEditingEdgeLabel = useCallback(() => {
    editingEdgeLabelIdRef.current = null;
    editingLabelDraftRef.current = '';
    setEditingEdgeLabelId(null);
    setEditingLabelDraft('');
  }, []);

  const commitActiveEdgeLabel = useCallback(() => {
    const edgeId = editingEdgeLabelIdRef.current;
    if (edgeId) {
      const draft = editingLabelDraftRef.current.trim();
      editingEdgeLabelIdRef.current = null;
      editingLabelDraftRef.current = '';
      setEditingEdgeLabelId(null);
      setEditingLabelDraft('');
      handleUpdateEdge(edgeId, { label: draft });
    }
  }, [handleUpdateEdge]);

  const cancelArrowTargetingOrFocus = useCallback(() => {
    let didCancel = false;
    if (draftEdgeRef.current) {
      if (ghostLeaveTimeoutRef.current) {
        clearTimeout(ghostLeaveTimeoutRef.current);
        ghostLeaveTimeoutRef.current = null;
      }
      setDraftEdge(null);
      draftEdgeRef.current = null;
      setDragGhost(null);
      pendingEdgeConnectionRef.current = null;
      didCancel = true;
    }
    if (selectedEdgeIdRef.current) {
      if (editingEdgeLabelIdRef.current) {
        commitActiveEdgeLabel();
      }
      setSelectedEdgeId(null);
      selectedEdgeIdRef.current = null;
      didCancel = true;
    }
    if (didCancel) {
      lastArrowCancelTimeRef.current = Date.now();
      closeContextMenu();
    }
    return didCancel;
  }, [closeContextMenu, commitActiveEdgeLabel]);

  const retargetEdge = useCallback(
    async (
      edgeId: string,
      endpoint: 'source' | 'target',
      newNodeId: string,
      newSide: CanvasNodeSide
    ) => {
      if (canvasReadOnlyRef.current) return;
      const currentEdge = edgesRef.current.find((e) => e.id === edgeId);
      if (!currentEdge) return;

      const fromNode = nodeMap.get(currentEdge.from_node_id);
      const toNode = nodeMap.get(currentEdge.to_node_id);
      const defaultSides =
        fromNode && toNode
          ? determineDefaultConnectingSides(fromNode, toNode)
          : { fromSide: 'right' as CanvasNodeSide, toSide: 'left' as CanvasNodeSide };
      const currentFromSide = currentEdge.from_side || defaultSides.fromSide;
      const currentToSide = currentEdge.to_side || defaultSides.toSide;

      if (endpoint === 'target') {
        if (currentEdge.from_node_id === newNodeId) return;
        if (currentEdge.to_node_id === newNodeId && currentToSide === newSide) return;

        const duplicate = edgesRef.current.some(
          (e) =>
            e.id !== edgeId &&
            e.from_node_id === currentEdge.from_node_id &&
            e.to_node_id === newNodeId &&
            (e.from_side || 'right') === currentFromSide &&
            (e.to_side || 'left') === newSide
        );

        recordSnapshot();

        if (duplicate) {
          setEdges((prev) => prev.filter((e) => e.id !== edgeId));
          edgesRef.current = edgesRef.current.filter((e) => e.id !== edgeId);
          await deleteCanvasEdge(edgeId);
        } else {
          const updatedEdge: CanvasEdge = {
            ...currentEdge,
            from_side: currentFromSide,
            to_node_id: newNodeId,
            to_side: newSide,
          };
          setEdges((prev) => prev.map((e) => (e.id === edgeId ? updatedEdge : e)));
          edgesRef.current = edgesRef.current.map((e) => (e.id === edgeId ? updatedEdge : e));
          await saveCanvasEdge(updatedEdge);
        }
      } else {
        if (currentEdge.to_node_id === newNodeId) return;
        if (currentEdge.from_node_id === newNodeId && currentFromSide === newSide) return;

        const duplicate = edgesRef.current.some(
          (e) =>
            e.id !== edgeId &&
            e.from_node_id === newNodeId &&
            e.to_node_id === currentEdge.to_node_id &&
            (e.from_side || 'right') === newSide &&
            (e.to_side || 'left') === currentToSide
        );

        recordSnapshot();

        if (duplicate) {
          setEdges((prev) => prev.filter((e) => e.id !== edgeId));
          edgesRef.current = edgesRef.current.filter((e) => e.id !== edgeId);
          await deleteCanvasEdge(edgeId);
        } else {
          const updatedEdge: CanvasEdge = {
            ...currentEdge,
            from_node_id: newNodeId,
            from_side: newSide,
            to_side: currentToSide,
          };
          setEdges((prev) => prev.map((e) => (e.id === edgeId ? updatedEdge : e)));
          edgesRef.current = edgesRef.current.map((e) => (e.id === edgeId ? updatedEdge : e));
          await saveCanvasEdge(updatedEdge);
        }
      }

      triggerDiskSync(effectiveBoardId);
      showToast('Retargeted connection', 'info');
    },
    [effectiveBoardId, nodeMap, recordSnapshot, showToast, triggerDiskSync]
  );

  const clearTextSelection = useCallback(() => {
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        sel.removeAllRanges();
      }
      if (document.activeElement instanceof HTMLElement) {
        if (
          document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA' ||
          document.activeElement.isContentEditable ||
          document.activeElement.closest('.ProseMirror, .noether-compact-doc, .document-view-root')
        ) {
          document.activeElement.blur();
        }
      }
    } catch {}
  }, []);

  const handleSelectEdge = useCallback((edgeId: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    clearTextSelection();
    commitActiveEdgeLabel();
    setSelectedEdgeId(edgeId);
    selectedEdgeIdRef.current = edgeId;
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    selectedNodeIdsRef.current = [];
  }, [clearTextSelection, commitActiveEdgeLabel]);

  const getCardDimensions = useCallback((type: CanvasDockActionType) => {
    const step = gridSizeRef.current || 20;
    switch (type) {
      case 'card':
        return { width: 260, height: 4 * step };
      case 'note':
        return { width: 320, height: 280 };
      case 'media':
        return { width: 340, height: 260 };
    }
  }, []);

  const openUnconnectedEdgeMenu = useCallback(
    (
      clientPos: { clientX: number; clientY: number },
      dropCanvasPos: { canvasX: number; canvasY: number },
      activeDraft: DraftEdgeState
    ) => {
      const isRetargetingSource = activeDraft.editingEndpoint === 'source';
      const anchorNodeId = isRetargetingSource
        ? (activeDraft.fixedNodeId || activeDraft.fromNodeId)
        : activeDraft.fromNodeId;
      const anchorNode = nodesRef.current.find((n) => n.id === anchorNodeId) || nodeMap.get(anchorNodeId);
      if (!anchorNode) {
        setDraftEdge(null);
        draftEdgeRef.current = null;
        return;
      }

      const anchorSide = isRetargetingSource
        ? (activeDraft.fixedSide || 'left')
        : activeDraft.fromSide;
      const fixedAnchorPoint = getSideAnchorPoint(anchorNode, anchorSide);

      const step = gridSizeRef.current || 20;
      const anchorX = canvasSnapGridRef.current
        ? Math.round(dropCanvasPos.canvasX / step) * step
        : dropCanvasPos.canvasX;
      const anchorY = canvasSnapGridRef.current
        ? Math.round(dropCanvasPos.canvasY / step) * step
        : dropCanvasPos.canvasY;

      // Freeze draft in 'menu' mode so it stays active at the release coordinates
      const frozenDraft: DraftEdgeState = {
        ...activeDraft,
        mode: 'menu',
        currentCanvasX: anchorX,
        currentCanvasY: anchorY,
        snappedTarget: null,
      };
      setDraftEdge(frozenDraft);
      draftEdgeRef.current = frozenDraft;

      const computeGhostForType = (type: CanvasDockActionType) => {
        const dims = getCardDimensions(type);

        let cardSide: CanvasNodeSide;
        if (isRetargetingSource) {
          const dx = fixedAnchorPoint.x - anchorX;
          const dy = fixedAnchorPoint.y - anchorY;
          if (Math.abs(dx) >= Math.abs(dy)) {
            cardSide = dx >= 0 ? 'right' : 'left';
          } else {
            cardSide = dy >= 0 ? 'bottom' : 'top';
          }
        } else {
          const dx = anchorX - fixedAnchorPoint.x;
          const dy = anchorY - fixedAnchorPoint.y;
          if (Math.abs(dx) >= Math.abs(dy)) {
            cardSide = dx >= 0 ? 'left' : 'right';
          } else {
            cardSide = dy >= 0 ? 'top' : 'bottom';
          }
        }

        let finalX = anchorX;
        let finalY = anchorY;
        if (cardSide === 'left') {
          finalX = anchorX;
          finalY = anchorY - dims.height / 2;
        } else if (cardSide === 'right') {
          finalX = anchorX - dims.width;
          finalY = anchorY - dims.height / 2;
        } else if (cardSide === 'top') {
          finalX = anchorX - dims.width / 2;
          finalY = anchorY;
        } else if (cardSide === 'bottom') {
          finalX = anchorX - dims.width / 2;
          finalY = anchorY - dims.height;
        }

        const exactAnchor = { x: anchorX, y: anchorY };

        return { dims, cardSide, finalX, finalY, exactAnchor };
      };

      const handleItemHover = (type: CanvasDockActionType) => {
        if (ghostLeaveTimeoutRef.current) {
          clearTimeout(ghostLeaveTimeoutRef.current);
          ghostLeaveTimeoutRef.current = null;
        }
        const { dims, cardSide, finalX, finalY, exactAnchor } = computeGhostForType(type);
        setDragGhost({
          type,
          screenX: 0,
          screenY: 0,
          canvasX: finalX,
          canvasY: finalY,
          width: dims.width,
          height: dims.height,
        });
        const ghostDraft: DraftEdgeState = {
          ...frozenDraft,
          currentCanvasX: exactAnchor.x,
          currentCanvasY: exactAnchor.y,
          snappedTarget: {
            nodeId: '__ghost__',
            side: cardSide,
            point: exactAnchor,
            distance: 0,
          },
        };
        setDraftEdge(ghostDraft);
        draftEdgeRef.current = ghostDraft;
      };

      const handleItemLeave = () => {
        if (ghostLeaveTimeoutRef.current) {
          clearTimeout(ghostLeaveTimeoutRef.current);
        }
        ghostLeaveTimeoutRef.current = setTimeout(() => {
          setDragGhost(null);
          setDraftEdge(frozenDraft);
          draftEdgeRef.current = frozenDraft;
        }, 40);
      };

      const handleAddCard = async () => {
        isCompletingUnconnectedDropRef.current = true;
        if (ghostLeaveTimeoutRef.current) {
          clearTimeout(ghostLeaveTimeoutRef.current);
          ghostLeaveTimeoutRef.current = null;
        }
        const { dims, cardSide, finalX, finalY } = computeGhostForType('card');
        recordSnapshot();
        const newNode: CanvasNode = {
          id: `node-${Date.now()}`,
          board_id: effectiveBoardId,
          type: 'text',
          x: finalX,
          y: finalY,
          width: dims.width,
          height: dims.height,
          text_content: '',
          color: '',
        };

        // 1. Immediately update nodes in memory and refs
        nodesRef.current = [...nodesRef.current, newNode];
        setNodes(nodesRef.current);
        setSelectedNodeId(newNode.id);
        setSelectedEdgeId(null);
        selectedEdgeIdRef.current = null;
        setAutoEditingNodeId(newNode.id);

        // 2. Immediately retarget or create edge in memory and refs
        let edgeToPersist: CanvasEdge | null = null;
        if (activeDraft.editingEdgeId) {
          const edgeId = activeDraft.editingEdgeId;
          const currentEdge = edgesRef.current.find((e) => e.id === edgeId);
          if (currentEdge) {
            const endpoint = activeDraft.editingEndpoint || 'target';
            const updatedEdge: CanvasEdge =
              endpoint === 'source'
                ? { ...currentEdge, from_node_id: newNode.id, from_side: cardSide }
                : { ...currentEdge, to_node_id: newNode.id, to_side: cardSide };
            edgesRef.current = edgesRef.current.map((e) => (e.id === edgeId ? updatedEdge : e));
            setEdges(edgesRef.current);
            edgeToPersist = updatedEdge;
          }
        } else {
          const newEdge: CanvasEdge = {
            id: `edge-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            board_id: effectiveBoardId,
            from_node_id: activeDraft.fromNodeId,
            from_side: activeDraft.fromSide,
            to_node_id: newNode.id,
            to_side: cardSide,
          };
          edgesRef.current = [...edgesRef.current, newEdge];
          setEdges(edgesRef.current);
          edgeToPersist = newEdge;
        }

        // 3. Clear draft and ghost in this exact same frame
        setDraftEdge(null);
        draftEdgeRef.current = null;
        setDragGhost(null);
        pendingEdgeConnectionRef.current = null;
        isCompletingUnconnectedDropRef.current = false;

        // 4. Background persistence
        await saveCanvasNode(newNode);
        if (edgeToPersist) {
          await saveCanvasEdge(edgeToPersist);
        }
        triggerDiskSync(effectiveBoardId);
        showToast('Added card', 'info');
      };

      const handleAddNote = () => {
        isCompletingUnconnectedDropRef.current = true;
        if (ghostLeaveTimeoutRef.current) {
          clearTimeout(ghostLeaveTimeoutRef.current);
          ghostLeaveTimeoutRef.current = null;
        }
        const { dims, cardSide, finalX, finalY } = computeGhostForType('note');
        pendingEdgeConnectionRef.current = {
          fromNodeId: activeDraft.fromNodeId,
          fromSide: activeDraft.fromSide,
          editingEdgeId: activeDraft.editingEdgeId,
          editingEndpoint: activeDraft.editingEndpoint,
          incomingSide: cardSide,
        };
        isDroppingIntoModalRef.current = true;
        setDragGhost({
          type: 'note',
          screenX: 0,
          screenY: 0,
          canvasX: finalX,
          canvasY: finalY,
          width: dims.width,
          height: dims.height,
        });
        setSearchModalState({
          isOpen: true,
          mode: 'note',
          targetCanvasX: finalX,
          targetCanvasY: finalY,
        });
      };

      const handleAddMedia = () => {
        isCompletingUnconnectedDropRef.current = true;
        if (ghostLeaveTimeoutRef.current) {
          clearTimeout(ghostLeaveTimeoutRef.current);
          ghostLeaveTimeoutRef.current = null;
        }
        const { dims, cardSide, finalX, finalY } = computeGhostForType('media');
        pendingEdgeConnectionRef.current = {
          fromNodeId: activeDraft.fromNodeId,
          fromSide: activeDraft.fromSide,
          editingEdgeId: activeDraft.editingEdgeId,
          editingEndpoint: activeDraft.editingEndpoint,
          incomingSide: cardSide,
        };
        isDroppingIntoModalRef.current = true;
        setDragGhost({
          type: 'media',
          screenX: 0,
          screenY: 0,
          canvasX: finalX,
          canvasY: finalY,
          width: dims.width,
          height: dims.height,
        });
        setSearchModalState({
          isOpen: true,
          mode: 'media',
          targetCanvasX: finalX,
          targetCanvasY: finalY,
        });
      };

      const menuItems = buildUnconnectedEdgeContextMenu({
        onAddCard: handleAddCard,
        onHoverCard: () => handleItemHover('card'),
        onAddNote: handleAddNote,
        onHoverNote: () => handleItemHover('note'),
        onAddMedia: handleAddMedia,
        onHoverMedia: () => handleItemHover('media'),
        onLeaveItem: handleItemLeave,
      });

      showContextMenu(
        { x: clientPos.clientX, y: clientPos.clientY },
        menuItems,
        {
          onClose: () => {
            if (ghostLeaveTimeoutRef.current) {
              clearTimeout(ghostLeaveTimeoutRef.current);
              ghostLeaveTimeoutRef.current = null;
            }
            if (!isDroppingIntoModalRef.current && !isCompletingUnconnectedDropRef.current) {
              setDraftEdge(null);
              draftEdgeRef.current = null;
              setDragGhost(null);
              pendingEdgeConnectionRef.current = null;
            }
            isDroppingIntoModalRef.current = false;
          },
        }
      );
    },
    [
      createEdge,
      effectiveBoardId,
      getCardDimensions,
      nodeMap,
      recordSnapshot,
      retargetEdge,
      showContextMenu,
      showToast,
      triggerDiskSync,
    ]
  );

  const handleEdgePointerDown = useCallback(
    (
      edge: CanvasEdge,
      e: React.PointerEvent,
      targetEndpoint: 'source' | 'target' | 'auto' = 'auto'
    ) => {
      if (canvasReadOnlyRef.current || e.button !== 0) return;
      if ((e.target as HTMLElement).closest('.canvas-edge-action-pill, .canvas-edge-delete')) return;

      clearTextSelection();
      e.stopPropagation();
      e.preventDefault();

      if (draftEdgeRef.current && draftEdgeRef.current.mode === 'click') return;

      const fromNode = nodeMap.get(edge.from_node_id);
      const toNode = nodeMap.get(edge.to_node_id);
      if (!fromNode || !toNode) return;

      const defaultSides = determineDefaultConnectingSides(fromNode, toNode);
      const fromSide = edge.from_side || defaultSides.fromSide;
      const toSide = edge.to_side || defaultSides.toSide;

      const p1 = getSideAnchorPoint(fromNode, fromSide);
      const p2 = getSideAnchorPoint(toNode, toSide);

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clickCanvasX = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
      const clickCanvasY = (e.clientY - rect.top - panRef.current.y) / zoomRef.current;

      let resolvedEndpoint: 'source' | 'target' = 'target';
      if (targetEndpoint === 'source') {
        resolvedEndpoint = 'source';
      } else if (targetEndpoint === 'target') {
        resolvedEndpoint = 'target';
      } else {
        const distToP1 = Math.hypot(clickCanvasX - p1.x, clickCanvasY - p1.y);
        const distToP2 = Math.hypot(clickCanvasX - p2.x, clickCanvasY - p2.y);
        resolvedEndpoint = distToP1 < distToP2 ? 'source' : 'target';
      }

      handleSelectEdge(edge.id, e);

      const startClient = { x: e.clientX, y: e.clientY };
      let movedBeyondThreshold = false;

      const handlePointerMove = (moveEv: PointerEvent) => {
        if ((moveEv.buttons & 2) !== 0) {
          stopEdgeAutoScroll();
          window.removeEventListener('pointermove', handlePointerMove);
          window.removeEventListener('pointerup', handlePointerUp);
          cancelArrowTargetingOrFocus();
          return;
        }

        const dx = moveEv.clientX - startClient.x;
        const dy = moveEv.clientY - startClient.y;
        if (!movedBeyondThreshold && Math.sqrt(dx * dx + dy * dy) > 4) {
          movedBeyondThreshold = true;
        }

        if (!movedBeyondThreshold) return;

        const currentContainer = containerRef.current;
        if (!currentContainer) return;
        const cRect = currentContainer.getBoundingClientRect();
        const curCanvasX = (moveEv.clientX - cRect.left - panRef.current.x) / zoomRef.current;
        const curCanvasY = (moveEv.clientY - cRect.top - panRef.current.y) / zoomRef.current;

        const excludeNodeId = resolvedEndpoint === 'target' ? edge.from_node_id : edge.to_node_id;
        const snap = findTargetSideSnap(
          nodesRef.current,
          { x: curCanvasX, y: curCanvasY },
          excludeNodeId,
          Math.max(44 / zoomRef.current, 36)
        );

        const currentDraft: DraftEdgeState = {
          fromNodeId: resolvedEndpoint === 'target' ? edge.from_node_id : (snap ? snap.nodeId : ''),
          fromSide: resolvedEndpoint === 'target' ? fromSide : (snap ? snap.side : 'right'),
          currentCanvasX: snap ? snap.point.x : curCanvasX,
          currentCanvasY: snap ? snap.point.y : curCanvasY,
          snappedTarget: snap,
          mode: 'drag',
          editingEdgeId: edge.id,
          editingEndpoint: resolvedEndpoint,
          fixedNodeId: resolvedEndpoint === 'target' ? edge.from_node_id : edge.to_node_id,
          fixedSide: resolvedEndpoint === 'target' ? fromSide : toSide,
        };

        setDraftEdge(currentDraft);
        draftEdgeRef.current = currentDraft;
      };

      const handlePointerUp = (upEv: PointerEvent) => {
        stopEdgeAutoScroll();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);

        if (Date.now() - lastArrowCancelTimeRef.current < 400) {
          cancelArrowTargetingOrFocus();
          return;
        }

        if (movedBeyondThreshold) {
          const currentDraft = draftEdgeRef.current;
          const excludeNodeId = resolvedEndpoint === 'target' ? edge.from_node_id : edge.to_node_id;
          const target =
            currentDraft?.snappedTarget ||
            (currentDraft
              ? findTargetSideSnap(
                  nodesRef.current,
                  { x: currentDraft.currentCanvasX, y: currentDraft.currentCanvasY },
                  excludeNodeId,
                  Math.max(44 / zoomRef.current, 36)
                )
              : null);

          if (target) {
            retargetEdge(
              edge.id,
              resolvedEndpoint,
              target.nodeId,
              target.side
            );
            setDraftEdge(null);
            draftEdgeRef.current = null;
          } else if (currentDraft) {
            openUnconnectedEdgeMenu(
              { clientX: upEv.clientX, clientY: upEv.clientY },
              { canvasX: currentDraft.currentCanvasX, canvasY: currentDraft.currentCanvasY },
              currentDraft
            );
          } else {
            setDraftEdge(null);
            draftEdgeRef.current = null;
          }
        } else if (targetEndpoint !== 'auto') {
          const currentContainer = containerRef.current;
          if (!currentContainer) return;
          const cRect = currentContainer.getBoundingClientRect();
          const curCanvasX = (startClient.x - cRect.left - panRef.current.x) / zoomRef.current;
          const curCanvasY = (startClient.y - cRect.top - panRef.current.y) / zoomRef.current;

          const excludeNodeId = resolvedEndpoint === 'target' ? edge.from_node_id : edge.to_node_id;
          const snap = findTargetSideSnap(
            nodesRef.current,
            { x: curCanvasX, y: curCanvasY },
            excludeNodeId,
            Math.max(44 / zoomRef.current, 36)
          );

          const clickDraft: DraftEdgeState = {
            fromNodeId: resolvedEndpoint === 'target' ? edge.from_node_id : (snap ? snap.nodeId : ''),
            fromSide: resolvedEndpoint === 'target' ? fromSide : (snap ? snap.side : 'right'),
            currentCanvasX: snap ? snap.point.x : curCanvasX,
            currentCanvasY: snap ? snap.point.y : curCanvasY,
            snappedTarget: snap,
            mode: 'click',
            editingEdgeId: edge.id,
            editingEndpoint: resolvedEndpoint,
            fixedNodeId: resolvedEndpoint === 'target' ? edge.from_node_id : edge.to_node_id,
            fixedSide: resolvedEndpoint === 'target' ? fromSide : toSide,
          };
          setDraftEdge(clickDraft);
          draftEdgeRef.current = clickDraft;
        }
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [cancelArrowTargetingOrFocus, clearTextSelection, handleSelectEdge, nodeMap, retargetEdge, openUnconnectedEdgeMenu]
  );

  const handleSideDotPointerDown = useCallback(
    (nodeId: string, side: CanvasNodeSide, e: React.PointerEvent) => {
      if (canvasReadOnlyRef.current) return;
      e.stopPropagation();
      e.preventDefault();

      // If already drafting in click mode and clicking another card's side dot: connect!
      if (draftEdgeRef.current && draftEdgeRef.current.mode === 'click') {
        const isRetargetingSource = draftEdgeRef.current.editingEndpoint === 'source';
        const fixedId = isRetargetingSource
          ? (draftEdgeRef.current.fixedNodeId || draftEdgeRef.current.fromNodeId)
          : draftEdgeRef.current.fromNodeId;

        if (nodeId !== fixedId) {
          if (draftEdgeRef.current.editingEdgeId) {
            retargetEdge(
              draftEdgeRef.current.editingEdgeId,
              draftEdgeRef.current.editingEndpoint || 'target',
              nodeId,
              side
            );
          } else {
            createEdge(draftEdgeRef.current.fromNodeId, draftEdgeRef.current.fromSide, nodeId, side);
          }
        }
        setDraftEdge(null);
        draftEdgeRef.current = null;
        return;
      }

      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node) return;

      const anchor = getSideAnchorPoint(node, side);
      const startClient = { x: e.clientX, y: e.clientY };
      let movedBeyondThreshold = false;

      const initialDraft: DraftEdgeState = {
        fromNodeId: nodeId,
        fromSide: side,
        currentCanvasX: anchor.x,
        currentCanvasY: anchor.y,
        snappedTarget: null,
        mode: 'click',
      };
      setDraftEdge(initialDraft);
      draftEdgeRef.current = initialDraft;

      const handlePointerMove = (moveEv: PointerEvent) => {
        if ((moveEv.buttons & 2) !== 0) {
          stopEdgeAutoScroll();
          window.removeEventListener('pointermove', handlePointerMove);
          window.removeEventListener('pointerup', handlePointerUp);
          cancelArrowTargetingOrFocus();
          return;
        }

        const dx = moveEv.clientX - startClient.x;
        const dy = moveEv.clientY - startClient.y;
        if (!movedBeyondThreshold && Math.sqrt(dx * dx + dy * dy) > 4) {
          movedBeyondThreshold = true;
          if (draftEdgeRef.current) {
            draftEdgeRef.current.mode = 'drag';
          }
        }

        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const curCanvasX = (moveEv.clientX - rect.left - panRef.current.x) / zoomRef.current;
        const curCanvasY = (moveEv.clientY - rect.top - panRef.current.y) / zoomRef.current;

        const snap = findTargetSideSnap(
          nodesRef.current,
          { x: curCanvasX, y: curCanvasY },
          nodeId,
          Math.max(44 / zoomRef.current, 36)
        );

        setDraftEdge((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            mode: movedBeyondThreshold ? 'drag' : 'click',
            currentCanvasX: snap ? snap.point.x : curCanvasX,
            currentCanvasY: snap ? snap.point.y : curCanvasY,
            snappedTarget: snap,
          };
        });
      };

      const handlePointerUp = (upEv: PointerEvent) => {
        stopEdgeAutoScroll();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);

        if (Date.now() - lastArrowCancelTimeRef.current < 400) {
          cancelArrowTargetingOrFocus();
          return;
        }

        if (movedBeyondThreshold) {
          // DRAG mode: release to connect if snapped
          const currentDraft = draftEdgeRef.current;
          const target =
            currentDraft?.snappedTarget ||
            (currentDraft
              ? findTargetSideSnap(
                  nodesRef.current,
                  { x: currentDraft.currentCanvasX, y: currentDraft.currentCanvasY },
                  nodeId,
                  Math.max(44 / zoomRef.current, 36)
                )
              : null);

          if (target) {
            createEdge(
              currentDraft!.fromNodeId,
              currentDraft!.fromSide,
              target.nodeId,
              target.side
            );
            setDraftEdge(null);
            draftEdgeRef.current = null;
          } else if (currentDraft) {
            openUnconnectedEdgeMenu(
              { clientX: upEv.clientX, clientY: upEv.clientY },
              { canvasX: currentDraft.currentCanvasX, canvasY: currentDraft.currentCanvasY },
              currentDraft
            );
          } else {
            setDraftEdge(null);
            draftEdgeRef.current = null;
          }
        } else {
          // CLICK mode: keep drafting active so arrow follows pointer until next click or escape
          setDraftEdge((prev) => (prev ? { ...prev, mode: 'click' } : null));
        }
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [cancelArrowTargetingOrFocus, createEdge, retargetEdge, openUnconnectedEdgeMenu]
  );

  const performDraftEdgeUpdate = useCallback((clientX: number, clientY: number) => {
    if (!draftEdgeRef.current || draftEdgeRef.current.mode === 'menu') return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const curCanvasX = (clientX - rect.left - panRef.current.x) / zoomRef.current;
    const curCanvasY = (clientY - rect.top - panRef.current.y) / zoomRef.current;

    const isRetargetingSource = draftEdgeRef.current.editingEndpoint === 'source';
    const excludeId = isRetargetingSource
      ? (draftEdgeRef.current.fixedNodeId || '')
      : draftEdgeRef.current.fromNodeId;

    const snap = findTargetSideSnap(
      nodesRef.current,
      { x: curCanvasX, y: curCanvasY },
      excludeId,
      Math.max(44 / zoomRef.current, 36)
    );

    setDraftEdge((prev) => {
      if (!prev) return null;
      const updated: DraftEdgeState = {
        ...prev,
        currentCanvasX: snap ? snap.point.x : curCanvasX,
        currentCanvasY: snap ? snap.point.y : curCanvasY,
        snappedTarget: snap,
      };
      draftEdgeRef.current = updated;
      return updated;
    });
  }, []);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draftEdgeRef.current || draftEdgeRef.current.mode !== 'click') return;
    performDraftEdgeUpdate(e.clientX, e.clientY);
  }, [performDraftEdgeUpdate]);

  // Keyboard shortcuts: Delete/Backspace to remove card/edge, Ctrl+Z / Ctrl+Y for Undo/Redo
  useEffect(() => {
    const handleCanvasKeyDown = (e: KeyboardEvent) => {
      const target = (e.target || document.activeElement) as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        Boolean(target?.isContentEditable) ||
        Boolean(target?.closest('[contenteditable="true"], input, textarea'));

      // If user is editing text inside an input or note card, preserve standard text undo/redo
      if (isInput) return;

      // Ctrl+Z / Cmd+Z: Undo canvas action
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleUndo();
        return;
      }

      // Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z: Redo canvas action
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleRedo();
        return;
      }

      // Ctrl+A / Cmd+A: Select all cards on active canvas
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        e.stopPropagation();
        const allIds = nodesRef.current.map((n) => n.id);
        setSelectedNodeIds(allIds);
        selectedNodeIdsRef.current = allIds;
        setSelectedNodeId(allIds[allIds.length - 1] || null);
        return;
      }

      // Ctrl+D / Cmd+D: Duplicate selected card(s)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        e.stopPropagation();
        handleDuplicateSelectedNodes();
        return;
      }

      // Escape: Cancel active marquee, card drag, resize, draft edge, or clear selection
      if (e.key === 'Escape') {
        if (isMarqueeActiveRef.current || marqueeStartRef.current) {
          e.preventDefault();
          e.stopPropagation();
          isMarqueeActiveRef.current = false;
          marqueeStartRef.current = null;
          setMarqueeBox(null);
          setIsMarqueeActiveState(false);
          return;
        }
        if (draggingNodeIdRef.current || dragCandidateNodeIdRef.current) {
          e.preventDefault();
          e.stopPropagation();
          stopEdgeAutoScroll();
          if (dragDidMoveRef.current && multiDragInitialPositionsRef.current.size > 0) {
            const initPosMap = multiDragInitialPositionsRef.current;
            setNodes((prev) => {
              const updated = prev.map((n) => {
                const init = initPosMap.get(n.id);
                return init ? { ...n, x: init.x, y: init.y } : n;
              });
              nodesRef.current = updated;
              for (const n of updated) {
                if (initPosMap.has(n.id)) {
                  saveCanvasNode(n);
                }
              }
              return updated;
            });
            triggerDiskSyncRef.current(effectiveBoardId);
          }
          dragCandidateNodeIdRef.current = null;
          draggingNodeIdRef.current = null;
          dragDidMoveRef.current = false;
          setIsDraggingNodeState(false);
          setActiveGuides([]);
          setDragGhost(null);
          return;
        }
        if (resizingNodeIdRef.current) {
          e.preventDefault();
          e.stopPropagation();
          stopEdgeAutoScroll();
          if (resizeStartDimsRef.current) {
            const dims = resizeStartDimsRef.current;
            const resizeId = resizingNodeIdRef.current;
            setNodes((prev) => {
              const updated = prev.map((n) =>
                n.id === resizeId
                  ? { ...n, x: dims.x, y: dims.y, width: dims.width, height: dims.height }
                  : n
              );
              nodesRef.current = updated;
              const restored = updated.find((n) => n.id === resizeId);
              if (restored) saveCanvasNode(restored);
              return updated;
            });
            triggerDiskSyncRef.current(effectiveBoardId);
          }
          resizingNodeIdRef.current = null;
          resizeHandleRef.current = null;
          resizeDidMoveRef.current = false;
          setActiveGuides([]);
          return;
        }
        if (draftEdgeRef.current || selectedEdgeIdRef.current) {
          e.preventDefault();
          e.stopPropagation();
          cancelArrowTargetingOrFocus();
          return;
        }
        if (selectedNodeIdsRef.current.length > 0 || selectedNodeId) {
          e.preventDefault();
          e.stopPropagation();
          clearTextSelection();
          setSelectedNodeIds([]);
          selectedNodeIdsRef.current = [];
          setSelectedNodeId(null);
          return;
        }
      }

      // Delete / Backspace: Delete selected card(s) or edge
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (canvasReadOnlyRef.current) return;
        if (selectedEdgeIdRef.current) {
          e.preventDefault();
          e.stopPropagation();
          handleDeleteEdgeRef.current(selectedEdgeIdRef.current);
          return;
        }
        if (selectedNodeIdsRef.current.length > 0 || selectedNodeId) {
          e.preventDefault();
          e.stopPropagation();
          handleDeleteSelectedNodes();
          return;
        }
      }

      // Arrow keys: Nudge selected card(s)
      if (
        (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') &&
        (selectedNodeIdsRef.current.length > 0 || selectedNodeId)
      ) {
        e.preventDefault();
        e.stopPropagation();
        const step = gridSizeRef.current || 20;
        const multiplier = e.shiftKey ? 4 : 1;
        const delta = step * multiplier;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -delta;
        if (e.key === 'ArrowDown') dy = delta;
        if (e.key === 'ArrowLeft') dx = -delta;
        if (e.key === 'ArrowRight') dx = delta;
        handleNudgeSelectedNodes(dx, dy);
        return;
      }
    };

    window.addEventListener('keydown', handleCanvasKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleCanvasKeyDown, { capture: true });
    };
  }, [
    cancelArrowTargetingOrFocus,
    handleDeleteSelectedNodes,
    handleDuplicateSelectedNodes,
    handleNudgeSelectedNodes,
    handleUndo,
    handleRedo,
    clearTextSelection,
    selectedNodeId,
  ]);

  const handleTextChange = useCallback((id: string, newText: string) => {
    setNodes((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, text_content: newText } : n));
      const target = updated.find((n) => n.id === id);
      if (target) {
        debouncedSaveNode(target);
      }
      return updated;
    });
  }, [debouncedSaveNode]);

  const handleDocContentChange = useCallback(
    async (docId: string, newContentJson: string) => {
      setDocContentMap((prev) => ({ ...prev, [docId]: newContentJson }));
      try {
        await app.vault.saveDocument(docId, newContentJson);
      } catch (e) {
        console.error('Failed to save document from canvas card:', e);
      }
    },
    [app.vault]
  );

  const handleTaskToggle = useCallback(
    async (nodeId: string, taskText: string, currentChecked: boolean) => {
      const targetNode = nodes.find((n) => n.id === nodeId);
      if (!targetNode) return;

      const newChecked = !currentChecked;

      // 1. Document-backed note card
      if (targetNode.document_id) {
        const docId = targetNode.document_id;
        const raw = docContentMap[docId];
        if (!raw) return;

        let updatedContent = raw;

        try {
          const parsed = JSON.parse(raw);
          if (parsed.type === 'doc' && Array.isArray(parsed.content)) {
            const toggleInList = (items: any[]): boolean => {
              for (const item of items) {
                if (item.type === 'taskItem') {
                  const tText = (item.content || [])
                    .map((c: any) => (c.content || []).map((t: any) => t.text || '').join(''))
                    .join('');
                  if (tText.trim() === taskText.trim()) {
                    item.attrs = { ...item.attrs, checked: newChecked };
                    return true;
                  }
                }
                if (Array.isArray(item.content) && toggleInList(item.content)) {
                  return true;
                }
              }
              return false;
            };
            if (toggleInList(parsed.content)) {
              updatedContent = JSON.stringify(parsed);
            }
          }
        } catch {
          const lines = raw.split('\n');
          const updatedLines = lines.map((line) => {
            const trimmed = line.trim();
            if (
              (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) &&
              trimmed.slice(5).trim() === taskText.trim()
            ) {
              return line.replace(/- \[[ xX]\]/, newChecked ? '- [x]' : '- [ ]');
            }
            return line;
          });
          updatedContent = updatedLines.join('\n');
        }

        if (updatedContent !== raw) {
          setDocContentMap((prev) => ({ ...prev, [docId]: updatedContent }));
          await app.vault.saveDocument(docId, updatedContent);
        }
      } else if (targetNode.type === 'text' && targetNode.text_content) {
        // 2. Text sticky card
        const lines = targetNode.text_content.split('\n');
        const updatedLines = lines.map((line) => {
          const trimmed = line.trim();
          if (
            (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) &&
            trimmed.slice(5).trim() === taskText.trim()
          ) {
            return line.replace(/- \[[ xX]\]/, newChecked ? '- [x]' : '- [ ]');
          }
          return line;
        });
        const updatedText = updatedLines.join('\n');
        handleTextChange(nodeId, updatedText);
      }
    },
    [nodes, docContentMap, app.vault, handleTextChange]
  );

  // Refs for real-time reads during continuous drag operations
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const dragDidMoveRef = useRef(false);
  const dragStartClientRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resizeDidMoveRef = useRef(false);

  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Background Pan & Drag Handlers with continuous window/pointer capture tracking
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (
      e.button === 2 &&
      (draftEdgeRef.current || selectedEdgeIdRef.current || Date.now() - lastArrowCancelTimeRef.current < 400)
    ) {
      e.preventDefault();
      e.stopPropagation();
      cancelArrowTargetingOrFocus();
      return;
    }

    const target = e.target as Element | null;
    if (target?.closest?.('.canvas-card, button, input, textarea, .canvas-side-dot, .canvas-edge, .canvas-edge-delete, .canvas-edge-label, [data-edge-id]')) return;

    // If drafting in click mode, connect if snapped, or cancel if clicked on empty canvas
    if (draftEdgeRef.current && draftEdgeRef.current.mode === 'click') {
      if (draftEdgeRef.current.snappedTarget) {
        if (draftEdgeRef.current.editingEdgeId) {
          retargetEdge(
            draftEdgeRef.current.editingEdgeId,
            draftEdgeRef.current.editingEndpoint || 'target',
            draftEdgeRef.current.snappedTarget.nodeId,
            draftEdgeRef.current.snappedTarget.side
          );
        } else {
          createEdge(
            draftEdgeRef.current.fromNodeId,
            draftEdgeRef.current.fromSide,
            draftEdgeRef.current.snappedTarget.nodeId,
            draftEdgeRef.current.snappedTarget.side
          );
        }
      }
      setDraftEdge(null);
      draftEdgeRef.current = null;
      return;
    }

    // Panning requires holding Space/Ctrl (left click) OR Middle Mouse Button (button === 1)
    const isMiddleClick = e.button === 1;
    const isModifierPan = e.button === 0 && (isPanModifierRef.current || e.ctrlKey || e.metaKey);

    if (isMiddleClick || isModifierPan) {
      e.preventDefault();
      clearTextSelection();
      commitActiveEdgeLabel();
      isPanningRef.current = true;
      setIsPanningState(true);
      const container = containerRef.current;
      const rect = container?.getBoundingClientRect();
      const mouseX = rect ? e.clientX - rect.left : e.clientX;
      const mouseY = rect ? e.clientY - rect.top : e.clientY;
      const ct = currentTransformRef.current;
      panCanvasAnchorRef.current = {
        x: (mouseX - ct.x) / ct.scale,
        y: (mouseY - ct.y) / ct.scale,
      };
      panStartRef.current = { x: e.clientX - ct.x, y: e.clientY - ct.y };
      lastMouseMoveEventRef.current = { clientX: e.clientX, clientY: e.clientY };
      try {
        (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
      } catch {}
      return;
    }

    // Normal left-click without space/ctrl: start marquee selection or deselect
    if (e.button === 0) {
      clearTextSelection();
      commitActiveEdgeLabel();
      try {
        containerRef.current?.focus();
      } catch {}

      const rect = containerRef.current?.getBoundingClientRect();
      const ct = currentTransformRef.current;
      const curCanvasX = (e.clientX - (rect?.left || 0) - ct.x) / ct.scale;
      const curCanvasY = (e.clientY - (rect?.top || 0) - ct.y) / ct.scale;

      marqueeStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        canvasX: curCanvasX,
        canvasY: curCanvasY,
      };
      isMarqueeActiveRef.current = false;

      if (!e.shiftKey) {
        setSelectedNodeIds([]);
        selectedNodeIdsRef.current = [];
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        selectedEdgeIdRef.current = null;
      }
    }
  }, [cancelArrowTargetingOrFocus, clearTextSelection, commitActiveEdgeLabel, createEdge, retargetEdge]);

  const handleNodePointerDown = useCallback((id: string, e: React.PointerEvent) => {
    if (
      e.button === 2 &&
      (draftEdgeRef.current || selectedEdgeIdRef.current || Date.now() - lastArrowCancelTimeRef.current < 400)
    ) {
      e.preventDefault();
      e.stopPropagation();
      cancelArrowTargetingOrFocus();
      return;
    }

    // If drafting in click mode, connect if snapped, or cancel if clicked without snap
    if (draftEdgeRef.current && draftEdgeRef.current.mode === 'click') {
      if (draftEdgeRef.current.snappedTarget) {
        if (draftEdgeRef.current.editingEdgeId) {
          retargetEdge(
            draftEdgeRef.current.editingEdgeId,
            draftEdgeRef.current.editingEndpoint || 'target',
            draftEdgeRef.current.snappedTarget.nodeId,
            draftEdgeRef.current.snappedTarget.side
          );
        } else {
          createEdge(
            draftEdgeRef.current.fromNodeId,
            draftEdgeRef.current.fromSide,
            draftEdgeRef.current.snappedTarget.nodeId,
            draftEdgeRef.current.snappedTarget.side
          );
        }
      }
      setDraftEdge(null);
      draftEdgeRef.current = null;
      return;
    }

    const isModifierPan = isPanModifierRef.current || e.ctrlKey || e.metaKey || e.button === 1;

    // If Space or Ctrl is held down OR middle-mouse click, pan the canvas instead of dragging the card
    if (isModifierPan) {
      e.preventDefault();
      isPanningRef.current = true;
      setIsPanningState(true);
      const container = containerRef.current;
      const rect = container?.getBoundingClientRect();
      const mouseX = rect ? e.clientX - rect.left : e.clientX;
      const mouseY = rect ? e.clientY - rect.top : e.clientY;
      const ct = currentTransformRef.current;
      panCanvasAnchorRef.current = {
        x: (mouseX - ct.x) / ct.scale,
        y: (mouseY - ct.y) / ct.scale,
      };
      panStartRef.current = { x: e.clientX - ct.x, y: e.clientY - ct.y };
      lastMouseMoveEventRef.current = { clientX: e.clientX, clientY: e.clientY };
      try {
        (containerRef.current as HTMLElement)?.setPointerCapture?.(e.pointerId);
      } catch {}
      return;
    }

    const target = e.target as Element | null;
    if (target?.closest?.('button, textarea, input, a, .resize-handle, .canvas-side-dot')) return;

    e.stopPropagation();
    commitActiveEdgeLabel();
    try {
      containerRef.current?.focus();
    } catch {}

    const node = nodesRef.current.find((n) => n.id === id);
    if (!node) return;

    if (e.shiftKey) {
      setSelectedNodeIds((prev) => {
        const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
        selectedNodeIdsRef.current = next;
        setSelectedNodeId(next[next.length - 1] || null);
        return next;
      });
    } else {
      if (!selectedNodeIdsRef.current.includes(id)) {
        setSelectedNodeIds([node.id]);
        selectedNodeIdsRef.current = [node.id];
      }
      setSelectedNodeId(node.id);
    }
    setSelectedEdgeId(null);
    selectedEdgeIdRef.current = null;

    // Read-only mode allows selecting the card, but blocks dragging
    if (canvasReadOnlyRef.current) return;

    dragDidMoveRef.current = false;
    dragStartClientRef.current = { x: e.clientX, y: e.clientY };
    dragCandidateNodeIdRef.current = node.id;
    draggingNodeIdRef.current = null;
    const mouseCanvasX = (e.clientX - panRef.current.x) / zoomRef.current;
    const mouseCanvasY = (e.clientY - panRef.current.y) / zoomRef.current;
    dragOffsetRef.current = {
      x: mouseCanvasX - node.x,
      y: mouseCanvasY - node.y,
    };

    const currentSelected = selectedNodeIdsRef.current.includes(node.id)
      ? selectedNodeIdsRef.current
      : [node.id];

    const posMap = new Map<string, { x: number; y: number }>();
    for (const sid of currentSelected) {
      const sn = nodesRef.current.find((n) => n.id === sid);
      if (sn) {
        posMap.set(sid, { x: sn.x, y: sn.y });
      }
    }
    multiDragInitialPositionsRef.current = posMap;
  }, [cancelArrowTargetingOrFocus, clearTextSelection, commitActiveEdgeLabel, createEdge, retargetEdge]);

  const resizingNodeIdRef = useRef<string | null>(null);
  const resizeHandleRef = useRef<ResizeHandleType | null>(null);
  const resizeStartDimsRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
    startX: number;
    startY: number;
    startCanvasX?: number;
    startCanvasY?: number;
    isImage?: boolean;
    aspectRatio?: number;
  }>({ x: 0, y: 0, width: 0, height: 0, startX: 0, startY: 0 });

  const imageAspectMapRef = useRef<Record<string, number>>({});

  const handleImageDimensions = useCallback(
    (id: string, naturalWidth: number, naturalHeight: number) => {
      if (naturalWidth <= 0 || naturalHeight <= 0) return;
      const aspect = naturalWidth / naturalHeight;
      imageAspectMapRef.current[id] = aspect;

      // Automatically adjust card height to fit the natural aspect ratio if currently using initial default height
      setNodes((prev) => {
        const node = prev.find((n) => n.id === id);
        if (!node) return prev;
        const targetH = Math.round(node.width / aspect);
        if (Math.abs(node.height - targetH) > 4 && node.height === 260) {
          const updated = prev.map((n) => (n.id === id ? { ...n, height: targetH } : n));
          const updatedNode = updated.find((n) => n.id === id);
          if (updatedNode) {
            saveCanvasNode(updatedNode);
            triggerDiskSyncRef.current(updatedNode.board_id);
          }
          return updated;
        }
        return prev;
      });
    },
    []
  );

  const handleResizeStart = useCallback(
    (id: string, e: React.PointerEvent, handle: ResizeHandleType) => {
      if (canvasReadOnlyRef.current) return;
      e.stopPropagation();
      const node = nodesRef.current.find((n) => n.id === id);
      if (!node) return;
      setSelectedNodeId(node.id);
      resizeDidMoveRef.current = false;
      resizingNodeIdRef.current = id;
      resizeHandleRef.current = handle;

      const doc = node.document_id ? documents.find((d: DocumentItem) => d.id === node.document_id) : null;
      const isImage = isImageDocument(doc);
      const aspect =
        imageAspectMapRef.current[node.id] ||
        (node.width > 0 && node.height > 0 ? node.width / node.height : 1.33);

      const curCanvasX = (e.clientX - panRef.current.x) / zoomRef.current;
      const curCanvasY = (e.clientY - panRef.current.y) / zoomRef.current;

      resizeStartDimsRef.current = {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        startX: e.clientX,
        startY: e.clientY,
        startCanvasX: curCanvasX,
        startCanvasY: curCanvasY,
        isImage,
        aspectRatio: aspect,
      };
      try {
        (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
      } catch {}
    },
    [documents]
  );

  const performMarqueeDrag = useCallback((clientX: number, clientY: number) => {
    const start = marqueeStartRef.current;
    if (!start) return;
    const dx = Math.abs(clientX - start.clientX);
    const dy = Math.abs(clientY - start.clientY);
    if (!isMarqueeActiveRef.current) {
      if (dx > 4 || dy > 4) {
        isMarqueeActiveRef.current = true;
        setIsMarqueeActiveState(true);
      }
    }
    if (isMarqueeActiveRef.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      const ct = currentTransformRef.current;
      const curCanvasX = (clientX - (rect?.left || 0) - ct.x) / ct.scale;
      const curCanvasY = (clientY - (rect?.top || 0) - ct.y) / ct.scale;

      const boxX = Math.min(start.canvasX, curCanvasX);
      const boxY = Math.min(start.canvasY, curCanvasY);
      const boxW = Math.abs(curCanvasX - start.canvasX);
      const boxH = Math.abs(curCanvasY - start.canvasY);

      setMarqueeBox({
        startX: boxX,
        startY: boxY,
        currentX: boxX + boxW,
        currentY: boxY + boxH,
      });

      const marqueeRight = boxX + boxW;
      const marqueeBottom = boxY + boxH;

      const intersectingIds: string[] = [];
      for (const n of nodesRef.current) {
        const nW = n.width || 260;
        const nH = n.height || 180;
        const doc = n.document_id ? docMap.get(n.document_id) : null;
        const showOutsideTitle = Boolean(doc || n.document_id) && n.type !== 'text';
        const nTop = showOutsideTitle ? n.y - 28 : n.y;
        let nRight = n.x + nW;
        if (showOutsideTitle) {
          const titleText = doc?.title || 'Untitled';
          const titleW = getTitleTextWidth(titleText);
          if (n.x + titleW > nRight) {
            nRight = n.x + titleW;
          }
        }
        const nBottom = n.y + nH;

        const intersects =
          n.x <= marqueeRight &&
          nRight >= boxX &&
          nTop <= marqueeBottom &&
          nBottom >= boxY;

        if (intersects) {
          intersectingIds.push(n.id);
        }
      }

      setSelectedNodeIds(intersectingIds);
      selectedNodeIdsRef.current = intersectingIds;
      setSelectedNodeId(intersectingIds.length > 0 ? intersectingIds[intersectingIds.length - 1] : null);
    }
  }, [docMap]);

  const performNodeResize = useCallback((clientX: number, clientY: number) => {
    const resizeId = resizingNodeIdRef.current;
    const handle = resizeHandleRef.current;
    if (!resizeId || !handle) return;

    if (!resizeDidMoveRef.current) {
      resizeDidMoveRef.current = true;
      recordSnapshot();
    }
    const start = resizeStartDimsRef.current;
    const curCanvasX = (clientX - panRef.current.x) / zoomRef.current;
    const curCanvasY = (clientY - panRef.current.y) / zoomRef.current;
    const deltaX =
      start.startCanvasX !== undefined
        ? curCanvasX - start.startCanvasX
        : (clientX - start.startX) / zoomRef.current;
    const deltaY =
      start.startCanvasY !== undefined
        ? curCanvasY - start.startCanvasY
        : (clientY - start.startY) / zoomRef.current;
    const isImage = Boolean(start.isImage);
    const aspect = start.aspectRatio || 1.33;
    const step = canvasSnapGridRef.current ? (gridSizeRef.current || 20) : 1;
    const minGridStep = gridSizeRef.current || 20;
    const minCardW = 4 * minGridStep;
    const minCardH = 4 * minGridStep;

    setNodes((prev) => {
      return prev.map((n) => {
        if (n.id !== resizeId) return n;
        let newX = start.x;
        let newY = start.y;
        let newW = start.width;
        let newH = start.height;

        if (isImage) {
          if (handle === 'se') {
            const dominant = Math.abs(deltaX) >= Math.abs(deltaY * aspect) ? deltaX : deltaY * aspect;
            newW = Math.max(minCardW, start.width + dominant);
            if (canvasSnapGridRef.current) newW = Math.max(minCardW, Math.round(newW / step) * step);
            newH = Math.max(minCardH, Math.round(newW / aspect));
          } else if (handle === 'sw') {
            const dominant = Math.abs(deltaX) >= Math.abs(deltaY * aspect) ? -deltaX : deltaY * aspect;
            newW = Math.max(minCardW, start.width + dominant);
            if (canvasSnapGridRef.current) newW = Math.max(minCardW, Math.round(newW / step) * step);
            newH = Math.max(minCardH, Math.round(newW / aspect));
            newX = start.x + (start.width - newW);
          } else if (handle === 'ne') {
            const dominant = Math.abs(deltaX) >= Math.abs(deltaY * aspect) ? deltaX : -deltaY * aspect;
            newW = Math.max(minCardW, start.width + dominant);
            if (canvasSnapGridRef.current) newW = Math.max(minCardW, Math.round(newW / step) * step);
            newH = Math.max(minCardH, Math.round(newW / aspect));
            newY = start.y + (start.height - newH);
          } else if (handle === 'nw') {
            const dominant = Math.abs(deltaX) >= Math.abs(deltaY * aspect) ? -deltaX : -deltaY * aspect;
            newW = Math.max(minCardW, start.width + dominant);
            if (canvasSnapGridRef.current) newW = Math.max(minCardW, Math.round(newW / step) * step);
            newH = Math.max(minCardH, Math.round(newW / aspect));
            newX = start.x + (start.width - newW);
            newY = start.y + (start.height - newH);
          } else if (handle === 'e') {
            newW = Math.max(minCardW, start.width + deltaX);
            if (canvasSnapGridRef.current) newW = Math.max(minCardW, Math.round(newW / step) * step);
            newH = Math.max(minCardH, Math.round(newW / aspect));
          } else if (handle === 'w') {
            newW = Math.max(minCardW, start.width - deltaX);
            if (canvasSnapGridRef.current) newW = Math.max(minCardW, Math.round(newW / step) * step);
            newX = start.x + (start.width - newW);
          } else if (handle === 's') {
            newH = Math.max(minCardH, start.height + deltaY);
            if (canvasSnapGridRef.current) newH = Math.max(minCardH, Math.round(newH / step) * step);
            newW = Math.max(minCardW, Math.round(newH * aspect));
          } else if (handle === 'n') {
            newH = Math.max(minCardH, start.height - deltaY);
            if (canvasSnapGridRef.current) newH = Math.max(minCardH, Math.round(newH / step) * step);
            newW = Math.max(minCardW, Math.round(newH * aspect));
            newY = start.y + (start.height - newH);
          }
        } else {
          if (handle === 'e' || handle === 'se' || handle === 'ne') {
            newW = Math.max(minCardW, start.width + deltaX);
            if (canvasSnapGridRef.current) newW = Math.max(minCardW, Math.round(newW / step) * step);
          } else if (handle === 'w' || handle === 'sw' || handle === 'nw') {
            newW = Math.max(minCardW, start.width - deltaX);
            if (canvasSnapGridRef.current) newW = Math.max(minCardW, Math.round(newW / step) * step);
            newX = start.x + (start.width - newW);
          }

          if (handle === 's' || handle === 'se' || handle === 'sw') {
            newH = Math.max(minCardH, start.height + deltaY);
            if (canvasSnapGridRef.current) newH = Math.max(minCardH, Math.round(newH / step) * step);
          } else if (handle === 'n' || handle === 'ne' || handle === 'nw') {
            newH = Math.max(minCardH, start.height - deltaY);
            if (canvasSnapGridRef.current) newH = Math.max(minCardH, Math.round(newH / step) * step);
            newY = start.y + (start.height - newH);
          }
        }

        return { ...n, x: newX, y: newY, width: newW, height: newH };
      });
    });
  }, [recordSnapshot]);

  const performNodeDrag = useCallback((clientX: number, clientY: number) => {
    const dragId = draggingNodeIdRef.current || dragCandidateNodeIdRef.current;
    if (!dragId) return;

    if (!dragDidMoveRef.current) {
      const dx = Math.abs(clientX - dragStartClientRef.current.x);
      const dy = Math.abs(clientY - dragStartClientRef.current.y);
      if (dx < 4 && dy < 4) return;
      dragDidMoveRef.current = true;
      draggingNodeIdRef.current = dragId;
      setIsDraggingNodeState(true);
      recordSnapshot();
    }
    const currentNodes = nodesRef.current;
    const node = currentNodes.find((n) => n.id === dragId);
    if (!node) return;

    const rawX = (clientX - panRef.current.x) / zoomRef.current - dragOffsetRef.current.x;
    const rawY = (clientY - panRef.current.y) / zoomRef.current - dragOffsetRef.current.y;

    const step = gridSizeRef.current || 20;
    const gridX = canvasSnapGridRef.current ? Math.round(rawX / step) * step : rawX;
    const gridY = canvasSnapGridRef.current ? Math.round(rawY / step) * step : rawY;

    let finalX = gridX;
    let finalY = gridY;
    let newGuides: AlignmentGuide[] = [];

    if (canvasSnapObjectsRef.current) {
      const threshold = 8 / Math.max(0.2, zoomRef.current);
      const containerEl = containerRef.current;
      const cWidth = containerEl?.clientWidth || window.innerWidth;
      const cHeight = containerEl?.clientHeight || window.innerHeight;
      const curPan = panRef.current;
      const curZoom = zoomRef.current;

      const viewport = {
        left: -curPan.x / curZoom,
        top: -curPan.y / curZoom,
        right: (-curPan.x + cWidth) / curZoom,
        bottom: (-curPan.y + cHeight) / curZoom,
      };

      const snapResult = calculateObjectSnap(
        dragId,
        rawX,
        rawY,
        gridX,
        gridY,
        node.width || 260,
        node.height || 180,
        currentNodes,
        threshold,
        viewport
      );

      finalX = snapResult.x;
      finalY = snapResult.y;
      newGuides = snapResult.guides;
    }

    const initialPosMap = multiDragInitialPositionsRef.current;
    const isMultiDrag = initialPosMap.size > 1 && initialPosMap.has(dragId);

    let nextNodes: CanvasNode[];
    if (isMultiDrag) {
      const primaryInitial = initialPosMap.get(dragId)!;
      const deltaX = finalX - primaryInitial.x;
      const deltaY = finalY - primaryInitial.y;

      nextNodes = currentNodes.map((n) => {
        const init = initialPosMap.get(n.id);
        if (init) {
          return { ...n, x: init.x + deltaX, y: init.y + deltaY };
        }
        return n;
      });
    } else {
      nextNodes = currentNodes.map((n) => (n.id === dragId ? { ...n, x: finalX, y: finalY } : n));
    }

    nodesRef.current = nextNodes;
    setActiveGuides(newGuides);
    setNodes(nextNodes);
  }, [recordSnapshot]);

  const runEdgeAutoScroll = useCallback(() => {
    const container = containerRef.current;
    const pos = lastMouseMoveEventRef.current;
    if (!container || !pos) {
      autoScrollRafRef.current = null;
      return;
    }

    const isDraggingCard = Boolean(draggingNodeIdRef.current || dragCandidateNodeIdRef.current);
    const isDraggingMarquee = Boolean(isMarqueeActiveRef.current || marqueeStartRef.current);
    const isDraftingEdge = Boolean(draftEdgeRef.current);
    const isResizing = Boolean(resizingNodeIdRef.current);

    if (!isDraggingCard && !isDraggingMarquee && !isDraftingEdge && !isResizing) {
      autoScrollRafRef.current = null;
      return;
    }

    const rect = container.getBoundingClientRect();
    const MARGIN = 60;
    const maxSpeed = 18;

    let scrollDx = 0;
    let scrollDy = 0;

    // Right edge -> scroll right (camera moves right, pan.x decreases)
    if (pos.clientX > rect.right - MARGIN) {
      const depth = pos.clientX - (rect.right - MARGIN);
      const ratio = Math.min(2.5, Math.max(0.1, depth / MARGIN));
      scrollDx = -Math.min(maxSpeed, Math.round(ratio * ratio * 8 + ratio * 4));
    }
    // Left edge -> scroll left (camera moves left, pan.x increases)
    else if (pos.clientX < rect.left + MARGIN) {
      const depth = (rect.left + MARGIN) - pos.clientX;
      const ratio = Math.min(2.5, Math.max(0.1, depth / MARGIN));
      scrollDx = Math.min(maxSpeed, Math.round(ratio * ratio * 8 + ratio * 4));
    }

    // Bottom edge -> scroll down (camera moves down, pan.y decreases)
    if (pos.clientY > rect.bottom - MARGIN) {
      const depth = pos.clientY - (rect.bottom - MARGIN);
      const ratio = Math.min(2.5, Math.max(0.1, depth / MARGIN));
      scrollDy = -Math.min(maxSpeed, Math.round(ratio * ratio * 8 + ratio * 4));
    }
    // Top edge -> scroll up (camera moves up, pan.y increases)
    else if (pos.clientY < rect.top + MARGIN) {
      const depth = (rect.top + MARGIN) - pos.clientY;
      const ratio = Math.min(2.5, Math.max(0.1, depth / MARGIN));
      scrollDy = Math.min(maxSpeed, Math.round(ratio * ratio * 8 + ratio * 4));
    }

    if (scrollDx !== 0 || scrollDy !== 0) {
      const ct = currentTransformRef.current;
      const newX = ct.x + scrollDx;
      const newY = ct.y + scrollDy;

      targetTransformRef.current.x = newX;
      targetTransformRef.current.y = newY;
      currentTransformRef.current.x = newX;
      currentTransformRef.current.y = newY;
      panRef.current = { x: newX, y: newY };

      syncDomTransform(newX, newY, ct.scale);

      if (syncStateRafRef.current === null) {
        syncStateRafRef.current = requestAnimationFrame(() => {
          syncStateRafRef.current = null;
          setPan({ x: targetTransformRef.current.x, y: targetTransformRef.current.y });
        });
      }

      if (isDraggingCard) {
        performNodeDrag(pos.clientX, pos.clientY);
      } else if (isDraggingMarquee) {
        performMarqueeDrag(pos.clientX, pos.clientY);
      } else if (isDraftingEdge) {
        performDraftEdgeUpdate(pos.clientX, pos.clientY);
      } else if (isResizing) {
        performNodeResize(pos.clientX, pos.clientY);
      }

      autoScrollRafRef.current = requestAnimationFrame(runEdgeAutoScroll);
    } else {
      autoScrollRafRef.current = null;
    }
  }, [
    syncDomTransform,
    performDraftEdgeUpdate,
    performMarqueeDrag,
    performNodeDrag,
    performNodeResize,
  ]);

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (isLightboxOpen) return;

      lastMouseMoveEventRef.current = { clientX: e.clientX, clientY: e.clientY };

      if (isCtrlHeldRef.current && !e.ctrlKey && !e.metaKey) {
        isCtrlHeldRef.current = false;
        const active = isSpaceHeldRef.current;
        if (active !== isPanModifierRef.current) {
          isPanModifierRef.current = active;
          setIsPanModifierState(active);
        }
      }

      // Check if auto-scroll should be started
      const isInteracting =
        Boolean(draggingNodeIdRef.current || dragCandidateNodeIdRef.current) ||
        Boolean(isMarqueeActiveRef.current || marqueeStartRef.current) ||
        Boolean(draftEdgeRef.current) ||
        Boolean(resizingNodeIdRef.current);

      if (isInteracting && autoScrollRafRef.current === null) {
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const MARGIN = 60;
          const isNearEdge =
            e.clientX < rect.left + MARGIN ||
            e.clientX > rect.right - MARGIN ||
            e.clientY < rect.top + MARGIN ||
            e.clientY > rect.bottom - MARGIN;

          if (isNearEdge) {
            autoScrollRafRef.current = requestAnimationFrame(runEdgeAutoScroll);
          }
        }
      }

      if (!isPanningRef.current && !isInteracting) return;

      if (mouseMoveRafRef.current === null) {
        mouseMoveRafRef.current = requestAnimationFrame(() => {
          mouseMoveRafRef.current = null;
          const pos = lastMouseMoveEventRef.current;
          if (!pos) return;

          if (marqueeStartRef.current) {
            performMarqueeDrag(pos.clientX, pos.clientY);
          } else if (isPanningRef.current) {
            const container = containerRef.current;
            if (container && panCanvasAnchorRef.current) {
              const rect = container.getBoundingClientRect();
              const anchor = panCanvasAnchorRef.current;
              const mouseX = pos.clientX - rect.left;
              const mouseY = pos.clientY - rect.top;

              const curScale = currentTransformRef.current.scale;
              const tarScale = targetTransformRef.current.scale;
              const newX = mouseX - anchor.x * curScale;
              const newY = mouseY - anchor.y * curScale;

              currentTransformRef.current.x = newX;
              currentTransformRef.current.y = newY;
              targetTransformRef.current.x = mouseX - anchor.x * tarScale;
              targetTransformRef.current.y = mouseY - anchor.y * tarScale;
              panRef.current = { x: newX, y: newY };

              syncDomTransform(newX, newY, curScale);

              if (syncStateRafRef.current === null) {
                syncStateRafRef.current = requestAnimationFrame(() => {
                  syncStateRafRef.current = null;
                  setPan({ x: targetTransformRef.current.x, y: targetTransformRef.current.y });
                });
              }
            } else {
              const newX = pos.clientX - panStartRef.current.x;
              const newY = pos.clientY - panStartRef.current.y;
              targetTransformRef.current.x = newX;
              targetTransformRef.current.y = newY;
              currentTransformRef.current.x = newX;
              currentTransformRef.current.y = newY;
              panRef.current = { x: newX, y: newY };

              syncDomTransform(newX, newY, currentTransformRef.current.scale);

              if (syncStateRafRef.current === null) {
                syncStateRafRef.current = requestAnimationFrame(() => {
                  syncStateRafRef.current = null;
                  setPan({ x: targetTransformRef.current.x, y: targetTransformRef.current.y });
                });
              }
            }
          } else if (resizingNodeIdRef.current) {
            performNodeResize(pos.clientX, pos.clientY);
          } else if (dragCandidateNodeIdRef.current || draggingNodeIdRef.current) {
            performNodeDrag(pos.clientX, pos.clientY);
          } else if (draftEdgeRef.current) {
            performDraftEdgeUpdate(pos.clientX, pos.clientY);
          }
        });
      }
    };

    const handleGlobalPointerUp = (e?: PointerEvent) => {
      stopEdgeAutoScroll();
      if (mouseMoveRafRef.current !== null) {
        cancelAnimationFrame(mouseMoveRafRef.current);
        mouseMoveRafRef.current = null;
      }
      if (draggingNodeIdRef.current && dragDidMoveRef.current) {
        const initialPosMap = multiDragInitialPositionsRef.current;
        const dragId = draggingNodeIdRef.current;
        if (initialPosMap.size > 1 && initialPosMap.has(dragId)) {
          for (const sid of initialPosMap.keys()) {
            const sn = nodesRef.current.find((n) => n.id === sid);
            if (sn) {
              saveCanvasNode(sn);
            }
          }
          const primaryNode = nodesRef.current.find((n) => n.id === dragId);
          if (primaryNode) {
            triggerDiskSyncRef.current(primaryNode.board_id);
          }
        } else {
          const node = nodesRef.current.find((n) => n.id === dragId);
          if (node) {
            saveCanvasNode(node);
            triggerDiskSyncRef.current(node.board_id);
          }
        }
      }
      if (resizingNodeIdRef.current) {
        const resizeId = resizingNodeIdRef.current;
        const node = nodesRef.current.find((n) => n.id === resizeId);
        if (node) {
          saveCanvasNode(node);
          triggerDiskSyncRef.current(node.board_id);
        }
        resizingNodeIdRef.current = null;
        resizeHandleRef.current = null;
      }
      if (e && isCtrlHeldRef.current && !e.ctrlKey && !e.metaKey) {
        isCtrlHeldRef.current = false;
        const active = isSpaceHeldRef.current;
        if (active !== isPanModifierRef.current) {
          isPanModifierRef.current = active;
          setIsPanModifierState(active);
        }
      }

      if (marqueeStartRef.current) {
        if (isMarqueeActiveRef.current) {
          isMarqueeActiveRef.current = false;
          setIsMarqueeActiveState(false);
          setMarqueeBox(null);
        } else {
          if (e && !e.shiftKey) {
            setSelectedNodeIds([]);
            selectedNodeIdsRef.current = [];
            setSelectedNodeId(null);
            setSelectedEdgeId(null);
            selectedEdgeIdRef.current = null;
          }
        }
        marqueeStartRef.current = null;
      }

      if (dragCandidateNodeIdRef.current && !dragDidMoveRef.current && (!e || !e.shiftKey)) {
        const clickedId = dragCandidateNodeIdRef.current;
        if (selectedNodeIdsRef.current.length > 1 && selectedNodeIdsRef.current.includes(clickedId)) {
          setSelectedNodeIds([clickedId]);
          selectedNodeIdsRef.current = [clickedId];
          setSelectedNodeId(clickedId);
        }
      }

      setActiveGuides([]);
      dragCandidateNodeIdRef.current = null;
      dragDidMoveRef.current = false;
      resizeDidMoveRef.current = false;
      isPanningRef.current = false;
      setIsPanningState(false);
      panCanvasAnchorRef.current = null;
      draggingNodeIdRef.current = null;
      setIsDraggingNodeState(false);
    };

    const handleGlobalPointerDown = (e: PointerEvent) => {
      if (e.button === 2 && (draftEdgeRef.current || selectedEdgeIdRef.current)) {
        e.preventDefault();
        e.stopPropagation();
        cancelArrowTargetingOrFocus();
      }
    };

    const handleGlobalMouseDown = (e: MouseEvent) => {
      if (
        e.button === 2 &&
        (draftEdgeRef.current ||
          selectedEdgeIdRef.current ||
          Date.now() - lastArrowCancelTimeRef.current < 400)
      ) {
        e.preventDefault();
        e.stopPropagation();
        cancelArrowTargetingOrFocus();
      }
    };

    const handleGlobalContextMenu = (e: MouseEvent) => {
      if (
        draftEdgeRef.current ||
        selectedEdgeIdRef.current ||
        Date.now() - lastArrowCancelTimeRef.current < 400
      ) {
        e.preventDefault();
        e.stopPropagation();
        cancelArrowTargetingOrFocus();
      }
    };

    window.addEventListener('pointerdown', handleGlobalPointerDown, { capture: true });
    window.addEventListener('mousedown', handleGlobalMouseDown, { capture: true });
    window.addEventListener('contextmenu', handleGlobalContextMenu, { capture: true });
    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      stopEdgeAutoScroll();
      window.removeEventListener('pointerdown', handleGlobalPointerDown, { capture: true });
      window.removeEventListener('mousedown', handleGlobalMouseDown, { capture: true });
      window.removeEventListener('contextmenu', handleGlobalContextMenu, { capture: true });
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [
    cancelArrowTargetingOrFocus,
    recordSnapshot,
    performDraftEdgeUpdate,
    performMarqueeDrag,
    performNodeDrag,
    performNodeResize,
    runEdgeAutoScroll,
    stopEdgeAutoScroll,
  ]);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const ro = new ResizeObserver(() => updateSize());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  // Spatial Viewport Culling Engine (bounds memory & DOM count to O(viewport) cards)
  const visibleNodes = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) {
      return nodes;
    }

    const overscan = 400; // px in canvas coordinates
    const left = -pan.x / zoom - overscan;
    const top = -pan.y / zoom - overscan;
    const right = (-pan.x + containerSize.width) / zoom + overscan;
    const bottom = (-pan.y + containerSize.height) / zoom + overscan;

    return nodes.filter((node) => {
      // Never cull selected node so focus / active editing is preserved uninterrupted
      if (node.id === selectedNodeId) return true;

      const nodeWidth = node.width || 260;
      const nodeHeight = node.height || 180;
      const nodeRight = node.x + nodeWidth;
      const nodeBottom = node.y + nodeHeight;

      return (
        nodeRight >= left &&
        node.x <= right &&
        nodeBottom >= top &&
        node.y <= bottom
      );
    });
  }, [nodes, pan.x, pan.y, zoom, containerSize.width, containerSize.height, selectedNodeId]);

  // Top-Right Camera Controls: Smooth Animated Zoom In, Zoom Out, and Fit to Center
  const handleZoomIn = useCallback(() => {
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    const width = rect && rect.width > 0 ? rect.width : (containerSize.width || window.innerWidth);
    const height = rect && rect.height > 0 ? rect.height : (containerSize.height || window.innerHeight);

    const centerX = width / 2;
    const centerY = height / 2;

    const currentTarget = targetTransformRef.current;
    const currentScale = currentTarget.scale;
    const newScale = Math.min(3.0, currentScale * 1.25);

    if (Math.abs(newScale - currentScale) > 0.0001) {
      targetTransformRef.current = {
        x: centerX - ((centerX - currentTarget.x) * (newScale / currentScale)),
        y: centerY - ((centerY - currentTarget.y) * (newScale / currentScale)),
        scale: newScale,
      };
      runCameraEasing();
    }
  }, [containerSize.width, containerSize.height, runCameraEasing]);

  const handleZoomOut = useCallback(() => {
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    const width = rect && rect.width > 0 ? rect.width : (containerSize.width || window.innerWidth);
    const height = rect && rect.height > 0 ? rect.height : (containerSize.height || window.innerHeight);

    const centerX = width / 2;
    const centerY = height / 2;

    const currentTarget = targetTransformRef.current;
    const currentScale = currentTarget.scale;
    const newScale = Math.max(0.15, currentScale / 1.25);

    if (Math.abs(newScale - currentScale) > 0.0001) {
      targetTransformRef.current = {
        x: centerX - ((centerX - currentTarget.x) * (newScale / currentScale)),
        y: centerY - ((centerY - currentTarget.y) * (newScale / currentScale)),
        scale: newScale,
      };
      runCameraEasing();
    }
  }, [containerSize.width, containerSize.height, runCameraEasing]);

  const handleResetZoom = useCallback(() => {
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    const width = rect && rect.width > 0 ? rect.width : (containerSize.width || window.innerWidth);
    const height = rect && rect.height > 0 ? rect.height : (containerSize.height || window.innerHeight);

    const centerX = width / 2;
    const centerY = height / 2;

    const currentTarget = targetTransformRef.current;
    const currentScale = currentTarget.scale;
    const newScale = 1;

    if (Math.abs(newScale - currentScale) > 0.0001) {
      targetTransformRef.current = {
        x: centerX - ((centerX - currentTarget.x) * (newScale / currentScale)),
        y: centerY - ((centerY - currentTarget.y) * (newScale / currentScale)),
        scale: newScale,
      };
      runCameraEasing();
    }
  }, [containerSize.width, containerSize.height, runCameraEasing]);

  const handleFitToCenter = useCallback(() => {
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    const width = rect && rect.width > 0 ? rect.width : (containerSize.width || window.innerWidth);
    const height = rect && rect.height > 0 ? rect.height : (containerSize.height || window.innerHeight);

    if (nodes.length === 0) {
      targetTransformRef.current = { x: 100, y: 100, scale: 1 };
      runCameraEasing();
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      const w = node.width || 260;
      const h = node.height || 180;
      if (node.x < minX) minX = node.x;
      if (node.x + w > maxX) maxX = node.x + w;
      if (node.y < minY) minY = node.y;
      if (node.y + h > maxY) maxY = node.y + h;
    }

    if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
      targetTransformRef.current = { x: 100, y: 100, scale: 1 };
      runCameraEasing();
      return;
    }

    const padding = 80;
    const contentWidth = Math.max(100, maxX - minX);
    const contentHeight = Math.max(100, maxY - minY);
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    const availWidth = Math.max(200, width - padding * 2);
    const availHeight = Math.max(200, height - padding * 2);

    const scaleX = availWidth / contentWidth;
    const scaleY = availHeight / contentHeight;
    const fitScale = Math.min(1.25, Math.max(0.2, Math.min(scaleX, scaleY)));

    const targetX = width / 2 - contentCenterX * fitScale;
    const targetY = height / 2 - contentCenterY * fitScale;

    targetTransformRef.current = {
      x: Number.isFinite(targetX) ? targetX : 100,
      y: Number.isFinite(targetY) ? targetY : 100,
      scale: fitScale,
    };
    runCameraEasing();
  }, [nodes, containerSize.width, containerSize.height, runCameraEasing]);

  const handleFitNodeToCenter = useCallback(
    (nodeId: string) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;
      const el = containerRef.current;
      const rect = el?.getBoundingClientRect();
      const width = rect && rect.width > 0 ? rect.width : (containerSize.width || window.innerWidth);
      const height = rect && rect.height > 0 ? rect.height : (containerSize.height || window.innerHeight);

      const w = node.width || 260;
      const h = node.height || 180;
      const centerX = node.x + w / 2;
      const centerY = node.y + h / 2;

      const currentScale = currentTransformRef.current.scale || 1;
      const targetX = width / 2 - centerX * currentScale;
      const targetY = height / 2 - centerY * currentScale;

      targetTransformRef.current = {
        x: Number.isFinite(targetX) ? targetX : 100,
        y: Number.isFinite(targetY) ? targetY : 100,
        scale: currentScale,
      };
      runCameraEasing();
    },
    [nodeMap, containerSize.width, containerSize.height, runCameraEasing]
  );

  const handleFitEdgeToCenter = useCallback(
    (_edge: CanvasEdge, mid: { x: number; y: number }) => {
      const el = containerRef.current;
      const rect = el?.getBoundingClientRect();
      const width = rect && rect.width > 0 ? rect.width : (containerSize.width || window.innerWidth);
      const height = rect && rect.height > 0 ? rect.height : (containerSize.height || window.innerHeight);

      const currentScale = currentTransformRef.current.scale || 1;
      const targetX = width / 2 - mid.x * currentScale;
      const targetY = height / 2 - mid.y * currentScale;

      targetTransformRef.current = {
        x: Number.isFinite(targetX) ? targetX : 100,
        y: Number.isFinite(targetY) ? targetY : 100,
        scale: currentScale,
      };
      runCameraEasing();
    },
    [containerSize.width, containerSize.height, runCameraEasing]
  );

  const multiSelectBounds = useMemo(() => {
    if (selectedNodeIds.length < 2) return null;
    const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
    if (selectedNodes.length < 2) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const n of selectedNodes) {
      const w = n.width || 260;
      const h = n.height || 180;
      const doc = n.document_id ? docMap.get(n.document_id) : null;
      const showOutsideTitle = Boolean(doc || n.document_id) && n.type !== 'text';
      const nodeTop = showOutsideTitle ? n.y - 28 : n.y;
      let nodeRight = n.x + w;
      if (showOutsideTitle) {
        const titleText = doc?.title || 'Untitled';
        const titleW = getTitleTextWidth(titleText);
        if (n.x + titleW > nodeRight) {
          nodeRight = n.x + titleW;
        }
      }

      if (n.x < minX) minX = n.x;
      if (nodeTop < minY) minY = nodeTop;
      if (nodeRight > maxX) maxX = nodeRight;
      if (n.y + h > maxY) maxY = n.y + h;
    }

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;

    const padding = 6;
    return {
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + padding * 2,
      height: (maxY - minY) + padding * 2,
      count: selectedNodes.length,
    };
  }, [selectedNodeIds, nodes, docMap]);

  const handleFitMultiSelectionToCenter = useCallback(() => {
    if (!multiSelectBounds) return;
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    const width = rect && rect.width > 0 ? rect.width : (containerSize.width || window.innerWidth);
    const height = rect && rect.height > 0 ? rect.height : (containerSize.height || window.innerHeight);

    const padding = 100;
    const contentWidth = Math.max(100, multiSelectBounds.width);
    const contentHeight = Math.max(100, multiSelectBounds.height);
    const contentCenterX = multiSelectBounds.x + multiSelectBounds.width / 2;
    const contentCenterY = multiSelectBounds.y + multiSelectBounds.height / 2;

    const availWidth = Math.max(200, width - padding * 2);
    const availHeight = Math.max(200, height - padding * 2);

    const scaleX = availWidth / contentWidth;
    const scaleY = availHeight / contentHeight;
    const fitScale = Math.min(1.25, Math.max(0.2, Math.min(scaleX, scaleY)));

    const targetX = width / 2 - contentCenterX * fitScale;
    const targetY = height / 2 - contentCenterY * fitScale;

    targetTransformRef.current = {
      x: Number.isFinite(targetX) ? targetX : 100,
      y: Number.isFinite(targetY) ? targetY : 100,
      scale: fitScale,
    };
    runCameraEasing();
  }, [multiSelectBounds, containerSize.width, containerSize.height, runCameraEasing]);

  // Double-click on empty canvas to quickly place a new text card at cursor
  const handleCanvasDoubleClick = useCallback(
    async (e: React.MouseEvent) => {
      if (canvasReadOnlyRef.current) return;
      if ((e.target as HTMLElement).closest('.canvas-card, button, input, textarea, a, .canvas-edge-label, .canvas-edge, [data-edge-id]')) return;
      commitActiveEdgeLabel();
      const el = containerRef.current;
      if (!el) return;
      recordSnapshot();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const ct = currentTransformRef.current;
      const step = gridSizeRef.current || 20;
      const cardWidth = 260;
      const cardHeight = 4 * step;
      let canvasX = (mouseX - ct.x) / ct.scale - cardWidth / 2;
      let canvasY = (mouseY - ct.y) / ct.scale - cardHeight / 2;
      if (canvasSnapGridRef.current) {
        canvasX = Math.round(canvasX / step) * step;
        canvasY = Math.round(canvasY / step) * step;
      }
      const newNode: CanvasNode = {
        id: `node-${Date.now()}`,
        board_id: effectiveBoardId,
        type: 'text',
        x: Math.round(canvasX),
        y: Math.round(canvasY),
        width: cardWidth,
        height: cardHeight,
        text_content: '',
        color: '',
      };
      await saveCanvasNode(newNode);
      triggerDiskSync(effectiveBoardId);
      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      setAutoEditingNodeId(newNode.id);
    },
    [commitActiveEdgeLabel, effectiveBoardId, triggerDiskSync, recordSnapshot]
  );

  // Drag and drop documents from navigation tree directly onto canvas
  useEffect(() => {
    const handleCustomDrop = async (e: Event) => {
      if (canvasReadOnlyRef.current) return;
      const customEvent = e as CustomEvent;
      const { item, selectedIds, targetEl, clientX, clientY } = customEvent.detail || {};
      const el = containerRef.current;
      if (!el || !targetEl || !el.contains(targetEl)) return;

      customEvent.detail.handled = true;
      const rect = el.getBoundingClientRect();
      const ct = currentTransformRef.current;
      let canvasX = (clientX - rect.left - ct.x) / ct.scale;
      let canvasY = (clientY - rect.top - ct.y) / ct.scale;
      const step = gridSizeRef.current || 20;
      if (canvasSnapGridRef.current) {
        canvasX = Math.round(canvasX / step) * step;
        canvasY = Math.round(canvasY / step) * step;
      }

      const idsToInsert: string[] =
        selectedIds && selectedIds.length > 0 ? selectedIds : item?.id ? [item.id] : [];
      const newNodes: CanvasNode[] = [];

      let offset = 0;
      for (const docId of idsToInsert) {
        const targetDoc = documents.find((d: DocumentItem) => d.id === docId);
        if (!targetDoc || targetDoc.is_folder || targetDoc.id === effectiveBoardId || targetDoc.doc_type === 'canvas') {
          continue;
        }
        const isImg = isImageDocument(targetDoc);
        const node: CanvasNode = {
          id: `node-${Date.now()}-${offset}`,
          board_id: effectiveBoardId,
          type: 'note',
          x: Math.round(canvasX + offset * 24),
          y: Math.round(canvasY + offset * 24),
          width: isImg ? 340 : 320,
          height: isImg ? 260 : 280,
          document_id: docId,
          color: '',
        };
        newNodes.push(node);
        offset++;
      }

      if (newNodes.length > 0) {
        recordSnapshot();
        for (const node of newNodes) {
          await saveCanvasNode(node);
        }
        triggerDiskSync(effectiveBoardId);
        setNodes((prev) => [...prev, ...newNodes]);
        showToast(
          newNodes.length === 1 ? 'Added document to canvas' : `Added ${newNodes.length} documents to canvas`,
          'success'
        );
      }
    };

    window.addEventListener('noether:custom-drop', handleCustomDrop);
    return () => {
      window.removeEventListener('noether:custom-drop', handleCustomDrop);
    };
  }, [documents, effectiveBoardId, showToast, triggerDiskSync, recordSnapshot]);


  const getCanvasCoordsForScreenPoint = useCallback(
    (screenX: number, screenY: number, width: number, height: number) => {
      const el = containerRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const ct = currentTransformRef.current;
      let canvasX = (screenX - rect.left - ct.x) / ct.scale - width / 2;
      let canvasY = (screenY - rect.top - ct.y) / ct.scale - height / 2;
      const step = gridSizeRef.current || 20;
      if (canvasSnapGridRef.current) {
        canvasX = Math.round(canvasX / step) * step;
        canvasY = Math.round(canvasY / step) * step;
      }
      return { x: Math.round(canvasX), y: Math.round(canvasY) };
    },
    []
  );

  const getCanvasViewportCenter = useCallback(
    (width: number, height: number) => {
      const el = containerRef.current;
      const rect = el?.getBoundingClientRect();
      const w = rect && rect.width > 0 ? rect.width : (containerSize.width || window.innerWidth);
      const h = rect && rect.height > 0 ? rect.height : (containerSize.height || window.innerHeight);
      const ct = currentTransformRef.current;
      let canvasX = (w / 2 - ct.x) / ct.scale - width / 2;
      let canvasY = (h / 2 - ct.y) / ct.scale - height / 2;
      const step = gridSizeRef.current || 20;
      if (canvasSnapGridRef.current) {
        canvasX = Math.round(canvasX / step) * step;
        canvasY = Math.round(canvasY / step) * step;
      }
      return { x: Math.round(canvasX), y: Math.round(canvasY) };
    },
    [containerSize]
  );

  const handleAddStickyCard = useCallback(
    async (x: number, y: number) => {
      if (canvasReadOnlyRef.current) {
        showToast('Canvas is in read-only mode', 'warning');
        return;
      }
      recordSnapshot();
      const step = gridSizeRef.current || 20;
      const cardHeight = 4 * step;
      const newNode: CanvasNode = {
        id: `node-${Date.now()}`,
        board_id: effectiveBoardId,
        type: 'text',
        x,
        y,
        width: 260,
        height: cardHeight,
        text_content: '',
        color: '',
      };
      nodesRef.current = [...nodesRef.current, newNode];
      setNodes(nodesRef.current);
      setSelectedNodeId(newNode.id);
      setAutoEditingNodeId(newNode.id);
      await saveCanvasNode(newNode);
      triggerDiskSync(effectiveBoardId);
      showToast('Added card', 'info');
    },
    [effectiveBoardId, recordSnapshot, showToast, triggerDiskSync]
  );

  const handleAddDocumentCard = useCallback(
    async (docId: string, x: number, y: number): Promise<CanvasNode | null> => {
      if (canvasReadOnlyRef.current) {
        showToast('Canvas is in read-only mode', 'warning');
        return null;
      }
      const allDocs = useDocumentStore.getState().documents;
      const targetDoc =
        allDocs.find((d: DocumentItem) => d.id === docId) ||
        documents.find((d: DocumentItem) => d.id === docId);
      if (!targetDoc) return null;

      const isImg = isImageDocument(targetDoc);
      const nodeWidth = isImg ? 340 : 320;
      const nodeHeight = isImg ? 260 : 280;

      recordSnapshot();
      const newNode: CanvasNode = {
        id: `node-${Date.now()}`,
        board_id: effectiveBoardId,
        type: 'note',
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
        document_id: docId,
        color: '',
      };
      nodesRef.current = [...nodesRef.current, newNode];
      setNodes(nodesRef.current);
      setSelectedNodeId(newNode.id);
      await saveCanvasNode(newNode);
      triggerDiskSync(effectiveBoardId);
      showToast(`Added ${targetDoc.title || 'document'} to canvas`, 'success');
      return newNode;
    },
    [documents, effectiveBoardId, recordSnapshot, showToast, triggerDiskSync]
  );

  const handleSwapNodeDocument = useCallback(
    async (nodeId: string, newDocId: string) => {
      const targetNode = nodesRef.current.find((n) => n.id === nodeId);
      if (!targetNode) return;
      const allDocs = useDocumentStore.getState().documents;
      const newDoc =
        allDocs.find((d) => d.id === newDocId) || documents.find((d) => d.id === newDocId);

      recordSnapshot();
      const updatedNode: CanvasNode = {
        ...targetNode,
        document_id: newDocId,
        type: 'note',
      };
      await saveCanvasNode(updatedNode);
      triggerDiskSync(effectiveBoardId);
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? updatedNode : n)));
      nodesRef.current = nodesRef.current.map((n) => (n.id === nodeId ? updatedNode : n));
      showToast(`Swapped note to "${newDoc?.title || 'selected document'}"`, 'success');
    },
    [documents, effectiveBoardId, recordSnapshot, showToast, triggerDiskSync]
  );

  const handleConvertCardToFile = useCallback(
    (nodeId: string) => {
      const targetNode = nodesRef.current.find((n) => n.id === nodeId);
      if (!targetNode) return;

      let defaultTitle = 'Untitled';
      if (targetNode.text_content) {
        const firstLine = targetNode.text_content
          .replace(/<[^>]*>/g, '')
          .split('\n')[0]
          ?.trim();
        if (firstLine) {
          defaultTitle = firstLine.slice(0, 40);
        }
      }

      openInputDialog({
        title: 'Convert card to file',
        placeholder: 'Note title',
        defaultValue: defaultTitle,
        confirmText: 'Convert',
        onConfirm: async (title) => {
          const trimmed = title.trim() || 'Untitled';
          const newDoc = await useDocumentStore.getState().createNewNote(trimmed, null, 'base', false);
          if (!newDoc) {
            showToast('Failed to create note', 'error');
            return;
          }

          if (targetNode.text_content) {
            try {
              await app.vault.saveDocument(newDoc.id, targetNode.text_content);
            } catch (e) {
              console.error('Failed to save document content during card conversion:', e);
            }
          }

          recordSnapshot();
          const updatedNode: CanvasNode = {
            ...targetNode,
            type: 'note',
            document_id: newDoc.id,
            text_content: undefined,
          };

          await saveCanvasNode(updatedNode);
          triggerDiskSync(effectiveBoardId);
          setNodes((prev) => prev.map((n) => (n.id === nodeId ? updatedNode : n)));
          nodesRef.current = nodesRef.current.map((n) => (n.id === nodeId ? updatedNode : n));
          showToast(`Converted card to note "${newDoc.title}"`, 'success');
        },
      });
    },
    [app.vault, effectiveBoardId, openInputDialog, recordSnapshot, showToast, triggerDiskSync]
  );

  const handleAddWebPageCard = useCallback(
    (canvasX: number, canvasY: number) => {
      if (canvasReadOnlyRef.current) {
        showToast('Canvas is in read-only mode', 'warning');
        return;
      }

      openInputDialog({
        title: 'Add web page',
        placeholder: 'https://example.com',
        confirmText: 'Add',
        onConfirm: async (rawUrl) => {
          let url = rawUrl.trim();
          if (!url) return;
          if (!/^https?:\/\//i.test(url)) {
            url = `https://${url}`;
          }
          const cardWidth = 320;
          const cardHeight = 200;
          const step = gridSizeRef.current || 20;
          let finalX = canvasX - cardWidth / 2;
          let finalY = canvasY - cardHeight / 2;
          if (canvasSnapGridRef.current) {
            finalX = Math.round(finalX / step) * step;
            finalY = Math.round(finalY / step) * step;
          }

          recordSnapshot();
          const newNode: CanvasNode = {
            id: `node-${Date.now()}`,
            board_id: effectiveBoardId,
            type: 'link',
            x: Math.round(finalX),
            y: Math.round(finalY),
            width: cardWidth,
            height: cardHeight,
            url,
            text_content: url,
            color: '',
          };
          await saveCanvasNode(newNode);
          triggerDiskSync(effectiveBoardId);
          setNodes((prev) => [...prev, newNode]);
          nodesRef.current = [...nodesRef.current, newNode];
          selectSingleNode(newNode.id);
          showToast('Added web page to canvas', 'success');
        },
      });
    },
    [effectiveBoardId, openInputDialog, recordSnapshot, selectSingleNode, showToast, triggerDiskSync]
  );

  const handlePasteAtCoordinates = useCallback(
    async (canvasX: number, canvasY: number) => {
      if (canvasReadOnlyRef.current) {
        showToast('Canvas is in read-only mode', 'warning');
        return;
      }

      let clipboardText = '';
      try {
        clipboardText = await navigator.clipboard.readText();
      } catch {
        // Clipboard read was blocked or empty
      }

      if (!clipboardText.trim()) {
        showToast('Clipboard is empty', 'info');
        return;
      }

      const trimmed = clipboardText.trim();
      const isUrl = /^https?:\/\//i.test(trimmed);

      recordSnapshot();
      const step = gridSizeRef.current || 20;

      if (isUrl) {
        const cardWidth = 320;
        const cardHeight = 200;
        let finalX = canvasX - cardWidth / 2;
        let finalY = canvasY - cardHeight / 2;
        if (canvasSnapGridRef.current) {
          finalX = Math.round(finalX / step) * step;
          finalY = Math.round(finalY / step) * step;
        }
        const newNode: CanvasNode = {
          id: `node-${Date.now()}`,
          board_id: effectiveBoardId,
          type: 'link',
          x: Math.round(finalX),
          y: Math.round(finalY),
          width: cardWidth,
          height: cardHeight,
          url: trimmed,
          text_content: trimmed,
          color: '',
        };
        await saveCanvasNode(newNode);
        triggerDiskSync(effectiveBoardId);
        setNodes((prev) => [...prev, newNode]);
        nodesRef.current = [...nodesRef.current, newNode];
        selectSingleNode(newNode.id);
        showToast('Pasted web page link', 'success');
      } else {
        const cardWidth = 260;
        const cardHeight = 4 * step;
        let finalX = canvasX - cardWidth / 2;
        let finalY = canvasY - cardHeight / 2;
        if (canvasSnapGridRef.current) {
          finalX = Math.round(finalX / step) * step;
          finalY = Math.round(finalY / step) * step;
        }
        const newNode: CanvasNode = {
          id: `node-${Date.now()}`,
          board_id: effectiveBoardId,
          type: 'text',
          x: Math.round(finalX),
          y: Math.round(finalY),
          width: cardWidth,
          height: cardHeight,
          text_content: trimmed,
          color: '',
        };
        await saveCanvasNode(newNode);
        triggerDiskSync(effectiveBoardId);
        setNodes((prev) => [...prev, newNode]);
        nodesRef.current = [...nodesRef.current, newNode];
        selectSingleNode(newNode.id);
        showToast('Pasted note card', 'success');
      }
    },
    [effectiveBoardId, recordSnapshot, selectSingleNode, showToast, triggerDiskSync]
  );

  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (
        draftEdgeRef.current ||
        selectedEdgeIdRef.current ||
        Date.now() - lastArrowCancelTimeRef.current < 400
      ) {
        cancelArrowTargetingOrFocus();
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target?.closest?.(
          '.canvas-card, button, input, textarea, a, .canvas-side-dot, .canvas-edge, .canvas-edge-delete, .canvas-edge-label, [data-edge-id]'
        )
      ) {
        return;
      }

      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const ct = currentTransformRef.current;
      const canvasX = (mouseX - ct.x) / ct.scale;
      const canvasY = (mouseY - ct.y) / ct.scale;

      const step = gridSizeRef.current || 20;

      const handleHoverItem = (type: CanvasDockActionType) => {
        if (ghostLeaveTimeoutRef.current) {
          clearTimeout(ghostLeaveTimeoutRef.current);
          ghostLeaveTimeoutRef.current = null;
        }
        const dims = getCardDimensions(type);
        let x = canvasX - dims.width / 2;
        let y = canvasY - dims.height / 2;
        if (canvasSnapGridRef.current) {
          x = Math.round(x / step) * step;
          y = Math.round(y / step) * step;
        }
        setDragGhost({
          type,
          screenX: 0,
          screenY: 0,
          canvasX: Math.round(x),
          canvasY: Math.round(y),
          width: dims.width,
          height: dims.height,
        });
      };

      const handleLeaveItem = () => {
        if (ghostLeaveTimeoutRef.current) {
          clearTimeout(ghostLeaveTimeoutRef.current);
        }
        ghostLeaveTimeoutRef.current = setTimeout(() => {
          setDragGhost(null);
        }, 40);
      };

      const items = buildCanvasBackgroundContextMenu({
        onAddCard: () => {
          if (ghostLeaveTimeoutRef.current) {
            clearTimeout(ghostLeaveTimeoutRef.current);
            ghostLeaveTimeoutRef.current = null;
          }
          setDragGhost(null);
          const dims = getCardDimensions('card');
          let x = canvasX - dims.width / 2;
          let y = canvasY - dims.height / 2;
          if (canvasSnapGridRef.current) {
            x = Math.round(x / step) * step;
            y = Math.round(y / step) * step;
          }
          handleAddStickyCard(Math.round(x), Math.round(y));
        },
        onHoverCard: () => handleHoverItem('card'),
        onAddNote: () => {
          if (ghostLeaveTimeoutRef.current) {
            clearTimeout(ghostLeaveTimeoutRef.current);
            ghostLeaveTimeoutRef.current = null;
          }
          const dims = getCardDimensions('note');
          let x = canvasX - dims.width / 2;
          let y = canvasY - dims.height / 2;
          if (canvasSnapGridRef.current) {
            x = Math.round(x / step) * step;
            y = Math.round(y / step) * step;
          }
          isDroppingIntoModalRef.current = true;
          setDragGhost({
            type: 'note',
            screenX: 0,
            screenY: 0,
            canvasX: Math.round(x),
            canvasY: Math.round(y),
            width: dims.width,
            height: dims.height,
          });
          setSearchModalState({
            isOpen: true,
            mode: 'note',
            targetCanvasX: Math.round(x),
            targetCanvasY: Math.round(y),
          });
        },
        onHoverNote: () => handleHoverItem('note'),
        onAddMedia: () => {
          if (ghostLeaveTimeoutRef.current) {
            clearTimeout(ghostLeaveTimeoutRef.current);
            ghostLeaveTimeoutRef.current = null;
          }
          const dims = getCardDimensions('media');
          let x = canvasX - dims.width / 2;
          let y = canvasY - dims.height / 2;
          if (canvasSnapGridRef.current) {
            x = Math.round(x / step) * step;
            y = Math.round(y / step) * step;
          }
          isDroppingIntoModalRef.current = true;
          setDragGhost({
            type: 'media',
            screenX: 0,
            screenY: 0,
            canvasX: Math.round(x),
            canvasY: Math.round(y),
            width: dims.width,
            height: dims.height,
          });
          setSearchModalState({
            isOpen: true,
            mode: 'media',
            targetCanvasX: Math.round(x),
            targetCanvasY: Math.round(y),
          });
        },
        onHoverMedia: () => handleHoverItem('media'),
        onLeaveItem: handleLeaveItem,
        onAddWebPage: () => {
          handleAddWebPageCard(canvasX, canvasY);
        },
        onUndo: handleUndo,
        canUndo: undoStackRef.current.length > 0,
        onRedo: handleRedo,
        canRedo: redoStackRef.current.length > 0,
        onPaste: () => {
          handlePasteAtCoordinates(canvasX, canvasY);
        },
        canPaste: true,
        snapToGrid: canvasSnapGrid,
        onToggleSnapToGrid: () => setCanvasSnapGrid(!canvasSnapGrid),
        snapToObjects: canvasSnapObjects,
        onToggleSnapToObjects: () => setCanvasSnapObjects(!canvasSnapObjects),
        readOnly: canvasReadOnly,
        onToggleReadOnly: () => setCanvasReadOnly(!canvasReadOnly),
      });

      showContextMenu(e, items, {
        scope: 'canvas-board',
        onClose: () => {
          if (ghostLeaveTimeoutRef.current) {
            clearTimeout(ghostLeaveTimeoutRef.current);
            ghostLeaveTimeoutRef.current = null;
          }
          if (!isDroppingIntoModalRef.current) {
            setDragGhost(null);
          }
        },
      });
    },
    [
      canvasReadOnly,
      canvasSnapGrid,
      canvasSnapObjects,
      getCardDimensions,
      handleAddStickyCard,
      handleAddWebPageCard,
      handlePasteAtCoordinates,
      handleRedo,
      handleUndo,
      setCanvasReadOnly,
      setCanvasSnapGrid,
      setCanvasSnapObjects,
      showContextMenu,
      cancelArrowTargetingOrFocus,
    ]
  );

  const handleCardContextMenu = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (
        draftEdgeRef.current ||
        selectedEdgeIdRef.current ||
        Date.now() - lastArrowCancelTimeRef.current < 400
      ) {
        cancelArrowTargetingOrFocus();
        return;
      }

      const currentSelectedIds = selectedNodeIdsRef.current;
      const isMulti = currentSelectedIds.includes(nodeId) && currentSelectedIds.length > 1;

      if (!currentSelectedIds.includes(nodeId)) {
        selectSingleNode(nodeId);
      }

      if (isMulti) {
        const items = buildMultiSelectContextMenu({
          selectedCount: currentSelectedIds.length,
          onFitToCenter: handleFitToCenter,
          onDuplicate: handleDuplicateSelectedNodes,
          onColorChange: (color) => {
            for (const id of currentSelectedIds) {
              handleColorChange(id, color);
            }
          },
          onDelete: handleDeleteSelectedNodes,
        });
        showContextMenu(e, items, { scope: 'canvas-multi-select' });
        return;
      }

      const node = nodeMap.get(nodeId) || nodesRef.current.find((n) => n.id === nodeId);
      if (!node) return;

      const allDocs = useDocumentStore.getState().documents;
      const doc = node.document_id
        ? allDocs.find((d) => d.id === node.document_id) ||
          documents.find((d) => d.id === node.document_id) ||
          null
        : null;

      if (node.type === 'note' || doc) {
        const menuContext = {
          item: doc || ({ id: node.document_id || '', title: 'Document' } as DocumentItem),
          selectedDocIds: [doc?.id || node.document_id || nodeId],
          isMulti: false,
          app,
        };
        const customActions =
          doc && app.fileContextMenus ? app.fileContextMenus.getActions(menuContext) : [];
        const customFileActions = customActions.map((action) => ({
          id: action.id,
          title: typeof action.title === 'function' ? action.title(menuContext) : action.title,
          icon: typeof action.icon === 'function' ? action.icon(menuContext) : action.icon,
          isDanger: action.isDanger,
          onClick: () => action.onClick(menuContext),
        }));

        const items = buildNoteCardContextMenu({
          node,
          doc,
          onFitToCenter: () => handleFitNodeToCenter(node.id),
          onSwapFile: () => {
            setSwappingNodeId(node.id);
            setSearchModalState({
              isOpen: true,
              mode: 'note',
              targetCanvasX: node.x,
              targetCanvasY: node.y,
            });
          },
          onEdit: !canvasReadOnlyRef.current ? () => setAutoEditingNodeId(node.id) : undefined,
          onOpenInNewTab: () => {
            if (doc) {
              openTab(doc.id, doc.title, { newTab: true });
            }
          },
          onOpenToRight: () => {
            if (doc) {
              openSplitTab(doc.id, doc.title);
            }
          },
          onOpenInNewWindow: () => {
            platform.openVaultWindow();
          },
          onRename: () => {
            if (!doc) return;
            openInputDialog({
              title: `Rename "${doc.title}"`,
              defaultValue: doc.title,
              confirmText: 'Rename',
              onConfirm: async (newTitle) => {
                const trimmed = newTitle.trim();
                if (!trimmed || trimmed === doc.title) return;
                await useDocumentStore.getState().renameDocument(doc.id, trimmed);
                showToast(`Renamed to "${trimmed}"`, 'success');
              },
            });
          },
          onMoveFile: () => {
            if (!doc) return;
            promptFolderSelection({
              title: `Move "${doc.title}" to folder:`,
              allowRoot: true,
              onSelect: async (_folderPath, folderItem) => {
                const targetParentId = folderItem ? folderItem.id : null;
                await useDocumentStore.getState().moveDocuments([doc.id], targetParentId);
                showToast(`Moved "${doc.title}" to ${folderItem ? folderItem.title : 'root'}`, 'success');
              },
            });
          },
          isBookmarked: Boolean(doc?.is_bookmarked),
          onToggleBookmark: async () => {
            if (!doc) return;
            const isNow = await app.vault.toggleBookmark(doc.id);
            showToast(isNow ? `Bookmarked "${doc.title}"` : `Removed bookmark for "${doc.title}"`, 'info');
          },
          onCopyRelativePath: () => {
            if (!doc) return;
            const relPath = getDocumentPath(doc, allDocs);
            navigator.clipboard.writeText(relPath);
            showToast('Relative path copied', 'info');
          },
          onCopyAbsolutePath: () => {
            if (!doc) return;
            const relPath = getDocumentPath(doc, allDocs);
            const full = vaultPath ? `${vaultPath}/${relPath}`.replace(/\/+/g, '/') : relPath;
            navigator.clipboard.writeText(full);
            showToast('Absolute path copied', 'info');
          },
          onShowInExplorer: () => {
            if (platform.isDesktop()) {
              platform.openVaultInExplorer(vaultPath);
            } else {
              showToast('Vault folder: ' + (vaultPath || 'local memory'), 'info');
            }
          },
          currentColor: node.color,
          onColorChange: (color) => handleColorChange(node.id, color),
          onDeleteCard: () => handleDeleteNode(node.id),
          onDeleteFile: () => {
            if (!doc) return;
            openConfirmDialog({
              title: `Delete "${doc.title}"?`,
              message: `Are you sure you want to delete "${doc.title}"? It will be permanently removed from your Vault.`,
              confirmText: 'Delete file',
              isDanger: true,
              onConfirm: async () => {
                await useDocumentStore.getState().removeDocuments([doc.id]);
                handleDeleteNode(node.id);
                showToast(`Deleted "${doc.title}"`, 'success');
              },
            });
          },
          customFileActions,
        });

        showContextMenu(e, items, { scope: 'canvas-node-note', data: { node, document: doc } });
        return;
      }

      if (node.type === 'link' || node.url) {
        const items = buildLinkCardContextMenu({
          node,
          onFitToCenter: () => handleFitNodeToCenter(node.id),
          onOpenLink: () => {
            if (node.url) window.open(node.url, '_blank');
          },
          onCopyUrl: () => {
            if (node.url) {
              navigator.clipboard.writeText(node.url);
              showToast('Copied URL', 'info');
            }
          },
          onEditUrl: () => {
            openInputDialog({
              title: 'Edit web page URL',
              defaultValue: node.url || '',
              confirmText: 'Save',
              onConfirm: async (newUrl) => {
                let url = newUrl.trim();
                if (!url) return;
                if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
                const updatedNode: CanvasNode = { ...node, url, text_content: url };
                await saveCanvasNode(updatedNode);
                triggerDiskSync(effectiveBoardId);
                setNodes((prev) => prev.map((n) => (n.id === node.id ? updatedNode : n)));
                showToast('Updated web link', 'success');
              },
            });
          },
          currentColor: node.color,
          onColorChange: (color) => handleColorChange(node.id, color),
          onDelete: () => handleDeleteNode(node.id),
        });

        showContextMenu(e, items, { scope: 'canvas-node-link', data: { node } });
        return;
      }

      // Default: text card
      const items = buildTextCardContextMenu({
        node,
        onFitToCenter: () => handleFitNodeToCenter(node.id),
        onEdit: () => setAutoEditingNodeId(node.id),
        onConvertToFile: () => handleConvertCardToFile(node.id),
        currentColor: node.color,
        onColorChange: (color) => handleColorChange(node.id, color),
        onDelete: () => handleDeleteNode(node.id),
      });

      showContextMenu(e, items, { scope: 'canvas-node-text', data: { node } });
    },
    [
      app,
      documents,
      effectiveBoardId,
      handleColorChange,
      handleConvertCardToFile,
      handleDeleteNode,
      handleDeleteSelectedNodes,
      handleDuplicateSelectedNodes,
      handleFitNodeToCenter,
      handleFitToCenter,
      vaultPath,
      nodeMap,
      openConfirmDialog,
      openInputDialog,
      openSplitTab,
      openTab,
      promptFolderSelection,
      selectSingleNode,
      showContextMenu,
      showToast,
      triggerDiskSync,
      cancelArrowTargetingOrFocus,
    ]
  );

  const handleDockActionClick = useCallback(
    (type: CanvasDockActionType) => {
      const dims = getCardDimensions(type);
      const center = getCanvasViewportCenter(dims.width, dims.height);
      if (type === 'card') {
        handleAddStickyCard(center.x, center.y);
      } else {
        setDragGhost({
          type,
          screenX: 0,
          screenY: 0,
          canvasX: center.x,
          canvasY: center.y,
        });
        setSearchModalState({
          isOpen: true,
          mode: type,
          targetCanvasX: center.x,
          targetCanvasY: center.y,
        });
      }
    },
    [getCardDimensions, getCanvasViewportCenter, handleAddStickyCard]
  );

  const computeGhostPlacement = useCallback(
    (type: CanvasDockActionType, screenX: number, screenY: number) => {
      const dims = getCardDimensions(type);
      const el = containerRef.current;
      if (!el) {
        return { canvasX: 0, canvasY: 0, guides: [] as AlignmentGuide[] };
      }

      const rect = el.getBoundingClientRect();
      const curPan = panRef.current;
      const curZoom = zoomRef.current;

      const rawX = (screenX - rect.left - curPan.x) / curZoom - dims.width / 2;
      const rawY = (screenY - rect.top - curPan.y) / curZoom - dims.height / 2;

      const step = gridSizeRef.current || 20;
      const gridX = canvasSnapGridRef.current ? Math.round(rawX / step) * step : rawX;
      const gridY = canvasSnapGridRef.current ? Math.round(rawY / step) * step : rawY;

      let finalX = gridX;
      let finalY = gridY;
      let guides: AlignmentGuide[] = [];

      if (canvasSnapObjectsRef.current) {
        const threshold = 8 / Math.max(0.2, curZoom);
        const cWidth = el.clientWidth || window.innerWidth;
        const cHeight = el.clientHeight || window.innerHeight;

        const viewport = {
          left: -curPan.x / curZoom,
          top: -curPan.y / curZoom,
          right: (-curPan.x + cWidth) / curZoom,
          bottom: (-curPan.y + cHeight) / curZoom,
        };

        const snapResult = calculateObjectSnap(
          '__ghost__',
          rawX,
          rawY,
          gridX,
          gridY,
          dims.width,
          dims.height,
          nodesRef.current,
          threshold,
          viewport
        );

        finalX = snapResult.x;
        finalY = snapResult.y;
        guides = snapResult.guides;
      }

      return {
        canvasX: Math.round(finalX),
        canvasY: Math.round(finalY),
        guides,
      };
    },
    [getCardDimensions]
  );

  const handleDockDragStart = useCallback(
    (type: CanvasDockActionType, screenX: number, screenY: number) => {
      const { canvasX, canvasY, guides } = computeGhostPlacement(type, screenX, screenY);
      setDragGhost({ type, screenX, screenY, canvasX, canvasY });
      setActiveGuides(guides);
    },
    [computeGhostPlacement]
  );

  const handleDockDragMove = useCallback(
    (screenX: number, screenY: number) => {
      setDragGhost((prev) => {
        if (!prev) return null;
        const { canvasX, canvasY, guides } = computeGhostPlacement(prev.type, screenX, screenY);
        setActiveGuides(guides);
        return { ...prev, screenX, screenY, canvasX, canvasY };
      });
    },
    [computeGhostPlacement]
  );

  const handleDockDragEnd = useCallback(
    (type: CanvasDockActionType, screenX: number, screenY: number, didDrag: boolean) => {
      setActiveGuides([]);
      if (!didDrag) {
        setDragGhost(null);
        return;
      }

      const { canvasX, canvasY } = computeGhostPlacement(type, screenX, screenY);

      if (type === 'card') {
        setDragGhost(null);
        handleAddStickyCard(canvasX, canvasY);
      } else {
        // Keep the ghost card visible on the canvas at drop position while searching
        setDragGhost({
          type,
          screenX,
          screenY,
          canvasX,
          canvasY,
        });
        setSearchModalState({
          isOpen: true,
          mode: type,
          targetCanvasX: canvasX,
          targetCanvasY: canvasY,
        });
      }
    },
    [computeGhostPlacement, handleAddStickyCard]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let initialTouchDist = 0;
    let initialTouchZoom = 1;
    let initialTouchPan = { x: 0, y: 0 };
    let initialTouchCenter = { x: 0, y: 0 };

    const handleNativeWheel = (e: WheelEvent) => {
      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === 1) {
        dx *= 16;
        dy *= 16;
      } else if (e.deltaMode === 2) {
        dx *= window.innerHeight;
        dy *= window.innerHeight;
      }

      const target = targetTransformRef.current;
      const currentScale = target.scale;
      const currentX = target.x;
      const currentY = target.y;

      // Fast timestamp-based continuous scroll stream tracking (zero timers, zero GC overhead)
      const now = performance.now();
      const isNewStream = now - lastWheelTimeRef.current > 200;
      lastWheelTimeRef.current = now;

      if (isNewStream) {
        const targetEl = e.target as HTMLElement | null;
        const isOverScrollable = Boolean(
          targetEl && targetEl.closest('.custom-scrollbar, [data-scrollable="true"], pre, table')
        );
        wheelOriginWasCanvasRef.current = !isOverScrollable;
      }

      // 1. Zoom with Ctrl / Meta or Trackpad Pinch (getBoundingClientRect evaluated only when zooming)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();

        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let zoomFactor: number;
        if (Math.abs(dy) < 30 && e.deltaMode === 0) {
          zoomFactor = Math.exp(-dy * 0.01);
        } else {
          zoomFactor = dy < 0 ? 1.15 : 0.85;
        }

        const newScale = Math.min(3.0, Math.max(0.15, currentScale * zoomFactor));

        if (Math.abs(newScale - currentScale) > 0.0001) {
          lastMouseMoveEventRef.current = { clientX: e.clientX, clientY: e.clientY };

          let anchorX: number;
          let anchorY: number;

          if (isPanningRef.current && panCanvasAnchorRef.current) {
            anchorX = panCanvasAnchorRef.current.x;
            anchorY = panCanvasAnchorRef.current.y;
          } else {
            anchorX = (mouseX - currentX) / currentScale;
            anchorY = (mouseY - currentY) / currentScale;
          }

          const newTargetX = mouseX - anchorX * newScale;
          const newTargetY = mouseY - anchorY * newScale;

          targetTransformRef.current = {
            x: newTargetX,
            y: newTargetY,
            scale: newScale,
          };

          runCameraEasing();
        }
        return;
      }

      // 2. Strict Scrollable Card Isolation (Do NOT scroll canvas when hovering inside a scrollable card)
      // Only inspect DOM if gesture originated over a card (skips 100% of queries during canvas navigation!)
      if (!isPanModifierRef.current && !wheelOriginWasCanvasRef.current) {
        const scrollTarget = (e.target as HTMLElement | null)?.closest(
          '.custom-scrollbar, [data-scrollable="true"], pre, table'
        ) as HTMLElement | null;

        if (scrollTarget) {
          const isScrollableY = scrollTarget.scrollHeight > scrollTarget.clientHeight;
          const isScrollableX = scrollTarget.scrollWidth > scrollTarget.clientWidth;

          if (isScrollableY || isScrollableX) {
            const canScrollDown = dy > 0 && scrollTarget.scrollTop + scrollTarget.clientHeight < scrollTarget.scrollHeight - 1;
            const canScrollUp = dy < 0 && scrollTarget.scrollTop > 0;
            const canScrollRight = dx > 0 && scrollTarget.scrollLeft + scrollTarget.clientWidth < scrollTarget.scrollWidth - 1;
            const canScrollLeft = dx < 0 && scrollTarget.scrollLeft > 0;

            if (canScrollDown || canScrollUp || canScrollRight || canScrollLeft) {
              // Still has scroll room: permit native element scroll inside note card
              return;
            }

            // Reached scroll boundary (top, bottom, or sides): absorb event completely so canvas never pans
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
      }

      // 3. Directional Canvas Panning (Vertical dy, Horizontal dx, or Shift + Wheel)
      e.preventDefault();
      e.stopPropagation();

      let scrollX = dx;
      let scrollY = dy;

      // Standard desktop modifier: Shift + Vertical Wheel scrolls horizontally
      if (e.shiftKey && Math.abs(dy) > 0 && Math.abs(dx) === 0) {
        scrollX = dy;
        scrollY = 0;
      }

      const nextX = currentX - scrollX;
      const nextY = currentY - scrollY;
      targetTransformRef.current.x = nextX;
      targetTransformRef.current.y = nextY;
      currentTransformRef.current.x = nextX;
      currentTransformRef.current.y = nextY;

      // Instant direct GPU transform (zero lag, 144Hz+)
      syncDomTransform(nextX, nextY, currentScale);

      // Throttled React state update to avoid redundant multi-render per frame
      if (syncStateRafRef.current === null) {
        syncStateRafRef.current = requestAnimationFrame(() => {
          syncStateRafRef.current = null;
          setPan({ x: targetTransformRef.current.x, y: targetTransformRef.current.y });
        });
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialTouchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        initialTouchZoom = targetTransformRef.current.scale;
        initialTouchPan = { x: targetTransformRef.current.x, y: targetTransformRef.current.y };
        const rect = el.getBoundingClientRect();
        initialTouchCenter = {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialTouchDist > 0) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const scaleMultiplier = currentDist / initialTouchDist;
        const newScale = Math.min(3.0, Math.max(0.15, initialTouchZoom * scaleMultiplier));

        const rect = el.getBoundingClientRect();
        const currentCenter = {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top,
        };

        const newX = currentCenter.x - ((initialTouchCenter.x - initialTouchPan.x) * (newScale / initialTouchZoom));
        const newY = currentCenter.y - ((initialTouchCenter.y - initialTouchPan.y) * (newScale / initialTouchZoom));

        // Touch pinch is continuous, apply directly to both refs for responsive tracking
        targetTransformRef.current = { x: newX, y: newY, scale: newScale };
        currentTransformRef.current = { x: newX, y: newY, scale: newScale };
        runCameraEasing();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialTouchDist = 0;
      }
    };

    const handleGestureStart = (e: any) => {
      e.preventDefault();
      initialTouchZoom = targetTransformRef.current.scale;
      initialTouchPan = { x: targetTransformRef.current.x, y: targetTransformRef.current.y };
    };

    const handleGestureChange = (e: any) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = (e.clientX || rect.width / 2) - rect.left;
      const mouseY = (e.clientY || rect.height / 2) - rect.top;
      const newScale = Math.min(3.0, Math.max(0.15, initialTouchZoom * (e.scale || 1)));

      const newX = mouseX - ((mouseX - initialTouchPan.x) * (newScale / initialTouchZoom));
      const newY = mouseY - ((mouseY - initialTouchPan.y) * (newScale / initialTouchZoom));

      // Gesture events are continuous, apply directly
      targetTransformRef.current = { x: newX, y: newY, scale: newScale };
      currentTransformRef.current = { x: newX, y: newY, scale: newScale };
      runCameraEasing();
    };

    const handleGestureEnd = (e: any) => {
      e.preventDefault();
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('gesturestart', handleGestureStart, { passive: false });
    el.addEventListener('gesturechange', handleGestureChange, { passive: false });
    el.addEventListener('gestureend', handleGestureEnd, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('gesturestart', handleGestureStart);
      el.removeEventListener('gesturechange', handleGestureChange);
      el.removeEventListener('gestureend', handleGestureEnd);
    };
  }, []);

  const step = gridSize || 20;
  gridSizeRef.current = step;

  return (
    <div
      data-pinchable="true"
      data-canvas-view="true"
      data-main="true"
      className="noether-canvas-view noether-pinchable relative flex-1 h-full w-full overflow-hidden bg-[var(--noether-bg-main)] text-[var(--noether-text-primary)] select-none"
    >
      {/* 100% Consistent Page Subheader */}
      <PageSubHeader
        title={activeDoc?.title || 'Canvas'}
        icon={<Layout01Icon size={13} />}
        document={activeDoc}
        hideBar={true}
        showReadingToggle={false}
        showBookmark={false}
        showSearch={false}
        showDocOptions={true}
        customRightActions={
          <>
            {/* Zoom In Button */}
            <button
              type="button"
              onClick={handleZoomIn}
              title={`Zoom in (${Math.round(zoom * 100)}%)`}
              className="p-1 rounded text-[#777] hover:text-[#dcddde] hover:bg-[#222] cursor-pointer"
            >
              <PlusSignIcon size={14} />
            </button>

            {/* Reset Zoom Button */}
            <button
              type="button"
              onClick={handleResetZoom}
              title={`Reset zoom (${Math.round(zoom * 100)}%)`}
              className="p-1 rounded text-[#777] hover:text-[#dcddde] hover:bg-[#222] cursor-pointer"
            >
              <RotateCcwIcon size={14} />
            </button>

            {/* Fit to Center Button */}
            <button
              type="button"
              onClick={handleFitToCenter}
              title="Fit to center"
              className="p-1 rounded text-[#777] hover:text-[#dcddde] hover:bg-[#222] cursor-pointer"
            >
              <CenterFocusIcon size={14} />
            </button>

            {/* Zoom Out Button */}
            <button
              type="button"
              onClick={handleZoomOut}
              title={`Zoom out (${Math.round(zoom * 100)}%)`}
              className="p-1 rounded text-[#777] hover:text-[#dcddde] hover:bg-[#222] cursor-pointer"
            >
              <MinusSignIcon size={14} />
            </button>
          </>
        }
      />

      {/* Vertical Action Rail: Settings (Gear with popover dropdown) & Undo / Redo */}
      <CanvasSettingsRail
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Interactive Spatial Canvas Plane */}
      <div
        ref={containerRef}
        tabIndex={0}
        data-pinchable="true"
        data-canvas-view="true"
        data-custom-drop-target="true"
        data-main="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handleCanvasPointerMove}
        onDoubleClick={handleCanvasDoubleClick}
        onContextMenu={handleCanvasContextMenu}
        style={{ touchAction: 'none' }}
        className={`noether-canvas-view noether-pinchable absolute inset-0 w-full h-full bg-[var(--noether-bg-main)] overflow-hidden select-none touch-none outline-none ${
          isDraggingNodeState || isPanningState || (dragGhost && !searchModalState.isOpen)
            ? '!cursor-grabbing [&_*]:!cursor-grabbing'
            : draftEdge
            ? '!cursor-grab [&_*]:!cursor-grab'
            : isPanModifierState
            ? 'cursor-grab'
            : 'cursor-default'
        }`}
      >
        {/* Crisp Lightweight Vector Spatial Dot Grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
          <defs>
            <pattern
              ref={dotPatternRef}
              id="noether-canvas-dots"
              width={step}
              height={step}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x - (step / 2) * zoom}, ${pan.y - (step / 2) * zoom}) scale(${zoom})`}
            >
              <circle
                ref={dotCircleRef}
                cx={step / 2}
                cy={step / 2}
                r={Math.max(0.6, Math.min(1.8, 1 / zoom))}
                fill="rgba(255, 255, 255, 0.055)"
              />
            </pattern>
          </defs>
          <rect
            ref={dotGridRectRef}
            width="100%"
            height="100%"
            fill="url(#noether-canvas-dots)"
            style={{ opacity: Math.min(1, Math.max(0, (zoom - 0.18) / 0.22)) }}
          />
        </svg>

        {/* Infinite Canvas Content Plane */}
        <div
          ref={contentPlaneRef}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: '0 0',
            willChange: isPanningState || isDraggingNodeState || isPanModifierState ? 'transform' : 'auto',
          }}
          className="absolute inset-0 pointer-events-none"
        >
          {/* Interactive Bezier Edges SVG Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10 transition-none">
            <defs />

            {/* Existing Saved Edges */}
            {edges.map((edge) => {
              if (draftEdge?.editingEdgeId === edge.id) return null;

              const fromNode = nodeMap.get(edge.from_node_id);
              const toNode = nodeMap.get(edge.to_node_id);
              if (!fromNode || !toNode) return null;

              const defaultSides = determineDefaultConnectingSides(fromNode, toNode);
              const fromSide = edge.from_side || defaultSides.fromSide;
              const toSide = edge.to_side || defaultSides.toSide;

              const p1 = getSideAnchorPoint(fromNode, fromSide);
              const p2 = getSideAnchorPoint(toNode, toSide);

              const { path, arrowPath, sourceArrowPath, mid } = computeBezierPath(
                p1,
                fromSide,
                p2,
                toSide,
                12,
                13,
                edge.direction || 'unidirectional'
              );
              const isSelected = selectedEdgeId === edge.id;
              const edgeColor = edge.color || '#888888';
              const displayColor = isSelected ? '#ffffff' : edgeColor;

              const hasLabel = Boolean(edge.label && edge.label.trim() !== '');
              const isEditing = editingEdgeLabelId === edge.id;
              const shouldMask = hasLabel || isEditing;
              const textToMeasure = isEditing ? (editingLabelDraft || 'Type label...') : (edge.label || '');
              const labelBox = shouldMask ? getEdgeLabelBox(textToMeasure) : null;

              return (
                <g
                  key={edge.id}
                  data-edge-id={edge.id}
                  className="canvas-edge group/edge pointer-events-auto select-none transition-none cursor-pointer"
                  onPointerDown={(e) => handleEdgePointerDown(edge, e, 'auto')}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setSelectedEdgeId(edge.id);
                    selectedEdgeIdRef.current = edge.id;
                    setSelectedNodeId(null);
                    startEditingEdgeLabel(edge.id, edge.label || '');
                  }}
                >
                  {/* Invisible clipping mask for edge label gap (dynamic ID invalidates Blink compositor mask cache per keystroke) */}
                  {shouldMask && labelBox && (
                    <mask id={`edge-label-mask-${edge.id}-${Math.round(labelBox.width)}`}>
                      {/* White reveals the arrow curve */}
                      <rect x="-100000" y="-100000" width="200000" height="200000" fill="white" />
                      {/* Black clips out the arrow where the label sits */}
                      <rect
                        x={mid.x - labelBox.width / 2}
                        y={mid.y - labelBox.height / 2}
                        width={labelBox.width}
                        height={labelBox.height}
                        fill="black"
                      />
                    </mask>
                  )}

                  {/* Invisible wide hit path for effortless clicking and selection */}
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={20}
                    className="pointer-events-auto"
                  />
                  {/* Visible Edge Curve (terminates cleanly at arrowhead base center) */}
                  <path
                    d={path}
                    fill="none"
                    stroke={displayColor}
                    strokeWidth={isSelected ? 2.5 : 2}
                    mask={shouldMask && labelBox ? `url(#edge-label-mask-${edge.id}-${Math.round(labelBox.width)})` : undefined}
                    className="group-hover/edge:stroke-[#e0e0e0] transition-none pointer-events-auto"
                  />
                  {/* Target Arrowhead (unidirectional or bidirectional) */}
                  {arrowPath ? (
                    <path
                      d={arrowPath}
                      fill={displayColor}
                      className="group-hover/edge:fill-[#e0e0e0] transition-none pointer-events-auto cursor-pointer"
                    />
                  ) : null}
                  {/* Source Arrowhead (bidirectional) */}
                  {sourceArrowPath ? (
                    <path
                      d={sourceArrowPath}
                      fill={displayColor}
                      className="group-hover/edge:fill-[#e0e0e0] transition-none pointer-events-auto cursor-pointer"
                    />
                  ) : null}
                </g>
              );
            })}

            {/* Active Drafting Connection Arrow */}
            {draftEdge && (() => {
              const isRetargetingSource = draftEdge.editingEndpoint === 'source';
              const anchorNodeId = isRetargetingSource
                ? (draftEdge.fixedNodeId || draftEdge.fromNodeId)
                : draftEdge.fromNodeId;
              const anchorNode = nodeMap.get(anchorNodeId);
              if (!anchorNode) return null;

              const anchorSide = isRetargetingSource
                ? (draftEdge.fixedSide || 'left')
                : draftEdge.fromSide;
              const fixedPoint = getSideAnchorPoint(anchorNode, anchorSide);
              const floatingPoint = { x: draftEdge.currentCanvasX, y: draftEdge.currentCanvasY };
              let floatingSide: CanvasNodeSide;
              if (draftEdge.snappedTarget) {
                floatingSide = draftEdge.snappedTarget.side;
              } else if (isRetargetingSource) {
                const dx = fixedPoint.x - floatingPoint.x;
                const dy = fixedPoint.y - floatingPoint.y;
                if (Math.abs(dx) >= Math.abs(dy)) {
                  floatingSide = dx >= 0 ? 'right' : 'left';
                } else {
                  floatingSide = dy >= 0 ? 'bottom' : 'top';
                }
              } else {
                const dx = floatingPoint.x - fixedPoint.x;
                const dy = floatingPoint.y - fixedPoint.y;
                if (Math.abs(dx) >= Math.abs(dy)) {
                  floatingSide = dx >= 0 ? 'left' : 'right';
                } else {
                  floatingSide = dy >= 0 ? 'top' : 'bottom';
                }
              }

              const p1 = isRetargetingSource ? floatingPoint : fixedPoint;
              const fromSide: CanvasNodeSide = isRetargetingSource ? floatingSide : anchorSide;
              const p2 = isRetargetingSource ? fixedPoint : floatingPoint;
              const toSide: CanvasNodeSide = isRetargetingSource ? anchorSide : floatingSide;

              const originalEdge = draftEdge.editingEdgeId
                ? edgesRef.current.find((e) => e.id === draftEdge.editingEdgeId)
                : null;
              const direction = originalEdge?.direction || 'unidirectional';

              const { path, arrowPath, sourceArrowPath } = computeBezierPath(
                p1,
                fromSide,
                p2,
                toSide,
                12,
                13,
                direction
              );

              return (
                <g className="pointer-events-none select-none transition-none">
                  {/* Full-bodied curve terminating cleanly at arrowhead base */}
                  <path
                    d={path}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2.5}
                    className="transition-none"
                  />
                  {/* Smoothly-aligned solid arrowhead */}
                  {arrowPath && (
                    <path
                      d={arrowPath}
                      fill="#ffffff"
                      className="transition-none"
                    />
                  )}
                  {sourceArrowPath && (
                    <path
                      d={sourceArrowPath}
                      fill="#ffffff"
                      className="transition-none"
                    />
                  )}
                </g>
              );
            })()}
          </svg>

          {/* HTML Overlay for Edge Labels & Selected Edge Action Pill */}
          <div className="absolute inset-0 pointer-events-none z-20">
            {edges.map((edge) => {
              if (draftEdge?.editingEdgeId === edge.id) return null;

              const fromNode = nodeMap.get(edge.from_node_id);
              const toNode = nodeMap.get(edge.to_node_id);
              if (!fromNode || !toNode) return null;

              const defaultSides = determineDefaultConnectingSides(fromNode, toNode);
              const fromSide = edge.from_side || defaultSides.fromSide;
              const toSide = edge.to_side || defaultSides.toSide;

              const p1 = getSideAnchorPoint(fromNode, fromSide);
              const p2 = getSideAnchorPoint(toNode, toSide);

              const { mid } = computeBezierPath(
                p1,
                fromSide,
                p2,
                toSide,
                12,
                13,
                edge.direction || 'unidirectional'
              );

              const isSelected = selectedEdgeId === edge.id;
              const isEditingLabel = editingEdgeLabelId === edge.id;
              const hasLabel = Boolean(edge.label && edge.label.trim() !== '');

              return (
                <React.Fragment key={`edge-ui-${edge.id}`}>
                  {/* Edge Midpoint Label */}
                  {(hasLabel || isEditingLabel) && (
                    <EdgeLabel
                      label={edge.label}
                      mid={mid}
                      isSelected={isSelected}
                      isEditing={isEditingLabel}
                      onStartEdit={() => startEditingEdgeLabel(edge.id, edge.label || '')}
                      onDraftChange={handleDraftChange}
                      onSave={(newLabel) => {
                        cancelEditingEdgeLabel();
                        handleUpdateEdge(edge.id, { label: newLabel });
                      }}
                      onCancel={cancelEditingEdgeLabel}
                    />
                  )}

                  {/* Selected Edge Action Pill */}
                  {isSelected && !canvasReadOnly && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${mid.x}px`,
                        top: `${mid.y - (hasLabel || isEditingLabel ? 22 : 16)}px`,
                        transform: `translate(-50%, -100%) scale(${computePillScale(zoom)})`,
                        transformOrigin: 'bottom center',
                      }}
                      className="canvas-edge-action-pill pointer-events-auto z-30 select-none transition-none"
                    >
                      <EdgeActionPill
                        onDelete={() => handleDeleteEdge(edge.id)}
                        onFitToCenter={() => handleFitEdgeToCenter(edge, mid)}
                        onColorChange={(color) => handleUpdateEdge(edge.id, { color })}
                        currentColor={edge.color}
                        onDirectionChange={(direction) => handleUpdateEdge(edge.id, { direction })}
                        currentDirection={edge.direction || 'unidirectional'}
                        hasLabel={hasLabel}
                        onEditLabel={() => startEditingEdgeLabel(edge.id, edge.label || '')}
                        onClearLabel={() => handleUpdateEdge(edge.id, { label: '' })}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Object Snapping Alignment Guidelines & Corner / Center Dots */}
          {activeGuides.length > 0 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-40 transition-none"
              style={{ transition: 'none' }}
            >
              {activeGuides.map((guide, idx) => (
                <g key={`${guide.type}-${idx}`} className="transition-none" style={{ transition: 'none' }}>
                  <line
                    x1={guide.x1}
                    y1={guide.y1}
                    x2={guide.x2}
                    y2={guide.y2}
                    stroke="rgba(255, 255, 255, 0.55)"
                    strokeWidth={1 / zoom}
                    className="transition-none"
                    style={{ transition: 'none' }}
                  />
                  {guide.points.map((pt, pIdx) => (
                    <circle
                      key={`${Math.round(pt.x)}-${Math.round(pt.y)}-${pIdx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={3 / Math.min(1.5, Math.max(0.5, zoom))}
                      fill="#ffffff"
                      stroke="rgba(0, 0, 0, 0.65)"
                      strokeWidth={0.75 / zoom}
                      className="transition-none"
                      style={{ transition: 'none' }}
                    />
                  ))}
                </g>
              ))}
            </svg>
          )}

        {visibleNodes.map((node) => {
          const doc = node.document_id ? docMap.get(node.document_id) || null : null;
          const isSelected = selectedNodeIds.includes(node.id) || selectedNodeId === node.id;
          const isMultiSelected = selectedNodeIds.length > 1;
          const contentJson = node.document_id ? docContentMap[node.document_id] : undefined;

          return (
            <CanvasCard
              key={node.id}
              node={node}
              doc={doc}
              contentJson={contentJson}
              isSelected={isSelected}
              isMultiSelected={isMultiSelected}
              isSpacePressed={isPanModifierState}
              isPanModifier={isPanModifierState}
              isPanning={isPanningState}
              isDragging={isDraggingNodeState && (draggingNodeIdRef.current === node.id || dragCandidateNodeIdRef.current === node.id)}
              isReadOnly={canvasReadOnly}
              zoom={zoom}
              autoFocus={autoEditingNodeId === node.id}
              onAutoFocusConsumed={() => setAutoEditingNodeId((current) => (current === node.id ? null : current))}
              onSelect={handleNodePointerDown}
              onOpenDoc={handleOpenDoc}
              onFitToCenter={handleFitNodeToCenter}
              onDelete={handleDeleteNode}
              onColorChange={handleColorChange}
              onTextChange={handleTextChange}
              onDocContentChange={handleDocContentChange}
              onResizeStart={handleResizeStart}
              onImageDimensions={handleImageDimensions}
              onTaskToggle={handleTaskToggle}
              onSideDotPointerDown={handleSideDotPointerDown}
              activeSnapSide={draftEdge?.snappedTarget?.nodeId === node.id ? draftEdge.snappedTarget.side : null}
              isDraftingArrow={Boolean(draftEdge)}
              onContextMenu={handleCardContextMenu}
            />
          );
        })}

        {/* Arrowhead / Endpoint Retarget Grab Handles Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible transition-none"
          style={{ zIndex: 40 }}
        >
          {/* Interactive Retarget Grab Handles (mounted strictly when an edge is selected so unselected edges never shadow card drag dots) */}
          {!canvasReadOnly && !draftEdge && edges.map((edge) => {
            const isSelected = selectedEdgeId === edge.id;
            if (!isSelected) return null;

            const fromNode = nodeMap.get(edge.from_node_id);
            const toNode = nodeMap.get(edge.to_node_id);
            if (!fromNode || !toNode) return null;

            const defaultSides = determineDefaultConnectingSides(fromNode, toNode);
            const fromSide = edge.from_side || defaultSides.fromSide;
            const toSide = edge.to_side || defaultSides.toSide;
            const p1 = getSideAnchorPoint(fromNode, fromSide);
            const p2 = getSideAnchorPoint(toNode, toSide);
            const hitRadius = 26 / Math.min(1.5, Math.max(0.6, zoom));

            return (
              <g key={`edge-handles-${edge.id}`} className="transition-none">
                {/* Source endpoint grab handle at p1 */}
                <circle
                  cx={p1.x}
                  cy={p1.y}
                  r={hitRadius}
                  fill="transparent"
                  style={{ pointerEvents: 'all' }}
                  className="cursor-grab active:cursor-grabbing pointer-events-auto"
                  onPointerDown={(e) => handleEdgePointerDown(edge, e, 'source')}
                />

                {/* Target endpoint grab handle at p2 */}
                <circle
                  cx={p2.x}
                  cy={p2.y}
                  r={hitRadius}
                  fill="transparent"
                  style={{ pointerEvents: 'all' }}
                  className="cursor-grab active:cursor-grabbing pointer-events-auto"
                  onPointerDown={(e) => handleEdgePointerDown(edge, e, 'target')}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setSelectedEdgeId(edge.id);
                    selectedEdgeIdRef.current = edge.id;
                    setSelectedNodeId(null);
                    startEditingEdgeLabel(edge.id, edge.label || '');
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Marquee Selection Drag Box */}
        {marqueeBox && (
          <div
            style={{
              left: `${marqueeBox.startX}px`,
              top: `${marqueeBox.startY}px`,
              width: `${marqueeBox.currentX - marqueeBox.startX}px`,
              height: `${marqueeBox.currentY - marqueeBox.startY}px`,
            }}
            className="absolute border border-white/70 bg-white/[0.06] rounded-[2px] pointer-events-none z-30 transition-none"
          />
        )}

        {/* Multi-Selection Bounding Enclosure Box & Floating Multi-Action Pill */}
        {multiSelectBounds && (
          <div
            style={{
              left: `${multiSelectBounds.x}px`,
              top: `${multiSelectBounds.y}px`,
              width: `${multiSelectBounds.width}px`,
              height: `${multiSelectBounds.height}px`,
            }}
            className="absolute border border-[#b8b8b8]/45 bg-[#909090]/[0.07] rounded-[2px] pointer-events-none z-25 transition-none select-none"
          >
            <svg className="absolute -inset-[4px] w-[calc(100%+8px)] h-[calc(100%+8px)] overflow-visible pointer-events-none">
              <rect
                x={4}
                y={4}
                width={multiSelectBounds.width}
                height={multiSelectBounds.height}
                rx={2}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
                style={{ pointerEvents: 'stroke' }}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  const primaryId = selectedNodeIds[0];
                  if (primaryId) handleNodePointerDown(primaryId, e as any);
                }}
              />
            </svg>
            {!canvasReadOnly && !isDraggingNodeState && !isMarqueeActiveState && (
              <div className="pointer-events-auto">
                <MultiSelectActionPill
                  onDelete={handleDeleteSelectedNodes}
                  onColorChange={handleBatchColorChange}
                  onFitToCenter={handleFitMultiSelectionToCenter}
                  zoom={zoom}
                  count={multiSelectBounds.count}
                />
              </div>
            )}
          </div>
        )}

          {/* Snapped Drag Ghost Preview in Spatial Canvas Coordinate Plane */}
          {dragGhost && (() => {
            const dims = getCardDimensions(dragGhost.type);
            const w = dragGhost.width || dims.width;
            const h = dragGhost.height || dims.height;
            return (
              <div
                className="absolute pointer-events-none z-30 rounded-md border-2 border-dashed border-[#888888] bg-[#1e1e1e]/85 backdrop-blur-[2px] select-none transition-none flex items-center justify-center gap-2"
                style={{
                  left: `${dragGhost.canvasX}px`,
                  top: `${dragGhost.canvasY}px`,
                  width: `${w}px`,
                  height: `${h}px`,
                }}
              >
                {dragGhost.type === 'card' && (
                  <div className="flex items-center gap-1.5 text-white/50 select-none">
                    <StickyNote03Icon size={16} />
                    <span className="text-xs font-medium">Card</span>
                  </div>
                )}
                {dragGhost.type === 'note' && (
                  <div className="flex items-center gap-1.5 text-white/50 select-none">
                    <FileEmpty01Icon size={16} />
                    <span className="text-xs font-medium">Note</span>
                  </div>
                )}
                {dragGhost.type === 'media' && (
                  <div className="flex items-center gap-1.5 text-white/50 select-none">
                    <FileImageIcon size={16} />
                    <span className="text-xs font-medium">Media</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Floating Bottom Center Dock (Card, Note, Media) */}
      <CanvasBottomDock
        onActionClick={handleDockActionClick}
        onDragStart={handleDockDragStart}
        onDragMove={handleDockDragMove}
        onDragEnd={handleDockDragEnd}
      />

      {/* Search Modal for Note & Media */}
      <CanvasItemSearchModal
        isOpen={searchModalState.isOpen}
        mode={searchModalState.mode}
        currentBoardId={effectiveBoardId}
        onClose={() => {
          if (ghostLeaveTimeoutRef.current) {
            clearTimeout(ghostLeaveTimeoutRef.current);
            ghostLeaveTimeoutRef.current = null;
          }
          setDragGhost(null);
          setDraftEdge(null);
          draftEdgeRef.current = null;
          pendingEdgeConnectionRef.current = null;
          isCompletingUnconnectedDropRef.current = false;
          isDroppingIntoModalRef.current = false;
          setSwappingNodeId(null);
          setSearchModalState((prev) => ({ ...prev, isOpen: false }));
        }}
        onSelectDocument={async (docId) => {
          if (ghostLeaveTimeoutRef.current) {
            clearTimeout(ghostLeaveTimeoutRef.current);
            ghostLeaveTimeoutRef.current = null;
          }

          // Capture pending edge retarget/connect info immediately before any async wait
          const pending = pendingEdgeConnectionRef.current;
          pendingEdgeConnectionRef.current = null;
          isCompletingUnconnectedDropRef.current = false;
          isDroppingIntoModalRef.current = false;

          if (swappingNodeId) {
            setDragGhost(null);
            handleSwapNodeDocument(swappingNodeId, docId);
            setSwappingNodeId(null);
            setSearchModalState((prev) => ({ ...prev, isOpen: false }));
            return;
          }

          if (canvasReadOnlyRef.current) {
            showToast('Canvas is in read-only mode', 'warning');
            setDraftEdge(null);
            draftEdgeRef.current = null;
            setDragGhost(null);
            setSearchModalState((prev) => ({ ...prev, isOpen: false }));
            return;
          }

          const allDocs = useDocumentStore.getState().documents;
          const targetDoc =
            allDocs.find((d: DocumentItem) => d.id === docId) ||
            documents.find((d: DocumentItem) => d.id === docId);
          if (!targetDoc) {
            setDraftEdge(null);
            draftEdgeRef.current = null;
            setDragGhost(null);
            setSearchModalState((prev) => ({ ...prev, isOpen: false }));
            return;
          }

          const isImg = isImageDocument(targetDoc);
          const nodeWidth = isImg ? 340 : 320;
          const nodeHeight = isImg ? 260 : 280;

          recordSnapshot();
          const newNode: CanvasNode = {
            id: `node-${Date.now()}`,
            board_id: effectiveBoardId,
            type: 'note',
            x: searchModalState.targetCanvasX,
            y: searchModalState.targetCanvasY,
            width: nodeWidth,
            height: nodeHeight,
            document_id: docId,
            color: '',
          };

          // 1. Immediately update nodes in memory and state synchronously
          nodesRef.current = [...nodesRef.current, newNode];
          setNodes(nodesRef.current);
          setSelectedNodeId(newNode.id);
          setSelectedEdgeId(null);
          selectedEdgeIdRef.current = null;

          // 2. Immediately retarget or create edge in memory and state synchronously
          let edgeToPersist: CanvasEdge | null = null;
          if (pending) {
            if (pending.editingEdgeId) {
              const edgeId = pending.editingEdgeId;
              const currentEdge = edgesRef.current.find((e) => e.id === edgeId);
              if (currentEdge) {
                const endpoint = pending.editingEndpoint || 'target';
                const updatedEdge: CanvasEdge =
                  endpoint === 'source'
                    ? { ...currentEdge, from_node_id: newNode.id, from_side: pending.incomingSide }
                    : { ...currentEdge, to_node_id: newNode.id, to_side: pending.incomingSide };
                edgesRef.current = edgesRef.current.map((e) => (e.id === edgeId ? updatedEdge : e));
                setEdges(edgesRef.current);
                edgeToPersist = updatedEdge;
              }
            } else if (pending.fromNodeId) {
              const newEdge: CanvasEdge = {
                id: `edge-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                board_id: effectiveBoardId,
                from_node_id: pending.fromNodeId,
                from_side: pending.fromSide,
                to_node_id: newNode.id,
                to_side: pending.incomingSide,
              };
              edgesRef.current = [...edgesRef.current, newEdge];
              setEdges(edgesRef.current);
              edgeToPersist = newEdge;
            }
          }

          // 3. Clear draft edge, ghost, and close modal in this EXACT same React render batch
          setDraftEdge(null);
          draftEdgeRef.current = null;
          setDragGhost(null);
          setSearchModalState((prev) => ({ ...prev, isOpen: false }));

          // 4. Background persistence without blocking UI
          await saveCanvasNode(newNode);
          if (edgeToPersist) {
            await saveCanvasEdge(edgeToPersist);
          }
          triggerDiskSync(effectiveBoardId);
          showToast(`Added ${targetDoc.title || 'document'} to canvas`, 'success');
        }}
      />
    </div>
  );
});
