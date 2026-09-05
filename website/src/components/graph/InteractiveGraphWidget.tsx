import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { DocNode } from '../../types';
import { Cancel01Icon, Search01Icon, Maximize01Icon, CenterFocusIcon } from '../common/Icons';

export interface InteractiveGraphWidgetProps {
  nodes: DocNode[];
  activeDocId: string;
  onSelectDoc: (node: DocNode) => void;
  className?: string;
}

interface GraphNode {
  id: string;
  title: string;
  displayTitle?: string;
  slug?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  linkCount: number;
  hoverAlpha?: number;
  dimAlpha?: number;
  connectAlpha?: number;
  popScale?: number;
  popAlpha?: number;
  floatPhaseX?: number;
  floatPhaseY?: number;
  floatFreq?: number;
  rawDoc: DocNode;
}

interface GraphLink {
  source: string;
  target: string;
  hoverAlpha?: number;
  dimAlpha?: number;
  hoverOriginId?: string;
}

// Deterministic seed helper (ensures stable, organic radial dispersion across refreshes)
function hashStringToUnit(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function getDeterministicNodePos(id: string, index = 0): { x: number; y: number } {
  const goldenAngle = 2.399963229728653;
  const hashVar = (hashStringToUnit(id + ':angle') - 0.5) * 0.7;
  const angle = index * goldenAngle + hashVar;
  const uDist = hashStringToUnit(id + ':dist');
  const dist = 75 + Math.sqrt(index + 1) * 50 + (uDist - 0.5) * 28;
  return {
    x: Math.round(Math.cos(angle) * dist),
    y: Math.round(Math.sin(angle) * dist),
  };
}

export const InteractiveGraphWidget: React.FC<InteractiveGraphWidgetProps> = React.memo(({
  nodes,
  activeDocId,
  onSelectDoc,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  // Determine whether current view is localized to active page (local in sidebar box, global in expanded modal)
  const isLocalMode = !isModalOpen;

  // Extract flat list of valid document nodes
  const flatDocs = useMemo(() => {
    const list: DocNode[] = [];
    const walk = (items: DocNode[]) => {
      for (const item of items) {
        if (!item.isFolder || (item.content && item.content.trim().length > 0)) {
          list.push(item);
        }
        if (item.children) walk(item.children);
      }
    };
    walk(nodes);
    return list;
  }, [nodes]);

  // Identify active document node
  const activeDoc = useMemo(() => {
    const target = (activeDocId || '').toLowerCase();
    for (const doc of flatDocs) {
      if (
        doc.id.toLowerCase() === target ||
        (doc.slug && doc.slug.toLowerCase() === target) ||
        doc.title.toLowerCase() === target
      ) {
        return doc;
      }
      if (doc.aliases) {
        for (const alias of doc.aliases) {
          if (alias.toLowerCase() === target) return doc;
        }
      }
    }
    return flatDocs[0] || null;
  }, [activeDocId, flatDocs]);

  // Map of titles, slugs, IDs, and aliases to documents
  const docMap = useMemo(() => {
    const map = new Map<string, DocNode>();
    for (const doc of flatDocs) {
      map.set(doc.id.toLowerCase(), doc);
      map.set(doc.title.toLowerCase(), doc);
      if (doc.slug) map.set(doc.slug.toLowerCase(), doc);
      if (doc.aliases) {
        for (const alias of doc.aliases) {
          map.set(alias.toLowerCase(), doc);
        }
      }
    }
    return map;
  }, [flatDocs]);

  // Extract graph links across all documents from markdown wikilinks
  const rawLinks = useMemo(() => {
    const links: GraphLink[] = [];
    const linkSet = new Set<string>();

    // Wikilink regex: [[Target]] or [[Target#Anchor]] or [[Target|Display Text]]
    const wikilinkRegex = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;

    for (const doc of flatDocs) {
      const content = doc.content || '';
      let match: RegExpExecArray | null;
      while ((match = wikilinkRegex.exec(content)) !== null) {
        const rawTarget = match[1].trim().toLowerCase();
        const targetDoc = docMap.get(rawTarget);
        if (targetDoc && targetDoc.id !== doc.id) {
          const key1 = `${doc.id}->${targetDoc.id}`;
          const key2 = `${targetDoc.id}->${doc.id}`;
          if (!linkSet.has(key1) && !linkSet.has(key2)) {
            links.push({ source: doc.id, target: targetDoc.id });
            linkSet.add(key1);
          }
        }
      }
    }

    return links;
  }, [flatDocs, docMap]);

  // Filter to local subgraph when in Local Graph mode
  const { displayedDocs, displayedLinks } = useMemo(() => {
    if (!isLocalMode || !activeDoc) {
      return { displayedDocs: flatDocs, displayedLinks: rawLinks };
    }

    const connectedDocIds = new Set<string>([activeDoc.id]);
    for (const link of rawLinks) {
      if (link.source === activeDoc.id) connectedDocIds.add(link.target);
      if (link.target === activeDoc.id) connectedDocIds.add(link.source);
    }

    const subDocs = flatDocs.filter((d) => connectedDocIds.has(d.id));
    const subLinks = rawLinks.filter(
      (l) => connectedDocIds.has(l.source) && connectedDocIds.has(l.target)
    );

    return { displayedDocs: subDocs, displayedLinks: subLinks };
  }, [isLocalMode, activeDoc, flatDocs, rawLinks]);


  // Canvas and container element references
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active view canvas and container based on modal open state
  const activeCanvasRef = isModalOpen ? modalCanvasRef : canvasRef;
  const activeContainerRef = isModalOpen ? modalContainerRef : containerRef;

  // Simulation & transform state stored in refs for zero React re-render lag
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const nodeMapRef = useRef<Map<string, GraphNode>>(new Map());

  const hoveredNodeRef = useRef<GraphNode | null>(null);
  const connectedNodeIdsRef = useRef<Set<string> | null>(null);
  const dragNodeRef = useRef<GraphNode | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const panHistoryRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const panVelocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{
    dist: number;
    scale: number;
    center: { x: number; y: number };
    transform: { x: number; y: number };
  } | null>(null);

  // Smooth cinematic camera transform lerping (identical to Flint Graph View)
  const targetTransformRef = useRef<{ x: number; y: number; scale: number }>({ x: 0, y: 0, scale: 1 });
  const currentTransformRef = useRef<{ x: number; y: number; scale: number }>({ x: 0, y: 0, scale: 1 });

  const alphaRef = useRef<number>(0.001);
  const animFrameRef = useRef<number | null>(null);
  const hasAutoCenteredRef = useRef<boolean>(false);

  // Render loop reference for requestAnimationFrame
  const renderRef = useRef<(time: number) => void>(() => {});

  // Helper to trigger animation ticks safely
  const startAnimation = useCallback(() => {
    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(renderRef.current);
    }
  }, []);

  // Initialize nodes and links preserving established layout
  useEffect(() => {
    const linkCountMap = new Map<string, number>();
    for (const link of displayedLinks) {
      linkCountMap.set(link.source, (linkCountMap.get(link.source) || 0) + 1);
      linkCountMap.set(link.target, (linkCountMap.get(link.target) || 0) + 1);
    }

    const prevNodes = new Map<string, GraphNode>();
    for (const n of nodesRef.current) {
      prevNodes.set(n.id, n);
    }

    const neighborDocs = displayedDocs.filter((d) => d.id !== activeDoc?.id);
    const angleStep = (2 * Math.PI) / Math.max(1, neighborDocs.length);

    const newNodes: GraphNode[] = displayedDocs.map((doc, idx) => {
      const existing = prevNodes.get(doc.id);
      const isCurrentActive = Boolean(activeDoc && doc.id === activeDoc.id);

      let pos: { x: number; y: number };
      if (existing && Number.isFinite(existing.x) && Number.isFinite(existing.y)) {
        pos = { x: existing.x, y: existing.y };
      } else if (isLocalMode) {
        if (isCurrentActive) {
          pos = { x: 0, y: 0 };
        } else {
          const nIdx = neighborDocs.findIndex((d) => d.id === doc.id);
          const angle = (nIdx >= 0 ? nIdx : idx) * angleStep;
          const dist = 90 + (idx % 2 === 0 ? 0 : 25);
          pos = {
            x: Math.round(Math.cos(angle) * dist),
            y: Math.round(Math.sin(angle) * dist),
          };
        }
      } else {
        pos = getDeterministicNodePos(doc.id, idx);
      }

      const linkCount = linkCountMap.get(doc.id) || 0;

      return {
        id: doc.id,
        title: doc.title,
        displayTitle: doc.title.includes('/') ? doc.title.split('/').pop() || doc.title : doc.title,
        slug: doc.slug || doc.id,
        x: pos.x,
        y: pos.y,
        vx: existing ? existing.vx : 0,
        vy: existing ? existing.vy : 0,
        // Active node is slightly more prominent
        radius: isCurrentActive ? 7.5 : Math.min(6.5, Math.max(4.5, 4.5 + linkCount * 0.45)),
        linkCount,
        hoverAlpha: existing?.hoverAlpha ?? 0,
        dimAlpha: existing?.dimAlpha ?? 0,
        connectAlpha: existing?.connectAlpha ?? 0,
        popScale: 1.0,
        popAlpha: 1.0,
        floatPhaseX: hashStringToUnit(doc.id + ':fx') * Math.PI * 2,
        floatPhaseY: hashStringToUnit(doc.id + ':fy') * Math.PI * 2,
        floatFreq: 0.0008 + hashStringToUnit(doc.id + ':ff') * 0.0006,
        rawDoc: doc,
      };
    });

    // Synchronously relax initial layout so nodes are positioned in equilibrium without starting jitter
    let simAlpha = 0.85;
    const targetSpacing = isLocalMode ? 105 : 130;
    const nodeMap = new Map<string, GraphNode>();
    for (const n of newNodes) nodeMap.set(n.id, n);

    for (let step = 0; step < 45; step++) {
      // 1. Neighborhood repulsion
      for (let i = 0; i < newNodes.length; i++) {
        for (let j = i + 1; j < newNodes.length; j++) {
          const n1 = newNodes[i];
          const n2 = newNodes[j];
          let dx = n2.x - n1.x;
          let dy = n2.y - n1.y;
          if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
            const angle = hashStringToUnit(n1.id + n2.id + ':sep') * Math.PI * 2;
            dx = Math.cos(angle) * 3;
            dy = Math.sin(angle) * 3;
          }
          const distSq = dx * dx + dy * dy;
          if (distSq < targetSpacing * targetSpacing * 2.2) {
            const dist = Math.sqrt(distSq + 1.0);
            if (dist < targetSpacing) {
              const overlap = (targetSpacing - dist) / targetSpacing;
              const force = overlap * overlap * 16.0 * simAlpha;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              n1.vx -= fx;
              n1.vy -= fy;
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }
      }

      // 2. Spring attraction
      const springK = 0.042;
      for (const link of displayedLinks) {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (s && t) {
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const delta = dist - targetSpacing;
          const stretchBonus = delta > 30 ? Math.min(8.0, Math.pow((delta - 30) / 40, 1.3) * 0.4) : 0;
          const force = (delta * springK + stretchBonus) * simAlpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          s.vx += fx;
          s.vy += fy;
          t.vx -= fx;
          t.vy -= fy;
        }
      }

      // 3. Center gravity & damping
      const centerGravity = 0.024 * simAlpha;
      for (const n of newNodes) {
        if (isLocalMode && activeDoc && n.id === activeDoc.id) {
          n.x = 0;
          n.y = 0;
          n.vx = 0;
          n.vy = 0;
          continue;
        }
        n.vx -= n.x * centerGravity;
        n.vy -= n.y * centerGravity;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
      }

      simAlpha *= 0.95;
    }

    nodesRef.current = newNodes;
    linksRef.current = displayedLinks.map((l) => ({ ...l }));
    alphaRef.current = 0.001;
    hasAutoCenteredRef.current = false;
    startAnimation();
  }, [displayedDocs, displayedLinks, isLocalMode, activeDoc?.id, startAnimation]);

  // Fit to Center / Auto Framing (tightly frames graph to fill viewport centered)
  const fitToCenter = useCallback((immediate = false): boolean => {
    const canvas = activeCanvasRef.current;
    const currentNodes = nodesRef.current;
    if (!canvas || currentNodes.length === 0) return false;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width <= 0 || height <= 0) return false;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let valid = 0;

    for (let i = 0; i < currentNodes.length; i++) {
      const n = currentNodes[i];
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
      const r = (n.radius || 6) + 20;
      if (n.x - r < minX) minX = n.x - r;
      if (n.x + r > maxX) maxX = n.x + r;
      if (n.y - r < minY) minY = n.y - r;
      if (n.y + r > maxY) maxY = n.y + r;
      valid++;
    }

    if (valid === 0 || !Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
      targetTransformRef.current = { x: width / 2, y: height / 2, scale: 1 };
      if (immediate) currentTransformRef.current = { ...targetTransformRef.current };
      return true;
    }

    const rawGraphWidth = Math.max(30, maxX - minX);
    const rawGraphHeight = Math.max(30, maxY - minY);
    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    // Outer margin so outermost node circles sit cleanly with breathing room
    const marginX = Math.min(60, width * 0.12);
    const marginY = Math.min(60, height * 0.12);
    const availWidth = Math.max(30, width - marginX * 2);
    const availHeight = Math.max(30, height - marginY * 2);

    const scaleX = availWidth / rawGraphWidth;
    const scaleY = availHeight / rawGraphHeight;
    const maxAllowedScale = currentNodes.length <= 2 ? 1.0 : (isModalOpen ? 1.4 : 1.1);
    const fitScale = Math.min(maxAllowedScale, Math.max(0.15, Math.min(scaleX, scaleY)));

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
    startAnimation();
    return true;
  }, [activeCanvasRef, isModalOpen, startAnimation]);

  // Reset view button handler
  const handleResetView = useCallback(() => {
    fitToCenter(false);
  }, [fitToCenter]);

  // Organic Physics Simulation Step (Neighborhood Repulsion, Angular Torque & Spring Tension)
  const stepPhysics = useCallback((time: number) => {
    if (alphaRef.current < 0.002 && !dragNodeRef.current) return;

    const pNodes = nodesRef.current;
    const pLinks = linksRef.current;
    const dragNode = dragNodeRef.current;
    const currentAlpha = alphaRef.current;
    const targetSpacing = 130;

    // 1. Short-range neighborhood repulsion with quadratic falloff
    const nodeCount = pNodes.length;
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const n1 = pNodes[i];
        const n2 = pNodes[j];
        if (!Number.isFinite(n1.x) || !Number.isFinite(n1.y) || !Number.isFinite(n2.x) || !Number.isFinite(n2.y)) continue;

        let dx = n2.x - n1.x;
        let dy = n2.y - n1.y;
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
          const angle = hashStringToUnit(n1.id + n2.id + ':sep') * Math.PI * 2;
          dx = Math.cos(angle) * 3;
          dy = Math.sin(angle) * 3;
        }

        const distSq = dx * dx + dy * dy;
        if (distSq < targetSpacing * targetSpacing * 2.2) {
          const dist = Math.sqrt(distSq + 1.0);
          if (dist < targetSpacing) {
            const overlap = (targetSpacing - dist) / targetSpacing;
            const force = overlap * overlap * 16.0 * currentAlpha;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (n1 !== dragNode) {
              n1.vx -= fx;
              n1.vy -= fy;
            }
            if (n2 !== dragNode) {
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }
      }
    }

    // 2. Spring attraction along links with organic angular torque
    const nodeMap = nodeMapRef.current;
    nodeMap.clear();
    for (let i = 0; i < pNodes.length; i++) {
      nodeMap.set(pNodes[i].id, pNodes[i]);
    }

    const springK = 0.042;
    for (const link of pLinks) {
      const s = nodeMap.get(link.source);
      const t = nodeMap.get(link.target);
      if (s && t && Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(t.x) && Number.isFinite(t.y)) {
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const delta = dist - targetSpacing;

        const stretchBonus = delta > 30 ? Math.min(8.0, Math.pow((delta - 30) / 40, 1.3) * 0.4) : 0;
        const force = (delta * springK + stretchBonus) * currentAlpha;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        // Organic angular torque prevents planar pair alignment
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const pairHash = (hashStringToUnit(link.source + link.target + ':torque') - 0.5) * 2;
        const torque = pairHash * 0.42 * currentAlpha;

        if (s !== dragNode) {
          s.vx += fx + perpX * torque;
          s.vy += fy + perpY * torque;
        }
        if (t !== dragNode) {
          t.vx -= fx - perpX * torque;
          t.vy -= fy - perpY * torque;
        }
      }
    }

    // 3. Center gravity & velocity damping
    const centerGravity = 0.024 * currentAlpha;
    for (let i = 0; i < pNodes.length; i++) {
      const n = pNodes[i];
      if (n === dragNode) continue;

      const isCurrentActive = isLocalMode && activeDoc && n.id === activeDoc.id;
      const effectiveGravity = isCurrentActive ? 0.08 * currentAlpha : centerGravity;

      n.vx -= n.x * effectiveGravity;
      n.vy -= n.y * effectiveGravity;

      // Friction damping (0.85)
      n.vx *= 0.85;
      n.vy *= 0.85;

      n.x += n.vx;
      n.y += n.vy;

      // Subtle ambient harmonic wave float
      const freq = n.floatFreq || 0.001;
      n.x += Math.cos(time * freq + (n.floatPhaseX || 0)) * 0.04;
      n.y += Math.sin(time * freq + (n.floatPhaseY || 0)) * 0.04;
    }

    if (alphaRef.current > 0.002) {
      alphaRef.current *= 0.985;
    }
  }, []);

  renderRef.current = (time: number) => {
    animFrameRef.current = null;
    const canvas = activeCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width;
    const height = rect.height;

    if (width === 0 || height === 0) return;

    // Retina crisp scaling
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    // Auto-fit to center on initial mount or whenever uncentered
    const isUncentered = currentTransformRef.current.x === 0 && currentTransformRef.current.y === 0;
    if ((!hasAutoCenteredRef.current || isUncentered) && nodesRef.current.length > 0) {
      if (fitToCenter(true)) {
        hasAutoCenteredRef.current = true;
      }
    }

    stepPhysics(time);

    const target = targetTransformRef.current;
    const current = currentTransformRef.current;
    let isLerping = false;

    // 1. Inertial Pan Momentum & Drift Physics
    const pVel = panVelocityRef.current;
    const panSpeed = Math.hypot(pVel.vx, pVel.vy);
    if (panSpeed > 0.04) {
      target.x += pVel.vx;
      target.y += pVel.vy;
      current.x += pVel.vx;
      current.y += pVel.vy;
      // Exponential friction glide
      pVel.vx *= 0.952;
      pVel.vy *= 0.952;
      isLerping = true;
    } else if (panSpeed > 0) {
      panVelocityRef.current = { vx: 0, vy: 0 };
    }

    // 2. Velvety Camera Easing (Smooth, continuous interpolation)
    const easeFactor = isDraggingRef.current || dragNodeRef.current ? 1.0 : 0.16;
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

    const pNodes = nodesRef.current;
    const pLinks = linksRef.current;
    const currentHovered = hoveredNodeRef.current;
    const isAnyHovered = !!currentHovered;
    const connectedNodeIds = connectedNodeIdsRef.current;
    const lerpSpeed = 0.12;

    const nodeMap = nodeMapRef.current;
    nodeMap.clear();
    for (let i = 0; i < pNodes.length; i++) {
      nodeMap.set(pNodes[i].id, pNodes[i]);
    }

    // Pop-in scale & alpha easing
    for (let i = 0; i < pNodes.length; i++) {
      const n = pNodes[i];
      if (n.popAlpha !== undefined && n.popAlpha < 0.99) {
        n.popAlpha += (1 - n.popAlpha) * 0.16;
        isLerping = true;
      } else {
        n.popAlpha = 1;
      }
      if (n.popScale !== undefined && n.popScale < 0.99) {
        n.popScale += (1 - n.popScale) * 0.18;
        isLerping = true;
      } else {
        n.popScale = 1;
      }
    }

    // Viewport Culling Bounds in World Space
    const viewW = canvas.width / dpr;
    const viewH = canvas.height / dpr;
    const viewLeft = -safeX / safeScale;
    const viewTop = -safeY / safeScale;
    const viewRight = viewLeft + viewW / safeScale;
    const viewBottom = viewTop + viewH / safeScale;
    const cullMargin = 50;

    // Zoom-Aware Text Opacity (smoothly fades out labels on low zoom levels)
    const zoomTextOpacity = Math.min(1, Math.max(0, (safeScale - 0.48) / 0.55));

    // Clear and background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const isLightMode = document.documentElement.classList.contains('theme-light') || document.documentElement.classList.contains('light');

    // Background matching theme
    ctx.fillStyle = isLightMode ? '#ffffff' : '#151515';
    ctx.fillRect(0, 0, width, height);

    ctx.translate(safeX, safeY);
    ctx.scale(safeScale, safeScale);

    // 1. Process Links: Lerp hover/dim states & bucket for drawing
    const nonHoveredLinks: { link: GraphLink; s: GraphNode; t: GraphNode }[] = [];
    const activeHoveredLinks: { link: GraphLink; s: GraphNode; t: GraphNode }[] = [];

    const isSearchActive = modalSearchQuery.trim() !== '';

    for (let i = 0; i < pLinks.length; i++) {
      const link = pLinks[i];
      const s = nodeMap.get(link.source);
      const t = nodeMap.get(link.target);
      if (!s || !t || !Number.isFinite(s.x) || !Number.isFinite(s.y) || !Number.isFinite(t.x) || !Number.isFinite(t.y)) continue;

      // Viewport culling for links
      if (
        (s.x < viewLeft - cullMargin && t.x < viewLeft - cullMargin) ||
        (s.x > viewRight + cullMargin && t.x > viewRight + cullMargin) ||
        (s.y < viewTop - cullMargin && t.y < viewTop - cullMargin) ||
        (s.y > viewBottom + cullMargin && t.y > viewBottom + cullMargin)
      ) {
        continue;
      }

      const sMatch = !isSearchActive || s.title.toLowerCase().includes(modalSearchQuery.toLowerCase());
      const tMatch = !isSearchActive || t.title.toLowerCase().includes(modalSearchQuery.toLowerCase());
      const isFilteredOut = isSearchActive && (!sMatch || !tMatch);

      const isConnectedToHovered = isAnyHovered && currentHovered && (link.source === currentHovered.id || link.target === currentHovered.id);
      if (isConnectedToHovered && currentHovered) {
        link.hoverOriginId = currentHovered.id;
      }

      const targetLinkHover = isConnectedToHovered ? 1 : 0;
      const targetLinkDim = (isAnyHovered && !isConnectedToHovered) || isFilteredOut ? 1 : 0;
      const curLinkHover = link.hoverAlpha ?? 0;
      const curLinkDim = link.dimAlpha ?? 0;

      link.hoverAlpha = curLinkHover + (targetLinkHover - curLinkHover) * lerpSpeed;
      link.dimAlpha = curLinkDim + (targetLinkDim - curLinkDim) * lerpSpeed;

      if (Math.abs(targetLinkHover - link.hoverAlpha) < 0.002) link.hoverAlpha = targetLinkHover;
      if (Math.abs(targetLinkDim - link.dimAlpha) < 0.002) link.dimAlpha = targetLinkDim;

      if (link.hoverAlpha < 0.002) link.hoverOriginId = undefined;

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

    // Layer 1: Draw Background / Passive Links (Batched for instant performance)
    ctx.lineWidth = 1;
    if (!isAnyHovered && !isSearchActive) {
      ctx.beginPath();
      ctx.strokeStyle = isLightMode ? 'rgba(215, 220, 228, 0.75)' : 'rgba(110, 115, 125, 0.450)';
      for (let i = 0; i < nonHoveredLinks.length; i++) {
        const { s, t } = nonHoveredLinks[i];
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
      }
      ctx.stroke();
    } else {
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
        ctx.strokeStyle = isLightMode ? 'rgba(215, 220, 228, 0.75)' : 'rgba(110, 115, 125, 0.450)';
        for (let i = 0; i < normalBatch.length; i++) {
          const { s, t } = normalBatch[i];
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
        }
        ctx.stroke();
      }

      if (dimmedBatch.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = isLightMode ? 'rgba(232, 235, 240, 0.45)' : 'rgba(65, 65, 70, 0.180)';
        for (let i = 0; i < dimmedBatch.length; i++) {
          const { s, t } = dimmedBatch[i];
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(t.x, t.y);
        }
        ctx.stroke();
      }
    }

    // Layer 2: Draw Active Connector Lines (Silky linear gradient from hovered node)
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
        const startA = 0.95 * ha;
        grad.addColorStop(0, isLightMode ? `rgba(15, 23, 42, ${startA.toFixed(3)})` : `rgba(255, 255, 255, ${startA.toFixed(3)})`);

        const endR = isLightMode ? Math.round(148 * (1 - ha) + 15 * ha) : Math.round(110 * (1 - ha) + 156 * ha);
        const endG = isLightMode ? Math.round(163 * (1 - ha) + 23 * ha) : Math.round(115 * (1 - ha) + 163 * ha);
        const endB = isLightMode ? Math.round(184 * (1 - ha) + 42 * ha) : Math.round(125 * (1 - ha) + 175 * ha);
        const endA = 0.55 * ha;
        grad.addColorStop(1, `rgba(${endR}, ${endG}, ${endB}, ${endA.toFixed(3)})`);

        ctx.strokeStyle = grad;
      } else {
        ctx.strokeStyle = isLightMode ? `rgba(15, 23, 42, ${(0.95 * ha).toFixed(3)})` : `rgba(255, 255, 255, ${(0.95 * ha).toFixed(3)})`;
      }

      ctx.lineWidth = 1 + 0.6 * ha;
      ctx.stroke();
    }

    // Group nodes: passive background nodes, connected neighbors, and hovered node
    const passiveNodes: GraphNode[] = [];
    const connectedNeighborNodes: GraphNode[] = [];
    let hoveredNode: GraphNode | null = null;

    for (let i = 0; i < pNodes.length; i++) {
      const n = pNodes[i];
      if (currentHovered && n.id === currentHovered.id) {
        hoveredNode = n;
      } else if (connectedNodeIds && connectedNodeIds.has(n.id) && isAnyHovered) {
        connectedNeighborNodes.push(n);
      } else {
        passiveNodes.push(n);
      }
    }

    // Node Renderer Helper (Exact GraphView node aesthetics, colors, and typography)
    const renderNode = (node: GraphNode) => {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

      // Viewport culling
      if (
        node.x < viewLeft - cullMargin ||
        node.x > viewRight + cullMargin ||
        node.y < viewTop - cullMargin ||
        node.y > viewBottom + cullMargin
      ) {
        return;
      }

      const isMatch = !isSearchActive || node.title.toLowerCase().includes(modalSearchQuery.toLowerCase());
      const isHovered = currentHovered?.id === node.id;
      const isConnected = connectedNodeIds ? connectedNodeIds.has(node.id) : false;

      const targetHover = isHovered ? 1 : 0;
      const targetConnect = !isHovered && isConnected && isAnyHovered ? 1 : 0;
      const targetDim =
        (isAnyHovered && !isHovered && !isConnected) ||
        (isSearchActive && !isMatch)
          ? 1
          : 0;

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

      // Base node palette: responsive to dark and light modes
      const baseR = isSearchActive && isMatch ? 235 : (isLightMode ? 100 : 156);
      const baseG = isSearchActive && isMatch ? 240 : (isLightMode ? 116 : 163);
      const baseB = isSearchActive && isMatch ? 255 : (isLightMode ? 139 : 175);

      const nr = isLightMode
        ? Math.min(255, Math.max(0, Math.round(baseR * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 15 * node.hoverAlpha + 200 * node.dimAlpha)))
        : Math.min(255, Math.max(0, Math.round(baseR * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 255 * node.hoverAlpha + 45 * node.dimAlpha)));
      const ng = isLightMode
        ? Math.min(255, Math.max(0, Math.round(baseG * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 23 * node.hoverAlpha + 200 * node.dimAlpha)))
        : Math.min(255, Math.max(0, Math.round(baseG * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 255 * node.hoverAlpha + 45 * node.dimAlpha)));
      const nb = isLightMode
        ? Math.min(255, Math.max(0, Math.round(baseB * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 42 * node.hoverAlpha + 200 * node.dimAlpha)))
        : Math.min(255, Math.max(0, Math.round(baseB * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 255 * node.hoverAlpha + 45 * node.dimAlpha)));

      const isActiveDoc = Boolean(activeDoc && node.id === activeDoc.id);

      // Constant radius
      const radius = Math.max(3.5, (node.radius || 4.5) * (node.popScale || 1));
      const nodeAlpha = Number.isFinite(node.popAlpha) && node.popAlpha! > 0.05 ? node.popAlpha! : 1;

      // Draw Node Body
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(${nr}, ${ng}, ${nb}, ${nodeAlpha.toFixed(3)})`;
      ctx.fill();

      // Node Label with Zoom-Aware Text Opacity & Clean Typography
      const isPriorityLabel = isActiveDoc || isHovered || (isConnected && isAnyHovered) || (isSearchActive && isMatch);
      const labelAlpha = isPriorityLabel ? nodeAlpha : nodeAlpha * zoomTextOpacity;
      const shouldRenderLabel = labelAlpha > 0.01 && (isPriorityLabel || safeScale >= 0.75);

      if (shouldRenderLabel) {
        ctx.font = isHovered || isActiveDoc || (isSearchActive && isMatch)
          ? '600 10px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          : '9.5px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        const tr = isLightMode
          ? Math.min(255, Math.max(0, Math.round(15 * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 0 * node.hoverAlpha + 160 * node.dimAlpha)))
          : Math.min(255, Math.max(0, Math.round(220 * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 255 * node.hoverAlpha + 60 * node.dimAlpha)));
        const tg = isLightMode
          ? Math.min(255, Math.max(0, Math.round(23 * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 0 * node.hoverAlpha + 160 * node.dimAlpha)))
          : Math.min(255, Math.max(0, Math.round(221 * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 255 * node.hoverAlpha + 60 * node.dimAlpha)));
        const tb = isLightMode
          ? Math.min(255, Math.max(0, Math.round(42 * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 0 * node.hoverAlpha + 160 * node.dimAlpha)))
          : Math.min(255, Math.max(0, Math.round(222 * (1 - node.dimAlpha) * (1 - node.hoverAlpha) + 255 * node.hoverAlpha + 60 * node.dimAlpha)));

        ctx.fillStyle = `rgba(${tr}, ${tg}, ${tb}, ${labelAlpha.toFixed(3)})`;

        ctx.textAlign = 'center';
        const displayTitle = node.displayTitle || node.title;
        const hoverOffsetDown = (node.hoverAlpha ?? 0) * 4.5;
        ctx.fillText(displayTitle, node.x, node.y + radius + 11 + hoverOffsetDown);
      }
    };

    // Layer 3: Passive/Background Nodes
    for (let i = 0; i < passiveNodes.length; i++) {
      renderNode(passiveNodes[i]);
    }

    // Layer 4: Connected Neighbor Nodes
    for (let i = 0; i < connectedNeighborNodes.length; i++) {
      renderNode(connectedNeighborNodes[i]);
    }

    // Layer 5: Hovered Node on Top
    if (hoveredNode) {
      renderNode(hoveredNode);
    }

    ctx.restore();

    // Schedule next frame if physics active, dragging, or lerping
    if (alphaRef.current > 0.002 || isDraggingRef.current || dragNodeRef.current !== null || isLerping) {
      animFrameRef.current = requestAnimationFrame(renderRef.current);
    }
  };

  // Screen coordinate to world space transform
  const screenToWorld = useCallback((clientX: number, clientY: number, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const safeScale = Number.isFinite(currentTransformRef.current.scale) && currentTransformRef.current.scale > 0 ? currentTransformRef.current.scale : 1;
    const worldX = (clientX - rect.left - (currentTransformRef.current.x || 0)) / safeScale;
    const worldY = (clientY - rect.top - (currentTransformRef.current.y || 0)) / safeScale;
    return { worldX, worldY, screenX: clientX - rect.left, screenY: clientY - rect.top };
  }, []);

  // Hit-test node under mouse/pointer
  const findNodeAtPos = useCallback((worldX: number, worldY: number): GraphNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
      const dx = n.x - worldX;
      const dy = n.y - worldY;
      const hitRadius = Math.max((n.radius || 5) + 6, 11);
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return n;
      }
    }
    return null;
  }, []);

  // Pointer Interaction Handlers
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    try {
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {}

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Halt inertial drift on interaction
    panVelocityRef.current = { vx: 0, vy: 0 };

    if (activePointersRef.current.size >= 2) {
      // Multi-Touch Pinch Zoom setup
      dragNodeRef.current = null;
      isDraggingRef.current = false;
      panHistoryRef.current = [];

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

    const { worldX, worldY } = screenToWorld(e.clientX, e.clientY, canvas);
    const clickedNode = findNodeAtPos(worldX, worldY);

    if (clickedNode) {
      dragNodeRef.current = clickedNode;
      clickedNode.vx = 0;
      clickedNode.vy = 0;
      alphaRef.current = Math.max(alphaRef.current, 0.45);
    } else {
      isDraggingRef.current = true;
    }
    startAnimation();
  }, [screenToWorld, findNodeAtPos, startAnimation]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Multi-Touch Pinch Zoom
    if (activePointersRef.current.size >= 2 && pinchStartRef.current && pinchStartRef.current.dist > 0) {
      const pinchStart = pinchStartRef.current;
      const pts = Array.from(activePointersRef.current.values());
      const currentDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const ratio = currentDist / pinchStart.dist;
      const newScale = Math.min(4.0, Math.max(0.15, pinchStart.scale * ratio));
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

      startAnimation();
      return;
    }

    // Single Pointer Interactions
    const { worldX, worldY } = screenToWorld(e.clientX, e.clientY, canvas);

    if (dragNodeRef.current) {
      const dx = worldX - dragNodeRef.current.x;
      const dy = worldY - dragNodeRef.current.y;
      dragNodeRef.current.vx = dx * 0.45;
      dragNodeRef.current.vy = dy * 0.45;
      dragNodeRef.current.x = worldX;
      dragNodeRef.current.y = worldY;
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

      startAnimation();
    } else if (e.pointerType === 'mouse') {
      const prevHoveredId = hoveredNodeRef.current?.id || null;
      const hovered = findNodeAtPos(worldX, worldY);
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
        canvas.style.cursor = hovered ? 'pointer' : 'grab';
        startAnimation();
      }
    }
  }, [screenToWorld, findNodeAtPos, startAnimation]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);

    if (activePointersRef.current.size >= 1) {
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

    const distMoved = Math.hypot(
      e.clientX - dragStartPosRef.current.x,
      e.clientY - dragStartPosRef.current.y
    );

    if (dragNodeRef.current) {
      if (distMoved < 6) {
        onSelectDoc(dragNodeRef.current.rawDoc);
        if (isModalOpen) {
          setIsModalOpen(false);
        }
      }
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
          const maxV = 60;
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
  }, [onSelectDoc, isModalOpen, startAnimation]);

  const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size === 0) {
      pinchStartRef.current = null;
      dragNodeRef.current = null;
      isDraggingRef.current = false;
      hoveredNodeRef.current = null;
      connectedNodeIdsRef.current = null;
      e.currentTarget.style.cursor = 'grab';
      startAnimation();
    }
  }, [startAnimation]);

  // Non-passive Wheel & Gesture Event Listeners
  // Prevents native browser page zoom / trackpad zoom / page scrolling
  useEffect(() => {
    const handleNativeWheel = (e: WheelEvent) => {
      const container = activeContainerRef.current;
      const canvas = activeCanvasRef.current;
      if (!container || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const isInside = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );

      const targetNode = e.target as Node | null;
      const isTargetInside = targetNode ? (container.contains(targetNode) || targetNode === canvas) : false;

      if (!isInside && !isTargetInside) return;

      // CRITICAL: Prevent browser viewport scaling (Ctrl+wheel / pinch) and page scroll!
      e.preventDefault();
      e.stopPropagation();

      panVelocityRef.current = { vx: 0, vy: 0 };

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const currentScale = Number.isFinite(targetTransformRef.current.scale) && targetTransformRef.current.scale > 0
        ? targetTransformRef.current.scale
        : 1;
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
        // Trackpad pinch-to-zoom (Windows Precision Touchpad sends WheelEvent with ctrlKey=true) OR Ctrl + Wheel
        const zoomFactor = Math.exp(-dy * 0.012);
        const newScale = Math.min(4.0, Math.max(0.15, currentScale * zoomFactor));

        if (Math.abs(newScale - currentScale) > 0.0001) {
          targetTransformRef.current = {
            x: mouseX - ((mouseX - currentX) * (newScale / currentScale)),
            y: mouseY - ((mouseY - currentY) * (newScale / currentScale)),
            scale: newScale,
          };
          startAnimation();
        }
      } else if (e.shiftKey) {
        // Shift + Wheel -> Horizontal Pan
        targetTransformRef.current = {
          x: currentX - (Math.abs(dy) > 0 ? dy : dx),
          y: currentY,
          scale: currentScale,
        };
        startAnimation();
      } else if (Math.abs(dx) > 0 && Math.abs(dy) === 0) {
        // Trackpad 2-Finger Horizontal Pan
        targetTransformRef.current = {
          x: currentX - dx,
          y: currentY,
          scale: currentScale,
        };
        startAnimation();
      } else {
        // Mouse Wheel Scroll Zoom centered smoothly at mouse cursor
        let zoomFactor: number;
        if (Math.abs(dy) < 30 && e.deltaMode === 0) {
          zoomFactor = Math.exp(-dy * 0.008);
        } else {
          zoomFactor = dy < 0 ? 1.18 : 0.84;
        }

        const newScale = Math.min(4.0, Math.max(0.15, currentScale * zoomFactor));

        if (Math.abs(newScale - currentScale) > 0.0001) {
          targetTransformRef.current = {
            x: mouseX - ((mouseX - currentX) * (newScale / currentScale)),
            y: mouseY - ((mouseY - currentY) * (newScale / currentScale)),
            scale: newScale,
          };
          startAnimation();
        }
      }
    };

    // Safari/WebKit trackpad pinch gestures
    let gestureInitialScale = 1;
    let gestureInitialTransform = { x: 0, y: 0 };
    const handleGestureStart = (e: any) => {
      e.preventDefault();
      gestureInitialScale = targetTransformRef.current.scale || 1;
      gestureInitialTransform = {
        x: targetTransformRef.current.x || 0,
        y: targetTransformRef.current.y || 0,
      };
    };

    const handleGestureChange = (e: any) => {
      e.preventDefault();
      const canvas = activeCanvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX || rect.width / 2) - rect.left;
      const mouseY = (e.clientY || rect.height / 2) - rect.top;
      const newScale = Math.min(4.0, Math.max(0.15, gestureInitialScale * (e.scale || 1)));

      targetTransformRef.current = {
        x: mouseX - ((mouseX - gestureInitialTransform.x) * (newScale / gestureInitialScale)),
        y: mouseY - ((mouseY - gestureInitialTransform.y) * (newScale / gestureInitialScale)),
        scale: newScale,
      };
      currentTransformRef.current.x = targetTransformRef.current.x;
      currentTransformRef.current.y = targetTransformRef.current.y;
      currentTransformRef.current.scale = targetTransformRef.current.scale;
      startAnimation();
    };

    const handleGestureEnd = (e: any) => {
      e.preventDefault();
      startAnimation();
    };

    // Non-passive listener registered on window with coordinate check so no events are dropped
    window.addEventListener('wheel', handleNativeWheel, { passive: false });

    const container = activeContainerRef.current;
    if (container) {
      container.addEventListener('gesturestart', handleGestureStart as any, { passive: false });
      container.addEventListener('gesturechange', handleGestureChange as any, { passive: false });
      container.addEventListener('gestureend', handleGestureEnd as any, { passive: false });
    }

    return () => {
      window.removeEventListener('wheel', handleNativeWheel);
      if (container) {
        container.removeEventListener('gesturestart', handleGestureStart as any);
        container.removeEventListener('gesturechange', handleGestureChange as any);
        container.removeEventListener('gestureend', handleGestureEnd as any);
      }
    };
  }, [activeContainerRef, activeCanvasRef, startAnimation]);

  // ResizeObserver for responsive canvas updates & auto-centering
  useEffect(() => {
    const container = activeContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        if (!hasAutoCenteredRef.current && nodesRef.current.length > 0) {
          if (fitToCenter(true)) {
            hasAutoCenteredRef.current = true;
          }
        }
      }
      startAnimation();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [activeContainerRef, fitToCenter, startAnimation]);

  // Recenter and animate whenever modal state changes
  useEffect(() => {
    hasAutoCenteredRef.current = false;
    const frameId = requestAnimationFrame(() => {
      if (fitToCenter(true)) {
        hasAutoCenteredRef.current = true;
      }
      startAnimation();
    });
    return () => cancelAnimationFrame(frameId);
  }, [isModalOpen, fitToCenter, startAnimation]);

  useEffect(() => {
    startAnimation();
  }, [modalSearchQuery, startAnimation]);

  // Redraw graph when theme changes (light/dark switch)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      startAnimation();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const handleThemeEvent = () => {
      startAnimation();
    };
    window.addEventListener('flint-theme-change', handleThemeEvent);

    return () => {
      observer.disconnect();
      window.removeEventListener('flint-theme-change', handleThemeEvent);
    };
  }, [startAnimation]);

  // Close modal on Escape key
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  return (
    <>
      <div className={`flex flex-col select-none ${className}`}>
        <div
          ref={containerRef}
          className="relative w-full aspect-square rounded-lg border border-[#363636] bg-[#151515] overflow-hidden group touch-none"
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* Unobtrusive Corner Control Toolbar */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-60 hover:opacity-100">
            <button
              type="button"
              onClick={handleResetView}
              className="p-1 rounded bg-[#202020]/80 hover:bg-[#2c2c2c] text-[#9e9e9e] hover:text-white border border-[#333] cursor-pointer"
              title="Fit to center"
            >
              <CenterFocusIcon size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(true);
                hasAutoCenteredRef.current = false;
                startAnimation();
              }}
              className="p-1 rounded bg-[#202020]/80 hover:bg-[#2c2c2c] text-[#9e9e9e] hover:text-white border border-[#333] cursor-pointer"
              title="Expand interactive graph"
            >
              <Maximize01Icon size={13} />
            </button>
          </div>

          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            className="w-full h-full block cursor-grab active:cursor-grabbing touch-none"
          />
        </div>
      </div>

      {/* Minimal Floating Graph Modal matching Screenshot (Pure canvas, zero buttons, zero text) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 select-none touch-none"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Floating Rounded Modal Container */}
          <div
            ref={modalContainerRef}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[1385px] h-[87vh] max-h-[960px] rounded-xl bg-[#141414] border border-[#363636] shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Pure Canvas */}
            <div className="flex-1 w-full h-full relative overflow-hidden bg-[#141414]">
              <canvas
                ref={modalCanvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                className="w-full h-full block cursor-grab active:cursor-grabbing touch-none"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
});

InteractiveGraphWidget.displayName = 'InteractiveGraphWidget';
