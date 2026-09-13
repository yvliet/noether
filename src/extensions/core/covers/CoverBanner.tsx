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

import React, { useState, useMemo, useCallback, useRef } from 'react';
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
import { useVaultDocuments } from 'noether';

export interface CoverBannerProps {
  document: DocumentItem | null | undefined;
  app: NoetherApp;
}

export const CoverBanner: React.FC<CoverBannerProps> = ({ document: doc, app }) => {
  const { bannerHeight, fadeEffect, showControlsOnHover } = useCoversSettings();
  const allDocuments = useVaultDocuments();

  const [isRepositioning, setIsRepositioning] = useState(false);
  const [tempOffsetY, setTempOffsetY] = useState<number>(0.5);

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

  const rawCover = (currentProperties.cover || currentProperties.banner || '') as string;
  const savedOffsetY = typeof currentProperties.cover_y === 'number'
    ? currentProperties.cover_y
    : typeof currentProperties.banner_y === 'number'
    ? currentProperties.banner_y
    : 0.5;

  // Resolve image source: URL, data URI, or vault attachment document
  const resolvedSrc = useMemo(() => {
    if (!rawCover) return '';
    const trimmed = rawCover.trim();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:')
    ) {
      return trimmed;
    }

    // Lookup vault attachment by filename
    const cleanTarget = trimmed.toLowerCase();
    const cleanWithoutExt = cleanTarget.replace(/\.[a-zA-Z0-9]+$/, '');
    const matched = allDocuments.find((d) => {
      if (d.is_folder) return false;
      const titleLower = d.title.toLowerCase();
      return (
        titleLower === cleanTarget ||
        titleLower === cleanWithoutExt ||
        d.title === trimmed
      );
    });

    if (matched && matched.content_json) {
      try {
        const parsed = JSON.parse(matched.content_json);
        const firstText = parsed.content?.[0]?.content?.[0]?.text;
        if (firstText && (firstText.startsWith('data:image/') || firstText.startsWith('http') || firstText.startsWith('blob:'))) {
          return firstText;
        }
      } catch {}
    }

    return trimmed;
  }, [rawCover, allDocuments]);

  // Handle setting a new cover
  const handleSelectCover = useCallback(
    async (newUrl: string) => {
      if (!doc?.id) return;
      const nextProps = { ...currentProperties, cover: newUrl };
      await app.vault.setDocumentProperties(doc.id, nextProps);
      app.workspace.showToast('Cover image updated', 'success');
    },
    [doc?.id, currentProperties, app]
  );

  // Handle removing the cover
  const handleRemoveCover = useCallback(async () => {
    if (!doc?.id) return;
    const nextProps = { ...currentProperties };
    delete nextProps.cover;
    delete nextProps.banner;
    delete nextProps.cover_y;
    delete nextProps.banner_y;
    await app.vault.setDocumentProperties(doc.id, nextProps);
    app.workspace.showToast('Cover image removed', 'info');
  }, [doc?.id, currentProperties, app]);

  // Start repositioning
  const handleStartReposition = useCallback(() => {
    setTempOffsetY(savedOffsetY);
    setIsRepositioning(true);
  }, [savedOffsetY]);

  // Save repositioned offset
  const handleSaveReposition = useCallback(async () => {
    if (!doc?.id) return;
    const nextProps = { ...currentProperties, cover_y: Math.round(tempOffsetY * 1000) / 1000 };
    await app.vault.setDocumentProperties(doc.id, nextProps);
    setIsRepositioning(false);
    app.workspace.showToast('Cover position saved', 'success');
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

  if (!rawCover || !resolvedSrc) {
    return null;
  }

  const effectiveOffsetY = isRepositioning ? tempOffsetY : savedOffsetY;
  const contentOverlap = Math.round(bannerHeight * 0.37);

  return (
    <>
      <div
        style={{ marginBottom: `-${contentOverlap}px` }}
        className={`w-full max-w-6xl mx-auto px-2.5 sm:px-3 pt-8 select-none relative ${
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
          {/* Cover Image Element */}
          <img
            src={resolvedSrc}
            alt="Note Cover"
            draggable={false}
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

          {/* Normal Hover Action Controls */}
          {showControlsOnHover && !isRepositioning && (
            <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-[#181818]/90 border border-[#333]/80 backdrop-blur-md rounded-lg p-1 shadow-lg pointer-events-auto z-30">
              <button
                type="button"
                onClick={() => {
                  if (doc?.id) useCoverModalStore.getState().open(doc.id);
                }}
                title="Change Cover Image"
                className="px-2.5 py-1 rounded text-[11px] text-[#bbb] hover:text-white hover:bg-[#282828] cursor-pointer flex items-center gap-1"
              >
                <FileImageIcon size={13} />
                <span>Change cover</span>
              </button>

              <button
                type="button"
                onClick={handleStartReposition}
                title="Reposition Image"
                className="px-2 py-1 rounded text-[11px] text-[#bbb] hover:text-white hover:bg-[#282828] cursor-pointer flex items-center gap-1"
              >
                <ArrowUpDownIcon size={12} />
                <span>Reposition</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveCover}
                title="Remove Cover Image"
                className="p-1 rounded text-[#888] hover:text-red-400 hover:bg-red-500/10 cursor-pointer flex items-center justify-center"
              >
                <Delete02Icon size={13} />
              </button>
            </div>
          )}

          {/* Interactive Reposition Mode Overlay */}
          {isRepositioning && (
            <div className="absolute inset-0 bg-black/30 pointer-events-none flex flex-col items-center justify-between p-3 z-30">
              <div className="bg-[#181818]/95 border border-emerald-500/40 text-emerald-300 text-[11px] font-medium px-3 py-1 rounded-full shadow-lg pointer-events-auto">
                ↕ Drag image up or down to reposition
              </div>

              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  type="button"
                  onClick={handleSaveReposition}
                  className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-medium shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <CheckIcon size={13} />
                  <span>Save position</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelReposition}
                  className="px-3 py-1.5 rounded-md bg-[#242424] hover:bg-[#303030] border border-[#3a3a3a] text-[#bbb] hover:text-white text-[12px] font-medium shadow-md cursor-pointer flex items-center gap-1"
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
