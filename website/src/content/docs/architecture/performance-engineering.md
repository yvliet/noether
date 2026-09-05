# Systems & Performance Engineering

Flint is engineered with explicit performance invariants designed to maintain fluid 60 FPS rendering, sub-8ms typing latency, and sub-150MB memory footprint even across vaults containing tens of thousands of notes.


## 1. Performance Invariants

---

| Subsystem | Optimization Strategy | Implementation Details |
| :--- | :--- | :--- |
| **Relational Indexing** | Compiled Native `rusqlite` | Direct Tauri IPC invocation to Rust SQLite; zero WASM overhead, zero whole-db exports, WAL journaling with 256MB memory-mapped I/O (`PRAGMA mmap_size = 268435456`). |
| **Full-Text Retrieval** | SQLite FTS5 Virtual Tables + BM25 | Block-level tokenization with `unicode61 remove_diacritics 1` and statistical BM25 ranking. |
| **Live Preview Editor** | Incremental Decoration Mapping | $O(1)$ transaction mapping (`DecorationSet.map`) rescans only dirty textblocks. KaTeX formulas memoize in RAM. Undo history is bounded to 50 snapshots. |
| **Hardware Compositing** | Native DirectX / DirectComposition | Dedicated GPU pipeline for tear-free 60 FPS workspace rendering and Canvas pan/zoom. |
| **Working Set Trimming** | Win32 Memory Trimming | Windows API `SetProcessWorkingSetSize` trims physical working set memory after 120s of idle time. |
| **Startup Differential Sync** | Manifest Tracking | `file_manifest` compares timestamps and hashes to skip AST re-indexing on unchanged notes. |
| **Echo Suppression** | Signature-Based Write Tracking | Records internal save signatures to prevent file watchers from triggering recursive reload loops. |
| **Instant UI Snappiness** | Zero Transition Delay | Micro-interactions execute instantly with zero artificial transition delays or visual smearing. |
