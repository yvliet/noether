/**
 * @module IconifyExtension
 * @description
 * Built-in community extension for customizing icons across Flint.
 * Allows assigning curated HugeIcons to folders, notes, canvases, files, and tabs.
 * Renders in the file tree, tab bar, context menus, and provides full MCP management.
 *
 * Exclusively integrates via the Flint SDK, IoC Registries, and EventBus.
 *
 * @author Yuliet Li
 * @since 1.0.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { DocumentItem, TabItem } from '@/types';
import {
  SparklesIcon,
  RotateCcwIcon,
  Folder01Icon,
  File01Icon,
} from '@/components/common/Icons';
import { dbAdapter } from '@/lib/db/adapter';
import { initIconifyDb, IconItemType } from './iconifyDb';
import { useIconifyStore } from './iconifyStore';
import { IconPicker, HugeIconRenderer } from '@/components/common/IconPicker';
import { EmojiRenderer } from '@/components/common/emoji';
import { IconifySlot, IconifyBreadcrumbIcon, IconifyTabIcon } from './IconifyNode';
import { IconifyEditorTitleIcon } from './IconifyEditorTitleIcon';
import { IconifyPickerModal } from './IconifyPickerModal';
import { IconifySettingsTab } from './IconifySettingsTab';
import { getIconifyIconDef } from './iconifyCatalog';
import { iconifyReadme } from './readme';

export const ICONIFY_MANIFEST: ExtensionManifest = {
  id: 'iconify',
  name: 'Iconify',
  version: '1.0.0',
  description: 'Customize icons for folders, notes, files, and tabs with a rich HugeIcons selector and SQLite persistence.',
  author: 'Yuliet Li',
  isCore: false,
  tags: ['icons', 'customization', 'file-tree', 'tabs', 'notes', 'ui'],
  readme: iconifyReadme,
};

export class IconifyExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = ICONIFY_MANIFEST) {
    super(app, manifest);
  }

  public async onload(): Promise<void> {
    // 1. Initial hydration from cache and DB
    await useIconifyStore.getState().loadIcons();

    // 2. Synchronize with SQLite when the database becomes ready
    const unsubDb = dbAdapter.onStatusChange(async (isReady) => {
      if (isReady) {
        await initIconifyDb();
        await useIconifyStore.getState().loadIcons();
      }
    });
    this.registerDisposable({ dispose: unsubDb });

    // 3. Clean up database records when documents/folders are deleted
    this.onEvent('document:deleted', async ({ id }) => {
      if (id) {
        await useIconifyStore.getState().removeIcon(id);
      }
    });

    // 4. Synchronize tab decorators on any Iconify store mutation (instant atomic update across all tabs)
    const unsubStore = useIconifyStore.subscribe(() => {
      this.app.tabDecorators.notify();
    });
    this.registerDisposable({ dispose: unsubStore });

    // 5. Register FileTreeDecorator for rendering custom/default icons in the file tree prefix
    this.registerFileTreeDecorator({
      id: 'iconify-tree-decorator',
      renderPrefix: (doc, context) => {
        return (
          <IconifySlot
            doc={doc}
            isOpen={context?.isOpen}
          />
        );
      },
    });

    // 6. Register TabDecorator to display custom icons in tab headers
    this.registerTabDecorator({
      id: 'iconify-tab-decorator',
      matches: (_tab, doc) => {
        if (!doc?.id) return false;
        return Boolean(useIconifyStore.getState().icons[doc.id]);
      },
      getIcon: (_tab, doc) => {
        if (!doc?.id) return undefined;
        return <IconifyTabIcon docId={doc.id} />;
      },
    });

    // 6. Register BreadcrumbDecorator to display icons in subheader navigation breadcrumbs
    this.registerBreadcrumbDecorator({
      id: 'iconify-breadcrumb-decorator',
      renderIcon: (item) => {
        return (
          <IconifyBreadcrumbIcon
            itemId={item.id}
            isFolder={Boolean(item.isFolder)}
          />
        );
      },
    });

    // 7. Register DocumentTitleDecorator to display custom icons before the editor note title
    this.registerDocumentTitleDecorator({
      id: 'iconify-editor-title-icon',
      renderPrefix: (ctx) => {
        return (
          <IconifyEditorTitleIcon
            docId={ctx.doc.id}
            title={ctx.doc.title}
          />
        );
      },
    });

    // 8. Register Context Menu Item: Change Icon (File Tree - Folders & Files)
    this.registerContextMenuItem({
      id: 'change-icon',
      title: 'Change icon',
      icon: <SparklesIcon size={14} />,
      scope: 'file-tree',
      group: 'tools',
      order: 45,
      isVisible: (_app, data) => Boolean((data as DocumentItem)?.id),
      customSubmenu: ({ data, onClose }) => {
        const doc = data as DocumentItem;
        const isFolder = Boolean(doc.is_folder);
        const entry = useIconifyStore.getState().icons[doc.id];
        return (
          <IconPicker
            isOpen={true}
            onClose={onClose}
            variant="submenu"
            emojiStyle={useIconifyStore.getState().emojiStyle}
            title={`Icon for “${doc.title}”`}
            headerIcon={
              isFolder ? (
                <Folder01Icon size={14} className="text-[var(--flint-accent,#ea580c)] shrink-0" />
              ) : (
                <File01Icon size={14} className="text-[var(--flint-accent,#ea580c)] shrink-0" />
              )
            }
            currentIconId={entry?.iconId}
            onSelectIcon={async (iconId) => {
              await useIconifyStore.getState().setIcon(doc.id, iconId, undefined, isFolder ? 'folder' : 'file');
              onClose();
            }}
            onResetToDefault={
              entry
                ? async () => {
                    await useIconifyStore.getState().removeIcon(doc.id);
                    onClose();
                  }
                : undefined
            }
            resetLabel="Reset default icon"
          />
        );
      },
    });

    // 7. Register Context Menu Item: Remove Icon (File Tree)
    this.registerContextMenuItem({
      id: 'remove-icon',
      title: 'Remove custom icon',
      icon: <RotateCcwIcon size={14} />,
      scope: 'file-tree',
      group: 'tools',
      order: 46,
      isVisible: (_app, data) => {
        const doc = data as DocumentItem;
        if (!doc?.id) return false;
        return Boolean(useIconifyStore.getState().icons[doc.id]);
      },
      onClick: async (_app, data) => {
        if (data && (data as DocumentItem).id) {
          await useIconifyStore.getState().removeIcon((data as DocumentItem).id);
        }
      },
    });

    // 8. Register Context Menu Item: Change Icon (Tab Context Menu)
    this.registerContextMenuItem({
      id: 'tab-change-icon',
      title: 'Change icon',
      icon: <SparklesIcon size={14} />,
      scope: 'tab',
      group: 'tab-actions',
      order: 35,
      isVisible: (_app, data) => {
        const tab = data as TabItem;
        return Boolean(tab?.document_id && !tab.document_id.startsWith('__'));
      },
      customSubmenu: ({ data, onClose }) => {
        const tab = data as TabItem;
        const docId = tab.document_id!;
        const doc = this.app.hearth.documents.find((d) => d.id === docId);
        const isFolder = Boolean(doc?.is_folder);
        const entry = useIconifyStore.getState().icons[docId];
        const title = tab.title || doc?.title || 'Tab';

        return (
          <IconPicker
            isOpen={true}
            onClose={onClose}
            variant="submenu"
            emojiStyle={useIconifyStore.getState().emojiStyle}
            title={`Icon for “${title}”`}
            headerIcon={
              isFolder ? (
                <Folder01Icon size={14} className="text-[var(--flint-accent,#ea580c)] shrink-0" />
              ) : (
                <File01Icon size={14} className="text-[var(--flint-accent,#ea580c)] shrink-0" />
              )
            }
            currentIconId={entry?.iconId}
            onSelectIcon={async (iconId) => {
              await useIconifyStore.getState().setIcon(docId, iconId, undefined, isFolder ? 'folder' : 'file');
              onClose();
            }}
            onResetToDefault={
              entry
                ? async () => {
                    await useIconifyStore.getState().removeIcon(docId);
                    onClose();
                  }
                : undefined
            }
            resetLabel="Reset default icon"
          />
        );
      },
    });

    // 9. Register Context Menu Item: Remove Icon (Tab Context Menu)
    this.registerContextMenuItem({
      id: 'tab-remove-icon',
      title: 'Remove custom icon',
      icon: <RotateCcwIcon size={14} />,
      scope: 'tab',
      group: 'tab-actions',
      order: 36,
      isVisible: (_app, data) => {
        const tab = data as TabItem;
        if (!tab?.document_id || tab.document_id.startsWith('__')) return false;
        return Boolean(useIconifyStore.getState().icons[tab.document_id]);
      },
      onClick: async (_app, data) => {
        const tab = data as TabItem;
        if (tab?.document_id) {
          await useIconifyStore.getState().removeIcon(tab.document_id);
        }
      },
    });

    // 10. Register Document Menu Action: Change Note Icon
    this.registerDocMenuAction({
      id: 'doc-change-icon',
      title: 'Change note icon',
      icon: <SparklesIcon size={14} className="text-[#8b8e95] group-hover:text-white shrink-0" />,
      group: 'tools',
      order: 25,
      onClick: (app) => {
        const doc = app.hearth.activeDocument;
        if (doc) {
          useIconifyStore.getState().openPicker({
            id: doc.id,
            title: doc.title,
            isFolder: Boolean(doc.is_folder),
          });
        }
      },
    });

    // 11. Register Global Modal for the Icon Picker
    this.registerModal({
      id: 'picker-modal',
      render: () => <IconifyPickerModal />,
    });

    // 12. Register Settings Tab
    this.registerSettingTab({
      id: 'iconify-settings',
      name: 'Iconify',
      icon: <SparklesIcon size={14} />,
      render: () => <IconifySettingsTab />,
    });

    // 13. Register Commands
    this.addCommand({
      id: 'toggle-default-folder-icons',
      title: 'Iconify: Toggle default folder icons',
      section: 'Settings',
      icon: <Folder01Icon size={16} />,
      action: () => {
        const current = useIconifyStore.getState().showDefaultFolderIcons;
        useIconifyStore.getState().setShowDefaultFolderIcons(!current);
      },
    });

    this.addCommand({
      id: 'toggle-default-file-icons',
      title: 'Iconify: Toggle default file icons',
      section: 'Settings',
      icon: <File01Icon size={16} />,
      action: () => {
        const current = useIconifyStore.getState().showDefaultFileIcons;
        useIconifyStore.getState().setShowDefaultFileIcons(!current);
      },
    });

    this.addCommand({
      id: 'reset-all',
      title: 'Iconify: Reset all custom icons',
      section: 'Settings',
      icon: <RotateCcwIcon size={16} />,
      action: async () => {
        await useIconifyStore.getState().clearAllIcons();
      },
    });

    // 14. Register MCP Tools per Flint Rule 5
    // ── Tool: list ──
    this.registerTool({
      name: 'list',
      description: 'List all folders and files with customized icons in the current Hearth.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Filter items by type: "all", "folder", or "file"',
            enum: ['all', 'folder', 'file'],
          },
        },
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const typeFilter = String(args.type || 'all').toLowerCase();
          const icons = useIconifyStore.getState().icons;
          const documents = this.app.hearth.documents;

          const entries = Object.entries(icons).filter(([itemId, entry]) => {
            const doc = documents.find((d) => d.id === itemId);
            const isFolder = entry.itemType === 'folder' || (doc ? Boolean(doc.is_folder) : false);
            if (typeFilter === 'folder' && !isFolder) return false;
            if (typeFilter === 'file' && isFolder) return false;
            return true;
          });

          const result = entries.map(([itemId, entry]) => {
            const doc = documents.find((d) => d.id === itemId);
            const isFolder = entry.itemType === 'folder' || (doc ? Boolean(doc.is_folder) : false);
            const iconDef = getIconifyIconDef(entry.iconId);
            return {
              itemId,
              title: doc?.title || 'Unknown',
              itemType: isFolder ? 'folder' : 'file',
              iconId: entry.iconId,
              iconName: iconDef?.name || entry.iconId,
              category: iconDef?.category || 'Common',
              color: entry.color || null,
            };
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  totalCustomIcons: result.length,
                  filter: typeFilter,
                  items: result,
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

    // ── Tool: get ──
    this.registerTool({
      name: 'get',
      description: 'Get the custom icon configuration for a specific folder or file ID.',
      parameters: {
        type: 'object',
        properties: {
          itemId: {
            type: 'string',
            description: 'Unique document or folder ID',
          },
        },
        required: ['itemId'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const itemId = String(args.itemId || '').trim();
          if (!itemId) {
            throw new Error("Parameter 'itemId' is required.");
          }

          const entry = useIconifyStore.getState().icons[itemId];
          if (!entry) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    itemId,
                    hasCustomIcon: false,
                  }),
                },
              ],
            };
          }

          const doc = this.app.hearth.documents.find((d) => d.id === itemId);
          const isFolder = entry.itemType === 'folder' || (doc ? Boolean(doc.is_folder) : false);
          const iconDef = getIconifyIconDef(entry.iconId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  itemId,
                  title: doc?.title || 'Unknown',
                  itemType: isFolder ? 'folder' : 'file',
                  hasCustomIcon: true,
                  iconId: entry.iconId,
                  iconName: iconDef?.name || entry.iconId,
                  category: iconDef?.category || 'Common',
                  color: entry.color || null,
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

    // ── Tool: set ──
    this.registerTool({
      name: 'set',
      description: 'Assign a custom icon to a folder or file by its document ID.',
      parameters: {
        type: 'object',
        properties: {
          itemId: {
            type: 'string',
            description: 'Unique folder or file document ID',
          },
          iconId: {
            type: 'string',
            description: 'Icon ID from the catalog (e.g. "star", "code", "book", "tag", "heart")',
          },
          color: {
            type: 'string',
            description: 'Optional hex color (e.g. "#ea580c")',
          },
          itemType: {
            type: 'string',
            description: 'Optional item type: "folder" or "file"',
            enum: ['folder', 'file'],
          },
        },
        required: ['itemId', 'iconId'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const itemId = String(args.itemId || '').trim();
          const iconId = String(args.iconId || '').trim();
          const color = args.color ? String(args.color).trim() : undefined;
          const itemType = args.itemType ? (String(args.itemType).trim() as IconItemType) : undefined;

          if (!itemId) {
            throw new Error("Parameter 'itemId' is required.");
          }
          if (!iconId) {
            throw new Error("Parameter 'iconId' is required.");
          }

          await useIconifyStore.getState().setIcon(itemId, iconId, color, itemType);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  itemId,
                  iconId,
                  color: color || null,
                  itemType: itemType || null,
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

    // ── Tool: remove ──
    this.registerTool({
      name: 'remove',
      description: 'Remove custom icon from a folder or file, reverting it to the default icon.',
      isDestructive: true,
      parameters: {
        type: 'object',
        properties: {
          itemId: {
            type: 'string',
            description: 'Unique folder or file document ID to reset',
          },
        },
        required: ['itemId'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const itemId = String(args.itemId || '').trim();
          if (!itemId) {
            throw new Error("Parameter 'itemId' is required.");
          }

          await useIconifyStore.getState().removeIcon(itemId);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  itemId,
                  message: 'Custom icon removed successfully.',
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

export default IconifyExtension;
