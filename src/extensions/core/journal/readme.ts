export const journalReadme = `# Journal & Periodic Logging

Calendar-based daily journal entry creation, template pre-filling, and daily journal navigation.

---

## Overview

The **Journal** extension creates or opens date-stamped notes (e.g. \`2026-08-28.md\`) with a single click or keyboard shortcut. It supports customizable date formats, dedicated journal folders, and automatic template population.

---

## Architecture & Flint APIs

This extension showcases action rail integration, template injection, and command palette shortcuts.

### 1. Action Rail Quick-Action
\`\`\`tsx
this.addActionRailIcon(
  'open-journal',
  <Calendar01Icon size={16} />,
  "Today's Journal (Ctrl+Shift+D)",
  async (app) => {
    app.workspace.setMainViewMode('document');
    await app.hearth.openJournal();
  },
  40
);
\`\`\`

### 2. Auto-Creation Logic
\`\`\`tsx
async openTodayJournal() {
  const settings = this.app.settings.get('journal') || {};
  const format = settings.dateFormat || 'YYYY-MM-DD';
  const folder = settings.folder || 'Journal';
  const noteTitle = dayjs().format(format);

  let doc = await this.app.workspace.findDocumentByTitle(noteTitle);
  if (!doc) {
    doc = await this.app.workspace.createDocument({
      title: noteTitle,
      folder,
      content: settings.template || '# ' + noteTitle + '\\n\\n## Tasks\\n- [ ] ',
    });
  }

  this.app.workspace.openDocumentTab(doc.id);
}
\`\`\`
`;

export const dailyNotesReadme = journalReadme;
