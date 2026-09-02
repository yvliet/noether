export const defaultCommandsReadme = `# Default Commands

Core application command palette actions and global keyboard hotkeys.

---

## Overview

The **Default Commands** extension populates Flint's central Command Palette (\`Ctrl+P\` / \`Cmd+P\`) with essential workspace, editor, window, and view management actions.

---

## Architecture & Flint APIs

This extension showcases how to register global commands, modal openers, and keyboard hotkeys.

### 1. Registering Commands
\`\`\`tsx
this.app.commands.registerCommand({
  id: 'workspace:toggle-left-sidebar',
  name: 'Toggle Left Sidebar',
  hotkey: 'Mod+\\\\',
  callback: () => {
    useWorkspaceStore.getState().toggleLeftSidebar();
  },
});
\`\`\`

### 2. Modals & Settings Triggers
Commands can open application settings, quick switchers, or custom modals:

\`\`\`tsx
this.app.commands.registerCommand({
  id: 'app:open-settings',
  name: 'Open Settings',
  hotkey: 'Mod+,',
  callback: () => {
    useWorkspaceStore.getState().setIsSettingsOpen(true);
  },
});
\`\`\`

---

## Developer Guide: Registering Custom Hotkeys

\`\`\`tsx
import { Extension } from '@/core/extensions/Extension';

export class CustomHotkeyExtension extends Extension {
  async onload() {
    this.addCommand({
      id: 'my-custom-action',
      title: 'Run My Custom Action',
      hotkey: 'Ctrl+Shift+M',
      action: () => {
        this.app.workspace.showToast('Custom action fired!', 'info');
      },
    });
  }
}
\`\`\`
`;
