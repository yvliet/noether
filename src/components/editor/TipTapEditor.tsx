import React, { useEffect, useRef, useState, useCallback, useMemo, useImperativeHandle } from 'react';
import { Extension } from '@tiptap/core';
import { TextSelection, Plugin as ProseMirrorPlugin, PluginKey, EditorState } from '@tiptap/pm/state';
import { DecorationSet } from '@tiptap/pm/view';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import type { EditorPluginDefinition, EditorPluginContext } from '@/core/extensions/types';
import type { FlintApp } from '@/core/app/FlintApp';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { TableEdgeControls } from './TableEdgeControls';

import { SlashCommands, SlashItem } from './extensions/slash-command';
import { WikiLinks, WikiLinkItem } from './extensions/wikilink';
import { LivePreviewSyntax } from './extensions/live-preview-syntax';
import { AutoPairing } from './extensions/auto-pairing';
import { MarkdownShortcuts, toggleFormat, isFormatActive, clearFormatting } from './extensions/markdown-shortcuts';
import { SmartMathNavigation } from './extensions/smart-math-navigation';
import { MathChip } from './extensions/math-chip-extension';
import { buildMathInsertSubmenus } from './extensions/math-insert-menu';
import { NumberedListBehavior } from './extensions/numbered-list-behavior';
import { Fold, FoldPluginKey } from './extensions/fold';
import { SearchAndReplace } from './extensions/search-and-replace';
import { SmartTabIndent } from './extensions/smart-tab-indent';
import { TableExitBehavior } from './extensions/table-exit-behavior';
import { transformPastedHtmlToMarkdown } from './paste-markdown';
import { SlashMenu } from './SlashMenu';
import { WikiLinkPopup } from './WikiLinkPopup';
import { MathKeyboard } from './MathKeyboard';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSettingsStore } from '@/store/settingsStore';
import { platform } from '@/lib/platform/platformAdapter';
import { markLinkVisited } from '@/lib/visitedLinks';
import { getDocumentPath } from '@/lib/db/documents';
import { useFlintApp, useExtensionList, usePlaceholderHints } from '@/core/app/AppContext';
import { useAppContextMenu, ContextMenuItem } from '@/components/common/ContextMenu';
import { ColorPicker, InlineColorPicker } from '@/components/common/ColorPicker';
import {
  Heading101Icon,
  Heading201Icon,
  Heading301Icon,
  Heading401Icon,
  Heading501Icon,
  Heading601Icon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  CheckmarkSquare02Icon,
  QuoteDownIcon,
  CodeIcon,
  Divide01Icon,
  Copy01Icon,
  ScissorIcon,
  ClipboardPasteIcon,
  ClipboardTypeIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  HighlighterIcon,
  PlusSignSquareIcon,
  Link01Icon,
  ExternalLinkIcon,
  Search01Icon,
  ParagraphIcon,
  PaintBrush01Icon,
  TextFontIcon,
  SigmaIcon,
  PercentIcon,
  RemoveFormattingIcon,
  Menu01Icon,
  TextFootnoteIcon,
  TextSelectionIcon,
  TextClearIcon,
  TableIcon,
  Database01Icon,
  EyedropperIcon,
  MinusSignIcon,
} from '@/components/common/Icons';

export const HIGHLIGHT_COLOR_PRESETS = [
  { name: 'Yellow', color: '#ffd54f' },
  { name: 'Green', color: '#86efac' },
  { name: 'Cyan', color: '#67e8f9' },
  { name: 'Blue', color: '#93c5fd' },
  { name: 'Purple', color: '#d8b4fe' },
  { name: 'Pink', color: '#f472b6' },
  { name: 'Orange', color: '#fb923c' },
  { name: 'Red', color: '#f87171' },
];

// Slash command items definition
const baseSlashItems: SlashItem[] = [
  {
    title: 'Heading 1',
    description: 'Big section heading',
    icon: 'h1',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'h2',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small subsection heading',
    icon: 'h3',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bulleted list',
    icon: 'bullet',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent('- ').run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: 'number',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent('1. ').run();
    },
  },
  {
    title: 'Task List',
    description: 'Track tasks with checkboxes',
    icon: 'task',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Quote Block',
    description: 'Capture a quotation or callout',
    icon: 'quote',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Code snippet with syntax styling',
    icon: 'code',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Divider',
    description: 'Visual horizontal line',
    icon: 'divider',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'Math Block',
    description: 'Display LaTeX equation block',
    icon: 'quote',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent('$$\n\n$$').setTextSelection(range.from + 3).run();
    },
  },
  {
    title: 'Inline Math',
    description: 'Inline LaTeX formula',
    icon: 'quote',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent('$$').setTextSelection(range.from + 1).run();
    },
  },
  {
    title: 'Link',
    description: 'Insert markdown link [text](url)',
    icon: 'link',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent('[](url)').setTextSelection(range.from + 1).run();
    },
  },
  {
    title: 'WikiLink',
    description: 'Link to another note [[title]]',
    icon: 'link',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent('[[]]').setTextSelection(range.from + 2).run();
    },
  },
  {
    title: 'Embed Note',
    description: 'Embed another note ![[title]]',
    icon: 'quote',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent('![[]]').setTextSelection(range.from + 3).run();
    },
  },
  {
    title: 'Embed Image / Media',
    description: 'Embed image, audio, or video ![alt](url)',
    icon: 'link',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent('![]()').setTextSelection(range.from + 2).run();
    },
  },
];

