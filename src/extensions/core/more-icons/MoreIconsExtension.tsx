/**
 * @module MoreIconsExtension
 * @description
 * Built-in core extension for customizing icons across Noether.
 * Allows assigning curated HugeIcons to folders, notes, canvases, files, and tabs.
 * Renders in the file tree, tab bar, context menus, and provides full MCP management.
 *
 * Exclusively integrates via the Noether SDK, IoC Registries, and EventBus.
 *
 * @author Yuliet Li
 * @since 1.2.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { NoetherApp } from '@/core/app/NoetherApp';
import { DocumentItem, TabItem } from '@/types';
import {
  MaskTheater02Icon,
  RotateCcwIcon,
  Folder01Icon,
  File01Icon,
} from '@/components/common/Icons';
import { dbAdapter } from '@/lib/db/adapter';
import {
  initMoreIconsDb,
  IconItemType,
  MORE_ICONS_TABLE_DEFINITION,
} from './moreIconsDb';
import { useMoreIconsStore } from './moreIconsStore';
import { IconPicker } from '@/components/common/IconPicker';
import {
  MoreIconsSlot,
  MoreIconsFileIconSlot,
  MoreIconsFolderPrefixSlot,
  MoreIconsBreadcrumbIcon,
  MoreIconsTabIcon,
} from './MoreIconsNode';
import { MoreIconsEditorTitleIcon } from './MoreIconsEditorTitleIcon';
import { MoreIconsPickerModal } from './MoreIconsPickerModal';
import { MoreIconsSettingsTab } from './MoreIconsSettingsTab';
import { IconChipExtension } from './IconChipExtension';
import { MoreIconsSubmenuPicker } from './MoreIconsSubmenuPicker';
import { getMoreIconsDef } from './moreIconsCatalog';
import { moreIconsReadme } from './readme';

export const MORE_ICONS_MANIFEST: ExtensionManifest = {
  id: 'more-icons',
  name: 'More icons',
  version: '1.2.0',
  description: 'Let icons live in all of Noether. Customize folders, files, tabs, and rich text documents with an extensible multi-pack icon system and SQLite persistence.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['icons', 'customization', 'file-tree', 'tabs', 'notes', 'ui', 'editor'],
  readme: moreIconsReadme,
};

export const ICONIFY_MANIFEST = MORE_ICONS_MANIFEST;

export class MoreIconsExtension extends Extension {
  constructor(app: NoetherApp, manifest: ExtensionManifest = MORE_ICONS_MANIFEST) {
    super(app, manifest);
  }

  public async onload(): Promise<void> {
    // 0. Register declarative SQLite schema via defineTable
    this.defineTable(MORE_ICONS_TABLE_DEFINITION).catch((err) => {
      console.error('[MoreIconsExtension] Failed to define icons table:', err);
    });

    // 1. Initial hydration from cache and DB
    await useMoreIconsStore.getState().loadIcons();

    // 2. Synchronize with SQLite when the database becomes ready
    const unsubDb = dbAdapter.onStatusChange(async (isReady) => {
      if (isReady) {
        await initMoreIconsDb();
        await useMoreIconsStore.getState().loadIcons();
      }
    });
    this.registerDisposable({ dispose: unsubDb });

    // 3. Clean up database records when documents/folders are deleted
    this.onEvent('document:deleted', async ({ id }) => {
      if (id) {
        await useMoreIconsStore.getState().removeIcon(id);
      }
    });

    // 4. Synchronize tab decorators on any More icons store mutation (instant atomic update across all tabs)
    const unsubStore = useMoreIconsStore.subscribe(() => {
      this.app.tabDecorators.notify();
    });
    this.registerDisposable({ dispose: unsubStore });

    // 5. Register FileTreeDecorator for rendering custom/default icons in the file tree
    this.registerFileTreeDecorator({
      id: 'more-icons-tree-decorator',
      renderIcon: (doc, context) => {
        const { enableFileIcons } = useMoreIconsStore.getState();
        if (!doc.is_folder) {
          if (!enableFileIcons) return context.defaultIcon;
          return <MoreIconsFileIconSlot doc={doc} />;
        }
        return context.defaultIcon;
      },
      renderPrefix: (doc, context) => {
        const { enableFolderIcons } = useMoreIconsStore.getState();
        if (doc.is_folder) {
          if (!enableFolderIcons) return null;
          return (
            <MoreIconsFolderPrefixSlot
              doc={doc}
              isOpen={context?.isOpen}
            />
          );
        }
        return null;
      },
    });

    // 6. Register TabDecorator to display custom icons in tab headers
    this.registerTabDecorator({
      id: 'more-icons-tab-decorator',
      matches: (_tab, doc) => {
        if (!doc?.id) return false;
        return Boolean(useMoreIconsStore.getState().icons[doc.id]);
      },
      getIcon: (_tab, doc) => {
        if (!doc?.id) return undefined;
        return <MoreIconsTabIcon docId={doc.id} />;
      },
    });

    // 7. Register BreadcrumbDecorator to display icons in subheader navigation breadcrumbs
    this.registerBreadcrumbDecorator({
      id: 'more-icons-breadcrumb-decorator',
      renderIcon: (item) => {
        const isFolder = Boolean(item.isFolder);
        const state = useMoreIconsStore.getState();
        if (isFolder && !state.enableFolderIcons) return null;
        if (!isFolder && !state.enableFileIcons) return null;
        return (
          <MoreIconsBreadcrumbIcon
            itemId={item.id}
            isFolder={isFolder}
          />
        );
      },
    });

    // 8. Register DocumentTitleDecorator to display custom icons before the editor note title
    this.registerDocumentTitleDecorator({
      id: 'more-icons-editor-title-icon',
      renderPrefix: (ctx) => {
        return (
          <MoreIconsEditorTitleIcon
            docId={ctx.doc.id}
            title={ctx.doc.title}
          />
        );
      },
    });

    // 9. Register Context Menu Item: Change Icon (File Tree - Folders & Files)
    this.registerContextMenuItem({
      id: 'change-icon',
      title: 'Change icon',
      icon: <MaskTheater02Icon size={14} />,
      scope: 'file-tree',
      group: 'tools',
      order: 45,
      isVisible: (_app, data) => {
        const doc = data as DocumentItem;
        if (!doc?.id) return false;
        const isFolder = Boolean(doc.is_folder);
        const state = useMoreIconsStore.getState();
        if (isFolder && !state.enableFolderIcons) return false;
        if (!isFolder && !state.enableFileIcons) return false;
        return true;
      },
      customSubmenu: ({ data, onClose }) => {
        const doc = data as DocumentItem;
        const isFolder = Boolean(doc.is_folder);
        const entry = useMoreIconsStore.getState().icons[doc.id];
        return (
          <IconPicker
            isOpen={true}
            onClose={onClose}
            variant="submenu"
            emojiStyle={useMoreIconsStore.getState().emojiStyle}
            title={`Icon for “${doc.title}”`}
            headerIcon={
              isFolder ? (
                <Folder01Icon size={14} className="text-[var(--noether-accent,#eb584d)] shrink-0" />
              ) : (
                <File01Icon size={14} className="text-[var(--noether-accent,#eb584d)] shrink-0" />
              )
            }
            currentIconId={entry?.iconId}
            onSelectIcon={async (iconId) => {
              await useMoreIconsStore.getState().setIcon(doc.id, iconId, undefined, isFolder ? 'folder' : 'file');
              onClose();
            }}
            onResetToDefault={
              entry
                ? async () => {
                    await useMoreIconsStore.getState().removeIcon(doc.id);
                    onClose();
                  }
                : undefined
            }
            resetLabel="Reset default icon"
          />
        );
      },
    });

    // 10. Register Context Menu Item: Remove Icon (File Tree)
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
        const isFolder = Boolean(doc.is_folder);
        const state = useMoreIconsStore.getState();
        if (isFolder && !state.enableFolderIcons) return false;
        if (!isFolder && !state.enableFileIcons) return false;
        return Boolean(state.icons[doc.id]);
      },
      onClick: async (_app, data) => {
        if (data && (data as DocumentItem).id) {
          await useMoreIconsStore.getState().removeIcon((data as DocumentItem).id);
        }
      },
    });

    // 11. Register Context Menu Item: Change Icon (Tab Context Menu)
    this.registerContextMenuItem({
      id: 'tab-change-icon',
      title: 'Change icon',
      icon: <MaskTheater02Icon size={14} />,
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
        const doc = this.app.vault.documents.find((d) => d.id === docId);
        const isFolder = Boolean(doc?.is_folder);
        const entry = useMoreIconsStore.getState().icons[docId];
        const title = tab.title || doc?.title || 'Tab';

        return (
          <IconPicker
            isOpen={true}
            onClose={onClose}
            variant="submenu"
            emojiStyle={useMoreIconsStore.getState().emojiStyle}
            title={`Icon for “${title}”`}
            headerIcon={
              isFolder ? (
                <Folder01Icon size={14} className="text-[var(--noether-accent,#eb584d)] shrink-0" />
              ) : (
                <File01Icon size={14} className="text-[var(--noether-accent,#eb584d)] shrink-0" />
              )
            }
            currentIconId={entry?.iconId}
            onSelectIcon={async (iconId) => {
              await useMoreIconsStore.getState().setIcon(docId, iconId, undefined, isFolder ? 'folder' : 'file');
              onClose();
            }}
            onResetToDefault={
              entry
                ? async () => {
                    await useMoreIconsStore.getState().removeIcon(docId);
                    onClose();
                  }
                : undefined
            }
            resetLabel="Reset default icon"
          />
        );
      },
    });

    // 12. Register Context Menu Item: Remove Icon (Tab Context Menu)
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
        return Boolean(useMoreIconsStore.getState().icons[tab.document_id]);
      },
      onClick: async (_app, data) => {
        const tab = data as TabItem;
        if (tab?.document_id) {
          await useMoreIconsStore.getState().removeIcon(tab.document_id);
        }
      },
    });

    // 13. Register Document Menu Action: Change Note Icon
    this.registerDocMenuAction({
      id: 'doc-change-icon',
      title: 'Change note icon',
      icon: <MaskTheater02Icon size={14} className="text-[#8b8e95] group-hover:text-white shrink-0" />,
      group: 'tools',
      order: 25,
      onClick: (app) => {
        const doc = app.vault.activeDocument;
        if (doc) {
          useMoreIconsStore.getState().openPicker({
            id: doc.id,
            title: doc.title,
            isFolder: Boolean(doc.is_folder),
          });
        }
      },
    });

    // 14. Register Global Modal for the Icon Picker
    this.registerModal({
      id: 'picker-modal',
      render: () => <MoreIconsPickerModal />,
    });

    // 15. Register Settings Tab
    this.registerSettingTab({
      id: 'more-icons-settings',
      name: 'More icons',
      icon: <MaskTheater02Icon size={14} />,
      render: () => <MoreIconsSettingsTab />,
      onRestoreDefaults: () => {
        useMoreIconsStore.getState().restoreDefaults();
      },
    });

    // 16. Register TipTap In-Document Icon Chip Extension
    this.registerEditorExtension(() => IconChipExtension);

    // 17. Register /icon Slash Command with dynamic flyout submenu selector
    this.registerSlashCommand({
      title: 'Icon',
      description: 'Insert an icon into your document',
      icon: <MaskTheater02Icon size={16} />,
      badge: 'New',
      isEnabled: () => useMoreIconsStore.getState().enableDocumentIcons,
      submenu: {
        id: 'more-icons-submenu',
        render: (props) => (
          <MoreIconsSubmenuPicker
            ref={props.ref}
            onSelect={(data) => {
              props.onSelect(data);
            }}
            onClose={props.onClose}
          />
        ),
      },
      command: ({ editor, range, iconId, pack, color }) => {
        const targetIcon = iconId || 'sparkles';
        const targetPack = pack || 'hugeicons';
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({
            type: 'iconChip',
            attrs: {
              iconId: targetIcon,
              pack: targetPack,
              color: color || null,
            },
          })
          .insertContent(' ')
          .run();
      },
    });

    // 18. Register Commands
    this.addCommand({
      id: 'toggle-folder-icons',
      title: 'More icons: Toggle folder icons',
      section: 'Settings',
      icon: <Folder01Icon size={16} />,
      action: () => {
        const current = useMoreIconsStore.getState().enableFolderIcons;
        useMoreIconsStore.getState().setEnableFolderIcons(!current);
      },
    });

    this.addCommand({
      id: 'toggle-file-icons',
      title: 'More icons: Toggle file icons',
      section: 'Settings',
      icon: <File01Icon size={16} />,
      action: () => {
        const current = useMoreIconsStore.getState().enableFileIcons;
        useMoreIconsStore.getState().setEnableFileIcons(!current);
      },
    });

    this.addCommand({
      id: 'toggle-document-icons',
      title: 'More icons: Toggle in-document icons (/icon)',
      section: 'Settings',
      icon: <MaskTheater02Icon size={16} />,
      action: () => {
        const current = useMoreIconsStore.getState().enableDocumentIcons;
        useMoreIconsStore.getState().setEnableDocumentIcons(!current);
      },
    });

    this.addCommand({
      id: 'toggle-default-folder-icons',
      title: 'More icons: Toggle default folder icons',
      section: 'Settings',
      icon: <Folder01Icon size={16} />,
      action: () => {
        const current = useMoreIconsStore.getState().showDefaultFolderIcons;
        useMoreIconsStore.getState().setShowDefaultFolderIcons(!current);
      },
    });

    this.addCommand({
      id: 'toggle-default-file-icons',
      title: 'More icons: Toggle default file icons',
      section: 'Settings',
      icon: <File01Icon size={16} />,
      action: () => {
        const current = useMoreIconsStore.getState().showDefaultFileIcons;
        useMoreIconsStore.getState().setShowDefaultFileIcons(!current);
      },
    });

    this.addCommand({
      id: 'reset-all',
      title: 'More icons: Reset all custom icons',
      section: 'Settings',
      icon: <RotateCcwIcon size={16} />,
      action: async () => {
        await useMoreIconsStore.getState().clearAllIcons();
      },
    });

    // 19. Register MCP Tools
    const handleList = async (args: Record<string, unknown>): Promise<McpToolResult> => {
      try {
        const typeFilter = String(args.type || 'all').toLowerCase();
        const icons = useMoreIconsStore.getState().icons;
        const documents = this.app.vault.documents;

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
          const iconDef = getMoreIconsDef(entry.iconId);
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
    };

    const handleGet = async (args: Record<string, unknown>): Promise<McpToolResult> => {
      try {
        const itemId = String(args.itemId || '').trim();
        if (!itemId) {
          throw new Error("Parameter 'itemId' is required.");
        }

        const entry = useMoreIconsStore.getState().icons[itemId];
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

        const doc = this.app.vault.documents.find((d) => d.id === itemId);
        const isFolder = entry.itemType === 'folder' || (doc ? Boolean(doc.is_folder) : false);
        const iconDef = getMoreIconsDef(entry.iconId);
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
    };

    const handleUpdate = async (args: Record<string, unknown>): Promise<McpToolResult> => {
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

        await useMoreIconsStore.getState().setIcon(itemId, iconId, color, itemType);

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
    };

    const handleDelete = async (args: Record<string, unknown>): Promise<McpToolResult> => {
      try {
        const itemId = String(args.itemId || '').trim();
        if (!itemId) {
          throw new Error("Parameter 'itemId' is required.");
        }

        await useMoreIconsStore.getState().removeIcon(itemId);

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
    };

    // Primary MCP tools: more-icons_*
    this.registerTool({
      name: 'list',
      description: 'List all folders and files with customized icons in the current Vault.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Filter items by type: "all", "folder", or "file"',
            enum: ['all', 'folder', 'file'],
          },
        },
        required: [],
      },
      handler: handleList,
    });

    this.registerTool({
      name: 'get',
      description: 'Get details about a custom icon assigned to a specific folder or file.',
      parameters: {
        type: 'object',
        properties: {
          itemId: {
            type: 'string',
            description: 'Unique folder or file document ID',
          },
        },
        required: ['itemId'],
      },
      handler: handleGet,
    });

    this.registerTool({
      name: 'update_icon',
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
            description: 'Optional hex color (e.g. "#eb584d")',
          },
          itemType: {
            type: 'string',
            description: 'Optional item type: "folder" or "file"',
            enum: ['folder', 'file'],
          },
        },
        required: ['itemId', 'iconId'],
      },
      handler: handleUpdate,
    });

    this.registerTool({
      name: 'delete_icon',
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
      handler: handleDelete,
    });

    // Backward-compatibility aliases for legacy iconify_* MCP tools
    const legacyAliases = [
      { name: 'iconify_list', handler: handleList, desc: 'List custom icons (legacy alias).' },
      { name: 'iconify_get', handler: handleGet, desc: 'Get custom icon details (legacy alias).' },
      { name: 'iconify_update_icon', handler: handleUpdate, desc: 'Assign custom icon (legacy alias).' },
      { name: 'iconify_delete_icon', handler: handleDelete, desc: 'Remove custom icon (legacy alias).', isDestructive: true },
    ];

    for (const alias of legacyAliases) {
      const d = this.app.tools.registerTool({
        name: alias.name,
        description: alias.desc,
        isDestructive: alias.isDestructive,
        parameters: { type: 'object', properties: {}, required: [] },
        extensionId: this.manifest.id,
        handler: alias.handler,
      });
      this.registerDisposable(d);
    }
  }
}

export const IconifyExtension = MoreIconsExtension;
export default MoreIconsExtension;
