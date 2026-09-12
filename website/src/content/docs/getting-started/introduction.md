# Introduction to Noether

It was one evening on August 25, 2026 (25/08/2026), when I decided that I needed a dedicated place to store my life. I wanted a personal knowledge base where my thoughts, notes, and context could live in one sovereign place, so I didn't have to re-explain who I was or what I was doing every single time I talked to an AI.

At first I thought, *“Obsidian is there.”*

> [!QUOTE]
> “Nah, I don't want to use Obsidian. It seems way too complicated and... too intimidating.”

And thus, I made Noether as a fun project born out of that thought. I set out to make something lighter, much more modular than Obsidian, and delightfully easy to use. Beyond raw speed, I craved a significantly cleaner UI: zero visual clutter, balanced spacing that makes scanning effortless, and a refined user experience where every tool feels immediately intuitive without getting lost in the settings page (real experience, by the way).

That modularity goes deeper than just toggling features on and off. In Noether, extensions build directly on standard host design tokens and shared UI primitives, so custom extensions look and feel truly native from day one. They don't break or visually clash when you switch themes, and the app never turns into that chaotic, messy patchwork of outdated styles that often plagues Obsidian setups. Pairing plain Markdown files on disk with instant desktop responsiveness, clean relational SQLite indexing, and native Model Context Protocol (MCP) AI tooling created the ideal space: a calm, cohesive, clutter-free workspace that respects your attention.


## 1. Core Philosophy: Local-First & Sovereign Data

---

Traditional cloud-based knowledge management tools store notes on remote servers behind proprietary database schemas and authentication walls. When servers experience downtime, network connectivity drops, or vendors change their pricing tiers, access to personal thinking and company archives is compromised.

Noether adheres strictly to the **Local-First Software principles**:

- **Plain Markdown Files on Disk**: Every document in Noether exists as an ordinary, human-readable `.md` file on your local storage drive. You can open, edit, index, or grep your notes using VS Code, Obsidian, Vim, or standard UNIX terminal utilities without running Noether.
- **Zero Cloud Lock-in**: Your data is yours forever. There are no mandatory user accounts, proprietary binary encodings, or telemetry tracking your keystrokes.
- **Instantaneous Offline Operation**: All computations run locally on your device with zero network round-trips, including graph physics, full-text search, Wikilink resolution, and spaced-repetition card scheduling.
- **Git & Sync Neutrality**: Because your Vault consists of standard text files and lightweight configuration JSON, you can synchronize your notes across machines using Git, Syncthing, iCloud Drive, Dropbox, or any file synchronization system of your choice.


## 2. The "Vault" Concept

---

In Noether, individual workspaces or note vaults are called **Vaults**.

A Vault is simply any standard folder on your filesystem that you designate as a Noether workspace. When you open or create a Vault, Noether establishes a hidden `.noether/` directory within that root folder to store local workspace state:

```
My-Knowledge-Base/             ← Vault Root Directory
├── .noether/                   ← Local Workspace Metadata & Cache
│   ├── noether.sqlite          ← Embedded native SQLite relational & FTS5 engine
│   ├── noether.sqlite-wal      ← SQLite Write-Ahead Log journal
│   ├── settings.json         ← Vault-specific settings & toggles
│   └── extensions/           ← Community and custom extensions
│       └── word-counter/
│           ├── manifest.json
│           └── main.js
├── Projects/
│   ├── Architecture.md
│   └── Q3 Objectives.md
├── Journal/
│   └── 2026-09-05.md
└── Index.md
```

### Multi-Vault Agility

Noether is engineered for effortless multi-workspace management:
- **Instant Workspace Switching**: Switch between personal, research, and work Vaults in milliseconds without restarting the desktop application.
- **Cross-Vault Auto-Discovery**: The application and its integrated AI agent runtime track all recent Vaults on your system, allowing global discovery and cross-workspace search without manual path re-configuration.


## 3. Dual-Storage & Embedded SQLite Engine

---

A frequent trade-off in note-taking software lies between **file transparency** and **query performance**:
1. Storing data solely as raw files makes complex relational queries (such as bidirectional backlinks, tag hierarchies, and recursive graph algorithms) slow, requiring intensive disk I/O scans on large collections.
2. Storing data exclusively in a database loses the benefits of simple text files, version control readability, and third-party editor compatibility.

Noether resolves this tension through a **Dual-Storage Architecture**:

```
[ Physical Filesystem ]
  Markdown Documents (*.md) + YAML Frontmatter Properties
  │
  │  Two-Way Sync & Echo-Suppressed File Watcher
  ▼
[ Noether Core Engine ]
  TipTap/ProseMirror Live Preview + AST Parser + EventBus
  │
  │  Continuous Transaction Indexing (Tauri IPC)
  ▼
[ Embedded SQLite Engine ]
  Native SQLite (Tauri/WAL rusqlite)
  • documents: file metadata & hierarchy
  • document_links: Wikilink graph edges
  • document_tags: indexed tag taxonomies
  • blocks_fts: SQLite FTS5 BM25 full-text index
```

- **Source of Truth**: The `.md` markdown files on your drive remain the immutable source of truth.
- **Query Accelerator**: An embedded SQLite database (`.noether/noether.sqlite`) maintains a real-time relational model of note titles, forward links, backlinks, tags, properties, and full-text search tokens.
- **Engine Implementation**: Noether communicates with a native compiled SQLite engine running in Rust via Tauri IPC. Transactions use Write-Ahead Logging (WAL) mode for atomic, sub-millisecond commits without WebAssembly memory overhead.


## 4. Native Extensibility & AI Copilot Integration

---

Noether is structured as a **micro-kernel**: internal core features and external community extensions share the identical extension runtime.

- **Unified Extension Model**: Features like Graph View, Infinite Canvas, FSRS Spaced-Repetition Flashcards, Task Management, Daily Notes, and Backlinks are all constructed using the Noether Extension SDK (`src/sdk`).
- **Zero Native Core Leakage**: Host application internals remain strictly decoupled from extensions. Extensions interact through declared Inversion of Control (IoC) registries and an asynchronous typed `EventBus`.
- **First-Class Model Context Protocol (MCP)**: Every extension can register structured AI tools and prompts via `this.registerTool()`. External AI coding assistants (Claude Desktop, Cursor, Antigravity) and in-app agent copilots can immediately query your notes, execute tasks, and trigger actions with zero configuration.


## 5. Next Steps

---

Ready to dive in?
- [[Installation & Setup]]: Download the desktop application or build from source.
- [[Live Preview Editor & Markdown]]: Master TipTap/ProseMirror editing, formulas, and tables.
- [[Links, Backlinks & Graph]]: Build your second brain with bidirectional links and graph physics.
- [[Infinite 2D Spatial Canvas]]: Explore non-linear visual whiteboarding and mindmaps.
- [[FSRS Spaced Repetition]]: Supercharge memory retention with embedded active recall cards.
- [[Tasks Dashboard & Journal]]: Organize vault-wide tasks and daily scratchpads.
- [[AI Assistants & MCP Tools]]: Connect Claude Desktop, Antigravity, and Cursor via MCP.
- [[Dual-Storage Architecture]]: Deep-dive into file synchronization and SQLite schemas.
- [[Micro-Kernel & Extension Architecture]]: Understand core isolation and extension runtimes.
- [[Extension Quick Start]]: Build your first Noether extension in 5 minutes.
