# Starter Templates & Boilerplates

Kickstart your Noether extension or theme with production-ready, copyable starter boilerplates. Every boilerplate includes strict TypeScript types, bundling configurations, and instant lifecycle integration with the Noether SDK.


## 1. Official Extension Starter Template Repository

---

The quickest way to build a Noether extension is using the official standalone starter template repository at [yvliet/noether-extension-starter](https://github.com/yvliet/noether-extension-starter):

```bash
# Option 1: Create directly from GitHub's template engine
gh repo create my-noether-extension --template yvliet/noether-extension-starter --public --clone
cd my-noether-extension

# Option 2: Clone directly via Git
git clone https://github.com/yvliet/noether-extension-starter.git my-noether-extension
cd my-noether-extension

# Install dependencies and build
npm install
npm run build
```

The template comes pre-configured with:
- **TypeScript & React JSX**: Strict types out of the box with zero runtime React bloat.
- **esbuild Bundler**: Fast, single-file compilation targeting `dist/main.js`.
- **Sandbox Configuration**: Automatically externalizes host packages (`noether`, `@noether/sdk`, `react`, `react-dom`, `zod`).
- **GitHub Actions Publishing**: Automated CI/CD workflow in `.github/workflows/publish.yml` that builds and publishes releases to the Noether Turso Registry whenever a version tag (`v*`) is pushed.


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
  "description": "Clean foundation for building custom Noether UI and command extensions.",
  "author": "Yuliet Li",
  "authorUrl": "https://github.com/yvliet",
  "tags": ["utility", "starter"]
}
```

#### `package.json`
```json
{
  "name": "noether-minimal-extension",
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
    "noether": "^0.2.0"
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
import { Extension, NoetherApp } from 'noether';

export default class MinimalStarterExtension extends Extension {
  async onload(): Promise<void> {
    console.log(`[${this.manifest.name}] Initialized.`);

    // 1. Register Action Rail Icon (Left Toolbar)
    this.addActionRailIcon(
      'starter-action-btn',
      '⚡',
      'Trigger Starter Action',
      (app: NoetherApp) => {
        const title = app.workspace.activeDocument?.title || 'No active note';
        app.workspace.showToast(`Active document: "${title}"`, 'info');
      }
    );

    // 2. Register Command in Command Palette (Ctrl+K / Cmd+K)
    this.addCommand({
      id: 'quick-action',
      title: 'Minimal Starter: Run Quick Action',
      hotkey: 'Ctrl+Shift+P',
      action: (app: NoetherApp) => {
        app.workspace.showToast('Starter command executed successfully!', 'success');
      },
    });

    // 3. Register Status Bar Indicator (Bottom Bar)
    this.addStatusBarItem({
      id: 'starter-status',
      alignment: 'right',
      render: () => '⚡ Ready',
      onClick: (app: NoetherApp) => {
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
  external: ['noether', 'react', 'react-dom'],
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

A specialized extension template that exposes structured AI Agent tools to LLM copilots via Noether's Model Context Protocol bridge.

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
import { Extension, McpToolDefinition, McpToolResult } from 'noether';

export default class McpStarterExtension extends Extension {
  async onload(): Promise<void> {
    console.log(`[${this.manifest.name}] Registering MCP Copilot Tools...`);

    // Register Structured Tool: search_tagged_notes
    this.registerTool({
      name: 'search_tagged_notes',
      description: 'Search for markdown notes matching a specific tag or keyword in the active Vault.',
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

        // Query in-memory metadata index via Noether host
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

Template demonstrating how to dynamically create custom SQLite tables, execute queries, and subscribe to relational updates via the Noether EventBus.

#### `manifest.json`
```json
{
  "id": "relational-storage-extension",
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
import { Extension } from 'noether';

export default class RelationalStorageExtension extends Extension {
  async onload(): Promise<void> {
    // 1. Dynamically initialize extension SQLite table
    await this.app.db.execute(`
      CREATE TABLE IF NOT EXISTS ext_reading_progress (
        document_id TEXT PRIMARY KEY,
        scroll_percentage REAL DEFAULT 0,
        completed INTEGER DEFAULT 0,
        last_read_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_reading_progress_date 
      ON ext_reading_progress (last_read_at);
    `);

    // 2. Listen to document deletions to keep table clean
    this.registerEvent(
      this.app.events.on('document:deleted', async (event) => {
        await this.app.db.execute(
          'DELETE FROM ext_reading_progress WHERE document_id = ?',
          [event.documentId]
        );
      })
    );

    // 3. Register Command to Mark Active Note Completed
    this.addCommand({
      id: 'mark-completed',
      title: 'Mark Document Completed (Reading Progress)',
      action: async (app) => {
        const doc = app.workspace.activeDocument;
        if (!doc) return;

        await this.app.db.execute(
          `INSERT INTO ext_reading_progress (document_id, scroll_percentage, completed, last_read_at)
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
/* Nordic Frost Theme for Noether */
.theme-nordic-frost {
  /* Surfaces */
  --noether-surface-base: #2e3440;
  --noether-surface-card: #3b4252;
  --noether-surface-popover: #434c5e;
  --noether-surface-active: #4c566a;

  /* Borders */
  --noether-border-subtle: #3b4252;
  --noether-border-base: #4c566a;
  --noether-border-strong: #81a1c1;

  /* Typography */
  --noether-text-base: #eceff4;
  --noether-text-muted: #d8dee9;
  --noether-text-faint: #4c566a;

  /* Accent & Interactive States */
  --noether-accent-primary: #88c0d0;
  --noether-accent-hover: #8fbcbb;
  --noether-accent-active: #5e81ac;

  /* Syntax Highlighting */
  --noether-syntax-keyword: #81a1c1;
  --noether-syntax-string: #a3be8c;
  --noether-syntax-number: #b48ead;
  --noether-syntax-comment: #616e88;
}
```


## 6. Next Steps

---

- Explore the [[UI Extension Points]] to discover all action ribbons, command palette slots, and modal dialogs.
- Browse the [[Noether UI Components]] to preview live interactive buttons, text inputs, toggles, and setting cards.
- Learn about tool registration in [[Model Context Protocol (MCP) Tools]].
- Review distribution invariants in [[Developer Policies & Guidelines]].
