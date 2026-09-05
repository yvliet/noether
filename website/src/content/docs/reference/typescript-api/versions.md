# TypeScript API: Versioning & Compatibility

Flint uses strict Semantic Versioning (`MAJOR.MINOR.PATCH`) to guarantee API compatibility and prevent breaking changes from affecting installed community extensions and themes.


## 1. The `minAppVersion` Field

---

Extensions specify their minimum required host application version in `manifest.json`:

```json
{
  "minAppVersion": "0.2.0"
}
```

### Compatibility Check Logic
- If the current Flint version is `< minAppVersion`, Flint displays an incompatibility badge in **Settings > Extensions** and does not execute `onload()`.
- If `minAppVersion` is omitted, Flint defaults to `"0.1.0"`.


## 2. API Version Stability Matrix

---

| API Surface | Stability Guarantee | Breaking Change Policy |
| :--- | :--- | :--- |
| **`Extension` Base Class** | Stable | Guaranteed backwards-compatible across minor versions. |
| **`app.workspace`** | Stable | Deprecated methods provide a 2-minor-version grace period. |
| **`app.vault`** | Stable | Asynchronous atomic file operations remain stable. |
| **`app.events` (EventBus)** | Stable | Event payloads are strictly additive. |
| **`this.defineTable` (SQLite)**| Stable | Columns automatically migrate with non-destructive ALTERs. |
| **`this.registerTool` (MCP)** | Stable | Compliant with Model Context Protocol standards. |


## 3. Deprecation Best Practices

---

When an API is marked for deprecation:
1. Flint logs a runtime warning in the developer console.
2. The method remains functional until the next major version bump (`1.0.0`).
3. Extensions can feature-detect capabilities:

```typescript
if (typeof this.app.workspace.showInputDialog === 'function') {
  await this.app.workspace.showInputDialog({ title: 'Enter Name' });
} else {
  // Fallback for older versions
}
```
