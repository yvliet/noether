/**
 * @module Extension
 * @description
 * Abstract base class for all Flint extensions. Provides lifecycle management,
 * automatic resource disposal tracking, and convenience methods for registering
 * extension points (commands, views, sidebar tabs, action rail items, editor tools).
 *
 * Extension authors extend this class and implement `onload()`:
 *
 * @example
 * ```ts
 * import { Extension } from 'flint';
 *
 * export default class MyExtension extends Extension {
 *   onload() {
 *     this.addCommand({
 *       id: 'my-command',
 *       title: 'Do something',
 *       action: (app) => app.workspace.showToast('Done!'),
 *     });
 *   }
 * }
 * ```
 *
 * @since 0.2.0
 */

import React from 'react';
import type { FlintApp } from '../app/FlintApp';
import type { EventKey, EventCallback } from '../events/events';
import {
  ExtensionManifest,
  Disposable,
  CommandItem,
  ActionRailItem,
  StatusBarItem,
  ViewDefinition,
  SidebarTabDefinition,
  SlashCommandDefinition,
  ExtensionSettingTab,
  TiptapExtensionFactory,
  DocumentHeaderDefinition,
  DocumentFooterDefinition,
  DocMenuActionDefinition,
  FileTreeActionDefinition,
  EditorPlaceholderHint,
  ContextMenuItemDefinition,
  ModalDefinition,
  PropertyTypeDefinition,
  PropertyFilterDefinition,
  PropertyIconDefinition,
  FileTreeSectionDefinition,
  FileTreeItemDecorator,
  TabDecoratorDefinition,
  BreadcrumbProviderDefinition,
  McpToolDefinition,
  McpPromptDefinition,
} from './types';

export abstract class Extension {
  /**
   * Reference to the central Flint host application instance.
   * Gives access to `app.workspace`, `app.hearth`, `app.settings`, registries, and events.
   */
  public app: FlintApp;

  /**
   * Static manifest metadata describing this extension.
   */
  public manifest: ExtensionManifest;

  /**
   * Internal list of disposables registered during the extension's active lifecycle.
   * All entries are automatically disposed when the extension unloads.
   */
  private disposables: Disposable[] = [];

  constructor(app: FlintApp, manifest: ExtensionManifest) {
    this.app = app;
    this.manifest = manifest;
  }

  /**
   * Lifecycle entry point called when the extension is loaded and enabled.
   * Override this method to register commands, views, settings tabs, and event listeners.
   *
   * @since 0.2.0
   */
  public abstract onload(): void | Promise<void>;

  /**
   * Optional cleanup lifecycle hook called when the extension is disabled or unloaded.
   * Standard registrations tracked by `registerDisposable()` are cleaned up automatically.
   *
   * @since 0.2.0
   */
  public onunload(): void | Promise<void> {
    // Override if custom cleanup is needed
  }

  /**
   * Automatically disposes all registered extension points, event listeners, and resources.
   * Invoked internally by the `ExtensionManager` when disabling or removing an extension.
   *
   * @since 0.2.0
   */
  public unload(): void {
    try {
      this.onunload();
    } catch (err) {
      console.error(`[Extension:${this.manifest.id}] Error in onunload:`, err);
    }

    for (const d of this.disposables) {
      try {
        d.dispose();
      } catch (err) {
        console.error(`[Extension:${this.manifest.id}] Error disposing resource:`, err);
      }
    }
    this.disposables = [];
  }

  /**
   * Tracks a disposable resource for automatic cleanup upon extension unload.
   *
   * @param disposable - An object with a `dispose()` method.
   * @returns The passed disposable for chaining.
   * @since 0.1.0
   */
  public registerDisposable(disposable: Disposable): Disposable {
    this.disposables.push(disposable);
    return disposable;
  }

  /**
   * Subscribes to an application event with automatic cleanup on extension unload.
   *
   * @param event - The event key to listen for.
   * @param callback - Handler function invoked when the event fires.
   * @returns A Disposable that can be used to unsubscribe early.
   *
   * @example
   * ```ts
   * this.onEvent('document:saved', ({ id, title }) => {
   *   console.log(`Document "${title}" was saved.`);
   * });
   * ```
   *
   * @since 0.2.0
   */
  public onEvent<K extends EventKey>(
    event: K,
    callback: EventCallback<K>
  ): Disposable {
    const d = this.app.events.on(event, callback);
    return this.registerDisposable(d);
  }

