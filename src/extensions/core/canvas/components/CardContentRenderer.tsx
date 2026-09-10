import React, { useMemo } from 'react';
import katex from 'katex';
import type { DocumentItem } from '@/types';
import type { CanvasNode } from '../types';
import { File01Icon, LinkSquare02Icon } from '@/components/common/Icons';
import { parseCalloutHeader, getCalloutTypeInfo } from '@/lib/editor/callouts';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';

export interface CardContentRendererProps {
  node: CanvasNode;
  doc: DocumentItem | null;
  contentJson?: string;
  isEditingText?: boolean;
  onTextChange?: (newText: string) => void;
  onTextBlur?: () => void;
  onImageDimensions?: (naturalWidth: number, naturalHeight: number) => void;
  onTaskToggle?: (taskText: string, currentChecked: boolean) => void;
}

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogv', 'mov', 'mkv', 'avi']);
const PDF_EXTS = new Set(['pdf']);

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

/**
 * Parses embed dimension string like "300", "300x200", "300px" into numeric width and height
 */
function parseEmbedDimension(aliasOrDim?: string | null): { width?: number; height?: number } {
  if (!aliasOrDim) return {};
  const clean = aliasOrDim.trim().toLowerCase().replace(/px/g, '');
  if (/^\d+x\d+$/.test(clean)) {
    const [w, h] = clean.split('x').map(Number);
    return { width: isNaN(w) ? undefined : w, height: isNaN(h) ? undefined : h };
  }
  if (/^\d+$/.test(clean)) {
    const w = Number(clean);
    return { width: isNaN(w) ? undefined : w };
  }
  return {};
}

/**
 * Resolves an embedded image target string (wikilink or path) against the document store
 */
function resolveImageSrc(target: string): string {
  if (!target) return '';
  const trimmed = target.trim();
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('file:')
  ) {
    return trimmed;
  }

  let cleanTgt = trimmed.toLowerCase();
  try {
    cleanTgt = decodeURIComponent(cleanTgt);
  } catch {}

  const cleanWithoutExt = cleanTgt.replace(/\.[a-zA-Z0-9]+$/, '');
  const targetBaseName = cleanWithoutExt.split('/').pop() || cleanWithoutExt;

  const docs = useDocumentStore.getState().documents;
  const matched = docs.find((d) => {
    if (d.is_folder) return false;
    const titleLower = d.title.toLowerCase();
    const docClean = titleLower.replace(/\.[a-zA-Z0-9]+$/, '');
    const docBaseName = docClean.split('/').pop() || docClean;
    return (
      titleLower === cleanTgt ||
      docClean === cleanWithoutExt ||
      docBaseName === targetBaseName ||
      d.id === trimmed
    );
  });

  if (matched && matched.content_json) {
    try {
      const parsed = typeof matched.content_json === 'string' ? JSON.parse(matched.content_json) : matched.content_json;
      const firstText = parsed.content?.[0]?.content?.[0]?.text;
      if (
        firstText &&
        (firstText.startsWith('data:') ||
          firstText.startsWith('http') ||
          firstText.startsWith('blob:') ||
          firstText.startsWith('file:'))
      ) {
        return firstText;
      }
    } catch {}
  }

  return '';
}

// In-memory cache for rendered KaTeX formulas to guarantee 0ms latency
const katexHtmlCache = new Map<string, string>();

