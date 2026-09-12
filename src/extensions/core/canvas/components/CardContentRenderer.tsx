import React from 'react';
import type { DocumentItem } from '@/types';
import type { CanvasNode } from '../types';
import { File01Icon, LinkSquare02Icon } from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { DocumentView } from 'noether';

export interface CardContentRendererProps {
  node: CanvasNode;
  doc: DocumentItem | null;
  contentJson?: string;
  isEditingText?: boolean;
  onTextChange?: (newText: string) => void;
  onDocContentChange?: (docId: string, newContent: string) => void;
  onTextBlur?: () => void;
  onImageDimensions?: (naturalWidth: number, naturalHeight: number) => void;
  onTaskToggle?: (taskText: string, currentChecked: boolean) => void;
}

export const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif']);
export const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus']);
export const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogv', 'mov', 'mkv', 'avi']);
export const PDF_EXTS = new Set(['pdf']);

export function getFileExtension(filename?: string): string {
  if (!filename) return '';
  const clean = filename.split('?')[0].split('#')[0];
  const lastDot = clean.lastIndexOf('.');
  return lastDot !== -1 ? clean.slice(lastDot + 1).toLowerCase() : '';
}

export function isImageDocument(doc?: DocumentItem | null): boolean {
  if (!doc) return false;
  if (doc.doc_type === 'image') return true;
  return IMAGE_EXTS.has(getFileExtension(doc.title));
}

export function isAudioDocument(doc?: DocumentItem | null): boolean {
  if (!doc) return false;
  if (doc.doc_type === 'audio') return true;
  return AUDIO_EXTS.has(getFileExtension(doc.title));
}

export function isVideoDocument(doc?: DocumentItem | null): boolean {
  if (!doc) return false;
  if (doc.doc_type === 'video') return true;
  return VIDEO_EXTS.has(getFileExtension(doc.title));
}

export function isPdfDocument(doc?: DocumentItem | null): boolean {
  if (!doc) return false;
  if (doc.doc_type === 'pdf') return true;
  return PDF_EXTS.has(getFileExtension(doc.title));
}

/**
 * Resolves media source URL or base64 data string from document content_json or attributes
 */
export function resolveMediaSrc(contentJson?: string, title?: string): string {
  if (contentJson) {
    try {
      const parsed = typeof contentJson === 'string' ? JSON.parse(contentJson) : contentJson;
      const firstText = parsed.content?.[0]?.content?.[0]?.text;
      if (
        firstText &&
        (firstText.startsWith('data:') ||
          firstText.startsWith('http://') ||
          firstText.startsWith('https://') ||
          firstText.startsWith('blob:') ||
          firstText.startsWith('file:'))
      ) {
        return firstText;
      }
    } catch {}
  }
  return '';
}

