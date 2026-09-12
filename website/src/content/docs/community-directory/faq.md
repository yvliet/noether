# Frequently Asked Questions (FAQ)

Answers to common developer questions about Noether's architecture, extension runtime, and community distribution.

## 1. Where are extensions installed in Noether?
---

Extensions are stored inside your active Vault directory at `<vault>/.noether/extensions/<extension-id>/`. Every extension folder must contain at least a `manifest.json` and a compiled `main.js`.

## 2. Can extensions access the embedded SQLite database?
---

Yes! Through `this.app.db`, extensions can execute SQL queries, create dynamic tables, and index custom metadata. Read [[Database Schema Reference]] and [[Events & Relational Storage]].

## 3. What languages can I use to write extensions?
---

Extensions are typically written in TypeScript or JavaScript. They are compiled and bundled into a standalone `main.js` bundle using tools like `esbuild` or `tsup`. See [[Extension Quick Start]].

## 4. How are community extensions discovered and distributed?
---

Noether includes an integrated Extension Marketplace accessible from the Action Rail and Command Palette (`Browse extension marketplace`). Extensions and themes are published via dedicated GitHub repositories and edge registries, with local testing loaded directly from `.noether/extensions/` and `.noether/themes/`.

## 5. How do I expose my extension to AI agents?
---

Noether includes native support for the Model Context Protocol (MCP). In your extension's `onload()` method, call `this.registerTool(...)`. See [[Model Context Protocol (MCP) Tools]].

## 6. Where can I ask technical questions or report bugs?
---

Join technical discussions and report issues on the official [Noether GitHub Repository](https://github.com/yvliet/Noether/discussions).
