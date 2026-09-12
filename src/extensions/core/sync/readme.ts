export const syncReadme = `# Sync Engine

Bidirectional cloud synchronization connecting your local notes to Supabase, Turso, Cloudflare D1, or Custom REST backends.

---

## 1. Overview & User Experience

Your notes belong to you. Noether is local-first by design, keeping your Markdown files safely on your local disk. However, when working across multiple devices (such as your desktop workstation and laptop), having seamless cloud synchronization without recurring monthly subscription fees is invaluable.

The **Sync** extension provides multi-provider cloud synchronization. You can connect your vault to your own free-tier cloud database (Supabase PostgreSQL, Turso LibSQL, Cloudflare D1, or custom REST APIs), keeping your notes in sync with zero third-party subscription costs.

### Where It Lives in Noether
- **Status Bar Indicator**: Displays active cloud sync status, progress animations, and error alerts in the bottom window dock.
- **Settings Window**: Configure credentials and guided SQL schema setup under **Settings** (\`Ctrl+,\`) → **Sync**.
- **Command Palette**: Trigger instant sync or inspect telemetry via \`Ctrl+K\` commands.

## 2. Features & Step-by-Step Guide

### 1. Supported Storage Backends
- **Supabase**: Free-tier cloud PostgreSQL with automatic table creation scripts.
- **Turso**: Edge-replicated LibSQL database with minimal latency worldwide.
- **Cloudflare D1**: Serverless SQLite database running directly on Cloudflare Workers.
- **Custom REST API**: Connect to any custom server or self-hosted sync backend.

### 2. Guided Setup Walkthrough
1. Open **Settings** (\`Ctrl+,\`) → **Sync** and enable the extension toggle.
2. Choose your preferred cloud provider (e.g. **Supabase**).
3. Copy the provided schema SQL script and run it once in your provider's web console to create the synchronization tables.
4. Paste your database URL and API key into the settings inputs.
5. Click **Verify Connection**. Once confirmed, click **Sync Now** to trigger the initial sync cycle.

### 3. Key Sync Behaviors
- **Incremental Delta Sync**: Only documents modified since the last sync timestamp are transmitted across the wire, minimizing network bandwidth.
- **Tombstone Deletions**: When you delete a note on one machine, a tombstone record ensures the deletion propagates cleanly rather than resurrecting the old note.
- **Debounced Auto-Sync**: Automatically syncs 2.5 seconds after note edits or additions.
- **Conflict Resolution**: Choose between *Last Write Wins*, *Remote Cloud Wins*, *Local Device Wins*, or *Keep Both* (saves conflicting copies).

### 4. Keyboard Shortcuts & Commands

| Action | Shortcut / Access | Description |
| :--- | :--- | :--- |
| **Sync Now** | Command Palette | Triggers an immediate bidirectional synchronization cycle. |
| **Inspect Sync Status** | Command Palette | Opens sync telemetry details and connection health. |

## 3. Architecture & SDK Blueprint (For Extension Builders)

The Sync extension demonstrates how to manage long-running background engine workers, persist extension-specific configuration via \`loadData\` / \`saveData\`, and render status bar badges via the Noether SDK.

### SDK Extension Points Used
- \`this.loadData()\` / \`this.saveData()\`: Persists credentials and local-to-remote ID mappings safely in vault settings.
- \`this.addStatusBarItem()\`: Mounts the interactive cloud status badge in the bottom window frame.
- \`this.addCommand()\`: Registers palette shortcuts for manual sync triggering.
- \`this.registerSettingTab()\`: Injects the multi-provider credential setup wizard.
- \`this.registerTool()\`: Exposes MCP AI tools for automated background synchronization.

### Real SDK Implementation Pattern

Extension builders can maintain background synchronization state using this SDK pattern:

\`\`\`typescript
import { Extension, NoetherApp } from 'noether';

export default class CustomBackupExtension extends Extension {
  private timer: number | null = null;

  async onload(): Promise<void> {
    // 1. Load Persisted Extension Configuration
    const config = await this.loadData<{ backupIntervalMinutes: number }>();
    const interval = (config?.backupIntervalMinutes || 30) * 60 * 1000;

    // 2. Set up Periodic Background Routine
    this.timer = window.setInterval(async () => {
      await this.runBackup();
    }, interval);

    // 3. Register Status Bar Indicator
    this.addStatusBarItem({
      id: 'backup-status',
      position: 'right',
      render: () => {
        return React.createElement(
          'span',
          { className: 'text-xs text-[var(--noether-text-muted)] cursor-default' },
          '☁️ Synced'
        );
      },
    });
  }

  async onunload(): Promise<void> {
    // Clean up background timer on unload
    if (this.timer) {
      window.clearInterval(this.timer);
    }
  }
}
\`\`\`

## 4. MCP Tools Reference

Sync exposes three MCP tools for programmatic cloud operations:

### 1. \`sync_sync_now\`
- **Description**: Triggers a bidirectional synchronization cycle with the active cloud provider immediately.
- **Parameters**: None.
- **Returns**: Result object containing upload count, download count, conflict count, and success boolean.

### 2. \`sync_get_sync_status\`
- **Description**: Returns the current sync state, active cloud provider name, last sync timestamp, and telemetry metrics.
- **Parameters**: None.
- **Returns**: Telemetry payload with pending uploads, pending downloads, and last error message.

### 3. \`sync_test_connection\`
- **Description**: Tests network reachability and schema credentials for the configured cloud provider.
- **Parameters**: None.
- **Returns**: Object confirming connection status and latency.
`;
