# Native Runtime & Platform Bridge

A comprehensive breakdown of Noether's desktop runtime layer, Tauri v2 IPC pipeline, crash-safe file persistence, and background memory management.

## 1. Native Desktop Architecture with Tauri v2
---

Rather than bundling a complete Chromium browser binary (which bloats app distribution packages to 150MB+ and demands 800MB+ idle RAM), Noether uses **Tauri v2** with a native compiled Rust backend.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Webview Frontend (React 19)                  │
│   TipTap Editor • Force Graph • Zustand Stores • Tailwind UI   │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Tauri IPC Commands
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Compiled Rust Backend (Tauri v2)              │
│   • rusqlite WAL Engine        • Crash-Safe Atomic Saves        │
│   • Asynchronous File Watcher  • Win32 Memory Trimmer           │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Direct OS Calls
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Local File System                         │
│   • Plain Text *.md Notes      • .noether/noether.sqlite        │
└─────────────────────────────────────────────────────────────────┘
```

The frontend interfaces with the operating system through strongly typed Tauri IPC commands declared in `src-tauri/src/commands/`.

## 2. Crash-Safe Atomic Persistence & 3-Tier Asynchronous Pipeline
---

A primary risk in local-first note-taking software is data corruption if power cuts out or the OS crashes during a write operation, paired with UI micro-stutters when persisting large documents. Noether eliminates both risks through a **temp-and-rename atomic save pipeline** combined with a **3-tier asynchronous state separation**:

### 3-Tier Asynchronous Pipeline
To keep typing responsive and prevent UI stutter, document mutations are split across three decoupled tiers:

1. **Tier 1 (Instant In-Memory Keystroke)**: Keystrokes mutate the local ProseMirror document state synchronously. Primitive status metrics (character count, word count) update immediately without touching secondary stores or triggering parent component re-renders.
2. **Tier 2 (Debounced Disk Flush & Content Cache, 400ms)**: When the user pauses typing for 400ms, the active buffer flushes to disk.
   - **Atomic Write to Temp**: Rust writes the serialized CommonMark content to a unique temporary file in the same directory: `<filename>.tmp.<pid>`.
   - **Atomic Rename (`fs::rename`)**: Once the write completes, the OS atomically replaces the destination file with the temp file. On POSIX and Windows filesystems, atomic renames guarantee that notes are never left truncated or corrupt.
   - **In-Place Store Patching**: During pure content edits, `saveDocumentById` updates the document's cached `content_json` and timestamp in place without creating a new `documents` array reference. This prevents cascading re-renders across the file tree, sidebars, breadcrumb headers, and editor frames.
3. **Tier 3 (Idle Secondary Indexing, 1200ms)**: Heavy analytical work (full-text search re-indexing, unlinked mention scanning across all vault notes, and broken embed validation) is deferred to idle time using a 1200ms debounced queue. The JavaScript main thread never pauses during rapid typing.

### Selector Decoupling for Native Responsiveness
In typical React state architectures, top-level components inadvertently subscribe to active document objects, re-rendering the entire viewport whenever a single character is typed. Noether eliminates these bottlenecks using strict primitive selectors:
- **AppShell & Window Title**: Subscribes exclusively to primitive strings (`activeDocId` and `activeDocTitle`) rather than the active document object. Typing inside the editor never triggers re-rendering of the application frame or navigation headers.
- **Status Bar**: Subscribes to boolean flags (`isLocked`, `hasActiveDoc`) and decoupled metric slices so typing never re-renders unrelated UI chrome.
- **Document Options Menu**: Extracted into an inert trigger button while closed. Store subscriptions, plugin action evaluations, and positioning calculations execute only when the menu dropdown is explicitly opened by the user.

## 3. Atomic File Saves & Echo Suppression
---

When Noether saves a note to disk, the operating system's filesystem watcher fires a change event. Without proper handling, this creates an infinite loop: save note → watcher detects change → reload note → re-save note.

Noether prevents this through signature-based echo suppression:
- **Timestamp Registration**: When an internal save occurs, the timestamp is registered in memory via `mark_internal_write()`.
- **Echo Suppression**: When the watcher fires, it compares the event timestamp against `LAST_INTERNAL_WRITE`. If the event originated from Noether's own save within the last 500ms, the reload is silently discarded.
- **External Change Detection**: If an external modification occurs (from Git, another editor, or a background script), Noether detects it, debounces the burst, and reloads the note in the editor without losing external changes.
- **Conflict Protection**: When the editor is actively focused, ProseMirror maintains sole authority over its active buffer, preventing cursor jumps or typing interruptions during background file sync.

## 4. Win32 Working Set Memory Trimming
---

Electron applications frequently consume 1GB to 2GB of RAM because Chromium holds onto cached garbage collection heaps indefinitely.

In Noether, after 120 seconds of user inactivity, the native Rust backend calls the operating system's memory management API (`SetProcessWorkingSetSize` on Windows). This flushes non-essential working set pages from physical RAM back to the operating system's standby pool, consistently keeping Noether's idle memory footprint under **150MB**. The moment you interact with the app again, the OS pages the required buffers back into memory smoothly.

## 5. Lossless Markdown Round-Trip & Source Mode Fidelity
---

A fundamental challenge in modern rich-text editors is the impedance mismatch between hierarchical ProseMirror ASTs and plain CommonMark text:
- ProseMirror models documents as an abstract, typed hierarchical tree.
- Markdown is a loose, human-authored text stream with arbitrary indentation, distinct list markers (`-`, `*`, `+`), YAML frontmatter comments, raw HTML tags, and multiline table formatting.

In standard TipTap-based implementations, naive round-trips (`Markdown → AST → Markdown`) systematically normalize and corrupt user files on disk: YAML comments vanish, bullet markers collapse into uniform dashes, multiline table cells get flattened into single-line spaces, and custom Markdown constructs degrade whenever an auto-save triggers.

Noether solves this through a multi-tier fidelity engine designed to protect physical Markdown integrity:

### Verbatim Raw Frontmatter Preservation
When you open a note containing YAML frontmatter, `parseFrontmatter` captures the exact raw frontmatter string (`_raw_frontmatter`) alongside parsed key-value metadata:
- **Zero Syntax Alteration**: YAML comments (`# Author notes`), custom multi-line indentation, folded scalars, and explicit YAML quote styles remain untouched.
- **Verbatim Serialization**: When writing back to disk, if properties were not structurally altered via the UI metadata inspector, `formatFrontmatter` re-emits the exact raw frontmatter block byte-for-byte instead of reconstructing synthetic YAML.

