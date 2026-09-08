<div align="center">

  <img src="docs/assets/flint-ascii.svg" alt="      ___                                   ___                 
     /  /\                    ___          /__/\          ___   
    /  /:/_                  /  /\         \  \:\        /  /\  
   /  /:/ /\  ___     ___   /  /:/          \  \:\      /  /:/  
  /  /:/ /:/ /__/\   /  /\ /__/::\      _____\__\:\    /  /:/   
 /__/:/ /:/  \  \:\ /  /:/ \__\/\:\__  /__/::::::::\  /  /::\   
 \  \:\/:/    \  \:\  /:/     \  \:\/\ \  \:\~~\~~\/ /__/:/\:\  
  \  \::/      \  \:\/:/       \__\::/  \  \:\  ~~~  \__\/  \:\ 
   \  \:\       \  \::/        /__/:/    \  \:\           \  \:\
    \  \:\       \__\/         \__\/      \  \:\           \__\/
     \__\/                                 \__\/                " width="502"/>

# Flint

### A fast, local-first note-taking app and personal knowledge engine that respects your plain text.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?logo=gnu&logoColor=white)](LICENSE)
[![Runtime](https://img.shields.io/badge/Runtime-Tauri%20v2%20(Rust)-ea580c.svg?logo=tauri&logoColor=white)](src-tauri)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript%205.7-20232a.svg?logo=react&logoColor=61dafb)](package.json)
[![Database](https://img.shields.io/badge/Database-Native%20Rust%20SQLite%20(rusqlite)%20%2B%20WAL%20%2B%20FTS5-003B57.svg?logo=sqlite&logoColor=white)](src-tauri/src/db.rs)
[![Protocol](https://img.shields.io/badge/Protocol-Model%20Context%20Protocol%20(MCP)-7c3aed.svg)](bin/flint-mcp-server.cjs)
[![Docs](https://img.shields.io/badge/Docs-Documentation-ea580c.svg?logo=bookstack&logoColor=white)](https://yvliet.github.io/flint/)
[![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS%203.4-06b6d4.svg?logo=tailwindcss&logoColor=white)](tailwind.config.js)

[Documentation](https://yvliet.github.io/flint/) •
[Downloads](#1-downloads--availability) •
[Why Flint?](#2-why-flint) •
[Features](#3-key-capabilities) •
[Developer Quickstart](#4-developer-quickstart)

</div>

## 1. Downloads & Availability

---

Official pre-compiled desktop binaries and one-click installers will be available soon once **version 1.0.0** is officially released and reaches stable status.

Until the stable 1.0.0 release is available, you can try Flint directly in your browser or compile and run the native desktop application locally from source:

- **Web Preview**: Experience Flint directly in your browser powered by WebAssembly SQLite: [Launch Web App →](https://yvliet.github.io/flint/)
- **Build from Source**: Clone the repository and run the desktop app locally with `npm run app` (see [Developer Quickstart](#4-developer-quickstart)).

### Upcoming Platform Support for v1.0.0

When version 1.0.0 launches, pre-built standalone packages and installers will be released for all major platforms:

- **Windows**: `.msi` Windows Installer and `.exe` standalone packages (x64, ARM64)
- **macOS**: `.dmg` package (Universal binary for Apple Silicon and Intel)
- **Linux**: `.AppImage` portable package and `.deb` Debian/Ubuntu package (x86_64, ARM64)

---

## 2. Why Flint?

---

Flint gives you the durability of plain Markdown files on your own computer, combined with the speed of a native Rust backend (Tauri v2), an embedded SQLite database (`rusqlite` with WAL and FTS5), and a built-in Model Context Protocol (MCP) server for local AI coding assistants.

- **Plain Markdown on Your Disk**: Notes live as ordinary `.md` files in your folders. Your data is yours forever, easy to back up, version with Git, or sync with Syncthing or Dropbox without proprietary database lock-in.
- **Fast Rust SQLite Engine (`rusqlite` + WAL + FTS5)**: Runs directly in the native process with Write-Ahead Logging (WAL) and 256MB memory mapping. Search, tag queries, and backlink lookups across 20,000+ notes run in sub-millisecond time with zero WebAssembly memory overhead.
- **Built-in AI Assistant Server (MCP)**: Includes an out-of-the-box stdio Model Context Protocol server (`bin/flint-mcp-server.cjs`) so AI assistants (Claude Desktop, Antigravity, Gemini, Cursor) can search, read, and write notes through 13 structured tools.
- **Instant UI with Zero Animation Lag**: Toggle switches, buttons, context menus, dropdowns, and file tree items respond immediately with zero artificial transition delays for a snappy, classic native desktop feel.
- **Lightweight Desktop Footprint**: Built on Tauri v2 with automatic physical RAM trimming (`SetProcessWorkingSetSize` after 120s of idle time), keeping memory usage lean (typically under 150MB).
- **Crash-Resilient Atomic Saves**: Saves write to temporary files first before executing atomic OS rename operations (`fs::rename`). If your computer loses power mid-save, your notes are never left half-written.
- **100% Free & Open Source (GPLv3)**: Transparent codebase, zero telemetry, zero paywalled tiers, and no cloud dependencies.

---

## 3. Key Capabilities

---

- **Live Preview Editor**: TipTap 2.x and ProseMirror with $O(1)$ transaction decoration mapping, dirty-range AST scanning, MathLive formula chips, and KaTeX compilation caching for snappy typing even on 100,000-word notes.
- **2D Knowledge Graph**: Interactive force-directed physics graph with customizable node repulsion, link distance controls, and real-time backlink and reference resolution.
- **Infinite 2D Spatial Canvas**: Visual whiteboard supporting note cards, text blocks, group containers, and connector lines stored directly in `.flint/canvas`.
- **Embedded FSRS-4.5 Spaced Repetition**: Modern flashcard scheduling (`ts-fsrs`) generated directly from Markdown notes using basic (`::`), bi-directional (`;;`), and cloze (`{...}`) syntax.
- **Centralized Tasks & Daily Journal**: Aggregates all `- [ ]` and `- [x]` checklist items across your entire vault into an actionable kanban board, paired with one-click daily scratchpad notes.
- **Modular Extension SDK**: Build custom extensions with dynamic React portal slots, declarative SQLite tables with automatic migrations, background Web Workers, and auto-generated MCP tools.

---

## 4. Developer Quickstart

---

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm** or **pnpm**
- **Rust Toolchain**: `cargo >= 1.75` (required for compiling native desktop binaries)

### Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/yvliet/flint.git
cd flint

# 2. Install dependencies
npm install

# 3. Launch native desktop application (Rust + Tauri)
npm run app

# Or launch browser web preview server
npm run dev
```

### Production Builds

```bash
# Build frontend web assets
npm run build

# Build native desktop installers (.msi / .dmg / .AppImage)
npm run tauri:build
```

---

## 5. Documentation

---

Comprehensive architecture specifications, user manuals, and developer guides are available at **[yvliet.github.io/flint](https://yvliet.github.io/flint/)**:

- **[User Guide](https://yvliet.github.io/flint/)** (`docs/USER_GUIDE.md`): Complete guide for writing, active recall flashcards, spatial whiteboarding, and vault management.
- **[Architecture Specification](https://yvliet.github.io/flint/)** (`docs/ARCHITECTURE.md`): 4-tier micro-kernel stack, dual-track storage engine, WAL commits, memory optimization, and echo suppression.
- **[Extension Developer Guide](https://yvliet.github.io/flint/)** (`docs/EXTENSION_GUIDE.md`): Building custom extensions using React portal slots, declarative SQLite tables, and background Web Workers.
- **[Model Context Protocol (MCP) Setup](https://yvliet.github.io/flint/)** (`docs/mcp-setup-guide.md`): Configuration guide for Claude Desktop, Antigravity, Gemini, and Cursor.
- **[Keyboard Shortcuts](https://yvliet.github.io/flint/)** (`docs/KEYBOARD_SHORTCUTS.md`): Complete reference table of all hotkeys and commands.
- **[Contributing Guidelines](https://yvliet.github.io/flint/)** (`docs/CONTRIBUTING.md`): Codebase standards, core isolation rules, and pull request verification.

---

## 6. License

---

Flint is free and open-source software licensed under the **[GNU General Public License v3.0 (GPLv3)](LICENSE)**.
