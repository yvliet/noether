import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Cancel01Icon } from '@/components/common/Icons';

export const ImageLightboxModal: React.FC = () => {
  const imageLightbox = useWorkspaceStore((s) => s.imageLightbox);
  const closeImageLightbox = useWorkspaceStore((s) => s.closeImageLightbox);

  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);

  // Reset zoom & pan whenever a new image is opened
  useEffect(() => {
    if (imageLightbox?.isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
      hasMovedRef.current = false;
    }
  }, [imageLightbox?.isOpen, imageLightbox?.src]);

  // Handle ESC key to close
  useEffect(() => {
    if (!imageLightbox?.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeImageLightbox();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [imageLightbox?.isOpen, closeImageLightbox]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setScale((prev) => Math.min(25, Math.max(0.1, prev * zoomFactor)));
  }, []);

  // Pan dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      hasMovedRef.current = false;
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      hasMovedRef.current = true;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (!hasMovedRef.current && (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'DIV')) {
        closeImageLightbox();
      }
    },
    [closeImageLightbox]
  );

  const handleDoubleClick = useCallback(() => {
    if (scale !== 1 || position.x !== 0 || position.y !== 0) {
      handleResetZoom();
    } else {
      setScale(2);
    }
  }, [scale, position, handleResetZoom]);

  const displayTitle = useMemo(() => {
    if (!imageLightbox?.alt) return '';
    const parts = imageLightbox.alt.split(/[/\\]/);
    return parts[parts.length - 1] || imageLightbox.alt;
  }, [imageLightbox?.alt]);

  if (!imageLightbox || !imageLightbox.isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="fixed inset-0 z-[99999] flex items-center justify-center select-none bg-black/85 cursor-grab active:cursor-grabbing"
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

      {/* Subtle Close Button in Top-Right Corner */}
      <button
        type="button"
        onClick={closeImageLightbox}
        title="Close (Esc)"
        className="absolute top-2 right-3 z-30 p-2 text-[#888888] hover:text-white rounded hover:bg-white/10 transition-none cursor-pointer flex items-center justify-center pointer-events-auto"
      >
        <Cancel01Icon size={18} />
      </button>

      {/* Center Scaled Image */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        className="flex items-center justify-center max-w-full max-h-full transition-none"
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
          className="max-w-[92vw] max-h-[90vh] object-contain shadow-2xl rounded pointer-events-none"
        />
      </div>
    </div>
  );
};
