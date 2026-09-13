# Noether

A technical retrospective on how Noether was conceived, engineered, and built from scratch.

## 1. The Spark & The "Flint" Origin
---

On August 25, 2026, I sat down to find a dedicated, private place on my local drive to store my notes, life context, and technical thinking so that I wouldn't have to re-explain who I was every single time I opened an AI chat.

Like most developers exploring local-first tools, my first thought was Obsidian. But opening it up left me frustrated:
- The settings configuration was a labyrinthian maze where even basic adjustments required digging through dozens of nested panes.
- Understanding how community plugins worked felt like finding a needle in a haystack with sparse, inconsistent documentation.
- The Command Palette was an unreadable wall of text with zero visual hierarchy, making rapid keyboard scanning painful.

I decided to build my own solution as a fun project.

Before becoming Noether, the project was literally called **Flint**. It was an unapologetic, tongue-in-cheek copy of Obsidian's geological rock motif, complete with an overly grand philosophical statement about how flint was *"the first spark of fire that butterfly-effected the entire age of human civilization."*

I eventually rebranded to **Noether** primarily because it sounded undeniably cool, crisp, and elegant, lol. While Emmy Noether's landmark theorem in mathematical physics (the deep connection between continuous symmetries and conservation laws) serves as a great conceptual metaphor for balancing raw Markdown on disk with real-time SQLite relational indexing, the honest truth is that the name simply sounded cool.

## 2. Technical Stack Rationale: Tauri v2 + Rust vs. Electron
---

When building a desktop Markdown workspace, the conventional path is bundling a Chromium runtime via Electron. I deliberately rejected Electron for Noether:

| Metric / Dimension | Electron Approach | Noether (Tauri v2 + Rust) |
| :--- | :--- | :--- |
| **Idle Memory Footprint** | Typically 600MB to 1.5GB RAM | Sub-150MB RAM with automatic Win32 memory trimming |
| **Binary Bundle Size** | 120MB+ installer | ~15MB compressed installer |
| **Database Execution** | WebAssembly SQLite or IndexedDB | Compiled native Rust `rusqlite` with Direct WAL journaling |
| **Filesystem Operations** | Node.js `fs` callbacks across bridge | Native Rust asynchronous file I/O with atomic rename |
| **UI Thread Starvation** | High: JSON serialization blocks UI | Zero: Heavy indexing executes natively in Rust threads |

Tauri v2 utilizes the host operating system's native webview (WebView2 on Windows, WebKit on macOS), eliminating the overhead of shipping an entire browser engine with the app.

## 3. Storage Architecture: Plain Text Ground Truth + Rust SQLite
---

Many modern note-taking tools either lock notes inside proprietary SQLite databases or rely on naive disk scanning that chokes on large repositories. Noether bridges this gap through a [[Dual-Storage Architecture]]:

1. **Markdown Files as Ground Truth**: Every note is a standard `.md` file on disk. If Noether were to vanish tomorrow, your notes remain 100% accessible via Vim, VS Code, or standard shell tools.
2. **Native Compiled SQLite Cache (`rusqlite`)**: Rather than running SQLite inside the browser via WebAssembly (which requires slow serialization and dumps whole-database blobs to IndexedDB), Noether passes extracted note metadata directly across Tauri IPC into a compiled Rust SQLite database (`.noether/noether.sqlite`).
3. **WAL Mode & Memory-Mapped I/O**: Transactions commit via Write-Ahead Logging (WAL) with 256MB memory mapping, enabling sub-millisecond writes, instant FTS5 full-text search, and real-time bidirectional graph traversal without UI stutter.

## 4. The Zero-Animation Rule: Why Snappy Beats Flashy
---

Modern web and desktop applications are obsessed with decorative CSS animations: sliding sidebars, fading popups, bouncy toggle switches, and easing curves on menus.

I personally associate animations with bloat and artificial lag. When you are writing code or taking rapid notes, a 200ms transition delay on every menu click accumulates into real cognitive fatigue.

In Noether, micro-interaction animations are completely eliminated:
- Context menus, dialogs, and tooltips render on the immediate next frame.
- Sidebars toggle in zero milliseconds.
- File tree folders expand instantaneously.
- Form controls switch with zero transition smearing.

The result is a desktop application that feels as immediate, lightweight, and responsive as classic Windows native utilities.

## 5. What Lies Ahead: Visual Block-Coding Dataview
---

Looking toward the future, the next major architectural milestone is an insane **visual Dataview extension**.

Instead of requiring users to write complex SQL scripts or text-heavy query blocks, this extension will leverage Noether's infinite 2D Spatial Canvas edge renderer to let users visually wire query blocks together. You will be able to construct relational queries, filters, and aggregations using visual node connectors, bringing Notion- and AppFlowy-style database power directly to your local Markdown files.

## 6. Mobile Platform Strategy: Android After 1.0.0
---

A frequent question from contributors and early adopters is whether Noether will expand beyond the desktop.

My engineering roadmap is straightforward: **Android will be supported after the desktop reaches stable 1.0.0.**

Splitting engineering attention between desktop and mobile too early is a classic trap that produces two mediocre experiences instead of one great tool. The priority is fleshing out the desktop core first: stress-testing the native Rust SQLite caching layer, ensuring crash-resilient atomic file writes under heavy volume, and stabilizing the Extension SDK.

From an architectural and platform standpoint:
- **Android Support**: First-class target after desktop `1.0.0`. Tauri v2 has native mobile support, and Android allows open, unrestricted filesystem access. Users will be able to point Noether directly at a local folder synced via Syncthing, Git, or SD storage without needing a proprietary cloud middle-layer.
- **iOS Feasibility**: Not planned in the foreseeable future. Apple's rigid sandboxing forbids open directory mounting across applications, making local-first multi-file vault management nearly impossible without custom sync services, in addition to recurring Apple developer fees and App Store review constraints.
