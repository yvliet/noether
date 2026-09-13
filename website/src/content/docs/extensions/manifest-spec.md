# Extension Manifest Specification (`manifest.json`)

Every Noether extension must include a valid `manifest.json` file in its root directory. This manifest provides the host application with metadata needed to discover, load, sandbox, and categorize the extension.


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
  "readme": "# Kanban Boards for Noether\nOrganize tasks across columns..."
}
```


## 2. Field Reference

---

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | Unique identifier for the extension. Must be lowercase alphanumeric with hyphens (e.g., `word-counter`, `kanban-boards`). |
| `name` | `string` | **Yes** | Human-readable title displayed in the extensions manager and community marketplace. |
| `version` | `string` | **Yes** | Version string formatted as standard SemVer `MAJOR.MINOR.PATCH` (`x.y.z`, e.g. `1.0.0`) or extended four-part `MAJOR.MINOR.PATCH.BUILD` (`x.y.z.w` / `x.y.zw`, e.g. `1.0.0.1`). |
| `description` | `string` | **Yes** | Brief one- or two-sentence overview of the extension's capabilities (recommended: 40-160 characters). |
| `minAppVersion` | `string` | No | Minimum version of the Noether host application required for compatibility (e.g., `0.2.0`). Defaults to `0.1.0`. |
| `author` | `string` | No | Name of the author, team, or maintainer. |
| `authorUrl` | `string` | No | Web URL to the author's GitHub profile, portfolio, or documentation site. |
| `tags` | `string[]` | No | Array of category keywords for search and marketplace filtering (e.g., `["productivity", "formatting", "ai"]`). |
| `icon` | `string \| object` | No | Icon glyph name (any HugeIcon name or SVG) or structured icon styling configuration with custom colors and gradients. Emojis are disallowed. |
| `readme` | `string` | No | Full Markdown documentation shown in the Marketplace details modal. |
| `bannerImage` | `string` | No | Relative path (e.g., `assets/banner.png`) or URL to a header image displayed in the marketplace. |
| `isCore` | `boolean` | No | Reserved for Noether internal bundled extensions. Community extensions must omit this or set it to `false`. |

### Icon & Background Customization
The `icon` property is fully dynamic and manifest-driven. Noether automatically resolves any icon without requiring host code changes:

- **HugeIcon String**: Specify any name from the 14,000+ HugeIcons library (e.g., `"clock-01"`, `"git-branch"`, `"cpu"`, `"sparkles"`, `"shield"`). The glyph loads on demand and caches for instant 0ms subsequent renders.
- **Custom Gradients**: Provide an object with `gradientColors` and an optional `gradientDirection`:
  ```json
  "icon": {
    "name": "rocket",
    "gradientColors": ["#ec4899", "#8b5cf6"],
    "gradientDirection": "135deg"
  }
  ```
- **Single Color with Automatic Gradient**: Provide `backgroundColor`. Noether automatically derives a richer companion shadow tone to generate a sleek 2-stop gradient:
  ```json
  "icon": {
    "name": "shield",
    "backgroundColor": "#0ea5e9"
  }
  ```
- **Solid Fills**: Set `"type": "solid"` with `backgroundColor` for a flat background.
- **Automatic Fallback Gradients**: If colors are omitted entirely (e.g., `"icon": "clock-01"`), Noether deterministically hashes the extension ID to assign a consistent, vibrant gradient from its curated palette.
- **SVGs & Vector Marks**: Raw SVG strings and custom vector marks are rendered cleanly inside the tactile squircle. Emojis are strictly disallowed as extension icons.


## 3. Manifest JSON Schema

---

You can validate your `manifest.json` using the official JSON Schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "NoetherExtensionManifest",
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
      "pattern": "^(0|[1-9]\\d*)(\\.(0|[1-9]\\d*))+(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$",
      "description": "SemVer or extended version string."
    },
    "minAppVersion": {
      "type": "string",
      "description": "Minimum Noether application version required."
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
      "oneOf": [
        {
          "type": "string",
          "description": "Icon glyph name from HugeIcons, SVG string, or image URL (emojis disallowed)."
        },
        {
          "type": "object",
          "description": "Structured icon styling configuration with solid or gradient background.",
          "properties": {
            "name": { "type": "string", "description": "Icon glyph name from HugeIcons, SVG string, or image URL (emojis disallowed)." },
            "type": { "type": "string", "enum": ["solid", "gradient"], "description": "Background fill style." },
            "backgroundColor": { "type": "string", "description": "Background hex color for solid fill or automatic 2-stop gradient generation." },
            "gradientColors": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Array of color hex codes or CSS colors for linear gradients."
            },
            "gradientDirection": { "type": ["string", "number"], "description": "Gradient angle or direction (defaults to '135deg')." }
          },
          "required": ["name"]
        }
      ]
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

When Noether boots or loads a new extension, it runs validation on `manifest.json`. Common validation failures include:

1. **Invalid ID Format**: IDs with uppercase letters, spaces, or special characters (`WordCounter` or `my_extension`) will fail. Use kebab-case: `word-counter` or `my-extension`.
2. **Missing Required Fields**: Omitting `description`, `version`, or `name` prevents the extension from loading.
3. **App Version Mismatch**: If `minAppVersion` is higher than the currently running Noether application version, the extension is disabled with an incompatibility notice.


## 5. Related Reading & References

---

- [[Extension Quick Start]]: Build and run your first extension with a valid manifest.
- [[Extension Points Reference]]: Register commands, ribbon icons, and status bar items.
- [[Extension Submission Requirements]]: Guidelines for packaging and distribution.
- [[Developer Policies & Guidelines]]: Best practices for privacy and local-first architecture.
