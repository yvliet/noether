# Changelog

All notable changes to Flint will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-09-06

### Added
- **Full Documentation Portal**: Interactive documentation website (`website/`) with live search, topic outlines, light and dark mode parity, and GitHub Pages deployment.
- **Enhanced Documentation Engine**: KaTeX math formula rendering (`$...$`, `$$...$$`), CommonMark multi-backtick extraction, merged-cell table matrix parser (`colspan` / `rowspan`), and proportional font support for visual preview blocks.
- **Architectural Specifications**: Exhaustive engineering specifications in `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md`, `docs/KEYBOARD_SHORTCUTS.md`, and `docs/USER_GUIDE.md`.
- **Serverless Marketplace Backend**: D1/Turso SQL registry backend (`api/`) supporting dynamic plugin search, category filtering, and package downloads.
- **Automated Deployment & Release Tooling**: Integrated `gh-pages` and GitHub Release automation scripts.

### Changed
- **Marketplace Interface**: Overhauled extension catalog UI with real-time category filtering, search caching, and seamless installation flows.
- **Typography & Formatting**: Standardized clean Unicode arrows (`→`, `↔`) across all guides, manuals, and code comments.
- **Centralized Versioning**: Established single source of truth for runtime application version.

---

## [0.3.0] - 2026-09-04

### Added
- **Native Model Context Protocol (MCP) Server**: In-process tool registry and JSON-RPC 2.0 stdio server (`flint-mcp-server`) supporting Claude Desktop, Cursor, Antigravity, and custom AI agents.
- **Copilot for Flint**: Built-in AI assistant docked in the right sidebar with BYOK provider integration (Anthropic, OpenAI, Google Gemini, DeepSeek, OpenRouter) and autonomous MCP tool access.
- **Extension Tool Builder**: Type-safe Zod and JSON Schema tool registration via `Extension.registerTool()`.

---

## [0.2.0] - 2026-08-30

### Added
- **Infinite 2D Spatial Canvas**: Hardware-accelerated 60 FPS infinite pan/zoom whiteboard supporting live Markdown note cards, groups, and Bezier connector routing.
- **Tasks Kanban Dashboard**: 3-stage visual workflow board with 2-way atomic disk synchronization and hashtag categorizations.
- **FSRS Spaced Repetition**: In-editor flashcard review deck with automated interval forecasting and relational review logs.
- **Daily Journal**: Instant date-templated note creation and calendar integration.
- **Multi-Hearth Management**: Rapid workspace switching, auto-discovery, and safe soft-delete recovery (`.trash/`).

---

## [0.1.0] - 2026-08-25

### Added
- **Dual-Storage Engine**: Local-first Markdown ground truth paired with native Rust SQLite (`rusqlite` WAL mode + FTS5 full-text indexing).
- **TipTap 2.x & ProseMirror Live Preview**: Hybrid WYSIWYG editor with sub-8ms typing latency and transaction-mapped decoration caching.
- **2D Force-Directed Knowledge Graph**: Kinematic Euler physics simulation with automatic sleep suspension.
- **Flint Extension SDK**: Micro-kernel Inversion of Control (IoC) architecture with decoupled EventBus and dynamic UI slots.
