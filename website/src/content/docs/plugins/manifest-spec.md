# Extension Manifest Specification (`manifest.json`)

Every Flint extension must include a valid `manifest.json` file in its root directory. This manifest provides the host application with metadata needed to discover, load, sandbox, and categorize the extension.


## 1. Example Manifest

---

```json
{
  "id": "kanban-boards",
  "name": "Kanban Boards & Sprint Planner",
  "version": "1.2.0",
  "minAppVersion": "0.2.0",
  "description": "Visual drag-and-drop boards integrated with markdown tasks and SQLite metadata.",
  "author": "Yuliet Li",
  "authorUrl": "https://github.com/yvliet",
  "tags": ["productivity", "visualization", "tasks"],
  "icon": "ViewBoardIcon",
  "bannerImage": "assets/banner.png",
  "readme": "# Kanban Boards for Flint\nOrganize tasks across columns..."
}
```


## 2. Field Reference

---

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | Unique identifier for the extension. Must be lowercase alphanumeric with hyphens (e.g., `word-counter`, `kanban-boards`). |
| `name` | `string` | **Yes** | Human-readable title displayed in the extensions manager and community marketplace. |
| `version` | `string` | **Yes** | Semantic versioning string formatted as `MAJOR.MINOR.PATCH` (e.g., `1.0.0`). |
| `description` | `string` | **Yes** | Brief one- or two-sentence overview of the extension's capabilities (recommended: 40-160 characters). |
| `minAppVersion` | `string` | No | Minimum version of the Flint host application required for compatibility (e.g., `0.2.0`). Defaults to `0.1.0`. |
| `author` | `string` | No | Name of the author, team, or maintainer. |
| `authorUrl` | `string` | No | Web URL to the author's GitHub profile, portfolio, or documentation site. |
| `tags` | `string[]` | No | Array of category keywords for search and marketplace filtering (e.g., `["productivity", "formatting", "ai"]`). |
| `icon` | `string` | No | Icon identifier (matching standard icon names) or custom SVG string for display in cards. |
| `readme` | `string` | No | Full Markdown documentation shown in the Marketplace details modal. |
| `bannerImage` | `string` | No | Relative path (e.g., `assets/banner.png`) or URL to a header image displayed in the marketplace. |
| `isCore` | `boolean` | No | Reserved for Flint internal bundled extensions. Community extensions must omit this or set it to `false`. |


## 3. Manifest JSON Schema

---

You can validate your `manifest.json` using the official JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FlintExtensionManifest",
  "type": "object",
  "required": ["id", "name", "version", "description"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$",
      "description": "Unique, lowercase hyphenated extension identifier."
    },
    "name": {
      "type": "string",
      "minLength": 2,
      "maxLength": 60,
      "description": "Display name of the extension."
    },
    "version": {
      "type": "string",
      "pattern": "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$",
      "description": "SemVer version string."
    },
    "minAppVersion": {
      "type": "string",
      "description": "Minimum Flint application version required."
    },
    "description": {
      "type": "string",
      "minLength": 10,
      "maxLength": 300,
      "description": "Short summary of the extension."
    },
    "author": {
      "type": "string",
      "description": "Author or maintainer name."
    },
    "authorUrl": {
      "type": "string",
      "format": "uri",
      "description": "URL to the author's website or profile."
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Search categories and classification tags."
    },
    "icon": {
      "type": "string",
      "description": "Icon identifier or SVG markup."
    },
    "bannerImage": {
      "type": "string",
      "description": "Relative asset path or URL for marketplace banner."
    },
    "readme": {
      "type": "string",
      "description": "Markdown formatted readme text."
    },
    "isCore": {
      "type": "boolean",
      "description": "True only for internal host extensions."
    }
  },
  "additionalProperties": false
}
```


## 4. Validation Rules & Common Errors

---

When Flint boots or loads a new extension, it runs validation on `manifest.json`. Common validation failures include:

1. **Invalid ID Format**: IDs with uppercase letters, spaces, or special characters (`WordCounter` or `my_plugin`) will fail. Use kebab-case: `word-counter` or `my-plugin`.
2. **Missing Required Fields**: Omitting `description`, `version`, or `name` prevents the extension from loading.
3. **App Version Mismatch**: If `minAppVersion` is higher than the currently running Flint application version, the extension is disabled with an incompatibility notice.


## 5. Related Reading & References

---

- [[Plugin Quick Start]]: Build and run your first extension with a valid manifest.
- [[Extension Points Reference]]: Register commands, ribbon icons, and status bar items.
- [[Plugin Submission Requirements]]: Guidelines for packaging and distribution.
- [[Developer Policies & Guidelines]]: Best practices for privacy and local-first architecture.
