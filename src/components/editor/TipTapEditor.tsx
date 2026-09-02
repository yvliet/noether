import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
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
import { SlashMenu } from './SlashMenu';
import { WikiLinkPopup } from './WikiLinkPopup';
import { MathKeyboard } from './MathKeyboard';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSettingsStore } from '@/store/settingsStore';
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
    const targetUrl =
      mdLinkElem.getAttribute('data-link-url') ||
      mdLinkElem.getAttribute('href') ||
      null;
    if (targetUrl) {
      return { type: 'url', target: targetUrl };
    }
  }

  // 2. Direct DOM check for <a> tags
  const anchor =
    targetElem?.closest('a') ||
    (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest('a');
  if (anchor) {
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
          const mdLinkRegex = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
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

  // Floating menu refs
  const [slashMenuProps, setSlashMenuProps] = useState<{
    items: SlashItem[];
    command: (item: SlashItem) => void;
    rect: DOMRect | null;
  } | null>(null);

  const [wikiProps, setWikiProps] = useState<{
    items: WikiLinkItem[];
    command: (item: WikiLinkItem) => void;
    rect: DOMRect | null;
  } | null>(null);

  const [isMathKeyboardOpen, setIsMathKeyboardOpen] = useState(false);

  const slashMenuRef = useRef<any>(null);
  const wikiPopupRef = useRef<any>(null);
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const lastEmittedJsonRef = useRef<string | null>(null);
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
        ds.createNewNote(notePart).then((newDoc) => {
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
    extensions: [
      ...app.editor.getExtensions(),
      SlashCommands.configure({
        suggestion: {
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
                setSlashMenuProps({
                  items: props.items,
                  command: (item: SlashItem, extra?: any) => {
                    props.command({ ...item, ...extra });
                  },
                  rect: rect || null,
                });
              },
              onUpdate: (props: any) => {
                const rect = props.clientRect?.();
                setSlashMenuProps((prev) =>
                  prev
                    ? {
                        ...prev,
                        items: props.items,
                        command: (item: SlashItem, extra?: any) => {
                          props.command({ ...item, ...extra });
                        },
                        rect: rect || null,
                      }
                    : null
                );
              },
              onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                  setSlashMenuProps(null);
                  return true;
                }
                return slashMenuRef.current?.onKeyDown(props) || false;
              },
              onExit: () => {
                setSlashMenuProps(null);
              },
            };
          },
        },
      }),
      WikiLinks.configure({
        suggestion: {
          items: ({ query }) => {
            if (query.includes(']') || query.includes('[')) return [];
            const currentDocs = useDocumentStore.getState().documents.filter((d) => !d.is_folder);
            const q = query.trim().toLowerCase();
            const matches: WikiLinkItem[] = (q
              ? currentDocs.filter((d) => d.title.toLowerCase().includes(q))
              : currentDocs
            ).map((d) => ({ id: d.id, title: d.title }));

            if (query.trim() && !matches.some((m) => m.title.toLowerCase() === query.trim().toLowerCase())) {
              matches.push({
                id: `new-${query.trim()}`,
                title: query.trim(),
                isNew: true,
              });
            }
            return matches;
          },
          render: () => {
            return {
              onStart: (props: any) => {
                const rect = props.clientRect?.();
                setWikiProps({
                  items: props.items,
                  command: async (item: WikiLinkItem) => {
                    if (item.isNew) {
                      if (!item.title || !item.title.trim()) return;
                      const newDoc = await createNewNote(item.title.trim());
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
                const rect = props.clientRect?.();
                setWikiProps((prev) =>
                  prev
                    ? {
                        ...prev,
                        items: props.items,
                        command: async (item: WikiLinkItem) => {
                          if (item.isNew) {
                            if (!item.title || !item.title.trim()) return;
                            const newDoc = await createNewNote(item.title.trim());
                            if (newDoc) {
                              props.command({ title: newDoc.title, id: newDoc.id });
                            }
                          } else {
                            props.command(item);
                          }
                        },
                        rect: rect || null,
                      }
                    : null
                );
              },
              onKeyDown: (props: any) => {
                if (props.event.key === 'Escape') {
                  setWikiProps(null);
                  return true;
                }
                return wikiPopupRef.current?.onKeyDown(props) || false;
              },
              onExit: () => {
                setWikiProps(null);
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
        // WHY THIS, NOT THAT:
        // Enable hardBreak so that Shift-Enter inserts inline <br> breaks with normal line-height
        // instead of splitting blocks into new paragraphs (which have 0.5rem paragraph margins).
        hardBreak: {
          keepMarks: true,
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

                  // Determine target folder
                  let targetParentId: string | null = null;
                  const configuredFolder = ss.attachmentFolder?.trim();
                  if (configuredFolder) {
                    const docs = ds.documents;
                    const existingFolder = docs.find(
                      (d) => d.is_folder && (d.title.toLowerCase() === configuredFolder.toLowerCase() || d.id === configuredFolder)
                    );
                    if (existingFolder) {
                      targetParentId = existingFolder.id;
                    } else {
                      const newFolder = await ds.createNewFolder(configuredFolder);
                      if (newFolder) targetParentId = newFolder.id;
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
        const info = extractLinkTargetFromEvent(editor, event as MouseEvent);
        if (info) {
          const isSplit = event.ctrlKey || event.metaKey || event.button === 1;
          if (info.type === 'wikilink') {
            handleNavigateToWikiLink(info.target, isSplit);
            return true;
          } else if (info.type === 'url') {
            if (
              info.target.startsWith('http://') ||
              info.target.startsWith('https://') ||
              info.target.startsWith('mailto:')
            ) {
              window.open(info.target, '_blank', 'noopener,noreferrer');
              return true;
            }
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
      isInternalUpdateRef.current = true;
      const jsonStr = JSON.stringify(editor.getJSON());
      lastEmittedJsonRef.current = jsonStr;
      onChange(jsonStr);
    },
  });

  const handleEditorContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!editor) return;

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

  const isInternalUpdateRef = useRef(false);

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

  // Notify parent of editor instance
  useEffect(() => {
    if (editor) {
      (window as any).__flintEditor = editor;
      if (onEditorReady) {
        onEditorReady(editor);
      }
    }
  }, [editor, onEditorReady]);

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

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
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
          if (
            current.info.target.startsWith('http://') ||
            current.info.target.startsWith('https://') ||
            current.info.target.startsWith('mailto:')
          ) {
            window.open(current.info.target, '_blank', 'noopener,noreferrer');
          }
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
      const info = extractLinkTargetFromEvent(editor, e);
      if (info) {
        e.preventDefault();
        e.stopPropagation();
        const isSplit = e.ctrlKey || e.metaKey || e.button === 1;
        if (info.type === 'wikilink') {
          handleNavigateToWikiLink(info.target, isSplit);
        } else if (info.type === 'url') {
          if (
            info.target.startsWith('http://') ||
            info.target.startsWith('https://') ||
            info.target.startsWith('mailto:')
          ) {
            window.open(info.target, '_blank', 'noopener,noreferrer');
          }
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

  // Smart floating popover positioning with automatic top/bottom flip and screen boundary clamping
  const getSmartFloatingStyle = useCallback((rect: DOMRect | null, estimatedWidth: number, estimatedHeight: number, gap: number = 6): React.CSSProperties => {
    if (!rect) return { display: 'none' };
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const margin = 12;

    const spaceBelow = vh - rect.bottom - gap - margin;
    const spaceAbove = rect.top - gap - margin;

    // Horizontal alignment with boundary clamping
    let left = rect.left;
    if (left + estimatedWidth > vw - margin) {
      left = Math.max(margin, vw - estimatedWidth - margin);
    }
    if (left < margin) {
      left = margin;
    }

    // Vertical placement: prefer below, flip to above if not enough space below AND more space above
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
  }, []);

  return (
    <div
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
      onContextMenu={(e) => handleEditorContextMenu(e.nativeEvent)}
      className={`relative w-full flex-1 flex flex-col ${editable ? 'cursor-text' : 'cursor-default tiptap-reading-view'}`}
    >
      <EditorContent editor={editor} className="flex-1 flex flex-col" />

      {/* Minimalist Hover Edge Add-Row / Add-Column Controls */}
      {editable && <TableEdgeControls editor={editor} />}

      {/* Floating Slash Command Menu with Smart Auto-Flip */}
      {slashMenuProps && slashMenuProps.rect && (
        <div style={getSmartFloatingStyle(slashMenuProps.rect, 300, 340, 6)}>
          <SlashMenu
            ref={slashMenuRef}
            items={slashMenuProps.items}
            command={slashMenuProps.command}
          />
        </div>
      )}

      {/* Floating WikiLink Popup with Smart Auto-Flip */}
      {wikiProps && wikiProps.rect && (
        <div style={getSmartFloatingStyle(wikiProps.rect, 270, 300, 6)}>
          <WikiLinkPopup
            ref={wikiPopupRef}
            items={wikiProps.items}
            command={wikiProps.command}
          />
        </div>
      )}

      {/* Native Virtual Math Keyboard */}
      <MathKeyboard
        editor={editor}
        isOpen={isMathKeyboardOpen}
        onClose={() => setIsMathKeyboardOpen(false)}
      />
    </div>
  );
});

