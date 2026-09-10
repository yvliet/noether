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

/**
 * Reusable, first-class DocumentView component.
 * Single source of truth for both live reading view and live editing view.
 * Ensures 100% parity with Flint's editor formatting rules without code duplication.
 */
export const DocumentView: React.FC<DocumentViewProps> = React.memo(
  ({
    documentId,
    content,
    isDocBacked = false,
    editable = false,
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

    // Initial content parsed once on mount
    const initialParsedDoc = useMemo(
      () => parseContentToDocAst(content),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    const emitSave = useCallback(
      (editorInstance: any) => {
        if (!editorInstance || editorInstance.isDestroyed || !onChangeRef.current) return;
        try {
          const jsonAst = editorInstance.getJSON();
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
      autofocus: autoFocus ? 'end' : false,
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
            compact ? 'flint-compact-doc-inner' : 'min-h-full flint-standard-doc-inner'
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
              emitSave(editor);
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
              emitSave(editor);
              onBlurRef.current?.();
              return true;
            }
            return false;
          },
          click: (_view, event) => {
            // Wikilink & external link handling in reading mode or non-editable state
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
        emitSave(editor);
        onBlurRef.current?.();
      },
    });

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
        // Entering reading view: remember selection & dispatch livePreviewFocus false
        const { from, to } = editor.state.selection;
        if (from !== undefined && to !== undefined) {
          savedSelectionRef.current = { from, to };
        }
        editor.view.dispatch(editor.state.tr.setMeta('livePreviewFocus', false));
      } else if (wasEditableRef.current === false && editable === true) {
        // Entering editing view: restore caret position and focus
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

    // Flush any pending save on unmount
    useEffect(() => {
      return () => {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
          emitSave(editor);
        }
      };
    }, [editor, emitSave]);

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
        className={`document-view-root w-full h-full overflow-y-auto custom-scrollbar select-text overscroll-contain ${
          compact ? 'flint-compact-doc p-3.5' : 'p-6'
        } ${accentListPrefixes ? 'flint-accent-lists' : ''} ${
          indentationGuides ? 'flint-indent-guides' : ''
        } ${strictLineBreaks ? 'flint-strict-line-breaks' : ''} ${
          showExternalLinkIcon ? 'flint-show-link-icon' : ''
        } ${!editable ? 'tiptap-reading-view cursor-default' : 'cursor-text'} ${className}`}
      >
        {compact && (
          <style>{`
            .flint-compact-doc {
              scrollbar-gutter: auto !important;
            }
            .flint-compact-doc .ProseMirror {
              outline: none !important;
              font-size: 12px !important;
              line-height: 1.625 !important;
              color: #d0d0d0 !important;
              min-height: auto !important;
            }
            .flint-compact-doc .ProseMirror > *:first-child {
              margin-top: 0 !important;
            }
            .flint-compact-doc .ProseMirror > *:last-child {
              margin-bottom: 0 !important;
            }
            .flint-compact-doc .ProseMirror p {
              margin-top: 0.25rem !important;
              margin-bottom: 0.25rem !important;
              line-height: 1.625 !important;
              font-size: 12px !important;
              color: #d0d0d0 !important;
              word-break: break-word !important;
            }
            .flint-compact-doc .ProseMirror h1 {
              font-size: 1rem !important;
              font-weight: 700 !important;
              color: #ffffff !important;
              margin-top: 0.5rem !important;
              margin-bottom: 0.375rem !important;
              line-height: 1.375 !important;
              letter-spacing: -0.025em !important;
            }
            .flint-compact-doc .ProseMirror h2 {
              font-size: 0.875rem !important;
              font-weight: 600 !important;
              color: #f0f0f0 !important;
              margin-top: 0.5rem !important;
              margin-bottom: 0.25rem !important;
              line-height: 1.375 !important;
            }
            .flint-compact-doc .ProseMirror h3 {
              font-size: 0.75rem !important;
              font-weight: 600 !important;
              color: #e0e0e0 !important;
              margin-top: 0.375rem !important;
              margin-bottom: 0.25rem !important;
              line-height: 1.375 !important;
            }
            .flint-compact-doc .ProseMirror ul {
              margin-top: 0.375rem !important;
              margin-bottom: 0.375rem !important;
              padding-left: 1rem !important;
            }
            .flint-compact-doc .ProseMirror ol {
              margin-top: 0.375rem !important;
              margin-bottom: 0.375rem !important;
              padding-left: 1rem !important;
            }
            .flint-compact-doc .ProseMirror li {
              line-height: 1.625 !important;
              font-size: 12px !important;
              color: #d0d0d0 !important;
            }
            .flint-compact-doc .ProseMirror blockquote {
              margin: 0.375rem 0 !important;
              padding-left: 0.625rem !important;
              border-left: 2px solid var(--flint-accent, #ea580c) !important;
              background-color: rgba(234, 88, 12, 0.05) !important;
              font-size: 12px !important;
              color: #bbb !important;
            }
            .flint-compact-doc .ProseMirror code {
              font-family: var(--font-monospace) !important;
              font-size: 11px !important;
              background-color: #161616 !important;
              border: 1px solid #2a2a2a !important;
              border-radius: 3px !important;
              padding: 0.1rem 0.25rem !important;
              color: #e6b450 !important;
            }
            .flint-compact-doc .ProseMirror pre {
              margin: 0.5rem 0 !important;
              border-radius: 4px !important;
              border: 1px solid #2d2d2d !important;
              background-color: #141414 !important;
              padding: 0.5rem !important;
              font-family: var(--font-monospace) !important;
              font-size: 11px !important;
              color: #dcdcdc !important;
              overflow-x: auto !important;
            }
          `}</style>
        )}
        <EditorContent editor={editor} className={compact ? 'w-full' : 'w-full h-full'} />
      </div>
    );
  }
);