  /**
   * Registers a command accessible in the command palette and assignable to hotkeys.
   *
   * @param command - Command item configuration.
   * @returns A Disposable to unregister the command.
   * @since 0.1.0
   */
  public addCommand(command: CommandItem): Disposable {
    const d = this.app.commands.registerCommand(command);
    return this.registerDisposable(d);
  }

  /**
   * Registers an icon button in the left action rail bar.
   *
   * @param id - Relative action rail item identifier.
   * @param icon - React node for the icon.
   * @param title - Hover tooltip text.
   * @param onClick - Click handler callback.
   * @param order - Optional sorting order priority.
   * @param isActive - Optional active state boolean or predicate.
   * @returns A Disposable to unregister the item.
   * @since 0.2.0
   */
  public addActionRailIcon(
    id: string,
    icon: React.ReactNode,
    title: string,
    onClick: (app: FlintApp) => void | Promise<void>,
    order?: number,
    isActive?: boolean | ((app: FlintApp) => boolean)
  ): Disposable {
    const item: ActionRailItem = {
      id: `${this.manifest.id}:${id}`,
      icon,
      title,
      onClick,
      order,
      isActive,
    };
    const d = this.app.actionRail.registerActionRailItem(item);
    return this.registerDisposable(d);
  }

  /**
   * Backwards compatibility alias for addActionRailIcon.
   * @since 0.1.0
   */
  public addRibbonIcon(
    id: string,
    icon: React.ReactNode,
    title: string,
    onClick: (app: FlintApp) => void | Promise<void>,
    order?: number,
    isActive?: boolean | ((app: FlintApp) => boolean)
  ): Disposable {
    return this.addActionRailIcon(id, icon, title, onClick, order, isActive);
  }

