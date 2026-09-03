/**
 * @module FlintApp
 * @description
 * Central application singleton and host context aggregator for Flint.
 * Serves as the primary public API surface for plugins, exposing registries,
 * the EventBus, PluginManager, and convenience proxies for Workspace, Vault,
 * and Settings state.
 *
 * @since 0.1.0
 */

import React from 'react';
import { BookOpen01Icon } from '@/components/common/Icons';
import { CommandRegistry } from '../registries/CommandRegistry';
import { ViewRegistry } from '../registries/ViewRegistry';
import { ActionRailRegistry } from '../registries/ActionRailRegistry';
import { SidebarRegistry } from '../registries/SidebarRegistry';
import { StatusBarRegistry } from '../registries/StatusBarRegistry';
import { EditorRegistry } from '../registries/EditorRegistry';
import { SettingRegistry } from '../registries/SettingRegistry';
import { ContextMenuRegistry } from '../registries/ContextMenuRegistry';
import { ModalRegistry } from '../registries/ModalRegistry';
import { PropertyRegistry } from '../registries/PropertyRegistry';
import { TabDecoratorRegistry } from '../registries/TabDecoratorRegistry';
import { ToolRegistry } from '../registries/ToolRegistry';
import { registerNativeTools } from '../mcp/NativeMcpTools';
import { EventBus } from '../events/EventBus';
import { ExtensionManager } from '../extensions/ExtensionManager';
import { storeRefs, bindFlintStores, setAppInstanceBridge } from './storeBridge';
import type {
  WorkspaceAPI,
  HearthAPI,
  VaultAPI,
  SettingsAPI,
  ConfirmDialogConfig,
  InputDialogConfig,
} from './apiTypes';
import type { TabItem, DocumentItem, DocumentProperties } from '@/types';
import type { ContextMenuItemDefinition, OpenTabOptions } from '../extensions/types';

export { bindFlintStores };

const LazyExtensionDocViewer = React.lazy(() =>
  import('@/components/extension-viewer/ExtensionDocViewer').then((m) => ({ default: m.ExtensionDocViewer }))
);
const LazyPluginDocViewer = LazyExtensionDocViewer;

export class FlintApp {
  /** Command registry managing keyboard hotkeys and command palette actions. */
  public commands: CommandRegistry;
  /** View registry managing main content view tabs (Graph, Canvas, Marketplace, etc.). */
  public views: ViewRegistry;
  /** Action Rail registry managing left sidebar activity icons. */
  public actionRail: ActionRailRegistry;
  /** Sidebar registry managing left/right sidebar tabs and file tree decorators. */
  public sidebars: SidebarRegistry;
  /** Status bar registry managing bottom information metrics and widgets. */
  public statusBar: StatusBarRegistry;
  /** Editor registry managing TipTap extensions, slash commands, headers, and footers. */
  public editor: EditorRegistry;
  /** Settings registry managing extension configuration tabs. */
  public settingsRegistry: SettingRegistry;
  /** Context menu registry managing right-click context menu actions. */
  public contextMenu: ContextMenuRegistry;
  /** Modal registry managing full-screen overlay dialogs. */
  public modals: ModalRegistry;
  /** Property registry managing frontmatter property types, icons, and visibility filters. */
  public properties: PropertyRegistry;
  /** Tab decorator registry managing custom tab titles, icons, and tooltips. */
  public tabDecorators: TabDecoratorRegistry;
  /** MCP Tool registry managing AI agent callable tool definitions. */
  public tools: ToolRegistry;
  /** Central event bus for decoupled inter-extension and system communications. */
  public events: EventBus;
  /** Extensions manager overseeing discovery, loading, enable/disable states, and sandbox. */
  public extensions: ExtensionManager;

  /** Backwards-compatibility alias for actionRail */
  public get ribbon(): ActionRailRegistry {
    return this.actionRail;
  }

  /** Backwards-compatibility alias for extensions */
  public get plugins(): ExtensionManager {
    return this.extensions;
  }

