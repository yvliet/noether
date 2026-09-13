/**
 * @module NativeCommands
 * @description
 * Registers core native workspace commands and hotkeys for Noether.
 *
 * Provides foundational commands for file management, sidebar and split pane layout,
 * zoom scaling, tab navigation, undo/redo, preferences, and rich Markdown editor formatting.
 * Registering these natively directly on NoetherApp ensures essential keyboard shortcuts
 * are permanently available, non-disableable, and fully customizable in Settings -> Hotkeys.
 *
 * @since 0.4.7
 */

import React from 'react';
import type { NoetherApp } from '../app/NoetherApp';
import type { CommandItem } from '../extensions/types';
import {
  FileAddIcon,
  LayoutLeftIcon,
  LayoutRightIcon,
  Settings02Icon,
  HelpCircleIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  RotateCcwIcon,
  BookOpen01Icon,
  SourceCodeIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ZoomIcon,
  SplitRightIcon,
  Cancel01Icon,
  CancelCircleIcon,
  Maximize01Icon,
  Minimize01Icon,
  Copy01Icon,
  FolderTreeIcon,
  Delete02Icon,
  Heading101Icon,
  Heading201Icon,
  Heading301Icon,
  Heading401Icon,
  Heading501Icon,
  Heading601Icon,
  ParagraphIcon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  CheckmarkSquare02Icon,
  QuoteDownIcon,
  CodeIcon,
  MinusSignIcon,
  StickyNote02Icon,
  SigmaIcon,
  Link01Icon,
  LinkSquare02Icon,
  InformationCircleIcon,
  BulbIcon,
  AlertTriangleIcon,
  Alert02Icon,
  AlertDiamondIcon,
  Search01Icon,
  GridTableIcon,
} from '@/components/common/Icons';
import { insertOrWrapMarkdownLink } from '@/components/editor/extensions/markdown-shortcuts';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Predicate determining if an active Markdown editor is available for formatting operations.
 */
function isMarkdownEditorActive(app: NoetherApp): boolean {
  const activeDoc = app.vault.activeDocument;
  if (!activeDoc || activeDoc.is_folder) return false;
  const nonMarkdownTypes = ['canvas', 'image', 'audio', 'video', 'pdf'];
  if (activeDoc.doc_type && nonMarkdownTypes.includes(activeDoc.doc_type)) {
    return false;
  }
  return Boolean(app.editor.getActiveEditor());
}

/**
 * Registers all baseline workspace commands onto the application's CommandRegistry.
 *
 * @param app - The central NoetherApp host instance.
 */
