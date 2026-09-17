import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Cancel01Icon } from '@/components/common/Icons';

export const ImageLightboxModal: React.FC = () => {
  const imageLightbox = useWorkspaceStore((s) => s.imageLightbox);
  const closeImageLightbox = useWorkspaceStore((s) => s.closeImageLightbox);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const scaleRef = useRef(scale);
  const posRef = useRef(position);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);

  // Keep refs synchronized with state
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    posRef.current = position;
  }, [position]);

  // Reset zoom & pan whenever a new image is opened
  useEffect(() => {
    if (imageLightbox?.isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
      hasMovedRef.current = false;
    }
  }, [imageLightbox?.isOpen, imageLightbox?.src]);

  // Anchor zoom scaling relative to screen center coordinates
  const applyZoom = useCallback((zoomFactor: number, clientX: number, clientY: number) => {
    const currentScale = scaleRef.current;
    const currentPos = posRef.current;
    const newScale = Math.min(25, Math.max(0.1, currentScale * zoomFactor));

    if (Math.abs(newScale - currentScale) < 0.0001) return;

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const mxRel = clientX - cx;
    const myRel = clientY - cy;

    const ratio = newScale / currentScale;
    const newX = mxRel - (mxRel - currentPos.x) * ratio;
    const newY = myRel - (myRel - currentPos.y) * ratio;

    setScale(newScale);
    setPosition({ x: newX, y: newY });
  }, []);

  // Handle keyboard shortcuts (Esc to close, +/- to zoom, 0 to reset, Arrow keys to pan)
  useEffect(() => {
    if (!imageLightbox?.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeImageLightbox();
        return;
      }

      if (e.key === '+' || e.key === '=' || e.key === 'NumpadAdd') {
        e.preventDefault();
        e.stopPropagation();
        const curMouse =
          mousePosRef.current.x > 0
            ? mousePosRef.current
            : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        applyZoom(1.25, curMouse.x, curMouse.y);
        return;
      }

      if (e.key === '-' || e.key === '_' || e.key === 'NumpadSubtract') {
        e.preventDefault();
        e.stopPropagation();
        const curMouse =
          mousePosRef.current.x > 0
            ? mousePosRef.current
            : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        applyZoom(0.8, curMouse.x, curMouse.y);
        return;
      }

      if (e.key === '0' || e.key === 'Numpad0') {
        e.preventDefault();
        e.stopPropagation();
        setScale(1);
        setPosition({ x: 0, y: 0 });
        return;
      }

      const panDelta = e.shiftKey ? 100 : 40;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPosition((prev) => ({ ...prev, y: prev.y + panDelta }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPosition((prev) => ({ ...prev, y: prev.y - panDelta }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPosition((prev) => ({ ...prev, x: prev.x + panDelta }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPosition((prev) => ({ ...prev, x: prev.x - panDelta }));
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [imageLightbox?.isOpen, closeImageLightbox, applyZoom]);

  // Native non-passive wheel and gesture listener matching Graph View zoom & pan math
  useEffect(() => {
    if (!imageLightbox?.isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const currentScale = scaleRef.current;
      const currentPos = posRef.current;

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
        // Silky exponential zoom scaling centered at mouse cursor position matching Graph View.
        let zoomFactor: number;
        if (Math.abs(dy) < 30 && e.deltaMode === 0) {
          zoomFactor = Math.exp(-dy * 0.012);
        } else {
          zoomFactor = dy < 0 ? 1.18 : 0.84;
        }

        const newScale = Math.min(25, Math.max(0.1, currentScale * zoomFactor));
        if (Math.abs(newScale - currentScale) > 0.0001) {
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight / 2;
          const mxRel = e.clientX - cx;
          const myRel = e.clientY - cy;

          const ratio = newScale / currentScale;
          const newX = mxRel - (mxRel - currentPos.x) * ratio;
          const newY = myRel - (myRel - currentPos.y) * ratio;

          setScale(newScale);
          setPosition({ x: newX, y: newY });
        }
      } else {
        // Directional Panning (Vertical dy, Horizontal dx, or Shift + Wheel) matching Canvas/Graph View
        let scrollX = dx;
        let scrollY = dy;

        // Shift + Vertical Wheel scrolls horizontally
        if (e.shiftKey && Math.abs(dy) > 0 && Math.abs(dx) === 0) {
          scrollX = dy;
          scrollY = 0;
        }

        setPosition((prev) => ({
          x: prev.x - scrollX,
          y: prev.y - scrollY,
        }));
      }
    };

    // WebKit / Safari Gesture Events (macOS trackpad pinch gestures)
    let gestureInitialScale = 1;
    let gestureInitialTransform = { x: 0, y: 0 };

    const handleGestureStart = (e: any) => {
      e.preventDefault();
      gestureInitialScale = scaleRef.current;
      gestureInitialTransform = { x: posRef.current.x, y: posRef.current.y };
    };

    const handleGestureChange = (e: any) => {
      e.preventDefault();
      const newScale = Math.min(25, Math.max(0.1, gestureInitialScale * (e.scale || 1)));
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const mouseX = (e.clientX !== undefined ? e.clientX : cx) - cx;
      const mouseY = (e.clientY !== undefined ? e.clientY : cy) - cy;

      const ratio = newScale / gestureInitialScale;
      const newX = mouseX - (mouseX - gestureInitialTransform.x) * ratio;
      const newY = mouseY - (mouseY - gestureInitialTransform.y) * ratio;

      setScale(newScale);
      setPosition({ x: newX, y: newY });
    };

    const handleGestureEnd = (e: any) => {
      e.preventDefault();
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    container.addEventListener('gesturestart', handleGestureStart, { passive: false });
    container.addEventListener('gesturechange', handleGestureChange, { passive: false });
    container.addEventListener('gestureend', handleGestureEnd, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
      container.removeEventListener('gesturestart', handleGestureStart);
      container.removeEventListener('gesturechange', handleGestureChange);
      container.removeEventListener('gestureend', handleGestureEnd);
    };
  }, [imageLightbox?.isOpen]);

  // Pan dragging - initiated strictly when clicking directly on the image
  const handleImageMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      e.stopPropagation();
      setIsDragging(true);
      hasMovedRef.current = false;
      mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position]
  );

  // Global window listeners while dragging to guarantee smooth pan tracking across viewport
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      const dist = Math.hypot(
        e.clientX - mouseDownPosRef.current.x,
        e.clientY - mouseDownPosRef.current.y
      );
      if (dist > 3) {
        hasMovedRef.current = true;
      }

      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging]);

  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (!hasMovedRef.current && e.target === e.currentTarget) {
        closeImageLightbox();
      }
    },
    [closeImageLightbox]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (scale !== 1 || position.x !== 0 || position.y !== 0) {
        handleResetZoom();
      } else {
        // Zoom 2x centered directly at the double-clicked cursor point
        applyZoom(2, e.clientX, e.clientY);
      }
    },
    [scale, position, handleResetZoom, applyZoom]
  );

  const displayTitle = useMemo(() => {
    if (!imageLightbox?.alt) return '';
    const parts = imageLightbox.alt.split(/[/\\]/);
    return parts[parts.length - 1] || imageLightbox.alt;
  }, [imageLightbox?.alt]);

  if (!imageLightbox || !imageLightbox.isOpen) return null;

  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <div
      ref={containerRef}
      onClick={handleBackdropClick}
      onMouseMove={handleContainerMouseMove}
      className={`fixed inset-0 z-[99999] select-none bg-black/85 ${
        isDragging ? 'cursor-grabbing' : 'cursor-default'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* Top Bar Header with Centered Title */}
      {displayTitle && (
        <div className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center pointer-events-none z-30 select-none px-16">
          <span className="text-[13px] text-[#cccccc] font-normal tracking-wide truncate max-w-[70%]">
            {displayTitle}
          </span>
        </div>
      )}

      {/* Static Close Button Pinned in Top-Right Corner */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          closeImageLightbox();
        }}
        title="Close (Esc)"
        className="absolute top-3 right-4 z-40 p-2 text-[#cccccc] hover:text-white hover:bg-white/10 rounded-md transition-none pointer-events-auto cursor-pointer flex items-center justify-center"
      >
        <Cancel01Icon size={18} />
      </button>

      {/* Center Scaled Image Viewport */}
      <div className="w-full h-full flex items-center justify-center pointer-events-none">
        <div
          onMouseDown={handleImageMouseDown}
          onDoubleClick={handleDoubleClick}
          className={`flex items-center justify-center max-w-full max-h-full transition-none pointer-events-auto ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            userSelect: 'none',
          }}
        >
          <img
            src={imageLightbox.src}
            alt={imageLightbox.alt || ''}
            draggable={false}
            className="max-w-[92vw] max-h-[90vh] object-contain shadow-2xl rounded pointer-events-auto"
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
