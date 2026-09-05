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
[Install](#quick-install--downloads) •
[Architecture](#architectural-overview) •
[Storage Pipeline](#dual-track-storage--synchronization-pipeline) •
[Model Context Protocol](#native-model-context-protocol-mcp-integration) •
[Technical Highlights](#technical-architecture--capabilities-matrix) •
[Core Capabilities](#core-capabilities) •
[Performance Engineering](#performance--systems-engineering) •
[Quickstart](#quickstart--installation) •
[Plugin Development](#extensibility--plugin-sdk)

</div>

---

## Quick Install & Downloads

Install Flint instantly via terminal one-liner or download standalone desktop binaries:

### Terminal One-Liner Installers

#### Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/yvliet/flint/main/scripts/install.ps1 | iex
```

#### macOS & Linux (Bash)
```bash
curl -fsSL https://raw.githubusercontent.com/yvliet/flint/main/scripts/install.sh | bash
```

### Direct Download Matrix

| Platform | Format | Architecture | Direct Download |
| :--- | :--- | :--- | :--- |
| **Windows** | `.msi` Installer | x64 | [Flint-Setup-x64.msi](https://github.com/yvliet/flint/releases/latest) |
| **Windows** | `.exe` Standalone | x64 | [Flint-x64.exe](https://github.com/yvliet/flint/releases/latest) |
| **macOS** | `.dmg` Package | Apple Silicon & Intel | [Flint.dmg](https://github.com/yvliet/flint/releases/latest) |
| **Linux** | `.AppImage` Portable | x86_64 | [Flint.AppImage](https://github.com/yvliet/flint/releases/latest) |
| **Linux** | `.deb` Package | x86_64 | [flint_amd64.deb](https://github.com/yvliet/flint/releases/latest) |
| **Web Preview** | In-Browser (WASM) | Modern Browsers | [Launch Web App →](https://yvliet.github.io/flint/) |

---

## Overview

Flint is an open-source (GPLv3), local-first knowledge engine and note-taking environment. It is engineered with a compiled native Rust backend (Tauri v2), a native SQLite engine (`rusqlite` with WAL and FTS5), and a built-in **Model Context Protocol (MCP)** server for local AI coding assistants.

Flint provides an open, extensible architecture that pairs plain-text Markdown vaults ("Hearths"), bi-directional `[[wiki-links]]`, 2D spatial whiteboards, embedded FSRS-4.5 spaced repetition, and deep systems optimizations:

- **100% Free & Open Source (GPLv3)**: Fully transparent codebase with zero telemetry, zero proprietary lock-in, zero paywalled sync tiers, and no commercial license fees.
- **Physical Markdown Ground Truth**: Plain-text `.md` files on your local drive are the single source of truth. Your knowledge remains yours, portable across any editor or Unix toolchain forever.
- **Compiled Native SQLite Engine (`rusqlite` + WAL + FTS5)**: A native Rust SQLite integration running directly in the Tauri host with Write-Ahead Logging (WAL) and 256MB memory-mapped I/O (`PRAGMA mmap_size = 268435456`). Delivers sub-millisecond query execution, statistical BM25 relevance ranking with diacritics removal, and zero WebAssembly heap overhead. SQLite performs integrity validation on boot (`PRAGMA integrity_check;`) and reconstructs the index from Markdown files automatically if needed.
- **Sub-150MB Lightweight Desktop Footprint**: High-performance Tauri v2 desktop runtime combined with Win32 physical working set memory trimming (`SetProcessWorkingSetSize`) after 120s of idle time and selective chunk splitting.
- **High-Performance Live Preview**: TipTap 2.x & ProseMirror editor engine with transaction decoration mapping (`DecorationSet.map`), dirty-range AST scanning, KaTeX compilation memoization, and bounded 50-snapshot undo history. Maintains sub-8ms typing latency on massive documents (100k+ words).
- **Atomic File Persistence**: Note saves write to temporary files first before executing atomic OS rename operations (`fs::rename`), while SQLite transactions commit direct WAL pages, eliminating data loss during sudden crashes or power loss.
- **Fast Differential Sync**: Uses a `file_manifest` table and content hashing to skip unchanged files during cold-boot indexing, completing vault revalidation in milliseconds.
- **Native AI Agent Server (MCP)**: Built-in stdio Model Context Protocol server (`bin/flint-mcp-server.cjs`) allowing AI coding assistants (Claude Desktop, Antigravity, Gemini, Cursor) to search notes, read backlinks, and manage tasks via 13 structured RPC tools.
- **Instant UI Responsiveness**: Micro-interactions (switches, buttons, menus, dropdowns, tree items) execute immediately with zero artificial animation delays or visual smearing, preserving a crisp, unbloated desktop feel.
- **Advanced Micro-Kernel Plugin SDK**: Built-in features and third-party extensions build on the identical modular Flint SDK (`src/sdk`) using Inversion of Control (IoC) registries, a typed EventBus, dynamic React portal slots, native ProseMirror transaction-mapped plugin bridges, declarative SQLite tables with automated migration tracking and cascade purges, type-safe Zod-to-MCP tool automation, and off-thread Web Worker pipelines.

---

## Architectural Overview

Flint separates user interface components, relational query indexes, physical disk persistence, and native hardware bridges into isolated, modular tiers.

<div align="center">
  <img src="docs/assets/architecture-diagram.svg" alt="Flint Architecture Flow: [1. Presentation &amp; Workspace Layer: Live Preview Editor (TipTap &amp; ProseMirror), 2D Knowledge Graph (Force-Directed Physics), Infinite 2D Canvas (Spatial Whiteboard), FSRS Review Deck (Spaced Repetition)] --Workspace Events--&gt; [2. Flint Micro-Kernel &amp; IoC: Typed EventBus (Decoupled Pub/Sub), IoC Registries (Commands, Views, Menus), Zustand Stores (Reactive State)] --Direct Tauri IPC--&gt; [3. Storage Engine &amp; Platform Bridge: Native rusqlite (WAL Mode &amp; FTS5), Atomic Persistence (WAL Commits &amp; Temp-Rename), Tauri v2 Core (Rust Native Architecture), Runtime Optimizer (Sub-150MB &amp; RAM Trimmer)] --Atomic File I/O--&gt; [4. Local File System Vault: Markdown Files (Universal Plain Text), .flint Storage (flint.sqlite &amp; Plugins), .trash Folder (Soft-Delete Safety)]" width="100%"/>
</div>

### Clean Micro-Kernel 4-Tier Stack

Flint establishes a strict, uncompromised separation of concerns across a 4-tier micro-kernel stack. This guarantees that user-facing presentation, state coordination, native hardware bridges, and physical storage remain isolated behind explicit boundaries:

1. **Tier 1: Presentation & Workspace Layer**:
   - Houses high-performance UI and editing engines: TipTap 2.x & ProseMirror Live Preview, 2D Force-Directed Knowledge Graph, Infinite 2D Spatial Canvas, and FSRS-4.5 Review Deck.
   - UI components exclusively capture user intent and dispatch high-level workspace events downward. **React components never invoke OS filesystem methods or database bindings directly.**

2. **Tier 2: Flint Micro-Kernel & IoC State Layer**:
   - Provides Inversion of Control (IoC) registries (commands, views, menus, custom folder renderers), the typed `EventBus`, and reactive Zustand state stores.
   - Coordinates application state, manages extension lifecycles, and enforces strict native core isolation (zero extension leakage into native code directories).

3. **Tier 3: Storage Engine & Platform Bridge**:
   - The Cross-Platform Neutrality Bridge ([`src/lib/platform/platformAdapter.ts`](file:///c:/Users/sultan%20haikal/Downloads/Flint/src/lib/platform/platformAdapter.ts)) routes all system requests across Tauri IPC into the compiled native Rust host.
   - Encapsulates the native `rusqlite` database engine (WAL mode + FTS5 BM25), the atomic temp-and-rename file persistence coordinator, and host process management services.

4. **Tier 4: Local File System Vault**:
   - The user's local disk filesystem. Houses standard plain-text `*.md` files (100% physical ground truth), the internal `.flint/` directory (`flint.sqlite`, WAL journals, and extension schemas), and the `.trash/` soft-delete safety folder.

### Core Architectural Invariants

1. **Dual Storage Model (Markdown Ground Truth + Native `rusqlite`)**:
   - Plain-text `.md` files on disk are the ultimate authority. Flint never locks user knowledge into opaque binary blobs.
   - A compiled native Rust SQLite engine (`rusqlite` with WAL mode and FTS5) indexes note metadata, block-level AST nodes, tags, tasks, and graph relationships for sub-millisecond queries.
   - Database transactions commit page-level diffs directly to disk pages without UI-thread serialization or WebAssembly heap export overhead.

2. **Cross-Platform Neutrality Bridge (`IPlatformAdapter`)**:
   - React components and stores never invoke runtime-specific host primitives directly. All system calls route through [`src/lib/platform/platformAdapter.ts`](file:///c:/Users/sultan%20haikal/Downloads/Flint/src/lib/platform/platformAdapter.ts).
   - Operates primarily on Tauri v2 (Rust native binary) with in-memory SQLite fallback for web browser preview environments.

3. **Strict Native Core Isolation**:
   - Native core directories (`src/core`, `src/lib`, `src/store`, `src/components`, `src/types`, `src/sdk`) never import extension or plugin code.
   - Core extensions (Backlinks, Canvas, Graph, Iconify, Journal, Tasks) and community extensions (such as Cascade Books, Copilot, Quicknote, and Spaced Repetition) interface exclusively through the public Flint SDK (`src/sdk`), IoC registries, and the typed `EventBus`.

---

## Dual-Track Storage & Synchronization Pipeline

<div align="center">
  <img src="docs/assets/dual-storage-model.svg" alt="Flint Dual-Track Storage &amp; Sync Architecture: [1. Workspace &amp; State Layer] bifurcates into two concurrent native tracks: [Track A: Markdown Persistence Engine (Debounced Save -&gt; Atomic Temp-Rename -&gt; Echo Suppression)] writing directly to [*.md Markdown Files], and [Track B: Native rusqlite Engine (Tauri IPC -&gt; WAL Page Commits -&gt; FTS5 BM25)] writing directly to [flint.sqlite &amp; WAL], reconciled via [file_manifest O(N) Diff Scan]" width="100%"/>
</div>

Flint achieves real-time relational graph queries and full-text retrieval while safeguarding plain-text Markdown files through a **dual-track concurrent pipeline**, rather than a single sequential pipeline:

### 1. Track A: Markdown Physical Ground Truth (File Persistence Engine)
- **Active Buffer Protection**: Keystrokes update in-memory ProseMirror document state instantly (sub-8ms typing latency). Active typing buffers are shielded from background disk synchronization overwrite.
- **Debounced Save Coordinator**: Note saves are debounced to prevent disk I/O thrashing during continuous typing bursts.
- **Atomic Temp-and-Rename Writes**: Note modifications write to an intermediate temporary file (`<target>.tmp.<pid>`) first, then atomically rename to the target path via OS primitives (`fs::rename`). This guarantees zero file corruption during unexpected crashes or power loss.
- **Deterministic Echo Suppression**: Before issuing disk writes, Flint records an internal write signature (`LAST_INTERNAL_WRITE` timestamp). The native filesystem watcher verifies this signature to suppress redundant reload events, preventing recursive feedback loops while retaining instant detection of external changes (e.g. Git checkouts or external text editors).

### 2. Track B: Relational Metadata & Query Index (Native `rusqlite` Engine)
- **Direct Tauri IPC Dispatch**: Extracted AST nodes, YAML frontmatter, tags, `[[wikilinks]]`, and `- [ ]` tasks serialize across Tauri IPC directly to compiled Rust.
- **Direct WAL Page Commits**: `rusqlite` writes SQLite page diffs directly to `flint.sqlite` and the Write-Ahead Log (`flint.sqlite-wal`) under `PRAGMA synchronous = NORMAL;` and 256MB memory mapping (`PRAGMA mmap_size = 268435456;`). `rusqlite` handles SQLite page writes directly without routing through the Markdown file persistence mechanism.
- **Zero WebAssembly Serialization Overhead**: Eliminates `sql.js` memory dumps and whole-database exports; queries and index updates execute natively in sub-millisecond time.
- **FTS5 Full-Text Indexing**: Block-level tokenization with `unicode61 remove_diacritics 1` and statistical BM25 relevance ranking keeps search instantly responsive across vaults with tens of thousands of notes.

### 3. Differential Synchronization & Cold-Boot Re-indexing (`file_manifest`)
- **$O(N)$ Manifest Scan**: On cold-boot startup and external file watcher events, Flint evaluates file modification timestamps (`mtime`) and content hashes against the `file_manifest` SQLite table.
- **Unchanged File Bypass**: Unmodified Markdown files skip AST tokenization and full-text re-indexing completely, allowing cold-start vault revalidation in milliseconds.
- **External Edit Reconciliation**: External modifications (e.g. Git branches or external CLI tools) ingest automatically into SQLite and inactive document views without clobbering active user typing buffers.

### 4. Decoupled Host Process Management (Host Runtime vs. Storage Pipeline)
- **Runtime Process Management Invariant**: Memory working-set trimming (Windows Win32 `SetProcessWorkingSetSize` after 120s of verified user idle time) is a **host runtime process management concern** handled by the Tauri background optimizer.
- It operates independently in the host runtime lifecycle and is strictly decoupled from the atomic file and database write pipelines.

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
| `tasks_get_all` | Workspace | Retrieves task items across the active workspace with completion statuses and tags. |
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
| **Extension Architecture** | **Advanced Micro-Kernel SDK (`src/sdk`)**. Dynamic React portal slots (`workspace:root`, `editor:*`), native ProseMirror transaction-mapped plugin bridge, declarative SQLite table definitions with cascade cleanup, type-safe Zod-to-MCP tool automation, and off-thread Web Worker pipeline. |

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

Flint pre-bundles showcase community extensions built exclusively on top of the public Flint SDK (`src/sdk`) with `isCore: false`. These serve as production-grade reference implementations demonstrating how community developers can build rich capabilities without touching native core code, before they are decoupled into standalone marketplace packages:

### 1. Cascade Sequential Books (`flint-cascade`)
- **Sequential Navigation**: Organize notes into sequential books and chapters with smooth hotkey navigation (`Alt + ,` / `Alt + .`) and automatic graph breadcrumbs.
- **SDK Reference Model**: Demonstrates custom sidebar virtual folder injection, status bar page counters, reading order properties, and MCP tool registration using only public extension APIs.

### 2. Copilot For Flint (`flint-copilot`)
- **Knowledge Graph AI Copilot**: Context-aware AI assistant with multi-provider BYOK streaming, tool calling, and active note reasoning.
- **SDK Reference Model**: Demonstrates multi-surface dock zones, stream decoding, and MCP tool execution pipelines.

### 3. Quicknote Scratchpad (`quicknote`)
- **Sticky Note Overlay**: Desktop-grade HUD overlay for rapid thought, task, and note capture with native formatting.
- **SDK Reference Model**: Demonstrates global modal injection, customizable shortcuts, and background vault synchronization.

### 4. Embedded FSRS Spaced Repetition (`fsrs-spaced-repetition`)
- **Spaced Repetition Review Engine**: Modern FSRS-4.5 flashcard scheduling embedded directly in markdown note syntax (`::`, `;;`, `{...}`).
- **SDK Reference Model**: Demonstrates action rail launchers, dedicated review modal dialogs, status bar counter badges, and custom review tables.

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
| **Host Process RAM Trimming** | Win32 Working Set Trimming | Windows API `SetProcessWorkingSetSize` trims physical working set memory across the WebView2 process tree after 120s of verified user idle time (decoupled background host runtime optimization). |
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

# 2. Benchmark Production Bundle Build Time
npm run build

# 3. Launch Tauri Native Desktop with Background Memory Trimming
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

Flint features an advanced modular micro-kernel architecture designed to provide deep host integration while preserving strict native core isolation, sub-8ms typing latency guarantees, and zero micro-interaction delays. Both native core features and third-party extensions build on the identical public **Flint SDK** (`src/sdk`).

Extensions are categorized into two tiers:
- **Core Extensions (`isCore: true`)**: Built directly into the runtime distribution (e.g. Graph, Canvas, FSRS-4.5, Tasks, Journal, Backlinks). They cannot be uninstalled and are enabled by default.
- **Community Extensions (`isCore: false`)**: Decoupled, standalone extensions (such as pre-bundled showcase plugins `Cascade` and `Iconify`, and user-installed plugins). They run within standard extension boundaries, manage their own isolated SQLite tables, and can be toggled or uninstalled with clean disk teardown.

### Extensibility Architecture Flow

<div align="center">
  <img src="docs/assets/extensibility-architecture.svg" alt="Flint Extensibility Architecture: [1. Extension Layer (Core &amp; Community Extensions, Strict Core Isolation, Lifecycle, Schemas)] --SDK/Events--&gt; [2. Flint SDK Layer (Extension Base, Zod Engine, Hooks, Platform Bridge)] --IoC Binding--&gt; [3. Micro-Kernel IoC Registries (SlotRegistry, EditorRegistry, ToolRegistry, DatabaseManager, WorkerPool)] --Portals/Hooks/Tools/Tables/Tasks--&gt; [4. Host Presentation &amp; Core (Portal Slot Hosts, TipTap Bridge, Native MCP Server, Native rusqlite, EventBus Telemetry)]" width="100%"/>
</div>

### The 5 Extension Superpowers

1. **Dynamic UI Layering & React Portal Slots (`registerPortalSlot`)**
   - Mount React components directly into designated host layout slots (`workspace:root`, `editor:minimap`, `editor:viewport-overlay`, `editor:floating-toolbar`) without DOM monkey-patching.
   - Supports deterministic ordering (`order`), contextual predicates (`when(ctx)`), pointer-events pass-through, and isolated error boundaries.

2. **Native ProseMirror & TipTap Bridge (`registerEditorPlugin`)**
   - Register custom ProseMirror plugins, input rules, paste rules, and keyboard shortcuts.
   - Dynamic decorations map through ProseMirror transactions (`mapping.map(decorations)`), running in $O(K)$ time over active decorations rather than $O(N)$ document scans, maintaining sub-8ms typing latency on massive documents.

3. **Declarative SQLite Schema & Dynamic Migrations (`defineTable`)**
   - Declare type-safe SQLite schemas directly in code (`this.defineTable(...)`).
   - Automatically diffs columns and applies non-destructive migrations (`ALTER TABLE ADD COLUMN`), tracks table versions in `flint_extension_tables`, executes cascade deletions when notes are removed (`onDelete: 'cascade'`), and cleans up tables upon uninstallation.

4. **Type-Safe Zod-to-MCP Tool Automation (`registerTool`)**
   - Register AI agent tools using standard Zod schemas (`z.object({...})`).
   - The engine automatically generates compliant `McpJsonSchema` definitions, scopes tool names (`{extensionId}_{toolName}`) to prevent collisions, and validates parameters with `schema.safeParse(...)` before invoking handlers.

5. **Off-Thread Web Worker Pipeline (`registerWorkerTask` & `runTask`)**
   - Offload heavy, CPU-intensive algorithms (geometry parsing, clustering, syntax analysis) to dedicated Web Workers.
   - Includes a two-way `EventBus` bridge allowing background tasks to stream progress updates directly to the UI without blocking the main event loop.

---

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
- **[User Guide & Manual](docs/USER_GUIDE.md)**: Comprehensive manual for writing, active recall, spatial whiteboarding, and vault management.
- **[Systems Architecture Specification](docs/ARCHITECTURE.md)**: In-depth technical specification of the micro-kernel, storage pipeline, and performance invariants.
- **[Keyboard Shortcuts Cheat Sheet](docs/KEYBOARD_SHORTCUTS.md)**: Quick reference for all hotkeys and commands.
- **[Plugin Developer Guide](docs/PLUGIN_GUIDE.md)**: Building, debugging, and distributing custom Flint extensions.
- **[Model Context Protocol (MCP) Setup](docs/mcp-setup-guide.md)**: Connecting Claude Desktop, Antigravity, and Cursor.
- **[Contributing Guidelines](docs/CONTRIBUTING.md)**: Code standards, setup, and pull request verification.

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
