# Flint Developer Documentation

Welcome to the official Flint Developer Documentation. Flint is an open-source, local-first personal knowledge base and modular markdown workspace engineered for deep focus, long-term data durability, and native desktop performance.

Whether you are building custom TypeScript extensions, crafting CSS themes, or exploring Flint's underlying architecture, this documentation covers everything you need to know.


## 1. Core Architectural Pillars

---

Flint is designed around four foundational engineering invariants:

- **Local-First & Sovereign Data**: Every note in Flint is a standard, human-readable CommonMark `.md` file stored in your local directory. There are no proprietary file formats or cloud lock-ins. Explore the [[Dual-Storage Architecture]] to see how disk text files sync with embedded databases.
- **Micro-Kernel & Strict Isolation**: The host application internals are strictly separated from extensions. Core directories never leak into plugins, and extensions integrate exclusively through the [[Flint SDK API Reference]] and typed events. Learn more in [[Micro-Kernel & Extension Architecture]].
- **Sub-50ms Desktop Ergonomics**: Built with React 19, TipTap/ProseMirror, and Tailwind CSS inside a lightweight Tauri Rust container, all micro-interactions execute instantly with zero artificial transition lag.
- **Native AI Tooling (MCP)**: Every extension can register structured tools and prompts via the Model Context Protocol. AI agents can safely query your local notes and trigger actions. See [[Model Context Protocol (MCP) Tools]].


## 2. Quick Navigation

---

Jump directly to the relevant guides and references:

| Category | Primary Topics | Description |
| :--- | :--- | :--- |
| **Getting Started** | [[Introduction to Flint]]<br>[[Installation & Setup]] | System overview, local Hearths, and compiling from source. |
| **User Guide** | [[Live Preview Editor & Markdown]]<br>[[Links, Backlinks & Graph]]<br>[[Infinite 2D Spatial Canvas]]<br>[[FSRS Spaced Repetition]]<br>[[Tasks Dashboard & Journal]]<br>[[Hearths & Workspace Storage]]<br>[[Keyboard Shortcuts & Commands]]<br>[[AI Assistants & MCP Tools]] | Comprehensive guides for writing, active recall, spatial whiteboarding, and AI agent integration. |
| **Extensions** | [[Plugin Quick Start]]<br>[[Starter Templates & Boilerplates]]<br>[[Manifest Specification]]<br>[[Extension Points Reference]]<br>[[Model Context Protocol (MCP) Tools]]<br>[[Events & Relational Storage]]<br>[[Optimizing Extension Load Time]] | Building, testing, and distributing modular TypeScript plugins. |
| **Themes** | [[Build Your First Theme]]<br>[[Submitting Themes]] | Customizing surface palettes, syntax tokens, and dark/light modes. |
| **Reference** | [[CSS Variables & Design Tokens]]<br>[[Flint UI Components]]<br>[[Flint SDK API Reference]]<br>[[Database Schema Reference]]<br>[[Dual-Storage Architecture]]<br>[[Micro-Kernel & Extension Architecture]] | Exhaustive reference for design tokens, UI components, APIs, and SQLite tables. |
| **Community Directory** | [[Community Directory Overview]]<br>[[Developer Policies & Guidelines]]<br>[[Plugin Submission Requirements]]<br>[[Developer FAQ]] | Extension distribution, guidelines, and upcoming community features. |


## 3. The Hearth Concept

---

In Flint, note vaults are called **Hearths**. A Hearth is simply any directory on your computer containing Markdown files. When opened in Flint, an embedded `.flint/` directory tracks local relational indexes and configurations:

```
My-Knowledge-Base/             <-- Hearth Root Directory
├── .flint/                   <-- Local Workspace Metadata & Index
│   ├── flint.sqlite          <-- Native Rust SQLite database (WAL mode)
│   ├── flint.sqlite-wal      <-- SQLite Write-Ahead Log journal
│   ├── settings.json         <-- Workspace configuration
│   └── plugins/              <-- Local extensions
│       └── word-counter/
│           ├── manifest.json
│           └── main.js
├── Projects/
├── Notes/
└── Index.md
```

You can install community extensions locally by dropping their compiled folder into `.flint/plugins/`. Learn how to create your first plugin in [[Plugin Quick Start]] or jump straight into prebuilt boilerplates with [[Starter Templates & Boilerplates]].


## 4. Contributing & Community

---

Flint is open source under the GPLv3 license. I welcome contributions, bug reports, and extension showcases:

- **Source Code & Issue Tracker**: [github.com/yvliet/flint](https://github.com/yvliet/flint)
- **Feature Requests & Technical Discussions**: [GitHub Discussions](https://github.com/yvliet/flint/discussions)
- **Submitting Pull Requests**: Please read the repository contributing guide before submitting PRs.

> [!NOTE]
> I am actively developing a centralized community extension marketplace and registry. Currently, community plugins and themes are loaded and tested directly from local `<hearth>/.flint/plugins/` directories.
