# Noether Agent & Contributor Engineering Standards

> [!NOTE]
> This guide is for AI coding assistants (Claude Code, Cursor, OpenAI Codex, Google Antigravity, Windsurf, Roo Code, Cline, Aider) and human developers contributing to Noether.
> For the complete setup walkthrough, build instructions, and repository layout, see the [Contributing Guide](https://yvliet.github.io/noether/#docs/contributing).

---

## 1. Core Architectural Boundaries

### Strict Native Core Isolation (Zero Extension Leakage)
- Native directories (`src/core`, `src/lib`, `src/store`, `src/components`, `src/types`, `src/sdk`) must **NEVER** import from extension directories (`src/extensions/*`).
- Extensions must integrate exclusively through:
  1. The Noether Extension SDK (`src/sdk`)
  2. Inversion of Control (IoC) Registries (`CommandRegistry`, `ToolRegistry`, `ViewRegistry`, `StatusBarRegistry`, etc.)
  3. The central `EventBus` (`eventBus.on()`, `eventBus.emit()`)
- If an extension requires a new host capability, build a general-purpose, modular API slot in the SDK rather than a hyperspecific one-off core hook.

### Alpha Stage Invariant: Zero Backward Compatibility
- Noether is in active alpha development. Backward-compatibility layers, deprecated aliases, and legacy migration fallbacks are strictly prohibited.
- When refactoring interfaces or schemas, delete obsolete code cleanly and migrate callers forward. Do not accumulate technical debt to support older versions.

### Cross-Platform Neutrality Bridge
- Never invoke `window.__TAURI__` or `window.electronAPI` directly inside React components or stores.
- Always route filesystem, window, and system operations through `src/lib/platform/platformAdapter.ts` to preserve desktop and web compatibility.

### MCP Tool Registration for Extensions
- Every extension that manages queryable data or performs actions must register at least one Model Context Protocol (MCP) tool definition via `this.registerTool()` in its `onload()` lifecycle method.
- Follow `snake_case` tool names (`get_`, `list_`, `create_`, `update_`, `delete_`, `search_`).
- Tool handlers must be async, return `McpToolResult`, and operate on in-memory stores or SQLite rather than blocking disk I/O.

### Unified Extension Terminology
- Noether exclusively uses the term **Extension** (never "plugin") across UI labels, documentation, developer guides, settings, and new code.

---

## 2. Native Desktop Feel & Instant UI Responsiveness

### Zero Micro-Interaction Animation Delays
- **Never add artificial transitions or durations** (`transition-colors`, `transition-all`, `transition-transform`, `duration-150`, `duration-200`, `duration-300`, `animate-in`, `fade-in`) to UI micro-interactions such as toggle switches, buttons, dropdowns, context menus, tooltips, modal dialogs, or file tree rows.
- UI elements must render, hover, open, and close **instantly** without perceptible frame lag or visual smearing, preserving a snappy, unbloated desktop feel.
- High-FPS spatial simulations (such as Graph View force physics and Canvas infinite pan/zoom) are explicitly exempt and retain mathematical kinematic easing.

### Manifest-Driven Icons & Styling
- Extension icons and backgrounds must be 100% manifest-driven. Never hardcode switch cases in core components.
- Icons resolve dynamically from HugeIcon identifiers (`"clock-01"`, `"cpu"`, `"git-branch"`), raw SVG strings, or image assets.
- **Zero Emoji Policy**: Emojis are strictly disallowed as extension icons across manifests, registries, and runtime UI.

---

## 3. Local-First Safety & Data Integrity

### Safe Path Normalization
- All filesystem operations must validate target paths using `is_safe_vault_path`:
  - Strip Windows UNC prefixes (`\\?\UNC\...` and `\\?\C:\...`).
  - Perform case-insensitive comparisons on Windows platforms.
  - Guard against empty or root paths (`.`, `/`, `\`) in deletion and attribute commands to prevent vault wiping.

### Atomic Disk Persistence
- Document saving writes serialized CommonMark content to a temporary file (`.noether-tmp-*`) in the vault before performing an atomic OS rename to `note.md`.
- Never truncate or overwrite notes in-place with unbuffered streams.

### SQLite Data Integrity
- Binary `BLOB` columns in SQLite must always be serialized to standard Base64 strings, never lossy UTF-8 strings.
- Multi-statement SQL scripts must use syntax-aware statement splitters respecting quotes, bracketed identifiers, and SQL comments.

---

## 4. Documentation & Writing Standards

### Simple Technical English Invariant
- Use direct, plain, grounded engineering English without pseudo-academic, convoluted, or over-engineered jargon:
  - Write **"Dark and Light Theme Modes"** (never "Orthogonal Lighting Modes & Dynamic Derivation")
  - Write **"Atomic File Saves & Save Pipeline"** (never "Crash-Safe Atomic Persistence & 3-Tier Asynchronous Pipeline")
  - Write **"Windows Memory Management"** (never "Native Win32 Working Set Memory Reclamation")
  - Write **"Undo History and Memory Limits"** (never "Bounded Undo Stack Memory Hygiene")
  - Write **"Fast Syntax Decorations"** (never "Incremental Decoration Mapping")
  - Write **"Layout and Sizing Rules"** (never "Architectural Alignment Invariant")

### Strict User Help vs. Developer Docs Boundary
- **User Help Center** (`website/src/content/help/`): Dedicated to everyday writing workflows, keyboard shortcuts, formatting, and built-in extensions. **Zero internal engine mechanics** (never mention FTS5 BM25 queries, Rust IPC bridges, SQLite WAL pragma flags, or AST tokenizers in User Help).
- **Developer Docs** (`website/src/content/docs/`): Objective, professional systems engineering architecture, SDK interfaces, database schemas, and IPC catalogs.
- **Digestible Topic Guides**: Split broad features into focused, bite-sized topic pages rather than packing monolithic subsystems into a single overwhelming page.

### Formatting Invariants
- **Website Divider Rule**: In all website documentation (`website/src/content/docs/` and `website/src/content/help/`), EVERY `##` heading must have an empty line followed by a horizontal divider (`---`) directly beneath it before body text.
- **Zero Sandwiched Headings**: Never place a divider (`---`) directly above a heading.
- **Zero Headings in Collapsible Containers**: NEVER place markdown headings (`##`, `###`, `####`) inside collapsible `<details>...</details>` blocks or accordions. Use bold lead lines (`**Setup Steps**:`) instead.
- **Zero Em Dashes**: Never use em dashes anywhere. Use commas, hyphens (`-`), colons, or parentheses.
- **Unicode Arrows**: Always use clean Unicode arrows (`→`, `↔`, `↓`, `←`, `⇒`), never ASCII arrows (`->`, `-->`).
- **Cross-Portal Links**: When referencing between Help and Docs portals, always use proper clickable markdown links or wikilinks (`[[Noether Docs]]`, `[[Noether Help]]`), never plain bold text.

---

## 5. Quality Verification Gate (Run Before Submitting PRs)

Every Pull Request must pass the following verification checks without errors or regressions:

1. **Frontend Type Verification**:
   ```bash
   npx tsc --noEmit
   ```
2. **Rust Backend Verification** (when modifying `src-tauri/`):
   ```bash
   cargo check --manifest-path src-tauri/Cargo.toml
   ```
3. **Website Documentation Build** (when modifying `website/`):
   ```bash
   npm --prefix website run build
   ```

---

## 6. Commit & Pull Request Guidelines

- **Conventional Commits**: Format commit subjects as `type(scope): subject` (e.g. `feat(editor): add table column resize handles`, `fix(sync): debounce background polling on window blur`).
  - Allowed types: `feat`, `fix`, `refactor`, `perf`, `docs`, `style`, `chore`, `test`, `build`, `ci`.
- **Authentic Engineering Voice**:
  - Write PR descriptions and commit messages like a pragmatic engineer explaining changes to teammates.
  - Name real files, functions, and algorithms.
  - Avoid AI marketing buzzwords (*"seamlessly"*, *"first-class"*, *"tactile"*, *"effortless"*, *"unobtrusive"*, *"elevates"*, *"transforms ... into ..."*, *"peace of mind"*, *"synergy"*).
