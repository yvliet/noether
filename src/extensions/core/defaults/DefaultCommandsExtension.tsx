/**
 * @module DefaultCommandsExtension
 * @description
 * Built-in core extension that registers essential workspace command palette actions
 * and hotkeys for file creation, sidebar toggling, zoom controls, tab switching,
 * navigation history, undo/redo, and settings.
 *
 * Exclusively uses the native NoetherApp API (app.workspace, app.vault, app.settings).
 *
 * @since 0.1.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { NoetherApp } from '@/core/app/NoetherApp';
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
  SparklesIcon,
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
} from '@/components/common/Icons';
import { platform } from '@/lib/platform/platformAdapter';
import { insertOrWrapMarkdownLink } from '@/components/editor/extensions/markdown-shortcuts';
import manifest from './manifest.json';
import defaultCommandsReadme from './readme.md?raw';

const LazyDefaultCommandsSettingsTab = React.lazy(() =>
  import('./DefaultCommandsSettingsTab').then((m) => ({ default: m.DefaultCommandsSettingsTab }))
);

export const DEFAULT_COMMANDS_MANIFEST: ExtensionManifest = {
  ...(manifest as ExtensionManifest),
  readme: defaultCommandsReadme,
};

export class DefaultCommandsExtension extends Extension {
  constructor(app: NoetherApp, manifest: ExtensionManifest = DEFAULT_COMMANDS_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Quick New Note
    this.addCommand({
      id: 'cmd-new-note',
      title: 'Create new note',
      section: 'Files',
      icon: <FileAddIcon size={16} />,
      hotkey: 'Ctrl+N',
      action: async (app) => {
        app.workspace.setMainViewMode('document');
        await app.vault.createNewNote('Untitled');
      },
    });

    // 2. Toggle Left Sidebar
    this.addCommand({
      id: 'cmd-toggle-left-sidebar',
      title: (app) => (app.workspace.isSidebarOpen('left') ? 'Collapse left sidebar' : 'Expand left sidebar'),
      section: 'View',
      icon: <LayoutLeftIcon size={16} />,
      hotkey: 'Ctrl+\\',
      aliases: ['toggle left sidebar', 'toggle sidebar', 'left sidebar', 'sidebar', 'show left sidebar', 'hide left sidebar', 'collapse', 'expand'],
      action: (app) => {
        app.workspace.toggleLeftSidebar();
      },
    });

    // 3. Toggle Right Sidebar
    this.addCommand({
      id: 'cmd-toggle-right-sidebar',
      title: (app) => (app.workspace.isSidebarOpen('right') ? 'Collapse right sidebar' : 'Expand right sidebar'),
      section: 'View',
      icon: <LayoutRightIcon size={16} />,
      hotkey: 'Ctrl+Shift+\\',
      aliases: ['toggle right sidebar', 'toggle sidebar', 'right sidebar', 'sidebar', 'show right sidebar', 'hide right sidebar', 'collapse', 'expand'],
      action: (app) => {
        app.workspace.toggleRightSidebar();
      },
    });

    // 4. Toggle Split Pane
    this.addCommand({
      id: 'cmd-toggle-split-pane',
      title: (app) => (app.workspace.isSplitViewOpen() ? 'Close split editor pane' : 'Split editor pane'),
      section: 'View',
      icon: <SplitRightIcon size={16} />,
      hotkey: 'Ctrl+Alt+\\',
      aliases: ['toggle split editor pane', 'toggle split pane', 'split editor', 'split pane', 'split view', 'split', 'close split'],
      action: (app) => {
        app.workspace.toggleSplitView();
      },
    });

    // 4.1 Toggle Reading View
    this.addCommand({
      id: 'editor:toggle-reading-view',
      title: (app) => (app.settings.defaultTabMode === 'Reading view' ? 'Switch to editing view' : 'Switch to reading view'),
      section: 'Editor',
      icon: <BookOpen01Icon size={16} />,
      hotkey: 'Ctrl+E',
      aliases: ['toggle reading view', 'toggle editing view', 'reading view', 'editing view', 'preview', 'switch view', 'toggle mode'],
      action: (app) => {
        const curMode = app.settings.defaultTabMode;
        const next = curMode === 'Reading view' ? 'Editing view' : 'Reading view';
        app.settings.setDefaultTabMode(next);
        app.workspace.showToast(`Switched to ${next}`, 'info');
      },
    });

    // 4.2 Toggle Source Mode
    this.addCommand({
      id: 'editor:toggle-source-mode',
      title: (app) => (app.settings.defaultEditingMode === 'Source mode' ? 'Switch to live preview' : 'Switch to source mode'),
      section: 'Editor',
      icon: <SourceCodeIcon size={16} />,
      hotkey: 'Ctrl+Alt+S',
      aliases: ['toggle source mode', 'toggle live preview', 'source mode', 'live preview', 'raw markdown', 'markdown source', 'toggle mode'],
      action: (app) => {
        const curMode = app.settings.defaultEditingMode;
        const next = curMode === 'Source mode' ? 'Live Preview' : 'Source mode';
        app.settings.setDefaultEditingMode(next);
        if (app.settings.defaultTabMode === 'Reading view') {
          app.settings.setDefaultTabMode('Editing view');
        }
        app.workspace.showToast(`Switched to ${next}`, 'info');
      },
    });

    // 5. Zoom In
    this.addCommand({
      id: 'cmd-zoom-in',
      title: 'Zoom in',
      section: 'View',
      icon: <ZoomInIcon size={16} />,
      hotkey: 'Ctrl+=',
      action: (app) => {
        const currentZoom = app.settings.zoomLevel || 100;
        if (currentZoom >= 200) {
          app.workspace.showToast('Zoom: 200% (Maximum limit reached)', 'info');
        } else {
          const nextZoom = Math.min(200, Math.round((currentZoom + 10) / 5) * 5);
          app.settings.setZoomLevel(nextZoom);
          app.workspace.showToast(`Zoom: ${nextZoom}%`, 'info');
        }
      },
    });

    // 6. Zoom Out
    this.addCommand({
      id: 'cmd-zoom-out',
      title: 'Zoom out',
      section: 'View',
      icon: <ZoomOutIcon size={16} />,
      hotkey: 'Ctrl+-',
      action: (app) => {
        const currentZoom = app.settings.zoomLevel || 100;
        if (currentZoom <= 50) {
          app.workspace.showToast('Zoom: 50% (Minimum limit reached)', 'info');
        } else {
          const nextZoom = Math.max(50, Math.round((currentZoom - 10) / 5) * 5);
          app.settings.setZoomLevel(nextZoom);
          app.workspace.showToast(`Zoom: ${nextZoom}%`, 'info');
        }
      },
    });

    // 7. Reset Zoom
    this.addCommand({
      id: 'cmd-reset-zoom',
      title: 'Reset zoom level to 100%',
      section: 'View',
      icon: <ZoomIcon size={16} />,
      hotkey: 'Ctrl+0',
      action: (app) => {
        app.settings.setZoomLevel(100);
        app.workspace.showToast('Zoom: 100% (Default)', 'info');
      },
    });

    // 8. Next Tab
    this.addCommand({
      id: 'cmd-next-tab',
      title: 'Next tab',
      section: 'View',
      icon: <ArrowRight01Icon size={16} />,
      hotkey: 'Ctrl+Tab',
      action: (app) => {
        const tabs = app.workspace.getTabs();
        const activeTabId = app.workspace.activeTabId;
        if (tabs.length > 1) {
          const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
          const nextIndex = (currentIndex + 1) % tabs.length;
          app.workspace.setActiveTab(tabs[nextIndex].id);
        }
      },
    });

    // 9. Previous Tab
    this.addCommand({
      id: 'cmd-prev-tab',
      title: 'Previous tab',
      section: 'View',
      icon: <ArrowLeft01Icon size={16} />,
      hotkey: 'Ctrl+Shift+Tab',
      action: (app) => {
        const tabs = app.workspace.getTabs();
        const activeTabId = app.workspace.activeTabId;
        if (tabs.length > 1) {
          const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
          const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          app.workspace.setActiveTab(tabs[prevIndex].id);
        }
      },
    });

    // 10. Navigate Back
    this.addCommand({
      id: 'cmd-navigate-back',
      title: 'Navigate back in history',
      section: 'Navigation',
      icon: <ArrowLeft01Icon size={16} />,
      hotkey: 'Alt+Left',
      action: async (app) => {
        await app.workspace.navigateBack();
      },
    });

    // 11. Navigate Forward
    this.addCommand({
      id: 'cmd-navigate-forward',
      title: 'Navigate forward in history',
      section: 'Navigation',
      icon: <ArrowRight01Icon size={16} />,
      hotkey: 'Alt+Right',
      action: async (app) => {
        await app.workspace.navigateForward();
      },
    });

    // 12. Open Settings
    this.addCommand({
      id: 'cmd-open-settings',
      title: 'Open Settings & Preferences',
      section: 'System',
      icon: <Settings02Icon size={16} />,
      hotkey: 'Ctrl+,',
      action: (app) => {
        app.workspace.openSettings();
      },
    });

    // 13. Help & Hotkeys
    this.addCommand({
      id: 'cmd-open-help',
      title: 'Open Help & Shortcuts Guide',
      section: 'System',
      icon: <HelpCircleIcon size={16} />,
      hotkey: 'F1',
      action: (app) => {
        app.workspace.openHelpModal();
      },
    });

    // 14. Undo File Action
    this.addCommand({
      id: 'workspace:undo-file-action',
      title: 'Undo file action',
      section: 'Files',
      icon: <RotateCcwIcon size={16} />,
      hotkey: 'Ctrl+Alt+Z',
      action: async (app) => {
        await app.workspace.undoFileAction();
      },
    });

    // 15. Redo File Action
    this.addCommand({
      id: 'workspace:redo-file-action',
      title: 'Redo file action',
      section: 'Files',
      icon: <RotateCcwIcon size={16} className="-scale-x-100" />,
      hotkey: 'Ctrl+Alt+Y',
      action: async (app) => {
        await app.workspace.redoFileAction();
      },
    });

    // 16. Close Active Tab
    this.addCommand({
      id: 'cmd-close-active-tab',
      title: 'Close active tab',
      section: 'Tabs',
      icon: <Cancel01Icon size={16} />,
      hotkey: 'Ctrl+W',
      isEnabled: (app) => Boolean(app.workspace.activeTabId),
      action: (app) => {
        const activeTabId = app.workspace.activeTabId;
        if (activeTabId) {
          app.workspace.closeTab(activeTabId);
        }
      },
    });

    // 17. Close Other Tabs
    this.addCommand({
      id: 'cmd-close-other-tabs',
      title: 'Close other tabs',
      section: 'Tabs',
      icon: <CancelCircleIcon size={16} />,
      isEnabled: (app) => app.workspace.getTabs().length > 1,
      action: (app) => {
        const tabs = app.workspace.getTabs();
        const activeTabId = app.workspace.activeTabId;
        tabs.forEach((tab) => {
          if (tab.id !== activeTabId) {
            app.workspace.closeTab(tab.id);
          }
        });
      },
    });

    // 18. Toggle Fullscreen
    this.addCommand({
      id: 'cmd-toggle-fullscreen',
      title: () => (Boolean(document.fullscreenElement) ? 'Exit fullscreen' : 'Enter fullscreen'),
      section: 'View',
      icon: () => (Boolean(document.fullscreenElement) ? <Minimize01Icon size={16} /> : <Maximize01Icon size={16} />),
      hotkey: 'F11',
      aliases: ['toggle fullscreen', 'fullscreen', 'maximize', 'minimize', 'screen'],
      action: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      },
    });

    // 19. Copy Active File Path
    this.addCommand({
      id: 'cmd-copy-note-path',
      title: 'Copy active file path',
      section: 'Files',
      icon: <Copy01Icon size={16} />,
      isEnabled: (app) => Boolean(app.vault.activeDocument),
      action: async (app) => {
        const activeDoc = app.vault.activeDocument;
        if (!activeDoc) return;
        const fullPath = activeDoc.title;
        await navigator.clipboard.writeText(fullPath);
        app.workspace.showToast(`Copied note name: ${fullPath}`, 'info');
      },
    });

    // 20. Reveal Active File in File Tree
    this.addCommand({
      id: 'cmd-reveal-in-file-tree',
      title: 'Reveal active file in file tree',
      section: 'Files',
      icon: <FolderTreeIcon size={16} />,
      aliases: ['reveal in file tree', 'show in explorer', 'locate note', 'find file in tree'],
      isEnabled: (app) => Boolean(app.vault.activeDocument),
      action: (app) => {
        const activeDoc = app.vault.activeDocument;
        if (!activeDoc) return;
        app.workspace.revealInFileTree(activeDoc.id);
        app.workspace.showToast(`Revealed "${activeDoc.title}" in file tree`, 'info');
      },
    });

    // 21. Duplicate Active Note
    this.addCommand({
      id: 'cmd-duplicate-note',
      title: 'Duplicate active note',
      section: 'Files',
      icon: <Copy01Icon size={16} />,
      aliases: ['duplicate note', 'clone note', 'copy note', 'make a copy'],
      isEnabled: (app) => {
        const doc = app.vault.activeDocument;
        return Boolean(doc && !doc.is_folder);
      },
      action: async (app) => {
        const activeDoc = app.vault.activeDocument;
        if (!activeDoc || activeDoc.is_folder) return;

        // Smart duplicate naming: "Note" -> "Note Copy", "Note Copy" -> "Note Copy 2"
        const existingTitles = new Set(
          app.vault.documents
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

        const newDoc = await app.vault.createNewNote(copyTitle, activeDoc.parent_id);
        if (newDoc) {
          app.workspace.openTab(newDoc.id, newDoc.title);
          app.workspace.showToast(`Duplicated note as "${copyTitle}"`, 'info');
        }
      },
    });

    // 22. Delete Active Note
    this.addCommand({
      id: 'cmd-delete-active-note',
      title: 'Delete active note',
      section: 'Files',
      icon: <Delete02Icon size={16} />,
      isEnabled: (app) => {
        const doc = app.vault.activeDocument;
        return Boolean(doc && !doc.is_folder);
      },
      action: (app) => {
        const activeDoc = app.vault.activeDocument;
        if (!activeDoc) return;
        app.workspace.openConfirmDialog({
          title: 'Delete file',
          message: `Are you sure you want to delete "${activeDoc.title || 'Untitled'}"?`,
          subtext: 'It will be moved to trash and can be restored within 48 hours.',
          confirmText: 'Delete',
          isDanger: true,
          onConfirm: async () => {
            await app.vault.deleteDocument(activeDoc.id);
            app.workspace.showToast(`Moved "${activeDoc.title}" to trash`, 'info');
          },
        });
      },
    });

    // 23. Reload Window
    this.addCommand({
      id: 'cmd-reload-window',
      title: 'Reload window',
      section: 'System',
      icon: <RotateCcwIcon size={16} />,
      hotkey: 'Ctrl+R',
      action: () => {
        window.location.reload();
      },
    });

    const isMarkdownEditorActive = (app: NoetherApp): boolean => {
      const activeDoc = app.vault.activeDocument;
      if (!activeDoc || activeDoc.is_folder) return false;
      const nonMarkdownTypes = ['canvas', 'image', 'audio', 'video', 'pdf'];
      if (activeDoc.doc_type && nonMarkdownTypes.includes(activeDoc.doc_type)) {
        return false;
      }
      return Boolean(app.editor.getActiveEditor());
    };

    // 24. Document Editor Commands (Slash commands in Command Palette)
    // Headings
    this.addCommand({
      id: 'editor:heading-1',
      title: 'Heading 1',
      section: 'Editor',
      icon: <Heading101Icon size={16} />,
      hotkey: 'Ctrl+Alt+1',
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().setNode('heading', { level: 1 }).run();
      },
    });

    this.addCommand({
      id: 'editor:heading-2',
      title: 'Heading 2',
      section: 'Editor',
      icon: <Heading201Icon size={16} />,
      hotkey: 'Ctrl+Alt+2',
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().setNode('heading', { level: 2 }).run();
      },
    });

    this.addCommand({
      id: 'editor:heading-3',
      title: 'Heading 3',
      section: 'Editor',
      icon: <Heading301Icon size={16} />,
      hotkey: 'Ctrl+Alt+3',
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().setNode('heading', { level: 3 }).run();
      },
    });

    this.addCommand({
      id: 'editor:heading-4',
      title: 'Heading 4',
      section: 'Editor',
      icon: <Heading401Icon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().setNode('heading', { level: 4 }).run();
      },
    });

    this.addCommand({
      id: 'editor:heading-5',
      title: 'Heading 5',
      section: 'Editor',
      icon: <Heading501Icon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().setNode('heading', { level: 5 }).run();
      },
    });

    this.addCommand({
      id: 'editor:heading-6',
      title: 'Heading 6',
      section: 'Editor',
      icon: <Heading601Icon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().setNode('heading', { level: 6 }).run();
      },
    });

    this.addCommand({
      id: 'editor:paragraph',
      title: 'Paragraph',
      section: 'Editor',
      icon: <ParagraphIcon size={16} />,
      hotkey: 'Ctrl+Alt+0',
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().setParagraph().run();
      },
    });

    // Lists
    this.addCommand({
      id: 'editor:bullet-list',
      title: 'Bullet list',
      section: 'Editor',
      icon: <LeftToRightListBulletIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().toggleBulletList().run();
      },
    });

    this.addCommand({
      id: 'editor:numbered-list',
      title: 'Numbered list',
      section: 'Editor',
      icon: <LeftToRightListNumberIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().toggleOrderedList().run();
      },
    });

    this.addCommand({
      id: 'editor:task-list',
      title: 'Task list',
      section: 'Editor',
      icon: <CheckmarkSquare02Icon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().toggleTaskList().run();
      },
    });

    // Quotes & Code
    this.addCommand({
      id: 'editor:quote-block',
      title: 'Quote block',
      section: 'Editor',
      icon: <QuoteDownIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().toggleBlockquote().run();
      },
    });

    this.addCommand({
      id: 'editor:code-block',
      title: 'Code block',
      section: 'Editor',
      icon: <CodeIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().toggleCodeBlock().run();
      },
    });

    // Divider
    this.addCommand({
      id: 'editor:divider',
      title: 'Insert divider',
      section: 'Editor',
      icon: <MinusSignIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().setHorizontalRule().run();
      },
    });

    // Callouts
    this.addCommand({
      id: 'editor:callout',
      title: 'Insert callout',
      section: 'Editor',
      icon: <StickyNote02Icon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        const editor = app.editor.getActiveEditor();
        if (editor) {
          const { from } = editor.state.selection;
          const isStartOfLine = editor.state.doc.resolve(from).parentOffset === 0;
          const prefix = isStartOfLine ? '' : '\n';
          editor.chain().focus().insertContent(`${prefix}> [!note] Note\n> `).run();
        }
      },
    });

    this.addCommand({
      id: 'editor:callout-note',
      title: 'Insert note callout',
      section: 'Editor',
      icon: <InformationCircleIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        const editor = app.editor.getActiveEditor();
        if (editor) {
          const { from } = editor.state.selection;
          const isStartOfLine = editor.state.doc.resolve(from).parentOffset === 0;
          const prefix = isStartOfLine ? '' : '\n';
          editor.chain().focus().insertContent(`${prefix}> [!note] Note\n> `).run();
        }
      },
    });

    this.addCommand({
      id: 'editor:callout-tip',
      title: 'Insert tip callout',
      section: 'Editor',
      icon: <BulbIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        const editor = app.editor.getActiveEditor();
        if (editor) {
          const { from } = editor.state.selection;
          const isStartOfLine = editor.state.doc.resolve(from).parentOffset === 0;
          const prefix = isStartOfLine ? '' : '\n';
          editor.chain().focus().insertContent(`${prefix}> [!tip] Tip\n> `).run();
        }
      },
    });

    this.addCommand({
      id: 'editor:callout-info',
      title: 'Insert info callout',
      section: 'Editor',
      icon: <InformationCircleIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        const editor = app.editor.getActiveEditor();
        if (editor) {
          const { from } = editor.state.selection;
          const isStartOfLine = editor.state.doc.resolve(from).parentOffset === 0;
          const prefix = isStartOfLine ? '' : '\n';
          editor.chain().focus().insertContent(`${prefix}> [!info] Info\n> `).run();
        }
      },
    });

    this.addCommand({
      id: 'editor:callout-warning',
      title: 'Insert warning callout',
      section: 'Editor',
      icon: <AlertTriangleIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        const editor = app.editor.getActiveEditor();
        if (editor) {
          const { from } = editor.state.selection;
          const isStartOfLine = editor.state.doc.resolve(from).parentOffset === 0;
          const prefix = isStartOfLine ? '' : '\n';
          editor.chain().focus().insertContent(`${prefix}> [!warning] Warning\n> `).run();
        }
      },
    });

    this.addCommand({
      id: 'editor:callout-caution',
      title: 'Insert caution callout',
      section: 'Editor',
      icon: <Alert02Icon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        const editor = app.editor.getActiveEditor();
        if (editor) {
          const { from } = editor.state.selection;
          const isStartOfLine = editor.state.doc.resolve(from).parentOffset === 0;
          const prefix = isStartOfLine ? '' : '\n';
          editor.chain().focus().insertContent(`${prefix}> [!caution] Caution\n> `).run();
        }
      },
    });

    this.addCommand({
      id: 'editor:callout-important',
      title: 'Insert important callout',
      section: 'Editor',
      icon: <AlertDiamondIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        const editor = app.editor.getActiveEditor();
        if (editor) {
          const { from } = editor.state.selection;
          const isStartOfLine = editor.state.doc.resolve(from).parentOffset === 0;
          const prefix = isStartOfLine ? '' : '\n';
          editor.chain().focus().insertContent(`${prefix}> [!important] Important\n> `).run();
        }
      },
    });

    // Math Blocks
    this.addCommand({
      id: 'editor:math-block',
      title: 'Insert math block',
      section: 'Editor',
      icon: <SigmaIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        const editor = app.editor.getActiveEditor();
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
    });

    this.addCommand({
      id: 'editor:inline-math',
      title: 'Insert inline math',
      section: 'Editor',
      icon: <SigmaIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().insertMathChip({ latex: '', display: 'inline', startEditing: true }).run();
      },
    });

    // Links & Embeds
    this.addCommand({
      id: 'editor:insert-link',
      title: 'Insert link',
      section: 'Editor',
      icon: <Link01Icon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        const editor = app.editor.getActiveEditor();
        if (editor) {
          insertOrWrapMarkdownLink(editor);
        }
      },
    });

    this.addCommand({
      id: 'editor:insert-wikilink',
      title: 'Insert wikilink',
      section: 'Editor',
      icon: <LinkSquare02Icon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().insertContent('[[]]').run();
      },
    });

    this.addCommand({
      id: 'editor:insert-note-embed',
      title: 'Insert note embed',
      section: 'Editor',
      icon: <QuoteDownIcon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().insertContent('![[]]').run();
      },
    });

    this.addCommand({
      id: 'editor:insert-media-embed',
      title: 'Insert media embed',
      section: 'Editor',
      icon: <Link01Icon size={16} />,
      isEnabled: isMarkdownEditorActive,
      action: (app) => {
        app.editor.getActiveEditor()?.chain().focus().insertContent('![]()').run();
      },
    });

    // 16. Register MCP Tools
    this.registerTool({
      name: 'create_note',
      description: 'Create a new markdown note in the active Vault.',
      category: 'workspace',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title or filename of the new note (defaults to "Untitled")',
          },
        },
        required: ['title'],
      },
      handler: async (args: Record<string, unknown>, app: NoetherApp): Promise<McpToolResult> => {
        try {
          const title = (args.title as string) || 'Untitled';
          app.workspace.setMainViewMode('document');
          const doc = await app.vault.createNewNote(title);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  id: doc?.id,
                  title: doc?.title || title,
                }),
              },
            ],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    this.registerTool({
      name: 'toggle_sidebar',
      description: 'Toggle the left or right sidebar visibility in the workspace.',
      category: 'workspace',
      parameters: {
        type: 'object',
        properties: {
          side: {
            type: 'string',
            enum: ['left', 'right'],
            description: 'Which sidebar to toggle (left or right)',
          },
        },
        required: ['side'],
      },
      handler: async (args: Record<string, unknown>, app: NoetherApp): Promise<McpToolResult> => {
        const side = args.side === 'right' ? 'right' : 'left';
        if (side === 'right') {
          app.workspace.toggleRightSidebar();
        } else {
          app.workspace.toggleLeftSidebar();
        }
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, side }) }],
        };
      },
    });

    this.registerTool({
      name: 'toggle_split_view',
      description: 'Toggle the split editor pane in the active workspace.',
      category: 'workspace',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async (_args: Record<string, unknown>, app: NoetherApp): Promise<McpToolResult> => {
        app.workspace.toggleSplitView();
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, splitViewToggled: true }) }],
        };
      },
    });

    // 17. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'commands-settings',
      name: 'Default commands',
      icon: <Settings02Icon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyDefaultCommandsSettingsTab />
        </React.Suspense>
      ),
    });
  }
}

