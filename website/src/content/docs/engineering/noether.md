# The Story of Noether

A technical retrospective on why Noether was conceived, how the stack was chosen, and how the core architecture was built.

## 1. Origins & The "Flint" Philosophy
---

On August 25, 2026, I sat down to find a dedicated, private place on my local drive to store my notes, life context, and technical thinking so that I wouldn't have to re-explain who I was every single time I opened an AI chat.

Like most developers exploring local-first tools, my first thought was Obsidian. But opening it up left me frustrated:
- The settings configuration was overwhelming, where even basic adjustments required digging through dozens of nested panes.
- Understanding how community plugins worked felt like finding a needle in a haystack with inconsistent documentation.
- The Command Palette was a dense wall of text with zero visual hierarchy, making rapid keyboard scanning painful.

I decided to build my own solution as a fun project.

Before becoming Noether, the project was originally called **Flint**. It took inspiration from Obsidian's geological rock motif, but carried a genuine philosophy: flint was *the first spark of fire that butterfly-effected the entire age of human civilization.* That spark captured the idea that small, atomic notes and thoughts compound over time into an interconnected knowledge base.

I eventually rebranded to **Noether** in honor of mathematician Emmy Noether. While her landmark theorem in mathematical physics (the deep connection between continuous symmetries and conservation laws) serves as a great conceptual metaphor for balancing raw Markdown on disk with real-time SQLite relational indexing, the honest truth is that the name also sounded undeniably cool, crisp, and elegant.

## 2. Choosing Tauri and Rust over Electron
---

When building desktop Markdown editors, the conventional choice is bundling Chromium via Electron. I deliberately chose Tauri v2 and Rust instead:

| Dimension | Electron | Noether (Tauri v2 + Rust) |
| :--- | :--- | :--- |
| **Idle Memory Usage** | 600MB to 1.5GB RAM | Under 150MB RAM with automatic memory trimming |
| **Installer Size** | 120MB+ package | ~15MB compressed installer |
| **Database Engine** | WebAssembly SQLite or IndexedDB | Compiled native Rust SQLite (`rusqlite`) with Direct WAL |
| **File I/O Operations** | Node.js `fs` callbacks across bridge | Native Rust asynchronous file I/O with atomic rename |
| **UI Responsiveness** | Heavy indexing blocks UI thread | Heavy indexing runs in background Rust threads |

Tauri v2 uses the operating system's native webview (WebView2 on Windows, WebKit on macOS), eliminating the memory overhead of shipping an entire browser engine.

## 3. Markdown Files and Local SQLite Index
---

Many note-taking apps either lock notes inside proprietary databases or scan files slowly on every keystroke. Noether combines both approaches through a [[Dual-Storage Architecture]]:

1. **Markdown Files on Disk**: Every note is a standard `.md` file. If Noether stops running, your notes remain completely readable in VS Code, Vim, or any terminal tool.
2. **Native SQLite Index (`rusqlite`)**: Note metadata (frontmatter, tags, backlinks, headings) is indexed directly into an embedded SQLite database (`.noether/noether.sqlite`).
3. **Write-Ahead Logging (WAL)**: Transactions commit using WAL mode with memory mapping, enabling fast disk writes and instant full-text search (FTS5) without UI lag.

## 4. Snappy Desktop Feel
---

Many modern applications add decorative animations: sliding panels, bouncing buttons, and fading popups. While visually appealing, they add unnecessary delays when typing and navigating.

In Noether, micro-interaction animations are eliminated:
- Context menus, dialogs, and tooltips render on the immediate next frame.
- Sidebars toggle instantly.
- Tree folders expand instantly.
- Form controls switch with zero transition lag.

This gives the application the immediate responsiveness of a classic desktop utility.

## 5. Mobile Roadmap: Android After 1.0.0
---

A frequent question is whether Noether will be available on mobile.

The engineering priority is straightforward: **Android support will follow the desktop 1.0.0 milestone.**

Focusing on the desktop first ensures the core architecture, Rust SQLite index, and Extension SDK are thoroughly tested and stable. Once desktop reaches 1.0.0, Tauri v2's mobile target allows building directly for Android with full local folder access.

iOS is not planned in the near term due to Apple's strict filesystem sandboxing and App Store developer requirements.