  constructor() {
    this.commands = new CommandRegistry();
    this.views = new ViewRegistry();
    this.actionRail = new ActionRailRegistry();
    this.sidebars = new SidebarRegistry();
    this.statusBar = new StatusBarRegistry();
    this.editor = new EditorRegistry();
    this.settingsRegistry = new SettingRegistry();
    this.contextMenu = new ContextMenuRegistry();
    this.modals = new ModalRegistry();
    this.properties = new PropertyRegistry();
    this.tabDecorators = new TabDecoratorRegistry();
    this.tools = new ToolRegistry(this);
    this.events = new EventBus();
    this.extensions = new ExtensionManager(this);
    setAppInstanceBridge(this);

    // Register Native Vault-Level MCP Tools
    registerNativeTools(this);

    // Register built-in Extension & Plugin Document Viewer
    this.views.registerView({
      type: 'extension-doc',
      title: 'Extension Documentation',
      icon: React.createElement(BookOpen01Icon, { size: 14 }),
      render: (props) =>
        React.createElement(
          React.Suspense,
          { fallback: null },
          React.createElement(LazyExtensionDocViewer, props)
        ),
    });
    this.views.registerView({
      type: 'plugin-doc',
      title: 'Extension Documentation',
      icon: React.createElement(BookOpen01Icon, { size: 14 }),
      render: (props) =>
        React.createElement(
          React.Suspense,
          { fallback: null },
          React.createElement(LazyExtensionDocViewer, props)
        ),
    });
  }

  /**
   * Access to settings registry for backwards compatibility.
   * Plugins should register settings tabs via `this.registerSettingTab()` or `app.settingsRegistry`.
   */
  public get settingsTabRegistry(): SettingRegistry {
    return this.settingsRegistry;
  }

