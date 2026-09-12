import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Typography from '@tiptap/extension-typography';
import { LivePreviewSyntax } from './extensions/live-preview-syntax';
import { NumberedListBehavior } from './extensions/numbered-list-behavior';
import { MarkdownShortcuts } from './extensions/markdown-shortcuts';
import { AutoPairing } from './extensions/auto-pairing';
import { SmartTabIndent } from './extensions/smart-tab-indent';
import { markdownToTipTapJson, jsonToMarkdown } from '@/lib/db/documents';
import { useSettingsStore } from '@/store/settingsStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { platform } from '@/lib/platform/platformAdapter';
import { markLinkVisited } from '@/lib/visitedLinks';
import katex from 'katex';

export interface DocumentViewProps {
  documentId?: string;
  content: string;
  isDocBacked?: boolean;
  editable?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
  onChange?: (newContent: string) => void;
  onBlur?: () => void;
  onEscape?: () => void;
  className?: string;
  placeholder?: string;
  onTaskToggle?: (taskText: string, currentChecked: boolean) => void;
}

/**
 * Normalizes incoming content into a valid TipTap doc JSON AST.
 * Handles JSON strings, markdown strings, and empty fallbacks.
 */
function parseContentToDocAst(raw: string): any {
  if (!raw || !raw.trim() || raw === '{}') {
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }],
    };
  }

  // 1. Try parsing direct JSON
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && parsed.type === 'doc' && Array.isArray(parsed.content)) {
      return normalizeHeadings(parsed);
    }
  } catch {}

  // 2. Fall back to converting raw markdown string
  try {
    const jsonStr = markdownToTipTapJson(raw);
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.type === 'doc' && Array.isArray(parsed.content)) {
      return normalizeHeadings(parsed);
    }
  } catch {}

  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [] }],
  };
}

/**
 * Normalizes imported paragraphs starting with markdown heading tokens into heading nodes.
 */
