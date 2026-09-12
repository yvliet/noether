# Community Extensions Marketplace

Discover, install, update, and manage extensions and themes to expand your Noether experience.

---

## 1. Overview & User Experience

Every person thinks and takes notes differently. Whether you need an AI copilot, flashcard spaced repetition, specialized export formats, or unique visual themes, Noether is designed to bend to your workflow.

The **Community Extensions Marketplace** provides a built-in app store directly inside Noether. You can explore curated extensions created by the community, inspect their documentation and screenshots, install them with a single click, and keep them updated safely.

### Where It Lives in Noether
- **Left Action Rail**: Click the storefront icon on the action rail to launch the Marketplace.
- **Settings Window**: Access installed extensions and discover new ones under **Settings** (`Ctrl+,`) → **Community Extensions**.
- **Command Palette**: Press `Ctrl+K` and type "Browse extension marketplace" to open the store tab.

## 2. Features & Step-by-Step Guide

### 1. Browsing & Discovering Extensions
1. Open the **Marketplace** from the Left Action Rail or Command Palette.
2. Filter by category (e.g. **Productivity**, **AI & Automation**, **Themes**, **Visual & Drawing**).
3. Type keywords in the search bar to find extensions matching specific tools or features.
4. Click any extension card to open its full documentation README, release version notes, and author profile.

### 2. Installing an Extension
1. Click **Install** on any extension card.
2. Noether downloads the compiled bundle directly from the decentralized registry and verifies its SHA256 integrity checksum.
3. The extension is placed into your vault's `.noether/extensions/<id>/` folder.
4. Toggle the switch to **Enable**. Its commands, views, and action buttons appear immediately without restarting the application.

### 3. Updating & Uninstalling
- **Check for Updates**: When a new version is published to the registry, an **Update** badge appears beside the extension. Click **Update** to upgrade seamlessly.
- **Uninstall**: Click **Uninstall** from Settings or the Marketplace card to safely disable the extension and remove its files.

## 3. Architecture & SDK Blueprint (For Extension Builders)

The Marketplace extension coordinates dynamic runtime module loading, bundle integrity verification, and communication with the global Turso community registry.

### Dynamic Sandboxed Loading Pipeline
When a user installs an extension:
1. **Payload Retrieval**: The bundle JavaScript (`dist/main.js`), stylesheet (`dist/styles.css`), and `manifest.json` are retrieved from the registry API.
2. **Sandbox Evaluation**: Code runs in a secure CommonJS sandbox where host dependencies (`react`, `zustand`, `clsx`, `zod`, `noether`) are forwarded directly from the Noether runtime.
3. **Lifecycle Execution**: `ExtensionManager` instantiates the extension class and calls `onload()`.
4. **Clean Teardown**: When disabled, `onunload()` tears down DOM styles, listeners, and intervals automatically.

### Publishing Workflow for Extension Builders

Community extensions live in their own standalone GitHub repositories (e.g. `yvliet/<extension-id>`). To publish your extension to the Marketplace:

1. **Build Your Distribution**:
   ```bash
   npm run build
   ```
2. **Publish via the Noether CLI Tool**:
   ```bash
   npx tsx scripts/publish-extension.ts path/to/<extension-folder>
   ```
3. **Automated GitHub Actions Publishing**:
   You can configure a GitHub Action to publish automatically whenever you create a GitHub Release tag (`vX.Y.Z`). Once published, your extension appears instantly in the in-app Marketplace for all Noether users worldwide.

## 4. MCP Tools Reference

Marketplace registers two MCP tools for automated package inspection:

### 1. `marketplace_list_installed`
- **Description**: Returns all currently installed extensions (both core built-in and community extensions) along with their version numbers and enabled states.
- **Parameters**: None.
- **Returns**: Array of extension records with `id`, `name`, `version`, `isEnabled`, and `isCore`.

### 2. `marketplace_search`
- **Description**: Queries the community extension catalog by search term.
- **Parameters**:
  - `query` (string, required): Keyword matching against name, description, category, or author.
- **Returns**: Array of matching extension candidates with download counts, stars, and installation status.
