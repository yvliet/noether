# Starter Templates & Boilerplates

Kickstart your Flint extension or theme with production-ready, copyable starter boilerplates. Every boilerplate includes strict TypeScript types, bundling configurations, and instant lifecycle integration with the Flint SDK.


## 1. Quick CLI Scaffolder (1-Liner)

---

Run this one-liner in your terminal to bootstrap an extension project in your Hearth's `.flint/plugins/` directory:

```bash
# Create directory and initialize project

---
mkdir -p my-flint-plugin/src && cd my-flint-plugin && npm init -y
npm install --save-dev typescript esbuild @types/node @types/react
```


## 2. Minimal Extension Starter

---

A lightweight, zero-bloat extension template registering an Action Rail icon, a Command Palette action, and a bottom Status Bar item.

#### `manifest.json`
```json
{
  "id": "minimal-extension",
  "name": "Minimal Extension Starter",
  "version": "1.0.0",
  "minAppVersion": "0.2.0",
  "description": "Clean foundation for building custom Flint UI and command extensions.",
  "author": "Yuliet Li",
  "authorUrl": "https://github.com/yvliet",
  "tags": ["utility", "starter"]
}
```

#### `package.json`
```json
{
  "name": "flint-minimal-extension",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "node build.js",
    "watch": "node build.js --watch"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "esbuild": "^0.25.0",
    "typescript": "^5.7.0"
  },
  "peerDependencies": {
    "flint": "^0.2.0"
  }
}
```

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

#### `src/main.ts`
```typescript
import { Extension, FlintApp } from 'flint';

export default class MinimalStarterExtension extends Extension {
  async onload(): Promise<void> {
    console.log(`[${this.manifest.name}] Initialized.`);

    // 1. Register Action Rail Icon (Left Toolbar)
    this.addActionRailIcon(
      'starter-action-btn',
      '⚡',
      'Trigger Starter Action',
      (app: FlintApp) => {
        const title = app.workspace.activeDocument?.title || 'No active note';
        app.workspace.showToast(`Active document: "${title}"`, 'info');
      }
    );

    // 2. Register Command in Command Palette (Ctrl+K / Cmd+K)
    this.addCommand({
      id: 'quick-action',
      title: 'Minimal Starter: Run Quick Action',
      hotkey: 'Ctrl+Shift+P',
      action: (app: FlintApp) => {
        app.workspace.showToast('Starter command executed successfully!', 'success');
      },
    });

    // 3. Register Status Bar Indicator (Bottom Bar)
    this.addStatusBarItem({
      id: 'starter-status',
      alignment: 'right',
      render: () => '⚡ Ready',
      onClick: (app: FlintApp) => {
        app.workspace.showToast('Status bar clicked', 'info');
      },
    });
  }

  async onunload(): Promise<void> {
    console.log(`[${this.manifest.name}] Cleaned up.`);
  }
}
```

#### `build.js` (esbuild bundler)
```javascript
const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'main.js',
  format: 'cjs',
  target: 'es2022',
  external: ['flint', 'react', 'react-dom'],
  sourcemap: 'inline',
};

if (isWatch) {
  esbuild.context(buildOptions).then((ctx) => {
    ctx.watch();
    console.log('Watching for changes...');
  });
} else {
  esbuild.build(buildOptions).then(() => {
    console.log('Build complete: main.js');
  });
}
```


## 3. Model Context Protocol (MCP) Tool Provider Starter

---

A specialized extension template that exposes structured AI Agent tools to LLM copilots via Flint's Model Context Protocol bridge.

#### `manifest.json`
```json
{
  "id": "mcp-tool-provider",
  "name": "MCP Tool Provider Starter",
  "version": "1.0.0",
  "minAppVersion": "0.2.0",
  "description": "Exposes structured query and note inspection tools to AI agent copilots.",
  "author": "Yuliet Li",
  "authorUrl": "https://github.com/yvliet",
  "tags": ["ai", "mcp", "copilot"]
}
```

#### `src/main.ts`
```typescript
import { Extension, McpToolDefinition, McpToolResult } from 'flint';

export default class McpStarterExtension extends Extension {
  async onload(): Promise<void> {
    console.log(`[${this.manifest.name}] Registering MCP Copilot Tools...`);

    // Register Structured Tool: search_tagged_notes
    this.registerTool({
      name: 'search_tagged_notes',
      description: 'Search for markdown notes matching a specific tag or keyword in the active Hearth.',
      parameters: {
        type: 'object',
        properties: {
          tag: {
            type: 'string',
            description: 'The tag to filter notes by (e.g., #todo, #architecture).',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of notes to return (default: 10).',
          },
        },
        required: ['tag'],
      },
      handler: async (args: { tag: string; maxResults?: number }): Promise<McpToolResult> => {
        const { tag, maxResults = 10 } = args;

        // Query in-memory metadata index via Flint host
        const notes = await this.app.db.query(
          `SELECT id, title, path FROM documents 
           WHERE tags LIKE ? 
           LIMIT ?`,
          [`%${tag}%`, maxResults]
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(notes, null, 2),
            },
          ],
        };
      },
    });
  }

  async onunload(): Promise<void> {
    console.log(`[${this.manifest.name}] MCP Tools unregistered.`);
  }
}
```


