# Noether Architecture

A pragmatic look at how Noether works under the hood: how we keep plain Markdown files fast and durable, our SQLite indexing strategy, and how our extension system stays out of the way of core performance.

---

## 1. Stack Overview

---

Noether pairs the durability of plain-text Markdown files with the speed of an embedded database. To keep the codebase clean and modular, responsibilities are split across four layers:

| Layer | Technologies | What It Does |
| :--- | :--- | :--- |
| **UI & Workspace** | TipTap 2.x, ProseMirror, Force Graph, Canvas | Live Preview editor, force graph, freeform visual canvas |
| **State & Extensions** | Typed EventBus, Extension Registries, Zustand | Event dispatching, extension registries, and UI state |
| **Rust & Platform Bridge** | Tauri v2, `rusqlite` (WAL/FTS5), Memory Trimmer | Native backend, SQLite transactions, and idle memory trimming |
| **Storage on Disk** | Plain Markdown (`.md`), `.noether/`, `.trash/` | Your notes on disk, local SQLite index, and recovery trash folder |

---

## 2. Storage & Sync: Files on Disk + SQLite Index

---

Noether keeps your notes as clean Markdown files on disk while maintaining a fast relational database for instant searches, backlinks, and graph queries. Every save updates both in parallel:

| Target | Mechanism | How It Executes |
| :--- | :--- | :--- |
| **Plain Markdown File** | Safe Temp-and-Rename Writes | 1. Serialize editor state to Markdown<br />2. Write to `<file>.tmp.<pid>`<br />3. Atomically rename into place (`fs::rename`)<br />4. Record write timestamp |
| **Relational SQLite Index** | Native `rusqlite` WAL Transactions | 1. Send extracted metadata over Tauri IPC to Rust<br />2. Commit transaction to SQLite WAL<br />3. Update FTS5 search index and backlinks<br />4. Emit `document:saved` on EventBus |

### Saving Plain Markdown Files
- **Active buffer protection**: Keystrokes update memory immediately. The active note you are editing is protected from being overwritten by background file reloads.
- **Debounced saves (300ms)**: Writes wait 300ms after you stop typing to avoid hammering the disk while you write.
- **Crash-safe atomic saves**: Noether writes note changes to a temporary file first (`<target>.tmp.<pid>`), then renames it over the target file. If power cuts out mid-save, your original note is never left corrupted or half-written.
- **Ignoring our own saves**: Before writing to disk, Noether records an internal write timestamp (`LAST_INTERNAL_WRITE`). When the file watcher notices a change, it checks this timestamp to avoid reloading a file Noether just saved, while still catching external edits (like Git branches or external editors) right away.

### Fast Search & Relational Index (`rusqlite`)
- **Native Rust SQLite over Tauri IPC**: Extracted frontmatter, tags, `[[wikilinks]]`, and tasks are sent directly to compiled Rust. Running SQLite natively eliminates sluggish WebAssembly exports and RAM dumps.
- **WAL Mode & Memory Mapping**: Transactions write directly to `noether.sqlite` with WAL mode and memory-mapped I/O, keeping read and write operations concurrent and fast.
- **Instant full-text search (FTS5)**: SQLite's FTS5 engine handles full-text search with BM25 ranking and automatic diacritics removal, so searching 20,000+ notes feels instant.

### Fast Vault Startup Scanning
- On startup, Noether compares file timestamps, sizes, and content hashes against the `file_manifest` table.
- Unchanged files skip re-parsing completely, so opening even large vaults takes just a few milliseconds.

---

## 3. Keeping Core Code Clean & Modular

---

To keep the codebase maintainable and prevent extensions from tangling with core editor logic, Noether enforces clear boundaries:

1. **No extension imports in core**: Core folders (`src/core`, `src/lib`, `src/store`, `src/components`, `src/types`, `src/sdk`) never import anything from `src/extensions/*`. Core knows nothing about specific extensions.
2. **Built-ins use the public SDK**: Built-in features (Graph, Canvas, Tasks, Flashcards) use the exact same Noether SDK (`src/sdk`) that community extensions use.
3. **Extension Registries**: Extensions plug into the application through dedicated registries:
   - `SlotRegistry`: Mounts React UI into designated layout slots (toolbars, minimap, modals).
   - `EditorRegistry`: Adds ProseMirror decorations, keyboard shortcuts, and input rules.
   - `ToolRegistry`: Exposes AI tools to MCP with typed Zod schemas.
   - `DatabaseManager`: Creates custom SQLite tables with automatic column migrations and cascade cleanup on note deletion.
   - `WorkerPool`: Runs heavy background calculations in Web Workers without stalling UI typing.

---

## 4. Editor Performance on Large Notes (100k+ Words)

---

Typing in a note should always feel instantaneous. To keep input latency under 8ms even on massive documents, we avoid common editor bottlenecks:

- **Map decorations instead of reparsing**: When you type, ProseMirror maps existing syntax chips and highlights forward with position math (`DecorationSet.map`) rather than re-parsing the whole document.
- **Only scan changed paragraphs**: Noether only checks modified blocks and their immediate parents for wikilinks and markdown tokens.
- **Cache KaTeX formulas**: Rendered math equations are memoized in memory so the editor doesn't recompile unchanged formulas on every keystroke.
- **Cap undo history**: History depth is capped at 50 snapshots so undo stacks never leak memory.

---

## 5. Desktop Runtime & Memory Usage

---

Noether runs as a lightweight native desktop app via Tauri v2, using the OS webview rather than bundling a full copy of Chromium:

- **Hardware acceleration**: GPU acceleration is enabled for smooth canvas panning and graph physics.
- **Idle memory cleanup**: When Noether sits idle for two minutes, Rust triggers an OS-level working set trim on the webview process tree, releasing standby RAM back to your system.

---

## 6. Built-in MCP Server for AI Assistants

---

Noether includes a lightweight stdio server script (`bin/noether-mcp-server.cjs`) that lets AI assistants interact directly with your notes:

- **Finds vaults automatically**: Reads recent vault locations from your local app data so you don't need manual path configuration.
- **Standard MCP protocol**: Speaks standard JSON-RPC over stdio, compatible with Claude Desktop, Cursor, and Antigravity.
- **Fast local execution**: Tool calls run locally against your SQLite index and markdown files with sub-millisecond response times.

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
