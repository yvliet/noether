/**
 * @module CoverBanner
 * @description
 * In-document banner cover widget rendered above note contents.
 * Features rounded corners, side margins preventing touching window edges,
 * top-to-down vertical fading into the note background, interactive vertical repositioning,
 * and hover controls.
 *
 * @since 1.0.0
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  FileImageIcon,
  Delete02Icon,
  CheckIcon,
  Cancel01Icon,
  ArrowUpDownIcon,
} from '@/components/common/Icons';
import { useCoversSettings } from './coversSettings';
import { useCoverModalStore } from './coversModalStore';
import { NoetherApp } from '@/core/app/NoetherApp';
import { DocumentItem } from '@/types';
import { resolveCoverSource, resolveCoverSourceAsync, preloadCoverImage, cleanCoverTarget } from './coverPreloader';

export interface CoverBannerProps {
  document: DocumentItem | null | undefined;
  app: NoetherApp;
}

export const CoverBanner: React.FC<CoverBannerProps> = ({ document: doc, app }) => {
  const { bannerHeight, fadeEffect, showControlsOnHover } = useCoversSettings();

  const [isRepositioning, setIsRepositioning] = useState(false);
  const [tempOffsetY, setTempOffsetY] = useState<number>(0.5);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [asyncSrc, setAsyncSrc] = useState<string | null>(null);

  const dragStartYRef = useRef<number>(0);
  const dragStartOffsetRef = useRef<number>(0.5);
  const bannerContainerRef = useRef<HTMLDivElement>(null);

  // Extract cover property from frontmatter
  const currentProperties = useMemo(() => {
    if (!doc?.properties) return {};
    try {
      return typeof doc.properties === 'string' ? JSON.parse(doc.properties) : doc.properties;
    } catch {
      return {};
    }
  }, [doc?.properties]);

  const rawCover = ((currentProperties.Cover || currentProperties.cover || currentProperties.banner || '') as string).trim();
  const savedOffsetY =
    typeof currentProperties.Cover_y === 'number'
      ? currentProperties.Cover_y
      : typeof currentProperties.cover_y === 'number'
      ? currentProperties.cover_y
      : typeof currentProperties.banner_y === 'number'
      ? currentProperties.banner_y
      : 0.5;

  // Frame-0 synchronous resolution
  const syncSrc = useMemo(() => {
    return resolveCoverSource(rawCover, app);
  }, [rawCover, app]);

  // Asynchronous resolution (for vault attachment documents & delayed hydration)
  useEffect(() => {
    let isMounted = true;
    setHasLoadError(false);

    if (!rawCover) {
      setAsyncSrc(null);
      return;
    }

    if (syncSrc) {
      setAsyncSrc(syncSrc);
      return;
    }

    resolveCoverSourceAsync(rawCover, app)
      .then((src) => {
        if (isMounted) {
          if (src) {
            setAsyncSrc(src);
          } else {
            setHasLoadError(true);
          }
        }
      })
      .catch(() => {
        if (isMounted) setHasLoadError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [rawCover, syncSrc, app]);

  // Reactive eviction: when the underlying cover document is deleted, immediately clear display and show fallback
  useEffect(() => {
    if (!app?.events || !rawCover) return;
    const sub = app.events.on('document:deleted', ({ id, title }: { id: string; title?: string }) => {
      const clean = cleanCoverTarget(rawCover).toLowerCase();
      const idMatch = Boolean(id && (id === rawCover || id.toLowerCase() === clean));
      const titleMatch = Boolean(
        title &&
          (title === rawCover ||
            title.toLowerCase() === clean ||
            clean.endsWith(title.toLowerCase()) ||
            title.toLowerCase().endsWith(clean))
      );
      if (idMatch || titleMatch) {
        setAsyncSrc(null);
        setHasLoadError(true);
      }
    });

    return () => {
      sub.dispose();
    };
  }, [app, rawCover]);

  // Handle setting a new cover
  const handleSelectCover = useCallback(
    async (newUrl: string) => {
      if (!doc?.id) return;
      preloadCoverImage(newUrl);
      const nextProps = { ...currentProperties, Cover: newUrl };
      delete nextProps.cover;
      delete nextProps.banner;
      await app.vault.setDocumentProperties(doc.id, nextProps);
    },
    [doc?.id, currentProperties, app]
  );

  // Handle removing the cover
  const handleRemoveCover = useCallback(async () => {
    if (!doc?.id) return;
    const nextProps = { ...currentProperties };
    delete nextProps.Cover;
    delete nextProps.Cover_y;
    delete nextProps.cover;
    delete nextProps.banner;
    delete nextProps.cover_y;
    delete nextProps.banner_y;
    await app.vault.setDocumentProperties(doc.id, nextProps);
  }, [doc?.id, currentProperties, app]);

  // Start repositioning
  const handleStartReposition = useCallback(() => {
    setTempOffsetY(savedOffsetY);
    setIsRepositioning(true);
  }, [savedOffsetY]);

  // Save repositioned offset
  const handleSaveReposition = useCallback(async () => {
    if (!doc?.id) return;
    const nextProps = { ...currentProperties, Cover_y: Math.round(tempOffsetY * 1000) / 1000 };
    delete nextProps.cover_y;
    delete nextProps.banner_y;
    await app.vault.setDocumentProperties(doc.id, nextProps);
    setIsRepositioning(false);
  }, [doc?.id, currentProperties, tempOffsetY, app]);

  // Cancel repositioning
  const handleCancelReposition = useCallback(() => {
    setTempOffsetY(savedOffsetY);
    setIsRepositioning(false);
  }, [savedOffsetY]);

  // Mouse drag handlers for repositioning
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isRepositioning) return;
      e.preventDefault();
      dragStartYRef.current = e.clientY;
      dragStartOffsetRef.current = tempOffsetY;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - dragStartYRef.current;
        const containerHeight = bannerHeight || 270;
        // Invert delta so dragging down brings top of image down
        const deltaFraction = -deltaY / containerHeight;
        const nextOffset = Math.max(0, Math.min(1, dragStartOffsetRef.current + deltaFraction));
        setTempOffsetY(nextOffset);
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [isRepositioning, tempOffsetY, bannerHeight]
  );

  if (!rawCover) {
    return null;
  }

  const effectiveOffsetY = isRepositioning ? tempOffsetY : savedOffsetY;
  const contentOverlap = Math.round(bannerHeight * 0.37);
  const activeSrc = asyncSrc || syncSrc;

  return (
    <>
      <div
        style={{ marginBottom: `-${contentOverlap}px` }}
        className={`w-full max-w-6xl mx-auto px-2.5 sm:px-3 select-none relative ${
          isRepositioning ? 'z-20' : 'z-0'
        }`}
      >
        <div
          ref={bannerContainerRef}
          style={{ height: `${bannerHeight}px` }}
          onMouseDown={handleMouseDown}
          className={`relative w-full rounded-2xl overflow-hidden bg-transparent group ${
            isRepositioning ? 'cursor-grab active:cursor-grabbing ring-2 ring-emerald-500/50' : ''
          }`}
        >
          {/* Cover Image Element or Error Fallback */}
          {hasLoadError || (!activeSrc && !rawCover.startsWith('http')) ? (
            <div
              style={{
                ...(fadeEffect
                  ? {
                      maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)',
                      WebkitMaskImage:
                        'linear-gradient(to bottom, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)',
                    }
                  : {}),
              }}
              className="w-full h-full rounded-2xl bg-[var(--noether-bg-card,#202020)] flex flex-col items-center justify-center gap-2.5 p-4 text-center select-none"
            >
              <div className="text-xs text-[var(--noether-text-muted)] font-normal">
                Cover not found
              </div>
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (doc?.id) useCoverModalStore.getState().open(doc.id);
                  }}
                  className="noether-btn text-xs !py-1 !px-2.5"
                >
                  Change cover
                </button>
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className="noether-btn noether-btn-danger text-xs !py-1 !px-2.5"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : activeSrc ? (
            <img
              src={activeSrc}
              alt="Note Cover"
              referrerPolicy="no-referrer"
              draggable={false}
              loading="eager"
              decoding="async"
              // @ts-expect-error React DOM fetchpriority attribute
              fetchpriority="high"
              fetchPriority="high"
              onError={() => setHasLoadError(true)}
              onLoad={() => setHasLoadError(false)}
              style={{
                objectPosition: `center ${effectiveOffsetY * 100}%`,
                ...(fadeEffect
                  ? {
                      maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)',
                      WebkitMaskImage:
                        'linear-gradient(to bottom, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)',
                    }
                  : {}),
              }}
              className="w-full h-full object-cover select-none pointer-events-none"
            />
          ) : (
            <div className="w-full h-full rounded-2xl bg-[var(--noether-bg-main)]" />
          )}

          {/* Normal Hover Action Controls */}
          {showControlsOnHover && !isRepositioning && !hasLoadError && activeSrc && (
            <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center gap-0.5 pointer-events-auto z-30 [&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
              <button
                type="button"
                onClick={() => {
                  if (doc?.id) useCoverModalStore.getState().open(doc.id);
                }}
                title="Change cover"
                aria-label="Change cover"
                className="noether-toolbar-btn"
              >
                <FileImageIcon size={14} />
              </button>

              <button
                type="button"
                onClick={handleStartReposition}
                title="Reposition cover"
                aria-label="Reposition cover"
                className="noether-toolbar-btn"
              >
                <ArrowUpDownIcon size={14} />
              </button>

              <button
                type="button"
                onClick={handleRemoveCover}
                title="Remove cover"
                aria-label="Remove cover"
                className="noether-toolbar-btn hover:!text-rose-500"
              >
                <Delete02Icon size={14} />
              </button>
            </div>
          )}

          {/* Interactive Reposition Mode Overlay */}
          {isRepositioning && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs pointer-events-none flex flex-col items-center justify-between p-3 z-30">
              <div className="bg-[var(--noether-bg-popover,var(--noether-bg-card))] border border-[var(--noether-border-strong)] text-[var(--noether-text-primary)] text-[11px] font-medium px-3.5 py-1 rounded-full shadow-lg pointer-events-auto">
                ↕ Drag image up or down to reposition
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={handleSaveReposition}
                  className="noether-btn noether-btn-primary text-xs !py-1.5 !px-3.5 shadow-md flex items-center gap-1.5"
                >
                  <CheckIcon size={13} />
                  <span>Save position</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelReposition}
                  className="noether-btn text-xs !py-1.5 !px-3.5 shadow-md flex items-center gap-1"
                >
                  <Cancel01Icon size={13} />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