## 4. SQLite Relational Storage Starter

---

Template demonstrating how to dynamically create custom SQLite tables, execute queries, and subscribe to relational updates via the Flint EventBus.

#### `manifest.json`
```json
{
  "id": "relational-storage-plugin",
  "name": "Relational Storage Starter",
  "version": "1.0.0",
  "minAppVersion": "0.2.0",
  "description": "Dynamic SQLite schema management, index creation, and reactive event listeners.",
  "author": "Yuliet Li",
  "authorUrl": "https://github.com/yvliet",
  "tags": ["database", "sqlite", "storage"]
}
```

#### `src/main.ts`
```typescript
import { Extension } from 'flint';

export default class RelationalStorageExtension extends Extension {
  async onload(): Promise<void> {
    // 1. Dynamically initialize extension SQLite table
    await this.app.db.execute(`
      CREATE TABLE IF NOT EXISTS plugin_reading_progress (
        document_id TEXT PRIMARY KEY,
        scroll_percentage REAL DEFAULT 0,
        completed INTEGER DEFAULT 0,
        last_read_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_reading_progress_date 
      ON plugin_reading_progress (last_read_at);
    `);

    // 2. Listen to document deletions to keep table clean
    this.registerEvent(
      this.app.events.on('document:deleted', async (event) => {
        await this.app.db.execute(
          'DELETE FROM plugin_reading_progress WHERE document_id = ?',
          [event.documentId]
        );
      })
    );

    // 3. Register Command to Mark Active Note Completed
    this.addCommand({
      id: 'mark-completed',
      title: 'Reading Progress: Mark Document Completed',
      action: async (app) => {
        const doc = app.workspace.activeDocument;
        if (!doc) return;

        await this.app.db.execute(
          `INSERT INTO plugin_reading_progress (document_id, scroll_percentage, completed, last_read_at)
           VALUES (?, 1.0, 1, ?)
           ON CONFLICT(document_id) DO UPDATE SET completed = 1, last_read_at = ?`,
          [doc.id, Date.now(), Date.now()]
        );

        app.workspace.showToast(`Marked "${doc.title}" as completed!`, 'success');
      },
    });
  }

  async onunload(): Promise<void> {
    // Event listeners registered via this.registerEvent() are cleaned up automatically
    console.log(`[${this.manifest.name}] Unloaded.`);
  }
}
```


## 5. Custom Theme Package Starter

---

A clean theme package template customizing surface background tokens, typography, borders, and syntax highlighting colors.

#### `manifest.json`
```json
{
  "id": "nordic-frost-theme",
  "name": "Nordic Frost",
  "version": "1.0.0",
  "minAppVersion": "0.2.0",
  "description": "An arctic, dark north-atlantic palette tailored for focused nocturnal writing.",
  "author": "Yuliet Li",
  "authorUrl": "https://github.com/yvliet",
  "tags": ["theme", "dark", "nord"]
}
```

#### `theme.css`
```css
/* Nordic Frost Theme for Flint */
.theme-nordic-frost {
  /* Surfaces */
  --flint-surface-base: #2e3440;
  --flint-surface-card: #3b4252;
  --flint-surface-popover: #434c5e;
  --flint-surface-active: #4c566a;

  /* Borders */
  --flint-border-subtle: #3b4252;
  --flint-border-base: #4c566a;
  --flint-border-strong: #81a1c1;

  /* Typography */
  --flint-text-base: #eceff4;
  --flint-text-muted: #d8dee9;
  --flint-text-faint: #4c566a;

  /* Accent & Interactive States */
  --flint-accent-primary: #88c0d0;
  --flint-accent-hover: #8fbcbb;
  --flint-accent-active: #5e81ac;

  /* Syntax Highlighting */
  --flint-syntax-keyword: #81a1c1;
  --flint-syntax-string: #a3be8c;
  --flint-syntax-number: #b48ead;
  --flint-syntax-comment: #616e88;
}
```


## 6. Next Steps

---

- Explore the [[UI Extension Points]] to discover all action ribbons, command palette slots, and modal dialogs.
- Browse the [[Flint UI Components]] to preview live interactive buttons, text inputs, toggles, and setting cards.
- Learn about tool registration in [[Model Context Protocol (MCP) Tools]].
- Review distribution invariants in [[Developer Policies & Guidelines]].