function extractLinkTargetFromEvent(
  editor: any,
  event: MouseEvent
): { type: 'wikilink' | 'url' | 'tag'; target: string } | null {
  const rawTarget = event.target as Node | null;
  const targetElem = (
    rawTarget && rawTarget.nodeType === Node.ELEMENT_NODE
      ? (rawTarget as HTMLElement)
      : (rawTarget?.parentElement as HTMLElement | null)
  );

  // 0. Ignore clicks inside embeds
  if (targetElem?.closest('.flint-embed-wrapper, .flint-embed-media, .flint-image-embed, [data-embed-action]')) {
    return null;
  }

  // 1. Direct DOM check for .md-wikilink
  const linkElem =
    targetElem?.closest('.md-wikilink') ||
    (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest('.md-wikilink');

  if (linkElem) {
    const targetTitle =
      linkElem.getAttribute('data-wikilink-target') ||
      linkElem.textContent?.trim() ||
      null;
    if (targetTitle) {
      return { type: 'wikilink', target: targetTitle };
    }
  }

  // 1b. Direct DOM check for .md-link
  const mdLinkElem =
    targetElem?.closest('.md-link') ||
    (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest('.md-link');

  if (mdLinkElem) {
    // If the element directly has data-wikilink-target set (e.g. from live preview syntax for [alias]([[target]])),
    // always navigate directly without focused editing lockout.
    const explicitWikiTarget = mdLinkElem.getAttribute('data-wikilink-target');
    if (explicitWikiTarget) {
      return { type: 'wikilink', target: explicitWikiTarget };
    }

    const isFocused = mdLinkElem.classList.contains('is-focused');
    const isModifierClick = event.ctrlKey || event.metaKey || event.button === 1;

    const rawUrl =
      mdLinkElem.getAttribute('data-link-url') ||
      mdLinkElem.getAttribute('href') ||
      null;

    if (rawUrl) {
      const trimmed = rawUrl.trim();
      let wikiTarget: string | null = null;
      if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
        let inner = trimmed.slice(2, -2).trim();
        if (inner.includes('|')) inner = inner.split('|')[0].trim();
        if (inner) wikiTarget = inner;
      } else if (!/^(https?|mailto|ftp|file|data|blob):/i.test(trimmed) && !trimmed.startsWith('#')) {
        const decoded = decodeURIComponent(trimmed).replace(/\.md$/, '').trim();
        if (decoded) wikiTarget = decoded;
      }

      // Internal note link: clicking anywhere on the alias text redirects to the target note immediately
      if (wikiTarget) {
        return { type: 'wikilink', target: wikiTarget };
      }

      // For external URLs:
      // When unfocused (rendered view), clicking directly opens the link.
      // When focused (editing raw syntax), clicking places the cursor for editing unless modifier/middle-click.
      if (!isFocused || isModifierClick) {
        return { type: 'url', target: rawUrl };
      }
    }
    return null;
  }

  // 1c. Direct check for markdown syntax tokens (dimmed or hidden syntax)
  // When editing syntax (e.g. [ or ](url)), normal clicks should place cursor for editing
  const syntaxElem = targetElem?.closest('.md-syntax-dimmed, .md-syntax-hidden');
  if (syntaxElem && !(event.ctrlKey || event.metaKey || event.button === 1)) {
    return null;
  }

  // 2. Direct DOM check for <a> tags
  const anchor =
    targetElem?.closest('a') ||
    (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest('a');
  if (anchor) {
    if (
      anchor.closest('.is-focused, .md-syntax-dimmed, .md-syntax-hidden') &&
      !(event.ctrlKey || event.metaKey || event.button === 1)
    ) {
      return null;
    }
    const href = anchor.getAttribute('href');
    if (href) {
      return { type: 'url', target: href };
    }
  }

  // 3. Direct DOM check for #tags
  const tagElem =
    targetElem?.closest('.md-tag') ||
    (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest('.md-tag');
  if (tagElem) {
    const tagText = tagElem.textContent?.trim();
    if (tagText) {
      return { type: 'tag', target: tagText };
    }
  }

  // 4. Fallback: ProseMirror posAtCoords directly from mouse screen coordinates
  // Only triggered when clicking directly on link text in reading view or with direct cursor hit
  if (editor && editor.view && typeof editor.view.posAtCoords === 'function') {
    try {
      const coords = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
      if (coords && typeof coords.pos === 'number') {
        const $pos = editor.state.doc.resolve(coords.pos);
        const parent = $pos.parent;
        if (parent && parent.isTextblock) {
          const blockStart = $pos.start();
          const text = parent.textContent;
          const offset = coords.pos - blockStart;

          // WikiLinks (excluding embeds ![[...]])
          const wikiRegex = /\[\[([^\]\n]+)\]\]/g;
          let match: RegExpExecArray | null;
          while ((match = wikiRegex.exec(text)) !== null) {
            if (match.index > 0 && text[match.index - 1] === '!') {
              continue; // Skip embeds
            }
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;
            if (offset >= matchStart && offset < matchEnd) {
              let raw = match[1];
              if (raw.includes('|')) {
                raw = raw.split('|')[0];
              }
              const targetTitle = raw.trim();
              if (targetTitle) {
                return { type: 'wikilink', target: targetTitle };
              }
            }
          }

          // Markdown links: [Text](url) (excluding embeds ![...](...))
          const mdLinkRegex = /\[([^\]\n]+)\]\(((?:[^()\n]|\([^()\n]*\))+)\)/g;
          let mdMatch: RegExpExecArray | null;
          while ((mdMatch = mdLinkRegex.exec(text)) !== null) {
            if (mdMatch.index > 0 && text[mdMatch.index - 1] === '!') {
              continue; // Skip image embeds
            }
            const mStart = mdMatch.index;
            const mEnd = mStart + mdMatch[0].length;
            if (offset >= mStart && offset < mEnd) {
              const url = mdMatch[2].trim();
              if (url) {
                let wikiTarget: string | null = null;
                if (url.startsWith('[[') && url.endsWith(']]')) {
                  let inner = url.slice(2, -2).trim();
                  if (inner.includes('|')) inner = inner.split('|')[0].trim();
                  if (inner) wikiTarget = inner;
                } else if (!/^(https?|mailto|ftp|file|data|blob):/i.test(url) && !url.startsWith('#')) {
                  const decoded = decodeURIComponent(url).replace(/\.md$/, '').trim();
                  if (decoded) wikiTarget = decoded;
                }
                if (wikiTarget) {
                  return { type: 'wikilink', target: wikiTarget };
                }
                return { type: 'url', target: url };
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  return null;
}

const HighlightColorSwatch: React.FC = React.memo(() => {
  const highlightColor = useSettingsStore((s) => s.highlightColor) || '#ffd54f';
  return (
    <span
      className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-[0_1px_2px_rgba(0,0,0,0.45)] cursor-pointer transition-transform hover:scale-125 active:scale-95 flex items-center justify-center p-0 shrink-0"
      style={{ backgroundColor: highlightColor }}
      title={`Highlight color: ${highlightColor}`}
    />
  );
});

const HighlightSubmenuContent: React.FC<{
  applyHighlight: (color: string) => void;
}> = React.memo(({ applyHighlight }) => {
  const highlightColor = useSettingsStore((s) => s.highlightColor) || '#ffd54f';
  const setHighlightColor = useSettingsStore((s) => s.setHighlightColor);
  const addColorHistory = useSettingsStore((s) => s.addColorHistory);

  return (
    <InlineColorPicker
      value={highlightColor}
      onChange={(newColor) => {
        setHighlightColor(newColor);
        addColorHistory(newColor);
        applyHighlight(newColor);
      }}
    />
  );
});

export interface EditorSuggestionPopupsRef {
  setSlashMenuProps: (props: SlashMenuPropsState | null | ((prev: SlashMenuPropsState | null) => SlashMenuPropsState | null)) => void;
  setWikiProps: (props: WikiPropsState | null | ((prev: WikiPropsState | null) => WikiPropsState | null)) => void;
  closeAll: () => void;
}

export type SlashMenuPropsState = {
  items: SlashItem[];
  command: (item: SlashItem, extra?: any) => void;
  rect: DOMRect | null;
};

export type WikiPropsState = {
  items: WikiLinkItem[];
  command: (item: WikiLinkItem) => void;
  rect: DOMRect | null;
};

function getSmartFloatingStyle(rect: DOMRect | null, estimatedWidth: number, estimatedHeight: number, gap: number = 6): React.CSSProperties {
  if (!rect) return { display: 'none' };
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const margin = 12;

  const spaceBelow = vh - rect.bottom - gap - margin;
  const spaceAbove = rect.top - gap - margin;

  let left = rect.left;
  if (left + estimatedWidth > vw - margin) {
    left = Math.max(margin, vw - estimatedWidth - margin);
  }
  if (left < margin) {
    left = margin;
  }

  if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
    const bottom = vh - rect.top + gap;
    const maxHeight = Math.max(120, Math.min(estimatedHeight, spaceAbove));
    return {
      position: 'fixed',
      left: `${left}px`,
      bottom: `${bottom}px`,
      maxHeight: `${maxHeight}px`,
      zIndex: 50,
    };
  } else {
    const top = rect.bottom + gap;
    const maxHeight = Math.max(120, Math.min(estimatedHeight, spaceBelow));
    return {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      maxHeight: `${maxHeight}px`,
      zIndex: 50,
    };
  }
}

interface EditorSuggestionPopupsProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  slashMenuRef: React.RefObject<any>;
  wikiPopupRef: React.RefObject<any>;
}

const EditorSuggestionPopups = React.memo(
  React.forwardRef<EditorSuggestionPopupsRef, EditorSuggestionPopupsProps>(
    ({ containerRef, slashMenuRef, wikiPopupRef }, ref) => {
      const [slashMenuProps, setSlashMenuProps] = useState<SlashMenuPropsState | null>(null);
      const [wikiProps, setWikiProps] = useState<WikiPropsState | null>(null);

      useImperativeHandle(
        ref,
        () => ({
          setSlashMenuProps,
          setWikiProps,
          closeAll: () => {
            setSlashMenuProps(null);
            setWikiProps(null);
          },
        }),
        []
      );

      const isAnyOpen = Boolean(slashMenuProps || wikiProps);

      useEffect(() => {
        if (!isAnyOpen) return;

        const handlePointerDown = (e: MouseEvent) => {
          const target = e.target as Node | null;
          if (containerRef.current && target && containerRef.current.contains(target)) {
            return;
          }
          setSlashMenuProps(null);
          setWikiProps(null);
        };

        const handleScroll = (e: Event) => {
          const target = e.target as HTMLElement | null;
          if (target && target.closest?.('[data-flint-suggestion-popup="true"]')) {
            return;
          }
          setSlashMenuProps(null);
          setWikiProps(null);
        };

        window.addEventListener('mousedown', handlePointerDown, true);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
          window.removeEventListener('mousedown', handlePointerDown, true);
          window.removeEventListener('scroll', handleScroll, true);
        };
      }, [isAnyOpen, containerRef]);

      return (
        <>
          {slashMenuProps && slashMenuProps.rect && (
            <div style={getSmartFloatingStyle(slashMenuProps.rect, 300, 340, 6)}>
              <SlashMenu
                ref={slashMenuRef}
                items={slashMenuProps.items}
                command={slashMenuProps.command}
              />
            </div>
          )}

          {wikiProps && wikiProps.rect && (
            <div style={getSmartFloatingStyle(wikiProps.rect, 270, 300, 6)}>
              <WikiLinkPopup
                ref={wikiPopupRef}
                items={wikiProps.items}
                command={wikiProps.command}
              />
            </div>
          )}
        </>
      );
    }
  )
);
function computeCommunityDecorations(
  plugins: EditorPluginDefinition[],
  state: EditorState,
  ctx: EditorPluginContext,
  mappedSet?: DecorationSet
): DecorationSet {
  let combinedSet = mappedSet ?? DecorationSet.empty;

  for (const p of plugins) {
    if (p.decorations) {
      try {
        const result = p.decorations(state, ctx);
        if (result) {
          combinedSet = combinedSet.add(state.doc, result.find());
        }
      } catch (err) {
        console.error(`[FlintCommunityEditorBridge] Error computing decorations for "${p.id}":`, err);
      }
    }
  }

  return combinedSet;
}

const createCommunityEditorBridge = (app: FlintApp, documentId?: string) => {
  const docId = documentId || '';
  return Extension.create({
    name: 'flintCommunityEditorBridge',

    addProseMirrorPlugins() {
      const plugins = app.editor.getEditorPlugins();
      const pmPlugins: ProseMirrorPlugin[] = [];
      const ctx: EditorPluginContext = {
        app,
        documentId: docId,
        editor: this.editor,
      };

      for (const p of plugins) {
        if (p.proseMirrorPlugins) {
          try {
            const returned = p.proseMirrorPlugins(ctx);
            if (Array.isArray(returned)) {
              pmPlugins.push(...returned);
            }
          } catch (err) {
            console.error(`[FlintCommunityEditorBridge] Error initializing ProseMirror plugins for "${p.id}":`, err);
          }
        }
      }

      // High-performance transaction mapping decoration plugin for sub-8ms typing latency
      const decorationPlugin = new ProseMirrorPlugin({
        key: new PluginKey('flint_community_decorations'),
        state: {
          init(_, state) {
            return computeCommunityDecorations(plugins, state, ctx);
          },
          apply(tr, oldDecoSet, _oldState, newState) {
            if (!tr.docChanged) {
              return oldDecoSet;
            }
            const mapped = oldDecoSet.map(tr.mapping, tr.doc);
            return computeCommunityDecorations(plugins, newState, ctx, mapped);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      });

      pmPlugins.push(decorationPlugin);
      return pmPlugins;
    },

    addInputRules() {
      const plugins = app.editor.getEditorPlugins();
      const inputRules: any[] = [];
      const ctx: EditorPluginContext = {
        app,
        documentId: docId,
        editor: this.editor,
      };

      for (const p of plugins) {
        if (p.inputRules) {
          try {
            const rules = p.inputRules(ctx);
            if (Array.isArray(rules)) {
              inputRules.push(...rules);
            }
          } catch (err) {
            console.error(`[FlintCommunityEditorBridge] Error initializing input rules for "${p.id}":`, err);
          }
        }
      }
      return inputRules;
    },

    addPasteRules() {
      const plugins = app.editor.getEditorPlugins();
      const pasteRules: any[] = [];
      const ctx: EditorPluginContext = {
        app,
        documentId: docId,
        editor: this.editor,
      };

      for (const p of plugins) {
        if (p.pasteRules) {
          try {
            const rules = p.pasteRules(ctx);
            if (Array.isArray(rules)) {
              pasteRules.push(...rules);
            }
          } catch (err) {
            console.error(`[FlintCommunityEditorBridge] Error initializing paste rules for "${p.id}":`, err);
          }
        }
      }
      return pasteRules;
    },

    addKeyboardShortcuts() {
      const plugins = app.editor.getEditorPlugins();
      const shortcuts: Record<string, () => boolean> = {};

      for (const p of plugins) {
        if (p.keyboardShortcuts) {
          for (const [key, handler] of Object.entries(p.keyboardShortcuts)) {
            shortcuts[key] = () => {
              try {
                return handler({ editor: this.editor, event: window.event as KeyboardEvent });
              } catch (err) {
                console.error(`[FlintCommunityEditorBridge] Error in shortcut "${key}" for "${p.id}":`, err);
                return false;
              }
            };
          }
        }
      }
      return shortcuts;
    },
  });
};

interface TipTapEditorProps {
  documentId?: string;
  content: string;
  editable?: boolean;
  onChange: (jsonString: string) => void;
  onSave?: () => void;
  onEditorReady?: (editor: any) => void;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = React.memo(({
  documentId,
  content,
  editable = true,
  onChange,
  onEditorReady,
}) => {
  const app = useFlintApp();
  const extensionList = useExtensionList();
  const placeholderHints = usePlaceholderHints();
  const createNewNote = useDocumentStore((s) => s.createNewNote);
  const setActiveDocumentById = useDocumentStore((s) => s.setActiveDocumentById);

  // Floating suggestion popups ref (avoids re-rendering TipTapEditor on suggestion keystrokes)
  const suggestionPopupsRef = useRef<EditorSuggestionPopupsRef>(null);

  const [isMathKeyboardOpen, setIsMathKeyboardOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const slashMenuRef = useRef<any>(null);
  const wikiPopupRef = useRef<any>(null);
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const lastEmittedJsonRef = useRef<string | null>(null);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInternalUpdateRef = useRef(false);
  const wasEditableRef = useRef(editable);
  const handleContextMenuRef = useRef<((e: MouseEvent) => void) | null>(null);
  const { showContextMenu } = useAppContextMenu();
  const showToast = useWorkspaceStore((s) => s.showToast);

  // Merge extension slash commands with base items, deduplicating by lowercase title
  const extensionSlashCommands = useMemo(() => app.editor.getSlashCommands(), [app.editor, extensionList]);
  const slashItems: SlashItem[] = useMemo(() => {
    const map = new Map<string, SlashItem>();
    for (const item of baseSlashItems) {
      map.set(item.title.toLowerCase(), item);
    }
    for (const p of extensionSlashCommands) {
      map.set(p.title.toLowerCase(), {
        title: p.title,
        description: p.description,
        icon: typeof p.icon === 'string' ? (p.icon as any) : p.icon,
        command: p.command,
      });
    }
    return Array.from(map.values());
  }, [extensionSlashCommands]);

  const handleNavigateToWikiLink = useCallback(
    (rawTarget: string, isSplit: boolean = false) => {
      let targetTitle = rawTarget;
      if (targetTitle.includes('|')) {
        targetTitle = targetTitle.split('|')[0];
      }
      targetTitle = targetTitle.replace(/^\[+|\]+$/g, '').trim();
      if (!targetTitle) return;

      let notePart = targetTitle;
      let headingPart: string | null = null;
      if (targetTitle.includes('#')) {
        const parts = targetTitle.split('#');
        notePart = parts[0].trim();
        headingPart = parts.slice(1).join('#').trim();
      }

      const ws = useWorkspaceStore.getState();
      const ds = useDocumentStore.getState();
      const allDocs = ds.documents;

      if (!notePart && headingPart && editor) {
        // Scroll to heading in the current note
        const headingDoms = Array.from(
          editor.view.dom.querySelectorAll('h1, h2, h3, h4, h5, h6')
        ) as HTMLElement[];
        const targetDom = headingDoms.find((h) =>
          h.innerText.toLowerCase().includes(headingPart!.toLowerCase())
        );
        if (targetDom) {
          targetDom.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      if (!notePart || !notePart.trim()) {
        return;
      }

      const cleanTarget = notePart.trim().toLowerCase();
      const cleanWithoutExt = cleanTarget.replace(/\.md$/, '');
      const targetBaseName = cleanWithoutExt.split('/').pop() || cleanWithoutExt;

      const matchedDoc = allDocs.find((d) => {
        if (d.is_folder) return false;
        const titleLower = d.title.toLowerCase();
        return (
          titleLower === cleanTarget ||
          titleLower === cleanWithoutExt ||
          titleLower === targetBaseName ||
          `${titleLower}.md` === cleanTarget
        );
      });

      const shouldSplit = isSplit || (ws.isSplitView && ws.activePane === 'split');

      if (matchedDoc) {
        if (shouldSplit) {
          ws.openSplitTab(matchedDoc.id, matchedDoc.title);
        } else {
          ws.openTab(matchedDoc.id, matchedDoc.title);
          ds.setActiveDocumentById(matchedDoc.id);
        }
        ws.setMainViewMode('document');
      } else {
        ds.createNewNote(notePart, null, 'base', false).then((newDoc) => {
          if (newDoc) {
            if (shouldSplit) {
              ws.openSplitTab(newDoc.id, newDoc.title);
            } else {
              ws.openTab(newDoc.id, newDoc.title);
              ds.setActiveDocumentById(newDoc.id);
            }
            ws.setMainViewMode('document');
          }
        });
      }
    },
    []
  );

  const editor = useEditor({
    editable,
    onBlur: ({ event }) => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
        if (editor && !editor.isDestroyed) {
          try {
            const jsonStr = JSON.stringify(editor.getJSON());
            if (jsonStr !== lastEmittedJsonRef.current) {
              isInternalUpdateRef.current = true;
              lastEmittedJsonRef.current = jsonStr;
              onChange(jsonStr);
            }
          } catch (e) {}
        }
      }
      // Retain popup if focus moved to something inside this editor container (or popup)
      const related = (event as FocusEvent)?.relatedTarget as Node | null;
      if (related && containerRef.current?.contains(related)) {
        return;
      }
      suggestionPopupsRef.current?.closeAll();
    },
    extensions: [
      createCommunityEditorBridge(app, documentId),
      ...app.editor.getExtensions(),
      SlashCommands.configure({
        suggestion: {
          allow: ({ editor }) => {
            return editor.isFocused || editor.view.hasFocus();
          },
          items: ({ query }) => {
            return slashItems.filter(
              (item) =>
                item.title.toLowerCase().includes(query.toLowerCase()) ||
                item.description.toLowerCase().includes(query.toLowerCase())
            );
          },
          render: () => {
            return {
              onStart: (props: any) => {
                const rect = props.clientRect?.();
                suggestionPopupsRef.current?.setSlashMenuProps({
                  items: props.items,
                  command: (item: SlashItem, extra?: any) => {
                    props.command({ ...item, ...extra });
                  },
                  rect: rect || null,
                });
              },
              onUpdate: (props: any) => {
                suggestionPopupsRef.current?.setSlashMenuProps((prev) =>
                  prev
                    ? {
                        ...prev,
                        items: props.items,
                        command: (item: SlashItem, extra?: any) => {
                          props.command({ ...item, ...extra });
                        },
                        rect: prev.rect || props.clientRect?.() || null,
                      }
                    : null
                );
              },
              onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                  suggestionPopupsRef.current?.setSlashMenuProps(null);
                  return true;
                }
                return slashMenuRef.current?.onKeyDown(props) || false;
              },
              onExit: () => {
                suggestionPopupsRef.current?.setSlashMenuProps(null);
              },
            };
          },
        },
      }),
      WikiLinks.configure({
        suggestion: {
          allow: ({ editor }) => {
            return editor.isFocused || editor.view.hasFocus();
          },
          items: ({ query }) => {
            if (query.includes(']') || query.includes('[')) return [];
            const currentDocs = useDocumentStore.getState().documents;
            const q = query.trim().toLowerCase();
            const matches: WikiLinkItem[] = [];

            if (!q) {
              // When query is empty (initial [[ typing), grab top 30 documents directly with early exit
              for (let i = 0; i < currentDocs.length && matches.length < 30; i++) {
                const d = currentDocs[i];
                if (!d.is_folder) {
                  matches.push({ id: d.id, title: d.title });
                }
              }
              return matches;
            }

            // When query is provided, find matching documents up to limit
            for (let i = 0; i < currentDocs.length && matches.length < 30; i++) {
              const d = currentDocs[i];
              if (!d.is_folder && d.title.toLowerCase().includes(q)) {
                matches.push({ id: d.id, title: d.title });
              }
            }

            if (query.trim() && !matches.some((m) => m.title.toLowerCase() === q)) {
              matches.unshift({
                id: `new-${query.trim()}`,
                title: query.trim(),
                isNew: true,
              });
            }
            return matches.slice(0, 30);
          },
          render: () => {
            return {
              onStart: (props: any) => {
                const rect = props.clientRect?.();
                suggestionPopupsRef.current?.setWikiProps({
                  items: props.items,
                  command: async (item: WikiLinkItem) => {
                    if (item.isNew) {
                      if (!item.title || !item.title.trim()) return;
                      const newDoc = await createNewNote(item.title.trim(), null, 'base', false);
                      if (newDoc) {
                        props.command({ title: newDoc.title, id: newDoc.id });
                      }
                    } else {
                      props.command(item);
                    }
                  },
                  rect: rect || null,
                });
              },
              onUpdate: (props: any) => {
                suggestionPopupsRef.current?.setWikiProps((prev) =>
                  prev
                    ? {
                        ...prev,
                        items: props.items,
                        command: async (item: WikiLinkItem) => {
                          if (item.isNew) {
                            if (!item.title || !item.title.trim()) return;
                            const newDoc = await createNewNote(item.title.trim(), null, 'base', false);
                            if (newDoc) {
                              props.command({ title: newDoc.title, id: newDoc.id });
                            }
                          } else {
                            props.command(item);
                          }
                        },
                        rect: prev.rect || props.clientRect?.() || null,
                      }
                    : null
                );
              },
              onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                  suggestionPopupsRef.current?.setWikiProps(null);
                  return true;
                }
                return wikiPopupRef.current?.onKeyDown(props) || false;
              },
              onExit: () => {
                suggestionPopupsRef.current?.setWikiProps(null);
              },
            };
          },
        },
      }),
      MarkdownShortcuts,
      AutoPairing,
      SmartTabIndent,
      NumberedListBehavior,
      Fold.configure({ documentId }),
      LivePreviewSyntax,
      MathChip,
      SmartMathNavigation,
      SearchAndReplace,
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Enable hardBreak so that Shift-Enter inserts inline <br> breaks with normal line-height
        // instead of splitting blocks into new paragraphs (which have 0.5rem paragraph margins).
        hardBreak: {
          keepMarks: true,
        },
        history: {
          depth: 50,
          newGroupDelay: 500,
        },
        bold: false,
        italic: false,
        strike: false,
        code: false,
        orderedList: false,
        bulletList: false,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return `Heading ${node.attrs.level || 1}`;
          }
          const baseHints = ["type '/' for commands", "'[[' to link"];
          const dynamicHints = placeholderHints.map((h) => h.hint);
          const allHints = [...baseHints, ...dynamicHints];
          if (allHints.length === 0) return 'Write thoughts...';
          if (allHints.length === 1) return `Write thoughts, or ${allHints[0]}...`;
          const last = allHints[allHints.length - 1];
          const lead = allHints.slice(0, -1).join(', ');
          return `Write thoughts, ${lead}, or ${last}...`;
        },
        emptyEditorClass: 'is-editor-empty',
      }),
      Typography,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'flint-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TableExitBehavior,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
    ],
    content: (() => {
      if (!content || content === '{}') {
        return {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [],
            },
          ],
        };
      }
      try {
        return typeof content === 'string' ? JSON.parse(content) : content;
      } catch (e) {
        return {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [],
            },
          ],
        };
      }
    })(),
    editorProps: {
      attributes: {
        class: `prose prose-invert max-w-none focus:outline-none flex-1 min-h-[60px] text-[#dcddde] leading-relaxed select-text ${
          editable ? 'cursor-text' : 'cursor-default'
        }`,
        spellcheck: useSettingsStore.getState().spellcheck ? 'true' : 'false',
      },
      handleDOMEvents: {
        mousedown: (view, event) => {
          const me = event as MouseEvent;
          if (me.button !== 0 && me.button !== 1) return false;

          // Open image lightbox immediately on single click
          const target = me.target as HTMLElement | null;
          const imgEl = target?.closest('img.flint-media-image, .flint-image-embed img') as HTMLImageElement | null;
          if (imgEl && imgEl.src && me.button === 0) {
            me.preventDefault();
            me.stopPropagation();
            useWorkspaceStore.getState().openImageLightbox(imgEl.src, imgEl.alt || '');
            return true;
          }

          const info = extractLinkTargetFromEvent(editor, me);
          if (info) {
            me.preventDefault();
            return true;
          }
          return false;
        },
        contextmenu: (view, event) => {
          if (handleContextMenuRef.current) {
            handleContextMenuRef.current(event as MouseEvent);
            event.preventDefault();
            return true;
          }
          return false;
        },
      },
      transformPastedHTML: (html) => {
        return transformPastedHtmlToMarkdown(html);
      },
      transformPastedText: (text) => {
        return text.replace(/\u00a0/g, ' ');
      },
      handlePaste: (view, event) => {
        // 1. Check for image files in clipboard
        const clipboardItems = event.clipboardData?.items;
        if (clipboardItems) {
          for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            if (item.type.indexOf('image') !== -1) {
              const file = item.getAsFile();
              if (file) {
                event.preventDefault();

                const reader = new FileReader();
                reader.onload = async () => {
                  const dataUrl = reader.result as string;
                  const ds = useDocumentStore.getState();
                  const ss = useSettingsStore.getState();
                  const ws = useWorkspaceStore.getState();

                  const pad = (n: number) => n.toString().padStart(2, '0');
                  const now = new Date();
                  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
                  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/gif' ? 'gif' : file.type === 'image/webp' ? 'webp' : 'png';
                  const filename = `Pasted image ${dateStr}.${ext}`;

                  // Determine target folder by matching the configured path
                  // against each folder's computed document path (title chain).
                  // Why path match: promptFolderSelection stores the full path
                  // (e.g. "Parent/Attachments") via getDocumentPath(), not just
                  // the folder title. Matching only by title fails for nested
                  // folders and the fallback would create a new folder with the
                  // literal path string as its name.
                  let targetParentId: string | null = null;
                  const configuredFolder = ss.attachmentFolder?.trim().toLowerCase();
                  if (configuredFolder) {
                    const docs = ds.documents;
                    const existingFolder = docs.find(
                      (d) =>
                        d.is_folder &&
                        (d.title.toLowerCase() === configuredFolder ||
                          getDocumentPath(d, docs).toLowerCase() === configuredFolder ||
                          d.id === configuredFolder)
                    );
                    if (existingFolder) {
                      targetParentId = existingFolder.id;
                    }
                  }

                  // Save attachment file document
                  const savedDoc = await ds.saveAttachmentDocument(filename, dataUrl, targetParentId);

                  // Insert embed syntax into editor
                  const { state } = view;
                  const { selection } = state;
                  const embedSyntax = `![[${savedDoc.title}]]`;
                  const tr = state.tr.replaceWith(
                    selection.from,
                    selection.to,
                    state.schema.text(embedSyntax)
                  );
                  view.dispatch(tr);
                  ws.showToast(`Pasted ${savedDoc.title}`, 'success');
                };
                reader.readAsDataURL(file);
                return true;
              }
            }
          }
        }

        // 2. Text URL auto-link handling
        const text = event.clipboardData?.getData('text/plain')?.trim();
        if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('mailto:'))) {
          const { state } = view;
          const { selection } = state;
          if (!selection.empty) {
            const selText = state.doc.textBetween(selection.from, selection.to);
            if (selText && !selText.startsWith('[') && !selText.includes('\n')) {
              event.preventDefault();
              const tr = state.tr.replaceWith(
                selection.from,
                selection.to,
                state.schema.text(`[${selText}](${text})`)
              );
              view.dispatch(tr);
              return true;
            }
          }
        }
        return false;
      },
      handleClick: (view, pos, event) => {
        // Suppress link navigation if there is an active text selection or dragged range
        const domSelection = window.getSelection();
        if (domSelection && !domSelection.isCollapsed && domSelection.toString().length > 0) {
          return false;
        }
        if (editor?.state && !editor.state.selection.empty) {
          return false;
        }

        const info = extractLinkTargetFromEvent(editor, event as MouseEvent);
        if (info) {
          const rawTarget = (event.target as HTMLElement)?.closest('.md-link, .md-wikilink, a');
          if (rawTarget) {
            rawTarget.classList.add('is-visited');
            rawTarget.setAttribute('data-visited', 'true');
          }
          const isSplit = event.ctrlKey || event.metaKey || event.button === 1;
          if (info.type === 'wikilink') {
            markLinkVisited(info.target);
            handleNavigateToWikiLink(info.target, isSplit);
            return true;
          } else if (info.type === 'url') {
            markLinkVisited(info.target);
            platform.openUrl(info.target);
            return true;
          } else if (info.type === 'tag') {
            const ws = useWorkspaceStore.getState();
            const ds = useDocumentStore.getState();
            ws.setActiveLeftView('search');
            ws.setIsLeftSidebarOpen(true);
            ds.setSearchQuery(
              info.target.startsWith('#') ? info.target : `#${info.target}`
            );
            return true;
          }
        }
        return false;
      },
    },
    onSelectionUpdate: ({ editor }) => {
      if (editor.isEditable) {
        const { from, to } = editor.state.selection;
        savedSelectionRef.current = { from, to };
      }
    },
    onUpdate: ({ editor }) => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      updateTimerRef.current = setTimeout(() => {
        updateTimerRef.current = null;
        if (!editor || editor.isDestroyed) return;
        isInternalUpdateRef.current = true;
        const jsonStr = JSON.stringify(editor.getJSON());
        lastEmittedJsonRef.current = jsonStr;
        onChange(jsonStr);
      }, 150);
    },
  });

  const handleEditorContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!editor) return;

      // Detect if user right-clicked in the line numbers gutter or dead space
      const targetEl = e.target as HTMLElement | null;
      const proseMirrorEl = containerRef.current?.querySelector('.ProseMirror') as HTMLElement | null;

      let isGutterOrDeadSpace = false;
      if (targetEl && containerRef.current && (targetEl === containerRef.current || targetEl.classList.contains('tiptap'))) {
        isGutterOrDeadSpace = true;
      } else if (proseMirrorEl) {
        const pmRect = proseMirrorEl.getBoundingClientRect();
        const lineNumbersActive = useSettingsStore.getState().lineNumbers;
        // Gutter area is inside ProseMirror left padding (3.25rem ~ 52px)
        if (lineNumbersActive && 'clientX' in e && e.clientX < pmRect.left + 52) {
          isGutterOrDeadSpace = true;
        } else if (targetEl === proseMirrorEl) {
          // Clicked directly on ProseMirror container in empty area below blocks
          isGutterOrDeadSpace = true;
        }
      }

      if (isGutterOrDeadSpace) {
        // Return without preventing default or stopping propagation so event bubbles to EditorCanvas dead space context menu handler
        return;
      }

      const { state } = editor;
      const { from, to, empty } = state.selection;
      const selectedText = empty ? '' : state.doc.textBetween(from, to, ' ');

      const items: ContextMenuItem[] = [];

      const targetSelection = { from, to };
      const restoreSelection = () => {
        const chain = editor.chain().focus();
        if (targetSelection && targetSelection.from !== undefined && targetSelection.to !== undefined) {
          const maxPos = editor.state.doc.content.size;
          chain.setTextSelection({
            from: Math.min(targetSelection.from, maxPos),
            to: Math.min(targetSelection.to, maxPos),
          });
        }
        chain.run();
      };

      const applyHighlight = (color?: string) => {
        const targetColor = color || useSettingsStore.getState().highlightColor || '#ffd54f';
        restoreSelection();
        if (editor.isActive('highlight', { color: targetColor })) {
          editor.chain().focus().unsetHighlight().run();
        } else {
          editor.chain().focus().setHighlight({ color: targetColor }).run();
        }
      };

      // 1. Links & Search Actions
      if (editable) {
        items.push({
          id: 'add-link',
          title: 'Add link',
          icon: <Link01Icon size={14} />,
          onClick: () => {
            restoreSelection();
            if (!empty && selectedText) {
              editor.chain().focus().insertContent(`[[${selectedText}]]`).run();
            } else {
              editor.chain().focus().insertContent('[[]]').run();
            }
          },
        });

        items.push({
          id: 'add-external-link',
          title: 'Add external link',
          icon: <ExternalLinkIcon size={14} />,
          onClick: () => {
            restoreSelection();
            if (!empty && selectedText) {
              editor.chain().focus().insertContent(`[${selectedText}](https://)`).run();
            } else {
              editor.chain().focus().insertContent('[](https://)').run();
            }
          },
        });
      }

      // Search for selection
      if (!empty && selectedText.trim()) {
        if (items.length > 0) items.push({ type: 'separator' });
        const trimmed = selectedText.trim();
        const displaySearchText = trimmed.length > 18 ? trimmed.slice(0, 18) + '…' : trimmed;
        items.push({
          id: 'search-text',
          title: `Search for "${displaySearchText}"`,
          icon: <Search01Icon size={14} />,
          onClick: () => {
            const ws = useWorkspaceStore.getState();
            const ds = useDocumentStore.getState();
            ws.setActiveLeftView('search');
            ws.setIsLeftSidebarOpen(true);
            ds.setSearchQuery(trimmed);
          },
        });
      }

      // 2. Rich Submenus (Format, Paragraph, Insert)
      if (editable) {
        if (items.length > 0) items.push({ type: 'separator' });

        // Format Submenu
        items.push({
          id: 'menu-format',
          title: 'Format',
          icon: <TextFontIcon size={14} />,
          submenu: [
            {
              id: 'fmt-bold',
              title: 'Bold',
              shortcut: 'Ctrl+B',
              icon: <TextBoldIcon size={14} />,
              checked: isFormatActive(editor, '**'),
              onClick: () => {
                restoreSelection();
                toggleFormat(editor, '**');
              },
            },
            {
              id: 'fmt-italic',
              title: 'Italic',
              shortcut: 'Ctrl+I',
              icon: <TextItalicIcon size={14} />,
              checked: isFormatActive(editor, '*'),
              onClick: () => {
                restoreSelection();
                toggleFormat(editor, '*');
              },
            },
            {
              id: 'fmt-strike',
              title: 'Strikethrough',
              shortcut: 'Ctrl+Shift+X',
              icon: <TextStrikethroughIcon size={14} />,
              checked: isFormatActive(editor, '~~'),
              onClick: () => {
                restoreSelection();
                toggleFormat(editor, '~~');
              },
            },
            {
              id: 'fmt-highlight',
              title: 'Highlight',
              shortcut: 'Ctrl+Shift+H',
              icon: <HighlighterIcon size={14} />,
              checked: isFormatActive(editor, '==') || editor.isActive('highlight'),
              onClick: () => {
                restoreSelection();
                toggleFormat(editor, '==');
              },
            },
            { type: 'separator' },
            {
              id: 'fmt-code',
              title: 'Code',
              shortcut: 'Ctrl+E',
              icon: <CodeIcon size={14} />,
              checked: isFormatActive(editor, '`'),
              onClick: () => {
                restoreSelection();
                toggleFormat(editor, '`');
              },
            },
            {
              id: 'fmt-math',
              title: 'Math',
              shortcut: 'Ctrl+Shift+4',
              icon: <SigmaIcon size={14} />,
              checked: isFormatActive(editor, '$'),
              onClick: () => {
                restoreSelection();
                toggleFormat(editor, '$');
              },
            },
            {
              id: 'fmt-comment',
              title: 'Comment',
              icon: <PercentIcon size={14} />,
              checked: isFormatActive(editor, '%%'),
              onClick: () => {
                restoreSelection();
                toggleFormat(editor, '%%');
              },
            },
            { type: 'separator' },
            {
              id: 'fmt-clear',
              title: 'Clear formatting',
              icon: <RemoveFormattingIcon size={14} />,
              onClick: () => {
                restoreSelection();
                clearFormatting(editor);
              },
            },
          ],
        });

        // Paragraph Submenu
        items.push({
          id: 'menu-paragraph',
          title: 'Paragraph',
          icon: <ParagraphIcon size={14} />,
          submenu: [
            {
              id: 'para-bullet',
              title: 'Bullet list',
              icon: <LeftToRightListBulletIcon size={14} />,
              checked: editor.isActive('bulletList'),
              onClick: () => {
                editor.chain().focus().toggleBulletList().run();
              },
            },
            {
              id: 'para-number',
              title: 'Numbered list',
              icon: <LeftToRightListNumberIcon size={14} />,
              checked: editor.isActive('orderedList'),
              onClick: () => {
                editor.chain().focus().toggleOrderedList().run();
              },
            },
            {
              id: 'para-task',
              title: 'Task list',
              icon: <CheckmarkSquare02Icon size={14} />,
              checked: editor.isActive('taskList'),
              onClick: () => {
                editor.chain().focus().toggleTaskList().run();
              },
            },
            { type: 'separator' },
            {
              id: 'para-h1',
              title: 'Heading 1',
              icon: <Heading101Icon size={14} />,
              checked: editor.isActive('heading', { level: 1 }),
              onClick: () => {
                editor.chain().focus().setNode('heading', { level: 1 }).run();
              },
            },
            {
              id: 'para-h2',
              title: 'Heading 2',
              icon: <Heading201Icon size={14} />,
              checked: editor.isActive('heading', { level: 2 }),
              onClick: () => {
                editor.chain().focus().setNode('heading', { level: 2 }).run();
              },
            },
            {
              id: 'para-h3',
              title: 'Heading 3',
              icon: <Heading301Icon size={14} />,
              checked: editor.isActive('heading', { level: 3 }),
              onClick: () => {
                editor.chain().focus().setNode('heading', { level: 3 }).run();
              },
            },
            {
              id: 'para-h4',
              title: 'Heading 4',
              icon: <Heading401Icon size={14} />,
              checked: editor.isActive('heading', { level: 4 }),
              onClick: () => {
                editor.chain().focus().setNode('heading', { level: 4 }).run();
              },
            },
            {
              id: 'para-h5',
              title: 'Heading 5',
              icon: <Heading501Icon size={14} />,
              checked: editor.isActive('heading', { level: 5 }),
              onClick: () => {
                editor.chain().focus().setNode('heading', { level: 5 }).run();
              },
            },
            {
              id: 'para-h6',
              title: 'Heading 6',
              icon: <Heading601Icon size={14} />,
              checked: editor.isActive('heading', { level: 6 }),
              onClick: () => {
                editor.chain().focus().setNode('heading', { level: 6 }).run();
              },
            },
            {
              id: 'para-body',
              title: 'Body',
              icon: <Menu01Icon size={14} />,
              checked:
                editor.isActive('paragraph') &&
                !editor.isActive('heading') &&
                !editor.isActive('bulletList') &&
                !editor.isActive('orderedList') &&
                !editor.isActive('taskList') &&
                !editor.isActive('blockquote'),
              onClick: () => {
                editor.chain().focus().setParagraph().run();
              },
            },
            { type: 'separator' },
            {
              id: 'para-quote',
              title: 'Quote',
              icon: <QuoteDownIcon size={14} />,
              checked: editor.isActive('blockquote'),
              onClick: () => {
                editor.chain().focus().toggleBlockquote().run();
              },
            },
          ],
        });

        // Insert Submenu
        items.push({
          id: 'menu-insert',
          title: 'Insert',
          icon: <PlusSignSquareIcon size={14} />,
          submenu: [
            {
              id: 'ins-footnote',
              title: 'Footnote',
              icon: <TextFootnoteIcon size={14} />,
              onClick: () => {
                editor.chain().focus().insertContent('[^1]').run();
              },
            },
            {
              id: 'ins-table',
              title: 'Table',
              icon: <TableIcon size={14} />,
              onClick: () => {
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
              },
            },
            {
              id: 'ins-callout',
              title: 'Callout',
              icon: <QuoteDownIcon size={14} />,
              onClick: () => {
                editor.chain().focus().insertContent('> [!note]\n> ').run();
              },
            },
            {
              id: 'ins-hr',
              title: 'Horizontal rule',
              icon: <MinusSignIcon size={14} />,
              onClick: () => {
                editor.chain().focus().setHorizontalRule().run();
              },
            },
            { type: 'separator' },
            {
              id: 'ins-codeblock',
              title: 'Code block',
              icon: <CodeIcon size={14} />,
              checked: editor.isActive('codeBlock'),
              onClick: () => {
                editor.chain().focus().toggleCodeBlock().run();
              },
            },
            {
              id: 'ins-mathblock',
              title: 'Math block',
              icon: <SigmaIcon size={14} />,
              onClick: () => {
                editor.chain().focus().insertContent('\n$$\n\n$$\n').run();
              },
            },
            {
              id: 'ins-newbase',
              title: 'New base',
              icon: <Database01Icon size={14} />,
              onClick: () => {
                useDocumentStore.getState().createNewNote();
              },
            },
          ],
        });

        // Contextual Table Operations (if cursor is inside a table)
        if (editor.isActive('table')) {
          items.push({ type: 'separator' });
          items.push({
            id: 'table-operations',
            title: 'Table Actions',
            icon: <TableIcon size={14} />,
            submenu: [
              {
                id: 'tbl-add-row-before',
                title: 'Add row above',
                onClick: () => editor.chain().focus().addRowBefore().run(),
              },
              {
                id: 'tbl-add-row-after',
                title: 'Add row below',
                onClick: () => editor.chain().focus().addRowAfter().run(),
              },
              {
                id: 'tbl-del-row',
                title: 'Delete row',
                onClick: () => editor.chain().focus().deleteRow().run(),
              },
              { type: 'separator' },
              {
                id: 'tbl-add-col-before',
                title: 'Add column left',
                onClick: () => editor.chain().focus().addColumnBefore().run(),
              },
              {
                id: 'tbl-add-col-after',
                title: 'Add column right',
                onClick: () => editor.chain().focus().addColumnAfter().run(),
              },
              {
                id: 'tbl-del-col',
                title: 'Delete column',
                onClick: () => editor.chain().focus().deleteColumn().run(),
              },
              { type: 'separator' },
              {
                id: 'tbl-del-table',
                title: 'Delete table',
                isDanger: true,
                onClick: () => editor.chain().focus().deleteTable().run(),
              },
            ],
          });
        }

        // Contextual Math Operations (if cursor is inside a math formula or math text is selected)
        const isMathContext = isFormatActive(editor, '$') || (!empty && selectedText.includes('$'));
        if (isMathContext) {
          items.push({ type: 'separator' });
          items.push({
            id: 'menu-math-insert',
            title: 'Math Insert',
            icon: <SigmaIcon size={14} />,
            submenu: buildMathInsertSubmenus((latex, cursorOffset) => {
              restoreSelection();
              const { from } = editor.state.selection;
              editor.chain().focus().insertContent(latex).run();
              if (cursorOffset !== undefined) {
                editor.chain().focus().setTextSelection(from + cursorOffset).run();
              }
            }),
          });

          items.push({
            id: 'menu-math-keyboard',
            title: 'Toggle Math Keyboard',
            icon: <SigmaIcon size={14} />,
            onClick: () => {
              setIsMathKeyboardOpen((prev) => !prev);
            },
          });
        }
      }

      // 3. Clipboard & Selection Actions
      if (items.length > 0) items.push({ type: 'separator' });

      items.push({
        id: 'cut',
        title: 'Cut',
        shortcut: 'Ctrl+X',
        icon: <ScissorIcon size={14} />,
        disabled: empty || !editable,
        onClick: () => {
          if (!empty && selectedText) {
            navigator.clipboard.writeText(selectedText);
            editor.chain().focus().deleteSelection().run();
          }
        },
      });

      items.push({
        id: 'copy',
        title: 'Copy',
        shortcut: 'Ctrl+C',
        icon: <Copy01Icon size={14} />,
        disabled: empty,
        onClick: () => {
          if (!empty && selectedText) {
            navigator.clipboard.writeText(selectedText);
            showToast('Copied to clipboard', 'info');
          }
        },
      });

      if (editable) {
        items.push({
          id: 'paste',
          title: 'Paste',
          shortcut: 'Ctrl+V',
          icon: <ClipboardPasteIcon size={14} />,
          onClick: async () => {
            try {
              const text = await navigator.clipboard.readText();
              if (text) {
                editor.chain().focus().insertContent(text).run();
              }
            } catch (err) {
              console.error('Failed to read clipboard:', err);
            }
          },
        });

        items.push({
          id: 'paste-plain',
          title: 'Paste as plain text',
          shortcut: 'Ctrl+Shift+V',
          icon: <TextClearIcon size={14} />,
          onClick: async () => {
            try {
              const text = await navigator.clipboard.readText();
              if (text) {
                editor.chain().focus().insertContent(text).run();
              }
            } catch (err) {
              console.error('Failed to read clipboard:', err);
            }
          },
        });
      }

      items.push({
        id: 'select-all',
        title: 'Select all',
        shortcut: 'Ctrl+A',
        icon: <CheckmarkSquare02Icon size={14} />,
        onClick: () => {
          editor.chain().focus().selectAll().run();
        },
      });

      if (items.length > 0) {
        showContextMenu(e, items, {
          scope: 'editor',
          data: { editor, document: useDocumentStore.getState().activeDocument, selection: state.selection, selectedText },
        });
      }
    },
    [editor, editable, showToast, showContextMenu]
  );

  handleContextMenuRef.current = handleEditorContextMenu;

  // Flush any pending debounced update when unmounting or switching editor
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
        if (editor && !editor.isDestroyed) {
          try {
            const jsonStr = JSON.stringify(editor.getJSON());
            if (jsonStr !== lastEmittedJsonRef.current) {
              isInternalUpdateRef.current = true;
              lastEmittedJsonRef.current = jsonStr;
              onChange(jsonStr);
            }
          } catch (e) {}
        }
      }
    };
  }, [editor, onChange]);

  // Keep editor content in sync when active document switches or updates externally
  useEffect(() => {
    if (!editor || !content) return;
    if (content === lastEmittedJsonRef.current) {
      return;
    }
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    try {
      const currentJson = JSON.stringify(editor.getJSON());
      if (currentJson !== content) {
        // ProseMirror Authority Invariant:
        // If editor is currently focused with active typing in progress, preserve ProseMirror's buffer.
        // Otherwise (e.g. document switch, tab restore, or external sync), apply incoming content cleanly.
        if (editor.isFocused) {
          return;
        }
        lastEmittedJsonRef.current = typeof content === 'string' ? content : JSON.stringify(content);
        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
        editor.commands.setContent(parsed, false);
      }
    } catch (e) {}
  }, [content, editor]);

  // Notify parent of editor instance and sync active editor registry
  useEffect(() => {
    if (editor) {
      (window as any).__flintEditor = editor;
      app.editor.setActiveEditor(editor);
      if (onEditorReady) {
        onEditorReady(editor);
      }
      return () => {
        if (app.editor.getActiveEditor() === editor) {
          app.editor.setActiveEditor(null);
        }
      };
    }
  }, [editor, onEditorReady, app.editor]);

  // Dismiss suggestion popups whenever the active document switches
  useEffect(() => {
    suggestionPopupsRef.current?.closeAll();
  }, [documentId]);

  // Sync editable state and restore caret position when returning to editing view
  useEffect(() => {
    if (!editor) return;

    if (editor.isEditable !== editable) {
      editor.setEditable(editable);
    }

    if (!editable) {
      // Switching to Reading View: remember cursor position
      const { from, to } = editor.state.selection;
      if (from !== undefined && to !== undefined) {
        savedSelectionRef.current = { from, to };
      }
      editor.view.dispatch(
        editor.state.tr.setMeta('livePreviewFocus', false)
      );
    } else if (wasEditableRef.current === false && editable === true) {
      // Switching from Reading View back to Editing View: restore saved caret position!
      const targetSel = savedSelectionRef.current;
      setTimeout(() => {
        if (!editor.isDestroyed && targetSel) {
          const maxPos = editor.state.doc.content.size;
          const from = Math.max(0, Math.min(targetSel.from, maxPos));
          const to = Math.max(0, Math.min(targetSel.to, maxPos));
          editor.chain().focus().setTextSelection({ from, to }).run();
          editor.view.dispatch(
            editor.state.tr.setMeta('livePreviewFocus', true)
          );
        } else if (!editor.isDestroyed) {
          editor.commands.focus();
        }
      }, 15);
    }

    wasEditableRef.current = editable;
  }, [editable, editor]);

  // Re-render live preview decorations and fold decorations when tabSize or fold settings change
  const tabSize = useSettingsStore((s) => s.tabSize);
  const foldHeading = useSettingsStore((s) => s.foldHeading);
  const foldIndent = useSettingsStore((s) => s.foldIndent);
  const spellcheck = useSettingsStore((s) => s.spellcheck);

  useEffect(() => {
    if (!editor || !editor.view || editor.isDestroyed) return;
    editor.view.dom.setAttribute('spellcheck', spellcheck ? 'true' : 'false');
    editor.setOptions({
      editorProps: {
        attributes: {
          spellcheck: spellcheck ? 'true' : 'false',
        },
      },
    });
  }, [spellcheck, editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(
      editor.state.tr
        .setMeta('livePreviewFocus', editor.isFocused)
        .setMeta('reloadFoldState', true)
    );
  }, [tabSize, foldHeading, foldIndent, editor]);

  // Handle heading selection and yellow highlight from OutlineView
  useEffect(() => {
    if (!editor) return;

    const handleSelectHeading = (e: any) => {
      const { index } = e.detail || {};
      if (index === undefined || index === null) return;

      // 1. Dispatch meta to LivePreviewSyntax plugin to render yellow decoration on exact index
      editor.view.dispatch(
        editor.state.tr.setMeta('targetHeadingIndex', index)
      );

      // 2. Scroll the exact heading element into view
      setTimeout(() => {
        const headings = Array.from(
          editor.view.dom.querySelectorAll('h1, h2, h3, h4, h5, h6')
        ) as HTMLElement[];

        const targetDom = headings[index];
        if (targetDom) {
          targetDom.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 10);
    };

    window.addEventListener('flint:select-heading', handleSelectHeading as EventListener);

    return () => {
      window.removeEventListener('flint:select-heading', handleSelectHeading as EventListener);
    };
  }, [editor]);

  // Dedicated link click capturing interceptor on editor.view.dom
  // Guarantees immediate, reliable link navigation in both Editing View (Live Preview) and Reading View
  useEffect(() => {
    if (!editor || !editor.view) return;
    const dom = editor.view.dom;

    let pendingTarget: {
      info: { type: 'wikilink' | 'url' | 'tag'; target: string };
      x: number;
      y: number;
      time: number;
      isSplit: boolean;
    } | null = null;

    let dragStartPos: { x: number; y: number; time: number } | null = null;
    let suppressNextClick = false;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      dragStartPos = { x: e.clientX, y: e.clientY, time: Date.now() };

      const info = extractLinkTargetFromEvent(editor, e);
      if (info) {
        pendingTarget = {
          info,
          x: e.clientX,
          y: e.clientY,
          time: Date.now(),
          isSplit: e.ctrlKey || e.metaKey || e.button === 1,
        };
        // Prevent ProseMirror from focusing inside the link and tearing down the DOM decoration
        e.preventDefault();
      } else {
        pendingTarget = null;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      // Check if mouse moved noticeably from mousedown or if there is an active selection
      const moved = dragStartPos
        ? Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y) > 4
        : false;
      dragStartPos = null;

      const domSelection = window.getSelection();
      const hasTextSelection = Boolean(
        (domSelection && !domSelection.isCollapsed && domSelection.toString().length > 0) ||
        (editor.state && !editor.state.selection.empty)
      );

      if (moved || hasTextSelection) {
        suppressNextClick = true;
        pendingTarget = null;
        setTimeout(() => {
          suppressNextClick = false;
        }, 150);
        return;
      }

      if (!pendingTarget) return;
      const current = pendingTarget;
      pendingTarget = null;

      const dist = Math.hypot(e.clientX - current.x, e.clientY - current.y);
      const elapsed = Date.now() - current.time;

      if (dist < 8 && elapsed < 800) {
        e.preventDefault();
        e.stopPropagation();

        if (current.info.type === 'wikilink') {
          handleNavigateToWikiLink(current.info.target, current.isSplit);
        } else if (current.info.type === 'url') {
          platform.openUrl(current.info.target);
        } else if (current.info.type === 'tag') {
          const ws = useWorkspaceStore.getState();
          const ds = useDocumentStore.getState();
          ws.setActiveLeftView('search');
          ws.setIsLeftSidebarOpen(true);
          ds.setSearchQuery(
            current.info.target.startsWith('#') ? current.info.target : `#${current.info.target}`
          );
        }
      }
    };

    const onClick = (e: MouseEvent) => {
      if (suppressNextClick) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const domSelection = window.getSelection();
      if (domSelection && !domSelection.isCollapsed && domSelection.toString().length > 0) {
        return;
      }
      if (editor.state && !editor.state.selection.empty) {
        return;
      }

      const info = extractLinkTargetFromEvent(editor, e);
      if (info) {
        e.preventDefault();
        e.stopPropagation();
        const rawTarget = (e.target as HTMLElement)?.closest('.md-link, .md-wikilink, a');
        if (rawTarget) {
          rawTarget.classList.add('is-visited');
          rawTarget.setAttribute('data-visited', 'true');
        }
        const isSplit = e.ctrlKey || e.metaKey || e.button === 1;
        if (info.type === 'wikilink') {
          markLinkVisited(info.target);
          handleNavigateToWikiLink(info.target, isSplit);
        } else if (info.type === 'url') {
          markLinkVisited(info.target);
          platform.openUrl(info.target);
        } else if (info.type === 'tag') {
          const ws = useWorkspaceStore.getState();
          const ds = useDocumentStore.getState();
          ws.setActiveLeftView('search');
          ws.setIsLeftSidebarOpen(true);
          ds.setSearchQuery(
            info.target.startsWith('#') ? info.target : `#${info.target}`
          );
        }
      }
    };

    dom.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('mouseup', onMouseUp, true);
    dom.addEventListener('click', onClick, true);

    return () => {
      dom.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('mouseup', onMouseUp, true);
      dom.removeEventListener('click', onClick, true);
    };
  }, [editor, handleNavigateToWikiLink]);

  // Handle insert table command from Command Palette and EventBus
  useEffect(() => {
    if (!editor) return;
    const handleInsertTable = (payload?: { rows?: number; cols?: number }) => {
      const rows = payload?.rows ?? 3;
      const cols = payload?.cols ?? 3;
      editor
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: false })
        .run();
    };

    const d = app.events.on('editor:action', (data) => {
      if (data.action === 'insert-table') {
        handleInsertTable(data.payload as any);
      }
    });

    const onCustomEvent = (e: any) => {
      handleInsertTable(e.detail);
    };

    window.addEventListener('flint:insert-table-command', onCustomEvent);
    return () => {
      d.dispose();
      window.removeEventListener('flint:insert-table-command', onCustomEvent);
    };
  }, [editor, app]);

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        if (editor && editable) {
          const target = e.target as HTMLElement;
          if (target === e.currentTarget || target.classList.contains('ProseMirror') || target.classList.contains('tiptap') || target.classList.contains('editor-canvas')) {
            const { state, schema } = editor;
            if (state.doc.lastChild && state.doc.lastChild.type.name === 'table') {
              const insertPos = state.doc.content.size;
              const tr = state.tr.insert(insertPos, schema.nodes.paragraph.create());
              tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
              editor.view.dispatch(tr);
              editor.view.focus();
            } else if (!editor.isFocused) {
              editor.commands.focus('end');
            }
          }
        }
      }}
      onContextMenu={(e) => handleEditorContextMenu(e)}
      className={`relative w-full flex-1 flex flex-col ${editable ? 'cursor-text' : 'cursor-default tiptap-reading-view'}`}
    >
      <EditorContent editor={editor} className="flex-1 flex flex-col" />

      {/* Minimalist Hover Edge Add-Row / Add-Column Controls */}
      {editable && <TableEdgeControls editor={editor} />}

      {/* Isolated Floating Suggestion Popups (prevents TipTapEditor re-renders on suggestion keystrokes) */}
      <EditorSuggestionPopups
        ref={suggestionPopupsRef}
        containerRef={containerRef}
        slashMenuRef={slashMenuRef}
        wikiPopupRef={wikiPopupRef}
      />

      {/* Native Virtual Math Keyboard */}
      <MathKeyboard
        editor={editor}
        isOpen={isMathKeyboardOpen}
        onClose={() => setIsMathKeyboardOpen(false)}
      />
    </div>
  );
});

