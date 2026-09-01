/**
 * @module CascadeExtension
 * @description
 * Built-in core extension for organizing notes into sequential cascades/books.
 * Registers status bar page linking, Roman numeral/negative page properties,
 * sidebar virtual folders, sequential page navigation, and commands.
 *
 * Uses native FlintApp APIs (app.vault.activeDocument, app.workspace.openInputDialog).
 *
 * @since 0.1.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { CascadeIcon, CascadeBookIcon } from './cascadeIcons';
import { CascadeStatusBarItem } from './CascadeStatusBarItem';
import { CascadeSettingsTab } from './CascadeSettingsTab';
import { cascadeReadme } from './readme';
import {
  navigateCascade,
  assignNoteToCascade,
  removeNoteFromCascade,
  getCascadeInfo,
  parseCascadePageString,
  formatCascadePageDisplay,
  getAllCascades,
  getCascadeNotes,
} from './cascadeManager';
import { CascadeFolderNode } from './CascadeFolderNode';
import { useCascadeSettings } from './cascadeSettings';

export const CASCADE_MANIFEST: ExtensionManifest = {
  id: 'flint-cascade',
  name: 'Cascade',
  version: '1.0.0',
  description: 'Organize notes into sequential cascades (books) with status-bar linking, graph backlinks, and custom sidebar folders.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['cascade', 'book', 'pages', 'navigation', 'graph', 'backlinks'],
  readme: cascadeReadme,
};

export class CascadeExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = CASCADE_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Status Bar Item (Right side, beside editor mode and sync icons)
    this.addStatusBarItem({
      id: 'status-item',
      alignment: 'right',
      order: 40,
      render: () => <CascadeStatusBarItem />,
    });

    // 2. Register Custom Property Type for Cascade Pages (Roman numerals / negatives)
    this.registerPropertyType({
      id: 'cascade-page',
      matchKey: (key: string) => {
        const lk = key.toLowerCase().trim();
        return (
          lk === 'cascade page' ||
          lk === 'cascade_page' ||
          lk === 'cascadepage' ||
          lk === 'page number' ||
          lk === 'page_number' ||
          lk === 'pagenumber'
        );
      },
      formatDisplay: (val: unknown) => {
        if (typeof val === 'number') return formatCascadePageDisplay(val);
        if (val !== undefined && val !== null) {
          const parsed = parseCascadePageString(String(val));
          return parsed !== null ? formatCascadePageDisplay(parsed) : String(val);
        }
        return '';
      },
      parseInput: (input: string) => {
        const str = input.trim();
        if (!str) return 1;
        const parsed = parseCascadePageString(str);
        return parsed !== null ? parsed : str;
      },
      placeholder: '1',
    });

    // 3. Register Property Visibility Filter (Hide Cascade properties outside Cascade context)
    this.registerPropertyFilter({
      id: 'cascade-visibility-filter',
      shouldHideProperty: (key: string, _value: unknown, { docId }) => {
        const lk = key.toLowerCase().replace(/[-_]/g, ' ').trim();
        const isCascadeKey =
          lk === 'cascade page' ||
          lk === 'cascadepage' ||
          lk === 'cascade' ||
          lk === 'cascade book' ||
          lk === 'cascadebook';
        if (!isCascadeKey) return false;

        const tabs = this.app.workspace.getTabs();
        const activeTabId = this.app.workspace.activeTabId;
        const activeTab = tabs.find((t) => t.id === activeTabId);
        const isInCascadeTab = Boolean(
          activeTab &&
          activeTab.document_id === docId &&
          activeTab.metadata?.cascadeName
        );
        return !isInCascadeTab;
      },
    });

    // 4. Register Tab Decorator (Displays [page] suffix, Cascade icon, and custom tooltip)
    this.registerTabDecorator({
      id: 'cascade-tab-decorator',
      matches: (tab) => Boolean(tab.metadata?.cascadeName),
      getDisplayTitle: (tab, doc) => {
        const page = tab.metadata?.page;
        const pageSuffix = page !== undefined ? ` [${formatCascadePageDisplay(page)}]` : '';
        const baseTitle = doc?.title || tab.title || 'Untitled';
        return `${baseTitle}${pageSuffix}`;
      },
      getIcon: () => <CascadeIcon size={13} />,
      getTooltip: (tab, doc) => {
        const cascadeName = tab.metadata?.cascadeName;
        const page = tab.metadata?.page;
        const pageDisplay = page !== undefined ? formatCascadePageDisplay(page) : '';
        const baseTitle = doc?.title || tab.title || 'Untitled';
        return `${baseTitle} [${pageDisplay}] — Cascade: ${cascadeName}`;
      },
    });

    // 5. Register Document Breadcrumb Provider (Custom folder / page breadcrumbs in subheader)
    this.registerBreadcrumbProvider({
      id: 'cascade-breadcrumbs',
      matches: ({ tab }) => Boolean(tab?.metadata?.cascadeName),
      getBreadcrumbs: ({ tab, doc }) => {
        const cascadeName = tab?.metadata?.cascadeName as string;
        const page = tab?.metadata?.page;
        const pageDisplay = page !== undefined ? formatCascadePageDisplay(page) : '';
        const cleanTitle = doc.title || 'Untitled';

        return [
          {
            id: `cascade:${cascadeName}`,
            title: cascadeName,
            isFolder: true,
            icon: <CascadeIcon size={12} className="inline mr-1 text-[#aaa]" />,
            onClick: (appInstance) => {
              appInstance.workspace.setSidebarOpen('left', true);
              appInstance.workspace.setActiveSidebarTab('left', 'files');
              window.dispatchEvent(
                new CustomEvent('flint:reveal-tree-item', {
                  detail: { id: `cascade-${cascadeName}` },
                })
              );
            },
          },
          {
            id: doc.id,
            title: `${cleanTitle} [${pageDisplay}]`,
            isFolder: false,
          },
        ];
      },
      getTitleOverride: ({ tab, doc }) => {
        const page = tab?.metadata?.page;
        const pageDisplay = page !== undefined ? formatCascadePageDisplay(page) : '';
        const cleanTitle = doc.title || 'Untitled';
        return `${cleanTitle} [${pageDisplay}]`;
      },
    });

    // 6. Listen to Tab Switches to Synchronize Cascade Context
    this.onEvent('tab:changed', ({ activeTabId }) => {
      if (!activeTabId) {
        useCascadeSettings.getState().setActiveCascadeContext(null);
        return;
      }
      const tabs = this.app.workspace.getTabs();
      const tab = tabs.find((t) => t.id === activeTabId);
      if (tab?.metadata?.cascadeName) {
        useCascadeSettings.getState().setActiveCascadeContext({
          docId: tab.document_id,
          cascadeName: tab.metadata.cascadeName as string,
          page: tab.metadata.page as number | undefined,
        });
      } else {
        useCascadeSettings.getState().setActiveCascadeContext(null);
      }
    });

    // 7. Register Property Icons
    this.registerPropertyIcon({
      id: 'cascade',
      name: 'Cascade',
      category: 'Common',
      keywords: ['cascade', 'book', 'flow', 'motion'],
      component: ({ size, className }) => <CascadeIcon size={size} className={className} />,
      defaultKeys: ['cascade', 'cascade book', 'cascade_book', 'cascadebook'],
    });

    this.registerPropertyIcon({
      id: 'cascade-page',
      name: 'Cascade Page',
      category: 'Content',
      keywords: ['page', 'cascade page', 'book page', 'chapter'],
      component: ({ size, className }) => <CascadeBookIcon size={size} className={className} />,
      defaultKeys: [
        'cascade page',
        'cascadepage',
        'cascade_page',
        'page',
        'page number',
        'page_number',
        'pagenumber',
      ],
    });

    // 8. Register Sidebar Virtual Folders Section
    this.registerFileTreeSection({
      id: 'cascade-virtual-folders',
      order: 10,
      render: ({ documents }) => {
        const cascades = getAllCascades(documents);
        if (cascades.length === 0) return null;
        return (
          <>
            {cascades.map((cascade) => (
              <CascadeFolderNode key={`cascade-book-${cascade.name}`} cascade={cascade} />
            ))}
          </>
        );
      },
    });

    // 9. Register File Tree Item Decorator (Suppress normal tree highlight/editing while active in Cascade)
    this.registerFileTreeDecorator({
      id: 'cascade-node-suppression',
      suppressHighlight: (doc, context) => {
        const activeTab =
          context?.activeTab ??
          this.app.workspace.getTabs().find((t) => t.id === this.app.workspace.activeTabId);
        return Boolean(activeTab?.metadata?.cascadeName && activeTab?.document_id === doc.id);
      },
      suppressEditing: (doc, context) => {
        const activeTab =
          context?.activeTab ??
          this.app.workspace.getTabs().find((t) => t.id === this.app.workspace.activeTabId);
        return Boolean(activeTab?.metadata?.cascadeName && activeTab?.document_id === doc.id);
      },
    });

    // 7. Register Navigation Commands
    this.addCommand({
      id: 'cascade:prev-page',
      title: 'Cascade: Previous page in cascade',
      section: 'Navigation',
      hotkey: 'Alt+,',
      icon: <CascadeIcon size={16} />,
      action: async () => {
        await navigateCascade('prev');
      },
    });

    this.addCommand({
      id: 'cascade:next-page',
      title: 'Cascade: Next page in cascade',
      section: 'Navigation',
      hotkey: 'Alt+.',
      icon: <CascadeIcon size={16} />,
      action: async () => {
        await navigateCascade('next');
      },
    });

    this.addCommand({
      id: 'cascade:manage',
      title: 'Cascade: Add or change note cascade',
      section: 'Editor',
      icon: <CascadeBookIcon size={16} />,
      action: async (app) => {
        const activeDoc = app.vault.activeDocument;
        if (!activeDoc) return;

        const info = getCascadeInfo(activeDoc);
        const currentBook = info.cascadeName || 'Default Cascade';
        const currentPage = info.pageNumber ?? 1;

        app.workspace.openInputDialog({
          title: 'Assign Note to Cascade (Book Name, Page Number)',
          defaultValue: `${currentBook}, ${currentPage}`,
          placeholder: 'e.g. Novel, 1',
          confirmText: 'Save Cascade',
          onConfirm: async (val) => {
            if (!val.trim()) return;
            const parts = val.split(',');
            const bookName = parts[0].trim() || 'Default Cascade';
            const pageNum = parts[1] ? (parseCascadePageString(parts[1].trim()) ?? 1) : 1;
            await assignNoteToCascade(activeDoc.id, bookName, pageNum);
          },
        });
      },
    });

    this.addCommand({
      id: 'cascade:remove',
      title: 'Cascade: Remove note from cascade',
      section: 'Editor',
      icon: <CascadeIcon size={16} />,
      action: async (app) => {
        const activeDoc = app.vault.activeDocument;
        if (!activeDoc) return;
        await removeNoteFromCascade(activeDoc.id);
      },
    });

    // 8. Register Slash Commands
    this.registerSlashCommand({
      title: 'Cascade: Assign or change cascade',
      description: 'Add this note to a cascade book with page number',
      icon: 'card',
      command: ({ range, editor }) => {
        if (editor && range) {
          editor.commands.deleteRange(range);
        }
        const activeDoc = this.app.vault.activeDocument;
        if (!activeDoc) return;

        const info = getCascadeInfo(activeDoc);
        const currentBook = info.cascadeName || 'Default Cascade';
        const currentPage = info.pageNumber ?? 1;

        this.app.workspace.openInputDialog({
          title: 'Assign Note to Cascade (Book Name, Page Number)',
          defaultValue: `${currentBook}, ${currentPage}`,
          placeholder: 'e.g. Novel, 1',
          confirmText: 'Save Cascade',
          onConfirm: async (val) => {
            if (!val.trim()) return;
            const parts = val.split(',');
            const bookName = parts[0].trim() || 'Default Cascade';
            const pageNum = parts[1] ? (parseCascadePageString(parts[1].trim()) ?? 1) : 1;
            await assignNoteToCascade(activeDoc.id, bookName, pageNum);
          },
        });
      },
    });

    this.registerSlashCommand({
      title: 'Cascade: Next page',
      description: 'Navigate to the next page in this cascade (Alt + .)',
      icon: 'arrowright',
      command: ({ range, editor }) => {
        if (editor && range) {
          editor.commands.deleteRange(range);
        }
        navigateCascade('next');
      },
    });

    this.registerSlashCommand({
      title: 'Cascade: Previous page',
      description: 'Navigate to the previous page in this cascade (Alt + ,)',
      icon: 'arrowleft',
      command: ({ range, editor }) => {
        if (editor && range) {
          editor.commands.deleteRange(range);
        }
        navigateCascade('prev');
      },
    });

    // 9. Register Document Menu Action
    this.registerDocMenuAction({
      id: 'doc-cascade-action',
      title: 'Manage Cascade page...',
      icon: <CascadeIcon size={14} className="shrink-0" />,
      group: 'tools',
      order: 25,
      onClick: async (app) => {
        const activeDoc = app.vault.activeDocument;
        if (!activeDoc) return;
        const info = getCascadeInfo(activeDoc);
        const currentBook = info.cascadeName || 'Default Cascade';
        const currentPage = info.pageNumber ?? 1;

        app.workspace.openInputDialog({
          title: 'Assign Note to Cascade (Book Name, Page Number)',
          defaultValue: `${currentBook}, ${currentPage}`,
          placeholder: 'e.g. Novel, 1',
          confirmText: 'Save Cascade',
          onConfirm: async (val) => {
            if (!val.trim()) return;
            const parts = val.split(',');
            const bookName = parts[0].trim() || 'Default Cascade';
            const pageNum = parts[1] ? (parseCascadePageString(parts[1].trim()) ?? 1) : 1;
            await assignNoteToCascade(activeDoc.id, bookName, pageNum);
          },
        });
      },
    });

    // 10. Register Settings Tab
    this.registerSettingTab({
      id: 'cascade-settings-tab',
      name: 'Cascade',
      icon: <CascadeIcon size={14} />,
      render: () => <CascadeSettingsTab />,
    });

    // 11. Register MCP Tools
    // ── Tool: list ──
    this.registerTool({
      name: 'list',
      description: 'List all cascade books and their member notes in sequential page order.',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (): Promise<McpToolResult> => {
        try {
          const cascades = getAllCascades(this.app.hearth.documents);
          const result = cascades.map((c) => ({
            name: c.name,
            pageCount: c.notes.length,
            notes: c.notes.map((n) => ({
              documentId: n.doc.id,
              title: n.doc.title,
              pageNumber: n.page,
              displayPage: formatCascadePageDisplay(n.page),
            })),
          }));

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  totalCascades: result.length,
                  cascades: result,
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: msg }],
          };
        }
      },
    });

    // ── Tool: get_notes ──
    this.registerTool({
      name: 'get_notes',
      description: 'Get ordered sequential pages in a specific cascade book.',
      parameters: {
        type: 'object',
        properties: {
          cascadeName: {
            type: 'string',
            description: 'Name of the cascade book',
          },
        },
        required: ['cascadeName'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const cascadeName = String(args.cascadeName || '').trim();
          if (!cascadeName) {
            throw new Error("Parameter 'cascadeName' is required.");
          }

          const notes = getCascadeNotes(cascadeName, this.app.hearth.documents);
          const result = notes.map((n) => ({
            documentId: n.doc.id,
            title: n.doc.title,
            pageNumber: n.page,
            displayPage: formatCascadePageDisplay(n.page),
          }));

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  cascadeName,
                  pageCount: result.length,
                  pages: result,
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: msg }],
          };
        }
      },
    });

    // ── Tool: assign_note ──
    this.registerTool({
      name: 'assign_note',
      description: 'Assign a note to a specific page number within a cascade book.',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Unique document identifier',
          },
          cascadeName: {
            type: 'string',
            description: 'Name of the cascade book',
          },
          pageNumber: {
            type: 'number',
            description: 'Page index number (positive integer or Roman/negative integer)',
          },
        },
        required: ['documentId', 'cascadeName', 'pageNumber'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const documentId = String(args.documentId || '').trim();
          const cascadeName = String(args.cascadeName || '').trim();
          const pageNumber = Number(args.pageNumber);

          if (!documentId) {
            throw new Error("Parameter 'documentId' is required.");
          }
          if (!cascadeName) {
            throw new Error("Parameter 'cascadeName' is required.");
          }
          if (isNaN(pageNumber)) {
            throw new Error("Parameter 'pageNumber' must be a valid number.");
          }

          await assignNoteToCascade(documentId, cascadeName, pageNumber);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  documentId,
                  cascadeName,
                  pageNumber,
                  displayPage: formatCascadePageDisplay(pageNumber),
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: msg }],
          };
        }
      },
    });

    // ── Tool: remove_note ──
    this.registerTool({
      name: 'remove_note',
      description: 'Remove a note from its cascade book, resetting its cascade metadata and graph connections.',
      isDestructive: true,
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Unique document identifier to remove from cascade',
          },
        },
        required: ['documentId'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const documentId = String(args.documentId || '').trim();
          if (!documentId) {
            throw new Error("Parameter 'documentId' is required.");
          }

          await removeNoteFromCascade(documentId);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  documentId,
                }),
              },
            ],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: msg }],
          };
        }
      },
    });
  }
}

// Backwards-compat alias
export const CascadePlugin = CascadeExtension;
export default CascadeExtension;
