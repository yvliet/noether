# Reactive EventBus & State Pipeline

An architectural guide to state distribution, reactive event streaming, and lifecycle contracts in Noether.

## 1. The Typed EventBus Contract
---

Rather than allowing extensions or UI components to reach directly into native stores, Noether coordinates inter-subsystem communication through a centralized, strongly typed **EventBus** (`src/core/events/EventBus.ts`).

```
┌─────────────────────────────────────────────────────────────┐
│                       Event Producers                       │
│   • Document Editor (save)     • File Watcher (change)      │
│   • Workspace Tabs (open/close)• Settings Window (toggle)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Dispatches Typed Event
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Noether EventBus Hub                     │
│   document:saved • document:deleted • vault:opened • ...    │
└───────────────┬───────────────────────────────┬─────────────┘
                │                               │
                ▼                               ▼
┌───────────────────────────────┐ ┌───────────────────────────┐
│     Native Relational Index   │ │    Community Extensions   │
│   Updates FTS5 & Graph Edges  │ │   Word Counter, Sync, ... │
└───────────────────────────────┘ └───────────────────────────┘
```

### Core Lifecycle Events

The EventBus manages standard events that describe the lifecycle of notes and workspace states:

| Event Name | Payload | Emitted When |
| :--- | :--- | :--- |
| `document:saved` | `{ path: string, content: string, frontmatter: Record<string, any> }` | A note has successfully flushed to disk and committed to SQLite WAL. |
| `document:deleted` | `{ path: string }` | A note is moved to trash or removed from disk. |
| `document:renamed` | `{ oldPath: string, newPath: string }` | A note file or folder is moved or renamed. |
| `vault:opened` | `{ rootPath: string, name: string }` | The user opens or switches to a different Vault. |
| `settings:updated` | `{ key: string, value: any }` | A workspace or application configuration setting changes. |

## 2. Inversion of Control & Extension Subscriptions
---

When an extension needs to react to note changes (such as the Word Counter or Spaced Repetition engine), it subscribes through the SDK during its `onload()` hook:

```typescript
import { Extension } from 'noether';

export default class WordCounterExtension extends Extension {
  async onload(): Promise<void> {
    // Subscribe to note saves
    this.registerEvent(
      this.app.events.on('document:saved', ({ path, content }) => {
        this.updateWordCount(path, content);
      })
    );
  }
}
```

The `registerEvent()` method registers the listener with the extension's internal disposables registry. When the extension is uninstalled, disabled, or the vault switches, `onunload()` automatically unsubscribes all listeners cleanly without memory leaks.

## 3. Zustand Store Partitioning
---

Noether splits application state across isolated, lightweight **Zustand** stores rather than maintaining one massive monolithic store:

1. **`documentStore`**: Manages the list of open tabs, active document buffers, recent notes list, and dirty edit states.
2. **`workspaceStore`**: Tracks spatial layout geometry, left and right sidebar visibility, docked graph mode, and split-editor panes.
3. **`settingsStore`**: Handles persistent user configurations (theme palette, editor typography, default note locations, keybindings).
4. **`editorStore`**: Tracks transient cursor positions, active line numbers, selection word counts, and search-and-replace matches.

This partition ensures that typing a single character in the editor only updates the focused buffer and transient status bar without triggering rerenders across the file tree, graph widget, or sidebar.
