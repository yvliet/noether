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

## 2. Crash-Safe Atomic File Persistence
---

A primary risk in local-first note-taking software is data corruption if power cuts out or the OS crashes during a write operation. Noether prevents this via a **temp-and-rename atomic save pipeline**:

1. **Serialize**: When you finish typing, the active ProseMirror document state serializes to CommonMark.
2. **Debounce (300ms)**: Writes wait 300ms after your last keystroke to avoid thrashing disk I/O while you are in flow.
3. **Write to Temp**: Rust writes the content to a unique temporary file in the same directory: `<filename>.tmp.<pid>`.
4. **Atomic Rename (`fs::rename`)**: Once the write completes and flushes, the OS atomically replaces the destination file with the temp file. On POSIX and Windows filesystems, atomic renames guarantee that your note is never left truncated or corrupt.
5. **Timestamp Recording**: Noether records an internal write timestamp (`LAST_INTERNAL_WRITE`) immediately upon saving.

## 3. File Watcher Echo Suppression
---

When Noether saves a note to disk, the operating system's filesystem watcher immediately generates a file-modification event. Without proper protection, this creates an **infinite reload loop** where the application constantly re-reads the file it just wrote, clobbering the user's cursor position.

Noether prevents this through signature-based echo suppression:
- When an internal save occurs, the timestamp and target file path are registered in memory.
- When the watcher fires, it compares the event timestamp against `LAST_INTERNAL_WRITE`.
- If the event originated from Noether's own save within the last 500ms, the reload is silently discarded.
- If an external modification occurs (e.g. from Git, another editor, or an external script), Noether immediately detects it and reloads the note in the editor without losing external changes.

## 4. Win32 Working Set Memory Trimming
---

Electron applications frequently consume 1GB to 2GB of RAM because Chromium holds onto cached garbage collection heaps indefinitely.

In Noether, after 120 seconds of user inactivity, the native Rust backend calls the operating system's memory management API (`SetProcessWorkingSetSize` on Windows). This flushes non-essential working set pages from physical RAM back to the operating system's standby pool, consistently keeping Noether's idle memory footprint under **150MB**. The moment you resume typing, the OS pages the required buffers back into memory in sub-millisecond time.
