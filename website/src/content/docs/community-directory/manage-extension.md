# Managing Your Extension

Once you have built an extension, this guide covers versioning strategies, local updates, and handling breaking changes.


## 1. Semantic Versioning & Release Formats

---

Noether supports standard **Semantic Versioning** (`MAJOR.MINOR.PATCH` / `x.y.z`) as well as extended four-part versioning (`MAJOR.MINOR.PATCH.BUILD` / `x.y.z.w` / `x.y.zw`) for granular sub-patch releases:

- **MAJOR** (`1.0.0` → `2.0.0`): Incompatible changes, breaking API removals, or substantial SQLite schema revisions.
- **MINOR** (`1.0.0` → `1.1.0`): Backwards-compatible new features, newly added commands, or additional MCP tools.
- **PATCH** (`1.0.0` → `1.0.1`): Backwards-compatible bug fixes and performance optimizations.
- **BUILD / REVISION** (`1.0.1.1` → `1.0.1.2`): Minor build revisions, hotfixes, or packaging updates.


## 2. Managing Database Migrations

---

If your extension creates custom SQLite tables as described in [[Events & Relational Storage]], handle table evolution safely without dropping user data:

```typescript
async onload() {
  // Always use CREATE TABLE IF NOT EXISTS
  await this.app.db.execute(`
    CREATE TABLE IF NOT EXISTS ext_bookmarks (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT
    );
  `);

  // Use try/catch for non-destructive column additions
  try {
    await this.app.db.execute(`
      ALTER TABLE ext_bookmarks ADD COLUMN favorite INTEGER DEFAULT 0;
    `);
  } catch {
    // Column already exists from previous version; safely continue
  }
}
```


## 3. Graceful Cleanups on Unload

---

Whenever an extension is disabled or updated, Noether calls its `onunload()` hook:

- All commands, ribbon icons, status bar widgets, and event listeners registered through `this.add*` and `this.registerEvent` are disposed of automatically.
- Manually terminate any active interval timers (`clearInterval`), WebSockets, or worker tasks in `onunload()`.

```typescript
export default class SyncExtension extends Extension {
  private syncTimer: number | null = null;

  async onload() {
    this.syncTimer = window.setInterval(() => this.runSync(), 60000);
  }

  async onunload() {
    if (this.syncTimer !== null) {
      window.clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}
```

## 4. Native Extension Updates & Automatic Synchronisation

---

Noether features an autonomous multi-tier update manager (`app.extensions.updater`) that keeps community extensions synchronized with remote repositories and registries:

- **Resilient 5-Tier Fallback Pipeline**: Noether queries distribution bundles in deterministic order: (1) Official registry endpoints, (2) Turso edge replicas, (3) GitHub Releases (`releases/latest/download/main.js`), (4) Raw GitHub CDNs, and (5) Local Vault caches.
- **In-App Checking & Updates**: Users can trigger "Check for updates" or "Update all" from Settings → Community Extensions, or upgrade directly via the Community Marketplace.
- **Zero Restart Required**: Noether automatically invokes the extension unload lifecycle, writes the updated bundle to `.noether/extensions/<id>/`, evaluates the new bundle in memory, and re-enables the extension seamlessly.

For more lifecycle details, read [[Noether SDK API Reference]] and [[Developer Policies & Guidelines]].

