import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useCanvasSettings } from './canvasSettings';
import { useDocumentStore } from '@/store/documentStore';
import { CanvasNode, CanvasEdge } from './types';
import {
  getCanvasNodes,
  getCanvasEdges,
  saveCanvasNode,
  deleteCanvasNode,
} from './canvasDb';
import {
  PlusSignIcon,
  Cancel01Icon,
  File01Icon,
  Delete02Icon,
  SparklesIcon,
  Layout01Icon,
  RotateCcwIcon,
} from '@/components/common/Icons';
import { PageSubHeader } from '@/components/layout/PageSubHeader';

export const CanvasView: React.FC = React.memo(() => {
  const setMainViewMode = useWorkspaceStore((s) => s.setMainViewMode);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const canvasSnapGrid = useCanvasSettings((s) => s.canvasSnapGrid);
  const gridSize = useCanvasSettings((s) => s.gridSize);
  const documents = useDocumentStore((s) => s.documents);
  const setActiveDocumentById = useDocumentStore((s) => s.setActiveDocumentById);

  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLButtonElement>(null);
  const addMenuDropdownRef = useRef<HTMLDivElement>(null);
  const [addMenuPos, setAddMenuPos] = useState<{ top?: number; left?: number; bottom?: number }>({});

  // Debounced save for card text edits with flush on unmount
  const textPendingNodesRef = useRef<Map<string, { timer: any; node: CanvasNode }>>(new Map());

  const debouncedSaveNode = useCallback((node: CanvasNode) => {
    const existing = textPendingNodesRef.current.get(node.id);
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(() => {
      saveCanvasNode(node);
      textPendingNodesRef.current.delete(node.id);
    }, 300);
    textPendingNodesRef.current.set(node.id, { timer, node });
  }, []);

  const flushCanvasSaves = useCallback(() => {
    textPendingNodesRef.current.forEach(({ timer, node }) => {
      clearTimeout(timer);
      saveCanvasNode(node);
    });
    textPendingNodesRef.current.clear();
  }, []);

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

  const updateAddMenuPos = useCallback(() => {
    if (!addMenuRef.current) return;
    const rect = addMenuRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const targetLeft = Math.max(8, Math.min(window.innerWidth - 232, rect.right - 224));
    if (spaceBelow < 260 && rect.top > 260) {
      setAddMenuPos({
        bottom: window.innerHeight - rect.top + 4,
        left: targetLeft,
      });
    } else {
      setAddMenuPos({
        top: rect.bottom + 4,
        left: targetLeft,
      });
    }
  }, []);

  useEffect(() => {
    if (!isAddMenuOpen) return;

    updateAddMenuPos();

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        addMenuDropdownRef.current &&
        !addMenuDropdownRef.current.contains(e.target as Node) &&
        addMenuRef.current &&
        !addMenuRef.current.contains(e.target as Node)
      ) {
        setIsAddMenuOpen(false);
      }
    };

    const handleScrollOrResize = () => updateAddMenuPos();

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isAddMenuOpen, updateAddMenuPos]);

  // Pan & Zoom
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [zoom, setZoom] = useState(1);
  const [isPanningState, setIsPanningState] = useState(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Dragging node
  const draggingNodeIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Throttled mouse move via requestAnimationFrame
  const mouseMoveRafRef = useRef<number | null>(null);
  const lastMouseMoveEventRef = useRef<{ clientX: number; clientY: number } | null>(null);

  useEffect(() => {
    return () => {
      if (mouseMoveRafRef.current !== null) {
        cancelAnimationFrame(mouseMoveRafRef.current);
      }
    };
  }, []);

  // Load Canvas Nodes from SQLite on mount (only once, NOT on every documents update)
  useEffect(() => {
    getCanvasNodes('default').then((savedNodes) => {
      if (savedNodes.length > 0) {
        setNodes(savedNodes);
      } else {
        const currentDocs = useDocumentStore.getState().documents;
        const welcomeDoc = currentDocs.find((d) => d.id === 'welcome-to-flint') || currentDocs[0];
        const initialNodes: CanvasNode[] = [
          {
            id: `node-${Date.now()}-1`,
            board_id: 'default',
            type: 'text',
            x: 200,
            y: 150,
            width: 240,
            height: 140,
            text_content: '💡 Welcome to your Infinite Spatial Canvas! You can organize thoughts, drag cards, and connect notes.',
            color: '#2a2a2a',
          },
        ];
        if (welcomeDoc) {
          initialNodes.push({
            id: `node-${Date.now()}-2`,
            board_id: 'default',
            type: 'note',
            x: 500,
            y: 150,
            width: 260,
            height: 160,
            document_id: welcomeDoc.id,
            color: '#1a1a1a',
          });
        }
        setNodes(initialNodes);
        initialNodes.forEach(saveCanvasNode);
      }
    });

    getCanvasEdges('default').then(setEdges);
  }, []);

  const handleAddTextCard = useCallback(async () => {
    const step = gridSize || 20;
    let initialX = (-pan.x + 300) / zoom;
    let initialY = (-pan.y + 200) / zoom;
    if (canvasSnapGrid) {
      initialX = Math.round(initialX / step) * step;
      initialY = Math.round(initialY / step) * step;
    }
    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      board_id: 'default',
      type: 'text',
      x: initialX,
      y: initialY,
      width: 240,
      height: 140,
      text_content: 'New thought or idea...',
      color: '#242424',
    };
    await saveCanvasNode(newNode);
    setNodes((prev) => [...prev, newNode]);
    setIsAddMenuOpen(false);
    showToast('Added note card', 'success');
  }, [pan.x, pan.y, zoom, canvasSnapGrid, gridSize, showToast]);

  const handleAddDocCard = useCallback(async (docId: string) => {
    const step = gridSize || 20;
    let initialX = (-pan.x + 300) / zoom;
    let initialY = (-pan.y + 200) / zoom;
    if (canvasSnapGrid) {
      initialX = Math.round(initialX / step) * step;
      initialY = Math.round(initialY / step) * step;
    }
    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      board_id: 'default',
      type: 'note',
      x: initialX,
      y: initialY,
      width: 260,
      height: 160,
      document_id: docId,
      color: '#1a1a1a',
    };
    await saveCanvasNode(newNode);
    setNodes((prev) => [...prev, newNode]);
    setIsAddMenuOpen(false);
    showToast('Added document to canvas', 'success');
  }, [pan.x, pan.y, zoom, canvasSnapGrid, gridSize, showToast]);

  const handleDeleteNode = useCallback(async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await deleteCanvasNode(id);
    setNodes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    showToast('Removed card', 'info');
  }, [selectedNodeId, showToast]);

  // Keyboard shortcut to delete selected card (Delete / Backspace when not typing)
  useEffect(() => {
    const handleCanvasKeyDown = (e: KeyboardEvent) => {
      if (!selectedNodeId) return;
      const target = (e.target || document.activeElement) as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        Boolean(target?.isContentEditable);
      if (isInput) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
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
  }, [selectedNodeId, handleDeleteNode]);

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

  // Refs for real-time reads during continuous drag operations
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const canvasSnapGridRef = useRef(canvasSnapGrid);
  const gridSizeRef = useRef(gridSize);
  const nodesRef = useRef(nodes);

  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { canvasSnapGridRef.current = canvasSnapGrid; }, [canvasSnapGrid]);
  useEffect(() => { gridSizeRef.current = gridSize; }, [gridSize]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  // Background Pan & Drag Handlers with continuous window/pointer capture tracking
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.canvas-card, button, input, textarea')) return;
    isPanningRef.current = true;
    setIsPanningState(true);
    panStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
    setSelectedNodeId(null);
    try {
      (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {}
  }, []);

  const handleNodePointerDown = useCallback((e: React.PointerEvent, node: CanvasNode) => {
    if ((e.target as HTMLElement).closest('button, textarea, input, a')) return;
    e.stopPropagation();
    setSelectedNodeId(node.id);
    draggingNodeIdRef.current = node.id;
    const mouseCanvasX = (e.clientX - panRef.current.x) / zoomRef.current;
    const mouseCanvasY = (e.clientY - panRef.current.y) / zoomRef.current;
    dragOffsetRef.current = {
      x: mouseCanvasX - node.x,
      y: mouseCanvasY - node.y,
    };
    try {
      (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {}
  }, []);

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isPanningRef.current && !draggingNodeIdRef.current) return;
      lastMouseMoveEventRef.current = { clientX: e.clientX, clientY: e.clientY };
      if (mouseMoveRafRef.current === null) {
        mouseMoveRafRef.current = requestAnimationFrame(() => {
          mouseMoveRafRef.current = null;
          const pos = lastMouseMoveEventRef.current;
          if (!pos) return;

          if (isPanningRef.current) {
            setPan({
              x: pos.clientX - panStartRef.current.x,
              y: pos.clientY - panStartRef.current.y,
            });
          } else if (draggingNodeIdRef.current) {
            const dragId = draggingNodeIdRef.current;
            setNodes((prev) => {
              const node = prev.find((n) => n.id === dragId);
              if (!node) return prev;
              let newX = (pos.clientX - panRef.current.x) / zoomRef.current - dragOffsetRef.current.x;
              let newY = (pos.clientY - panRef.current.y) / zoomRef.current - dragOffsetRef.current.y;
              if (canvasSnapGridRef.current) {
                const step = gridSizeRef.current || 20;
                newX = Math.round(newX / step) * step;
                newY = Math.round(newY / step) * step;
              }
              return prev.map((n) => (n.id === dragId ? { ...n, x: newX, y: newY } : n));
            });
          }
        });
      }
    };

    const handleGlobalPointerUp = () => {
      if (mouseMoveRafRef.current !== null) {
        cancelAnimationFrame(mouseMoveRafRef.current);
        mouseMoveRafRef.current = null;
      }
      if (draggingNodeIdRef.current) {
        const dragId = draggingNodeIdRef.current;
        const node = nodesRef.current.find((n) => n.id === dragId);
        if (node) {
          saveCanvasNode(node);
        }
      }
      isPanningRef.current = false;
      setIsPanningState(false);
      draggingNodeIdRef.current = null;
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let initialTouchDist = 0;
    let initialTouchZoom = 1;
    let initialTouchPan = { x: 0, y: 0 };
    let initialTouchCenter = { x: 0, y: 0 };

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === 1) {
        dx *= 16;
        dy *= 16;
      } else if (e.deltaMode === 2) {
        dx *= window.innerHeight;
        dy *= window.innerHeight;
      }

      // Trackpad pinch-to-zoom or Ctrl + Mouse Wheel
      if (e.ctrlKey || e.metaKey) {
        let zoomFactor: number;
        if (Math.abs(dy) < 40) {
          zoomFactor = Math.pow(2, -dy * 0.025);
        } else {
          zoomFactor = dy < 0 ? 1.18 : 0.84;
        }

        setZoom((prevZoom) => {
          const newZoom = Math.min(3.0, Math.max(0.15, prevZoom * zoomFactor));
          setPan((prevPan) => ({
            x: mouseX - ((mouseX - prevPan.x) * (newZoom / prevZoom)),
            y: mouseY - ((mouseY - prevPan.y) * (newZoom / prevZoom)),
          }));
          return newZoom;
        });
        return;
      }

      // Shift + Wheel -> Horizontal Pan
      if (e.shiftKey) {
        setPan((prevPan) => ({
          x: prevPan.x - (Math.abs(dy) > 0 ? dy : dx),
          y: prevPan.y,
        }));
        return;
      }

      // Trackpad 2-Finger Horizontal / Diagonal Pan
      if (Math.abs(dx) > 0) {
        setPan((prevPan) => ({
          x: prevPan.x - dx,
          y: prevPan.y - dy,
        }));
        return;
      }

      // Mouse Wheel Scroll (without Ctrl) OR Trackpad Vertical Scroll -> Zoom centered at cursor
      let zoomFactor: number;
      if (Math.abs(dy) < 30 && e.deltaMode === 0) {
        zoomFactor = Math.pow(2, -dy * 0.02);
      } else {
        zoomFactor = dy < 0 ? 1.18 : 0.84;
      }

      setZoom((prevZoom) => {
        const newZoom = Math.min(3.0, Math.max(0.15, prevZoom * zoomFactor));
        setPan((prevPan) => ({
          x: mouseX - ((mouseX - prevPan.x) * (newZoom / prevZoom)),
          y: mouseY - ((mouseY - prevPan.y) * (newZoom / prevZoom)),
        }));
        return newZoom;
      });
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialTouchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        setZoom((z) => {
          initialTouchZoom = z;
          return z;
        });
        setPan((p) => {
          initialTouchPan = { ...p };
          return p;
        });
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
        const newZoom = Math.min(3.0, Math.max(0.15, initialTouchZoom * scaleMultiplier));

        const rect = el.getBoundingClientRect();
        const currentCenter = {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top,
        };

        setZoom(newZoom);
        setPan({
          x: currentCenter.x - ((initialTouchCenter.x - initialTouchPan.x) * (newZoom / initialTouchZoom)),
          y: currentCenter.y - ((initialTouchCenter.y - initialTouchPan.y) * (newZoom / initialTouchZoom)),
        });
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialTouchDist = 0;
      }
    };

    const handleGestureStart = (e: any) => {
      e.preventDefault();
      setZoom((z) => {
        initialTouchZoom = z;
        return z;
      });
      setPan((p) => {
        initialTouchPan = { ...p };
        return p;
      });
    };

    const handleGestureChange = (e: any) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = (e.clientX || rect.width / 2) - rect.left;
      const mouseY = (e.clientY || rect.height / 2) - rect.top;
      const newZoom = Math.min(3.0, Math.max(0.15, initialTouchZoom * (e.scale || 1)));

      setZoom(newZoom);
      setPan({
        x: mouseX - ((mouseX - initialTouchPan.x) * (newZoom / initialTouchZoom)),
        y: mouseY - ((mouseY - initialTouchPan.y) * (newZoom / initialTouchZoom)),
      });
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
      className="flint-canvas-view flint-pinchable relative flex-1 h-full w-full overflow-hidden bg-[#181818] text-[var(--flint-text-primary)] select-none"
    >
      {/* 100% Consistent Page Subheader */}
      <PageSubHeader
        title="Canvas"
        icon={<Layout01Icon size={13} />}
        document={null}
        hideBar={true}
        showReadingToggle={false}
        showBookmark={false}
        showSearch={false}
        showDocOptions={true}
        customRightActions={
          <>
            {/* Add Card Menu Trigger */}
            <div className="relative">
              <button
                ref={addMenuRef}
                type="button"
                onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                title="Add card to canvas"
                className={`p-1 rounded transition-colors cursor-pointer ${
                  isAddMenuOpen
                    ? 'text-white bg-[#282828]'
                    : 'text-[#777] hover:text-[#dcddde] hover:bg-[#222]'
                }`}
              >
                <PlusSignIcon size={14} />
              </button>

              {/* Add Menu Dropdown */}
              {isAddMenuOpen &&
                createPortal(
                  <div
                    ref={addMenuDropdownRef}
                    style={{
                      position: 'fixed',
                      top: addMenuPos.top !== undefined ? `${addMenuPos.top}px` : undefined,
                      bottom: addMenuPos.bottom !== undefined ? `${addMenuPos.bottom}px` : undefined,
                      left: addMenuPos.left !== undefined ? `${addMenuPos.left}px` : undefined,
                      zIndex: 99999,
                    }}
                    className="w-56 bg-[#1e1e1e] border border-[#333333] rounded-[6px] shadow-[0_8px_24px_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.3)] p-1 text-xs flex flex-col gap-0.5 select-none"
                  >
                    <button
                      onClick={handleAddTextCard}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] hover:bg-[#282828] text-left text-[#c5c6c8] hover:text-white transition-colors cursor-pointer"
                    >
                      <SparklesIcon size={14} className="text-[#fbbf24]" />
                      <span>Text / Sticky Note</span>
                    </button>

                    <div className="border-t border-[#2a2a2a] my-0.5" />
                    <div className="px-2.5 py-1 text-[10px] text-[#666] uppercase font-semibold">
                      Insert Document
                    </div>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                      {documents.filter((d) => !d.is_folder).map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => handleAddDocCard(doc.id)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] hover:bg-[#282828] text-left text-[#c5c6c8] hover:text-white truncate transition-colors cursor-pointer"
                        >
                          <File01Icon size={13} className="shrink-0 text-[#777]" />
                          <span className="truncate">{doc.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>,
                  document.body
                )}
            </div>

            {/* Reset View Button */}
            <button
              type="button"
              onClick={() => {
                setPan({ x: 100, y: 100 });
                setZoom(1);
              }}
              title={`Reset view (${Math.round(zoom * 100)}%)`}
              className="p-1 rounded text-[#777] hover:text-[#dcddde] hover:bg-[#222] transition-colors cursor-pointer"
            >
              <RotateCcwIcon size={14} />
            </button>
          </>
        }
      />

      {/* Interactive Spatial Canvas Plane */}
      <div
        ref={containerRef}
        data-pinchable="true"
        data-canvas-view="true"
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
        className={`flint-canvas-view flint-pinchable absolute inset-0 w-full h-full bg-[#181818] overflow-hidden select-none touch-none ${
          isPanningState ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Crisp Lightweight Vector Spatial Dot Grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
          <defs>
            <pattern
              id="flint-canvas-dots"
              width={cellSize}
              height={cellSize}
              patternUnits="userSpaceOnUse"
              x={pan.x % cellSize}
              y={pan.y % cellSize}
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
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute inset-0 pointer-events-none"
        >
        {nodes.map((node) => {
          const doc = node.document_id
            ? documents.find((d) => d.id === node.document_id)
            : null;
          const isSelected = selectedNodeId === node.id;

          return (
            <div
              key={node.id}
              onPointerDown={(e) => handleNodePointerDown(e, node)}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                minHeight: `${node.height}px`,
                backgroundColor: node.color || '#1e1e1e',
              }}
              className={`canvas-card absolute pointer-events-auto rounded-xl p-3 shadow-2xl flex flex-col justify-between border transition-shadow ${
                isSelected
                  ? 'border-[#888] shadow-white/10 ring-1 ring-[#666]'
                  : 'border-[#2c2c2c] hover:border-[#444]'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-2 border-b border-[#333]/50 cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#dcddde] truncate">
                  {node.type === 'note' ? (
                    <>
                      <File01Icon size={13} className="text-[#888888]" />
                      <span className="truncate">{doc?.title || 'Document'}</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon size={13} className="text-[#fbbf24]" />
                      <span>Note Card</span>
                    </>
                  )}
                </div>

                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => handleDeleteNode(node.id, e)}
                  className="p-1 rounded hover:bg-[#333] text-[#777] hover:text-rose-400 transition-colors"
                >
                  <Delete02Icon size={12} />
                </button>
              </div>

              {/* Card Body */}
              <div className="flex-1 py-2 text-xs text-[#bbb] leading-relaxed">
                {node.type === 'note' ? (
                  <div
                    onDoubleClick={() => {
                      if (node.document_id) {
                        setActiveDocumentById(node.document_id);
                        setMainViewMode('document');
                      }
                    }}
                    className="cursor-pointer hover:text-white line-clamp-4 text-[11px] text-[#888888]"
                  >
                    <p className="font-medium text-white mb-1">{doc?.title || 'Untitled'}</p>
                    <p>Double-click to open and edit note in workspace.</p>
                  </div>
                ) : (
                  <textarea
                    onPointerDown={(e) => e.stopPropagation()}
                    value={node.text_content || ''}
                    onChange={(e) => handleTextChange(node.id, e.target.value)}
                    placeholder="Type note content..."
                    className="w-full h-20 bg-transparent text-xs text-[#e5e7eb] outline-none resize-none placeholder-[#555]"
                  />
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
});
