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
To guarantee sub-8ms typing latency (matching native desktop editors like Notepad and Sublime Text), document mutations are split across three decoupled tiers:

1. **Tier 1 (Instant In-Memory Keystroke, 0ms)**: Keystrokes mutate the local ProseMirror document state synchronously. Primitive status metrics (character count, word count) update immediately without touching secondary stores or triggering parent component re-renders.
2. **Tier 2 (Debounced Disk Flush & Content Cache, 400ms)**: When the user pauses typing for 400ms, the active buffer flushes to disk.
   - **Atomic Write to Temp**: Rust writes the serialized CommonMark content to a unique temporary file in the same directory: `<filename>.tmp.<pid>`.
   - **Atomic Rename (`fs::rename`)**: Once the write completes, the OS atomically replaces the destination file with the temp file. On POSIX and Windows filesystems, atomic renames guarantee that notes are never left truncated or corrupt.
   - **In-Place Store Patching**: During pure content edits, `saveDocumentById` updates the document's cached `content_json` and timestamp in place without creating a new `documents` array reference. This prevents cascading re-renders across the file tree, sidebars, breadcrumb headers, and editor frames.
3. **Tier 3 (Idle Secondary Indexing, 1200ms)**: Heavy analytical work (full-text search re-indexing, unlinked mention scanning across all vault notes, and broken embed validation) is deferred to idle time using a 1200ms debounced queue. The JavaScript main thread never pauses during rapid typing.

### Selector Decoupling for Native Responsiveness
In typical React state architectures, top-level components inadvertently subscribe to active document objects, re-rendering the entire viewport whenever a single character is typed. Noether eliminates these bottlenecks using strict primitive selectors:
- **AppShell & Window Title**: Subscribes exclusively to primitive strings (`activeDocId` and `activeDocTitle`) rather than the active document object. Typing inside the editor never triggers re-rendering of the application frame or navigation headers.
- **Status Bar**: Subscribes to boolean flags (`isLocked`, `hasActiveDoc`) and decoupled metric slices, preserving 120+ FPS typing performance.
- **Document Options Menu**: Extracted into an inert trigger button while closed. Store subscriptions, plugin action evaluations, and positioning calculations execute only when the menu dropdown is explicitly opened by the user.

## 3. Deterministic File Watcher Fingerprinting & Conflict Safety
---

When Noether saves a note to disk, the operating system's filesystem watcher immediately generates file modification events. In naive architectures, applications attempt to suppress these save echoes using crude elapsed-time heuristics (such as discarding events within a fixed millisecond window). 

In local-first systems, time-window heuristics fail catastrophically under real-world conditions:
- **The Sync Collision Problem**: When a remote peer (via Syncthing, Dropbox, or iCloud) synchronizes an edit at the same moment the user types locally, a fixed time heuristic misclassifies the incoming sync as an internal echo and silently drops it, or overwrites the remote edit on the next debounce flush.
- **OS Watcher Drift**: Operating system event streams (macOS `FSEvents`, Windows `ReadDirectoryChangesW`, Linux `inotify`) lack deterministic dispatch timing. Under heavy disk load, macOS `FSEvents` routinely batches and delays notifications by 1 to 3 seconds, rendering hardcoded time thresholds useless.

Noether eliminates heuristics in favor of **per-path deterministic fingerprinting** and **conflict-safe buffer reconciliation**:

### Per-Path Write Fingerprint Registry (`xxh3_64`)
Whenever the native Rust backend persists a note through its atomic `temp-and-rename` pipeline, it computes a fast 64-bit non-cryptographic content hash (`xxh3_64`) of the persisted bytes and records a `WriteFingerprint` in an in-memory concurrent registry:

- **Path Canonicalization**: File paths are normalized and canonicalized (`canonical_key_path`) to prevent Windows case-sensitivity mismatches and UNC prefix variance.
- **Fingerprint Record**: Each entry captures `(file_size, xxh3_hash, recorded_at)`.
- **Zero Vault-Wide Blind Spots**: Fingerprints are scoped strictly per file path. Saving `NoteA.md` never blinds the watcher to changes occurring in `NoteB.md`.

### Echo Verification Pipeline
When the background filesystem watcher thread receives an OS notification:

1. **Path Filtering**: Directory-only notifications, vault root events, temporary swap files (`*.tmp.*`), and internal dotfolders (`.noether`, `.git`, `.trash`) are immediately filtered out.
2. **Fingerprint Match**: The watcher checks whether the affected path exists in the `WriteFingerprint` registry (registered immediately prior to atomic file rename).
   - If present, Noether verifies that the disk file matches the registered size and `xxh3_64` content hash. If identical, the event is verified as an internal save echo and silently suppressed.
   - If the file size or content hash differs by even a single byte, it is classified as a **genuine external modification**, regardless of when it arrived.
3. **Granular Path Emission**: External changes are coalesced over a 100ms window to batch multi-file operations (such as Git checkouts or batch Syncthing syncs) and emitted over the Tauri bridge with targeted relative paths:
   `handle_watcher.emit("vault-files-changed", json!({ "paths": verified_relative_paths }))`.

### Conflict-Safe Buffer Reconciliation
When external sync events arrive:

- **ProseMirror Authority**: When the editor is actively focused, ProseMirror maintains sole ground truth over its active buffer. Background reloads never invoke `setContent` while focused, preventing cursor resets, IME disruptions, or typing latency.
- **Selective Background Synchronization**: External changes for other notes or for the active note while unfocused reload the database and store models smoothly without tearing down the editor canvas or degrading active user flow.

## 4. Win32 Working Set Memory Trimming
---

Electron applications frequently consume 1GB to 2GB of RAM because Chromium holds onto cached garbage collection heaps indefinitely.

In Noether, after 120 seconds of user inactivity, the native Rust backend calls the operating system's memory management API (`SetProcessWorkingSetSize` on Windows). This flushes non-essential working set pages from physical RAM back to the operating system's standby pool, consistently keeping Noether's idle memory footprint under **150MB**. The moment you resume typing, the OS pages the required buffers back into memory in sub-millisecond time.

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

