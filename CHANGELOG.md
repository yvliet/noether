# Changelog

All notable changes to Flint will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.6] - 2026-09-06

### Added
- **Sketch Core Extension**: Built-in freehand vector drawing and markup overlay directly on top of markdown documents without rigid inline bounding blocks.
- **Native Editor Portal Slots**: Introduced `editor:subheader-actions` (mounted next to the editing view toggle with `PaintBoardIcon`) and `editor:content-overlay` (anchored inside the document column to scroll naturally with text).
- **Document Transform Hooks**: Added `DocumentTransformHook` interface in `EditorRegistry` and `Extension` base class to intercept document exports and imports for clean external serialization.
- **Clean Markdown Disk Persistence**: Vector strokes persist in SQLite WASM and synchronize to disk as invisible HTML comments (`<!-- flint-sketch: ... -->`) that stay clean in external markdown readers.
- **Photoshop-Style Selection & Move Mode**: Added `Cursor02Icon` selection tool supporting marquee drag-to-select, dashed bounding outlines with 8 transform handles, real-time 120 FPS SVG translation, multi-stroke shift selection, and stroke deletion via `Delete` / `Backspace`.
- **Icon-Only HUD Toolbar**: Floating drawing dock featuring Select, Pen, Highlighter, Eraser, color swatches, visual width dots, and anchoring toggles (Text Flow vs Viewport Screen).
- **Capture-Phase Keyboard Shortcuts**: Intercepted `Ctrl+Z` (undo) and `Ctrl+Y` / `Ctrl+Shift+Z` (redo) at the window capture phase with `stopImmediatePropagation()` to ensure drawing history is never intercepted by ProseMirror or browser defaults.
- **Dedicated Sketch Settings Tab**: Added `SketchSettingsTab` to customize default tools, stroke line widths, color palettes, and anchoring modes.
- **MCP AI Tool Integration**: Registered `sketch_get_document_drawings`, `sketch_export_svg`, and `sketch_clear_layer` for autonomous AI agent inspection and export.

### Fixed
- **Extension Settings Resolution in Settings Window**: Resolved issue where enabled extensions without registered custom setting tabs falsely displayed "is currently disabled" by querying fallback tabs across `coreExtensionTabs` and `communityExtensionTabs` and decoupling disabled notice checks.

---

## [0.4.5] - 2026-09-06

### Added
- **Official Publish Extension REST API**: Added `POST /api/v1/extensions/publish` endpoint with Zod schema validation, automatic author profile provisioning, developer ownership verification (403 guard), and duplicate version protection (409 guard with optional `overwrite: true` in-place updates).
- **Direct Turso Bundle Storage and Serving**: Saved compiled JavaScript bundles, CSS stylesheets, and Markdown READMEs directly into the Turso database, exposing them via dedicated `/bundle`, `/styles`, and `/manifest.json` endpoints.
- **Dedicated CLI Extension Publisher**: Introduced `scripts/publish-extension.ts` (`npm run extensions:publish`) to inspect extension directories, compute SHA256 integrity hashes, and publish releases to the registry without direct database credentials.
- **Unified Extension Terminology Across Registry Routes**: Mounted `/api/v1/extensions` as the primary standard route while retaining `/api/v1/plugins` as a transparent backward-compatible alias.

### Removed
- **Direct Database Seeding Scripts**: Removed legacy `scripts/seed-turso-registry.ts` and `api/src/db/seed.ts` along with the `registry:seed` script, replacing manual raw SQL database insertion with the formal Publish API.

---

## [0.4.4] - 2026-09-06

### Added
- **Host Module Forwarding in Extension Sandbox**: Exposed `clsx`, `tailwind-merge`, `zustand`, `zustand/vanilla`, `@hugeicons/react`, and `@hugeicons/core-free-icons` directly into the sandboxed `require` environment, eliminating bloated bundled runtime duplicates.
- **SDK Subpath Aliasing**: Added runtime support for `'flint/sdk'`, `'@flint'`, `'@flint/core'`, and `'flint-sdk'` require paths.
- **Extension Upgrades via SemVer**: Added automatic version comparison in the marketplace installer to support seamless one-click upgrades for installed community extensions.
- **Dual Plugin Directory Scanning**: Added transparent support for reading and listing extensions across both `.flint/extensions/` and legacy `.flint/plugins/` directories.

