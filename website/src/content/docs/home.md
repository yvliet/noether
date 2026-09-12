# Noether Developer Documentation

Welcome to the official Noether Developer Documentation. Noether is an open-source, local-first personal knowledge base and modular markdown workspace engineered for deep focus, long-term data durability, and native desktop performance.

Whether you are building custom TypeScript extensions, crafting CSS themes, or exploring Noether's underlying architecture, this documentation covers everything you need to know.


## 1. Core Architectural Pillars

---

Noether is designed around four core pillars:

- **Local-First & Plain Text**: Every note in Noether is a standard, human-readable CommonMark `.md` file stored in your local directory. There are no proprietary file formats or cloud lock-ins. Explore the [[Dual-Storage Architecture]] to see how disk text files sync with embedded databases.
- **Micro-Kernel & Strict Isolation**: The host application internals are strictly separated from extensions. Core directories never leak into plugins, and extensions integrate exclusively through the [[Noether SDK API Reference]] and typed events. Learn more in [[Micro-Kernel & Extension Architecture]].
- **Native Desktop Feel**: Built with React 19, TipTap/ProseMirror, and Tailwind CSS inside a lightweight Tauri Rust container. Controls snap into place immediately without decorative transition delays.
- **Native AI Tooling (MCP)**: Every extension can register structured tools and prompts via the Model Context Protocol. AI agents can safely query your local notes and trigger actions. See [[Model Context Protocol (MCP) Tools]].


## 2. Quick Navigation

---

Jump directly to the relevant guides and references:

| Category | Primary Topics | Description |
| :--- | :--- | :--- |
| **Getting Started** | [[Introduction to Noether]]<br>[[Installation & Setup]] | System overview, local Vaults, and compiling from source. |
| **User Guide** | [[Live Preview Editor & Markdown]]<br>[[Links, Backlinks & Graph]]<br>[[Infinite 2D Spatial Canvas]]<br>[[FSRS Spaced Repetition]]<br>[[Tasks Dashboard & Journal]]<br>[[Vaults & Workspace Storage]]<br>[[Keyboard Shortcuts & Commands]]<br>[[AI Assistants & MCP Tools]] | Comprehensive guides for writing, active recall, spatial whiteboarding, and AI agent integration. |
| **Extensions** | [[Plugin Quick Start]]<br>[[Starter Templates & Boilerplates]]<br>[[Manifest Specification]]<br>[[Extension Points Reference]]<br>[[Model Context Protocol (MCP) Tools]]<br>[[Events & Relational Storage]]<br>[[Optimizing Extension Load Time]] | Building, testing, and distributing modular TypeScript plugins. |
| **Themes** | [[Build Your First Theme]]<br>[[Submitting Themes]] | Customizing surface palettes, syntax tokens, and dark/light modes. |
| **Reference** | [[CSS Variables & Design Tokens]]<br>[[Noether UI Components]]<br>[[Noether SDK API Reference]]<br>[[Database Schema Reference]]<br>[[Dual-Storage Architecture]]<br>[[Micro-Kernel & Extension Architecture]] | Exhaustive reference for design tokens, UI components, APIs, and SQLite tables. |
| **Community Directory** | [[Community Directory Overview]]<br>[[Developer Policies & Guidelines]]<br>[[Plugin Submission Requirements]]<br>[[Developer FAQ]] | Extension distribution, guidelines, and upcoming community features. |


## 3. The Vault Concept

---

In Noether, note vaults are called **Vaults**. A Vault is simply any directory on your computer containing Markdown files. When opened in Noether, an embedded `.noether/` directory tracks local relational indexes and configurations:

```
My-Knowledge-Base/             <-- Vault Root Directory
├── .noether/                   <-- Local Workspace Metadata & Index
│   ├── noether.sqlite          <-- Native Rust SQLite database (WAL mode)
│   ├── noether.sqlite-wal      <-- SQLite Write-Ahead Log journal
│   ├── settings.json         <-- Workspace configuration
│   └── plugins/              <-- Local extensions
│       └── word-counter/
│           ├── manifest.json
│           └── main.js
├── Projects/
├── Notes/
└── Index.md
```

You can install community extensions locally by dropping their compiled folder into `.noether/plugins/`. Learn how to create your first plugin in [[Plugin Quick Start]] or jump straight into prebuilt boilerplates with [[Starter Templates & Boilerplates]].


## 4. Contributing & Community

---

Noether is open source under the GPLv3 license. I welcome contributions, bug reports, and extension showcases:

- **Source Code & Issue Tracker**: [github.com/yvliet/Noether](https://github.com/yvliet/Noether)
- **Feature Requests & Technical Discussions**: [GitHub Discussions](https://github.com/yvliet/Noether/discussions)
- **Submitting Pull Requests**: Please read the repository contributing guide before submitting PRs.

> [!NOTE]
> I am actively developing a centralized community extension marketplace and registry. Currently, community plugins and themes are loaded and tested directly from local `<vault>/.noether/plugins/` directories.
