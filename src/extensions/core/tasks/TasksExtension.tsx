/**
 * @module TasksExtension
 * @description
 * Built-in core extension aggregating todo items and checklists across all vault notes.
 * Registers the tasks dashboard view, action rail launcher, navigation command, and settings tab.
 *
 * Uses native NoetherApp APIs (app.workspace.setMainViewMode).
 *
 * @since 0.2.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { NoetherApp } from '@/core/app/NoetherApp';
import { CheckmarkSquare02Icon } from '@/components/common/Icons';
import manifest from './manifest.json';
import tasksReadme from './readme.md?raw';
import { useTasksSettings } from './tasksSettings';

const LazyTasksView = React.lazy(() =>
  import('./TasksView').then((m) => ({ default: m.TasksView }))
);
const LazyTasksSettingsTab = React.lazy(() =>
  import('./TasksSettingsTab').then((m) => ({ default: m.TasksSettingsTab }))
);

export const TASKS_MANIFEST: ExtensionManifest = {
  ...(manifest as ExtensionManifest),
  readme: tasksReadme,
};

export class TasksExtension extends Extension {
  constructor(app: NoetherApp, manifest: ExtensionManifest = TASKS_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Main View
    this.registerView({
      type: 'tasks',
      title: 'Tasks Center',
      icon: <CheckmarkSquare02Icon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyTasksView />
        </React.Suspense>
      ),
    });

    // 2. Register Action Rail item
    this.addActionRailIcon(
      'open-tasks-view',
      <CheckmarkSquare02Icon size={16} />,
      'Open tasks center',
      (app) => {
        app.workspace.openCustomTab({
          viewType: 'tasks',
          title: 'Tasks Center',
          documentId: '__tasks__',
          icon: <CheckmarkSquare02Icon size={14} />,
        });
      },
      60,
      (app) => {
        const tabs = app.workspace.getTabs();
        const activeTabId = app.workspace.activeTabId;
        const currentTab = tabs.find((t) => t.id === activeTabId);
        return (
          currentTab?.view_type === 'tasks' ||
          currentTab?.view_mode === 'tasks' ||
          app.workspace.mainViewMode === 'tasks'
        );
      }
    );

    // 3. Register Command
    this.addCommand({
      id: 'cmd-open-tasks',
      title: 'Open tasks center',
      section: 'Navigation',
      icon: <CheckmarkSquare02Icon size={16} />,
      action: (app) => {
        app.workspace.openCustomTab({
          viewType: 'tasks',
          title: 'Tasks Center',
          documentId: '__tasks__',
          icon: <CheckmarkSquare02Icon size={14} />,
        });
      },
    });

    // 4. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'tasks-settings',
      name: 'Tasks',
      icon: <CheckmarkSquare02Icon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyTasksSettingsTab />
        </React.Suspense>
      ),
      onRestoreDefaults: () => {
        useTasksSettings.getState().restoreDefaults();
      },
    });

    // ── MCP Tools Registration ──

    // 5. Tool: tasks_get_all
    this.registerTool({
      name: 'get_all',
      description: 'Get all markdown tasks and checklists across the entire vault, with optional status and search filters.',
      category: 'tasks',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter tasks by completion status',
            enum: ['all', 'pending', 'completed'],
          },
          search: {
            type: 'string',
            description: 'Search term to filter tasks by text content or document title',
          },
        },
        required: [],
      },
      handler: async (args: Record<string, unknown>, _app: NoetherApp): Promise<McpToolResult> => {
        try {
          const status = (args.status as string) || 'all';
          const search = (args.search as string) || '';
          const completedFilter = status === 'pending' ? false : status === 'completed' ? true : undefined;
          const tasks = await this.app.vault.getGlobalTasks({
            completed: completedFilter,
            query: search.trim() || undefined,
          });

          return {
            content: [{ type: 'text', text: JSON.stringify({ tasks, total: tasks.length }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 6. Tool: tasks_get_by_document
    this.registerTool({
      name: 'get_by_document',
      description: 'Retrieve all interactive task items associated with a specific note.',
      category: 'tasks',
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Target document identifier',
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
          const allTasks = await this.app.vault.getGlobalTasks();
          const tasks = allTasks.filter((t: any) => t.document_id === documentId);
          return {
            content: [{ type: 'text', text: JSON.stringify({ documentId, tasks, total: tasks.length }) }],
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    });

    // 7. Tool: tasks_toggle_status
    this.registerTool({
      name: 'toggle_status',
      description: 'Toggle or set the completion status of a checklist task item within a document.',
      category: 'tasks',
      isDestructive: false,
      parameters: {
        type: 'object',
        properties: {
          documentId: {
            type: 'string',
            description: 'Target document identifier containing the task',
          },
          taskText: {
            type: 'string',
            description: 'The exact or matching text content of the task item',
          },
          completed: {
            type: 'boolean',
            description: 'Target completion status: true for completed, false for pending',
          },
        },
        required: ['documentId', 'taskText', 'completed'],
      },
      handler: async (args: Record<string, unknown>, _app: NoetherApp): Promise<McpToolResult> => {
        try {
          const documentId = args.documentId as string;
          const taskText = args.taskText as string;
          const completed = Boolean(args.completed);
          if (!documentId || !taskText) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'documentId and taskText parameters are required' }],
            };
          }
          await this.app.vault.toggleTask(documentId, taskText, completed);
          return {
            content: [{ type: 'text', text: JSON.stringify({ success: true, documentId, taskText, completed }) }],
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

export default TasksExtension;
