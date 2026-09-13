# Noether Developer Documentation

Welcome to the Noether Developer Documentation. This portal is dedicated to engineers, systems architects, extension builders, and open-source contributors who want to understand how Noether is engineered under the hood and how to build on top of it.

If you are looking for user guides, feature walkthroughs, or getting started tips, click **Noether Docs** in the top-left corner anytime to switch over to **Noether Help**.

## 1. Core Architectural Invariants
---

Noether is engineered around four core systems principles:

- **Local-First Ground Truth**: Every note is a plain-text CommonMark `.md` file stored directly on disk. An embedded native SQLite database running via Rust acts as a high-speed relational and full-text search accelerator without altering the raw text files.
- **Strict Micro-Kernel Core Isolation**: Native directories (`src/core`, `src/lib`, `src/store`, `src/components`, `src/types`, `src/sdk`) never import extension code or types. Extensions integrate exclusively through the [[Noether SDK API Reference]] and the typed [[Reactive EventBus & State Pipeline]].
- **Zero Micro-Interaction Animations**: UI controls (menus, toggles, buttons, trees) operate with zero decorative delays or artificial CSS transitions, preserving an instantaneous native desktop feel.
- **Native Model Context Protocol (MCP)**: Every extension can register structured tools and prompts via the Model Context Protocol, allowing local AI agents (Claude Desktop, Cursor, Antigravity) to query notes and perform actions safely.

## 2. Developer Portal Map
---

| Category | Primary Sections | What It Covers |
| :--- | :--- | :--- |
| **Engineering** | [[The Story of Noether]]<br>[[Contributing to Noether]] | Origins of the project, stack choices (Tauri v2 + Rust vs. Electron), dev environment setup, and pull request workflows. |
| **Architecture** | [[Dual-Storage Architecture]]<br>[[Micro-Kernel & Core Isolation]]<br>[[Systems & Performance Engineering]]<br>[[Native Runtime & Platform Bridge]]<br>[[Reactive EventBus & State Pipeline]]<br>[[Editor Engine & Live Preview]]<br>[[Model Context Protocol (MCP) Runtime]]<br>[[Security & Filesystem Boundary Invariants]] | Deep architectural blueprints covering the SQLite WAL index, IPC layer, ProseMirror decoration mapping, memory trimming, and path boundary safety. |
| **Extensions** | [[Extension Quick Start]]<br>[[Starter Templates & Boilerplates]]<br>[[Manifest Specification]]<br>[[UI Extension Points]]<br>[[Model Context Protocol (MCP) Tools]]<br>[[Events & Relational Storage]]<br>[[Optimizing Extension Load Time]]<br>[[Publishing to Marketplace]] | Authoring custom extensions, declarative SQLite tables, custom views, and publishing to the Turso Community Registry. |
| **Themes** | [[Build Your First Theme]]<br>[[Submitting Themes]] | CSS variable token cascade, design foundations, and custom theme distribution. |
| **Reference** | [[CSS Variables & Design Tokens]]<br>[[Noether UI Components]]<br>[[Noether SDK API Reference]]<br>[[Database Schema Reference]]<br>[[TypeScript API Reference]] | Exhaustive API signatures, database schemas, and design token catalogs. |
| **Community Directory** | [[Community Directory Overview]]<br>[[Developer Policies & Guidelines]]<br>[[Extension Submission Requirements]]<br>[[Developer FAQ]] | Extension distribution policies, namespace claims, and registry guidelines. |

## 3. Contributing & Codebase Standards
---

Noether is fully open source under the GPLv3 license:

- **GitHub Repository**: [github.com/yvliet/Noether](https://github.com/yvliet/Noether)
- **Issue Tracker & Discussions**: [GitHub Issues](https://github.com/yvliet/Noether/issues)
- **Discord Community**: Connect directly with creator **[@yvliet](https://discord.com/users/1271415962909933680)** on Discord for architectural discussions and extension requests.
