# Contributing to Flint

Thanks for taking a look at contributing! Flint is an open-source, local-first note-taking app. It's built with React and TypeScript on the frontend, and Tauri v2 with Rust SQLite on the backend.

Whether you're fixing a bug, improving the docs, or adding an extension, any help is appreciated.

## Getting Set Up

Here's what you need to build and run Flint locally:

- **Node.js**: `v18.0.0` or higher
- **npm** or **pnpm**
- **Rust Toolchain**: `cargo >= 1.75` (for compiling the desktop app)
  - Windows: Visual Studio C++ Build Tools
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Linux: Standard WebKit packages (`libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `libssl-dev`, `libgtk-3-dev`)

Clone the repo and install dependencies:

```bash
git clone https://github.com/yvliet/Flint.git
cd flint
npm install
```

## Running the App

To run the desktop app with the Rust backend:
```bash
npm run app
```

If you just want to tweak UI components quickly in your browser without compiling Rust, you can run the Vite dev server:
```bash
npm run dev
# Accessible at http://localhost:5173
```

To build production installers:
```bash
# Frontend build & typecheck
npm run build

# Native desktop binary & installer (.msi / .dmg / .AppImage)
npm run tauri:build
```

## A Few Guidelines

To keep Flint fast and pleasant to work on, here are a few things to keep in mind:

### 1. Keep core code separate from extensions
Core folders (`src/core`, `src/lib`, `src/store`, `src/components`, `src/types`, `src/sdk`) should never import anything from `src/extensions/*`. Built-in features like Canvas or Tasks talk to the core through the Flint SDK (`src/sdk`), event bus, and extension registries, just like community extensions do.

### 2. Don't call platform APIs directly in UI code
Avoid calling Tauri or Node APIs directly inside React components or stores. Instead, route them through [`src/lib/platform/platformAdapter.ts`](../src/lib/platform/platformAdapter.ts) so things stay clean and testable.

### 3. Native desktop feel
I want Flint to feel like a true native desktop tool. Classic desktop apps don't make you wait around for a button to fade in or a menu to slowly drop down, so we keep controls instant. Clicks, toggles, and menus should snap into place immediately. The only animations that make sense are continuous spatial interactions like zooming on the canvas or force layout in the knowledge graph.

### 4. Type checking
Make sure `npx tsc --noEmit` runs with zero errors before opening a PR.

## Documentation Site

The documentation website lives in the `website/` directory.

To run it locally:
```bash
cd website
npm install
npm run dev
```

To build it:
```bash
cd website
npm run build
```

## Pull Request Checklist

Before submitting:
- [ ] `npx tsc --noEmit` passes with 0 errors in the project root.
- [ ] `npm run build` succeeds.
- [ ] Core folders don't import from `src/extensions/*`.
- [ ] UI controls (buttons, menus, tabs) snap into place immediately without decorative fade or slide delays.
- [ ] New features or non-obvious code have brief, clear comments explaining why they work the way they do.
