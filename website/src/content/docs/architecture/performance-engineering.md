# Systems & Performance Architecture

Noether is designed to handle vaults with thousands of notes without stuttering, high CPU usage, or runaway memory growth. Rather than adding complex caching layers after the fact, performance comes from a few straightforward architecture decisions: keeping the UI thread decoupled from disk I/O, streaming metadata on launch instead of whole files, and stopping background loops when they aren't visible.

## 1. The 3-Tier Persistence Pipeline

---

Typing latency is the quickest way to make a text editor feel sluggish. If an editor serializes Markdown ASTs and writes to disk or SQLite on every single keystroke, the UI thread will inevitably drop frames.

Noether separates typing from persistence into three tiers:

1. **In-Memory Mutation (Instant)**: Keystrokes mutate the in-memory document state immediately. No disk operations or database queries run while you are actively typing.
2. **Debounced Disk Write (300ms)**: When you stop typing for 300ms, the editor serializes the active note to CommonMark and writes it to disk using an atomic temp-file rename (`.noether-tmp-*` → `note.md`).
3. **Background SQLite Indexing**: After the file is on disk, an AST tokenizer extracts frontmatter, `[[wikilinks]]`, tags, and headings, updating the SQLite relational index in a single background transaction.

## 2. Cold Boot & Startup IPC Streaming

---

When opening a large vault, reading every single note off disk and sending it across the Tauri IPC bridge causes significant startup lag.

Noether splits startup into two stages:

1. **Metadata-Only Boot**: On launch, the backend only queries note headers (`id`, `title`, `path`, `parent_id`, `mtime`, `is_folder`). This payload is small and loads in a few milliseconds.
2. **On-Demand Note Bodies**: The full content of a note is read from disk only when you actually click or switch to that tab. Notes you haven't opened yet consume zero memory in the UI.

## 3. SQLite Relational Cache & WAL Mode

---

Instead of running SQLite inside WebAssembly (which requires exporting the entire database to a binary blob on save), Noether compiles `rusqlite` directly into the native Rust desktop binary.

Key database configurations include:
- **Write-Ahead Logging (`PRAGMA journal_mode = WAL;`)**: Reads and writes never block each other. Background indexing never stalls active search queries.
- **Memory-Mapped I/O (`PRAGMA mmap_size = 268435456;`)**: 256MB of the database file is mapped directly into memory, allowing the operating system to handle page caching with zero user-space copying.
- **FTS5 with BM25 Ranking**: Search queries run against an inverted full-text index rather than executing unindexed `LIKE '%query%'` wildcard scans across every file.

## 4. Virtual DOM & Hook Isolation

---

### Conditional Dialog Mounting (`GlobalModalHost`)
In typical React apps, complex overlays like the Settings dialog, Command Palette, and Vault Switcher remain mounted continuously in the component tree, evaluating hooks and state subscriptions even while hidden.

In Noether, all global dialogs are wrapped in `GlobalModalHost` and only mount when their visibility flag is `true`. When closed, zero hooks run, zero DOM nodes exist, and zero state updates are dispatched to them:

```tsx
const GlobalModalHost: React.FC = React.memo(() => {
  const isCommandPaletteOpen = useWorkspaceStore((s) => s.isCommandPaletteOpen);
  const isSettingsOpen = useWorkspaceStore((s) => s.isSettingsOpen);
  const isVaultModalOpen = useWorkspaceStore((s) => s.isVaultModalOpen);
  const isHelpModalOpen = useWorkspaceStore((s) => s.isHelpModalOpen);
  const isConfirmOpen = useWorkspaceStore((s) => Boolean(s.confirmDialog?.isOpen));
  const isPromptOpen = useWorkspaceStore((s) => Boolean(s.inputDialog?.isOpen));
  const isLightboxOpen = useWorkspaceStore((s) => Boolean(s.imageLightbox?.isOpen));
  const isUpdateModalOpen = useWorkspaceStore((s) => s.isUpdateModalOpen);

  return (
    <React.Suspense fallback={null}>
      {isCommandPaletteOpen && <CommandPalette />}
      <DynamicModalHost />
      {isSettingsOpen && <SettingsModal />}
      {isVaultModalOpen && <VaultModal />}
      {isHelpModalOpen && <HelpModal />}
      {isConfirmOpen && <ConfirmModal />}
      {isPromptOpen && <PromptModal />}
      {isLightboxOpen && <ImageLightboxModal />}
      {isUpdateModalOpen && <UpdateModal />}
    </React.Suspense>
  );
});
```

### File Tree Child Bucketing
Iterating over an entire vault's file list to find the children of each folder has $O(N \times F)$ complexity (where $N$ is notes and $F$ is folders). In a large vault, that means hundreds of thousands of comparisons on every tree render.

The sidebar groups documents into a parent-keyed `Map<string | null, DocumentItem[]>` once at the root:

```ts
const childrenMap = useMemo(() => {
  const map = new Map<string | null, DocumentItem[]>();
  for (const d of documents) {
    const p = d.parent_id || null;
    const list = map.get(p);
    if (list) {
      list.push(d);
    } else {
      map.set(p, [d]);
    }
  }
  return map;
}, [documents]);
```

Each folder node performs a single $O(1)$ map lookup (`childrenMap.get(folderId)`) to retrieve its immediate children.

## 5. Universal View Suspension & Zero-CPU Backgrounding

---

Continuous visual simulations like the 2D force-directed Graph View, infinite Canvas, or custom WebGL extensions can quickly drain battery and burn GPU cycles if left running in background tabs or minimized windows.

Rather than relying on ad-hoc timers in each individual component, Noether coordinates background efficiency through a unified system:

- **Universal `useViewSuspension` Hook**: Monitors 5 distinct lifecycle channels simultaneously (Tauri native window minimize, document visibility, OS blur and focus via `document.hasFocus()`, `IntersectionObserver` viewport culling, and workspace pane switching).
- **GPU Containment & Paint Isolation**: Suspended containers receive `contain: content`, instructing Chromium to skip reflow and repaint passes while preserving the static rasterized backing store required for crisp Windows DWM taskbar hover previews.
- **Global CSS Animation Freezing**: When the app is minimized or backgrounded, `data-app-suspended="true"` pauses all CSS keyframe animations (`animation-play-state: paused !important`), eliminating compositor thread wakeups.
- **Single-Click Window Activation**: Mouse hit-testing remains active so clicking an unfocused window immediately activates and registers the clicked target without needing an extra focus click.
- **Background Sync Throttling**: The sync engine skips periodic background polling cycles while the window is hidden, triggering an instant catch-up sync the moment the window is restored.

## 6. Native Win32 Working Set Memory Reclamation

---

On Windows, Chromium-based desktop applications tend to retain memory pages in their working set long after intensive tasks (such as cold-boot vault scanning or full-text indexing) have completed.

To maintain a lightweight desktop footprint without causing UI stalls, Noether uses a two-tier memory reclamation strategy:

1. **Instant Minimize Reclamation**: When the native window is minimized, the Rust backend invokes `SetProcessWorkingSetSize(GetCurrentProcess(), usize::MAX, usize::MAX)`, prompting the OS to flush unreferenced working set pages to the standby pool.
2. **Debounced 5-Second Idle Reclamation**: When the application loses focus or transitions to the background, the platform adapter starts a 5-second debounce timer before calling memory trimming. If you Alt-Tab back or glance at the app before 5 seconds elapse, the timer cancels immediately, completely preventing memory paging churn.