export const CardContentRenderer: React.FC<CardContentRendererProps> = React.memo(
  ({
    node,
    doc,
    contentJson,
    isEditingText,
    onTextChange,
    onDocContentChange,
    onTextBlur,
    onImageDimensions,
    onTaskToggle,
  }) => {
    const pointerDownPosRef = React.useRef<{ x: number; y: number } | null>(null);

    // 1. Image Attachment Cards
    const isImage =
      isImageDocument(doc) ||
      node.type === 'image' ||
      (Boolean(node.url) && IMAGE_EXTS.has(getFileExtension(node.url)));
    if (isImage) {
      const src =
        node.url ||
        resolveMediaSrc(contentJson || doc?.content_json, doc?.title) ||
        node.text_content ||
        '';
      return (
        <div className="w-full h-full flex items-center justify-center bg-transparent overflow-hidden rounded-[4px] select-none">
          {src ? (
            <img
              src={src}
              alt={doc?.title || node.text_content || 'Canvas image'}
              draggable={false}
              decoding="async"
              loading="lazy"
              onDragStart={(e) => e.preventDefault()}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                  onImageDimensions?.(img.naturalWidth, img.naturalHeight);
                }
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
              }}
              onPointerUp={(e) => {
                if (e.button !== 0) return;
                if (pointerDownPosRef.current) {
                  const dist = Math.hypot(
                    e.clientX - pointerDownPosRef.current.x,
                    e.clientY - pointerDownPosRef.current.y
                  );
                  pointerDownPosRef.current = null;
                  if (dist <= 5) {
                    useWorkspaceStore.getState().openImageLightbox(src, doc?.title || 'Image');
                  }
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (pointerDownPosRef.current) {
                  const dist = Math.hypot(
                    e.clientX - pointerDownPosRef.current.x,
                    e.clientY - pointerDownPosRef.current.y
                  );
                  pointerDownPosRef.current = null;
                  if (dist <= 5) {
                    useWorkspaceStore.getState().openImageLightbox(src, doc?.title || 'Image');
                  }
                }
              }}
              className="w-full h-full object-contain pointer-events-auto rounded-[3px] cursor-zoom-in select-none"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-[#666] text-[14px] gap-1.5 p-3">
              <File01Icon size={20} className="text-[#555]" />
              <span className="text-[13px] truncate max-w-[240px]">{doc?.title || 'Image attachment'}</span>
            </div>
          )}
        </div>
      );
    }

    // 2. Audio Attachment Cards
    const isAudio =
      isAudioDocument(doc) ||
      node.type === 'audio' ||
      (Boolean(node.url) && AUDIO_EXTS.has(getFileExtension(node.url)));
    if (isAudio) {
      const src = node.url || resolveMediaSrc(contentJson || doc?.content_json, doc?.title);
      return (
        <div className="w-full h-full flex flex-col justify-center p-3 bg-transparent rounded-[4px]">
          <audio controls src={src} className="w-full h-8" />
        </div>
      );
    }

    // 3. Video Attachment Cards
    const isVideo =
      isVideoDocument(doc) ||
      node.type === 'video' ||
      (Boolean(node.url) && VIDEO_EXTS.has(getFileExtension(node.url)));
    if (isVideo) {
      const src = node.url || resolveMediaSrc(contentJson || doc?.content_json, doc?.title);
      return (
        <div className="w-full h-full bg-transparent flex items-center justify-center overflow-hidden rounded-[4px]">
          <video controls src={src} className="w-full h-full object-contain" />
        </div>
      );
    }

    // 4. PDF Attachment Cards
    const isPdf =
      isPdfDocument(doc) ||
      node.type === 'pdf' ||
      (Boolean(node.url) && PDF_EXTS.has(getFileExtension(node.url)));
    if (isPdf) {
      const src = node.url || resolveMediaSrc(contentJson || doc?.content_json, doc?.title);
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-transparent gap-2 rounded-[4px] text-center">
          <File01Icon size={26} className="text-rose-400" />
          <span className="text-[14px] font-medium text-[#dedede] truncate max-w-[260px]">
            {doc?.title || 'PDF Document'}
          </span>
          {src && (
            <button
              type="button"
              onClick={() => window.open(src, '_blank')}
              className="px-3 py-1.5 text-[14px] rounded bg-[#262626] hover:bg-[#333] text-[#ccc] hover:text-white cursor-pointer transition-none flex items-center gap-1.5"
            >
              <LinkSquare02Icon size={14} />
              <span>Open PDF</span>
            </button>
          )}
        </div>
      );
    }

    // 5. Link / Web Cards
    if (node.type === 'link' || node.url) {
      const targetUrl = node.url || node.text_content || '';
      return (
        <div className="w-full h-full flex flex-col justify-between p-3.5 bg-transparent rounded-[4px] select-text">
          <div className="flex items-center gap-2">
            <LinkSquare02Icon size={16} className="text-[var(--noether-accent,#eb584d)] shrink-0" />
            <span className="text-[14px] font-semibold text-white truncate">
              {node.text_content || targetUrl || 'Web Link'}
            </span>
          </div>
          <p className="text-[13px] text-[#777] truncate my-2">{targetUrl}</p>
          {targetUrl && (
            <button
              type="button"
              onClick={() => window.open(targetUrl, '_blank')}
              className="px-3 py-1.5 text-[13px] rounded bg-[#242424] hover:bg-[#2e2e2e] text-[#ccc] hover:text-white cursor-pointer transition-none self-start flex items-center gap-1.5"
            >
              <span>Visit Link</span>
            </button>
          )}
        </div>
      );
    }

    // 6. Text / Sticky Notes
    if (node.type === 'text') {
      return (
        <DocumentView
          content={node.text_content || ''}
          isDocBacked={false}
          editable={isEditingText}
          compact={true}
          autoFocus={isEditingText}
          onChange={(val) => onTextChange?.(val)}
          onBlur={onTextBlur}
          onEscape={onTextBlur}
          onTaskToggle={onTaskToggle}
        />
      );
    }

    // 7. Document / Note Cards
    const rawDocContent = contentJson || doc?.content_json || '';
    return (
      <DocumentView
        documentId={node.document_id || doc?.id}
        content={rawDocContent}
        isDocBacked={true}
        editable={isEditingText}
        compact={true}
        autoFocus={isEditingText}
        onChange={(val) => {
          const targetId = node.document_id || doc?.id;
          if (targetId) onDocContentChange?.(targetId, val);
        }}
        onBlur={onTextBlur}
        onEscape={onTextBlur}
        onTaskToggle={onTaskToggle}
      />
    );
  }
);
