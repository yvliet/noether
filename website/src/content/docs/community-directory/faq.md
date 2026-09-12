# Frequently Asked Questions (FAQ)

Answers to common developer questions about Noether's architecture, extension runtime, and roadmap.

---

### Where are extensions installed in Noether?
Extensions are stored inside your active Vault directory at `<vault>/.noether/plugins/<plugin-id>/`. Every extension folder must contain at least a `manifest.json` and a compiled `main.js`.

### Can extensions access the embedded SQLite database?
Yes! Through `this.app.db`, extensions can execute SQL queries, create dynamic tables, and index custom metadata. Read [[Database Schema Reference]] and [[Events & Relational Storage]].

### What languages can I use to write extensions?
Extensions are typically written in TypeScript or JavaScript. They are compiled and bundled into a standalone `main.js` bundle using tools like `esbuild` or `tsup`. See [[Plugin Quick Start]].

### Is there an official centralized community directory right now?
Not yet. An official community extension marketplace and registry is currently in active development. In the current version of Noether, extensions and themes are loaded and tested locally from `.noether/plugins/` and `.noether/themes/`, and shared via GitHub repositories.

### Where can I ask technical questions or report bugs?
Join technical discussions and report issues on the official [Noether GitHub Repository](https://github.com/yvliet/Noether/discussions).

### How do I expose my extension to AI agents?
Noether includes native support for the Model Context Protocol (MCP). In your extension's `onload()` method, call `this.registerTool(...)`. See [[Model Context Protocol (MCP) Tools]].
