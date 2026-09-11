import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCanvasSettings } from './canvasSettings';
import { CanvasNode, CanvasEdge } from './types';
import {
  getCanvasNodes,
  getCanvasEdges,
  saveCanvasNode,
  deleteCanvasNode,
  syncCanvasToDisk,
  importCanvasBoard,
} from './canvasDb';
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
  FileEmpty02Icon,
  FileImageIcon,
} from '@/components/common/Icons';
import { PageSubHeader } from '@/components/layout/PageSubHeader';
import { useFlintApp, useHearthDocuments, useActiveDocument, useToast } from 'flint';
import type { DocumentItem } from '@/types';
import { CanvasCard, ResizeHandleType } from './components/CanvasCard';
import { isImageDocument } from './components/CardContentRenderer';
import { CanvasSettingsRail } from './components/CanvasSettingsRail';
import { CanvasBottomDock, CanvasDockActionType } from './components/CanvasBottomDock';
import { CanvasItemSearchModal } from './components/CanvasItemSearchModal';
import { calculateObjectSnap, AlignmentGuide } from './utils/canvasSnapping';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';

export interface CanvasViewProps {
  boardId?: string;
  tabId?: string;
}

export const CanvasView: React.FC<CanvasViewProps> = React.memo(({ boardId, tabId }) => {
  const app = useFlintApp();
  const setMainViewMode = useCallback((m: string) => app.workspace.setMainViewMode(m), [app]);
  const showToast = useToast();
  const canvasSnapGrid = useCanvasSettings((s: any) => s.canvasSnapGrid);
  const canvasSnapObjects = useCanvasSettings((s: any) => s.canvasSnapObjects);
  const canvasReadOnly = useCanvasSettings((s: any) => s.canvasReadOnly);
  const gridSize = useCanvasSettings((s: any) => s.gridSize);
  const documents = useHearthDocuments();
  const activeDocument = useActiveDocument();
  const isLightboxOpen = useWorkspaceStore((s) => Boolean(s.imageLightbox?.isOpen));
  const setActiveDocumentById = useCallback((id: string) => app.hearth.openDocument(id), [app]);

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
  const [docContentMap, setDocContentMap] = useState<Record<string, string>>({});
  const [activeGuides, setActiveGuides] = useState<AlignmentGuide[]>([]);
  const [dragGhost, setDragGhost] = useState<{
    type: CanvasDockActionType;
    screenX: number;
    screenY: number;
    canvasX: number;
    canvasY: number;
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

  const nodesRef = useRef(nodes);
  const canvasSnapGridRef = useRef(canvasSnapGrid);
  const canvasSnapObjectsRef = useRef(canvasSnapObjects);
  const canvasReadOnlyRef = useRef(canvasReadOnly);
  const gridSizeRef = useRef(gridSize);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
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
        const doc = await app.hearth.readDocument(id);
        if (isMounted && doc) {
          setDocContentMap((prev) => ({ ...prev, [id]: doc.content_json || '' }));
        }
      } catch {}
    });

    return () => {
      isMounted = false;
    };
  }, [nodes, app.hearth, docContentMap]);

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

  // Canvas Action History (Undo / Redo)
  const undoStackRef = useRef<CanvasNode[][]>([]);
  const redoStackRef = useRef<CanvasNode[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const recordSnapshot = useCallback(() => {
    const currentSnapshot = nodesRef.current.map((n) => ({ ...n }));
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

    const currentSnapshot = nodesRef.current.map((n) => ({ ...n }));
    redoStackRef.current.push(currentSnapshot);

    const prevIds = new Set(previousState.map((n) => n.id));
    const currentNodes = nodesRef.current;

    for (const n of currentNodes) {
      if (!prevIds.has(n.id)) {
        await deleteCanvasNode(n.id);
      }
    }
    for (const n of previousState) {
      await saveCanvasNode(n);
    }
    triggerDiskSync(effectiveBoardId);

    setNodes(previousState);
    updateUndoRedoState();
    showToast('Undo', 'info');
  }, [effectiveBoardId, triggerDiskSync, updateUndoRedoState, showToast]);

  const handleRedo = useCallback(async () => {
    if (canvasReadOnlyRef.current || redoStackRef.current.length === 0) return;
    const nextState = redoStackRef.current.pop();
    if (!nextState) return;

    const currentSnapshot = nodesRef.current.map((n) => ({ ...n }));
    undoStackRef.current.push(currentSnapshot);

    const nextIds = new Set(nextState.map((n) => n.id));
    const currentNodes = nodesRef.current;

    for (const n of currentNodes) {
      if (!nextIds.has(n.id)) {
        await deleteCanvasNode(n.id);
      }
    }
    for (const n of nextState) {
      await saveCanvasNode(n);
    }
    triggerDiskSync(effectiveBoardId);

    setNodes(nextState);
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
      const cell = step * scale;
      const halfCell = cell / 2;
      const patternX = (((x - halfCell) % cell) + cell) % cell;
      const patternY = (((y - halfCell) % cell) + cell) % cell;
      dotPatternRef.current.setAttribute('x', String(patternX));
      dotPatternRef.current.setAttribute('y', String(patternY));
    }
  }, []);

  const runCameraEasing = useCallback(() => {
    if (cameraRafRef.current !== null) return; // Already running

    const tick = () => {
      const target = targetTransformRef.current;
      const current = currentTransformRef.current;

      // Snappy, responsive zoom easing (settles in 2-3 frames while retaining subtle visual fluidity)
      const ease = isPanningRef.current || draggingNodeIdRef.current ? 1.0 : 0.38;

      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const ds = target.scale - current.scale;

      const settled = Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05 && Math.abs(ds) < 0.0005;

      if (settled) {
        // Snap to exact target and stop the loop
        current.x = target.x;
        current.y = target.y;
        current.scale = target.scale;
        syncDomTransform(current.x, current.y, current.scale);
        setPan({ x: current.x, y: current.y });
        setZoom(current.scale);
        cameraRafRef.current = null;
        return;
      }

      current.x += dx * ease;
      current.y += dy * ease;
      current.scale += ds * ease;

      syncDomTransform(current.x, current.y, current.scale);
      setPan({ x: current.x, y: current.y });
      setZoom(current.scale);

      cameraRafRef.current = requestAnimationFrame(tick);
    };

    cameraRafRef.current = requestAnimationFrame(tick);
  }, [syncDomTransform]);

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
    };
  }, []);

  // Dragging node
  const [isDraggingNodeState, setIsDraggingNodeState] = useState(false);
  const draggingNodeIdRef = useRef<string | null>(null);
  const dragCandidateNodeIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Cancel any canvas drag immediately if lightbox opens
  useEffect(() => {
    if (isLightboxOpen) {
      dragCandidateNodeIdRef.current = null;
      draggingNodeIdRef.current = null;
      dragDidMoveRef.current = false;
      setIsDraggingNodeState(false);
      setActiveGuides([]);
      setDragGhost(null);
    }
  }, [isLightboxOpen]);

  // Throttled mouse move via requestAnimationFrame
  const mouseMoveRafRef = useRef<number | null>(null);
  const lastMouseMoveEventRef = useRef<{ clientX: number; clientY: number } | null>(null);

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
        const currentDoc = app.hearth.documents.find((d: DocumentItem) => d.id === effectiveBoardId);
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
          const currentDocs = app.hearth.documents;
          const welcomeDoc = currentDocs.find((d: DocumentItem) => d.id === 'welcome-to-flint') || currentDocs[0];
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

  const handleAddTextCard = useCallback(async () => {
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
    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      board_id: effectiveBoardId,
      type: 'text',
      x: initialX,
      y: initialY,
      width: 260,
      height: 180,
      text_content: 'New thought or idea...',
      color: '#1e1e1e',
    };
    await saveCanvasNode(newNode);
    triggerDiskSync(effectiveBoardId);
    setNodes((prev) => [...prev, newNode]);
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
    setNodes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    showToast('Removed card', 'info');
  }, [effectiveBoardId, selectedNodeId, showToast, triggerDiskSync, recordSnapshot]);

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

  // Keyboard shortcuts: Delete/Backspace to remove card, Ctrl+Z / Ctrl+Y for Undo/Redo
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

      if (!selectedNodeId) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (canvasReadOnlyRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        handleDeleteNode(selectedNodeId);
      } else if (e.key === 'Escape') {
        setSelectedNodeId(null);
      }
    };

    window.addEventListener('keydown', handleCanvasKeyDown);
    return () => {
      window.removeEventListener('keydown', handleCanvasKeyDown);
    };
  }, [selectedNodeId, handleDeleteNode, handleUndo, handleRedo]);

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
        await app.hearth.saveDocument(docId, newContentJson);
      } catch (e) {
        console.error('Failed to save document from canvas card:', e);
      }
    },
    [app.hearth]
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
          await app.hearth.saveDocument(docId, updatedContent);
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
    [nodes, docContentMap, app.hearth, handleTextChange]
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
    if ((e.target as HTMLElement).closest('.canvas-card, button, input, textarea')) return;

    // Panning requires holding Space/Ctrl (left click) OR Middle Mouse Button (button === 1)
    const isMiddleClick = e.button === 1;
    const isModifierPan = e.button === 0 && (isPanModifierRef.current || e.ctrlKey || e.metaKey);

    if (isMiddleClick || isModifierPan) {
      e.preventDefault();
      isPanningRef.current = true;
      setIsPanningState(true);
      const ct = currentTransformRef.current;
      panStartRef.current = { x: e.clientX - ct.x, y: e.clientY - ct.y };
      setSelectedNodeId(null);
      try {
        (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
      } catch {}
      return;
    }

    // Normal left-click without space/ctrl: deselect any active card
    if (e.button === 0) {
      setSelectedNodeId(null);
    }
  }, []);

  const handleNodePointerDown = useCallback((id: string, e: React.PointerEvent) => {
    const isModifierPan = isPanModifierRef.current || e.ctrlKey || e.metaKey || e.button === 1;

    // If Space or Ctrl is held down OR middle-mouse click, pan the canvas instead of dragging the card
    if (isModifierPan) {
      e.preventDefault();
      isPanningRef.current = true;
      setIsPanningState(true);
      const ct = currentTransformRef.current;
      panStartRef.current = { x: e.clientX - ct.x, y: e.clientY - ct.y };
      try {
        (containerRef.current as HTMLElement)?.setPointerCapture?.(e.pointerId);
      } catch {}
      return;
    }

    if ((e.target as HTMLElement).closest('button, textarea, input, a, .resize-handle')) return;

    e.stopPropagation();
    const node = nodesRef.current.find((n) => n.id === id);
    if (!node) return;
    setSelectedNodeId(node.id);

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
  }, []);

  const resizingNodeIdRef = useRef<string | null>(null);
  const resizeHandleRef = useRef<ResizeHandleType | null>(null);
  const resizeStartDimsRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
    startX: number;
    startY: number;
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

      resizeStartDimsRef.current = {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        startX: e.clientX,
        startY: e.clientY,
        isImage,
        aspectRatio: aspect,
      };
      try {
        (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
      } catch {}
    },
    [documents]
  );

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (isLightboxOpen) return;

      if (isCtrlHeldRef.current && !e.ctrlKey && !e.metaKey) {
        isCtrlHeldRef.current = false;
        const active = isSpaceHeldRef.current;
        if (active !== isPanModifierRef.current) {
          isPanModifierRef.current = active;
          setIsPanModifierState(active);
        }
      }

      if (!isPanningRef.current && !draggingNodeIdRef.current && !dragCandidateNodeIdRef.current && !resizingNodeIdRef.current) return;
      lastMouseMoveEventRef.current = { clientX: e.clientX, clientY: e.clientY };
      if (mouseMoveRafRef.current === null) {
        mouseMoveRafRef.current = requestAnimationFrame(() => {
          mouseMoveRafRef.current = null;
          const pos = lastMouseMoveEventRef.current;
          if (!pos) return;

          if (isPanningRef.current) {
            const newX = pos.clientX - panStartRef.current.x;
            const newY = pos.clientY - panStartRef.current.y;
            targetTransformRef.current.x = newX;
            targetTransformRef.current.y = newY;
            currentTransformRef.current.x = newX;
            currentTransformRef.current.y = newY;

            syncDomTransform(newX, newY, currentTransformRef.current.scale);

            if (syncStateRafRef.current === null) {
              syncStateRafRef.current = requestAnimationFrame(() => {
                syncStateRafRef.current = null;
                setPan({ x: targetTransformRef.current.x, y: targetTransformRef.current.y });
              });
            }
          } else if (resizingNodeIdRef.current) {
            if (!resizeDidMoveRef.current) {
              resizeDidMoveRef.current = true;
              recordSnapshot();
            }
            const resizeId = resizingNodeIdRef.current;
            const handle = resizeHandleRef.current;
            const start = resizeStartDimsRef.current;
            const deltaX = (pos.clientX - start.startX) / zoomRef.current;
            const deltaY = (pos.clientY - start.startY) / zoomRef.current;
            const isImage = Boolean(start.isImage);
            const aspect = start.aspectRatio || 1.33;
            const step = canvasSnapGridRef.current ? (gridSizeRef.current || 20) : 1;

            setNodes((prev) => {
              return prev.map((n) => {
                if (n.id !== resizeId) return n;
                let newX = start.x;
                let newY = start.y;
                let newW = start.width;
                let newH = start.height;

                if (isImage) {
                  // For images: lock aspect ratio on any axis / diagonal resize so no letterbox spaces appear
                  if (handle === 'se') {
                    const dominant = Math.abs(deltaX) >= Math.abs(deltaY * aspect) ? deltaX : deltaY * aspect;
                    newW = Math.max(160, start.width + dominant);
                    if (canvasSnapGridRef.current) newW = Math.round(newW / step) * step;
                    newH = Math.max(100, Math.round(newW / aspect));
                  } else if (handle === 'sw') {
                    const dominant = Math.abs(deltaX) >= Math.abs(deltaY * aspect) ? -deltaX : deltaY * aspect;
                    newW = Math.max(160, start.width + dominant);
                    if (canvasSnapGridRef.current) newW = Math.round(newW / step) * step;
                    newH = Math.max(100, Math.round(newW / aspect));
                    newX = start.x + (start.width - newW);
                  } else if (handle === 'ne') {
                    const dominant = Math.abs(deltaX) >= Math.abs(deltaY * aspect) ? deltaX : -deltaY * aspect;
                    newW = Math.max(160, start.width + dominant);
                    if (canvasSnapGridRef.current) newW = Math.round(newW / step) * step;
                    newH = Math.max(100, Math.round(newW / aspect));
                    newY = start.y + (start.height - newH);
                  } else if (handle === 'nw') {
                    const dominant = Math.abs(deltaX) >= Math.abs(deltaY * aspect) ? -deltaX : -deltaY * aspect;
                    newW = Math.max(160, start.width + dominant);
                    if (canvasSnapGridRef.current) newW = Math.round(newW / step) * step;
                    newH = Math.max(100, Math.round(newW / aspect));
                    newX = start.x + (start.width - newW);
                    newY = start.y + (start.height - newH);
                  } else if (handle === 'e') {
                    newW = Math.max(160, start.width + deltaX);
                    if (canvasSnapGridRef.current) newW = Math.round(newW / step) * step;
                    newH = Math.max(100, Math.round(newW / aspect));
                  } else if (handle === 'w') {
                    newW = Math.max(160, start.width - deltaX);
                    if (canvasSnapGridRef.current) newW = Math.round(newW / step) * step;
                    newH = Math.max(100, Math.round(newW / aspect));
                    newX = start.x + (start.width - newW);
                  } else if (handle === 's') {
                    newH = Math.max(100, start.height + deltaY);
                    if (canvasSnapGridRef.current) newH = Math.round(newH / step) * step;
                    newW = Math.max(160, Math.round(newH * aspect));
                  } else if (handle === 'n') {
                    newH = Math.max(100, start.height - deltaY);
                    if (canvasSnapGridRef.current) newH = Math.round(newH / step) * step;
                    newW = Math.max(160, Math.round(newH * aspect));
                    newY = start.y + (start.height - newH);
                  }
                } else {
                  // Standard 8-directional freeform resize for notes and text cards
                  if (handle === 'e' || handle === 'se' || handle === 'ne') {
                    newW = Math.max(160, start.width + deltaX);
                    if (canvasSnapGridRef.current) newW = Math.round(newW / step) * step;
                  } else if (handle === 'w' || handle === 'sw' || handle === 'nw') {
                    newW = Math.max(160, start.width - deltaX);
                    if (canvasSnapGridRef.current) newW = Math.round(newW / step) * step;
                    newX = start.x + (start.width - newW);
                  }

                  if (handle === 's' || handle === 'se' || handle === 'sw') {
                    newH = Math.max(100, start.height + deltaY);
                    if (canvasSnapGridRef.current) newH = Math.round(newH / step) * step;
                  } else if (handle === 'n' || handle === 'ne' || handle === 'nw') {
                    newH = Math.max(100, start.height - deltaY);
                    if (canvasSnapGridRef.current) newH = Math.round(newH / step) * step;
                    newY = start.y + (start.height - newH);
                  }
                }

                return { ...n, x: newX, y: newY, width: newW, height: newH };
              });
            });
          } else if (dragCandidateNodeIdRef.current || draggingNodeIdRef.current) {
            const dragId = draggingNodeIdRef.current || dragCandidateNodeIdRef.current;
            if (!dragId) return;

            if (!dragDidMoveRef.current) {
              const dx = Math.abs(pos.clientX - dragStartClientRef.current.x);
              const dy = Math.abs(pos.clientY - dragStartClientRef.current.y);
              if (dx < 4 && dy < 4) return;
              dragDidMoveRef.current = true;
              draggingNodeIdRef.current = dragId;
              setIsDraggingNodeState(true);
              recordSnapshot();
            }
            const currentNodes = nodesRef.current;
            const node = currentNodes.find((n) => n.id === dragId);
            if (!node) return;

            const rawX = (pos.clientX - panRef.current.x) / zoomRef.current - dragOffsetRef.current.x;
            const rawY = (pos.clientY - panRef.current.y) / zoomRef.current - dragOffsetRef.current.y;

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

            const nextNodes = currentNodes.map((n) => (n.id === dragId ? { ...n, x: finalX, y: finalY } : n));
            nodesRef.current = nextNodes;
            setActiveGuides(newGuides);
            setNodes(nextNodes);
          }
        });
      }
    };

    const handleGlobalPointerUp = (e?: PointerEvent) => {
      if (mouseMoveRafRef.current !== null) {
        cancelAnimationFrame(mouseMoveRafRef.current);
        mouseMoveRafRef.current = null;
      }
      if (draggingNodeIdRef.current && dragDidMoveRef.current) {
        const dragId = draggingNodeIdRef.current;
        const node = nodesRef.current.find((n) => n.id === dragId);
        if (node) {
          saveCanvasNode(node);
          triggerDiskSyncRef.current(node.board_id);
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

      setActiveGuides([]);
      dragCandidateNodeIdRef.current = null;
      dragDidMoveRef.current = false;
      resizeDidMoveRef.current = false;
      isPanningRef.current = false;
      setIsPanningState(false);
      draggingNodeIdRef.current = null;
      setIsDraggingNodeState(false);
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [recordSnapshot]);

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

  // Double-click on empty canvas to quickly place a new text card at cursor
  const handleCanvasDoubleClick = useCallback(
    async (e: React.MouseEvent) => {
      if (canvasReadOnlyRef.current) return;
      if ((e.target as HTMLElement).closest('.canvas-card, button, input, textarea, a')) return;
      const el = containerRef.current;
      if (!el) return;
      recordSnapshot();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const ct = currentTransformRef.current;
      let canvasX = (mouseX - ct.x) / ct.scale;
      let canvasY = (mouseY - ct.y) / ct.scale;
      const step = gridSizeRef.current || 20;
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
        width: 260,
        height: 180,
        text_content: '',
        color: '',
      };
      await saveCanvasNode(newNode);
      triggerDiskSync(effectiveBoardId);
      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
    },
    [effectiveBoardId, triggerDiskSync, recordSnapshot]
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

    window.addEventListener('flint:custom-drop', handleCustomDrop);
    return () => {
      window.removeEventListener('flint:custom-drop', handleCustomDrop);
    };
  }, [documents, effectiveBoardId, showToast, triggerDiskSync, recordSnapshot]);

  const getCardDimensions = useCallback((type: CanvasDockActionType) => {
    switch (type) {
      case 'card':
        return { width: 260, height: 180 };
      case 'note':
        return { width: 320, height: 280 };
      case 'media':
        return { width: 340, height: 260 };
    }
  }, []);

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
      const newNode: CanvasNode = {
        id: `node-${Date.now()}`,
        board_id: effectiveBoardId,
        type: 'text',
        x,
        y,
        width: 260,
        height: 180,
        text_content: '',
        color: '',
      };
      await saveCanvasNode(newNode);
      triggerDiskSync(effectiveBoardId);
      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      showToast('Added card', 'info');
    },
    [effectiveBoardId, recordSnapshot, showToast, triggerDiskSync]
  );

  const handleAddDocumentCard = useCallback(
    async (docId: string, x: number, y: number) => {
      if (canvasReadOnlyRef.current) {
        showToast('Canvas is in read-only mode', 'warning');
        return;
      }
      const allDocs = useDocumentStore.getState().documents;
      const targetDoc =
        allDocs.find((d: DocumentItem) => d.id === docId) ||
        documents.find((d: DocumentItem) => d.id === docId);
      if (!targetDoc) return;

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
      await saveCanvasNode(newNode);
      triggerDiskSync(effectiveBoardId);
      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      showToast(`Added ${targetDoc.title || 'document'} to canvas`, 'success');
    },
    [documents, effectiveBoardId, recordSnapshot, showToast, triggerDiskSync]
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
          targetTransformRef.current = {
            x: mouseX - ((mouseX - currentX) * (newScale / currentScale)),
            y: mouseY - ((mouseY - currentY) * (newScale / currentScale)),
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

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('gesturestart', handleGestureStart, { passive: false });
    el.addEventListener('gesturechange', handleGestureChange, { passive: false });
    el.addEventListener('gestureend', handleGestureStart, { passive: false });

    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('gesturestart', handleGestureStart);
      el.removeEventListener('gesturechange', handleGestureChange);
      el.removeEventListener('gestureend', handleGestureStart);
    };
  }, []);

  const step = gridSize || 20;
  const cellSize = step * zoom;

  return (
    <div
      data-pinchable="true"
      data-canvas-view="true"
      data-main="true"
      className="flint-canvas-view flint-pinchable relative flex-1 h-full w-full overflow-hidden bg-[var(--flint-bg-main)] text-[var(--flint-text-primary)] select-none"
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
        data-pinchable="true"
        data-canvas-view="true"
        data-custom-drop-target="true"
        data-main="true"
        onPointerDown={handlePointerDown}
        onDoubleClick={handleCanvasDoubleClick}
        style={{ touchAction: 'none' }}
        className={`flint-canvas-view flint-pinchable absolute inset-0 w-full h-full bg-[var(--flint-bg-main)] overflow-hidden select-none touch-none ${
          isPanningState || isDraggingNodeState ? 'cursor-grabbing' : isPanModifierState ? 'cursor-grab' : 'cursor-default'
        }`}
      >
        {/* Crisp Lightweight Vector Spatial Dot Grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
          <defs>
            <pattern
              ref={dotPatternRef}
              id="flint-canvas-dots"
              width={cellSize}
              height={cellSize}
              patternUnits="userSpaceOnUse"
              x={(((pan.x - cellSize / 2) % cellSize) + cellSize) % cellSize}
              y={(((pan.y - cellSize / 2) % cellSize) + cellSize) % cellSize}
            >
              <circle
                cx={cellSize / 2}
                cy={cellSize / 2}
                r={Math.max(0.75, Math.min(1.5, 1 * zoom))}
                fill="rgba(255, 255, 255, 0.10)"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#flint-canvas-dots)" />
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
          const isSelected = selectedNodeId === node.id;
          const contentJson = node.document_id ? docContentMap[node.document_id] : undefined;

          return (
            <CanvasCard
              key={node.id}
              node={node}
              doc={doc}
              contentJson={contentJson}
              isSelected={isSelected}
              isSpacePressed={isPanModifierState}
              isPanModifier={isPanModifierState}
              isPanning={isPanningState}
              isDragging={isDraggingNodeState && (draggingNodeIdRef.current === node.id || dragCandidateNodeIdRef.current === node.id)}
              isReadOnly={canvasReadOnly}
              onSelect={handleNodePointerDown}
              onOpenDoc={handleOpenDoc}
              onDelete={handleDeleteNode}
              onColorChange={handleColorChange}
              onTextChange={handleTextChange}
              onDocContentChange={handleDocContentChange}
              onResizeStart={handleResizeStart}
              onImageDimensions={handleImageDimensions}
              onTaskToggle={handleTaskToggle}
            />
          );
        })}

          {/* Snapped Drag Ghost Preview in Spatial Canvas Coordinate Plane */}
          {dragGhost && (() => {
            const dims = getCardDimensions(dragGhost.type);
            return (
              <div
                className="absolute pointer-events-none z-30 rounded-md border-2 border-dashed border-[#888888] bg-[#1e1e1e]/85 backdrop-blur-[2px] shadow-2xl select-none transition-none"
                style={{
                  left: `${dragGhost.canvasX}px`,
                  top: `${dragGhost.canvasY}px`,
                  width: `${dims.width}px`,
                  height: `${dims.height}px`,
                }}
              />
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
          setDragGhost(null);
          setSearchModalState((prev) => ({ ...prev, isOpen: false }));
        }}
        onSelectDocument={(docId) => {
          setDragGhost(null);
          handleAddDocumentCard(
            docId,
            searchModalState.targetCanvasX,
            searchModalState.targetCanvasY
          );
        }}
      />
    </div>
  );
});
