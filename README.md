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

### A fast, local-first note-taking app and knowledge engine that respects your plain text.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?logo=gnu&logoColor=white)](LICENSE)
[![Runtime](https://img.shields.io/badge/Runtime-Tauri%20v2%20(Rust)-ea580c.svg?logo=tauri&logoColor=white)](src-tauri)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript%205.7-20232a.svg?logo=react&logoColor=61dafb)](package.json)
[![Database](https://img.shields.io/badge/Database-Native%20Rust%20SQLite%20(rusqlite)%20%2B%20WAL%20%2B%20FTS5-003B57.svg?logo=sqlite&logoColor=white)](src-tauri/src/db.rs)
[![Protocol](https://img.shields.io/badge/Protocol-Model%20Context%20Protocol%20(MCP)-7c3aed.svg)](bin/flint-mcp-server.cjs)
[![Docs](https://img.shields.io/badge/Docs-Interactive%20Website-ea580c.svg?logo=bookstack&logoColor=white)](https://yvliet.github.io/flint/)
[![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS%203.4-06b6d4.svg?logo=tailwindcss&logoColor=white)](tailwind.config.js)

[Documentation (Live Website)](https://yvliet.github.io/flint/) •
[Overview](#overview) •
[Downloads](#quick-install--downloads) •
[Architecture](#architectural-overview) •
[Storage Pipeline](#dual-track-storage--synchronization-pipeline) •
[Model Context Protocol](#native-model-context-protocol-mcp-integration) •
[Core Features](#core-capabilities) •
[Performance Engineering](#performance--systems-engineering) •
[Quickstart](#quickstart--installation) •
[Plugin Development](#extensibility--plugin-sdk)

</div>

---

## Quick Install & Downloads

Install Flint directly via terminal or grab the standalone desktop installer for your platform:

### Terminal One-Liner Installers

#### Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/yvliet/flint/main/scripts/install.ps1 | iex
```

#### macOS & Linux (Bash)
```bash
curl -fsSL https://raw.githubusercontent.com/yvliet/flint/main/scripts/install.sh | bash
```

### Direct Downloads

<table width="100%">
  <thead>
    <tr>
      <th align="left">Platform</th>
      <th align="left">Format</th>
      <th align="left">Architecture</th>
      <th align="left">Direct Download</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Windows</b></td>
      <td><code>.msi</code> Installer</td>
      <td>x64</td>
      <td><a href="https://github.com/yvliet/flint/releases/latest">Flint-Setup-x64.msi</a></td>
    </tr>
    <tr>
      <td><b>Windows</b></td>
      <td><code>.exe</code> Standalone</td>
      <td>x64</td>
      <td><a href="https://github.com/yvliet/flint/releases/latest">Flint-x64.exe</a></td>
    </tr>
    <tr>
      <td><b>macOS</b></td>
      <td><code>.dmg</code> Package</td>
      <td>Apple Silicon & Intel</td>
      <td><a href="https://github.com/yvliet/flint/releases/latest">Flint.dmg</a></td>
    </tr>
    <tr>
      <td><b>Linux</b></td>
      <td><code>.AppImage</code> Portable</td>
      <td>x86_64</td>
      <td><a href="https://github.com/yvliet/flint/releases/latest">Flint.AppImage</a></td>
    </tr>
    <tr>
      <td><b>Linux</b></td>
      <td><code>.deb</code> Package</td>
      <td>x86_64</td>
      <td><a href="https://github.com/yvliet/flint/releases/latest">flint_amd64.deb</a></td>
    </tr>
    <tr>
      <td><b>Web Preview</b></td>
      <td>In-Browser (WASM)</td>
      <td>Modern Browsers</td>
      <td><a href="https://yvliet.github.io/flint/">Launch Web App →</a></td>
    </tr>
  </tbody>
</table>

---

## Overview

Flint is a fast, local-first note-taking app and personal knowledge engine. It gives you the durability of plain Markdown files on your own computer, combined with the speed of a native Rust backend (Tauri v2), an embedded SQLite database (`rusqlite` with WAL and FTS5), and a built-in Model Context Protocol (MCP) server for local AI coding assistants.

No cloud lock-in, no monthly sync subscriptions, and no slow loading spinners. Your notes stay in standard `.md` files that you can open in any text editor, forever:

- **100% Free & Open Source (GPLv3)**: Completely transparent, zero telemetry, zero paywalled tiers, and no tracking.
- **Plain Markdown on your disk**: Notes live as ordinary `.md` files in your folders. Your data is yours forever, easy to back up, version with Git, or sync with tools like Syncthing or Dropbox.
- **Fast Rust SQLite Index (`rusqlite` + WAL + FTS5)**: Runs directly in the native Tauri process with Write-Ahead Logging (WAL) and 256MB memory mapping. Search, tag queries, and backlink lookups across 20,000+ notes run in sub-millisecond time with zero WebAssembly memory overhead.
- **Lightweight desktop footprint**: Built on Tauri v2 with automatic physical RAM trimming (`SetProcessWorkingSetSize` after 120s of idle time), keeping memory usage lean (typically under 150MB).
- **Live Preview that stays responsive**: TipTap 2.x and ProseMirror with smart transaction-mapped decorations and formula caching. Typing stays snappy (sub-8ms latency) even in 100,000-word documents.
- **Crash-resilient atomic saves**: Note saves write to temporary files first before executing atomic OS rename operations (`fs::rename`). If your computer suddenly loses power, your files are never left half-written.
- **Fast differential startup scan**: Checks file modification times and content hashes against a `file_manifest` table so opening large vaults takes just milliseconds.
- **Built-in AI Assistant Server (MCP)**: Includes an out-of-the-box stdio Model Context Protocol server (`bin/flint-mcp-server.cjs`) so AI assistants (Claude Desktop, Antigravity, Gemini, Cursor) can search, read, and write notes through 13 structured tools.
- **Instant UI with zero animation delay**: Buttons, toggle switches, menus, dropdowns, and file tree items respond immediately with zero artificial transition delays for a snappy native desktop feel.
- **Modular Extension SDK**: Build plugins with clean React layout slots, custom SQLite tables with automatic migrations, background Web Workers, and auto-generated MCP tools.

---

## Architectural Overview

Flint separates user interface components, relational query indexes, physical disk persistence, and native hardware bridges into isolated, modular tiers.

<div align="center">
  <img src="docs/assets/architecture-diagram.svg" alt="Flint Architecture Flow: [1. Presentation &amp; Workspace Layer: Live Preview Editor (TipTap &amp; ProseMirror), 2D Knowledge Graph (Force-Directed Physics), Infinite 2D Canvas (Spatial Whiteboard), FSRS Review Deck (Spaced Repetition)] --Workspace Events--&gt; [2. Flint Micro-Kernel &amp; IoC: Typed EventBus (Decoupled Pub/Sub), IoC Registries (Commands, Views, Menus), Zustand Stores (Reactive State)] --Direct Tauri IPC--&gt; [3. Storage Engine &amp; Platform Bridge: Native rusqlite (WAL Mode &amp; FTS5), Atomic Persistence (WAL Commits &amp; Temp-Rename), Tauri v2 Core (Rust Native Architecture), Runtime Optimizer (Sub-150MB &amp; RAM Trimmer)] --Atomic File I/O--&gt; [4. Local File System Vault: Markdown Files (Universal Plain Text), .flint Storage (flint.sqlite &amp; Plugins), .trash Folder (Soft-Delete Safety)]" width="100%"/>
</div>

### 4-Tier Stack

Flint maintains clean boundaries across four layers so UI code never tangles with disk I/O or database drivers:

1. **Tier 1: Presentation & Workspace Layer**:
   - Houses the UI and editing engines: TipTap 2.x and ProseMirror Live Preview, 2D Knowledge Graph, Infinite 2D Canvas, and FSRS-4.5 Review Deck.
   - UI components handle user interaction and dispatch events. React components never call filesystem APIs or database drivers directly.

2. **Tier 2: Micro-Kernel & State Layer**:
   - Provides Inversion of Control (IoC) registries (commands, views, menus, custom folder renderers), a typed `EventBus`, and reactive Zustand state stores.
   - Manages extension lifecycles and keeps core code completely isolated from plugin logic.

3. **Tier 3: Platform Bridge & Native Storage**:
   - The platform adapter ([`src/lib/platform/platformAdapter.ts`](file:///c:/Users/sultan%20haikal/Downloads/Flint/src/lib/platform/platformAdapter.ts)) routes system calls across Tauri IPC into compiled Rust.
   - Wraps the native `rusqlite` database engine (WAL mode + FTS5 BM25 search), the atomic temp-and-rename file writer, and process memory optimizers.

4. **Tier 4: Local File System Vault**:
   - Your local disk directory. Contains standard `.md` Markdown files, the internal `.flint/` folder (`flint.sqlite` index and plugin configs), and the `.trash/` soft-delete folder.

### Core Architectural Invariants

1. **Markdown Files as Single Source of Truth**:
   - Plain-text `.md` files on your disk are the real data. Flint never locks your notes inside a closed database.
   - A compiled native Rust SQLite engine (`rusqlite` with WAL mode and FTS5) indexes note metadata, block nodes, tags, tasks, and graph links for instant queries.
   - Database transactions commit page diffs directly to disk pages without UI-thread serialization or WebAssembly heap overhead.

2. **Cross-Platform Bridge (`IPlatformAdapter`)**:
   - React components and stores never call OS-specific APIs directly. All system calls route through [`src/lib/platform/platformAdapter.ts`](file:///c:/Users/sultan%20haikal/Downloads/Flint/src/lib/platform/platformAdapter.ts).
   - Runs on Tauri v2 (Rust native) for desktop builds, with an in-memory SQLite fallback for web previews.

3. **Strict Core Isolation**:
   - Core directories (`src/core`, `src/lib`, `src/store`, `src/components`, `src/types`, `src/sdk`) never import extension or plugin code.
   - Built-in features (Backlinks, Canvas, Graph, Iconify, Journal, Tasks) and community extensions interface solely through the public Flint SDK (`src/sdk`), IoC registries, and the typed `EventBus`.

---

## Dual-Track Storage & Synchronization Pipeline

<div align="center">
  <img src="docs/assets/dual-storage-model.svg" alt="Flint Dual-Track Storage &amp; Sync Architecture: [1. Workspace &amp; State Layer] bifurcates into two concurrent native tracks: [Track A: Markdown Persistence Engine (Debounced Save -&gt; Atomic Temp-Rename -&gt; Echo Suppression)] writing directly to [*.md Markdown Files], and [Track B: Native rusqlite Engine (Tauri IPC -&gt; WAL Page Commits -&gt; FTS5 BM25)] writing directly to [flint.sqlite &amp; WAL], reconciled via [file_manifest O(N) Diff Scan]" width="100%"/>
</div>

Flint gives you fast graph queries and full-text search while keeping your notes as clean Markdown files on disk through a concurrent dual-track pipeline:

### 1. Track A: Markdown File Persistence
- **Active Buffer Protection**: Keystrokes update in-memory ProseMirror document state immediately (sub-8ms latency). Background file saves never overwrite active typing buffers.
- **Debounced Save Coordinator**: File writes are debounced to avoid disk thrashing during rapid typing.
- **Atomic Temp-and-Rename Writes**: Changes write to a temporary file (`<target>.tmp.<pid>`) first, then atomically rename to the destination path via OS primitives (`fs::rename`). This prevents file corruption if your computer crashes mid-save.
- **Echo Suppression**: Before writing to disk, Flint logs an internal write timestamp (`LAST_INTERNAL_WRITE`). The file watcher checks this timestamp to ignore its own saves, preventing reload loops while still catching external edits from Git or other text editors immediately.

### 2. Track B: Relational SQLite Index (`rusqlite`)
- **Direct Tauri IPC**: Extracted AST nodes, YAML frontmatter, tags, `[[wikilinks]]`, and `- [ ]` tasks are sent over Tauri IPC to compiled Rust.
- **Direct WAL Page Commits**: `rusqlite` writes SQLite page diffs directly to `flint.sqlite` and the Write-Ahead Log (`flint.sqlite-wal`) with `PRAGMA synchronous = NORMAL;` and 256MB memory mapping (`PRAGMA mmap_size = 268435456;`).
- **Zero WASM Overhead**: Eliminates `sql.js` memory dumps and whole-database exports; queries and index updates run natively in less than a millisecond.
- **FTS5 Full-Text Search**: Block-level indexing with `unicode61 remove_diacritics 1` and BM25 statistical relevance ranking keeps search instant across vaults with tens of thousands of notes.

### 3. Differential Synchronization (`file_manifest`)
- **Fast Startup Scan**: On startup and external file watcher events, Flint compares file modification timestamps (`mtime`) and content hashes against the `file_manifest` SQLite table.
- **Skip Unchanged Notes**: Unmodified Markdown files skip AST parsing and re-indexing, letting cold-start vault validation finish in milliseconds.
- **External Edit Detection**: Changes made outside Flint (such as Git checkouts or external editors) update the index and inactive views automatically without touching your active editor buffer.

### 4. Background Process Optimization
- Memory working-set trimming (Windows Win32 `SetProcessWorkingSetSize` after 120s of idle time) runs in the background host process, keeping memory usage minimal without interrupting active typing or database writes.

---

## Native Model Context Protocol (MCP) Integration

Flint includes a built-in stdio **Model Context Protocol (MCP)** server (`bin/flint-mcp-server.cjs`), allowing AI coding assistants and autonomous agents (Claude Desktop, Google Antigravity, Gemini, Cursor) to interact directly with your notes and knowledge graph.

### Built-in MCP Tools

| Tool Name | Scope | Description |
| :--- | :--- | :--- |
| `flint_list_hearths` | Workspace | Discovers recent vaults ("Hearths") and their active paths. |
| `flint_get_active_hearth` | Workspace | Returns the path, name, and configuration of the active Hearth. |
| `flint_switch_hearth` | Workspace | Switches the active workspace context to another Hearth path. |
| `flint_search_notes` | Search | Queries notes in the active Hearth using SQLite FTS5 with BM25 ranking. |
| `flint_search_across_hearths` | Search | Searches across all known Hearths on the machine. |
| `flint_read_note` | Document | Reads a note by path or title, returning frontmatter metadata and raw Markdown. |
| `flint_create_note` | Document | Creates a new Markdown note with optional frontmatter metadata. |
| `flint_update_note` | Document | Updates note content with frontmatter merging and disk synchronization. |
| `flint_delete_note` | Document | Moves a note to the `.trash/` safety folder and removes it from the index (*destructive*). |
| `flint_list_all_notes` | Document | Lists note titles, paths, tags, and timestamps across the active Hearth. |
| `flint_get_backlinks` | Graph | Returns incoming backlinks, outgoing references, and unlinked mentions for a note. |
| `tasks_get_all` | Workspace | Retrieves all tasks across the workspace with completion statuses and tags. |
| `fsrs-spaced-repetition_get_due_cards` | Review | Fetches flashcards currently due for spaced repetition review. |

### Connecting AI Agents (Claude Desktop / Antigravity / Cursor)

Add Flint to your client's MCP configuration (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "flint": {
      "command": "node",
      "args": ["<path-to-flint>/bin/flint-mcp-server.cjs"]
    }
  }
}
```

---

## Technical Highlights

| Dimension | Implementation Details |
| :--- | :--- |
| **Licensing** | **100% Free & Open Source (GPLv3)**. Full source code transparency, zero telemetry, no paywalled features, and no commercial license fees. |
| **Data Format** | **Standard Plain-Text Markdown (`.md`)**. Notes are regular files on your disk; always portable and editable in any tool. |
| **Relational Index** | **Compiled Rust SQLite (`rusqlite`)**. Configured with `PRAGMA journal_mode = WAL`, `PRAGMA synchronous = NORMAL`, and `PRAGMA mmap_size = 268435456` (256MB memory mapping). Zero WASM overhead. |
| **Full-Text Search** | **SQLite FTS5 Virtual Tables + BM25**. Block-level tokenization with `unicode61 remove_diacritics 1` and BM25 relevance ranking. |
| **Data Safety** | **Atomic Temp-and-Rename Writes**. Saves write to temporary files before atomic OS renames (`fs::rename`). SQLite validates integrity on load via `PRAGMA integrity_check;`. |
| **Startup Sync** | **Fast Manifest Scan (`file_manifest`)**. Compares file timestamps and hashes to skip re-indexing unchanged notes. |
| **AI Protocol (MCP)** | **Native Stdio MCP Server**. Exposes 13 structured RPC tools for Claude Desktop, Antigravity, Gemini, and Cursor out of the box. |
| **Desktop Runtime** | **Tauri v2 (Rust Core)**. Replaces heavy multi-process runtimes with a lean, compiled native Rust binary. |
| **Memory Tuning** | **WebView2 Arguments + RAM Trimmer**. In-process GPU compositing, single renderer cap, and Win32 `SetProcessWorkingSetSize` idle RAM trimming. |
| **Live Preview Editor** | **ProseMirror / TipTap 2.x**. Fast transaction decoration mapping (`DecorationSet.map`), dirty-range AST scanning, MathLive formula chips, and KaTeX compilation caching. |
| **Editor Buffer Safety** | **Active Typing Protected**. Typing buffers are isolated from file-watcher reloads, paired with timestamp-based echo suppression. |
| **Link Styling** | **Persistent Visited Link Tracking**. Tracks visited wiki-links across Live Preview, Reading View, and Backlinks; configurable colors and underline modes. |
| **Web Clip Cleaner** | **Clean HTML-to-Markdown Paste**. Automatically strips citation footnotes (e.g. `[1]`, `[cite]`) and converts web formatting cleanly. |
| **Knowledge Graph** | **2D Force-Directed Graph**. Real-time repulsion physics, link distance controls, and automatic physics sleep on window minimize. |
| **Spatial Whiteboard** | **Infinite 2D Node Canvas (`.flint/canvas`)**. Free-form canvas supporting note cards, text nodes, group containers, and connector lines. |
| **Spaced Repetition** | **FSRS-4.5 Scheduler (`ts-fsrs`)**. Flashcards generated directly from Markdown notes using basic (`::`), bi-directional (`;;`), and cloze (`{...}`) syntax. |
| **Sequential Books** | **Showcase Extension: Cascade**. Reference extension demonstrating sequential chapter navigation (`Alt+,` / `Alt+.`), graph breadcrumbs, and custom folder nodes. |
| **Tasks Dashboard** | **Core Tasks Kanban & List**. Collects every `- [ ]` and `- [x]` task across your entire vault into an actionable board. |
| **Icon Customization** | **Showcase Extension: Iconify**. Reference extension demonstrating custom note title icons, file tree slots, and multi-style emoji resolution. |
| **Extension SDK** | **Micro-Kernel SDK (`src/sdk`)**. Dynamic React portal slots, native ProseMirror plugin bridges, declarative SQLite tables with migrations, Zod-to-MCP tools, and Web Worker pipelines. |

---

## Core Capabilities

### 1. High-Performance Live Preview Editor
- **Rich Typography**: TipTap 2.x and ProseMirror with real-time Markdown rendering.
- **Smart Decoration Mapping**: Maps existing decorations in $O(1)$ and only rescans modified textblocks, maintaining sub-8ms typing latency on massive documents (100k+ words).
- **MathLive & KaTeX Memoization**: Interactive visual LaTeX formula editor chips with in-memory compilation caching for instant rendering.
- **Hierarchical Folding**: Fold bullet lists, headings, and code blocks with clean chevron controls.
- **Smart Indentation & Pairing**: Auto-incrementing lists, smart `Home` key navigation, and automatic bracket/quote selection wrapping.
- **Bounded Undo History**: Undo history depth is capped at 50 snapshots to prevent unbounded memory growth.
- **Slash Commands (`/`)**: Fast insertion palette for headings, task lists, code blocks, callouts, and math blocks.

### 2. Enhanced Link Styling & Web Clip Cleaner
- **Visited Link Tracking**: Remembers visited links across Live Preview, Reading View, and Backlinks.
- **Customizable Link Palette**: Choose between your theme accent color, classic browser blue with purple visited links, or neutral text.
- **Underline Modes**: Choose always-on underlines or hover-only styling.
- **External Link Indicators**: Toggleable trailing external link icons.
- **Citation Footnote Stripping**: Pasting text copied from Wikipedia or research papers automatically converts HTML to Markdown while stripping academic citation markers like `[1]` and `[citation needed]`.

### 3. Knowledge Graph & Bi-Directional Linking
- Interactive 2D force-directed physics graph with customizable node repulsion, link distance, and search filters.
- Real-time resolution of incoming backlinks, outgoing references, and unlinked document mentions powered by SQLite joins.
- Physics simulation automatically pauses when the application window is minimized to save CPU and GPU power.

### 4. Infinite 2D Spatial Canvas
- Free-form visual whiteboard supporting note cards, text nodes, group containers, and connector lines stored in `.flint/canvas`.
- Infinite pan, zoom, snap-to-grid alignment, and color-coded node grouping.

### 5. Embedded FSRS-4.5 Spaced Repetition
- Modern Free Spaced Repetition Scheduler (`ts-fsrs`) generating flashcards directly from markdown notes:
  - `Concept :: Descriptor` (Basic flashcard)
  - `Term ;; Definition` (Bi-directional card)
  - `{Cloze Deletions}` (Contextual recall)
- Dedicated review deck modal with stability/difficulty metrics, retention targeting, and review heatmaps.

### 6. Centralized Tasks Dashboard
- Aggregates every `- [ ]` and `- [x]` markdown task across your entire Hearth into a centralized kanban board and checklist.

### 7. Journal & Daily Notes
- One-click daily scratchpad creation with configurable date formatting and chronological navigation.

### 8. Native UI & Multi-Window Settings
- Standalone frameless settings window designed for a clean desktop feel.
- Crisp 3D tactile buttons (`flint-btn`) and overhauled form controls with clear visual depth.
- Instant responsiveness with 0ms artificial animation delays on micro-interactions.
- Pre-installed themes: Catppuccin, Nord, Cyberpunk Neon, Rosé Pine, Tokyo Night, Solarized Dark/Light, Flint Dark/Light, Forest Emerald, and Minimal.

---

## Pre-Bundled Community Extensions

Flint includes showcase community extensions built entirely on top of the public Flint SDK (`src/sdk`) with `isCore: false`. These demonstrate how developers can build rich capabilities without touching native core code:

### 1. Cascade Sequential Books (`flint-cascade`)
- **Sequential Navigation**: Organize notes into sequential books and chapters with hotkey navigation (`Alt + ,` / `Alt + .`) and automatic graph breadcrumbs.
- **SDK Reference**: Demonstrates custom sidebar virtual folder injection, status bar page counters, reading order properties, and MCP tool registration.

### 2. Copilot For Flint (`flint-copilot`)
- **Knowledge Graph AI Copilot**: Context-aware AI assistant with multi-provider BYOK streaming, tool calling, and active note reasoning.
- **SDK Reference**: Demonstrates multi-surface dock zones, stream decoding, and MCP tool execution pipelines.

### 3. Quicknote Scratchpad (`quicknote`)
- **Sticky Note Overlay**: Desktop HUD overlay for rapid thought, task, and note capture with native formatting.
- **SDK Reference**: Demonstrates global modal injection, customizable shortcuts, and background vault synchronization.

### 4. Embedded FSRS Spaced Repetition (`fsrs-spaced-repetition`)
- **Spaced Repetition Review Engine**: Modern FSRS-4.5 flashcard scheduling embedded directly in markdown note syntax (`::`, `;;`, `{...}`).
- **SDK Reference**: Demonstrates action rail launchers, dedicated review modal dialogs, status bar counter badges, and custom review tables.

---

## Performance & Systems Engineering

Flint is engineered to stay fast, lightweight, and responsive even across vaults containing tens of thousands of notes.

### Systems Optimizations

| Subsystem | Strategy | Implementation Details |
| :--- | :--- | :--- |
| **Relational Indexing** | Native `rusqlite` | Direct Tauri IPC invocation to compiled Rust `rusqlite`; zero WASM overhead, zero memory heap dumps, and direct disk page writing. |
| **Full-Text Search** | SQLite FTS5 + BM25 | Block-level tokenization with `unicode61 remove_diacritics 1` and BM25 ranking. Includes automatic FTS4 fallback. |
| **Live Preview Editor** | Smart Decoration Mapping | Keystrokes map existing decorations in $O(1)$ and only rescan modified textblocks. KaTeX math HTML is cached in memory. Undo history is capped at 50 snapshots. |
| **WebView2 Tuning** | Browser Flags Injection | In-process GPU compositing (`--in-process-gpu`), single renderer process cap (`--renderer-process-limit=1`), capped disk (10MB) and media (5MB) caches, and size-optimized V8 flags. |
| **Host Process RAM** | Win32 Working Set Trimming | Windows API `SetProcessWorkingSetSize` trims physical working set memory across the WebView2 process tree after 120s of verified idle time. |
| **Bundle Footprint** | Tree-Shaken Icon Imports | Uses tree-shaken named icon imports rather than monolithic icon catalog objects to keep the initial heap lean. |
| **Data Safety** | Temp-and-Rename Saves | Note saves write to temporary files first, then atomically rename via OS primitives (`fs::rename`). Prevents file corruption if power cuts mid-save. |
| **Resilience** | Boot Integrity Validation | SQLite executes `PRAGMA integrity_check;` on load. Automatically rebuilds clean index from Markdown ground truth if corrupted. |
| **Differential Sync** | Manifest Tracking | `file_manifest` tracks file modification times and content hashes. Cold-start sync skips unchanged files, completing in under 1ms. |
| **Echo Suppression** | Timestamp Write Tracking | Tracks internal save timestamps across native runtimes to prevent file watchers from triggering reload loops. |
| **Instant UI** | Zero Animation Delay | Micro-interactions (switches, buttons, menus, dropdowns) render with zero artificial transition delays for an instant, responsive native desktop feel. |

### Verification & Testing Commands

```bash
# 1. Verify TypeScript Types
npx tsc --noEmit

# 2. Benchmark Production Bundle Build Time
npm run build

# 3. Launch Tauri Native Desktop App
npm run app
```

---

## Quickstart & Installation

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm** or **pnpm**
- **Rust Toolchain**: `cargo >= 1.75` (required for compiling Tauri native desktop binaries)

### 1. Clone the Repository
```bash
git clone https://github.com/yvliet/flint.git
cd flint
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Launch Development Environment

#### Tauri Desktop Application (Rust Native - Recommended)
```bash
npm run app
# or: npm run tauri:dev
```

#### Web Development Server (Browser Mode)
```bash
npm run dev
# Accessible at http://127.0.0.1:5173
```

### 4. Production Build

#### Build Frontend & Static Assets
```bash
npm run build
```

#### Build Tauri Native Distributable (Installer / Executable)
```bash
npm run tauri:build
```

---

## Extensibility & Plugin SDK

Flint features a modular micro-kernel architecture where both built-in core features and third-party extensions build on the identical public **Flint SDK** (`src/sdk`).

Extensions are categorized into two tiers:
- **Core Extensions (`isCore: true`)**: Built directly into the runtime (Graph, Canvas, FSRS-4.5, Tasks, Journal, Backlinks). Enabled by default and part of the main distribution.
- **Community Extensions (`isCore: false`)**: Standalone extensions (such as showcase plugins `Cascade` and `Iconify`, and user-installed plugins). They run in isolated boundaries, manage their own SQLite tables, and can be toggled or removed cleanly.

### Extensibility Architecture Flow

<div align="center">
  <img src="docs/assets/extensibility-architecture.svg" alt="Flint Extensibility Architecture: [1. Extension Layer (Core &amp; Community Extensions, Strict Core Isolation, Lifecycle, Schemas)] --SDK/Events--&gt; [2. Flint SDK Layer (Extension Base, Zod Engine, Hooks, Platform Bridge)] --IoC Binding--&gt; [3. Micro-Kernel IoC Registries (SlotRegistry, EditorRegistry, ToolRegistry, DatabaseManager, WorkerPool)] --Portals/Hooks/Tools/Tables/Tasks--&gt; [4. Host Presentation &amp; Core (Portal Slot Hosts, TipTap Bridge, Native MCP Server, Native rusqlite, EventBus Telemetry)]" width="100%"/>
</div>

### 5 Extension Superpowers

1. **Dynamic UI Layering & React Portal Slots (`registerPortalSlot`)**
   - Mount React components directly into host layout slots (`workspace:root`, `editor:minimap`, `editor:viewport-overlay`, `editor:floating-toolbar`) without DOM monkey-patching.
   - Supports ordering (`order`), contextual conditions (`when(ctx)`), and isolated error boundaries.

2. **Native ProseMirror & TipTap Bridge (`registerEditorPlugin`)**
   - Register custom ProseMirror plugins, input rules, paste rules, and keyboard shortcuts.
   - Decorations map efficiently through ProseMirror transactions (`mapping.map(decorations)`), maintaining sub-8ms typing latency on large documents.

3. **Declarative SQLite Schema & Dynamic Migrations (`defineTable`)**
   - Declare type-safe SQLite schemas directly in code (`this.defineTable(...)`).
   - Automatically diffs columns and applies non-destructive migrations (`ALTER TABLE ADD COLUMN`), tracks table versions, handles cascade deletions when notes are removed (`onDelete: 'cascade'`), and cleans up tables upon uninstallation.

4. **Type-Safe Zod-to-MCP Tool Automation (`registerTool`)**
   - Register AI agent tools using standard Zod schemas (`z.object({...})`).
   - The engine automatically generates compliant `McpJsonSchema` definitions, scopes tool names (`{extensionId}_{toolName}`), and validates parameters before invoking handlers.

5. **Off-Thread Web Worker Pipeline (`registerWorkerTask` & `runTask`)**
   - Offload heavy, CPU-intensive algorithms (geometry parsing, clustering, syntax analysis) to dedicated Web Workers.
   - Includes a two-way `EventBus` bridge allowing background tasks to stream progress updates directly to the UI without blocking the main thread.

---

### Plugin Directory Structure
Plugins live inside your vault under `.flint/plugins/<plugin-id>/`:

```
<My-Hearth>/
  └── .flint/
        └── plugins/
              └── reading-time/
                    ├── manifest.json
                    ├── main.js
                    └── styles.css (optional)
```

### Modern Extension Example (`main.js` / TypeScript)

```typescript
import { Extension, z } from 'flint';

export default class ReadingAnalyticsExtension extends Extension {
  private analyticsTable!: any;

  async onload() {
    // 1. Declarative SQLite Table with Foreign Key Cascades
    this.analyticsTable = await this.defineTable({
      tableName: 'reading_analytics',
      columns: [
        { name: 'documentId', type: 'TEXT', notNull: true, onDelete: 'cascade' },
        { name: 'wordCount', type: 'INTEGER', notNull: true },
        { name: 'estimatedMinutes', type: 'REAL', notNull: true },
        { name: 'recordedAt', type: 'INTEGER', notNull: true },
      ],
      indexes: [
        { name: 'idx_analytics_doc', columns: ['documentId'] },
      ],
    });

    // 2. Dynamic Floating Toolbar Slot
    this.registerPortalSlot({
      id: 'reading-time-pill',
      slot: 'editor:floating-toolbar',
      order: 10,
      render: (ctx) => (
        <div className="bg-surface border border-border px-2 py-0.5 rounded text-xs text-muted shadow-sm">
          ⏱️ {Math.ceil((ctx.document?.content?.split(/\s+/).length || 0) / 200)} min read
        </div>
      ),
    });

    // 3. Type-Safe Zod-to-MCP Tool for AI Agents
    this.registerTool({
      name: 'get_reading_stats',
      description: 'Calculates reading metrics and logs stats into the database.',
      schema: z.object({
        documentId: z.string().describe('Target document identifier'),
      }),
      handler: async ({ documentId }) => {
        const doc = await this.app.vault.readNote(documentId);
        const words = (doc?.content || '').split(/\s+/).length;
        const minutes = Math.ceil(words / 200);

        await this.analyticsTable.insert({
          documentId,
          wordCount: words,
          estimatedMinutes: minutes,
          recordedAt: Date.now(),
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ documentId, words, estimatedMinutes: minutes }),
            },
          ],
        };
      },
    });

    // 4. Background Web Worker Task
    this.registerWorkerTask('compute-metrics', (input: { text: string }, emitEvent) => {
      emitEvent('metrics:progress', { percent: 50 });
      const words = input.text.split(/\s+/).length;
      return { wordCount: words, readingTime: Math.ceil(words / 200) };
    });
  }

  onunload() {
    // All portal slots, database handles, editor hooks, and worker tasks clean up automatically
  }
}
```

### Documentation Suite

For detailed technical guides, end-user workflows, and architecture specifications:
- **[User Guide & Manual](docs/USER_GUIDE.md)**: Comprehensive guide for writing, active recall, spatial whiteboarding, and vault management.
- **[Systems Architecture Specification](docs/ARCHITECTURE.md)**: In-depth technical specification of the micro-kernel, storage pipeline, and performance engineering.
- **[Keyboard Shortcuts Cheat Sheet](docs/KEYBOARD_SHORTCUTS.md)**: Quick reference for all hotkeys and commands.
- **[Plugin Developer Guide](docs/PLUGIN_GUIDE.md)**: Building, debugging, and distributing custom Flint extensions.
- **[Model Context Protocol (MCP) Setup](docs/mcp-setup-guide.md)**: Connecting Claude Desktop, Antigravity, and Cursor.
- **[Contributing Guidelines](docs/CONTRIBUTING.md)**: Code standards, setup, and pull request verification.

---

## Contributing & Architecture Standards

We welcome contributions from systems engineers, UI/UX designers, and open-source developers.

### Key Engineering Invariants
1. **Strict Native Core Isolation**: Never import extension/plugin code into native directories (`src/core`, `src/lib`, `src/store`, `src/components`). Extensions must interact solely via `src/sdk`, IoC registries, and `EventBus`.
2. **Cross-Platform Bridge**: Route all hardware and OS calls through `src/lib/platform/platformAdapter.ts`.
3. **MCP Tool Registration**: Every extension managing queryable data must register at least one `McpToolDefinition` via `this.registerTool()`.
4. **Type Verification**: Always ensure `npx tsc --noEmit` passes with 0 errors before submitting pull requests.

---

## License

Flint is free and open-source software licensed under the **[GNU General Public License v3.0 (GPLv3)](LICENSE)**.
