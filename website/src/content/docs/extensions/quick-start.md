# Extension Quick Start

Building an extension in Noether doesn't require complex boilerplate or boilerplate generators. An extension is just a single folder in your vault containing a `manifest.json` metadata file and a compiled `main.js` script.

---

## 1. Directory Structure

---

Extensions live inside your vault's hidden `.noether/extensions/` directory:

```
<My-Vault>/
└── .noether/
    └── extensions/
        └── word-counter/
            ├── manifest.json   # Extension metadata & identity
            └── main.js         # JavaScript entry point
```

Create a new directory inside your active vault:

```bash
mkdir -p .noether/extensions/word-counter
cd .noether/extensions/word-counter
```

---

## 2. The Manifest (`manifest.json`)

---

The manifest tells Noether your extension's ID, display name, version, and entry point.

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

---

## 3. Progressive Code Walkthrough

---

Let's build the extension step by step.

### Step 1: The 3-Line Minimum
Create `main.js`. At its simplest, an extension subclasses `Extension` and defines an `onload()` lifecycle method:

```javascript
const { Extension } = require('noether');

module.exports = class WordCounterExtension extends Extension {
  async onload() {
    this.addActionRailIcon('word-counter-btn', 'clock-01', 'Calculate Reading Stats', (app) => {
      const doc = app.workspace.activeDocument;
      app.workspace.showToast(`Active Note: ${doc?.title || 'None'}`, 'info');
    });
  }
};
```

This immediately registers a button in the left Action Rail.

### Step 2: The Real-World Need (Live Statistics)
A static button click is fine, but you usually want continuous feedback in the status bar at the bottom of the window. Let's add a live status bar widget:

```javascript
const { Extension } = require('noether');
const React = require('react');

module.exports = class WordCounterExtension extends Extension {
  async onload() {
    // Register Action Rail button
    this.addActionRailIcon('word-counter-btn', 'clock-01', 'Calculate Reading Stats', (app) => {
      const doc = app.workspace.activeDocument;
      app.workspace.showToast(`Active Note: ${doc?.title || 'None'}`, 'info');
    });

    // Add Live Status Bar Widget
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
          { className: 'text-[#888888] text-xs font-mono select-none' },
          `${words} words • ~${readTime} min`
        );
      },
    });
  }
};
```

### Step 3: Event Subscriptions & Auto-Cleanup
When you need to react to file changes or save operations, subscribe directly to the `EventBus`.

```diff
  async onload() {
    // ... previous action rail and status bar setup ...

+   // Listen for document save events across the vault
+   this.onEvent('document:saved', ({ id, title }) => {
+     console.log(`[WordCounter] Document "${title}" (${id}) saved.`);
+   });
  }

+ onunload() {
+   // All UI buttons, status widgets, hotkeys, and EventBus listeners
+   // registered with this.add* or this.onEvent are torn down automatically!
+ }
```

---

## 4. Testing Your Extension

---

1. Open Noether.
2. Open **Settings** (`Ctrl+,`) and navigate to the **Extensions** tab.
3. Locate **Word & Reading Time Counter** in the list of installed extensions and toggle it **On**.
4. Observe the new icon in the left toolbar and the real-time word counter in the bottom status bar.

---

## 5. Building with TypeScript & Bundlers

---

For production extensions with multiple source files or custom UI components, author in TypeScript and compile with **esbuild** or **Vite**.

### Minimal `package.json`
```json
{
  "name": "noether-word-counter",
  "version": "1.0.0",
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=neutral --format=cjs --outfile=main.js --external:noether --external:react --external:react-dom --external:clsx --external:tailwind-merge --external:zustand --external:@hugeicons/* --external:zod"
  },
  "devDependencies": {
    "esbuild": "^0.23.0",
    "typescript": "^5.5.0"
  }
}
```

Noether's runtime sandbox forwards host dependencies directly (`react`, `react-dom`, `zustand`, `zod`, `clsx`, `tailwind-merge`, `@hugeicons`), so you should mark them external to keep your compiled bundle tiny (typically under 10KB).

---

## 6. Related Developer Guides

---

- [[UI Extension Points]]: Discover all available action rails, tab context menus, and status bar hooks.
- [[Events & Relational Storage]]: Learn how to create custom SQLite tables and subscribe to vault events.
- [[Model Context Protocol (MCP) Tools]]: Expose custom extension tools to AI copilots.
