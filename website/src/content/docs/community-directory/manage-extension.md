# Managing Your Extension

Once you have built an extension, this guide covers versioning strategies, local updates, and handling breaking changes.


## 1. Semantic Versioning (SemVer)

---

Flint follows strict **Semantic Versioning** (`MAJOR.MINOR.PATCH`):

- **MAJOR** (`1.0.0` → `2.0.0`): Incompatible changes, breaking API removals, or substantial SQLite schema revisions.
- **MINOR** (`1.0.0` → `1.1.0`): Backwards-compatible new features, newly added commands, or additional MCP tools.
- **PATCH** (`1.0.0` → `1.0.1`): Backwards-compatible bug fixes and performance optimizations.


## 2. Managing Database Migrations

---

If your extension creates custom SQLite tables as described in [[Events & Relational Storage]], handle table evolution safely without dropping user data:

```typescript
async onload() {
  // Always use CREATE TABLE IF NOT EXISTS
  await this.app.db.execute(`
    CREATE TABLE IF NOT EXISTS plugin_bookmarks (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      title TEXT
    );
  `);

  // Use try/catch for non-destructive column additions
  try {
    await this.app.db.execute(`
      ALTER TABLE plugin_bookmarks ADD COLUMN favorite INTEGER DEFAULT 0;
    `);
  } catch {
    // Column already exists from previous version; safely continue
  }
}
```


## 3. Graceful Cleanups on Unload

---

Whenever an extension is disabled or updated, Flint calls its `onunload()` hook:

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

For more lifecycle details, read [[Flint SDK API Reference]] and [[Developer Policies & Guidelines]].
