# Systems & Performance Engineering

Noether is engineered with explicit performance invariants designed to maintain fluid 60 FPS rendering, sub-8ms typing latency, and sub-150MB memory footprint even across vaults containing tens of thousands of notes. Plain Markdown files on your local drive act as the single source of truth, backed by an embedded SQLite relational index for instant search, backlinks, and graph traversals.

## 1. Performance Invariants Matrix

---

| Subsystem | Optimization Strategy | Implementation Details |
| :--- | :--- | :--- |
| **Relational Indexing** | Compiled Native `rusqlite` | Direct Tauri IPC invocation to Rust SQLite; zero WASM overhead, zero whole-db exports, WAL journaling with 256MB memory-mapped I/O (`PRAGMA mmap_size = 268435456`). |
| **Full-Text Retrieval** | SQLite FTS5 Virtual Tables + BM25 | Block-level tokenization with `unicode61 remove_diacritics 1` and statistical BM25 ranking. |
| **Covering Indexing** | Composite Index `idx_blocks_doc_order` | `(document_id, order_index)` covering index enables single-pass, zero-sort block streaming during note open and export. |
| **Tree Traversal** | $O(1)$ Parent-Keyed Child Bucketing | Replaces $O(N \times F)$ linear filtering with pre-grouped `Map<string | null, DocumentItem[]>` lookups. |
| **Modal Lifecycle** | Conditional Deferred Mounting | `GlobalModalHost` mounts heavy dialogs (Command Palette, Settings, Lightbox) only when opened, freeing 100% of idle hook compute. |
| **Live Preview Editor** | Incremental Decoration Mapping | $O(1)$ transaction mapping (`DecorationSet.map`) rescans only dirty textblocks. KaTeX formulas memoize in RAM. Undo history is bounded to 50 snapshots. |
| **Hardware Compositing** | Native DirectX / DirectComposition | Dedicated GPU pipeline for tear-free 60 FPS workspace rendering and Canvas pan/zoom. |
| **Working Set Trimming** | Win32 Memory Trimming | Windows API `SetProcessWorkingSetSize` trims physical working set memory after 120s of idle time. |
| **Startup Differential Sync** | Manifest Tracking | `file_manifest` compares timestamps and hashes to skip AST re-indexing on untouched notes. |
| **Echo Suppression** | Signature-Based Write Tracking | Records internal save signatures to prevent file watchers from triggering recursive reload loops. |
| **Native Desktop Feel** | Zero Decorative Delays | UI controls (menus, toggles, buttons, breadcrumbs) respond immediately without sluggish fade or slide transitions. |

## 2. React Lifecycle & Virtual DOM Optimization

---

### Conditional Modal Mounting (`GlobalModalHost`)
Desktop productivity apps frequently include numerous complex overlays: the Command Palette, Settings dialog, Vault Switcher, Image Lightbox, and Confirmation prompts. In standard React architectures, mounting these components continuously inside a static `<Suspense>` tree forces them to register Zustand store subscriptions, initialize input references, and evaluate filter pipelines even when closed.

Noether isolates all global dialogs within a specialized `GlobalModalHost`. Each modal is gated by its boolean activation flag:

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

When closed, zero React hooks execute, zero DOM nodes are generated, and zero state subscriptions receive update dispatches.

### File Tree Child Bucketing & Tab Decoupling
In large knowledge bases, hierarchical navigation trees can easily become performance bottlenecks. Naive tree rendering filters the entire document list repeatedly for every directory node:

$$\text{Time Complexity} = O(N \times F)$$

Where $N$ is total documents and $F$ is folder count. For a vault with 5,000 files across 200 folders, every state update triggers 1,000,000 comparison operations.

Noether eliminates this scaling bottleneck by bucketing child nodes into a parent-keyed hash map at the sidebar root:

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

Each `FileTreeNode` queries its immediate children with a single $O(1)$ lookup (`childrenMap.get(item.id)`). Furthermore, tree nodes decouple from workspace-level `tabs` arrays, subscribing solely to their own activation state to prevent whole-tree re-renders on tab switching.

## 3. Relational Query Optimization & IPC Safety

---

### Eliminating Full-Table Scans on Zero Matches
When calculating unlinked mentions across documents, full-text search indexes provide sub-millisecond candidate lookup. However, an unindexed fallback scan over the raw `blocks` table (`WHERE content_text LIKE '%' || ? || '%'`) introduces a severe performance trap: whenever a note has zero unlinked mentions (the most common scenario), SQLite executes an exhaustive substring search across every block in the vault.

Noether enforces strict index discipline: candidate mentions rely entirely on the FTS5 tokenizer and Porter/Unicode stemmers. Unindexed wildcard scans are prohibited, guaranteeing predictable query latency regardless of database volume.

### In-Memory Document Resolution for Path Operations
Document mutations such as title updates, parent folder moves, and trash batching require computing filesystem paths and descendant relationships. Rather than querying `SELECT id, parent_id, title FROM documents` across the Tauri IPC bridge for every file modification, Noether queries the in-memory Zustand store first:

```ts
async function getCachedOrDbDocs(providedDocs?: DocumentItem[]) {
  if (providedDocs && providedDocs.length > 0) return providedDocs;
  try {
    const { useDocumentStore } = await import('@/store/documentStore');
    const storeDocs = useDocumentStore.getState().documents;
    if (storeDocs && storeDocs.length > 0) return storeDocs;
  } catch {}
  return await dbAdapter.query<DocumentItem>(`SELECT id, parent_id, title, is_folder FROM documents`);
}
```

This strategy reduces IPC overhead for common filesystem operations from multiple IPC round-trips to zero.

### Composite Covering Indexes
For block reading and streaming during note open, Noether uses a composite covering index:

```sql
CREATE INDEX IF NOT EXISTS idx_blocks_doc_order ON blocks(document_id, order_index);
```

Because both `document_id` and `order_index` are covered directly in the B-Tree index, queries of the form `SELECT * FROM blocks WHERE document_id = ? ORDER BY order_index ASC` bypass table sorting entirely, returning rows in native index order.

## 4. Native Desktop Responsiveness Invariant

---

Modern web applications frequently apply CSS transitions (`transition: all 150ms ease`, `fade-in`, `zoom-in`) to common desktop controls like buttons, dropdowns, modal dialogs, and tree nodes. While visually forgiving on sluggish web pages, artificial animation delays introduce perceptible input latency that makes a desktop application feel heavy and unresponsive.

Noether strictly forbids decorative transitions on interactive controls:
- **Instant Toggles**: Checkboxes, switches, and radio controls change state immediately upon click.
- **Immediate Menus**: Context menus and dropdowns mount and display on the exact frame the mouse button is pressed.
- **Snappy Hovers**: Hover highlights apply instantly without color fade smoothing.
- **Continuous Physics Exemption**: High-framerate physics simulations (such as Graph View force-directed layout and Canvas infinite canvas navigation) retain mathematical kinematic easing where continuous spatial interpolation is required.

## 5. Verification & Benchmark Targets

---

Every release candidate is tested against strict automated performance gates:

- **Input Latency**: Sub-8ms keydown-to-render turnaround during sustained continuous typing.
- **Idle Memory**: Sub-150MB working set on launch, settling below 100MB after Win32 memory trimming.
- **Vault Indexing**: Less than 1.5 seconds to scan and differential-sync a 10,000-note vault on cold start.
- **Type Safety**: Clean compilation with zero warnings via `npx tsc --noEmit` and `cargo check`.
