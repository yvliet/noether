import type { Extension } from '@tiptap/react';
import {
  SlashCommandDefinition,
  Disposable,
  TiptapExtensionFactory,
  DocumentHeaderDefinition,
  DocumentFooterDefinition,
  DocMenuActionDefinition,
  EditorPlaceholderHint,
  BreadcrumbProviderDefinition,
  BreadcrumbDecoratorDefinition,
  DocumentTitleDecoratorDefinition,
  EditorPluginDefinition,
  EditorPluginContext,
  DocumentTransformHook,
} from '../extensions/types';

export interface CodeBlockRendererDefinition {
  language: string;
  render: (code: string, container: HTMLElement) => void | (() => void);
}

export class EditorRegistry {
  private extensionFactories: Set<TiptapExtensionFactory> = new Set();
  private extensionCache: Map<TiptapExtensionFactory, Extension> = new Map();
  private cachedExtensions: Extension[] = [];
  private slashCommands: Map<string, SlashCommandDefinition> = new Map();
  private codeBlockRenderers: Map<string, CodeBlockRendererDefinition> = new Map();
  private documentHeaders: Map<string, DocumentHeaderDefinition> = new Map();
  private documentFooters: Map<string, DocumentFooterDefinition> = new Map();
  private docMenuActions: Map<string, DocMenuActionDefinition> = new Map();
  private placeholderHints: Map<string, EditorPlaceholderHint> = new Map();
  private breadcrumbProviders: Map<string, BreadcrumbProviderDefinition> = new Map();
  private breadcrumbDecorators: Map<string, BreadcrumbDecoratorDefinition> = new Map();
  private documentTitleDecorators: Map<string, DocumentTitleDecoratorDefinition> = new Map();
  private editorPlugins: Map<string, EditorPluginDefinition> = new Map();
  private transformHooks: Map<string, DocumentTransformHook> = new Map();
  private listeners: Set<() => void> = new Set();
  private activeEditor: any = null;

  private cachedHeaders: DocumentHeaderDefinition[] = [];
  private cachedFooters: DocumentFooterDefinition[] = [];
  private cachedSlashCommands: SlashCommandDefinition[] = [];
  private cachedDocMenuActions: DocMenuActionDefinition[] = [];
  private cachedPlaceholderHints: EditorPlaceholderHint[] = [];
  private cachedBreadcrumbProviders: BreadcrumbProviderDefinition[] = [];
  private cachedBreadcrumbDecorators: BreadcrumbDecoratorDefinition[] = [];
  private cachedDocumentTitleDecorators: DocumentTitleDecoratorDefinition[] = [];
  private cachedEditorPlugins: EditorPluginDefinition[] = [];
  private cachedTransformHooks: DocumentTransformHook[] = [];

  /**
   * Sets the active rich text editor instance.
   * General-purpose slot used by the active editor view.
   */
  public setActiveEditor(editor: any): void {
    this.activeEditor = editor;
  }

  /**
   * Retrieves the currently focused or active rich text editor instance, if one is mounted.
   */
  public getActiveEditor(): any {
    return this.activeEditor;
  }

  /**
   * Dispatches an action or command directly to the currently active editor instance.
   * Useful for extensions triggering formatting, table insertion, or custom block mutations.
   * @since 0.4.6
   */
  public dispatchAction(action: string, payload?: any): boolean {
    const editor = this.activeEditor;
    if (!editor) return false;

    if (editor.commands && typeof editor.commands[action] === 'function') {
      return Boolean(editor.commands[action](payload));
    }
    if (typeof editor.chain === 'function') {
      const chain = editor.chain().focus();
      if (typeof chain[action] === 'function') {
        return Boolean(chain[action](payload).run());
      }
    }
    return false;
  }

  public registerExtension(factory: TiptapExtensionFactory): Disposable {
    this.extensionFactories.add(factory);
    try {
      const ext = factory();
      if (ext) {
        this.extensionCache.set(factory, ext);
      }
    } catch (err) {
      console.error('[EditorRegistry] Failed to initialize editor extension:', err);
    }
    this.recomputeExtensions();
    this.notify();

    return {
      dispose: () => {
        this.extensionFactories.delete(factory);
        this.extensionCache.delete(factory);
        this.recomputeExtensions();
        this.notify();
      },
    };
  }