  /**
   * Registers a widget in the bottom status bar.
   *
   * @param item - Status bar item configuration.
   * @returns A Disposable to unregister the status bar item.
   * @since 0.1.0
   */
  public addStatusBarItem(item: StatusBarItem): Disposable {
    const d = this.app.statusBar.registerStatusBarItem({
      ...item,
      id: `${this.manifest.id}:${item.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers a custom workspace view type rendered in the main content tab area.
   *
   * @param view - View definition configuration.
   * @returns A Disposable to unregister the view.
   * @since 0.1.0
   */
  public registerView(view: ViewDefinition): Disposable {
    const d = this.app.views.registerView({
      ...view,
      extensionId: this.manifest.id,
      pluginId: this.manifest.id,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers a sidebar panel tab in the left or right sidebar container.
   *
   * @param tab - Sidebar tab configuration.
   * @returns A Disposable to unregister the sidebar tab.
   * @since 0.1.0
   */
  public registerSidebarTab(tab: SidebarTabDefinition): Disposable {
    const d = this.app.sidebars.registerSidebarTab({
      ...tab,
      id: `${this.manifest.id}:${tab.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers a TipTap / ProseMirror rich text editor extension.
   *
   * @param factory - Factory function returning the TipTap Extension.
   * @returns A Disposable to unregister the extension.
   * @since 0.1.0
   */
  public registerEditorExtension(factory: TiptapExtensionFactory): Disposable {
    const d = this.app.editor.registerExtension(factory);
    return this.registerDisposable(d);
  }

  /**
   * Registers an autocomplete slash command in the editor.
   *
   * @param item - Slash command definition.
   * @returns A Disposable to unregister the slash command.
   * @since 0.1.0
   */
  public registerSlashCommand(item: SlashCommandDefinition): Disposable {
    const d = this.app.editor.registerSlashCommand(item);
    return this.registerDisposable(d);
  }

  /**
   * Registers a custom settings tab in the application settings modal.
   *
   * @param tab - Extension settings tab definition.
   * @returns A Disposable to unregister the settings tab.
   * @since 0.1.0
   */
  public registerSettingTab(tab: ExtensionSettingTab): Disposable {
    const tabId = tab.id.startsWith(`${this.manifest.id}:`)
      ? tab.id
      : `${this.manifest.id}:${tab.id}`;
    const d = this.app.settingsRegistry.registerSettingTab({
      ...tab,
      id: tabId,
      pluginId: this.manifest.id,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers a widget rendered above the note content in the editor.
   *
   * @param header - Document header definition.
   * @returns A Disposable to unregister the header widget.
   * @since 0.1.0
   */
  public registerDocumentHeader(header: DocumentHeaderDefinition): Disposable {
    const d = this.app.editor.registerDocumentHeader({
      ...header,
      id: `${this.manifest.id}:${header.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers a widget rendered below the note content in the editor.
   *
   * @param footer - Document footer definition.
   * @returns A Disposable to unregister the footer widget.
   * @since 0.1.0
   */
  public registerDocumentFooter(footer: DocumentFooterDefinition): Disposable {
    const d = this.app.editor.registerDocumentFooter({
      ...footer,
      id: `${this.manifest.id}:${footer.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers an action in the document header dropdown menu ("...").
   *
   * @param action - Document menu action definition.
   * @returns A Disposable to unregister the menu action.
   * @since 0.1.0
   */
  public registerDocMenuAction(action: DocMenuActionDefinition): Disposable {
    const d = this.app.editor.registerDocMenuAction({
      ...action,
      id: `${this.manifest.id}:${action.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers a quick-action button in the file tree header.
   *
   * @param action - File tree action definition.
   * @returns A Disposable to unregister the action.
   * @since 0.1.0
   */
  public registerFileTreeAction(action: FileTreeActionDefinition): Disposable {
    const d = this.app.sidebars.registerFileTreeAction({
      ...action,
      id: `${this.manifest.id}:${action.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers an empty-editor placeholder hint.
   *
   * @param hint - Editor placeholder hint configuration.
   * @returns A Disposable to unregister the hint.
   * @since 0.1.0
   */
  public registerPlaceholderHint(hint: EditorPlaceholderHint): Disposable {
    const d = this.app.editor.registerPlaceholderHint({
      ...hint,
      id: `${this.manifest.id}:${hint.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers a right-click context menu item.
   *
   * @param item - Context menu item definition.
   * @returns A Disposable to unregister the item.
   * @since 0.1.0
   */
  public registerContextMenuItem(item: ContextMenuItemDefinition): Disposable {
    const d = this.app.contextMenu.registerItem({
      ...item,
      id: `${this.manifest.id}:${item.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers a global modal dialog host component.
   *
   * @param modal - Modal definition configuration.
   * @returns A Disposable to unregister the modal.
   * @since 0.1.0
   */
  public registerModal(modal: ModalDefinition): Disposable {
    const d = this.app.modals.registerModal({
      ...modal,
      id: `${this.manifest.id}:${modal.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers a custom frontmatter property type handler.
   *
   * @param def - Property type definition.
   * @returns A Disposable to unregister the property type.
   * @since 0.1.0
   */
  public registerPropertyType(def: PropertyTypeDefinition): Disposable {
    const d = this.app.properties.registerPropertyType({
      ...def,
      id: `${this.manifest.id}:${def.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers a frontmatter property visibility filter.
   *
   * @param def - Property filter definition.
   * @returns A Disposable to unregister the filter.
   * @since 0.1.0
   */
  public registerPropertyFilter(def: PropertyFilterDefinition): Disposable {
    const d = this.app.properties.registerPropertyFilter({
      ...def,
      id: `${this.manifest.id}:${def.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers a custom icon mapping for frontmatter property keys.
   *
   * @param def - Property icon definition.
   * @returns A Disposable to unregister the icon mapping.
   * @since 0.1.0
   */
  public registerPropertyIcon(def: PropertyIconDefinition): Disposable {
    const d = this.app.properties.registerPropertyIcon({
      ...def,
      id: `${this.manifest.id}:${def.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers a custom virtual folder or section in the file tree sidebar.
   *
   * @param section - File tree section definition.
   * @returns A Disposable to unregister the section.
   * @since 0.1.0
   */
  public registerFileTreeSection(section: FileTreeSectionDefinition): Disposable {
    const d = this.app.sidebars.registerFileTreeSection({
      ...section,
      id: `${this.manifest.id}:${section.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers a decorator modifying how file tree items render.
   *
   * @param decorator - File tree decorator definition.
   * @returns A Disposable to unregister the decorator.
   * @since 0.1.0
   */
  public registerFileTreeDecorator(decorator: FileTreeItemDecorator): Disposable {
    const d = this.app.sidebars.registerFileTreeDecorator({
      ...decorator,
      id: `${this.manifest.id}:${decorator.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers a tab decorator modifying tab titles, icons, and tooltips in the window tab bar.
   *
   * @param decorator - Tab decorator configuration.
   * @returns A Disposable to unregister the decorator.
   * @since 0.2.0
   */
  public registerTabDecorator(decorator: TabDecoratorDefinition): Disposable {
    const d = this.app.tabDecorators.registerTabDecorator({
      ...decorator,
      id: `${this.manifest.id}:${decorator.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers a breadcrumb provider customizing subheader navigation trails.
   *
   * @param provider - Breadcrumb provider configuration.
   * @returns A Disposable to unregister the provider.
   * @since 0.2.0
   */
  public registerBreadcrumbProvider(provider: BreadcrumbProviderDefinition): Disposable {
    const d = this.app.editor.registerBreadcrumbProvider({
      ...provider,
      id: `${this.manifest.id}:${provider.id}`,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers an MCP Tool callable by AI agents and external MCP clients.
   * Tool names are automatically prefixed with the extension's manifest ID
   * to prevent cross-extension naming collisions.
   * Automatically unregistered when the extension is disabled or unloaded.
   *
   * @param tool - MCP Tool definition with JSON schema and async handler.
   * @returns A Disposable to unregister the tool early if needed.
   * @since 0.3.0
   */
  public registerTool(tool: McpToolDefinition): Disposable {
    const scopedName = tool.name.startsWith(`${this.manifest.id}_`)
      ? tool.name
      : `${this.manifest.id}_${tool.name}`;

    const d = this.app.tools.registerTool({
      ...tool,
      name: scopedName,
      extensionId: this.manifest.id,
    });
    return this.registerDisposable(d);
  }

  /**
   * Registers an MCP Prompt template callable by AI agents and external MCP clients.
   * Prompt names are automatically prefixed with the extension's manifest ID
   * to avoid naming conflicts.
   * Automatically unregistered when the extension is disabled or unloaded.
   *
   * @param prompt - MCP Prompt definition with arguments and message generator.
   * @returns A Disposable to unregister the prompt early if needed.
   * @since 0.3.0
   */
  public registerPrompt(prompt: McpPromptDefinition): Disposable {
    const scopedName = prompt.name.startsWith(`${this.manifest.id}_`)
      ? prompt.name
      : `${this.manifest.id}_${prompt.name}`;

    const d = this.app.tools.registerPrompt({
      ...prompt,
      name: scopedName,
      extensionId: this.manifest.id,
    });
    return this.registerDisposable(d);
  }

  /**
   * Loads extension-scoped persistent JSON configuration or state.
   *
   * @template T - Expected schema type of the stored data.
   * @returns The deserialized data object or null if not yet saved.
   * @since 0.2.0
   */
  public async loadData<T = unknown>(): Promise<T | null> {
    return this.app.extensions.loadPluginData(this.manifest.id) as Promise<T | null>;
  }

  /**
   * Saves extension-scoped persistent JSON configuration or state.
   *
   * @template T - Schema type of the data to store.
   * @param data - The data object to serialize and persist.
   * @since 0.2.0
   */
  public async saveData<T = unknown>(data: T): Promise<void> {
    return this.app.extensions.savePluginData(this.manifest.id, data);
  }
}

// Backwards compatibility alias
export const Plugin = Extension;
export type PluginClass = typeof Extension;