  /**
   * Workspace API — controls UI state: tabs, sidebars, view modes, dialogs, and navigation.
   * @see WorkspaceAPI
   * @since 0.1.0
   */
  public get workspace(): WorkspaceAPI {
    return {
      // ── Tab State ──
      get activeTabId(): string | null {
        return storeRefs.workspace?.getState()?.activeTabId ?? null;
      },
      get mainViewMode(): string {
        return storeRefs.workspace?.getState()?.mainViewMode ?? 'document';
      },
      getTabs(): readonly TabItem[] {
        return storeRefs.workspace?.getState()?.tabs ?? [];
      },
      setActiveTab: (tabId: string): void => {
        storeRefs.workspace?.getState()?.setActiveTabId(tabId);
      },
      setMainViewMode: (mode: string): void => {
        storeRefs.workspace?.getState()?.setMainViewMode(mode);
      },
      openTab: (docId: string, title?: string, options?: OpenTabOptions): void => {
        storeRefs.workspace?.getState()?.openTab(docId, title, options);
      },
      closeTab: (tabId: string): void => {
        storeRefs.workspace?.getState()?.closeTab(tabId);
      },
      openCustomTab: (options: {
        id?: string;
        viewType: string;
        title: string;
        icon?: React.ReactNode;
        documentId?: string;
      }): void => {
        storeRefs.workspace?.getState()?.openCustomTab(options);
      },
      openViewTab: (viewType: string, title?: string, icon?: React.ReactNode): void => {
        storeRefs.workspace?.getState()?.openCustomTab({
          viewType,
          title: title || viewType.charAt(0).toUpperCase() + viewType.slice(1),
          icon,
        });
      },
      openExtensionDocTab: (extensionId: string, title?: string): void => {
        storeRefs.workspace?.getState()?.openExtensionDocTab(extensionId, title);
      },
      openPluginDocTab: (pluginId: string, title?: string): void => {
        storeRefs.workspace?.getState()?.openExtensionDocTab(pluginId, title);
      },

      // ── Sidebars ──
      toggleLeftSidebar: (): void => {
        storeRefs.workspace?.getState()?.toggleLeftSidebar();
      },
      toggleRightSidebar: (): void => {
        storeRefs.workspace?.getState()?.toggleRightSidebar();
      },
      setSidebarOpen: (side: 'left' | 'right', open: boolean): void => {
        if (side === 'left') {
          storeRefs.workspace?.getState()?.setIsLeftSidebarOpen(open);
        } else {
          storeRefs.workspace?.getState()?.setIsRightSidebarOpen(open);
        }
      },
      setActiveSidebarTab: (side: 'left' | 'right', tabId: string): void => {
        if (side === 'left') {
          storeRefs.workspace?.getState()?.setActiveLeftView(tabId);
        } else {
          storeRefs.workspace?.getState()?.setActiveRightTab(tabId);
        }
      },

      // ── Split View ──
      toggleSplitView: (): void => {
        storeRefs.workspace?.getState()?.toggleSplitView();
      },

      // ── Navigation ──
      navigateBack: async (): Promise<void> => {
        await storeRefs.workspace?.getState()?.navigateBack();
      },
      navigateForward: async (): Promise<void> => {
        await storeRefs.workspace?.getState()?.navigateForward();
      },

      // ── File Action History ──
      undoFileAction: async (): Promise<void> => {
        await storeRefs.fileHistory?.getState()?.undo();
      },
      redoFileAction: async (): Promise<void> => {
        await storeRefs.fileHistory?.getState()?.redo();
      },

      // ── Dialogs & Overlays ──
      showToast: (message: string, type?: 'info' | 'success' | 'warning'): void => {
        storeRefs.workspace?.getState()?.showToast(message, type);
      },
      openConfirmDialog: (config: ConfirmDialogConfig): void => {
        storeRefs.workspace?.getState()?.openConfirmDialog(config);
      },
      openInputDialog: (config: InputDialogConfig): void => {
        storeRefs.workspace?.getState()?.openInputDialog(config);
      },
      promptFolderSelection: (config: any): void => {
        storeRefs.workspace?.getState()?.promptFolderSelection(config);
      },
      cancelFolderSelection: (): void => {
        storeRefs.workspace?.getState()?.cancelFolderSelection();
      },
      openCommandPalette: (): void => {
        storeRefs.workspace?.getState()?.setIsCommandPaletteOpen(true);
      },
      openQuickOpen: (): void => {
        storeRefs.workspace?.getState()?.setIsCommandPaletteOpen(true);
      },
      openSettings: (tabId?: string): void => {
        storeRefs.workspace?.getState()?.setIsSettingsOpen(true, tabId);
      },
      openHelpModal: (): void => {
        storeRefs.workspace?.getState()?.setIsHelpModalOpen(true);
      },
      showContextMenu: (
        eventOrCoords: React.MouseEvent | MouseEvent | { x: number; y: number },
        items: ContextMenuItemDefinition[],
        options?: Record<string, unknown>
      ): void => {
        storeRefs.contextMenu?.getState()?.openContextMenu(eventOrCoords, items, options);
      },
      closeContextMenu: (): void => {
        storeRefs.contextMenu?.getState()?.closeContextMenu();
      },

      // ── Read-Only State ──
      get isDatabaseActive(): boolean {
        return storeRefs.workspace?.getState()?.isDatabaseActive ?? true;
      },
      get wordCount(): number {
        return storeRefs.workspace?.getState()?.wordCount ?? 0;
      },
      get charCount(): number {
        return storeRefs.workspace?.getState()?.charCount ?? 0;
      },
      get backlinkCount(): number {
        return storeRefs.workspace?.getState()?.backlinkCount ?? 0;
      },
    };
  }

