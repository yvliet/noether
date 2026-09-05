# Contributing to Flint

Thank you for your interest in contributing to **Flint**! We are building an open-source, local-first knowledge engine that pairs the sovereignty of plain-text Markdown files with native desktop speed, embedded relational query acceleration, and AI-native agent integration.

---

## 1. Prerequisites & Environment Setup

Before compiling or developing Flint, ensure you have the following installed:

- **Node.js**: `v18.0.0` or higher
- **npm** or **pnpm**
- **Rust Toolchain**: `cargo >= 1.75` (required to build the Tauri v2 native desktop application)
  - Windows: Visual Studio C++ Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: Standard webkit2gtk development packages (`libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`)

### Clone & Install Dependencies
```bash
git clone https://github.com/yvliet/flint.git
cd flint
npm install
```

---

## 2. Development Workflow & Commands

### Running the Desktop Application (Rust Native + Tauri v2)
This is the primary development environment with the compiled `rusqlite` WAL engine:
```bash
npm run app
# Equivalent to: npm run tauri:dev
```

### Running the Web Development Server (Browser Mode)
For rapid frontend UI layout development without compiling Rust:
```bash
npm run dev
# Accessible at http://localhost:5173
```

### Building Production Distributables
```bash
# Frontend build & typecheck
npm run build

# Native desktop binary & installer package
npm run tauri:build
```

---

## 3. Engineering Standards & Architectural Rules

To maintain high architectural integrity, Flint enforces strict engineering invariants:

### 1. Strict Native Core Isolation (Zero Extension Leakage)
- **Never import extension code into native core directories**: Core folders (`src/core`, `src/lib`, `src/store`, `src/components`, `src/types`, `src/sdk`) must remain strictly isolated from plugin code (`src/extensions/*`).
- Features must integrate exclusively through the Flint SDK (`src/sdk`), Inversion of Control (IoC) registries (`SlotRegistry`, `EditorRegistry`, `ToolRegistry`, `DatabaseManager`), and the typed `EventBus`.

### 2. Cross-Platform Neutrality Bridge
- Never invoke runtime-specific host primitives (e.g. Tauri API, Node `fs`, or Electron) directly inside React components or stores.
- Always route system operations through [`src/lib/platform/platformAdapter.ts`](../src/lib/platform/platformAdapter.ts).

### 3. Type Safety & Verification
- Always run `npx tsc --noEmit` before opening pull requests to verify zero TypeScript type regressions across both the main application and extension surfaces.

### 4. Zero Micro-Interaction Animation & Instant UI Responsiveness
- Do not add artificial transitions or delays (`transition-all`, `duration-200`, `fade-in`, etc.) to micro-interactions such as toggle switches, buttons, menus, dropdowns, or file tree items.
- UI elements must toggle and respond instantly to preserve a crisp, responsive native desktop feel. High-FPS continuous spatial simulations (such as Knowledge Graph physics and Canvas pan/zoom) retain mathematical easing where appropriate.

### 5. MCP Tool Registration for Extensions
- Every extension managing queryable data or user actions must register at least one Model Context Protocol tool via `this.registerTool()`.
- Use snake_case action verbs (`get_`, `list_`, `create_`, `update_`, `delete_`, `search_`).

---

## 4. Documentation & Developer Portal

The Flint developer and user documentation site lives in the `website/` directory.

### Running the Documentation Site Locally
```bash
cd website
npm install
npm run dev
# Open http://localhost:5173
```

### Building the Documentation Site
```bash
cd website
npm run build
```

---

## 5. Pull Request Verification Checklist

Before submitting a pull request, verify the following:

- [ ] `npx tsc --noEmit` passes with 0 errors in the repository root.
- [ ] `npm run build` succeeds without bundling errors.
- [ ] In `website/`, `npx tsc --noEmit` and `npm run build` pass with 0 errors.
- [ ] Native core directories have zero imports from `src/extensions/*`.
- [ ] All new UI components respond instantly with zero artificial transition delays on hover and toggle.
- [ ] Non-obvious architecture and performance invariants are clearly documented with natural JSDoc comments.
