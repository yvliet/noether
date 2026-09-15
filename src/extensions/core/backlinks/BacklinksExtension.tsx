/**
 * @module BacklinksExtension
 * @description
 * Built-in core extension that manages bidirectional backlinks and unlinked mentions.
 * Registers a right sidebar tab, in-document footer widget, status bar metric,
 * and document menu actions. Consumes drag-and-drop payloads from the navigation
 * sidebar to automatically insert wikilinks for notes and embeds for media files
 * at the exact drop coordinates in the active editor.
 *
 * Uses native NoetherApp APIs for sidebar activation, toasts, and settings.
 *
 * @since 0.2.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { NoetherApp } from '@/core/app/NoetherApp';
import { LinkSquare02Icon } from '@/components/common/Icons';
import {
  getBacklinksForDocument,
  getOutgoingLinksWithDetails,
  getUnlinkedMentionsForDocument,
  convertUnlinkedMentionToLink,
} from '@/lib/db/links';
import { isMediaFileName } from '@/core/registries/FileTypeRegistry';
import { useBacklinksSettings } from './backlinksSettings';
import manifest from './manifest.json';
import backlinksReadme from './readme.md?raw';
import { DocumentBacklinks } from './DocumentBacklinks';

const LazyBacklinksView = React.lazy(() =>
  import('./BacklinksView').then((m) => ({ default: m.BacklinksView }))
);
const LazyBacklinksSettingsTab = React.lazy(() =>
  import('./BacklinksSettingsTab').then((m) => ({ default: m.BacklinksSettingsTab }))
);

export const BACKLINKS_MANIFEST: ExtensionManifest = {
  ...(manifest as ExtensionManifest),
  readme: backlinksReadme,
};

const BacklinkCountItem: React.FC<{ app: NoetherApp }> = ({ app }) => {
  const count = app.workspace.backlinkCount;
  return (
    <span className="text-[#777777] cursor-default select-none">
      {count} {count === 1 ? 'backlink' : 'backlinks'}
    </span>
  );
};

const DocumentBacklinksFooter: React.FC<{
  documentId: string;
  documentTitle?: string;
  document?: any;
}> = ({ documentId, documentTitle, document }) => {
  const showBacklinksInDoc = useBacklinksSettings((s) => s.showBacklinksInDoc);
  if (!showBacklinksInDoc) return null;
  if (document?.is_folder || document?.doc_type === 'canvas') return null;
  return (
    <DocumentBacklinks
      documentId={documentId}
      documentTitle={documentTitle || document?.title || 'Untitled'}
    />
  );
};

export class BacklinksExtension extends Extension {
  constructor(app: NoetherApp, manifest: ExtensionManifest = BACKLINKS_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Right Sidebar Tab
    this.registerSidebarTab({
      id: 'backlinks',
      title: 'Backlinks & Mentions',
      icon: <LinkSquare02Icon size={14} />,
      side: 'right',
      order: 20,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyBacklinksView />
        </React.Suspense>
      ),
    });

    // 2. Register Document Footer Widget (In-Note Backlinks)
    this.registerDocumentFooter({
      id: 'document-backlinks',
      order: 10,
      render: (props) => <DocumentBacklinksFooter {...props} />,
    });

    // 3. Register Status Bar backlink count
    this.addStatusBarItem({
      id: 'backlink-count',
      alignment: 'right',
      order: 10,
      render: (app) => <BacklinkCountItem app={app} />,
    });

    // 4. Register Command to toggle in-document backlinks
    this.addCommand({
      id: 'cmd-toggle-backlinks-in-doc',
      title: () => (useBacklinksSettings.getState().showBacklinksInDoc ? 'Hide backlinks in document' : 'Show backlinks in document'),
      section: 'Backlinks',
      icon: <LinkSquare02Icon size={16} />,
      aliases: ['toggle backlinks in document', 'toggle backlinks', 'backlinks', 'show backlinks', 'hide backlinks'],
      action: (app) => {
        const { showBacklinksInDoc, setShowBacklinksInDoc } = useBacklinksSettings.getState();
        const next = !showBacklinksInDoc;
        setShowBacklinksInDoc(next);
        app.workspace.showToast(
          next ? 'Backlinks in document enabled' : 'Backlinks in document disabled',
          'info'
        );
      },
    });

    // 5. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'backlinks',
      name: 'Backlinks',
      icon: <LinkSquare02Icon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyBacklinksSettingsTab />
        </React.Suspense>
      ),
      onRestoreDefaults: () => {
        useBacklinksSettings.getState().restoreDefaults();
      },
    });

    // 6. Register Document Menu Actions
    this.registerDocMenuAction({
      id: 'toggle-backlinks-in-doc',
      title: 'Backlinks in document',
      icon: <LinkSquare02Icon size={14} className="text-[#8b8e95] group-hover:text-white shrink-0" />,
      group: 'primary',
      order: 10,
      isChecked: () => useBacklinksSettings.getState().showBacklinksInDoc,
      onClick: (app) => {
        const { showBacklinksInDoc, setShowBacklinksInDoc } = useBacklinksSettings.getState();
        const next = !showBacklinksInDoc;
        setShowBacklinksInDoc(next);
        app.workspace.showToast(
          next ? 'Backlinks in document enabled' : 'Backlinks in document disabled',
          'info'
        );
      },
    });

    this.registerDocMenuAction({
      id: 'open-backlinks-view',
      title: 'Backlinks',
      group: 'linked-view',
      order: 10,
      onClick: (app) => {
        app.workspace.setActiveSidebarTab('right', 'backlinks');
        app.workspace.setSidebarOpen('right', true);
      },
    });

    this.registerDocMenuAction({
      id: 'open-outgoing-links-view',
      title: 'Outgoing links',
      group: 'linked-view',
      order: 20,
      onClick: (app) => {
        app.workspace.setActiveSidebarTab('right', 'backlinks');
        app.workspace.setSidebarOpen('right', true);
      },
    });

    // 7. Register Drag & Drop Drop Listener (Wikilinks & Media Embeds)
    this.registerEvent(
      this.app.events.on('drag:drop', async (data) => {
        const { item, items, clientX, clientY, dropTarget } = data;
        if (!item && (!items || items.length === 0)) return;

        // Verify that the drop occurred over an active editor surface
        const editorEl = dropTarget?.closest(
          '.tiptap.prose, [data-editor-canvas="true"], [data-editor-view="true"], .ProseMirror, .cm-editor'
        );
        if (!editorEl) return;

        const activeEditor = this.app.editor.getActiveEditor() || (typeof window !== 'undefined' ? (window as any).__noetherEditor : null);
        if (!activeEditor || !activeEditor.view || activeEditor.isDestroyed) return;

        // Determine insertion position from drop client coordinates
        let targetPos = activeEditor.state.doc.content.size;
        if (typeof clientX === 'number' && typeof clientY === 'number') {
          const posInfo = activeEditor.view.posAtCoords({ left: clientX, top: clientY });
          if (posInfo && typeof posInfo.pos === 'number') {
            targetPos = posInfo.pos;
          }
        }

        const droppedList = items && items.length > 0 ? items : (item ? [item] : []);
        if (droppedList.length === 0) return;

        const formattedSegments = droppedList.map((doc) => {
          if (isMediaFileName(doc.title)) {
            return `![[${doc.title}]]`;
          }
          if (doc.is_folder) {
            return `[[${doc.title}]]`;
          }
          const cleanTitle = doc.title.endsWith('.md') ? doc.title.slice(0, -3) : doc.title;
          return `[[${cleanTitle}]]`;
        });

        // Determine spacing based on whether the drop is inline within text
        const $pos = activeEditor.state.doc.resolve(targetPos);
        const parentText = $pos.parent.textContent || '';
        const parentOffset = $pos.parentOffset;
        const isInlineInText = parentOffset > 0 && parentOffset < parentText.length;
        const separator = isInlineInText ? ' ' : '\n';
        const insertString = formattedSegments.join(separator);

        // Perform the insertion at exact targetPos and focus editor
        activeEditor.chain().focus().insertContentAt(targetPos, insertString).run();

        const anyMedia = droppedList.some((d) => isMediaFileName(d.title));
        const allMedia = droppedList.every((d) => isMediaFileName(d.title));
        if (allMedia) {
          this.app.workspace.showToast(
            droppedList.length > 1 ? `Embedded ${droppedList.length} media files` : `Embedded “${droppedList[0].title}”`,
            'success'
          );
        } else if (anyMedia) {
          this.app.workspace.showToast(`Inserted ${droppedList.length} links & media embeds`, 'success');
        } else {
          const firstTitle = droppedList[0].title.replace(/\.md$/, '');
          this.app.workspace.showToast(
            droppedList.length > 1 ? `Inserted ${droppedList.length} links` : `Linked “${firstTitle}”`,
            'success'
          );
        }
      })
    );

    // ── MCP Tools Registration ──

    // 8. Tool: backlinks_get_incoming
    this.registerTool({
      name: 'get_incoming',
      description: 'Get incoming backlinks that link to the specified document from other notes.',
      category: 'backlinks',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Target document identifier to find backlinks for',
          },
        },
        required: ['documentId'],
      },
      handler: async (args: Record<string, unknown>, _app: NoetherApp): Promise<McpToolResult> => {
        try {
          const documentId = args.documentId as string;
          if (!documentId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'documentId parameter is required' }],
            };
          }
          const backlinks = await getBacklinksForDocument(documentId);
          return {
            content: [{ type: 'text', text: JSON.stringify({ documentId, backlinks, total: backlinks.length }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 9. Tool: backlinks_get_outgoing
    this.registerTool({
      name: 'get_outgoing',
      description: 'Get all outgoing wikilinks and document references contained within a note.',
      category: 'backlinks',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Source document identifier to extract outgoing links from',
          },
        },
        required: ['documentId'],
      },
      handler: async (args: Record<string, unknown>, _app: NoetherApp): Promise<McpToolResult> => {
        try {
          const documentId = args.documentId as string;
          if (!documentId) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'documentId parameter is required' }],
            };
          }
          const outgoingLinks = await getOutgoingLinksWithDetails(documentId);
          return {
            content: [{ type: 'text', text: JSON.stringify({ documentId, outgoingLinks, total: outgoingLinks.length }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 10. Tool: backlinks_get_unlinked_mentions
    this.registerTool({
      name: 'get_unlinked_mentions',
      description: 'Find plain-text mentions of a document title in other notes that are not yet wikilinked.',
      category: 'backlinks',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Document identifier being mentioned',
          },
          title: {
            type: 'string',
            description: 'Title string to search unlinked mentions for',
          },
        },
        required: ['documentId', 'title'],
      },
      handler: async (args: Record<string, unknown>, _app: NoetherApp): Promise<McpToolResult> => {
        try {
          const documentId = args.documentId as string;
          const title = args.title as string;
          if (!documentId || !title) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'documentId and title parameters are required' }],
            };
          }
          const mentions = await getUnlinkedMentionsForDocument(documentId, title);
          return {
            content: [{ type: 'text', text: JSON.stringify({ documentId, title, mentions, total: mentions.length }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 11. Tool: backlinks_convert_mention
    this.registerTool({
      name: 'convert_mention',
      description: 'Convert a plain-text mention in a source document into a formal [[wikilink]].',
      category: 'backlinks',
      isDestructive: false,
      parameters: {
        type: 'object',
        properties: {
          sourceDocumentId: {
            type: 'string',
            description: 'Source document ID where the plain-text mention appears',
          },
          title: {
            type: 'string',
            description: 'The title string to wrap in wikilink brackets',
          },
        },
        required: ['sourceDocumentId', 'title'],
      },
      handler: async (args: Record<string, unknown>, _app: NoetherApp): Promise<McpToolResult> => {
        try {
          const sourceDocumentId = args.sourceDocumentId as string;
          const title = args.title as string;
          if (!sourceDocumentId || !title) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'sourceDocumentId and title parameters are required' }],
            };
          }
          const success = await convertUnlinkedMentionToLink(sourceDocumentId, title);
          return {
            content: [{ type: 'text', text: JSON.stringify({ success, sourceDocumentId, title }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 12. Tool: backlinks_insert_link
    this.registerTool({
      name: 'insert_link',
      description: 'Insert a formatted [[wikilink]] or ![[media]] embed into the currently active note at a specific position.',
      category: 'backlinks',
      parameters: {
        type: 'object',
        properties: {
          targetTitle: {
            type: 'string',
            description: 'Title or filename of the document or media asset to link/embed',
          },
          isEmbed: {
            type: 'boolean',
            description: 'Whether to format as a media embed (![[target]]) rather than standard link ([[target]])',
          },
          position: {
            type: 'number',
            description: 'Optional document character index to insert at (defaults to end of document)',
          },
        },
        required: ['targetTitle'],
      },
      handler: async (args: Record<string, unknown>, _app: NoetherApp): Promise<McpToolResult> => {
        try {
          const targetTitle = args.targetTitle as string;
          if (!targetTitle) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'targetTitle parameter is required' }],
            };
          }
          const isEmbed = args.isEmbed !== undefined ? Boolean(args.isEmbed) : isMediaFileName(targetTitle);
          const cleanTitle = (!isEmbed && targetTitle.endsWith('.md')) ? targetTitle.slice(0, -3) : targetTitle;
          const formatted = isEmbed ? `![[${cleanTitle}]]` : `[[${cleanTitle}]]`;

          const activeEditor = this.app.editor.getActiveEditor();
          if (!activeEditor || !activeEditor.view || activeEditor.isDestroyed) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'No active editor document is currently open' }],
            };
          }

          const docSize = activeEditor.state.doc.content.size;
          const pos = typeof args.position === 'number' && args.position >= 0 && args.position <= docSize
            ? args.position
            : docSize;

          activeEditor.chain().focus().insertContentAt(pos, formatted).run();
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, inserted: formatted, position: pos }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });
  }
}

export default BacklinksExtension;