  /**
   * Hearth API — interacts with notes, documents, and database persistence.
   * @see HearthAPI
   * @since 0.1.0
   */
  public get hearth(): HearthAPI {
    return {
      get documents(): DocumentItem[] {
        return storeRefs.document?.getState()?.documents ?? [];
      },
      get activeDocument(): DocumentItem | null {
        return storeRefs.document?.getState()?.activeDocument ?? null;
      },
      get hearthName(): string {
        return storeRefs.workspace?.getState()?.hearthName ?? storeRefs.workspace?.getState()?.vaultName ?? '';
      },
      get hearthPath(): string {
        return storeRefs.workspace?.getState()?.hearthPath ?? storeRefs.workspace?.getState()?.vaultPath ?? '';
      },
      get vaultName(): string {
        return this.hearthName;
      },
      get vaultPath(): string {
        return this.hearthPath;
      },
      getDocumentById: (docId: string): DocumentItem | undefined => {
        return storeRefs.document?.getState()?.documents.find((d: DocumentItem) => d.id === docId);
      },
      createNewNote: async (
        title?: string,
        parentId?: string | null
      ): Promise<DocumentItem | undefined> => {
        return storeRefs.document?.getState()?.createNewNote(title, parentId);
      },
      createNewDocument: async (
        title?: string,
        parentId?: string | null,
        docType?: string
      ): Promise<DocumentItem | undefined> => {
        return storeRefs.document?.getState()?.createNewDocument(title, parentId, docType);
      },
      createNewCanvas: async (): Promise<DocumentItem | undefined> => {
        return storeRefs.document?.getState()?.createNewCanvas();
      },
      openDocument: async (id: string): Promise<void> => {
        await storeRefs.document?.getState()?.setActiveDocumentById(id);
      },
      saveDocument: async (id: string, contentJson: string, title?: string): Promise<void> => {
        await storeRefs.document?.getState()?.saveDocumentById(id, contentJson, title);
      },
      deleteDocument: async (id: string): Promise<void> => {
        await storeRefs.document?.getState()?.removeDocument(id);
      },
      renameDocument: async (id: string, newTitle: string): Promise<void> => {
        await storeRefs.document?.getState()?.renameDocument(id, newTitle);
      },
      toggleBookmark: async (docId: string): Promise<boolean> => {
        await storeRefs.document?.getState()?.toggleBookmark(docId);
        const doc = storeRefs.document?.getState()?.documents.find((d: DocumentItem) => d.id === docId);
        return Boolean(doc?.is_bookmarked);
      },
      getDocumentProperties: (docId: string): DocumentProperties => {
        const doc = storeRefs.document?.getState()?.documents.find((d: DocumentItem) => d.id === docId);
        if (!doc?.properties) return {};
        try {
          return typeof doc.properties === 'string' ? JSON.parse(doc.properties) : doc.properties;
        } catch {
          return {};
        }
      },
      updateDocumentProperties: async (
        docId: string,
        properties: Partial<DocumentProperties>
      ): Promise<void> => {
        const doc = storeRefs.document?.getState()?.documents.find((d: DocumentItem) => d.id === docId);
        if (!doc) return;
        let existing: Record<string, unknown> = {};
        if (doc.properties) {
          try {
            existing = typeof doc.properties === 'string' ? JSON.parse(doc.properties) : doc.properties;
          } catch {
            existing = {};
          }
        }
        const merged: Record<string, unknown> = { ...existing };
        for (const [key, value] of Object.entries(properties)) {
          if (value === null || value === undefined) {
            delete merged[key];
          } else {
            merged[key] = value;
          }
        }
        await storeRefs.document?.getState()?.updateProperties(docId, merged);
      },
    };
  }

  /**
   * Backwards-compatibility alias for hearth API.
   * @see VaultAPI
   * @since 0.1.0
   */
  public get vault(): HearthAPI {
    return this.hearth;
  }

  /**
   * Settings API — application preferences and interface configuration.
   * @see SettingsAPI
   * @since 0.2.0
   */
  public get settings(): SettingsAPI {
    return {
      get zoomLevel(): number {
        return storeRefs.settings?.getState()?.zoomLevel ?? 100;
      },
      setZoomLevel: (level: number): void => {
        const clamped = Math.max(50, Math.min(200, Math.round(level)));
        storeRefs.settings?.getState()?.setZoomLevel(clamped);
      },
      get defaultTabMode(): string {
        return storeRefs.settings?.getState()?.defaultTabMode ?? 'Editing view';
      },
      setDefaultTabMode(mode: string): void {
        storeRefs.settings?.getState()?.setDefaultTabMode(mode);
      },
      get defaultEditingMode(): string {
        return storeRefs.settings?.getState()?.defaultEditingMode ?? 'Live Preview';
      },
      setDefaultEditingMode(mode: string): void {
        storeRefs.settings?.getState()?.setDefaultEditingMode(mode);
      },
    };
  }
}

// Global Singleton Instance
export const appInstance = new FlintApp();