export function registerNativeCommands(app: NoetherApp): void {
  const nativeCommands: CommandItem[] = [
    // ── Command Palette Launcher ──
    {
      id: 'workspace:command-palette',
      title: 'Open command palette',
      section: 'System',
      icon: <Search01Icon size={16} />,
      hotkey: 'Ctrl+K',
      aliases: ['command palette', 'quick open', 'search', 'palette', 'commands', 'find'],
      action: (appInstance) => {
        appInstance.workspace.openCommandPalette();
      },
    },

    // ── Vault Switcher ──
    {
      id: 'workspace:vault-switcher',
      title: 'Switch active vault',
      section: 'System',
      icon: <FolderTreeIcon size={16} />,
      hotkey: 'Ctrl+Shift+O',
      aliases: ['switch vault', 'open vault', 'change vault', 'vaults'],
      action: (appInstance) => {
        appInstance.workspace.openVaultModal();
      },
    },

    // ── 1. Quick New Note ──
    {
      id: 'cmd-new-note',
      title: 'Create new note',
      section: 'Files',
      icon: <FileAddIcon size={16} />,
      hotkey: 'Ctrl+N',
      action: async (appInstance) => {
        appInstance.workspace.setMainViewMode('document');
        await appInstance.vault.createNewNote('Untitled');
      },
    },

    // ── 2. Toggle Left Sidebar ──
    {
      id: 'cmd-toggle-left-sidebar',
      title: (appInstance) =>
        appInstance.workspace.isSidebarOpen('left') ? 'Collapse left sidebar' : 'Expand left sidebar',
      section: 'View',
      icon: <LayoutLeftIcon size={16} />,
      hotkey: 'Ctrl+\\',
      aliases: [
        'toggle left sidebar',
        'toggle sidebar',
        'left sidebar',
        'sidebar',
        'show left sidebar',
        'hide left sidebar',
        'collapse',
        'expand',
      ],
      action: (appInstance) => {
        appInstance.workspace.toggleLeftSidebar();
      },
    },

    // ── 3. Toggle Right Sidebar ──
    {
      id: 'cmd-toggle-right-sidebar',
      title: (appInstance) =>
        appInstance.workspace.isSidebarOpen('right') ? 'Collapse right sidebar' : 'Expand right sidebar',
      section: 'View',
      icon: <LayoutRightIcon size={16} />,
      hotkey: 'Ctrl+Shift+\\',
      aliases: [
        'toggle right sidebar',
        'toggle sidebar',
        'right sidebar',
        'sidebar',
        'show right sidebar',
        'hide right sidebar',
        'collapse',
        'expand',
      ],
      action: (appInstance) => {
        appInstance.workspace.toggleRightSidebar();
      },
    },

    // ── 4. Toggle Split Pane ──
    {
      id: 'cmd-toggle-split-pane',
      title: (appInstance) =>
        appInstance.workspace.isSplitViewOpen() ? 'Close split editor pane' : 'Split editor pane',
      section: 'View',
      icon: <SplitRightIcon size={16} />,
      hotkey: 'Ctrl+Alt+\\',
      aliases: [
        'toggle split editor pane',
        'toggle split pane',
        'split editor',
        'split pane',
        'split view',
        'split',
        'close split',
      ],
      action: (appInstance) => {
        appInstance.workspace.toggleSplitView();
      },
    },

    // ── 5. Toggle Reading View ──
    {
      id: 'editor:toggle-reading-view',
      title: (appInstance) =>
        appInstance.settings.defaultTabMode === 'Reading view'
          ? 'Switch to editing view'
          : 'Switch to reading view',
      section: 'Editor',
      icon: <BookOpen01Icon size={16} />,
      hotkey: 'Ctrl+E',
      aliases: [
        'toggle reading view',
        'toggle editing view',
        'reading view',
        'editing view',
        'preview',
        'switch view',
        'toggle mode',
      ],
      action: (appInstance) => {
        const curMode = appInstance.settings.defaultTabMode;
        const next = curMode === 'Reading view' ? 'Editing view' : 'Reading view';
        appInstance.settings.setDefaultTabMode(next);
        appInstance.workspace.showToast(`Switched to ${next}`, 'info');
      },
    },

    // ── 6. Toggle Source Mode ──
    {
      id: 'editor:toggle-source-mode',
      title: (appInstance) =>
        appInstance.settings.defaultEditingMode === 'Source mode'
          ? 'Switch to live preview'
          : 'Switch to source mode',
      section: 'Editor',
      icon: <SourceCodeIcon size={16} />,
      hotkey: 'Ctrl+Alt+S',
      aliases: [
        'toggle source mode',
        'toggle live preview',
        'source mode',
        'live preview',
        'raw markdown',
        'markdown source',
        'toggle mode',
      ],
      action: (appInstance) => {
        const curMode = appInstance.settings.defaultEditingMode;
        const next = curMode === 'Source mode' ? 'Live Preview' : 'Source mode';
        appInstance.settings.setDefaultEditingMode(next);
        if (appInstance.settings.defaultTabMode === 'Reading view') {
          appInstance.settings.setDefaultTabMode('Editing view');
        }
        appInstance.workspace.showToast(`Switched to ${next}`, 'info');
      },
    },

    // ── 7. Zoom In ──
    {
      id: 'cmd-zoom-in',
      title: 'Zoom in',
      section: 'View',
      icon: <ZoomInIcon size={16} />,
      hotkey: 'Ctrl+=',
      action: (appInstance) => {
        const currentZoom = appInstance.settings.zoomLevel || 100;
        if (currentZoom >= 200) {
          appInstance.workspace.showToast('Zoom: 200% (Maximum limit reached)', 'info');
        } else {
          const nextZoom = Math.min(200, Math.round((currentZoom + 10) / 5) * 5);
          appInstance.settings.setZoomLevel(nextZoom);
          appInstance.workspace.showToast(`Zoom: ${nextZoom}%`, 'info');
        }
      },
    },

    // ── 8. Zoom Out ──
    {
      id: 'cmd-zoom-out',
      title: 'Zoom out',
      section: 'View',
      icon: <ZoomOutIcon size={16} />,
      hotkey: 'Ctrl+-',
      action: (appInstance) => {
        const currentZoom = appInstance.settings.zoomLevel || 100;
        if (currentZoom <= 50) {
          appInstance.workspace.showToast('Zoom: 50% (Minimum limit reached)', 'info');
        } else {
          const nextZoom = Math.max(50, Math.round((currentZoom - 10) / 5) * 5);
          appInstance.settings.setZoomLevel(nextZoom);
          appInstance.workspace.showToast(`Zoom: ${nextZoom}%`, 'info');
        }
      },
    },

    // ── 9. Reset Zoom ──
    {
      id: 'cmd-reset-zoom',
      title: 'Reset zoom level to 100%',
      section: 'View',
      icon: <ZoomIcon size={16} />,
      hotkey: 'Ctrl+0',
      action: (appInstance) => {
        appInstance.settings.setZoomLevel(100);
        appInstance.workspace.showToast('Zoom: 100% (Default)', 'info');
      },
    },

    // ── 10. Next Tab ──
    {
      id: 'cmd-next-tab',
      title: 'Next tab',
      section: 'View',
      icon: <ArrowRight01Icon size={16} />,
      hotkey: 'Ctrl+Tab',
      action: (appInstance) => {
        const tabs = appInstance.workspace.getTabs();
        const activeTabId = appInstance.workspace.activeTabId;
        if (tabs.length > 1) {
          const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
          const nextIndex = (currentIndex + 1) % tabs.length;
          appInstance.workspace.setActiveTab(tabs[nextIndex].id);
        }
      },
    },

    // ── 11. Previous Tab ──
    {
      id: 'cmd-prev-tab',
      title: 'Previous tab',
      section: 'View',
      icon: <ArrowLeft01Icon size={16} />,
      hotkey: 'Ctrl+Shift+Tab',
      action: (appInstance) => {
        const tabs = appInstance.workspace.getTabs();
        const activeTabId = appInstance.workspace.activeTabId;
        if (tabs.length > 1) {
          const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
          const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          appInstance.workspace.setActiveTab(tabs[prevIndex].id);
        }
      },
    },

    // ── 12. Navigate Back ──
    {
      id: 'cmd-navigate-back',
      title: 'Navigate back in history',
      section: 'Navigation',
      icon: <ArrowLeft01Icon size={16} />,
      hotkey: 'Alt+Left',
      action: async (appInstance) => {
        await appInstance.workspace.navigateBack();
      },
    },

    // ── 13. Navigate Forward ──
    {
      id: 'cmd-navigate-forward',
      title: 'Navigate forward in history',
      section: 'Navigation',
      icon: <ArrowRight01Icon size={16} />,
      hotkey: 'Alt+Right',
      action: async (appInstance) => {
        await appInstance.workspace.navigateForward();
      },
    },

    // ── 14. Open Settings ──
    {
      id: 'cmd-open-settings',
      title: 'Open Settings & Preferences',
      section: 'System',
      icon: <Settings02Icon size={16} />,
      hotkey: 'Ctrl+,',
      action: (appInstance) => {
        appInstance.workspace.openSettings();
      },
    },

    // ── 15. Open Help Modal ──
    {
      id: 'cmd-open-help',
      title: 'Open Help & Shortcuts Guide',
      section: 'System',
      icon: <HelpCircleIcon size={16} />,
      hotkey: 'F1',
      action: (appInstance) => {
        appInstance.workspace.openHelpModal();
      },
    },

    // ── 16. Undo File Action ──
    {
      id: 'workspace:undo-file-action',
      title: 'Undo file action',
      section: 'Files',
      icon: <RotateCcwIcon size={16} />,
      hotkey: 'Ctrl+Alt+Z',
      action: async (appInstance) => {
        await appInstance.workspace.undoFileAction();
      },
    },

    // ── 17. Redo File Action ──
    {
      id: 'workspace:redo-file-action',
      title: 'Redo file action',
      section: 'Files',
      icon: <RotateCcwIcon size={16} className="-scale-x-100" />,
      hotkey: 'Ctrl+Alt+Y',
      action: async (appInstance) => {
        await appInstance.workspace.redoFileAction();
      },
    },

    // ── 18. Close Active Tab ──
    {
      id: 'cmd-close-active-tab',
      title: 'Close active tab',
      section: 'Tabs',
      icon: <Cancel01Icon size={16} />,
      hotkey: 'Ctrl+W',
      isEnabled: (appInstance) => Boolean(appInstance.workspace.activeTabId),
      action: (appInstance) => {
        const activeTabId = appInstance.workspace.activeTabId;
        if (activeTabId) {
          appInstance.workspace.closeTab(activeTabId);
        }
      },
    },

    // ── 19. Close Other Tabs ──
    {
      id: 'cmd-close-other-tabs',
      title: 'Close other tabs',
      section: 'Tabs',
      icon: <CancelCircleIcon size={16} />,
      isEnabled: (appInstance) => appInstance.workspace.getTabs().length > 1,
      action: (appInstance) => {
        const tabs = appInstance.workspace.getTabs();
        const activeTabId = appInstance.workspace.activeTabId;
        tabs.forEach((tab) => {
          if (tab.id !== activeTabId) {
            appInstance.workspace.closeTab(tab.id);
          }
        });
      },
    },

    // ── 20. Toggle Fullscreen ──
    {
      id: 'cmd-toggle-fullscreen',
      title: () => (Boolean(document.fullscreenElement) ? 'Exit fullscreen' : 'Enter fullscreen'),
      section: 'View',
      icon: () =>
        Boolean(document.fullscreenElement) ? <Minimize01Icon size={16} /> : <Maximize01Icon size={16} />,
      hotkey: 'F11',
      aliases: ['toggle fullscreen', 'fullscreen', 'maximize', 'minimize', 'screen'],
      action: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      },
    },

    // ── 21. Copy Active File Path ──
    {
      id: 'cmd-copy-note-path',
      title: 'Copy active file path',
      section: 'Files',
      icon: <Copy01Icon size={16} />,
      isEnabled: (appInstance) => Boolean(appInstance.vault.activeDocument),
      action: async (appInstance) => {
        const activeDoc = appInstance.vault.activeDocument;
        if (!activeDoc) return;
        const fullPath = activeDoc.title;
        await navigator.clipboard.writeText(fullPath);
        appInstance.workspace.showToast(`Copied note name: ${fullPath}`, 'info');
      },
    },

    // ── 22. Reveal Active File in File Tree ──
    {
      id: 'cmd-reveal-in-file-tree',
      title: 'Reveal active file in file tree',
      section: 'Files',
      icon: <FolderTreeIcon size={16} />,
      aliases: ['reveal in file tree', 'show in explorer', 'locate note', 'find file in tree'],
      isEnabled: (appInstance) => Boolean(appInstance.vault.activeDocument),
      action: (appInstance) => {
        const activeDoc = appInstance.vault.activeDocument;
        if (!activeDoc) return;
        appInstance.workspace.revealInFileTree(activeDoc.id);
        appInstance.workspace.showToast(`Revealed "${activeDoc.title}" in file tree`, 'info');
      },
    },

    // ── 23. Duplicate Active Note ──
    {
      id: 'cmd-duplicate-note',
      title: 'Duplicate active note',
      section: 'Files',
      icon: <Copy01Icon size={16} />,
      aliases: ['duplicate note', 'clone note', 'copy note', 'make a copy'],
      isEnabled: (appInstance) => {
        const doc = appInstance.vault.activeDocument;
        return Boolean(doc && !doc.is_folder);
      },
      action: async (appInstance) => {
        const activeDoc = appInstance.vault.activeDocument;
        if (!activeDoc || activeDoc.is_folder) return;

        const existingTitles = new Set(
          appInstance.vault.documents
            .filter((d) => d.parent_id === activeDoc.parent_id)
            .map((d) => d.title.toLowerCase())
        );
        const match = activeDoc.title.match(/^(.*?)(?:\s+\(Copy\)|\s+Copy(?:\s+(\d+))?)?$/i);
        const baseName = match && match[1] ? match[1].trim() : activeDoc.title;
        let copyTitle = `${baseName} Copy`;
        let counter = 2;
        while (existingTitles.has(copyTitle.toLowerCase())) {
          copyTitle = `${baseName} Copy ${counter}`;
          counter++;
        }

        const newDoc = await appInstance.vault.createNewNote(copyTitle, activeDoc.parent_id);
        if (newDoc) {
          appInstance.workspace.openTab(newDoc.id, newDoc.title);
          appInstance.workspace.showToast(`Duplicated note as "${copyTitle}"`, 'info');
        }
      },
    },

    // ── 24. Delete Active Note ──
    {
      id: 'cmd-delete-active-note',
      title: 'Delete active note',
      section: 'Files',
      icon: <Delete02Icon size={16} />,
      isEnabled: (appInstance) => {
        const doc = appInstance.vault.activeDocument;
        return Boolean(doc && !doc.is_folder);
      },
      action: (appInstance) => {
        const activeDoc = appInstance.vault.activeDocument;
        if (!activeDoc) return;
        appInstance.workspace.openConfirmDialog({
          title: 'Delete file',
          message: `Are you sure you want to delete "${activeDoc.title || 'Untitled'}"?`,
          subtext: 'It will be moved to trash and can be restored within 48 hours.',
          confirmText: 'Delete',
          isDanger: true,
          onConfirm: async () => {
            await appInstance.vault.deleteDocument(activeDoc.id);
            appInstance.workspace.showToast(`Moved "${activeDoc.title}" to trash`, 'info');
          },
        });
      },
    },

    // ── 25. Reload Window ──
    {
      id: 'cmd-reload-window',
      title: 'Reload window',
      section: 'System',
      icon: <RotateCcwIcon size={16} />,
      hotkey: 'Ctrl+R',
      action: () => {
        window.location.reload();
      },
    },

    // ── 26. Document Editor Formattings (Headings, Lists, Blocks, Embeds) ──
    {
      id: 'editor:heading-1',
      title: 'Heading 1',
      section: 'Editor',
      icon: <Heading101Icon size={16} />,
      hotkey: 'Ctrl+Alt+1',
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().setNode('heading', { level: 1 }).run();
      },
    },
    {
      id: 'editor:heading-2',
      title: 'Heading 2',
      section: 'Editor',
      icon: <Heading201Icon size={16} />,
      hotkey: 'Ctrl+Alt+2',
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().setNode('heading', { level: 2 }).run();
      },
    },
    {
      id: 'editor:heading-3',
      title: 'Heading 3',
      section: 'Editor',
      icon: <Heading301Icon size={16} />,
      hotkey: 'Ctrl+Alt+3',
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().setNode('heading', { level: 3 }).run();
      },
    },
    {
      id: 'editor:heading-4',
      title: 'Heading 4',
      section: 'Editor',
      icon: <Heading401Icon size={16} />,
      hotkey: 'Ctrl+Alt+4',
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().setNode('heading', { level: 4 }).run();
      },
    },
    {
      id: 'editor:heading-5',
      title: 'Heading 5',
      section: 'Editor',
      icon: <Heading501Icon size={16} />,
      hotkey: 'Ctrl+Alt+5',
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().setNode('heading', { level: 5 }).run();
      },
    },
    {
      id: 'editor:heading-6',
      title: 'Heading 6',
      section: 'Editor',
      icon: <Heading601Icon size={16} />,
      hotkey: 'Ctrl+Alt+6',
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().setNode('heading', { level: 6 }).run();
      },
    },
    {
      id: 'editor:paragraph',
      title: 'Paragraph',
      section: 'Editor',
      icon: <ParagraphIcon size={16} />,
      hotkey: 'Ctrl+Alt+0',
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().setParagraph().run();
      },
    },
    {
      id: 'editor:bullet-list',
      title: 'Bullet list',
      section: 'Editor',
      icon: <LeftToRightListBulletIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().toggleBulletList().run();
      },
    },
    {
      id: 'editor:numbered-list',
      title: 'Numbered list',
      section: 'Editor',
      icon: <LeftToRightListNumberIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().toggleOrderedList().run();
      },
    },
    {
      id: 'editor:task-list',
      title: 'Task list',
      section: 'Editor',
      icon: <CheckmarkSquare02Icon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().toggleTaskList().run();
      },
    },
    {
      id: 'editor:quote-block',
      title: 'Quote block',
      section: 'Editor',
      icon: <QuoteDownIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().toggleBlockquote().run();
      },
    },
    {
      id: 'editor:code-block',
      title: 'Code block',
      section: 'Editor',
      icon: <CodeIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().toggleCodeBlock().run();
      },
    },
    {
      id: 'editor:divider',
      title: 'Insert divider',
      section: 'Editor',
      icon: <MinusSignIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().setHorizontalRule().run();
      },
    },
    {
      id: 'editor:callout',
      title: 'Insert callout',
      section: 'Editor',
      icon: <StickyNote02Icon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        const editor = appInstance.editor.getActiveEditor();
        if (editor) {
          const { from } = editor.state.selection;
          const isStartOfLine = editor.state.doc.resolve(from).parentOffset === 0;
          const prefix = isStartOfLine ? '' : '\n';
          editor.chain().focus().insertContent(`${prefix}> [!note] Note\n> `).run();
        }
      },
    },
    {
      id: 'editor:callout-note',
      title: 'Insert note callout',
      section: 'Editor',
      icon: <InformationCircleIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        const editor = appInstance.editor.getActiveEditor();
        if (editor) {
          const { from } = editor.state.selection;
          const isStartOfLine = editor.state.doc.resolve(from).parentOffset === 0;
          const prefix = isStartOfLine ? '' : '\n';
          editor.chain().focus().insertContent(`${prefix}> [!note] Note\n> `).run();
        }
      },
    },
    {
      id: 'editor:callout-tip',
      title: 'Insert tip callout',
      section: 'Editor',
      icon: <BulbIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        const editor = appInstance.editor.getActiveEditor();
        if (editor) {
          const { from } = editor.state.selection;
          const isStartOfLine = editor.state.doc.resolve(from).parentOffset === 0;
          const prefix = isStartOfLine ? '' : '\n';
          editor.chain().focus().insertContent(`${prefix}> [!tip] Tip\n> `).run();
        }
      },
    },
    {
      id: 'editor:callout-info',
      title: 'Insert info callout',
      section: 'Editor',
      icon: <InformationCircleIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        const editor = appInstance.editor.getActiveEditor();
        if (editor) {
          const { from } = editor.state.selection;
          const isStartOfLine = editor.state.doc.resolve(from).parentOffset === 0;
          const prefix = isStartOfLine ? '' : '\n';
          editor.chain().focus().insertContent(`${prefix}> [!info] Info\n> `).run();
        }
      },
    },
    {
      id: 'editor:callout-warning',
      title: 'Insert warning callout',
      section: 'Editor',
      icon: <AlertTriangleIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        const editor = appInstance.editor.getActiveEditor();
        if (editor) {
          const { from } = editor.state.selection;
          const isStartOfLine = editor.state.doc.resolve(from).parentOffset === 0;
          const prefix = isStartOfLine ? '' : '\n';
          editor.chain().focus().insertContent(`${prefix}> [!warning] Warning\n> `).run();
        }
      },
    },
    {
      id: 'editor:callout-caution',
      title: 'Insert caution callout',
      section: 'Editor',
      icon: <Alert02Icon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        const editor = appInstance.editor.getActiveEditor();
        if (editor) {
          const { from } = editor.state.selection;
          const isStartOfLine = editor.state.doc.resolve(from).parentOffset === 0;
          const prefix = isStartOfLine ? '' : '\n';
          editor.chain().focus().insertContent(`${prefix}> [!caution] Caution\n> `).run();
        }
      },
    },
    {
      id: 'editor:callout-important',
      title: 'Insert important callout',
      section: 'Editor',
      icon: <AlertDiamondIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        const editor = appInstance.editor.getActiveEditor();
        if (editor) {
          const { from } = editor.state.selection;
          const isStartOfLine = editor.state.doc.resolve(from).parentOffset === 0;
          const prefix = isStartOfLine ? '' : '\n';
          editor.chain().focus().insertContent(`${prefix}> [!important] Important\n> `).run();
        }
      },
    },
    {
      id: 'editor:math-block',
      title: 'Insert math block',
      section: 'Editor',
      icon: <SigmaIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        const editor = appInstance.editor.getActiveEditor();
        if (editor) {
          const { from } = editor.state.selection;
          const isStartOfLine = editor.state.doc.resolve(from).parentOffset === 0;
          if (!isStartOfLine) {
            editor.chain().focus().splitBlock().insertMathChip({ latex: '', display: 'block', startEditing: true }).run();
          } else {
            editor.chain().focus().insertMathChip({ latex: '', display: 'block', startEditing: true }).run();
          }
        }
      },
    },
    {
      id: 'editor:inline-math',
      title: 'Insert inline math',
      section: 'Editor',
      icon: <SigmaIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().insertMathChip({ latex: '', display: 'inline', startEditing: true }).run();
      },
    },
    {
      id: 'editor:insert-link',
      title: 'Insert link',
      section: 'Editor',
      icon: <Link01Icon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        const editor = appInstance.editor.getActiveEditor();
        if (editor) {
          insertOrWrapMarkdownLink(editor);
        }
      },
    },
    {
      id: 'editor:insert-wikilink',
      title: 'Insert wikilink',
      section: 'Editor',
      icon: <LinkSquare02Icon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().insertContent('[[]]').run();
      },
    },
    {
      id: 'editor:insert-note-embed',
      title: 'Insert note embed',
      section: 'Editor',
      icon: <QuoteDownIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().insertContent('![[]]').run();
      },
    },
    {
      id: 'editor:insert-media-embed',
      title: 'Insert media embed',
      section: 'Editor',
      icon: <Link01Icon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        appInstance.editor.getActiveEditor()?.chain().focus().insertContent('![]()').run();
      },
    },
    {
      id: 'editor:insert-table',
      title: 'Insert table',
      section: 'Editor',
      icon: <GridTableIcon size={16} />,
      aliases: ['table', 'grid', 'matrix', 'insert table'],
      isEnabled: isMarkdownEditorActive,
      action: (appInstance) => {
        const { tableDefaultRows, tableDefaultCols } = useSettingsStore.getState();
        const rows = tableDefaultRows || 3;
        const cols = tableDefaultCols || 3;
        const handled = appInstance.editor.dispatchAction('insertTable', { rows, cols, withHeaderRow: true });
        if (!handled) {
          appInstance.events.emit('editor:action', { action: 'insert-table', payload: { rows, cols } });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('noether:insert-table-command', { detail: { rows, cols } })
            );
          }
        }
      },
    },
  ];

  // Register each native command directly onto the application's CommandRegistry
  for (const cmd of nativeCommands) {
    app.commands.registerCommand(cmd);
  }
}