### Fixed
- **Extension Installation State Desynchronization**: Resolved issue where marketplace items showed installed state prematurely by unifying the installation lifecycle through `ExtensionManager` and removing stale local storage keys.
- **Silent Marketplace Failure Modes**: Replaced empty dummy class generation on network failures with explicit error returns and increased download timeouts to 5000ms.
- **Zod Module Export Shape**: Normalized `require('zod')` export shape to `{ ...z, default: z, z }` to support compiled CommonJS destructuring and property access.
- **Windows Path Normalization and Security**: Added UNC and verbatim prefix stripping (`\\?\UNC\...` and `\\?\C:\...`), case-insensitive containment checks, and nearest existing parent canonicalization for non-existent file paths.
- **Vault Root Deletion Guard**: Blocked empty or dot paths in `delete_markdown_file` and `set_file_attributes` from targeting the vault root.
- **Trash Directory Boundary Checks**: Restricted trash file operations strictly to the `.trash/` directory.
- **SQLite BLOB Base64 Serialization**: Serialized SQLite binary blobs into standard Base64 strings instead of lossy UTF-8 replacement strings.
- **SQLite Batch Execution Fallback**: Implemented robust SQL statement splitting that respects quotes, backticks, and comments so multi-statement scripts execute completely during row-returning query fallbacks.
- **Tauri Event Listener Memory Leaks**: Added cancellation flags to asynchronous event listener registrations in `platformAdapter.ts` to prevent leaks on unmounted components.
- **Storage Sync Debounce**: Debounced cross-window storage synchronization to prevent duplicate reloads across config keys.
- **Extension Settings Placeholder**: Rendered an explicit disabled placeholder with an "Enable" button when viewing settings of a disabled extension instead of displaying a blank panel.

### Changed
- **Local Storage Quota Protection**: Excluded full markdown README contents from marketplace catalogue queries and local cache storage.
- **Build Target Modernization**: Updated Vite build targets to modern ECMAScript and browser releases (`es2021`, `chrome100`, `safari13`), grouped TipTap table extensions into vendor chunks, and enabled link-time optimization (LTO) in release profiles.

---

## [0.4.3] - 2026-09-06

### Changed
- **Update Modal UI Streamlining**: Removed the redundant "Update Available" header banner and replaced the boxed "Ready to Install" pill outline with clean, flat text and icon styling.
- **Consistent Modal Label Alignment**: Indented release title, changelog section labels, and package size metadata with uniform padding (`px-4`) to align with the inner text grid.
- **General Settings Simplification**: Removed legacy early access channel toggles and obsolete account sections to maintain a lightweight, offline-first settings panel.
- **Modal Keyboard Dismissal**: Added `Escape` key listener to dismiss the update dialog instantly.

---

## [0.4.2] - 2026-09-06

### Added
- **Extended Versioning Support**: Allowed four-part versioning schemes (`MAJOR.MINOR.PATCH.BUILD` / `x.y.z.w`) across extension manifest schemas and documentation for granular build and hotfix tracking.

### Fixed
- **Extension README Viewer Typography**: Fixed extension README pages having smaller font sizes by integrating dynamic `--editor-font-size` scaling, proportional heading calculations, and standard document typography rules.
- **Reading View Styling Synchronization**: Synced extension markdown rendering with active document settings (`flint-accent-lists`, `flint-indent-guides`, `flint-strict-line-breaks`, `flint-show-link-icon`) and theme tokens for full light and dark mode parity.

---

## [0.4.1] - 2026-09-06

