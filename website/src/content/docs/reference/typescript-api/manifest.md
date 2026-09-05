# TypeScript API: Manifest Specification

Every Flint extension and theme must include a `manifest.json` file in its root folder. This document details the TypeScript type definitions, JSON schema, and validation rules.


## 1. TypeScript Interface

---

```typescript
export interface ExtensionManifest {
  /** Unique lowercase hyphenated identifier (e.g., 'word-counter') */
  id: string;

  /** Human-readable display title */
  name: string;

  /** Semantic version string (e.g., '1.0.0') */
  version: string;

  /** Brief overview of functionality (40-160 characters) */
  description: string;

  /** Minimum host application version required (e.g., '0.2.0') */
  minAppVersion?: string;

  /** Author or maintainer name */
  author?: string;

  /** Link to author's GitHub profile or website */
  authorUrl?: string;

  /** Classification tags for marketplace search */
  tags?: string[];

  /** Icon name from standard catalog or SVG string */
  icon?: string;

  /** Relative path or URL to preview banner */
  bannerImage?: string;

  /** Full markdown readme shown in details view */
  readme?: string;

  /** Package type: 'extension' (default) or 'theme' */
  type?: 'extension' | 'theme';

  /** Reserved for internal host extensions */
  isCore?: boolean;
}
```


## 2. Example `manifest.json`

---

```json
{
  "id": "word-counter",
  "name": "Live Reading Time Counter",
  "version": "1.0.0",
  "minAppVersion": "0.1.0",
  "description": "Calculates estimated reading time for your active note in the status bar.",
  "author": "Yuliet Li",
  "authorUrl": "https://github.com/yvliet",
  "tags": ["productivity", "writing"],
  "icon": "TimerIcon"
}
```


## 3. Validation Rules

---

1. **ID Format**: Must match `^[a-z0-9]+(-[a-z0-9]+)*$` (kebab-case only).
2. **Version**: Must strictly comply with SemVer (`MAJOR.MINOR.PATCH`).
3. **Core Isolation**: Community extensions must omit `isCore` or set it to `false`.
