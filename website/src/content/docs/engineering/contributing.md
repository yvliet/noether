# Contributing to Noether

I welcome contributions, bug fixes, performance improvements, and extension enhancements from the community. This guide walks you through setting up your local development environment, understanding the core architectural boundaries, and submitting clean pull requests.

## 1. Local Development Environment
---

To build and run Noether locally from source, ensure you have the following prerequisites installed on your system:

- **Node.js**: Version 20.x or higher (from [nodejs.org](https://nodejs.org)).
- **Rust & Cargo**: Latest stable Rust toolchain via [rustup.rs](https://rustup.rs).
- **Tauri Prerequisites**: Follow the [Tauri v2 OS Prerequisites Guide](https://v2.tauri.app/start/prerequisites/) for your operating system (C++ build tools on Windows, Xcode command line tools on macOS, webkit2gtk development libraries on Linux).

### Initial Repository Setup

Clone the repository and install all dependencies:

```bash
# Clone the repository
git clone https://github.com/yvliet/noether.git
cd noether

# Install frontend dependencies
npm install

# Verify TypeScript compilation
npx tsc --noEmit

# Verify Rust backend compilation
cargo check --manifest-path src-tauri/Cargo.toml
```

### Running the Desktop App in Development

```bash
# Launches the Tauri native desktop app with live reload
npm run app
```

### Running the Documentation Website

The documentation website (which you are reading right now) lives in `website/` and runs as a standalone Vite + React SPA:

```bash
# Start documentation development server
npm --prefix website run dev

# Build documentation bundle
npm --prefix website run build
```

## 2. Codebase Structure & Architecture Tour
---

The Noether codebase is strictly partitioned to guarantee long-term maintainability:

```
Noether/
├── src/
│   ├── core/                  ← Micro-kernel, dependency injection, extension registries
│   ├── lib/                   ← DB adapters, editor parsing, platform abstraction
│   ├── store/                 ← Reactive Zustand stores (documents, workspace, settings)
│   ├── components/            ← UI primitives, live editor, 2D graph, spatial canvas
│   ├── sdk/                   ← Public Noether SDK exported to extensions
│   ├── extensions/core/       ← Core built-in extensions (graph, canvas, tasks, fsrs)
│   └── types/                 ← Global TypeScript interfaces
├── src-tauri/
│   ├── src/
│   │   ├── commands/          ← Tauri IPC commands exposed to the frontend
│   │   ├── db/                ← Native SQLite engine (rusqlite, WAL, migrations)
│   │   ├── fs/                ← Atomic temp-and-rename writes, file watchers
│   │   └── memory/            ← Win32 working set memory trimming routines
│   └── Cargo.toml
├── website/                   ← Noether Help & Docs website
└── bin/                       ← Standalone stdio MCP server executable
```

## 3. Core Architectural Invariants
---

When contributing code to Noether, keep these key architectural invariants in mind:

1. **Strict Native Core Isolation (Zero Extension Leakage)**:
   - Never import extension code, types, or models into native directories (`src/core`, `src/lib`, `src/store`, `src/components`, `src/types`, `src/sdk`).
   - Extensions must integrate strictly via the Noether SDK, Inversion of Control (IoC) Registries, and the EventBus.
2. **Zero Micro-Interaction Animations**:
   - Do not add artificial transitions or durations (`transition-colors`, `transition-all`, `duration-*`, `fade-in`, `slide-in-*`) to UI micro-interactions like toggles, tooltips, buttons, context menus, or file tree items.
   - Elements must render and toggle instantaneously.
3. **Cross-Platform Neutrality**:
   - Never invoke platform APIs directly in React components. Always route through `src/lib/platform/platformAdapter.ts`.

## 4. Verification Quality Gates
---

Before submitting any code changes, always verify both frontend and backend quality gates:

```bash
# 1. Type verification (must return zero errors)
npx tsc --noEmit

# 2. Rust verification (if src-tauri/ was touched)
cargo check --manifest-path src-tauri/Cargo.toml

# 3. Production build test
npm run build
```

## 5. Submitting Pull Requests
---

1. Fork the repository and create a short-lived feature branch (`feat/<scope>`, `fix/<scope>`, `refactor/<scope>`).
2. Commit your changes locally.
3. Format clean commit messages using Conventional Commits: `type(scope): subject` (e.g. `feat(editor): optimize katex formula memoization`).
4. Push your branch to your fork and open a Pull Request against `main`.
5. Join the [Noether Discord Server](https://dsc.gg/noether) if you'd like to discuss features or get early feedback!

## 6. Contributing with AI Coding Agents
---

If you contribute using AI coding assistants (such as Claude Code, Cursor, OpenAI Codex, Google Antigravity, Windsurf, Roo Code, Cline, or Aider), Noether provides an authoritative [`AGENTS.md`](https://github.com/yvliet/noether/blob/main/AGENTS.md) in the repository root.

Most modern AI coding harnesses discover and read `AGENTS.md` automatically when opening the workspace, ensuring AI-assisted contributions adhere to our architectural isolation boundaries, instant UI responsiveness standards, and verification quality gates.