### Added
- **Automatic Client Updates**: Added background update checking against GitHub Releases (`updateChecker.ts`, `useAutoUpdater.ts`) with a 4-hour cooldown, early access channel support, and direct installer downloads (`.exe`, `.msi`).
- **Interactive Update Dialog**: Added a release modal (`UpdateModal.tsx`) showing version changelogs, highlights, and direct download buttons.
- **Turso Edge Database Fallback**: Added direct fallback queries to Turso (`tursoClient.ts`) via the `/v2/pipeline` HTTP endpoint, so community extensions can still be browsed and installed even if the primary REST API is temporarily unreachable.
- **Preloaded Community Catalog**: Pre-seeded showcase extensions (`flint-cascade`, `flint-copilot`, `quicknote`, and `fsrs-spaced-repetition`) for instantaneous catalog loading on startup.

### Fixed
- **Empty Marketplace Listing**: Fixed empty extension catalog in development by aligning registry ports (`3001`), adding Turso HTTP fallback queries, and properly mapping Hugeicons.
- **Extension Download Failures**: Fixed package downloads failing when REST endpoints are down by falling back to compiled bundles stored directly in the database.
- **Settings Update Checks**: Replaced static toast messages in Settings with live GitHub Release lookups and a one-click "Update to v..." button.

---

## [0.4.0] - 2026-09-06

### Added
- **Interactive Documentation Site**: Built a dedicated documentation portal (`website/`) with live search, topic outlines, light/dark mode parity, and GitHub Pages deployment.
- **Enhanced Documentation Engine**: Added KaTeX math rendering (`$...$`, `$$...$$`), multi-backtick code blocks, merged-cell table parsing (`colspan` / `rowspan`), and proportional font previews.
- **Architectural Specifications**: Added deep technical specs and guides in `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md`, `docs/KEYBOARD_SHORTCUTS.md`, and `docs/USER_GUIDE.md`.
- **Serverless Marketplace Backend**: Built a lightweight D1/Turso SQL registry (`api/`) for extension search, categories, and downloads.
- **Automated Releases**: Added release automation scripts and GitHub Pages deployments.

### Changed
- **Marketplace UI**: Redesigned the extension catalog with real-time category filtering, search caching, and smoother install flows.
- **Unicode Arrows**: Standardized clean Unicode arrows (`→`, `↔`) across all documentation and comments.
- **Application Versioning**: Centralized application version strings into a single source of truth.

---

## [0.3.0] - 2026-09-04

### Added
- **Native Model Context Protocol (MCP) Server**: Built an in-process tool registry and JSON-RPC 2.0 stdio server (`flint-mcp-server`) so AI assistants like Claude Desktop, Cursor, Antigravity, and Gemini can interact with your notes.
- **Copilot for Flint**: Built a context-aware AI assistant docked in the right sidebar with BYOK provider support (Anthropic, OpenAI, Google Gemini, DeepSeek, OpenRouter) and automated MCP tool access.
- **Extension Tool Builder**: Added type-safe Zod schema tool registration for extensions via `Extension.registerTool()`.

---

## [0.2.0] - 2026-08-30

### Added
- **Infinite 2D Spatial Canvas**: Added a 60 FPS infinite pan/zoom whiteboard supporting note cards, groups, and connector lines stored in `.flint/canvas`.
- **Tasks Kanban Dashboard**: Added a 3-stage visual task board with 2-way disk synchronization and hashtag tags.
- **FSRS Spaced Repetition**: Added in-editor flashcard reviews with modern FSRS-4.5 interval forecasting and review logs.
- **Daily Journal**: Added one-click daily scratchpads with date templating and calendar navigation.
- **Multi-Hearth Switching**: Added fast workspace switching (`Ctrl+Shift+O`) and soft-delete file recovery in `.trash/`.

---

## [0.1.0] - 2026-08-25

### Added
- **Dual-Storage Engine**: Combined plain Markdown files on disk with a compiled native Rust SQLite database (`rusqlite` WAL mode + FTS5 search).
- **TipTap 2.x & ProseMirror Live Preview**: Hybrid WYSIWYG editor with sub-8ms typing latency and transaction-mapped decoration caching.
- **2D Knowledge Graph**: Interactive force-directed physics graph with automatic sleep when minimized.
- **Flint Extension SDK**: Micro-kernel Inversion of Control (IoC) architecture with decoupled EventBus and dynamic UI slots.
