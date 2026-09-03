import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Typography from '@tiptap/extension-typography';

import {
  PlusSignIcon,
  MoreVerticalIcon,
  MinusSignIcon,
  ArrowExpandIcon,
  Cancel01Icon,
  Folder01Icon,
  CheckIcon,
  TextBoldIcon,
  TextItalicIcon,
  HighlighterIcon,
  TextStrikethroughIcon,
  LeftToRightListBulletIcon,
  CheckmarkSquare02Icon,
  Search01Icon,
} from '@/components/common/Icons';

import {
  useQuicknoteSettings,
  STICKY_THEMES,
  StickyPaperColor,
} from './quicknoteSettings';
import { useFlintApp } from '@/core/app/AppContext';
import { getAllDocuments, createDocument, saveDocumentAndSynchronize } from '@/lib/db/documents';
import { useDocumentStore } from '@/store/documentStore';

function deriveTitle(rawText: string, explicitTitle?: string): string {
  if (explicitTitle && explicitTitle.trim()) {
    return explicitTitle.trim().replace(/[/\\?%*:|"<>]/g, '_');
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    let firstLine = lines[0];
    firstLine = firstLine.replace(/^(?:#{1,6}|[-*•]|\>|\-\s*\[[ xX]\])\s*/, '').trim();
    firstLine = firstLine.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1');
    if (firstLine) {
      const clean = firstLine.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 50).trim();
      if (clean) return clean;
    }
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}.${String(now.getSeconds()).padStart(2, '0')}`;
  return `Quicknote - ${dateStr} ${timeStr}`;
}

async function ensureFolder(folderPath: string): Promise<string | null> {
  const cleanPath = (folderPath || '').trim().replace(/^[/\\]+|[/\\]+$/g, '');
  if (!cleanPath || cleanPath === '.' || cleanPath === '/') {
    return null;
  }

  const segments = cleanPath.split(/[/\\]+/).filter(Boolean);
  const allDocs = await getAllDocuments();

  let parentId: string | null = null;
  for (const seg of segments) {
    const existing = allDocs.find((d) => Boolean(d.is_folder) && d.title === seg && d.parent_id === parentId);
    if (existing) {
      parentId = existing.id;
    } else {
      const newFolder = await createDocument(seg, parentId, true, 'base');
      parentId = newFolder.id;
      allDocs.push(newFolder);
    }
  }

  return parentId;
}

export const QuicknoteModal: React.FC = React.memo(() => {
  const app = useFlintApp();
  const isModalOpen = useQuicknoteSettings((s) => s.isModalOpen);
  const isMinimized = useQuicknoteSettings((s) => s.isMinimized);
  const toggleMinimize = useQuicknoteSettings((s) => s.toggleMinimize);
  const closeQuicknote = useQuicknoteSettings((s) => s.closeQuicknote);
  const quicknoteFolder = useQuicknoteSettings((s) => s.quicknoteFolder || 'Quicknotes');
  const setQuicknoteFolder = useQuicknoteSettings((s) => s.setQuicknoteFolder);
  const paperColor = useQuicknoteSettings((s) => s.paperColor || 'yellow');
  const setPaperColor = useQuicknoteSettings((s) => s.setPaperColor);

  const theme = STICKY_THEMES[paperColor] || STICKY_THEMES.yellow;

  const [title, setTitle] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [folderSearch, setFolderSearch] = useState('');
  const [existingFolders, setExistingFolders] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Smooth position tracking
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const positionRef = useRef<{ x: number; y: number } | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Initialize Native TipTap Editor for Quicknote
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Take a note...',
        emptyEditorClass: 'is-editor-empty',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Typography,
    ],
    content: '',
    autofocus: false,
    editorProps: {
      attributes: {
        class: 'quicknote-prosemirror outline-none min-h-[180px] text-[14px] leading-relaxed select-text font-sans',
      },
    },
  });

  // Calculate default center position on open if not set
  useEffect(() => {
    if (isModalOpen) {
      if (!positionRef.current) {
        const initialX = Math.max(20, Math.round((window.innerWidth - 440) / 2));
        const initialY = Math.max(30, Math.round((window.innerHeight - 460) / 2));
        const initPos = { x: initialX, y: initialY };
        positionRef.current = initPos;
        setPosition(initPos);
      }

      setTitle('');
      setIsMenuOpen(false);
      setIsFolderDropdownOpen(false);
      setFolderSearch('');
      setIsSaving(false);

      if (editor && !editor.isDestroyed) {
        editor.commands.setContent('');
      }

      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 30);
    }
  }, [isModalOpen, editor]);

  // Outside click listener to dismiss open popovers cleanly (even when minimized)
  useEffect(() => {
    if (!isFolderDropdownOpen && !isMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent | PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-popover="true"]')) {
        setIsFolderDropdownOpen(false);
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleOutsideClick);
    return () => window.removeEventListener('pointerdown', handleOutsideClick);
  }, [isFolderDropdownOpen, isMenuOpen]);

  // Fetch available folders in vault for the in-app folder selector dropdown
  const loadExistingFolders = useCallback(async () => {
    try {
      const allDocs = await getAllDocuments();
      const folderDocs = allDocs.filter((d) => Boolean(d.is_folder)).map((d) => d.title).filter(Boolean);
      const uniqueFolders = Array.from(new Set(['Quicknotes', ...folderDocs]));
      setExistingFolders(uniqueFolders);
    } catch {
      setExistingFolders(['Quicknotes']);
    }
  }, []);

  const handleOpenFolderDropdown = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await loadExistingFolders();
    setIsFolderDropdownOpen((prev) => !prev);
    setIsMenuOpen(false);
  }, [loadExistingFolders]);

  // Ultra-Smooth 120fps Dragging on Header
  const handlePointerDownHeader = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, [role="button"], a, [data-popover="true"]')) {
      return;
    }

    const rect = modalContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: rect.left,
      initialY: rect.top,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMoveHeader = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const modalWidth = 440;
    const modalHeight = isMinimized ? 36 : 460;
    const maxX = Math.max(10, window.innerWidth - modalWidth - 10);
    const maxY = Math.max(10, window.innerHeight - modalHeight - 10);

    const newX = Math.min(Math.max(10, Math.round(dragStartRef.current.initialX + deltaX)), maxX);
    const newY = Math.min(Math.max(10, Math.round(dragStartRef.current.initialY + deltaY)), maxY);

    positionRef.current = { x: newX, y: newY };

    if (modalContainerRef.current) {
      modalContainerRef.current.style.left = `${newX}px`;
      modalContainerRef.current.style.top = `${newY}px`;
    }
  }, [isMinimized]);

  const handlePointerUpHeader = useCallback((e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      if (positionRef.current) {
        setPosition(positionRef.current);
      }
    }
  }, []);

  // Save handler (saves note to disk)
  const handleSave = useCallback(
    async (shouldClose = true) => {
      if (!editor || editor.isDestroyed) return;

      const editorText = editor.getText().trim();
      const hasContent = Boolean(editorText) || Boolean(title.trim());

      if (!hasContent) {
        if (shouldClose) {
          closeQuicknote();
        }
        return;
      }

      if (isSaving) return;
      setIsSaving(true);

      try {
        const targetFolder = quicknoteFolder || 'Quicknotes';
        const folderId = await ensureFolder(targetFolder);
        const noteTitle = deriveTitle(editorText, title);

        const jsonDoc = editor.getJSON();

        // If user typed an explicit title and it's not already the first heading, inject it
        if (title.trim() && jsonDoc.content && jsonDoc.content[0]?.type !== 'heading') {
          jsonDoc.content.unshift({
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: title.trim() }],
          });
        }

        const contentJson = JSON.stringify(jsonDoc);
        const doc = await createDocument(noteTitle, folderId, false, 'base');
        await saveDocumentAndSynchronize(doc.id, contentJson, noteTitle);

        const allDocs = await getAllDocuments();
        useDocumentStore.setState({ documents: allDocs });
        useDocumentStore.getState().recomputeBrokenEmbeds();

        app.workspace.showToast(`Saved note: "${noteTitle}"`, 'success');
        if (shouldClose) {
          closeQuicknote();
        }
      } catch (e: any) {
        app.workspace.showToast(e?.message || 'Failed to save note', 'warning');
      } finally {
        setIsSaving(false);
      }
    },
    [editor, title, isSaving, quicknoteFolder, app, closeQuicknote]
  );

  // The + button saves current note and closes quicknote
  const handleNewNoteAndSave = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!editor || editor.isDestroyed) return;

      const editorText = editor.getText().trim();
      const hasContent = Boolean(editorText) || Boolean(title.trim());

      if (hasContent) {
        await handleSave(true);
      } else {
        closeQuicknote();
      }
    },
    [editor, title, handleSave, closeQuicknote]
  );

  // Close handler with auto-save
  const handleClose = useCallback(async () => {
    if (editor && !editor.isDestroyed) {
      const editorText = editor.getText().trim();
      if (editorText || title.trim()) {
        await handleSave(true);
        return;
      }
    }
    closeQuicknote();
  }, [editor, title, handleSave, closeQuicknote]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (isFolderDropdownOpen) {
          setIsFolderDropdownOpen(false);
        } else if (isMenuOpen) {
          setIsMenuOpen(false);
        } else {
          handleClose();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleSave(true);
        return;
      }

      // Enter in Title input moves focus directly into the TipTap editor
      if (e.key === 'Enter' && e.target === titleInputRef.current) {
        e.preventDefault();
        editor?.commands.focus('start');
      }
    },
    [handleSave, handleClose, isMenuOpen, isFolderDropdownOpen, editor]
  );

  if (!isModalOpen) return null;

  const currentX = position?.x ?? Math.max(20, Math.round((window.innerWidth - 440) / 2));
  const currentY = position?.y ?? Math.max(30, Math.round((window.innerHeight - 460) / 2));

  const filteredFolders = existingFolders.filter((f) =>
    f.toLowerCase().includes(folderSearch.toLowerCase().trim())
  );

  return (
    <div
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (!isMinimized && e.target === e.currentTarget) {
          handleClose();
        }
      }}
      className={`fixed inset-0 z-50 select-none ${
        isMinimized
          ? 'pointer-events-none bg-transparent'
          : 'pointer-events-auto bg-black/45'
      }`}
    >
      {/* Sticky Note Window Frame (overflow-visible allows popovers to display cleanly even when minimized) */}
      <div
        ref={modalContainerRef}
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          borderColor: theme.border,
          position: 'fixed',
          left: `${currentX}px`,
          top: `${currentY}px`,
          width: '440px',
          height: isMinimized ? '36px' : '460px',
          boxShadow: isMinimized
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0,0,0,0.1)'
            : '0 24px 48px -12px rgba(0, 0, 0, 0.4), 0 12px 24px -8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0,0,0,0.06)',
        }}
        className="pointer-events-auto flex flex-col rounded-[3px] overflow-visible font-sans border"
      >
        {/* Top Header Bar (Draggable window handle) */}
        <div
          onPointerDown={handlePointerDownHeader}
          onPointerMove={handlePointerMoveHeader}
          onPointerUp={handlePointerUpHeader}
          className="relative h-9 px-2.5 flex items-center justify-between shrink-0 select-none cursor-move touch-none"
          style={{ backgroundColor: 'transparent' }}
        >
          {/* Top Left: Save & Close Button */}
          <div className="flex items-center gap-1 shrink-0 z-10">
            <button
              type="button"
              onClick={handleNewNoteAndSave}
              onPointerDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              title="Save note (Ctrl+Enter)"
              style={{ color: theme.text }}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 active:bg-black/15 cursor-pointer"
            >
              <PlusSignIcon size={18} />
            </button>
          </div>

          {/* Top Center: Geometrically Centered Folder Badge & Popover */}
          <div className="absolute inset-x-0 mx-auto w-fit flex items-center justify-center pointer-events-none z-10">
            <div
              data-popover="true"
              className="relative flex items-center gap-1 opacity-80 hover:opacity-100 pointer-events-auto"
              onPointerDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleOpenFolderDropdown}
                onPointerDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                title={`Saved to "${quicknoteFolder}". Click to change folder.`}
                style={{ color: theme.text }}
                className="text-[11px] font-medium tracking-tight flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded hover:bg-black/10"
              >
                <Folder01Icon size={12} />
                <span className="max-w-[140px] truncate">{quicknoteFolder || 'Quicknotes'}</span>
              </button>

              {/* In-App Folder Picker Dropdown */}
              {isFolderDropdownOpen && (
                <div
                  data-popover="true"
                  style={{
                    backgroundColor: theme.toolbarBg,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                  className="absolute top-8 left-1/2 -translate-x-1/2 z-50 w-52 p-2 rounded-lg shadow-2xl border flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-1 px-1.5 py-1 bg-black/10 rounded">
                    <Search01Icon size={12} className="opacity-60 shrink-0" />
                    <input
                      type="text"
                      value={folderSearch}
                      onChange={(e) => setFolderSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && folderSearch.trim()) {
                          e.preventDefault();
                          setQuicknoteFolder(folderSearch.trim());
                          setIsFolderDropdownOpen(false);
                          app.workspace.showToast(`Folder set to "${folderSearch.trim()}"`, 'success');
                        }
                      }}
                      placeholder="Search or new folder..."
                      autoFocus
                      className="w-full bg-transparent text-[11px] placeholder:text-current placeholder:opacity-40 outline-none"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                    {filteredFolders.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuicknoteFolder(f);
                          setIsFolderDropdownOpen(false);
                          app.workspace.showToast(`Folder set to "${f}"`, 'success');
                        }}
                        className={`flex items-center gap-1.5 px-2 py-1 text-[11px] rounded text-left cursor-pointer ${
                          quicknoteFolder === f ? 'bg-black/15 font-bold' : 'hover:bg-black/10'
                        }`}
                      >
                        <Folder01Icon size={11} className="opacity-70 shrink-0" />
                        <span className="truncate">{f}</span>
                        {quicknoteFolder === f && <CheckIcon size={10} className="ml-auto opacity-70" />}
                      </button>
                    ))}
                    {filteredFolders.length === 0 && folderSearch.trim() && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuicknoteFolder(folderSearch.trim());
                          setIsFolderDropdownOpen(false);
                          app.workspace.showToast(`Created folder "${folderSearch.trim()}"`, 'success');
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-[11px] text-left hover:bg-black/10 rounded cursor-pointer text-emerald-600 font-semibold"
                      >
                        <PlusSignIcon size={11} />
                        <span className="truncate">Create "{folderSearch.trim()}"</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top Right: Menu (...), Minimize (-), Close (✕) */}
          <div
            className="flex items-center gap-0.5 shrink-0 z-10"
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {/* Color Menu */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((prev) => !prev);
                setIsFolderDropdownOpen(false);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              title="Menu / Color palette"
              style={{ color: theme.text }}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 active:bg-black/15 cursor-pointer"
            >
              <MoreVerticalIcon size={17} />
            </button>

            {/* Minimize / Expand Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleMinimize();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              title={isMinimized ? 'Expand note' : 'Minimize to header'}
              style={{ color: theme.text }}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 active:bg-black/15 cursor-pointer"
            >
              {isMinimized ? <ArrowExpandIcon size={14} /> : <MinusSignIcon size={15} />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              title="Close note (Esc)"
              style={{ color: theme.text }}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 active:bg-black/15 cursor-pointer"
            >
              <Cancel01Icon size={15} />
            </button>
          </div>
        </div>

        {/* Color Switcher Dropdown Menu */}
        {isMenuOpen && (
          <div
            data-popover="true"
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.toolbarBg,
              borderColor: theme.border,
            }}
            className="absolute top-9 right-2 z-50 p-2.5 rounded-lg shadow-xl border flex flex-col gap-2"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 px-1">
              Note Color
            </span>
            <div className="flex items-center gap-1.5">
              {(Object.keys(STICKY_THEMES) as StickyPaperColor[]).map((key) => {
                const item = STICKY_THEMES[key];
                const isSelected = paperColor === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaperColor(key);
                      setIsMenuOpen(false);
                    }}
                    title={item.label}
                    style={{
                      backgroundColor: item.bg,
                      borderColor: isSelected ? '#000000' : 'rgba(0,0,0,0.15)',
                    }}
                    className={`w-6 h-6 rounded-full border-2 cursor-pointer flex items-center justify-center ${
                      isSelected ? 'shadow-sm' : ''
                    }`}
                  >
                    {isSelected && <CheckIcon size={11} className="text-black" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Note Body Area (Hidden when minimized) */}
        {!isMinimized && (
          <>
            <div className="flex-1 flex flex-col px-5 pt-1 pb-2 min-h-0 overflow-y-auto custom-scrollbar bg-transparent">
              {/* Bold First Line / Title Input */}
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title..."
                style={{
                  color: theme.text,
                }}
                className="w-full bg-transparent text-[16px] font-bold placeholder:text-current placeholder:opacity-40 pb-1 outline-none tracking-tight font-sans shrink-0"
              />

              {/* TipTap Rich Text Editor */}
              <div
                onClick={() => {
                  if (editor && !editor.isFocused) {
                    editor.commands.focus();
                  }
                }}
                className="flex-1 cursor-text pb-2 min-h-[180px]"
              >
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* Bottom Formatting Toolbar (Direct TipTap WYSIWYG Actions) */}
            <div
              style={{
                backgroundColor: theme.toolbarBg,
                borderColor: theme.border,
              }}
              className="h-10 px-3 flex items-center gap-0.5 border-t shrink-0 select-none"
            >
              {/* Bold */}
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                title="Bold (Ctrl+B)"
                style={{
                  color: theme.text,
                  backgroundColor: editor?.isActive('bold') ? 'rgba(0,0,0,0.14)' : 'transparent',
                }}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 active:bg-black/15 cursor-pointer"
              >
                <TextBoldIcon size={15} />
              </button>

              {/* Italic */}
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                title="Italic (Ctrl+I)"
                style={{
                  color: theme.text,
                  backgroundColor: editor?.isActive('italic') ? 'rgba(0,0,0,0.14)' : 'transparent',
                }}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 active:bg-black/15 cursor-pointer"
              >
                <TextItalicIcon size={15} />
              </button>

              {/* Underline / Highlight */}
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleHighlight({ color: '#ffd54f' }).run()}
                title="Highlight"
                style={{
                  color: theme.text,
                  backgroundColor: editor?.isActive('highlight') ? 'rgba(0,0,0,0.14)' : 'transparent',
                }}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 active:bg-black/15 cursor-pointer"
              >
                <HighlighterIcon size={15} />
              </button>

              {/* Strikethrough */}
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleStrike().run()}
                title="Strikethrough"
                style={{
                  color: theme.text,
                  backgroundColor: editor?.isActive('strike') ? 'rgba(0,0,0,0.14)' : 'transparent',
                }}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 active:bg-black/15 cursor-pointer"
              >
                <TextStrikethroughIcon size={15} />
              </button>

              {/* Bullet List */}
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                title="Bullet list"
                style={{
                  color: theme.text,
                  backgroundColor: editor?.isActive('bulletList') ? 'rgba(0,0,0,0.14)' : 'transparent',
                }}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 active:bg-black/15 cursor-pointer"
              >
                <LeftToRightListBulletIcon size={15} />
              </button>

              {/* Task Checklist */}
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleTaskList().run()}
                title="Task checklist"
                style={{
                  color: theme.text,
                  backgroundColor: editor?.isActive('taskList') ? 'rgba(0,0,0,0.14)' : 'transparent',
                }}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 active:bg-black/15 cursor-pointer"
              >
                <CheckmarkSquare02Icon size={15} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default QuicknoteModal;
