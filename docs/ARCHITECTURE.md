# Flint Systems Architecture & Technical Specification

This document provides an exhaustive technical specification of Flint's systems engineering, internal micro-kernel design, dual-track storage engine, and platform runtime invariants.

---

## 1. Architectural Principles & Stack Overview

---

Flint pairs the durability of plain-text Markdown files with the fast query performance of an embedded database. To keep the codebase clean, fast, and modular, Flint organizes responsibilities across a **4-tier stack**:

| Architecture Tier | Core Technologies | Scope & Purpose |
| :--- | :--- | :--- |
| **Tier 1: Presentation & Workspace** | TipTap 2.x, ProseMirror, Force Graph, Canvas | Live Preview editing, force graph physics, infinite spatial boards |
| **Tier 2: Micro-Kernel & State** | Typed EventBus, Micro-Kernel Registries, Zustand | Decoupled pub/sub messaging, dynamic tool/view registration, state isolation |
| **Tier 3: Platform Bridge & Rust** | Tauri v2 Host, `rusqlite` (WAL/FTS5), Memory Optimizer | Compiled Rust core, atomic page transactions, RAM working set trimming |
| **Tier 4: Local Storage** | Plain Markdown (`.md`), `.flint/` Engine, `.trash/` | Plain text `.md` files, SQLite cache/FTS5 index, soft-delete safety folder |

---

## 2. Dual-Track Storage & Synchronization Pipeline

---

Flint keeps your notes as clean Markdown files on disk while maintaining a fast relational database for instant searches, backlinks, and graph queries. It does this through a concurrent **dual-track pipeline**:

| Track | Mechanism | Execution Pipeline |
| :--- | :--- | :--- |
| **Track A: Plain Markdown File** | Atomic Temp-and-Rename Writes | 1. Serialize Markdown AST<br />2. Write to `<file>.tmp.<pid>`<br />3. Atomic OS rename (`fs::rename`)<br />4. Record signature in `LAST_INTERNAL_WRITE` |
| **Track B: Relational SQLite Index** | Native `rusqlite` WAL Transactions | 1. Direct Tauri IPC dispatch to compiled Rust<br />2. Atomic page commit (WAL mode)<br />3. Update FTS5 BM25 virtual table & links<br />4. Emit `document:saved` on EventBus |

### Track A: Physical File Persistence
- **Active Buffer Protection**: Keystrokes update in-memory document state immediately. Active typing buffers are protected from background file reloads.
- **Debounced Saves**: File writes are debounced (300ms) to eliminate disk thrashing during fast typing bursts.
- **Safe Atomic Saves (Temp-and-Rename)**: Note changes write to a temporary file first (`<target>.tmp.<pid>`), then atomically replace the target file via OS primitives (`fs::rename`). This prevents file corruption if the application or computer suddenly loses power.
- **Echo Suppression (Write Timestamps)**: Before writing to disk, Flint records an internal write timestamp (`LAST_INTERNAL_WRITE`). The file watcher inspects this timestamp to ignore its own saves, preventing reload loops while immediately picking up external changes (e.g. Git checkouts).

### Track B: Relational Metadata & Query Index (`rusqlite`)
- **Direct Tauri IPC**: Extracted AST nodes, YAML frontmatter, tags, `[[wikilinks]]`, and `- [ ]` tasks serialize across Tauri IPC directly into compiled Rust.
- **Compiled Native SQLite**: Eliminates WebAssembly (`sql.js`) memory dumps and exports. Transactions commit page-level diffs directly to `flint.sqlite` and the Write-Ahead Log (`flint.sqlite-wal`) with `PRAGMA synchronous = NORMAL;` and 256MB memory mapping (`PRAGMA mmap_size = 268435456;`).
- **FTS5 Full-Text Retrieval**: Block-level tokenization with `unicode61 remove_diacritics 1` and BM25 relevance ranking keeps search responsive across tens of thousands of notes.

### Differential Synchronization (`file_manifest`)
- On startup, Flint compares filesystem modification timestamps (`mtime`), file sizes, and SHA-256 content hashes against the `file_manifest` table.
- Unchanged files skip AST re-parsing entirely, allowing cold-start vault validation to finish in milliseconds.

---

## 3. Strict Core Isolation (IoC Pattern)

---

To keep the codebase maintainable and prevent plugins from tangling with core logic, Flint enforces **strict core isolation**:

1. **Zero Extension Leakage**: Core directories (`src/core`, `src/lib`, `src/store`, `src/components`, `src/types`, `src/sdk`) must never import code, types, or models from extension folders (`src/extensions/*`).
2. **Universal SDK Surface**: Built-in features (Graph, Canvas, FSRS, Tasks, Journal, Backlinks) and community extensions build on the identical public Flint SDK (`src/sdk`).
3. **Inversion of Control (IoC) Registries**:
   - `SlotRegistry`: Dynamic React portal mounting into host layout slots (`workspace:root`, `editor:floating-toolbar`, `editor:minimap`).
   - `EditorRegistry`: Transaction-mapped ProseMirror plugins, input rules, and paste rules.
   - `ToolRegistry`: Model Context Protocol (MCP) AI tool registration with Zod validation.
   - `DatabaseManager`: Declarative SQLite table creation (`this.defineTable()`) with automated column diffing and cascade cleanup on note deletion.
   - `WorkerPool`: Off-thread Web Worker execution for heavy CPU-bound algorithms.

---

## 4. Live Preview Performance Engineering

---

TipTap 2.x and ProseMirror maintain a **sub-8ms input latency** on documents exceeding 100,000 words through explicit performance practices:

- **Incremental Decoration Mapping**: Instead of re-parsing whole-document ASTs on every keystroke, existing decorations are mapped across transaction steps using position arithmetic (`DecorationSet.map`).
- **Dirty-Range Re-scanning**: Only modified textblocks and immediate parent containers are re-scanned for inline markdown tokens, wikilinks, and syntax chips.
- **Formula Memoization**: KaTeX compilation HTML strings are cached in memory keyed by raw formula strings.
- **Bounded Undo History**: ProseMirror history depth is capped at 50 snapshots to prevent unbounded memory growth.

---

## 5. Host Runtime & Memory Optimization

---

Flint runs in a compiled native Rust container (Tauri v2) paired with WebView2 runtime optimizations:

- **Hardware Acceleration**: Leverages native DirectX and DirectComposition hardware acceleration for smooth 60 FPS rendering.
- **Working Set RAM Trimming**: When the user is idle for 120 seconds, the background host process invokes the Win32 API `SetProcessWorkingSetSize` across the WebView2 process tree, returning standby memory pages back to the operating system.

---

## 6. Standalone Model Context Protocol (MCP) Server

---

Flint includes an out-of-the-box stdio Model Context Protocol server (`bin/flint-mcp-server.cjs`):

- **Zero-Config Discovery**: Automatically discovers Hearth locations from system app data and recent vault registries.
- **JSON-RPC 2.0 Compliance**: Implements the official MCP specification for AI tool calling.
- **Direct Stdio Transport**: External AI assistants (Claude Desktop, Google Antigravity, Cursor) spawn the server process and communicate via standard input/output streams with sub-millisecond RPC execution.

---

## 7. Build & Verification Commands

---

```bash
# Verify TypeScript Types
npx tsc --noEmit

# Build Frontend Bundle
npm run build

# Run Tauri Native Desktop Development App
npm run app
```
