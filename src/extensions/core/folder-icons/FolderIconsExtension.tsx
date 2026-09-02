/**
 * @module FolderIconsExtension
 * @description
 * Built-in community extension for customizing folder icons in the Hearth file tree.
 * Allows right-clicking folders to select curated HugeIcons, renders smooth
 * hover-to-chevron transformations, and provides full MCP management.
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
import { DocumentItem } from '@/types';
import {
  SparklesIcon,
  RotateCcwIcon,
  Folder01Icon,
} from '@/components/common/Icons';
import { dbAdapter } from '@/lib/db/adapter';
import { initFolderIconsDb } from './folderIconsDb';
import { useFolderIconsStore } from './folderIconsStore';
import { IconPicker } from '@/components/common/IconPicker';
import { FolderIconNode, FolderIconSlot } from './FolderIconNode';
import { FolderIconPickerModal } from './FolderIconPickerModal';
import { FolderIconsSettingsTab } from './FolderIconsSettingsTab';
import { FOLDER_ICONS_CATALOG, getFolderIconDef } from './folderIconsCatalog';
import { folderIconsReadme } from './readme';

export const FOLDER_ICONS_MANIFEST: ExtensionManifest = {
  id: 'flint-folder-icons',
  name: 'Folder Icons',
  version: '1.0.0',
  description: 'Customize folder icons in the file tree with a rich HugeIcons selector and smooth hover animations.',
  author: 'Yuliet Li',
  isCore: false,
  tags: ['folder', 'icons', 'customization', 'file-tree', 'ui'],
  readme: folderIconsReadme,
};

export class FolderIconsExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = FOLDER_ICONS_MANIFEST) {
    super(app, manifest);
  }

  public async onload(): Promise<void> {
    // 1. Initial hydration from cache and DB
    await useFolderIconsStore.getState().loadIcons();

    // 2. Synchronize with SQLite when the database becomes ready
    const unsubDb = dbAdapter.onStatusChange(async (isReady) => {
      if (isReady) {
        await initFolderIconsDb();
        await useFolderIconsStore.getState().loadIcons();
      }
    });
    this.registerDisposable({ dispose: unsubDb });

    // 3. Clean up database records when documents/folders are deleted
    this.onEvent('document:deleted', async ({ id }) => {
      if (id) {
        await useFolderIconsStore.getState().removeFolderIcon(id);
      }
    });

    // 3. Register FileTreeDecorator for rendering custom folder icons
    this.registerFileTreeDecorator({
      id: 'folder-icons-decorator',
      renderIcon: (doc, context) => {
        if (!doc.is_folder) return undefined;
        return (
          <FolderIconSlot
            folderId={doc.id}
            isOpen={context.isOpen}
            toggleOpen={context.toggleOpen}
            defaultIcon={context.defaultIcon}
          />
        );
      },
    });

    // 4. Register Context Menu Item: Change Folder Icon (Flyout Submenu)
    this.registerContextMenuItem({
      id: 'change-folder-icon',
      title: 'Change folder icon',
      icon: <SparklesIcon size={14} />,
      scope: 'file-tree',
      group: 'tools',
      order: 45,
      isVisible: (_app, data) => Boolean((data as DocumentItem)?.is_folder),
      customSubmenu: ({ data, onClose }) => {
        const doc = data as DocumentItem;
        const entry = useFolderIconsStore.getState().icons[doc.id];
        return (
          <IconPicker
            isOpen={true}
            onClose={onClose}
            variant="submenu"
            title={`Icon for “${doc.title}”`}
            headerIcon={<Folder01Icon size={14} className="text-[var(--flint-accent,#ea580c)] shrink-0" />}
            currentIconId={entry?.iconId}
            onSelectIcon={async (iconId) => {
              await useFolderIconsStore.getState().setFolderIcon(doc.id, iconId);
              onClose();
            }}
            onResetToDefault={
              entry
                ? async () => {
                    await useFolderIconsStore.getState().removeFolderIcon(doc.id);
                    onClose();
                  }
                : undefined
            }
            resetLabel="Reset default icon"
          />
        );
      },
    });

    // 5. Register Context Menu Item: Remove Folder Icon
    this.registerContextMenuItem({
      id: 'remove-folder-icon',
      title: 'Remove folder icon',
      icon: <RotateCcwIcon size={14} />,
      scope: 'file-tree',
      group: 'tools',
      order: 46,
      isVisible: (_app, data) => {
        const doc = data as DocumentItem;
        if (!doc?.is_folder) return false;
        return Boolean(useFolderIconsStore.getState().icons[doc.id]);
      },
      onClick: async (_app, data) => {
        if (data && (data as DocumentItem).is_folder) {
          await useFolderIconsStore.getState().removeFolderIcon((data as DocumentItem).id);
        }
      },
    });

    // 6. Register Global Modal for the Icon Picker
    this.registerModal({
      id: 'flint-folder-icons-picker',
      render: () => <FolderIconPickerModal />,
    });

    // 7. Register Settings Tab
    this.registerSettingTab({
      id: 'folder-icons-settings',
      name: 'Folder Icons',
      icon: <SparklesIcon size={14} />,
      render: () => <FolderIconsSettingsTab />,
    });

    // 8. Register Commands
    this.addCommand({
      id: 'folder-icons:reset-all',
      title: 'Folder Icons: Reset all custom folder icons',
      section: 'Settings',
      icon: <RotateCcwIcon size={16} />,
      action: async () => {
        await useFolderIconsStore.getState().clearAllIcons();
      },
    });

    // 9. Register MCP Tools
    // ── Tool: list ──
    this.registerTool({
      name: 'list',
      description: 'List all folders with customized icons in the current Hearth.',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (): Promise<McpToolResult> => {
        try {
          const icons = useFolderIconsStore.getState().icons;
          const documents = this.app.hearth.documents;
          const result = Object.entries(icons).map(([folderId, entry]) => {
            const folderDoc = documents.find((d) => d.id === folderId);
            const iconDef = getFolderIconDef(entry.iconId);
            return {
              folderId,
              folderTitle: folderDoc?.title || 'Unknown',
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
                  totalCustomFolders: result.length,
                  folders: result,
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
      description: 'Get the custom icon configuration for a specific folder ID.',
      parameters: {
        type: 'object',
        properties: {
          folderId: {
            type: 'string',
            description: 'Unique folder document ID',
          },
        },
        required: ['folderId'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const folderId = String(args.folderId || '').trim();
          if (!folderId) {
            throw new Error("Parameter 'folderId' is required.");
          }

          const entry = useFolderIconsStore.getState().icons[folderId];
          if (!entry) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    folderId,
                    hasCustomIcon: false,
                  }),
                },
              ],
            };
          }

          const iconDef = getFolderIconDef(entry.iconId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  folderId,
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
      description: 'Assign a custom icon to a folder by folder ID.',
      parameters: {
        type: 'object',
        properties: {
          folderId: {
            type: 'string',
            description: 'Unique folder document ID',
          },
          iconId: {
            type: 'string',
            description: 'Icon ID from the catalog (e.g. "star", "code", "book", "tag", "heart")',
          },
          color: {
            type: 'string',
            description: 'Optional hex color (e.g. "#ea580c")',
          },
        },
        required: ['folderId', 'iconId'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const folderId = String(args.folderId || '').trim();
          const iconId = String(args.iconId || '').trim();
          const color = args.color ? String(args.color).trim() : undefined;

          if (!folderId) {
            throw new Error("Parameter 'folderId' is required.");
          }
          if (!iconId) {
            throw new Error("Parameter 'iconId' is required.");
          }

          await useFolderIconsStore.getState().setFolderIcon(folderId, iconId, color);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  folderId,
                  iconId,
                  color: color || null,
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
      description: 'Remove custom icon from a folder, reverting it to the default chevron.',
      isDestructive: true,
      parameters: {
        type: 'object',
        properties: {
          folderId: {
            type: 'string',
            description: 'Unique folder document ID to reset',
          },
        },
        required: ['folderId'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const folderId = String(args.folderId || '').trim();
          if (!folderId) {
            throw new Error("Parameter 'folderId' is required.");
          }

          await useFolderIconsStore.getState().removeFolderIcon(folderId);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  folderId,
                  message: 'Folder icon removed successfully.',
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

export default FolderIconsExtension;