### AST List Marker Retention
Standard CommonMark serializers discard list bullet characters upon AST ingestion, defaulting to `-` for every item upon disk export. Noether preserves authored list markers through explicit node attributes:
- **Marker Extraction**: During parsing, `matchListItemLine` extracts the exact list marker (`-`, `*`, or `+`) and persists it into the list item's AST attributes (`attrs.marker`).
- **Targeted Serialization**: `jsonToMarkdown` inspects `li.attrs?.marker` when serializing bullet lists and task lists. Nested mixed-marker lists (`*` for top-level, `-` for sub-items) retain their original visual taxonomy on disk.

### Multiline Table Structure & Delimiter Escaping
Markdown pipe tables are notorious for mangling during AST conversions. Noether protects table cell integrity with delimiter normalization:
- **Multiline Cell Encoding**: Line breaks within table cells are converted to `<br>` tags during serialization (`replace(/\r?\n/g, '<br>')`) rather than collapsing into single-line spaces. Upon ingestion, `<br>` tags are converted into native `hardBreak` nodes, allowing multiline cell editing without breaking pipe table syntax.
- **Pipe Delimiter Escaping**: Literal pipe characters within cell text are automatically escaped (`\|`) during serialization and parsed cleanly via lookbehind splitters (`split(/(?<!\\)\|/)`), preventing column count corruption.

### Direct Plaintext Source Mode Disk Bypass
When editing in **Source Mode**, you are interacting directly with the raw Markdown buffer:
- **AST Serialization Bypass**: Keystrokes in Source Mode maintain a direct raw text ref (`pendingRawMarkdownRef`). When auto-save flushes, Noether pipes this raw string directly to the atomic save pipeline on disk via `rawMarkdownOverride`.
- **Zero Round-Trip Degradation**: Because disk writes completely bypass `jsonToMarkdown`, arbitrary Markdown extensions, custom indented code fences inside task lists, Setext headings, and raw HTML blocks never pass through AST normalization.
- **Asynchronous Search Indexing**: While disk writes remain 100% byte-for-byte identical to the raw textarea buffer, SQLite blocks and full-text search (FTS5) continue to update asynchronously in the background using the derived AST, preserving instant backlinks, tag indexing, and search capabilities without compromising file fidelity.

