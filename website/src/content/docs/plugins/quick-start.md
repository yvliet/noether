# Plugin Quick Start

Create and run your first Flint extension in under 5 minutes. This tutorial guides you through building a real-time word counter extension with a status bar widget, command palette action, and action rail button.


## 1. Directory Structure

---

Extensions live within the active Hearth's `.flint/extensions/` directory:

```
<My-Hearth>/
└── .flint/
    └── extensions/
        └── word-counter/
            ├── manifest.json   # Extension metadata
            └── main.js         # Compiled JavaScript entry point
```

Create a new directory named `word-counter` inside your Hearth's `.flint/extensions/` folder:

```bash
mkdir -p .flint/extensions/word-counter
cd .flint/extensions/word-counter
```


## 2. Writing the Manifest (`manifest.json`)

---

The manifest file defines your extension's identity, version, author, and description.

Create `manifest.json`:

```json
{
  "id": "word-counter",
  "name": "Word & Reading Time Counter",
  "version": "1.0.0",
  "minAppVersion": "0.2.0",
  "description": "Displays live word counts and estimated reading time for the active note.",
  "author": "Yuliet Li",
  "authorUrl": "https://github.com/yvliet",
  "tags": ["productivity", "writing"]
}
```


## 3. Writing the Extension Logic (`main.js`)

---

Extensions extend the `Extension` (or legacy `Plugin`) base class and implement the `onload()` lifecycle hook.

Create `main.js`:

```javascript
const { Extension } = require('flint');
const React = require('react');

module.exports = class WordCounterExtension extends Extension {
  async onload() {
    console.log(`[${this.manifest.name}] Loaded successfully.`);

    // 1. Register Action Rail Icon (Left Toolbar)
    this.addActionRailIcon(
      'count-words-btn',
      '⏱️',
      'Calculate Reading Stats',
      (app) => {
        const title = app.workspace.activeDocument?.title || 'No active note';
        app.workspace.showToast(`Analyzing: ${title}`, 'info');
      }
    );

    // 2. Register Command in Command Palette (Ctrl+K / Cmd+K)
    this.addCommand({
      id: 'show-stats',
      title: 'Word Counter: Show Document Statistics',
      hotkey: 'Ctrl+Shift+U',
      action: (app) => {
        const doc = app.workspace.activeDocument;
        if (!doc) {
          app.workspace.showToast('No active document open.', 'warning');
          return;
        }

        const words = (doc.content || '').trim().split(/\s+/).filter(Boolean).length;
        const readTime = Math.ceil(words / 200);

        app.workspace.showToast(
          `"${doc.title}": ${words} words (approx. ${readTime} min read)`,
          'success'
        );
      },
    });

    // 3. Register Live Status Bar Widget (Bottom Bar)
    this.addStatusBarItem({
      id: 'stats-widget',
      alignment: 'right',
      order: 10,
      render: (app) => {
        const doc = app.workspace.activeDocument;
        const words = doc?.content ? doc.content.trim().split(/\s+/).filter(Boolean).length : 0;
        const readTime = Math.ceil(words / 200);

        return React.createElement(
          'span',
          { className: 'text-neutral-400 text-xs font-mono select-none' },
          `📝 ${words} words • ~${readTime} min`
        );
      },
    });

    // 4. Listen to Document Save Events
    this.onEvent('document:saved', ({ id, title }) => {
      console.log(`[WordCounter] Document "${title}" (${id}) was saved.`);
    });
  }

  onunload() {
    console.log(`[${this.manifest.name}] Unloaded.`);
    // All UI elements, commands, status widgets, and event listeners
    // registered with this.add* or this.onEvent are cleaned up automatically!
  }
};
```


## 4. Testing Your Extension

---

1. Open Flint.
2. Open the Hearth containing your `.flint/extensions/word-counter/` directory.
3. Open **Settings** (`Ctrl + ,` / `Cmd + ,`) and navigate to the **Extensions** tab.
4. Locate **Word & Reading Time Counter** in the list of installed extensions and toggle it **On**.
5. Observe:
   - A new action icon appears in the left Action Rail.
   - The status bar at the bottom displays real-time word and reading time stats.
   - Pressing `Ctrl+Shift+U` executes the custom command and triggers a toast notification.


## 5. Development with TypeScript & Bundlers

---

For larger extensions, I strongly recommend authoring in TypeScript and compiling with **Vite** or **esbuild**.

### Minimal `package.json`
```json
{
  "name": "flint-word-counter",
  "version": "1.0.0",
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=neutral --format=cjs --outfile=main.js --external:flint --external:react"
  },
  "devDependencies": {
    "esbuild": "^0.23.0",
    "typescript": "^5.5.0"
  }
}
```

### TypeScript Source (`src/index.ts`)
```typescript
import { Extension, FlintApp } from 'flint';
import React from 'react';

export default class WordCounterExtension extends Extension {
  async onload(): Promise<void> {
    this.addCommand({
      id: 'show-stats',
      title: 'Word Counter: Show Document Statistics',
      action: (app: FlintApp) => {
        app.workspace.showToast('Statistics calculated!', 'info');
      },
    });
  }
}
```

Build your bundle:
```bash
npm run build
```
Copy `manifest.json` and the resulting `main.js` into your Hearth's extension directory.


## 5. Next Steps

---

- Explore full copyable project boilerplates in [[Starter Templates & Boilerplates]].
- Discover all available ribbons, commands, and status bar hooks in [[UI Extension Points]].
- Browse interactive UI primitives in [[Flint UI Components]].