  public getExtensions(): Extension[] {
    return this.cachedExtensions;
  }

  public registerEditorPlugin(plugin: EditorPluginDefinition): Disposable {
    this.editorPlugins.set(plugin.id, plugin);
    this.recomputeEditorPlugins();
    this.notify();

    return {
      dispose: () => {
        this.editorPlugins.delete(plugin.id);
        this.recomputeEditorPlugins();
        this.notify();
      },
    };
  }

  public getEditorPlugins(): EditorPluginDefinition[] {
    return this.cachedEditorPlugins;
  }

  private recomputeEditorPlugins(): void {
    this.cachedEditorPlugins = Array.from(this.editorPlugins.values());
  }

  private recomputeExtensions(): void {
    this.cachedExtensions = Array.from(this.extensionCache.values());
  }

  public registerSlashCommand(item: SlashCommandDefinition): Disposable {
    this.slashCommands.set(item.title, item);
    this.recomputeSlashCommands();
    this.notify();

    return {
      dispose: () => {
        this.slashCommands.delete(item.title);
        this.recomputeSlashCommands();
        this.notify();
      },
    };
  }

  public getSlashCommands(): SlashCommandDefinition[] {
    return this.cachedSlashCommands;
  }

  public registerCodeBlockRenderer(renderer: CodeBlockRendererDefinition): Disposable {
    this.codeBlockRenderers.set(renderer.language.toLowerCase(), renderer);
    this.notify();

    return {
      dispose: () => {
        this.codeBlockRenderers.delete(renderer.language.toLowerCase());
        this.notify();
      },
    };
  }

  public getCodeBlockRenderer(language: string): CodeBlockRendererDefinition | undefined {
    return this.codeBlockRenderers.get(language.toLowerCase());
  }

  public registerDocumentHeader(header: DocumentHeaderDefinition): Disposable {
    this.documentHeaders.set(header.id, header);
    this.recomputeHeaders();
    this.notify();

    return {
      dispose: () => {
        this.documentHeaders.delete(header.id);
        this.recomputeHeaders();
        this.notify();
      },
    };
  }

  public getDocumentHeaders(): DocumentHeaderDefinition[] {
    return this.cachedHeaders;
  }

  public registerDocumentFooter(footer: DocumentFooterDefinition): Disposable {
    this.documentFooters.set(footer.id, footer);
    this.recomputeFooters();
    this.notify();

    return {
      dispose: () => {
        this.documentFooters.delete(footer.id);
        this.recomputeFooters();
        this.notify();
      },
    };
  }

  public getDocumentFooters(): DocumentFooterDefinition[] {
    return this.cachedFooters;
  }

  public registerDocMenuAction(action: DocMenuActionDefinition): Disposable {
    this.docMenuActions.set(action.id, action);
    this.recomputeDocMenuActions();
    this.notify();

    return {
      dispose: () => {
        this.docMenuActions.delete(action.id);
        this.recomputeDocMenuActions();
        this.notify();
      },
    };
  }

  public getDocMenuActions(): DocMenuActionDefinition[] {
    return this.cachedDocMenuActions;
  }

  public registerPlaceholderHint(hint: EditorPlaceholderHint): Disposable {
    this.placeholderHints.set(hint.id, hint);
    this.recomputePlaceholderHints();
    this.notify();

    return {
      dispose: () => {
        this.placeholderHints.delete(hint.id);
        this.recomputePlaceholderHints();
        this.notify();
      },
    };
  }

  public getPlaceholderHints(): EditorPlaceholderHint[] {
    return this.cachedPlaceholderHints;
  }

  public registerBreadcrumbProvider(provider: BreadcrumbProviderDefinition): Disposable {
    this.breadcrumbProviders.set(provider.id, provider);
    this.recomputeBreadcrumbProviders();
    this.notify();

    return {
      dispose: () => {
        this.breadcrumbProviders.delete(provider.id);
        this.recomputeBreadcrumbProviders();
        this.notify();
      },
    };
  }

  public getBreadcrumbProviders(): BreadcrumbProviderDefinition[] {
    return this.cachedBreadcrumbProviders;
  }