function renderKatexHtml(latex: string, displayMode: boolean): string {
  const trimmed = latex.trim();
  const cacheKey = `${displayMode ? 'D' : 'I'}:${trimmed}`;
  const hit = katexHtmlCache.get(cacheKey);
  if (hit !== undefined) return hit;

  try {
    const html = katex.renderToString(trimmed, {
      displayMode,
      throwOnError: false,
    });
    if (katexHtmlCache.size > 1000) katexHtmlCache.clear();
    katexHtmlCache.set(cacheKey, html);
    return html;
  } catch {
    const fallback = displayMode ? `$$${trimmed}$$` : `$${trimmed}$`;
    katexHtmlCache.set(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Renders a standard Flint callout box with icon, colored accent border, and translucent background
 */
interface CalloutBoxProps {
  type: string;
  customTitle?: string;
  children: React.ReactNode;
}

const CalloutBox: React.FC<CalloutBoxProps> = ({ type, customTitle, children }) => {
  const typeInfo = getCalloutTypeInfo(type);
  const Icon = typeInfo.iconComponent;
  const title = customTitle || typeInfo.title;

  return (
    <div
      className={`my-2 rounded border-l-[3px] p-2.5 text-xs select-text ${typeInfo.bgColor} ${typeInfo.borderColor}`}
      style={{ borderLeftColor: typeInfo.accentHex }}
    >
      <div className={`flex items-center gap-1.5 font-semibold mb-1 select-none ${typeInfo.textColor}`}>
        <Icon size={14} className="shrink-0" />
        <span>{title}</span>
      </div>
      <div className="text-[#d0d0d0] leading-relaxed text-xs pl-5 space-y-1">
        {children}
      </div>
    </div>
  );
};

/**
 * Handles wikilink click navigation
 */
function handleWikilinkClick(e: React.MouseEvent, target: string): void {
  e.stopPropagation();
  const ws = useWorkspaceStore.getState();
  const ds = useDocumentStore.getState();
  const cleanTarget = target.trim().toLowerCase();
  const cleanWithoutExt = cleanTarget.replace(/\.md$/, '');

  const matched = ds.documents.find((d) => {
    if (d.is_folder) return false;
    const titleLower = d.title.toLowerCase();
    return (
      titleLower === cleanTarget ||
      titleLower === cleanWithoutExt ||
      d.id === target
    );
  });

  if (matched) {
    ws.openTab(matched.id, matched.title);
    ds.setActiveDocumentById(matched.id);
    ws.setMainViewMode('document');
  } else {
    ws.showToast(`Note "${target}" not found`, 'warning');
  }
}

// Token regex covering image embeds, wikilinks, math, highlights, bold, italic, code, strike
const INLINE_TOKEN_REGEX =
  /(!\[\[[^\]\n]+\]\]|!\[[^\]\n]*\]\((?:[^()\n]|\([^()\n]*\))+\)|\[\[[^\]\n]+\]\]|\[[^\]\n]+\]\((?:[^()\n]|\([^()\n]*\))+\)|\$\$[\s\S]+?\$\$|(?<![\$\\])\$(?!\s)[^\$\n]+?(?<!\s)\$(?![\$0-9])|==[^=\n]+==|\*\*[^*\n]+\*\*|\*[^*\n]+\*|~~[^~\n]+~~|`[^`\n]+`)/g;

/**
 * Parses inline formatting tags into semantic React elements with full note parity
 */
function renderInlineFormatting(text: string): React.ReactNode {
  if (!text) return null;

  const parts = text.split(INLINE_TOKEN_REGEX);

  return parts.map((part, idx) => {
    if (!part) return null;

    // 1. Embedded wikilink image / media: ![[target]] or ![[target|300]]
    if (part.startsWith('![[') && part.endsWith(']]') && part.length >= 5) {
      const inner = part.slice(3, -2).trim();
      const hasPipe = inner.includes('|');
      const rawTarget = hasPipe ? inner.slice(0, inner.indexOf('|')).trim() : inner;
      const dimOrAlt = hasPipe ? inner.slice(inner.indexOf('|') + 1).trim() : null;
      const { width, height } = parseEmbedDimension(dimOrAlt);
      const src = resolveImageSrc(rawTarget);

      return (
        <span key={idx} className="block my-1.5 max-w-full">
          {src ? (
            <img
              src={src}
              alt={dimOrAlt || rawTarget}
              style={{
                maxWidth: '100%',
                width: width ? `${width}px` : undefined,
                height: height ? `${height}px` : 'auto',
              }}
              className="rounded border border-[#2c2c2c] object-contain cursor-zoom-in my-1 block select-none"
              loading="lazy"
              onClick={(e) => {
                e.stopPropagation();
                useWorkspaceStore.getState().openImageLightbox(src, dimOrAlt || rawTarget);
              }}
            />
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#777] bg-[#222] border border-[#333] px-2 py-0.5 rounded my-0.5 select-text">
              <File01Icon size={12} />
              <span>{rawTarget}</span>
            </span>
          )}
        </span>
      );
    }

    // 2. Standard markdown image embed: ![alt](url)
    if (part.startsWith('![') && part.includes('](') && part.endsWith(')')) {
      const closeBracket = part.indexOf('](');
      const alt = part.slice(2, closeBracket).trim();
      const url = part.slice(closeBracket + 2, -1).trim();
      const { width, height } = parseEmbedDimension(alt);
      const src = resolveImageSrc(url);

      return (
        <span key={idx} className="block my-1.5 max-w-full">
          {src ? (
            <img
              src={src}
              alt={alt || url}
              style={{
                maxWidth: '100%',
                width: width ? `${width}px` : undefined,
                height: height ? `${height}px` : 'auto',
              }}
              className="rounded border border-[#2c2c2c] object-contain cursor-zoom-in my-1 block select-none"
              loading="lazy"
              onClick={(e) => {
                e.stopPropagation();
                useWorkspaceStore.getState().openImageLightbox(src, alt || url);
              }}
            />
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#777] bg-[#222] border border-[#333] px-2 py-0.5 rounded my-0.5 select-text">
              <File01Icon size={12} />
              <span>{alt || url}</span>
            </span>
          )}
        </span>
      );
    }

    // 3. Wikilink: [[target|alias]] or [[target]]
    if (part.startsWith('[[') && part.endsWith(']]') && part.length >= 4) {
      const inner = part.slice(2, -2).trim();
      const [target, alias] = inner.includes('|')
        ? inner.split('|').map((s) => s.trim())
        : [inner, inner];
      return (
        <span
          key={idx}
          onClick={(e) => handleWikilinkClick(e, target)}
          className="md-wikilink text-[var(--flint-link-color,#fbbf24)] hover:underline decoration-dotted cursor-pointer select-text font-medium"
          title={`Open note: ${target}`}
        >
          {alias || target}
        </span>
      );
    }

    // 4. Markdown link: [text](url)
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const closeBracket = part.indexOf('](');
      const linkText = part.slice(1, closeBracket).trim();
      const url = part.slice(closeBracket + 2, -1).trim();

      if (/^(https?|mailto|ftp):/i.test(url)) {
        return (
          <a
            key={idx}
            href={url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[var(--flint-link-color,#fbbf24)] hover:underline inline-flex items-center gap-0.5 select-text"
          >
            <span>{linkText}</span>
            <LinkSquare02Icon size={11} className="inline opacity-70" />
          </a>
        );
      }

      return (
        <span
          key={idx}
          onClick={(e) => handleWikilinkClick(e, url)}
          className="md-wikilink text-[var(--flint-link-color,#fbbf24)] hover:underline decoration-dotted cursor-pointer select-text font-medium"
        >
          {linkText}
        </span>
      );
    }

    // 5. Display math: $$latex$$
    if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
      const latex = part.slice(2, -2).trim();
      const html = renderKatexHtml(latex, true);
      return (
        <span
          key={idx}
          className="block my-1.5 text-center overflow-x-auto select-text"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    // 6. Inline math: $latex$
    if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
      const latex = part.slice(1, -1).trim();
      const html = renderKatexHtml(latex, false);
      return (
        <span
          key={idx}
          className="inline-block mx-0.5 align-baseline select-text"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    // 7. Highlight: ==text==
    if (part.startsWith('==') && part.endsWith('==') && part.length >= 4) {
      return (
        <mark key={idx} className="bg-[#ffd54f]/30 text-white px-0.5 rounded select-text">
          {part.slice(2, -2)}
        </mark>
      );
    }

    // 8. Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-white select-text">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // 9. Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={idx} className="italic text-[#d5d5d5] select-text">
          {part.slice(1, -1)}
        </em>
      );
    }

    // 10. Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return (
        <del key={idx} className="line-through text-[#777] select-text">
          {part.slice(2, -2)}
        </del>
      );
    }

    // 11. Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={idx}
          className="px-1 py-0.5 text-[11px] font-mono bg-[#161616] border border-[#2a2a2a] rounded text-[#e6b450] select-text"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Recursively renders the inner content of a TipTap list item, preserving nested lists
 */
function renderListItemContent(
  content: any[],
  onTaskToggle?: (taskText: string, currentChecked: boolean) => void
): React.ReactNode {
  if (!content || !Array.isArray(content)) return null;

  return content.map((child, idx) => {
    if (!child) return null;

    if (child.type === 'paragraph') {
      const text = (child.content || []).map((c: any) => c.text || '').join('');
      return (
        <span key={idx} className="inline break-words">
          {renderInlineFormatting(text)}
        </span>
      );
    }

    if (child.type === 'bulletList' || child.type === 'orderedList' || child.type === 'taskList') {
      return renderTipTapNodes([child], onTaskToggle);
    }

    return renderTipTapNodes([child], onTaskToggle);
  });
}

/**
 * Renders TipTap document nodes into semantic, lightweight React elements with note parity
 */
function renderTipTapNodes(
  nodes: any[],
  onTaskToggle?: (taskText: string, currentChecked: boolean) => void
): React.ReactNode {
  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
    return <p className="text-xs text-[#666] italic my-1">Empty note</p>;
  }

  return nodes.map((node, index) => {
    if (!node) return null;

    // 1. Headings
    if (node.type === 'heading') {
      const level = node.attrs?.level || 1;
      const text = (node.content || []).map((c: any) => c.text || '').join('');
      if (level === 1) {
        return (
          <h1
            key={index}
            className="text-base font-bold text-white mt-2 mb-1.5 first:mt-0 tracking-tight leading-snug select-text"
          >
            {renderInlineFormatting(text)}
          </h1>
        );
      }
      if (level === 2) {
        return (
          <h2
            key={index}
            className="text-sm font-semibold text-[#f0f0f0] mt-2 mb-1 first:mt-0 leading-snug select-text"
          >
            {renderInlineFormatting(text)}
          </h2>
        );
      }
      return (
        <h3
          key={index}
          className="text-xs font-semibold text-[#e0e0e0] mt-1.5 mb-1 first:mt-0 leading-snug select-text"
        >
          {renderInlineFormatting(text)}
        </h3>
      );
    }

    // 2. Paragraphs (including callout headers)
    if (node.type === 'paragraph') {
      const text = (node.content || []).map((c: any) => c.text || '').join('');
      if (!text.trim()) {
        return <div key={index} className="h-2" />;
      }

      // Check if paragraph is a callout
      const calloutHeader = parseCalloutHeader(text);
      if (calloutHeader) {
        return (
          <CalloutBox key={index} type={calloutHeader.type} customTitle={calloutHeader.title}>
            <p className="my-0.5">{renderInlineFormatting(calloutHeader.title || '')}</p>
          </CalloutBox>
        );
      }

      return (
        <p key={index} className="text-xs text-[#d0d0d0] leading-relaxed my-1 break-words select-text">
          {renderInlineFormatting(text)}
        </p>
      );
    }

    // 3. Bullet Lists
    if (node.type === 'bulletList') {
      return (
        <ul key={index} className="my-1.5 space-y-0.5 text-xs text-[#d0d0d0] pl-4 list-disc select-text">
          {(node.content || []).map((item: any, i: number) => (
            <li key={i} className="leading-relaxed">
              {renderListItemContent(item.content, onTaskToggle)}
            </li>
          ))}
        </ul>
      );
    }

    // 4. Ordered Lists
    if (node.type === 'orderedList') {
      return (
        <ol key={index} className="my-1.5 space-y-0.5 text-xs text-[#d0d0d0] pl-4 list-decimal select-text">
          {(node.content || []).map((item: any, i: number) => (
            <li key={i} className="leading-relaxed">
              {renderListItemContent(item.content, onTaskToggle)}
            </li>
          ))}
        </ol>
      );
    }

    // 5. Task Lists
    if (node.type === 'taskList') {
      return (
        <ul key={index} className="my-1.5 space-y-1 text-xs text-[#d0d0d0] pl-0 list-none select-text">
          {(node.content || []).map((item: any, i: number) => {
            const checked = Boolean(item.attrs?.checked);
            const itemText = (item.content || [])
              .map((c: any) => (c.content || []).map((t: any) => t.text || '').join(''))
              .join('');
            return (
              <li key={i} className="flex items-start gap-1.5">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    e.stopPropagation();
                    onTaskToggle?.(itemText, checked);
                  }}
                  className="mt-0.5 accent-[var(--flint-accent,#ea580c)] cursor-pointer"
                />
                <span className={`flex-1 ${checked ? 'line-through text-[#666]' : 'text-[#d0d0d0]'}`}>
                  {renderInlineFormatting(itemText)}
                </span>
              </li>
            );
          })}
        </ul>
      );
    }

    // 6. Blockquotes & Callouts
    if (node.type === 'blockquote') {
      const firstChild = (node.content || [])[0];
      const firstText = firstChild
        ? (firstChild.content || []).map((c: any) => c.text || '').join('')
        : '';
      const calloutHeader = parseCalloutHeader(firstText);

      if (calloutHeader) {
        const bodyNodes = (node.content || []).slice(1);
        return (
          <CalloutBox key={index} type={calloutHeader.type} customTitle={calloutHeader.title}>
            {bodyNodes.length > 0 ? renderTipTapNodes(bodyNodes, onTaskToggle) : null}
          </CalloutBox>
        );
      }

      return (
        <blockquote
          key={index}
          className="my-1.5 pl-2.5 py-0.5 border-l-2 border-[var(--flint-accent,#ea580c)] bg-[var(--flint-accent,#ea580c)]/5 text-xs text-[#bbb] rounded-r italic select-text"
        >
          {renderTipTapNodes(node.content || [], onTaskToggle)}
        </blockquote>
      );
    }

    // 7. TipTap Image Nodes
    if (node.type === 'image') {
      const src = node.attrs?.src;
      const alt = node.attrs?.alt || 'Embedded image';
      if (src) {
        return (
          <div key={index} className="my-1.5 max-w-full select-none">
            <img
              src={src}
              alt={alt}
              className="rounded border border-[#2c2c2c] object-contain cursor-zoom-in max-w-full block"
              loading="lazy"
              onClick={(e) => {
                e.stopPropagation();
                useWorkspaceStore.getState().openImageLightbox(src, alt);
              }}
            />
          </div>
        );
      }
    }

    // 8. Math Chips
    if (node.type === 'mathChip') {
      const latex = node.attrs?.latex || '';
      const isDisplay = node.attrs?.display === 'block';
      const html = renderKatexHtml(latex, isDisplay);
      return (
        <span
          key={index}
          className={`${isDisplay ? 'block my-1.5 text-center' : 'inline-block mx-0.5 align-baseline'} select-text`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    // 9. Code Blocks
    if (node.type === 'codeBlock') {
      const lang = node.attrs?.language || '';
      const code = (node.content || []).map((c: any) => c.text || '').join('');
      return (
        <div key={index} className="my-2 rounded border border-[#2d2d2d] bg-[#141414] overflow-hidden select-text">
          {lang && (
            <div className="px-2 py-0.5 bg-[#1b1b1b] border-b border-[#2d2d2d] text-[10px] text-[#777] font-mono select-none">
              {lang}
            </div>
          )}
          <pre className="p-2 text-[11px] font-mono text-[#dcdcdc] overflow-x-auto leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    // 10. Tables
    if (node.type === 'table') {
      const rows = node.content || [];
      return (
        <div key={index} className="my-2 overflow-x-auto rounded border border-[#2a2a2a] bg-[#141414] select-text">
          <table className="w-full text-xs text-left border-collapse">
            <tbody>
              {rows.map((row: any, r: number) => {
                const isHeader = r === 0;
                const CellTag = isHeader ? 'th' : 'td';
                return (
                  <tr
                    key={r}
                    className={
                      isHeader
                        ? 'bg-[#1e1e1e] border-b border-[#2a2a2a] text-white font-semibold'
                        : 'border-b border-[#222222] text-[#ccc]'
                    }
                  >
                    {(row.content || []).map((cell: any, c: number) => {
                      const cellText = (cell.content || [])
                        .map((cc: any) => (cc.content || []).map((t: any) => t.text || '').join(''))
                        .join('');
                      return (
                        <CellTag key={c} className="px-2 py-1 border-r border-[#222] last:border-r-0">
                          {renderInlineFormatting(cellText)}
                        </CellTag>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // 11. Horizontal Dividers
    if (node.type === 'horizontalRule') {
      return <hr key={index} className="my-2.5 border-t border-[#2a2a2a]" />;
    }

    return null;
  });
}

/**
 * Fast block parser for raw markdown text with full Flint note parity
 */
function renderPlainTextToMarkdown(
  text: string,
  onTaskToggle?: (taskText: string, currentChecked: boolean) => void
): React.ReactNode {
  if (!text || !text.trim()) {
    return <p className="text-xs text-[#666] italic">Empty note</p>;
  }

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Empty lines
    if (!trimmed) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // 2. Horizontal divider
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={`hr-${i}`} className="my-2.5 border-t border-[#2a2a2a]" />);
      i++;
      continue;
    }

    // 3. Headings (# H1 to ###### H6)
    const headingMatch = rawLine.match(/^(\s*)(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[2].length;
      const hText = headingMatch[3];
      if (level === 1) {
        elements.push(
          <h1
            key={`h-${i}`}
            className="text-base font-bold text-white mt-2 mb-1.5 first:mt-0 tracking-tight leading-snug select-text"
          >
            {renderInlineFormatting(hText)}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2
            key={`h-${i}`}
            className="text-sm font-semibold text-[#f0f0f0] mt-2 mb-1 first:mt-0 leading-snug select-text"
          >
            {renderInlineFormatting(hText)}
          </h2>
        );
      } else {
        elements.push(
          <h3
            key={`h-${i}`}
            className="text-xs font-semibold text-[#e0e0e0] mt-1.5 mb-1 first:mt-0 leading-snug select-text"
          >
            {renderInlineFormatting(hText)}
          </h3>
        );
      }
      i++;
      continue;
    }

    // 4. Callout or Blockquote block
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      const startIdx = i;
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>+\s?/, ''));
        i++;
      }

      const firstLine = quoteLines[0] || '';
      const calloutMatch = firstLine.match(/^\[!([a-zA-Z0-9_\-]+)\]([+-])?(?:\s*(.*))?$/i);
      if (calloutMatch) {
        const type = calloutMatch[1];
        const customTitle = calloutMatch[3] || '';
        const bodyLines = quoteLines.slice(1);
        elements.push(
          <CalloutBox key={`callout-${startIdx}`} type={type} customTitle={customTitle}>
            {bodyLines.length > 0 ? (
              bodyLines.map((bl, bIdx) => (
                <p key={bIdx} className="my-0.5">
                  {renderInlineFormatting(bl)}
                </p>
              ))
            ) : null}
          </CalloutBox>
        );
      } else {
        elements.push(
          <blockquote
            key={`quote-${startIdx}`}
            className="my-1.5 pl-2.5 py-0.5 border-l-2 border-[var(--flint-accent,#ea580c)] bg-[var(--flint-accent,#ea580c)]/5 text-xs text-[#bbb] rounded-r italic select-text"
          >
            {quoteLines.map((ql, qIdx) => (
              <p key={qIdx} className="my-0.5">
                {renderInlineFormatting(ql)}
              </p>
            ))}
          </blockquote>
        );
      }
      continue;
    }

    // 5. Code block (``` ... ```)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      const codeStart = i;
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++;
      }
      elements.push(
        <div key={`code-${codeStart}`} className="my-2 rounded border border-[#2d2d2d] bg-[#141414] overflow-hidden select-text">
          {lang && (
            <div className="px-2 py-0.5 bg-[#1b1b1b] border-b border-[#2d2d2d] text-[10px] text-[#777] font-mono select-none">
              {lang}
            </div>
          )}
          <pre className="p-2 text-[11px] font-mono text-[#dcdcdc] overflow-x-auto leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      continue;
    }

    // 6. Ordered list item with indentation (e.g. "1. item" or "   1. item")
    const olMatch = rawLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (olMatch) {
      const indent = olMatch[1].length;
      const num = olMatch[2];
      const itemText = olMatch[3];
      const padLeft = Math.max(0, Math.floor(indent / 2) * 14);

      elements.push(
        <div
          key={`ol-${i}`}
          style={{ paddingLeft: `${padLeft}px` }}
          className="flex items-start gap-1.5 text-xs text-[#d0d0d0] my-0.5 leading-relaxed select-text"
        >
          <span className="text-[#888] shrink-0 font-mono text-[11px] min-w-[14px] text-right select-none">{num}.</span>
          <span className="flex-1 break-words">{renderInlineFormatting(itemText)}</span>
        </div>
      );
      i++;
      continue;
    }

    // 7. Task list item with indentation (e.g. "- [ ] item" or "- [x] item")
    const taskMatch = rawLine.match(/^(\s*)[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const indent = taskMatch[1].length;
      const isChecked = taskMatch[2].toLowerCase() === 'x';
      const itemText = taskMatch[3];
      const padLeft = Math.max(0, Math.floor(indent / 2) * 14);

      elements.push(
        <div
          key={`task-${i}`}
          style={{ paddingLeft: `${padLeft}px` }}
          className="flex items-start gap-1.5 text-xs text-[#d0d0d0] my-0.5 leading-relaxed select-text"
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              e.stopPropagation();
              onTaskToggle?.(itemText, isChecked);
            }}
            className="mt-0.5 accent-[var(--flint-accent,#ea580c)] cursor-pointer"
          />
          <span className={`flex-1 break-words ${isChecked ? 'line-through text-[#666]' : 'text-[#d0d0d0]'}`}>
            {renderInlineFormatting(itemText)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // 8. Bullet list item with indentation (e.g. "- item" or "* item")
    const ulMatch = rawLine.match(/^(\s*)[-*]\s+(.*)$/);
    if (ulMatch) {
      const indent = ulMatch[1].length;
      const itemText = ulMatch[2];
      const padLeft = Math.max(0, Math.floor(indent / 2) * 14);

      elements.push(
        <div
          key={`ul-${i}`}
          style={{ paddingLeft: `${padLeft}px` }}
          className="flex items-start gap-1.5 text-xs text-[#d0d0d0] my-0.5 leading-relaxed select-text"
        >
          <span className="text-[#888] shrink-0 text-sm leading-none mt-0.5 select-none">•</span>
          <span className="flex-1 break-words">{renderInlineFormatting(itemText)}</span>
        </div>
      );
      i++;
      continue;
    }

    // 9. Standard paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs text-[#d0d0d0] leading-relaxed my-0.5 break-words select-text">
        {renderInlineFormatting(rawLine)}
      </p>
    );
    i++;
  }

  return elements;
}

export const CardContentRenderer: React.FC<CardContentRendererProps> = React.memo(
  ({
    node,
    doc,
    contentJson,
    isEditingText,
    onTextChange,
    onTextBlur,
    onImageDimensions,
    onTaskToggle,
  }) => {
    // 1. Image Attachment Cards
    if (isImageDocument(doc)) {
      const src = resolveMediaSrc(contentJson || doc?.content_json, doc?.title);
      return (
        <div className="w-full h-full flex items-center justify-center bg-transparent overflow-hidden rounded-[4px] select-none">
          {src ? (
            <img
              src={src}
              alt={doc?.title || 'Canvas image'}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                  onImageDimensions?.(img.naturalWidth, img.naturalHeight);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                useWorkspaceStore.getState().openImageLightbox(src, doc?.title || 'Image');
              }}
              className="w-full h-full object-contain pointer-events-auto rounded-[3px] cursor-zoom-in"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-[#666] text-xs gap-1 p-3">
              <File01Icon size={18} className="text-[#555]" />
              <span className="text-[11px] truncate max-w-[200px]">{doc?.title || 'Image attachment'}</span>
            </div>
          )}
        </div>
      );
    }

    // 2. Audio Attachment Cards
    if (isAudioDocument(doc)) {
      const src = resolveMediaSrc(contentJson || doc?.content_json, doc?.title);
      return (
        <div className="w-full h-full flex flex-col justify-center p-3 bg-transparent rounded-[4px]">
          <audio controls src={src} className="w-full h-8" />
        </div>
      );
    }

    // 3. Video Attachment Cards
    if (isVideoDocument(doc)) {
      const src = resolveMediaSrc(contentJson || doc?.content_json, doc?.title);
      return (
        <div className="w-full h-full bg-transparent flex items-center justify-center overflow-hidden rounded-[4px]">
          <video controls src={src} className="w-full h-full object-contain" />
        </div>
      );
    }

    // 4. PDF Attachment Cards
    if (isPdfDocument(doc)) {
      const src = resolveMediaSrc(contentJson || doc?.content_json, doc?.title);
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-transparent gap-2 rounded-[4px] text-center">
          <File01Icon size={24} className="text-rose-400" />
          <span className="text-xs font-medium text-[#dedede] truncate max-w-[220px]">
            {doc?.title || 'PDF Document'}
          </span>
          {src && (
            <button
              type="button"
              onClick={() => window.open(src, '_blank')}
              className="px-2.5 py-1 text-xs rounded bg-[#262626] hover:bg-[#333] text-[#ccc] hover:text-white cursor-pointer transition-none flex items-center gap-1"
            >
              <LinkSquare02Icon size={12} />
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
            <LinkSquare02Icon size={14} className="text-[var(--flint-accent,#ea580c)] shrink-0" />
            <span className="text-xs font-semibold text-white truncate">
              {node.text_content || targetUrl || 'Web Link'}
            </span>
          </div>
          <p className="text-[11px] text-[#777] truncate my-2">{targetUrl}</p>
          {targetUrl && (
            <button
              type="button"
              onClick={() => window.open(targetUrl, '_blank')}
              className="px-2.5 py-1 text-[11px] rounded bg-[#242424] hover:bg-[#2e2e2e] text-[#ccc] hover:text-white cursor-pointer transition-none self-start flex items-center gap-1"
            >
              <span>Visit Link</span>
            </button>
          )}
        </div>
      );
    }

    // 6. Text / Sticky Notes
    if (node.type === 'text') {
      if (isEditingText) {
        return (
          <textarea
            autoFocus
            onPointerDown={(e) => e.stopPropagation()}
            value={node.text_content || ''}
            onChange={(e) => onTextChange?.(e.target.value)}
            onBlur={onTextBlur}
            placeholder="Type note content..."
            className="w-full h-full bg-transparent text-xs text-[#e5e7eb] outline-none resize-none placeholder-[#555] leading-relaxed select-text p-3 font-sans"
          />
        );
      }

      return (
        <div className="w-full h-full overflow-y-auto custom-scrollbar p-3.5 text-xs text-[#e0e0e0] leading-relaxed select-text cursor-text overscroll-contain">
          {renderPlainTextToMarkdown(node.text_content || '', onTaskToggle)}
        </div>
      );
    }

    // 7. Document / Note Cards
    const renderedBody = useMemo(() => {
      const raw = contentJson || doc?.content_json;
      if (!raw || raw === '{}') {
        return <p className="text-xs text-[#666] italic">Empty note</p>;
      }

      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed.type === 'doc' && Array.isArray(parsed.content)) {
          return renderTipTapNodes(parsed.content, onTaskToggle);
        }
      } catch {}

      return renderPlainTextToMarkdown(raw, onTaskToggle);
    }, [contentJson, doc?.content_json, onTaskToggle]);

    return (
      <div className="w-full h-full overflow-y-auto custom-scrollbar p-3.5 text-xs leading-relaxed select-text overscroll-contain">
        {renderedBody}
      </div>
    );
  }
);
