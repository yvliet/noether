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

### A fast, local-first note-taking app that respects your plain text.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?logo=gnu&logoColor=white)](LICENSE)
[![Runtime](https://img.shields.io/badge/Runtime-Tauri%20v2%20(Rust)-ea580c.svg?logo=tauri&logoColor=white)](src-tauri)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript%205.7-20232a.svg?logo=react&logoColor=61dafb)](package.json)
[![Docs](https://img.shields.io/badge/Docs-Website-ea580c.svg?logo=bookstack&logoColor=white)](https://yvliet.github.io/Flint/)

[Documentation](https://yvliet.github.io/Flint/) •
[Availability](#1-availability) •
[Why Flint?](#2-why-flint) •
[Features](#3-key-capabilities) •
[Developer Quickstart](#4-developer-quickstart)

</div>

## 1. Availability

Official pre-compiled desktop binaries and one-click installers will be available once **version 1.0.0** reaches stable release status:

- **Windows**: `.msi` Windows Installer and `.exe` standalone packages (x64, ARM64)
- **macOS**: `.dmg` package (Universal binary for Apple Silicon and Intel)
- **Linux**: `.AppImage` portable package and `.deb` Debian/Ubuntu package (x86_64, ARM64)

Until pre-built binaries are published, you can compile and run Flint locally from source (see [Developer Quickstart](#4-developer-quickstart)).

## 2. Why Flint?

I wanted a note-taking app that feels like a native desktop utility: fast, lightweight, and completely local. No forced cloud accounts, no proprietary database locks, and no heavy Electron bundles eating memory in the background.

- **Plain Markdown on disk**: Notes live as ordinary `.md` files in your folders. Your data is yours forever, easy to back up, version with Git, or sync with Syncthing or Dropbox without proprietary database lock-in.
- **Fast local search & backlinks**: An embedded SQLite index running in Rust handles full-text search, tags, and backlink lookups across thousands of notes instantly.
- **Instant native desktop feel**: Built to feel like a classic desktop utility. Menus, tabs, and toggles snap open immediately without decorative fade-ins or animation delays.
- **Lightweight desktop footprint**: Built on Tauri v2 with native Rust, keeping memory usage lean (typically under 150MB).
- **Crash-resilient atomic saves**: Saves write to temporary files first before executing atomic OS rename operations. If power cuts out mid-save, your notes are never left half-written.
- **Built-in MCP server**: Includes an out-of-the-box Model Context Protocol server so AI assistants like Claude Desktop or Cursor can search and read your notes locally.
- **100% Free & Open Source**: Transparent codebase, zero telemetry, zero paywalled tiers, and no cloud dependencies (GPLv3).

## 3. Key Capabilities

- **Live Preview Editor**: Clean markdown editing with inline MathLive formula chips, syntax highlighting, and table formatting.
- **2D Knowledge Graph**: Interactive force-directed graph visualizing connections and backlinks across your notes.
- **Infinite 2D Spatial Canvas**: Visual whiteboard supporting note cards, text blocks, group containers, and connector lines stored directly in `.flint/canvas`.
- **Embedded FSRS Spaced Repetition**: Modern flashcard scheduling (`ts-fsrs`) generated directly from Markdown notes using basic (`::`), bi-directional (`;;`), and cloze (`{...}`) syntax.
- **Centralized Tasks & Daily Journal**: Aggregates all `- [ ]` and `- [x]` checklist items across your entire vault into an actionable kanban board, paired with one-click daily scratchpad notes.
- **Modular Extension SDK**: Build custom extensions with dynamic React portal slots, declarative SQLite tables with automatic migrations, and auto-generated MCP tools.

## 4. Developer Quickstart

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm** or **pnpm**
- **Rust Toolchain**: `cargo >= 1.75` (required for compiling native desktop binaries)

### Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/yvliet/Flint.git
cd flint

# 2. Install dependencies
npm install

# 3. Launch native desktop application (Rust + Tauri)
npm run app
```

### Production Builds

```bash
# Build frontend web assets
npm run build

# Build native desktop installers (.msi / .dmg / .AppImage)
npm run tauri:build
```

## 5. Documentation

Documentation and guides are available on the website at **[yvliet.github.io/Flint](https://yvliet.github.io/Flint/)** or in the `docs/` folder:

- **[User Guide](docs/USER_GUIDE.md)**: Daily note-taking, flashcards, visual canvas, and vault organization.
- **[Architecture Specification](docs/ARCHITECTURE.md)**: System design, storage pipeline, and editor performance.
- **[Extension Developer Guide](docs/EXTENSION_GUIDE.md)**: Building custom extensions using React portal slots and the Flint SDK.
- **[Model Context Protocol (MCP) Setup](docs/mcp-setup-guide.md)**: Connecting Claude Desktop, Cursor, and other AI assistants to your notes.
- **[Keyboard Shortcuts](docs/KEYBOARD_SHORTCUTS.md)**: Complete reference table of all hotkeys and commands.
- **[Contributing Guidelines](docs/CONTRIBUTING.md)**: Development setup and guidelines.

## 6. License

Flint is free and open-source software licensed under the **[GNU General Public License v3.0 (GPLv3)](LICENSE)**.
