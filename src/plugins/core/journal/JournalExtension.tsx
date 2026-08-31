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
import { ExtensionManifest } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { Calendar01Icon } from '@/components/common/Icons';
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

  public async openJournalNote(): Promise<void> {
    const { dailyFormat, dailyFolder } = useJournalSettings.getState();
    const format = dailyFormat || 'YYYY-MM-DD';
    const folder = (dailyFolder || '').trim();
    const dateFormatted = formatDailyDate(new Date(), format);
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

    this.app.workspace.setMainViewMode('document');

    if (existingNote) {
      this.app.hearth.openDocument(existingNote.id);
    } else {
      const newDoc = await this.app.hearth.createNewNote(dateTitle, targetFolderId);
      if (newDoc) {
        this.app.hearth.openDocument(newDoc.id);
      }
    }
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
  }
}

// Backwards compatibility alias
export const JournalPlugin = JournalExtension;
export const DailyNotesPlugin = JournalExtension;
export const DailyNotesExtension = JournalExtension;
export default JournalExtension;
