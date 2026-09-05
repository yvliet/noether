# Flint Extension Starter

Official template for building, testing, and publishing standalone community extensions for [Flint](https://flintnotes.com).

## 1. Quick Start
---

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Build the Extension**:
   ```bash
   npm run build
   ```
   This compiles `src/index.ts` into `dist/main.js`.

3. **Development with Live Watch**:
   ```bash
   npm run watch
   ```

## 2. Local Testing in Flint
---

To test your extension live in Flint:
1. Open Flint Settings → **Community extensions** → **Open extensions folder**.
2. Create a folder named after your extension ID (e.g. `flint-sample-extension`).
3. Copy `manifest.json` and `dist/main.js` (and optional `dist/styles.css`) into that folder.
4. Click **Reload extensions** in Flint.

## 3. Publishing to the Flint Community Registry
---

1. Push a git tag (e.g., `v1.0.0`):
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. The included GitHub Action (`.github/workflows/publish.yml`) will automatically build and publish your bundle to the remote Flint Registry.

## 4. Architecture Invariants
---

- **Sandbox Externals**: `react`, `react-dom`, `zod`, and `flint` are provided by the Flint desktop runtime. Never bundle duplicate copies of React.
- **Strict Isolation**: Extensions communicate with Flint solely through the `Extension` base class and the EventBus.