  public registerBreadcrumbDecorator(decorator: BreadcrumbDecoratorDefinition): Disposable {
    this.breadcrumbDecorators.set(decorator.id, decorator);
    this.recomputeBreadcrumbDecorators();
    this.notify();

    return {
      dispose: () => {
        this.breadcrumbDecorators.delete(decorator.id);
        this.recomputeBreadcrumbDecorators();
        this.notify();
      },
    };
  }

  public getBreadcrumbDecorators(): BreadcrumbDecoratorDefinition[] {
    return this.cachedBreadcrumbDecorators;
  }

  public registerDocumentTitleDecorator(decorator: DocumentTitleDecoratorDefinition): Disposable {
    this.documentTitleDecorators.set(decorator.id, decorator);
    this.recomputeDocumentTitleDecorators();
    this.notify();

    return {
      dispose: () => {
        this.documentTitleDecorators.delete(decorator.id);
        this.recomputeDocumentTitleDecorators();
        this.notify();
      },
    };
  }

  public getDocumentTitleDecorators(): DocumentTitleDecoratorDefinition[] {
    return this.cachedDocumentTitleDecorators;
  }

  public registerDocumentTransformHook(hook: DocumentTransformHook): Disposable {
    this.transformHooks.set(hook.id, hook);
    this.cachedTransformHooks = Array.from(this.transformHooks.values());
    this.notify();

    return {
      dispose: () => {
        this.transformHooks.delete(hook.id);
        this.cachedTransformHooks = Array.from(this.transformHooks.values());
        this.notify();
      },
    };
  }

  public getTransformHooks(): DocumentTransformHook[] {
    return this.cachedTransformHooks;
  }

  public async applyExportTransforms(context: { documentId: string; title: string; markdown: string }): Promise<string> {
    let result = context.markdown;
    for (const hook of this.cachedTransformHooks) {
      if (typeof hook.transformExport === 'function') {
        try {
          result = await hook.transformExport({ ...context, markdown: result });
        } catch (err) {
          console.error(`[EditorRegistry] Error in transformExport for hook "${hook.id}":`, err);
        }
      }
    }
    return result;
  }

  public applyImportTransforms(context: { documentId?: string; title?: string; markdown: string }): { markdown: string; extractedData: Record<string, any> } {
    let cleanMarkdown = context.markdown;
    const extractedData: Record<string, any> = {};

    for (const hook of this.cachedTransformHooks) {
      if (typeof hook.transformImport === 'function') {
        try {
          const res = hook.transformImport({ ...context, markdown: cleanMarkdown });
          if (res) {
            cleanMarkdown = res.markdown;
            if (res.data !== undefined) {
              extractedData[hook.id] = res.data;
            }
          }
        } catch (err) {
          console.error(`[EditorRegistry] Error in transformImport for hook "${hook.id}":`, err);
        }
      }
    }
    return { markdown: cleanMarkdown, extractedData };
  }

  private recomputeDocumentTitleDecorators(): void {
    this.cachedDocumentTitleDecorators = Array.from(this.documentTitleDecorators.values()).sort(
      (a, b) => (b.order ?? 0) - (a.order ?? 0)
    );
  }

  private recomputeBreadcrumbDecorators(): void {
    this.cachedBreadcrumbDecorators = Array.from(this.breadcrumbDecorators.values()).sort(
      (a, b) => (b.order ?? 0) - (a.order ?? 0)
    );
  }

  public subscribe(listener: () => void): Disposable {
    this.listeners.add(listener);
    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  private recomputeHeaders(): void {
    this.cachedHeaders = Array.from(this.documentHeaders.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  private recomputeFooters(): void {
    this.cachedFooters = Array.from(this.documentFooters.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  private recomputeSlashCommands(): void {
    this.cachedSlashCommands = Array.from(this.slashCommands.values());
  }

  private recomputeDocMenuActions(): void {
    this.cachedDocMenuActions = Array.from(this.docMenuActions.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  private recomputePlaceholderHints(): void {
    this.cachedPlaceholderHints = Array.from(this.placeholderHints.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  private recomputeBreadcrumbProviders(): void {
    this.cachedBreadcrumbProviders = Array.from(this.breadcrumbProviders.values()).sort(
      (a, b) => (b.order || 0) - (a.order || 0)
    );
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('[EditorRegistry] Error in listener:', err);
      }
    });
  }
}
