/**
 * @module JournalExtension
 * @description
 * Built-in core extension for creating and navigating to daily journal notes.
 * Registers action rail shortcut, command palette hotkey, and startup open hook.
 *
 * Uses native FlintApp APIs (app.workspace.setMainViewMode, app.hearth.openJournal).
 *
 * @since 0.2.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest, McpToolResult } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { Calendar01Icon } from '@/components/common/Icons';
import { DocumentItem } from '@/types';
import { getDocumentById } from '@/lib/db/documents';
import { useJournalSettings } from './journalSettings';
import { journalReadme } from './readme';

const LazyJournalSettingsTab = React.lazy(() =>
  import('./JournalSettingsTab').then((m) => ({ default: m.JournalSettingsTab }))
);

export const JOURNAL_MANIFEST: ExtensionManifest = {
  id: 'journal',
  name: 'Journal',
  version: '1.0.0',
  description: 'Quickly create and jump to periodic daily journal and logging notes.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['journal', 'daily-notes', 'calendar', 'habits', 'logging'],
  readme: journalReadme,
};

// Backwards compatibility manifest
export const DAILY_NOTES_MANIFEST: ExtensionManifest = {
  ...JOURNAL_MANIFEST,
  id: 'daily-notes',
};

function formatDailyDate(date: Date, formatStr: string): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const YYYY = date.getFullYear().toString();
  const YY = YYYY.slice(-2);
  const MM = (date.getMonth() + 1).toString().padStart(2, '0');
  const M = (date.getMonth() + 1).toString();
  const MMMM = months[date.getMonth()];
  const MMM = monthsShort[date.getMonth()];
  const DD = date.getDate().toString().padStart(2, '0');
  const D = date.getDate().toString();
  const dddd = days[date.getDay()];
  const ddd = daysShort[date.getDay()];

  return formatStr
    .replace(/YYYY/g, YYYY)
    .replace(/YY/g, YY)
    .replace(/MMMM/g, MMMM)
    .replace(/MMM/g, MMM)
    .replace(/MM/g, MM)
    .replace(/\bM\b/g, M)
    .replace(/DD/g, DD)
    .replace(/\bD\b/g, D)
    .replace(/dddd/g, dddd)
    .replace(/ddd/g, ddd);
}

export class JournalExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = JOURNAL_MANIFEST) {
    super(app, manifest);
  }

  /**
   * Resolves or creates the journal note for a given calendar date.
   *
   * @param date - Target date to resolve or create journal for (defaults to today).
   * @returns The resolved or newly created DocumentItem.
   */
  public async getOrCreateJournalNote(date: Date = new Date()): Promise<DocumentItem> {
    const { dailyFormat, dailyFolder } = useJournalSettings.getState();
    const format = dailyFormat || 'YYYY-MM-DD';
    const folder = (dailyFolder || '').trim();
    const dateFormatted = formatDailyDate(date, format);
    const dateTitle = dateFormatted.startsWith('Daily') ? dateFormatted : `Daily Note ${dateFormatted}`;

    const docs = this.app.hearth.documents;
    let targetFolderId: string | null = null;
    if (folder) {
      const getPath = (d: any): string => {
        const parts = [d.title];
        let curr = d.parent_id;
        const visited = new Set();
        while (curr && !visited.has(curr)) {
          visited.add(curr);
          const p = docs.find((x) => x.id === curr);
          if (!p) break;
          parts.unshift(p.title);
          curr = p.parent_id;
        }
        return parts.join('/');
      };

      const existingFolder = docs.find(
        (d) =>
          d.is_folder &&
          (d.title.toLowerCase() === folder.toLowerCase() ||
            getPath(d).toLowerCase() === folder.toLowerCase())
      );
      if (existingFolder) {
        targetFolderId = existingFolder.id;
      }
    }

    const existingNote = docs.find(
      (d) => !d.is_folder && d.title === dateTitle && (targetFolderId ? d.parent_id === targetFolderId : true)
    );

    if (existingNote) {
      return existingNote;
    }

    const newDoc = await this.app.hearth.createNewNote(dateTitle, targetFolderId);
    if (!newDoc) {
      throw new Error(`Failed to create daily journal note: "${dateTitle}"`);
    }
    return newDoc;
  }

  public async openJournalNote(date: Date = new Date()): Promise<DocumentItem> {
    const doc = await this.getOrCreateJournalNote(date);
    this.app.workspace.setMainViewMode('document');
    this.app.hearth.openDocument(doc.id);
    return doc;
  }

  public onload(): void {
    // 1. Register Action Rail item
    this.addActionRailIcon(
      'open-journal',
      <Calendar01Icon size={16} />,
      "Today's Journal (Ctrl+Shift+D)",
      async () => {
        await this.openJournalNote();
      },
      40
    );

    // 2. Register Command
    this.addCommand({
      id: 'cmd-journal',
      title: "Open today's Journal",
      section: 'Navigation',
      icon: <Calendar01Icon size={16} />,
      hotkey: 'Ctrl+Shift+D',
      action: async () => {
        await this.openJournalNote();
      },
    });

    // 3. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'journal-settings',
      name: 'Journal',
      icon: <Calendar01Icon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyJournalSettingsTab />
        </React.Suspense>
      ),
    });

    // 4. Open on startup if configured
    const { openOnStartup } = useJournalSettings.getState();
    if (openOnStartup) {
      setTimeout(() => {
        this.openJournalNote();
      }, 300);
    }

    // 5. Register MCP Tools
    // ── Tool: open_today ──
    this.registerTool({
      name: 'open_today',
      description: "Opens or creates today's daily journal note according to configured folder and date format settings.",
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (): Promise<McpToolResult> => {
        try {
          const doc = await this.openJournalNote(new Date());
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  document: {
                    id: doc.id,
                    title: doc.title,
                    parent_id: doc.parent_id,
                  },
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

    // ── Tool: open_date ──
    this.registerTool({
      name: 'open_date',
      description: "Opens or creates a daily journal note for a specific date (ISO format 'YYYY-MM-DD').",
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: "ISO date string, e.g. '2024-01-15'",
          },
        },
        required: ['date'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const dateStr = String(args.date || '').trim();
          if (!dateStr) {
            throw new Error("Parameter 'date' is required (e.g. '2024-01-15').");
          }
          const parts = dateStr.split('-').map(Number);
          if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
            throw new Error(`Invalid date format '${dateStr}'. Expected ISO format 'YYYY-MM-DD'.`);
          }
          const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
          const doc = await this.openJournalNote(targetDate);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  document: {
                    id: doc.id,
                    title: doc.title,
                    parent_id: doc.parent_id,
                  },
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

    // ── Tool: append_entry ──
    this.registerTool({
      name: 'append_entry',
      description: "Appends text entry to today's daily journal note.",
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Text content to append to the journal note',
          },
        },
        required: ['text'],
      },
      handler: async (args: Record<string, unknown>): Promise<McpToolResult> => {
        try {
          const text = String(args.text ?? '');
          if (!text.trim()) {
            throw new Error("Parameter 'text' cannot be empty.");
          }
          const doc = await this.getOrCreateJournalNote(new Date());

          // Load full content JSON from SQLite if not present in memory
          let fullDoc = doc;
          if (!fullDoc.content_json) {
            const dbDoc = await getDocumentById(doc.id);
            if (dbDoc) fullDoc = dbDoc;
          }

          let docContent: any = { type: 'doc', content: [] };
          if (fullDoc.content_json) {
            try {
              docContent = JSON.parse(fullDoc.content_json);
              if (!Array.isArray(docContent.content)) {
                docContent.content = [];
              }
            } catch {
              docContent = { type: 'doc', content: [] };
            }
          }

          const lines = text.split('\n');
          for (const line of lines) {
            docContent.content.push({
              type: 'paragraph',
              content: line ? [{ type: 'text', text: line }] : [],
            });
          }

          const updatedJson = JSON.stringify(docContent);
          this.app.hearth.saveDocument(doc.id, updatedJson, doc.title);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  documentId: doc.id,
                  title: doc.title,
                  appendedText: text,
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

// Backwards compatibility alias
export const JournalPlugin = JournalExtension;
export const DailyNotesPlugin = JournalExtension;
export const DailyNotesExtension = JournalExtension;
export default JournalExtension;
