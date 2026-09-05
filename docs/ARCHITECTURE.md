# Flint Systems Architecture & Technical Specification

This document provides an exhaustive technical specification of Flint's systems engineering, internal micro-kernel design, dual-track storage engine, and platform runtime invariants.

---

## 1. Architectural Principles & Stack Overview

Flint is engineered to resolve the tension between plain-text data sovereignty and relational query speed. It establishes an uncompromised separation of concerns across a **4-tier micro-kernel stack**:

| Architecture Tier | Core Technologies | Scope & Purpose |
| :--- | :--- | :--- |
| **Tier 1: Presentation & Workspace** | TipTap 2.x, ProseMirror, Force Graph, Canvas | Live Preview WYSIWYG, Euler graph physics, infinite spatial boards |
| **Tier 2: Micro-Kernel & IoC State** | Typed EventBus, Micro-Kernel Registries, Zustand | Decoupled pub/sub messaging, dynamic tool/view registration, state isolation |
| **Tier 3: Platform Bridge & Rust** | Tauri v2 Host, `rusqlite` (WAL/FTS5), Memory Optimizer | Compiled Rust core, atomic page transactions, RAM working set trimming |
| **Tier 4: Local Storage Ground Truth** | Authoritative Markdown, `.flint/` Engine, `.trash/` | Plain text `.md` files, SQLite cache/FTS5 index, soft-delete safety bin |

---

## 2. Dual-Track Storage & Synchronization Pipeline

Flint safeguards plain-text Markdown files while maintaining real-time relational graphs through a concurrent **dual-track storage pipeline**:

| Track | Mechanism | Execution Pipeline |
| :--- | :--- | :--- |
| **Track A: Physical Markdown File** | Atomic Temp-and-Rename Writes | 1. Serialize CommonMark AST<br />2. Write to `<file>.tmp.<pid>`<br />3. Atomic OS rename (`fs::rename`)<br />4. Record signature in `LAST_INTERNAL_WRITE` |
| **Track B: Relational SQLite Index** | Native `rusqlite` WAL Transactions | 1. Direct Tauri IPC dispatch to compiled Rust<br />2. Atomic page commit (WAL mode)<br />3. Update FTS5 BM25 virtual table & links<br />4. Emit `document:saved` on EventBus |

### Track A: Physical File Persistence
- **Active Buffer Protection**: Keystrokes mutate in-memory document state immediately. Active user typing buffers are shielded from disk watcher reloads.
- **Debounced Save Coordinator**: File writes are debounced (300ms) to eliminate disk I/O thrashing during fast typing bursts.
- **Atomic Temp-and-Rename Writes**: Changes write to an intermediate temporary file first (`<target>.tmp.<pid>`), then atomically replace the target file via operating system primitives (`fs::rename`). This guarantees zero file corruption during unexpected application crashes or power loss.
- **Deterministic Echo Suppression**: Before issuing disk writes, Flint records a write signature timestamp (`LAST_INTERNAL_WRITE`). The native filesystem watcher inspects this signature to suppress redundant reload events, preventing recursive feedback loops while instantly detecting external changes (e.g. Git checkouts).

### Track B: Relational Metadata & Query Index (`rusqlite`)
- **Direct Tauri IPC**: Extracted AST nodes, YAML frontmatter, tags, `[[wikilinks]]`, and `- [ ]` tasks serialize across Tauri IPC directly into compiled Rust.
- **Compiled Native SQLite**: Eliminates WebAssembly (`sql.js`) memory heap exports. Transactions commit page-level diffs directly to `flint.sqlite` and the Write-Ahead Log (`flint.sqlite-wal`) with `PRAGMA synchronous = NORMAL;` and 256MB memory mapping (`PRAGMA mmap_size = 268435456;`).
- **FTS5 Full-Text Retrieval**: Block-level tokenization with `unicode61 remove_diacritics 1` and statistical BM25 relevance ranking keeps search responsive across tens of thousands of notes.

### Differential Synchronization (`file_manifest`)
- On cold boot, Flint compares filesystem modification timestamps (`mtime`), sizes, and SHA-256 content hashes against the `file_manifest` table.
- Unchanged files skip AST re-tokenization entirely, enabling cold-boot vault revalidation in milliseconds.

---

## 3. Strict Native Core Isolation (IoC Pattern)

To ensure long-term architectural stability, Flint enforces **strict native core isolation**:

1. **Zero Extension Leakage**: Native core directories (`src/core`, `src/lib`, `src/store`, `src/components`, `src/types`, `src/sdk`) must never import code, types, or models from extension folders (`src/extensions/*`).
2. **Universal SDK Surface**: Core features (Graph, Canvas, FSRS, Tasks, Journal, Backlinks) and community extensions build on the identical public Flint SDK (`src/sdk`).
3. **Inversion of Control (IoC) Registries**:
   - `SlotRegistry`: Dynamic React portal mounting into host layout slots (`workspace:root`, `editor:floating-toolbar`, `editor:minimap`).
   - `EditorRegistry`: Transaction-mapped ProseMirror plugins, input rules, and paste rules.
   - `ToolRegistry`: Model Context Protocol (MCP) AI tool registration with Zod validation.
   - `DatabaseManager`: Declarative SQLite table creation (`this.defineTable()`) with automated column diffing and cascade cleanup on document deletion.
   - `WorkerPool`: Off-thread Web Worker execution for heavy CPU-bound algorithms.

---

## 4. Live Preview Performance Engineering

TipTap 2.x and ProseMirror maintain a **sub-8ms input latency** on documents exceeding 100,000 words through explicit systems invariants:

- **Incremental Decoration Mapping**: Instead of re-parsing whole-document ASTs on every keystroke, existing decorations are mapped across transaction steps using $O(1)$ position arithmetic (`DecorationSet.map`).
- **Dirty-Range Re-scanning**: Only modified textblocks and immediate parent containers are re-scanned for inline markdown tokens, wikilinks, and syntax chips.
- **Formula Memoization**: KaTeX compilation HTML strings are cached in an LRU memory store keyed by raw formula strings.
- **Bounded Undo History**: ProseMirror history depth is capped at 50 snapshots to prevent unbounded heap memory growth.

---

## 5. Host Runtime & Memory Working Set Optimization

Flint runs in a compiled native Rust container (Tauri v2) paired with Windows WebView2 runtime optimizations:

- **Native Hardware Compositing**: Leverages native DirectX and DirectComposition hardware acceleration for smooth 60 FPS rendering.
- **Working Set RAM Trimming**: When the user is verified idle for 120 seconds, the background host process optimizer invokes the Win32 API `SetProcessWorkingSetSize` across the WebView2 process tree, purging standby memory pages back to the operating system.

---

## 6. Standalone Model Context Protocol (MCP) Server

Flint includes an out-of-the-box stdio Model Context Protocol server (`bin/flint-mcp-server.cjs`):

- **Zero-Config Auto-Discovery**: Automatically resolves Hearth locations from system app data and recent vault registries.
- **JSON-RPC 2.0 Compliance**: Implements the official MCP 2024-11-05 specification for AI tool calling.
- **Direct Stdio Transport**: External AI assistants (Claude Desktop, Google Antigravity, Cursor) spawn the server process and communicate via standard input/output streams with sub-millisecond RPC execution.

---

## 7. Build & Verification Commands

```bash
# Verify Zero TypeScript Type Regressions
npx tsc --noEmit

# Build Frontend Bundle
npm run build

# Run Tauri Native Desktop Development App
npm run app
```
