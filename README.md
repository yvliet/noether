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

### The Open-Source, High-Performance Knowledge Engine & AI-Native Workspace

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?logo=gnu&logoColor=white)](LICENSE)
[![Runtime](https://img.shields.io/badge/Runtime-Tauri%20v2%20(Rust)-ea580c.svg?logo=tauri&logoColor=white)](src-tauri)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript%205.7-20232a.svg?logo=react&logoColor=61dafb)](package.json)
[![Database](https://img.shields.io/badge/Database-Native%20Rust%20SQLite%20(rusqlite)%20%2B%20WAL%20%2B%20FTS5-003B57.svg?logo=sqlite&logoColor=white)](src-tauri/src/db.rs)
[![Protocol](https://img.shields.io/badge/Protocol-Model%20Context%20Protocol%20(MCP)-7c3aed.svg)](bin/flint-mcp-server.cjs)
[![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS%203.4-06b6d4.svg?logo=tailwindcss&logoColor=white)](tailwind.config.js)

[Overview](#overview) •
[Architecture](#architectural-overview) •
[Storage Pipeline](#dual-layer-storage-pipeline) •
[Model Context Protocol](#native-model-context-protocol-mcp-integration) •
[Technical Highlights](#technical-architecture--capabilities-matrix) •
[Core Capabilities](#core-capabilities) •
[Performance Engineering](#performance--systems-engineering) •
[Quickstart](#quickstart--installation) •
[Plugin Development](#extensibility--plugin-sdk)

</div>

---

## Overview

Flint is an open-source (GPLv3), local-first knowledge engine and note-taking environment. It is engineered with a compiled native Rust backend (Tauri v2), a native SQLite engine (`rusqlite` with WAL and FTS5), and a built-in **Model Context Protocol (MCP)** server for local AI coding assistants.

Flint provides an open, extensible architecture that pairs plain-text Markdown vaults ("Hearths"), bi-directional `[[wiki-links]]`, 2D spatial whiteboards, embedded FSRS-4.5 spaced repetition, and deep systems optimizations:

- **100% Free & Open Source (GPLv3)**: Fully transparent codebase with zero telemetry, zero proprietary lock-in, zero paywalled sync tiers, and no commercial license fees.
- **Physical Markdown Ground Truth**: Plain-text `.md` files on your local drive are the single source of truth. Your knowledge remains yours, portable across any editor or Unix toolchain forever.
- **Compiled Native SQLite Engine (`rusqlite` + WAL + FTS5)**: A native Rust SQLite integration running directly in the Tauri host with Write-Ahead Logging (WAL) and 256MB memory-mapped I/O (`PRAGMA mmap_size = 268435456`). Delivers sub-millisecond query execution, statistical BM25 relevance ranking with diacritics removal, and zero WebAssembly heap overhead. SQLite performs integrity validation on boot (`PRAGMA integrity_check;`) and reconstructs the index from Markdown files automatically if needed.
- **Sub-150MB Lightweight Desktop Footprint**: Windows WebView2 startup argument injection (`--in-process-gpu` compositing eliminating 150-200MB separate GPU process, single renderer process limit, bounded disk/media caches, pruned web subsystems, and size-optimized V8 heap) combined with Win32 physical working set memory trimming (`SetProcessWorkingSetSize`) after 120s of idle time.
- **High-Performance Live Preview**: TipTap 2.x & ProseMirror editor engine with transaction decoration mapping (`DecorationSet.map`), dirty-range AST scanning, KaTeX compilation memoization, and bounded 50-snapshot undo history. Maintains sub-8ms typing latency on massive documents (100k+ words).
- **Atomic File Persistence**: Note saves and database transactions write to temporary files first before executing atomic OS rename operations (`fs::rename`), eliminating data loss during sudden crashes or power loss.
- **Fast Differential Sync**: Uses a `file_manifest` table and content hashing to skip unchanged files during cold-boot indexing, completing vault revalidation in milliseconds.
- **Native AI Agent Server (MCP)**: Built-in stdio Model Context Protocol server (`bin/flint-mcp-server.cjs`) allowing AI coding assistants (Claude Desktop, Antigravity, Gemini, Cursor) to search notes, read backlinks, and manage tasks via 13 structured RPC tools.
- **Instant UI Responsiveness**: Micro-interactions (switches, buttons, menus, dropdowns, tree items) execute immediately with zero artificial animation delays or visual smearing, preserving a crisp, unbloated desktop feel.
- **Micro-Kernel Plugin SDK**: Built-in features and third-party extensions build on the identical modular Flint SDK (`src/sdk`) using Inversion of Control (IoC) registries and a typed EventBus.

---

## Architectural Overview

Flint separates user interface components, relational query indexes, physical disk persistence, and native hardware bridges into isolated, modular tiers.

<div align="center">
  <img src="docs/assets/architecture-diagram.svg" alt="Flint Architecture Flow: [1. Presentation &amp; Workspace Layer: Live Preview Editor (TipTap &amp; ProseMirror), 2D Knowledge Graph (Force-Directed Physics), Infinite 2D Canvas (Spatial Whiteboard), FSRS Review Deck (Spaced Repetition)] --Workspace Events--&gt; [2. Flint Micro-Kernel &amp; IoC: Typed EventBus (Decoupled Pub/Sub), IoC Registries (Commands, Views, Menus), Zustand Stores (Reactive State)] --Direct Tauri IPC--&gt; [3. Storage Engine &amp; Platform Bridge: Native rusqlite (WAL Mode &amp; FTS5), Atomic Persistence (WAL Commits &amp; Temp-Rename), Tauri v2 Core (Rust Native Architecture), Runtime Optimizer (Sub-150MB &amp; RAM Trimmer)] --Atomic File I/O--&gt; [4. Local File System Vault: Markdown Files (Universal Plain Text), .flint Storage (flint.sqlite &amp; Plugins), .trash Folder (Soft-Delete Safety)]" width="100%"/>
</div>

### Core Architectural Invariants

1. **Dual Storage Model (Markdown Ground Truth + Native `rusqlite`)**:
   - Plain-text `.md` files on disk are the ultimate authority. Flint does not lock your data into opaque binary databases.
   - A compiled native Rust SQLite engine (`rusqlite` with WAL mode and FTS5) indexes note metadata, block-level AST nodes, tags, tasks, and graph relationships for sub-millisecond queries.
   - Database transactions commit directly to disk pages without UI-thread serialization or WebAssembly heap export overhead.

2. **Cross-Platform Neutrality Bridge (`IPlatformAdapter`)**:
   - React components and stores never invoke runtime-specific host primitives directly. All system calls route through [`src/lib/platform/platformAdapter.ts`](file:///c:/Users/sultan%20haikal/Downloads/Flint/src/lib/platform/platformAdapter.ts).
   - Operates primarily on Tauri v2 (Rust native binary) with in-memory SQLite fallback for web browser preview environments.

3. **Strict Native Core Isolation**:
   - Native core directories (`src/core`, `src/lib`, `src/store`, `src/components`, `src/types`, `src/sdk`) never import extension or plugin code.
   - Core extensions (Backlinks, Canvas, Graph, Spaced Repetition, Journal, Tasks) and community extensions (such as Cascade Books and Iconify) interface exclusively through the public Flint SDK (`src/sdk`), IoC registries, and the typed `EventBus`.

---

## Dual-Layer Storage Pipeline

<div align="center">
  <img src="docs/assets/dual-storage-model.svg" alt="Flint Dual-Layer Storage &amp; Sync Flow: [1. Native SQLite Engine: rusqlite Engine (WAL &amp; Integrity Check) -&gt; FTS5 Search (BM25 Ranked Index) -&gt; file_manifest (O(N) Diff Indexer)] --Page-Level Commits--&gt; [2. Persistence &amp; Sync: Atomic Writes (Temp &amp; Rename I/O) -&gt; Echo Suppression (Signature Tracking) -&gt; RAM Trimmer (Idle Working Set Trim)] --Atomic File I/O--&gt; [3. Physical Disk Vault: *.md Markdown (100% Ground Truth) -&gt; flint.sqlite (Native WAL &amp; FTS5 Index) -&gt; .trash/ (Soft-Delete Safety)]" width="100%"/>
</div>

Flint achieves real-time relational graph queries and full-text retrieval while safeguarding plain-text Markdown files:

- **Hierarchical Path Resolution**: Physical folders and files mirror your vault structure on disk directly (e.g. `02 Projects/Flint/About Flint.md`).
- **Direct WAL Page Commits**: SQLite transactions write page-level diffs directly to `flint.sqlite-wal`, eliminating full database memory serialization and export overhead.
- **Atomic Disk Writes**: Markdown note modifications write to a `.tmp` file first, then atomically rename to the target path via OS primitives (`fs::rename`).
- **Deterministic Echo Suppression**: Flint computes and records internal save signatures before disk writes, preventing native file-system watchers from triggering recursive reload loops.
- **Differential Startup Indexing**: Startup sync compares file modification timestamps and sizes against `file_manifest`. Unchanged notes bypass AST parsing and full-text re-indexing.
- **Active Buffer Protection**: External changes (such as Git checkouts or external editors) sync into SQLite and inactive document views automatically without clobbering active user typing buffers.

---

## Native Model Context Protocol (MCP) Integration

Flint includes a built-in stdio **Model Context Protocol (MCP)** server (`bin/flint-mcp-server.cjs`), enabling AI coding assistants and autonomous agents (Claude Desktop, Google Antigravity, Gemini, Cursor) to interact directly with your knowledge graph.

### Built-in MCP Tools

| Tool Name | Scope | Description |
| :--- | :--- | :--- |
| `flint_list_hearths` | Workspace | Discovers recent vaults ("Hearths") and their active paths. |
| `flint_get_active_hearth` | Workspace | Returns the path, name, and configuration of the active Hearth. |
| `flint_switch_hearth` | Workspace | Switches the active workspace context to another Hearth path. |
| `flint_search_notes` | Search | Queries the active Hearth using SQLite FTS5 with BM25 statistical relevance ranking. |
| `flint_search_across_hearths` | Search | Searches across all known Hearths on the machine. |
| `flint_read_note` | Document | Reads a note by path or title, parsing YAML frontmatter and raw Markdown content. |
| `flint_create_note` | Document | Atomically creates a new Markdown note with frontmatter metadata. |
| `flint_update_note` | Document | Atomically updates note content with frontmatter merging and disk synchronization. |
| `flint_delete_note` | Document | Moves a note to the `.trash/` safety folder and removes it from the index (*destructive*). |
| `flint_list_all_notes` | Document | Lists note titles, paths, tags, and timestamps across the active Hearth. |
| `flint_get_backlinks` | Graph | Resolves incoming backlinks, outgoing references, and unlinked mentions for a document. |
| `tasks_get_all` | Tasks | Aggregates all open and completed `- [ ]` markdown tasks across the Hearth. |
| `fsrs-spaced-repetition_get_due_cards` | Study | Returns flashcards due for review under the FSRS-4.5 scheduling algorithm. |

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

## Technical Architecture & Capabilities Matrix

| Architectural Dimension | Technical Implementation & Flint Invariants |
| :--- | :--- |
| **Licensing & Code Freedom** | **100% Free & Open Source (GPLv3)**. Complete source transparency, zero telemetry, zero paywalled feature tiers, and zero commercial license fees. |
| **Data Ground Truth** | **Universal Plain-Text Markdown (`.md`)**. Vaults are standard folders on your filesystem; notes remain fully portable and editable outside Flint. |
| **Relational Metadata & Query Index** | **Compiled Native Rust SQLite (`rusqlite`)**. Configured with `PRAGMA journal_mode = WAL`, `PRAGMA synchronous = NORMAL`, and `PRAGMA mmap_size = 268435456` (256MB memory mapping). Zero WASM overhead. |
| **Full-Text Retrieval** | **SQLite FTS5 Virtual Tables + BM25**. Block-level tokenization with `unicode61 remove_diacritics 1` and statistical BM25 relevance ranking. |
| **Persistence & Crash Resilience** | **Atomic Temp-and-Rename Writes**. Saves write to temporary files before atomic OS renames (`fs::rename`). SQLite validates integrity on load via `PRAGMA integrity_check;`. |
| **Startup Differential Sync** | **$O(N)$ Manifest Scan (`file_manifest`)**. Compares file modification times and content hashes to skip AST re-indexing on unchanged notes. |
| **AI Agent Protocol (MCP)** | **Native Stdio MCP Server**. Out-of-the-box stdio server exposing 13 RPC tools for Claude Desktop, Antigravity, Gemini, and Cursor. |
| **Desktop Host Architecture** | **Pure Tauri v2 (Compiled Rust Core)**. Replaces heavy multi-process runtimes with a lean, compiled native Rust application binary. |
| **Memory Working Set Optimization** | **Windows WebView2 Tuning + Working Set Trimmer**. In-process GPU compositing (`--in-process-gpu`), single renderer cap, capped caches, and Win32 `SetProcessWorkingSetSize` idle RAM trimming. |
| **Live Preview Editor Engine** | **ProseMirror / TipTap 2.x**. $O(1)$ transaction decoration mapping (`DecorationSet.map`), dirty-range AST scanning, MathLive formula chips, and KaTeX compilation caching. |
| **Editor Buffer Safety** | **Active Typing Protected**. Typing buffers are isolated from file-watcher clobbering, paired with signature-based echo suppression. |
| **Link Tracking & Styling** | **Persistent Visited Link Tracking**. Tracks visited wiki-links across Live Preview, Reading View, and Backlinks; configurable link color schemes and underline modes. |
| **Web Clip Cleaner** | **Intelligent HTML-to-Markdown Paste Parser**. Automatically strips citation footnotes (e.g. `[1]`, `[cite]`) and converts HTML tags cleanly on paste. |
| **Knowledge Graph View** | **2D Force-Directed Graph Engine**. Real-time repulsion physics, link distance tuning, and automatic physics suspension on window minimize. |
| **Spatial Whiteboard** | **Infinite 2D Node Canvas (`.flint/canvas`)**. Free-form canvas supporting note cards, text nodes, group containers, and connector lines. |
| **Spaced Repetition Engine** | **Core FSRS-4.5 Scheduler (`ts-fsrs`)**. Flashcards generated directly from Markdown notes using basic (`::`), bi-directional (`;;`), and cloze (`{...}`) syntax. |
| **Sequential Book Reader** | **Showcase Community Extension: Cascade**. Pre-bundled reference extension demonstrating sequential chapter navigation (`Alt+,` / `Alt+.`), graph breadcrumbs, and SDK custom folder nodes. |
| **Global Tasks Dashboard** | **Core Tasks Kanban & List**. Centralizes every `- [ ]` and `- [x]` task across the entire vault into an actionable dashboard. |
| **Iconography & Customization** | **Showcase Community Extension: Iconify**. Pre-bundled reference extension demonstrating custom note title icons, file tree chevron-spacer slots, and multi-style emoji resolution (Native, Twemoji, Apple, Google, Fluent). |
| **Extension Architecture** | **Micro-Kernel IoC Plugin SDK (`src/sdk`)**. Decoupled EventBus, IoC registries for commands/views/menus, dynamic SQLite schemas, and mandatory MCP tool registration. |

---

## Core Capabilities

### 1. High-Performance Live Preview Editor
- **Rich Typography**: TipTap 2.x and ProseMirror with real-time Markdown rendering.
- **Incremental Decoration Mapping**: Replaces whole-document rescans with $O(1)$ transaction mapping (`DecorationSet.map`). Only rescans dirty textblocks on keystrokes, preserving sub-8ms typing latency on massive documents (100k+ words).
- **MathLive & KaTeX Memoization**: Interactive visual LaTeX formula editor chips with in-memory compilation caching for instant rendering.
- **Hierarchical Folding**: Chevron list folding, heading folding, and ellipsis placeholder expansion with mapped fold decorations.
- **Smart Indentation & Pairing**: Auto-incrementing numbered/lettered lists, smart `Home` caret navigation, and bracket/quote selection wrapping.
- **Bounded Undo History**: TipTap undo history depth is bounded to 50 snapshots to prevent unbounded ProseMirror memory growth.
- **Slash Commands (`/`)**: Fast insertion palette for headings, task lists, code blocks, callouts, and math nodes.

### 2. Enhanced Link Styling & Web Clip Cleaner
- **Visited Link Tracking**: Persistent visited state tracking across Live Preview, Reading View, and Backlinks.
- **Customizable Link Palette**: Select between active theme accent, classic browser blue with purple visited tracking, or neutral text color.
- **Underline Modes**: Toggle always-on underlines versus hover-only styling, with optional underline color matching.
- **External Link Indicators**: Toggleable trailing external link icons with clean inline rendering.
- **Citation Footnote Stripping**: Rich HTML-to-markdown paste parser that converts web formatting cleanly while automatically stripping academic and Wikipedia citation footnotes (e.g. `[1]`, `[citation needed]`).

### 3. Knowledge Graph & Bi-Directional Linking
- Interactive 2D force-directed physics graph with customizable node repulsion, link distance, and search filters.
- Real-time resolution of incoming backlinks, outgoing references, and unlinked document mentions powered by SQLite joins.
- Physics simulation automatically pauses when the application window is minimized, eliminating idle GPU/CPU load.

### 4. Infinite 2D Spatial Canvas
- Free-form visual whiteboard supporting note cards, text nodes, group containers, and connector lines stored in `.flint/canvas`.
- Infinite pan, zoom, snap-to-grid alignment, and color-coded node grouping.

### 5. Embedded FSRS-4.5 Spaced Repetition
- Integrated Free Spaced Repetition Scheduler (`ts-fsrs`) generating flashcards directly from markdown notes:
  - `Concept :: Descriptor` (Basic flashcard)
  - `Term ;; Definition` (Bi-directional card)
  - `{Cloze Deletions}` (Contextual recall)
- Dedicated review deck modal with stability/difficulty metrics, retention targeting, and review heatmaps.

### 6. Centralized Tasks Dashboard
- Aggregates every `- [ ]` and `- [x]` markdown task across your entire Hearth into a centralized, actionable kanban and checklist.

### 7. Journal & Daily Notes
- One-click daily scratchpad creation with configurable date formatting and chronological navigation.

### 8. Native UI & Multi-Window Frameless Settings
- Standalone frameless multi-window configuration suite mirroring native desktop utility UX.
- 3D tactile buttons (`flint-btn`) and overhauled form controls with crisp borders and visual depth.
- Instant responsiveness with zero artificial transition delays on micro-interactions.
- Pre-installed themes: Catppuccin, Nord, Cyberpunk Neon, Rosé Pine, Tokyo Night, Solarized Dark/Light, Flint Dark/Light, Forest Emerald, and Minimal.

---

## Pre-Bundled Community Extensions

Flint pre-bundles two showcase community extensions built exclusively on top of the public Flint SDK (`src/sdk`) with `isCore: false`. These serve as production-grade reference implementations demonstrating how community developers can build rich capabilities without touching native core code, before they are decoupled into standalone marketplace packages:

### 1. Cascade Sequential Books (`flint-cascade`)
- **Sequential Navigation**: Organize notes into sequential books and chapters with smooth hotkey navigation (`Alt + ,` / `Alt + .`) and automatic graph breadcrumbs.
- **SDK Reference Model**: Demonstrates custom sidebar virtual folder injection, status bar page counters, reading order properties, and MCP tool registration using only public extension APIs.

### 2. Iconify & Multi-Style Emoji Engine (`iconify`)
- **Custom Iconography**: Assign custom icons or emojis to note titles, tabs, and file tree items with dedicated SQLite storage.
- **Chevron-Aligned Slots**: File tree icons seat cleanly in the chevron spacer slot to guarantee uniform filename alignment.
- **Multi-Style Resolution**: Supports Native, Twitter (Twemoji), Apple, Google, and Microsoft Fluent emoji sets with dual hex format resolution.
- **SDK Reference Model**: Demonstrates dynamic SQLite table creation on `onload()`, icon picker modals, and full MCP management (`iconify_set_icon`, `iconify_get_icon`).

---

## Performance & Systems Engineering

Flint is engineered with explicit performance invariants designed to maintain fluid 60 FPS rendering and minimal memory overhead even across vaults containing tens of thousands of notes.

### Systems Optimizations & Architectural Invariants

| Subsystem | Optimization Strategy | Implementation Details |
| :--- | :--- | :--- |
| **Relational Indexing** | Compiled Native `rusqlite` | Direct Tauri IPC invocation to compiled Rust `rusqlite`; zero WASM overhead, zero memory heap dumps, and direct disk page writing. |
| **Full-Text Search** | SQLite FTS5 Virtual Tables + BM25 | Block-level tokenization with `unicode61 remove_diacritics 1` and statistical BM25 ranking. Includes automatic FTS4 fallback. |
| **Live Preview Editor** | Incremental Decoration Mapping | Keystrokes map existing decorations in $O(1)$ and only rescan dirty textblocks. KaTeX math HTML is memoized in memory. Undo history is bounded to 50 snapshots. |
| **WebView2 Memory Tuning** | Browser Arguments Injection | In-process GPU compositing (`--in-process-gpu`), single renderer process cap (`--renderer-process-limit=1`), capped disk (10MB) and media (5MB) caches, disabled unused browser subsystems, and size-optimized V8 flags (`--max-old-space-size=128 --optimize-for-size`). |
| **RAM Trimming** | Win32 Working Set Trimming | Windows API `SetProcessWorkingSetSize` trims physical working set memory across the WebView2 process tree after 120s of verified user idle time. |
| **Bundle Footprint** | Tree-Shaken Icon Catalogs | Replaced monolithic 6.75MB hugeicons catalog with tree-shaken named imports to eliminate boot heap bloat. |
| **Data Safety & Atomic Writes** | Temporary-File + Rename | Note saves write to temporary files first, then atomically rename via OS primitives (`fs::rename`). Prevents file corruption on unexpected crashes or power loss. |
| **Resilience & Self-Healing** | Boot Integrity Validation | SQLite executes `PRAGMA integrity_check;` on load. Automatically rebuilds clean index from Markdown ground truth if corrupted. |
| **Differential Sync** | Manifest Tracking | `file_manifest` tracks file modification times and content hashes. Cold-start sync skips unchanged files, completing in under 1ms. |
| **Echo Suppression** | Signature-Based Write Tracking | Tracks internal save signatures across native runtimes to prevent file watchers from triggering reload loops. |
| **Instant UI Snappiness** | Zero Transition Delay | Micro-interactions (switches, buttons, menus, dropdowns) render with zero artificial transition durations for an instant, responsive native desktop feel. |

### Verification & Testing Commands

```bash
# 1. Verify Zero TypeScript Type Regressions
npx tsc --noEmit

# 2. Execute Reliability, Scalability & Resilience Benchmark Suite
node scripts/test-reliability-and-scaling.cjs

# 3. Execute Editor Writing Edge Cases Suite (Playwright Headless)
node scripts/test-document-writing-edge-cases.cjs

# 4. Execute Undo/Redo (CTRL+Z) Recovery & Stress Suite
node scripts/test-ctrl-z-suite.cjs

# 5. Benchmark Production Bundle Build Time
npm run build

# 6. Launch Tauri Native Desktop with Background Memory Trimming
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

Flint features a modular micro-kernel architecture. Both native core extensions and third-party plugins build on the public **Flint SDK** (`src/sdk`). Extensions are categorized into two tiers:
- **Core Extensions (`isCore: true`)**: Built directly into the runtime distribution (e.g. Graph, Canvas, FSRS-4.5, Tasks, Journal, Backlinks). They cannot be uninstalled and are enabled by default.
- **Community Extensions (`isCore: false`)**: Decoupled, standalone extensions (such as pre-bundled showcase plugins `Cascade` and `Iconify`, and user-installed plugins). They run within standard extension boundaries, manage their own isolated SQLite tables, and can be toggled or uninstalled.

### Plugin Directory Structure
Plugins are stored within your vault under `.flint/plugins/<plugin-id>/`:

```
<My-Hearth>/
  └── .flint/
        └── plugins/
              └── reading-time/
                    ├── manifest.json
                    ├── main.js
                    └── styles.css (optional)
```

### Sample Plugin with MCP Tool Registration (`main.js`)

```javascript
const { Plugin } = require('flint');

module.exports = class ReadingTimePlugin extends Plugin {
  async onload() {
    // 1. Register a command in the Command Palette (Ctrl + K)
    this.addCommand({
      id: 'show-reading-time',
      title: 'Calculate Active Note Reading Time',
      hotkey: 'Ctrl+Shift+U',
      action: (app) => {
        const text = app.vault.activeDocument?.title || '';
        app.workspace.showToast('Estimated read time: ~2 mins', 'info');
      },
    });

    // 2. Register a persistent status bar widget
    this.addStatusBarItem({
      id: 'reading-time-status',
      alignment: 'right',
      render: (app) => {
        return React.createElement('span', { className: 'text-xs text-muted' }, '📖 ~2 min read');
      },
    });

    // 3. Register an MCP Tool for local AI Agents
    this.registerTool({
      name: 'get_reading_time',
      description: 'Calculates the estimated reading time of a note in minutes',
      parameters: {
        type: 'object',
        properties: {
          notePath: { type: 'string', description: 'Relative path or title of the note' },
        },
        required: ['notePath'],
      },
      handler: async (args) => {
        const note = await this.app.vault.readNote(args.notePath);
        const words = (note?.content || '').split(/\s+/).length;
        const minutes = Math.ceil(words / 200);
        return { content: [{ type: 'text', text: `Estimated reading time: ${minutes} min (${words} words)` }] };
      },
    });

    // 4. Subscribe to workspace events
    this.app.events.on('document:saved', (doc) => {
      console.log('Document saved:', doc.title);
    });
  }

  onunload() {
    // All UI items, commands, and MCP tools are cleaned up automatically
  }
};
```

For comprehensive documentation on extension points, context menus, custom views, and settings tabs, refer to [`docs/PLUGIN_GUIDE.md`](docs/PLUGIN_GUIDE.md) and [`docs/mcp-setup-guide.md`](docs/mcp-setup-guide.md).

---

## Contributing & Architecture Standards

We welcome contributions from systems engineers, UI/UX designers, and open-source advocates.

### Key Engineering Rules
1. **Strict Native Core Isolation**: Never import extension/plugin code into native directories (`src/core`, `src/lib`, `src/store`, `src/components`). Extensions must interact solely via `src/sdk`, IoC registries, and `EventBus`.
2. **Cross-Platform Bridge**: Route all hardware and OS calls through `src/lib/platform/platformAdapter.ts`.
3. **MCP Tool Registration**: Every extension managing queryable data must register at least one `McpToolDefinition` via `this.registerTool()`.
4. **Type Verification**: Always ensure `npx tsc --noEmit` passes with 0 errors before submitting pull requests.

---

## License

Flint is free and open-source software licensed under the **[GNU General Public License v3.0 (GPLv3)](LICENSE)**.
