/**
 * @module DefaultCommandsExtension
 * @description
 * Built-in core extension that registers essential workspace command palette actions
 * and hotkeys for file creation, sidebar toggling, zoom controls, tab switching,
 * navigation history, undo/redo, and settings.
 *
 * Exclusively uses the native FlintApp API (app.workspace, app.vault, app.settings).
 *
 * @since 0.1.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
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
} from '@/components/common/Icons';
import { platform } from '@/lib/platform/platformAdapter';
import { defaultCommandsReadme } from './defaultCommandsReadme';

const LazyDefaultCommandsSettingsTab = React.lazy(() =>
  import('./DefaultCommandsSettingsTab').then((m) => ({ default: m.DefaultCommandsSettingsTab }))
);

export const DEFAULT_COMMANDS_MANIFEST: ExtensionManifest = {
  id: 'default-commands',
  name: 'Default Workspace Commands',
  version: '1.0.0',
  description: 'Standard built-in commands for file management, sidebar toggling, and settings.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['commands', 'palette', 'hotkeys', 'shortcuts', 'workspace'],
  readme: defaultCommandsReadme,
};

export class DefaultCommandsExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = DEFAULT_COMMANDS_MANIFEST) {
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
      title: 'Toggle Left Sidebar',
      section: 'View',
      icon: <LayoutLeftIcon size={16} />,
      hotkey: 'Ctrl+\\',
      action: (app) => {
        app.workspace.toggleLeftSidebar();
      },
    });

    // 3. Toggle Right Sidebar
    this.addCommand({
      id: 'cmd-toggle-right-sidebar',
      title: 'Toggle Right Sidebar',
      section: 'View',
      icon: <LayoutRightIcon size={16} />,
      hotkey: 'Ctrl+Shift+\\',
      action: (app) => {
        app.workspace.toggleRightSidebar();
      },
    });

    // 4. Toggle Split Pane
    this.addCommand({
      id: 'cmd-toggle-split-pane',
      title: 'Toggle Split Editor Pane',
      section: 'View',
      hotkey: 'Ctrl+Alt+\\',
      action: (app) => {
        app.workspace.toggleSplitView();
      },
    });

    // 4.1 Toggle Reading View
    this.addCommand({
      id: 'editor:toggle-reading-view',
      title: 'Toggle Reading view',
      section: 'Editor',
      icon: <BookOpen01Icon size={16} />,
      hotkey: 'Ctrl+E',
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
      title: 'Toggle Source mode',
      section: 'Editor',
      icon: <SourceCodeIcon size={16} />,
      hotkey: 'Ctrl+Alt+S',
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
      title: 'Undo file action (restore deleted or renamed file)',
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
      hotkey: 'Ctrl+Alt+Y',
      action: async (app) => {
        await app.workspace.redoFileAction();
      },
    });

    // 16. Register Extension Settings Tab
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

// Backwards-compat alias
export const DefaultCommandsPlugin = DefaultCommandsExtension;