function normalizeHeadings(doc: any): any {
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.content)) return doc;

  const newContent = doc.content.map((node: any) => {
    if (node && node.type === 'paragraph' && Array.isArray(node.content) && node.content.length > 0) {
      const firstChild = node.content[0];
      if (firstChild && firstChild.type === 'text' && typeof firstChild.text === 'string') {
        const match = firstChild.text.match(/^([ ]{0,3})(#{1,6})(?:[ \t]+(.*))?$/);
        if (match) {
          const level = match[2].length;
          const restOfFirstText = (match[3] || '').replace(/[ \t]+#+[ \t]*$/, '');
          const remainingContent = node.content.slice(1);
          const newInlineContent: any[] = [];
          if (restOfFirstText.length > 0) {
            newInlineContent.push({ ...firstChild, text: restOfFirstText });
          }
          newInlineContent.push(...remainingContent);
          return {
            type: 'heading',
            attrs: { level },
            content: newInlineContent,
          };
        }
      }
    }
    return node;
  });

  return { ...doc, content: newContent };
}

export const COMPACT_DOC_CSS = `
  .noether-compact-doc {
    scrollbar-gutter: auto !important;
  }
  .noether-compact-doc .ProseMirror {
    outline: none !important;
    font-size: 14px !important;
    line-height: 1.625 !important;
    color: #d0d0d0 !important;
    min-height: auto !important;
  }
  .noether-compact-doc .ProseMirror > *:first-child {
    margin-top: 0 !important;
  }
  .noether-compact-doc .ProseMirror > *:last-child {
    margin-bottom: 0 !important;
  }
  .noether-compact-doc .ProseMirror p {
    margin-top: 0.25rem !important;
    margin-bottom: 0.25rem !important;
    line-height: 1.625 !important;
    font-size: 14px !important;
    color: #d0d0d0 !important;
    word-break: break-word !important;
  }
  .noether-compact-doc .ProseMirror h1 {
    font-size: 1.2rem !important;
    font-weight: 700 !important;
    color: #ffffff !important;
    margin-top: 0.5rem !important;
    margin-bottom: 0.375rem !important;
    line-height: 1.375 !important;
    letter-spacing: -0.025em !important;
  }
  .noether-compact-doc .ProseMirror h2 {
    font-size: 1.05rem !important;
    font-weight: 600 !important;
    color: #f0f0f0 !important;
    margin-top: 0.5rem !important;
    margin-bottom: 0.25rem !important;
    line-height: 1.375 !important;
  }
  .noether-compact-doc .ProseMirror h3 {
    font-size: 0.9rem !important;
    font-weight: 600 !important;
    color: #e0e0e0 !important;
    margin-top: 0.375rem !important;
    margin-bottom: 0.25rem !important;
    line-height: 1.375 !important;
  }
  .noether-compact-doc .ProseMirror ul {
    margin-top: 0.375rem !important;
    margin-bottom: 0.375rem !important;
    padding-left: 1rem !important;
  }
  .noether-compact-doc .ProseMirror ol {
    margin-top: 0.375rem !important;
    margin-bottom: 0.375rem !important;
    padding-left: 1rem !important;
  }
  .noether-compact-doc .ProseMirror li {
    line-height: 1.625 !important;
    font-size: 14px !important;
    color: #d0d0d0 !important;
  }
  .noether-compact-doc .ProseMirror blockquote {
    margin: 0.375rem 0 !important;
    padding-left: 0.625rem !important;
    border-left: 2px solid var(--noether-accent, #eb584d) !important;
    background-color: rgba(235, 88, 77, 0.05) !important;
    font-size: 14px !important;
    color: #bbb !important;
  }
  .noether-compact-doc .ProseMirror code {
    font-family: var(--font-monospace) !important;
    font-size: 13px !important;
    background-color: #161616 !important;
    border: 1px solid #2a2a2a !important;
    border-radius: 3px !important;
    padding: 0.1rem 0.25rem !important;
    color: #e6b450 !important;
  }
  .noether-compact-doc .ProseMirror pre {
    margin: 0.5rem 0 !important;
    border-radius: 4px !important;
    border: 1px solid #2d2d2d !important;
    background-color: #141414 !important;
    padding: 0.5rem !important;
    font-family: var(--font-monospace) !important;
    font-size: 13px !important;
    color: #dcdcdc !important;
    overflow-x: auto !important;
  }
`;

export function ensureCompactDocStyles(): void {
  if (typeof document !== 'undefined' && !document.getElementById('noether-compact-doc-style')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'noether-compact-doc-style';
    styleEl.textContent = COMPACT_DOC_CSS;
    document.head.appendChild(styleEl);
  }
}
if (typeof document !== 'undefined') {
  ensureCompactDocStyles();
}

function getTaskItemText(node: any): string {
  if (!node) return '';
  const texts: string[] = [];
  function extract(n: any) {
    if (n.text) texts.push(n.text);
    if (Array.isArray(n.content)) {
      n.content.forEach(extract);
    }
  }
  extract(node);
  return texts.join('').trim();
}

const katexHtmlCache = new Map<string, string>();
function renderCachedKatex(latex: string, displayMode: boolean): string {
  const key = `${displayMode ? 'B' : 'I'}:${latex}`;
  const cached = katexHtmlCache.get(key);
  if (cached !== undefined) return cached;
  try {
    const html = katex.renderToString(latex, { displayMode, throwOnError: false });
    if (katexHtmlCache.size >= 1000) {
      const firstKey = katexHtmlCache.keys().next().value;
      if (firstKey) katexHtmlCache.delete(firstKey);
    }
    katexHtmlCache.set(key, html);
    return html;
  } catch {
    return latex;
  }
}

function renderInlineFormatting(text: string): React.ReactNode {
  if (!text) return '';

  const regex = /(\*\*\*([^*\n]+)\*\*\*|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|___([^_\n]+)___|__([^_\n]+)__|(?<![a-zA-Z0-9])_([^_ \n][^_\n]*?)_(?![a-zA-Z0-9])|`([^`\n]+)`|~~([^~\n]+)~~|==([^=\n]+)==|\[\[([^\]\n]+)\]\]|!\[([^\]\n]*)\]\(([^)\n]+)\)|\[([^\]\n]+)\]\(([^)\n]+)\)|\$([^\$\n]+)\$)/g;

  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(<React.Fragment key={`txt-${lastIdx}`}>{text.slice(lastIdx, match.index)}</React.Fragment>);
    }

    const fullMatch = match[0];
    const key = `inline-${match.index}`;

    if (fullMatch.startsWith('***') && fullMatch.endsWith('***')) {
      parts.push(<strong key={key}><em>{match[2]}</em></strong>);
    } else if (fullMatch.startsWith('___') && fullMatch.endsWith('___')) {
      parts.push(<strong key={key}><em>{match[5]}</em></strong>);
    } else if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
      parts.push(<strong key={key}>{match[3]}</strong>);
    } else if (fullMatch.startsWith('__') && fullMatch.endsWith('__')) {
      parts.push(<strong key={key}>{match[6]}</strong>);
    } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*')) {
      parts.push(<em key={key}>{match[4]}</em>);
    } else if (fullMatch.startsWith('_') && fullMatch.endsWith('_')) {
      parts.push(<em key={key}>{match[7]}</em>);
    } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
      parts.push(<code key={key}>{match[8]}</code>);
    } else if (fullMatch.startsWith('~~') && fullMatch.endsWith('~~')) {
      parts.push(<s key={key}>{match[9]}</s>);
    } else if (fullMatch.startsWith('==') && fullMatch.endsWith('==')) {
      parts.push(
        <mark key={key} className="bg-[rgba(235,88,77,0.2)] text-inherit px-0.5 rounded">
          {match[10]}
        </mark>
      );
    } else if (fullMatch.startsWith('[[') && fullMatch.endsWith(']]')) {
      const raw = match[11].trim();
      const pipe = raw.indexOf('|');
      const target = pipe !== -1 ? raw.slice(0, pipe).trim() : raw;
      const label = pipe !== -1 ? raw.slice(pipe + 1).trim() : target;
      parts.push(
        <span
          key={key}
          data-wikilink-target={target}
          className="md-wikilink text-[var(--noether-accent,#eb584d)] hover:underline cursor-pointer"
        >
          {label}
        </span>
      );
    } else if (fullMatch.startsWith('![') && fullMatch.includes('](')) {
      parts.push(
        <img
          key={key}
          src={match[13]}
          alt={match[12] || ''}
          loading="lazy"
          decoding="async"
          className="max-w-full rounded my-1 select-none"
        />
      );
    } else if (fullMatch.startsWith('[') && fullMatch.includes('](')) {
      parts.push(
        <a
          key={key}
          href={match[15]}
          className="md-link text-[var(--noether-accent,#eb584d)] underline cursor-pointer hover:opacity-80"
        >
          {match[14]}
        </a>
      );
    } else if (fullMatch.startsWith('$') && fullMatch.endsWith('$')) {
      const latex = match[16];
      const mathHtml = renderCachedKatex(latex, false);
      parts.push(<span key={key} dangerouslySetInnerHTML={{ __html: mathHtml }} />);
    } else {
      parts.push(<React.Fragment key={key}>{fullMatch}</React.Fragment>);
    }

    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(<React.Fragment key={`txt-${lastIdx}`}>{text.slice(lastIdx)}</React.Fragment>);
  }

  return parts.length > 0 ? parts : text;
}

function renderInlineNode(node: any, key: number | string): React.ReactNode {
  if (!node) return null;
  if (node.type === 'hardBreak') return <br key={key} />;
  if (node.type === 'mathChip') {
    const latex = node.attrs?.latex || '';
    const mathHtml = renderCachedKatex(latex, false);
    return <span key={key} dangerouslySetInnerHTML={{ __html: mathHtml }} />;
  }

  const rawText = node.text || '';
  const hasMarks = Array.isArray(node.marks) && node.marks.length > 0;
  let content: React.ReactNode = renderInlineFormatting(rawText);

  if (hasMarks) {
    for (const mark of node.marks) {
      switch (mark.type) {
        case 'bold':
          content = <strong>{content}</strong>;
          break;
        case 'italic':
          content = <em>{content}</em>;
          break;
        case 'strike':
          content = <s>{content}</s>;
          break;
        case 'code':
          content = <code>{content}</code>;
          break;
        case 'underline':
          content = <u>{content}</u>;
          break;
        case 'highlight':
          content = (
            <mark
              style={mark.attrs?.color ? { backgroundColor: mark.attrs.color } : undefined}
              className="bg-[rgba(235,88,77,0.2)] text-inherit px-0.5 rounded"
            >
              {content}
            </mark>
          );
          break;
        case 'link': {
          const href = mark.attrs?.href || '';
          const target = mark.attrs?.['data-wikilink-target'] || mark.attrs?.target || href;
          content = (
            <a
              href={href}
              data-wikilink-target={mark.attrs?.['data-wikilink-target'] ? target : undefined}
              className="md-link text-[var(--noether-accent,#eb584d)] underline cursor-pointer hover:opacity-80"
            >
              {content}
            </a>
          );
          break;
        }
      }
    }
  }

  return <React.Fragment key={key}>{content}</React.Fragment>;
}

function renderDocNode(
  node: any,
  index: number | string,
  onTaskToggle?: (taskText: string, currentChecked: boolean) => void
): React.ReactNode {
  if (!node) return null;

  switch (node.type) {
    case 'doc':
      return (
        <React.Fragment key={index}>
          {node.content?.map((child: any, i: number) => renderDocNode(child, i, onTaskToggle))}
        </React.Fragment>
      );

    case 'paragraph': {
      const hasContent = Array.isArray(node.content) && node.content.length > 0;
      return (
        <p key={index}>
          {hasContent ? (
            node.content.map((c: any, i: number) => renderInlineNode(c, i))
          ) : (
            <br />
          )}
        </p>
      );
    }

    case 'heading': {
      const level = Math.min(6, Math.max(1, node.attrs?.level || 1));
      const children = node.content?.map((c: any, i: number) => renderInlineNode(c, i)) || null;
      switch (level) {
        case 1: return <h1 key={index}>{children}</h1>;
        case 2: return <h2 key={index}>{children}</h2>;
        case 3: return <h3 key={index}>{children}</h3>;
        case 4: return <h4 key={index}>{children}</h4>;
        case 5: return <h5 key={index}>{children}</h5>;
        case 6: return <h6 key={index}>{children}</h6>;
        default: return <h1 key={index}>{children}</h1>;
      }
    }

    case 'bulletList':
      return (
        <ul key={index}>
          {node.content?.map((child: any, i: number) => renderDocNode(child, i, onTaskToggle))}
        </ul>
      );

    case 'orderedList':
      return (
        <ol key={index} start={node.attrs?.start || 1}>
          {node.content?.map((child: any, i: number) => renderDocNode(child, i, onTaskToggle))}
        </ol>
      );

    case 'listItem':
      return (
        <li key={index}>
          {node.content?.map((child: any, i: number) => renderDocNode(child, i, onTaskToggle))}
        </li>
      );

    case 'taskList':
      return (
        <ul key={index} className="contains-task-list list-none p-0">
          {node.content?.map((child: any, i: number) => renderDocNode(child, i, onTaskToggle))}
        </ul>
      );

    case 'taskItem': {
      const checked = Boolean(node.attrs?.checked);
      const taskText = getTaskItemText(node);
      return (
        <li
          key={index}
          className="task-list-item flex items-start gap-2 my-1"
          data-type="taskItem"
          data-checked={checked ? 'true' : 'false'}
        >
          <label
            className="flex items-center select-none pt-0.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                e.stopPropagation();
                onTaskToggle?.(taskText, checked);
              }}
              className="w-3.5 h-3.5 rounded border border-[#555] bg-[#222] accent-[var(--noether-accent,#eb584d)] cursor-pointer"
            />
          </label>
          <div className={`flex-1 min-w-0 ${checked ? 'line-through text-[#777]' : ''}`}>
            {node.content?.map((child: any, i: number) => renderDocNode(child, i, onTaskToggle))}
          </div>
        </li>
      );
    }

    case 'blockquote':
      return (
        <blockquote key={index}>
          {node.content?.map((child: any, i: number) => renderDocNode(child, i, onTaskToggle))}
        </blockquote>
      );

    case 'codeBlock': {
      const codeText = node.content?.map((c: any) => c.text || '').join('') || '';
      return (
        <pre key={index}>
          <code data-language={node.attrs?.language || ''}>{codeText}</code>
        </pre>
      );
    }

    case 'horizontalRule':
      return <hr key={index} />;

    case 'mathChip': {
      const latex = node.attrs?.latex || '';
      const isBlock = node.attrs?.display === 'block';
      const mathHtml = renderCachedKatex(latex, isBlock);
      return isBlock ? (
        <div key={index} className="my-2 overflow-x-auto" dangerouslySetInnerHTML={{ __html: mathHtml }} />
      ) : (
        <span key={index} dangerouslySetInnerHTML={{ __html: mathHtml }} />
      );
    }

    case 'table':
      return (
        <div key={index} className="overflow-x-auto my-2">
          <table className="border-collapse table-auto w-full text-[13px] border border-[#333]">
            <tbody>
              {node.content?.map((child: any, i: number) => renderDocNode(child, i, onTaskToggle))}
            </tbody>
          </table>
        </div>
      );

    case 'tableRow':
      return (
        <tr key={index}>
          {node.content?.map((child: any, i: number) => renderDocNode(child, i, onTaskToggle))}
        </tr>
      );

    case 'tableHeader':
      return (
        <th
          key={index}
          colSpan={node.attrs?.colspan || 1}
          rowSpan={node.attrs?.rowspan || 1}
          className="border border-[#333] px-2 py-1 bg-[#222] font-semibold text-left text-white"
        >
          {node.content?.map((child: any, i: number) => renderDocNode(child, i, onTaskToggle))}
        </th>
      );

    case 'tableCell':
      return (
        <td
          key={index}
          colSpan={node.attrs?.colspan || 1}
          rowSpan={node.attrs?.rowspan || 1}
          className="border border-[#333] px-2 py-1 text-[#d0d0d0]"
        >
          {node.content?.map((child: any, i: number) => renderDocNode(child, i, onTaskToggle))}
        </td>
      );

    case 'text':
      return renderInlineNode(node, index);

    case 'hardBreak':
      return <br key={index} />;

    case 'image':
      return (
        <img
          key={index}
          src={node.attrs?.src}
          alt={node.attrs?.alt || ''}
          title={node.attrs?.title || ''}
          className="max-w-full rounded"
        />
      );

    default:
      if (Array.isArray(node.content)) {
        return (
          <React.Fragment key={index}>
            {node.content.map((child: any, i: number) => renderDocNode(child, i, onTaskToggle))}
          </React.Fragment>
        );
      }
      return null;
  }
}

/**
 * Lightweight, high-performance read-only renderer for document content and canvas cards.
 * Avoids initializing ProseMirror/TipTap instances in reading mode, allowing hundreds of
 * cards to mount instantly under 200ms with zero UI thread blockage.
 */
export const DocumentViewReadOnly: React.FC<DocumentViewProps> = React.memo(
  ({
    content,
    compact = false,
    className = '',
    placeholder = '',
    onTaskToggle,
  }) => {
    const accentListPrefixes = useSettingsStore((s) => s.accentListPrefixes);
    const indentationGuides = useSettingsStore((s) => s.indentationGuides);
    const strictLineBreaks = useSettingsStore((s) => s.strictLineBreaks);
    const showExternalLinkIcon = useSettingsStore((s) => s.showExternalLinkIcon);

    const docAst = useMemo(() => parseContentToDocAst(content), [content]);

    const handleContainerClick = useCallback((e: React.MouseEvent) => {
      const targetEl = (e.target as HTMLElement)?.closest('.md-link, .md-wikilink, a');
      if (targetEl) {
        const href = targetEl.getAttribute('href');
        const target = targetEl.getAttribute('data-wikilink-target') || targetEl.getAttribute('data-target');
        if (target) {
          e.preventDefault();
          e.stopPropagation();
          markLinkVisited(target);
          const ds = useDocumentStore.getState();
          const ws = useWorkspaceStore.getState();
          const cleanTarget = target.trim().toLowerCase().replace(/\.md$/, '');
          const matched = ds.documents.find(
            (d) => !d.is_folder && (d.title.toLowerCase() === cleanTarget || d.id === target)
          );
          if (matched) {
            ws.openTab(matched.id, matched.title);
            ds.setActiveDocumentById(matched.id);
            ws.setMainViewMode('document');
          } else {
            ws.showToast(`Note "${target}" not found`, 'warning');
          }
          return;
        }
        if (href && /^https?:\/\//i.test(href)) {
          e.preventDefault();
          e.stopPropagation();
          platform.openUrl(href);
          return;
        }
      }
    }, []);

    const isEmpty =
      !docAst ||
      !Array.isArray(docAst.content) ||
      docAst.content.length === 0 ||
      (docAst.content.length === 1 &&
        docAst.content[0].type === 'paragraph' &&
        (!docAst.content[0].content || docAst.content[0].content.length === 0));

    return (
      <div
        onClick={handleContainerClick}
        className={`document-view-root w-full h-full overflow-y-auto custom-scrollbar select-text overscroll-contain ${
          compact ? 'noether-compact-doc p-3.5' : 'p-6'
        } ${accentListPrefixes ? 'noether-accent-lists' : ''} ${
          indentationGuides ? 'noether-indent-guides' : ''
        } ${strictLineBreaks ? 'noether-strict-line-breaks' : ''} ${
          showExternalLinkIcon ? 'noether-show-link-icon' : ''
        } tiptap-reading-view cursor-default ${className}`}
      >
        <div
          className={`ProseMirror ${
            compact ? 'noether-compact-doc-inner' : 'min-h-full noether-standard-doc-inner'
          } select-text cursor-default`}
        >
          {isEmpty && placeholder ? (
            <p className="text-[#666] italic select-none">{placeholder}</p>
          ) : (
            renderDocNode(docAst, 'root', onTaskToggle)
          )}
        </div>
      </div>
    );
  }
);

/**
 * On-demand WYSIWYG rich-text editor instance powered by TipTap and ProseMirror.
 * Mounted exclusively when a user activates inline text editing.
 */
export const DocumentViewEditable: React.FC<DocumentViewProps> = React.memo(
  ({
    documentId,
    content,
    isDocBacked = false,
    editable = true,
    compact = false,
    autoFocus = false,
    onChange,
    onBlur,
    onEscape,
    className = '',
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const saveTimerRef = useRef<any>(null);
    const lastEmittedContentRef = useRef<string>(content);
    const prevContentRef = useRef<string>(content);
    const wasEditableRef = useRef<boolean>(editable);
    const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);

    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const onBlurRef = useRef(onBlur);
    onBlurRef.current = onBlur;

    const onEscapeRef = useRef(onEscape);
    onEscapeRef.current = onEscape;

    // Read global user settings for editor styling flags
    const accentListPrefixes = useSettingsStore((s) => s.accentListPrefixes);
    const indentationGuides = useSettingsStore((s) => s.indentationGuides);
    const strictLineBreaks = useSettingsStore((s) => s.strictLineBreaks);
    const showExternalLinkIcon = useSettingsStore((s) => s.showExternalLinkIcon);

    const editorRef = useRef<any>(null);

    // Initial content parsed once on mount
    const initialParsedDoc = useMemo(
      () => parseContentToDocAst(content),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    const emitSave = useCallback(
      (editorInstance?: any) => {
        const inst = editorInstance || editorRef.current;
        if (!inst || inst.isDestroyed || !onChangeRef.current) return;
        try {
          const jsonAst = inst.getJSON();
          const jsonString = JSON.stringify(jsonAst);

          let output: string;
          if (isDocBacked) {
            output = jsonString;
          } else {
            output = jsonToMarkdown(jsonString);
          }

          if (output !== lastEmittedContentRef.current) {
            lastEmittedContentRef.current = output;
            prevContentRef.current = output;
            onChangeRef.current(output);
          }
        } catch {}
      },
      [isDocBacked]
    );

    const editor = useEditor({
      editable,
      autofocus: autoFocus !== false ? 'end' : false,
      content: initialParsedDoc,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] },
          hardBreak: { keepMarks: true },
          history: { depth: 30, newGroupDelay: 500 },
          bold: false,
          italic: false,
          strike: false,
          code: false,
          orderedList: false,
          bulletList: false,
        }),
        LivePreviewSyntax,
        NumberedListBehavior,
        MarkdownShortcuts,
        AutoPairing,
        SmartTabIndent,
        Typography,
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        Highlight.configure({ multicolor: true }),
        Link.configure({
          openOnClick: false,
          autolink: true,
        }),
      ],
      editorProps: {
        attributes: {
          class: `focus:outline-none select-text ${
            compact ? 'noether-compact-doc-inner' : 'min-h-full noether-standard-doc-inner'
          } ${editable ? 'cursor-text' : 'cursor-default'}`,
          spellcheck: 'false',
        },
        handleDOMEvents: {
          keydown: (_view, event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
                saveTimerRef.current = null;
              }
              if (editorRef.current) {
                emitSave(editorRef.current);
              }
              onEscapeRef.current?.();
              return true;
            }
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              event.stopPropagation();
              if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
                saveTimerRef.current = null;
              }
              if (editorRef.current) {
                emitSave(editorRef.current);
              }
              onBlurRef.current?.();
              return true;
            }
            return false;
          },
          click: (_view, event) => {
            const targetEl = (event.target as HTMLElement)?.closest('.md-link, .md-wikilink, a');
            if (targetEl) {
              const href = targetEl.getAttribute('href');
              const target = targetEl.getAttribute('data-wikilink-target') || targetEl.getAttribute('data-target');
              if (target) {
                event.preventDefault();
                event.stopPropagation();
                markLinkVisited(target);
                const ds = useDocumentStore.getState();
                const ws = useWorkspaceStore.getState();
                const cleanTarget = target.trim().toLowerCase().replace(/\.md$/, '');
                const matched = ds.documents.find(
                  (d) => !d.is_folder && (d.title.toLowerCase() === cleanTarget || d.id === target)
                );
                if (matched) {
                  ws.openTab(matched.id, matched.title);
                  ds.setActiveDocumentById(matched.id);
                  ws.setMainViewMode('document');
                } else {
                  ws.showToast(`Note "${target}" not found`, 'warning');
                }
                return true;
              }
              if (href && /^https?:\/\//i.test(href)) {
                event.preventDefault();
                event.stopPropagation();
                platform.openUrl(href);
                return true;
              }
            }
            return false;
          },
        },
      },
      onSelectionUpdate: ({ editor: ed }) => {
        if (ed.isEditable) {
          const { from, to } = ed.state.selection;
          savedSelectionRef.current = { from, to };
        }
      },
      onUpdate: ({ editor: ed }) => {
        editorRef.current = ed;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          emitSave(ed);
          saveTimerRef.current = null;
        }, 250);
      },
      onBlur: () => {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        if (editorRef.current) {
          emitSave(editorRef.current);
        }
        onBlurRef.current?.();
      },
    });

    editorRef.current = editor;

    // Synchronize external content changes when document is updated externally
    useEffect(() => {
      if (!editor || editor.isDestroyed || !content) return;
      if (content === prevContentRef.current || content === lastEmittedContentRef.current) return;

      prevContentRef.current = content;
      try {
        const parsed = parseContentToDocAst(content);
        editor.commands.setContent(parsed, false);
      } catch {}
    }, [content, editor]);

    // Handle seamless transition between reading mode and live editing mode
    useEffect(() => {
      if (!editor || editor.isDestroyed) return;

      if (editor.isEditable !== editable) {
        editor.setEditable(editable);
      }

      if (!editable) {
        const { from, to } = editor.state.selection;
        if (from !== undefined && to !== undefined) {
          savedSelectionRef.current = { from, to };
        }
        editor.view.dispatch(editor.state.tr.setMeta('livePreviewFocus', false));
      } else if (wasEditableRef.current === false && editable === true) {
        editor.view.dispatch(editor.state.tr.setMeta('livePreviewFocus', true));
        const targetSel = savedSelectionRef.current;
        if (targetSel) {
          const maxPos = editor.state.doc.content.size;
          const from = Math.max(0, Math.min(targetSel.from, maxPos));
          const to = Math.max(0, Math.min(targetSel.to, maxPos));
          editor.commands.setTextSelection({ from, to });
        }
        editor.commands.focus();
      }

      wasEditableRef.current = editable;
    }, [editable, editor]);

    // Ensure immediate focus if autoFocus is requested on mount or edit trigger
    useEffect(() => {
      if (!editor || editor.isDestroyed) return;
      if (autoFocus && editable) {
        requestAnimationFrame(() => {
          if (!editor.isDestroyed) {
            editor.view.dispatch(editor.state.tr.setMeta('livePreviewFocus', true));
            editor.commands.focus('end');
          }
        });
      }
    }, [autoFocus, editable, editor]);

    // Flush any pending save on unmount
    useEffect(() => {
      return () => {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        if (editorRef.current && !editorRef.current.isDestroyed) {
          emitSave(editorRef.current);
        }
      };
    }, [emitSave]);

    return (
      <div
        ref={containerRef}
        onPointerDown={(e) => {
          if (editable) {
            // Prevent pointerdown from dragging the canvas card while editing
            e.stopPropagation();
          }
        }}
        onClick={() => {
          if (editable && editor && !editor.isFocused) {
            editor.commands.focus('end');
          }
        }}
        onDoubleClick={(e) => {
          if (editable) {
            e.stopPropagation();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            if (saveTimerRef.current) {
              clearTimeout(saveTimerRef.current);
              saveTimerRef.current = null;
            }
            if (editorRef.current) {
              emitSave(editorRef.current);
            }
            onEscapeRef.current?.();
          }
        }}
        className={`document-view-root w-full h-full overflow-y-auto custom-scrollbar select-text overscroll-contain ${
          compact ? 'noether-compact-doc p-3.5' : 'p-6'
        } ${accentListPrefixes ? 'noether-accent-lists' : ''} ${
          indentationGuides ? 'noether-indent-guides' : ''
        } ${strictLineBreaks ? 'noether-strict-line-breaks' : ''} ${
          showExternalLinkIcon ? 'noether-show-link-icon' : ''
        } ${!editable ? 'tiptap-reading-view cursor-default' : 'cursor-text'} ${className}`}
      >
        <EditorContent editor={editor} className={compact ? 'w-full' : 'w-full h-full'} />
      </div>
    );
  }
);

/**
 * Reusable, first-class DocumentView component.
 * Automatically delegates to lightweight read-only rendering in read mode,
 * and mounts the full rich-text TipTap editor exclusively on-demand when edited.
 */
export const DocumentView: React.FC<DocumentViewProps> = React.memo((props) => {
  if (props.editable) {
    return <DocumentViewEditable {...props} />;
  }
  return <DocumentViewReadOnly {...props} />;
});
