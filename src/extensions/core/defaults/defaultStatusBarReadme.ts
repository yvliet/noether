export const defaultStatusBarReadme = `# Status Bar & Vault Stats

Bottom window status bar indicators, word count, character count, and database synchronization status.

---

## Overview

The **Status Bar** extension manages the persistent information footer along the bottom edge of Flint's main window. It renders real-time word/character counts, SQLite sync state, and slot positions for third-party extensions.

---

## Architecture & Flint APIs

This extension showcases left and right status bar registration and live editor metric tracking.

### 1. Registering Left & Right Status Bar Items
\`\`\`tsx
this.app.statusBar.registerStatusBarItem({
  id: 'word-counter',
  position: 'left',
  render: () => <WordCounterStatusBarItem />,
});

this.app.statusBar.registerStatusBarItem({
  id: 'sync-indicator',
  position: 'right',
  render: () => <SyncStatusIndicator />,
});
\`\`\`

---

## Developer Guide: Building Custom Status Bar Widgets

\`\`\`tsx
import { Extension } from '@/core/extensions/Extension';

export class GitStatusBarExtension extends Extension {
  async onload() {
    this.addStatusBarItem({
      id: 'git-branch',
      alignment: 'left',
      order: 5,
      render: () => <span className="text-[#777]">main</span>,
    });
  }
}
\`\`\`
`;
