# Events & Relational Storage

Flint provides two foundational primitives for data management in extensions:
1. **The Typed EventBus**: For reactive real-time notifications when documents are saved, opened, or deleted.
2. **Declarative Relational Storage**: For high-performance SQLite tables and lightweight JSON key-value persistence.


## 1. The Central EventBus

---

Flint uses a strongly-typed publish-subscribe event system. Subscribing via `this.onEvent()` registers a listener that automatically unregisters when your extension is unloaded.

```typescript
import { Extension } from 'flint';

export default class EventWatcherExtension extends Extension {
  async onload() {
    // 1. Document Saved Event
    this.onEvent('document:saved', ({ id, title }) => {
      console.log(`Document saved: "${title}" (${id})`);
    });

    // 2. Document Deleted Event (Crucial for cleaning up extension data)
    this.onEvent('document:deleted', ({ id }) => {
      console.log(`Document deleted: ${id}`);
      this.cleanupDocumentMetadata(id);
    });

    // 3. Tab Changed Event
    this.onEvent('tab:changed', ({ activeTabId }) => {
      console.log(`Active tab changed to: ${activeTabId}`);
    });

    // 4. Hearth/Vault Loaded Event
    this.onEvent('vault:loaded', ({ path, name }) => {
      console.log(`Loaded Hearth "${name}" at ${path}`);
    });
  }

  private async cleanupDocumentMetadata(docId: string) {
    // Clean up SQLite records associated with the deleted note
  }
}
```

### Key Workspace Events

| Event Key | Payload | Description |
| :--- | :--- | :--- |
| `'document:opened'` | `{ id: string, title: string }` | Fires when a document is viewed in an editor tab. |
| `'document:saved'` | `{ id: string, title: string }` | Fires immediately after a note is serialized to disk and indexed. |
| `'document:deleted'` | `{ id: string }` | Fires when a note is permanently deleted or moved to trash. |
| `'document:renamed'` | `{ id: string, oldTitle: string, newTitle: string }` | Fires when a note is renamed. |
| `'tab:changed'` | `{ activeTabId: string \| null }` | Fires when the user switches tabs. |
| `'view:mode-changed'` | `{ mode: string }` | Fires when toggling between Live Preview (`Visible`) and Source Markdown (`Source`). |
| `'mcp:tool-called'` | `{ toolName: string, args: Record<string, unknown>, source: string }` | Fires when an in-app or external AI client invokes an MCP tool. |


## 2. Lightweight JSON Settings (`loadData` & `saveData`)

---

For simple plugin configuration (such as API keys, user preferences, or toggle states), use `this.loadData()` and `this.saveData()`. Data is serialized as JSON in `.flint/extensions/<plugin-id>/data.json`.

```typescript
interface MyPluginConfig {
  autoSummarize: boolean;
  refreshInterval: number;
  tagsToWatch: string[];
}

const DEFAULT_CONFIG: MyPluginConfig = {
  autoSummarize: false,
  refreshInterval: 300,
  tagsToWatch: ['#project', '#review'],
};

export default class ConfigurableExtension extends Extension {
  private config: MyPluginConfig = DEFAULT_CONFIG;

  async onload() {
    // Load stored settings or fall back to defaults
    const loaded = await this.loadData<MyPluginConfig>();
    this.config = Object.assign({}, DEFAULT_CONFIG, loaded);

    console.log('Current config:', this.config);
  }

  async updateAutoSummarize(enabled: boolean) {
    this.config.autoSummarize = enabled;
    // Persist changes to disk
    await this.saveData(this.config);
  }
}
```


## 3. Declarative Relational SQLite Tables (`this.defineTable`)

---

When your extension manages structured, relational, or high-volume data (such as flashcard review logs, canvas node vectors, or task audit trails), JSON files become slow and inefficient.

Flint allows extensions to **declare typed SQLite tables** directly within the Hearth's embedded database via `this.defineTable()`:

```typescript
import { Extension, ExtensionTable } from 'flint';

interface FlashcardRow {
  id: string;
  documentId: string;
  front: string;
  back: string;
  repetition: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewDate: number;
}

export default class SpacedRepetitionExtension extends Extension {
  private cardsTable!: ExtensionTable<FlashcardRow>;

  async onload() {
    // 1. Declare the SQLite schema with automatic migration handling
    this.cardsTable = await this.defineTable<FlashcardRow>({
      tableName: 'flashcards',
      version: 1,
      columns: {
        id: { type: 'text', primaryKey: true },
        documentId: {
          type: 'text',
          nullable: false,
          references: { table: 'documents', column: 'id', onDelete: 'cascade' },
        },
        front: { type: 'text', nullable: false },
        back: { type: 'text', nullable: false },
        repetition: { type: 'integer', default: 0 },
        intervalDays: { type: 'real', default: 0.0 },
        easeFactor: { type: 'real', default: 2.5 },
        nextReviewDate: { type: 'integer', indexed: true },
      },
      indexes: [
        { name: 'idx_flashcards_due', columns: ['nextReviewDate'] },
        { name: 'idx_flashcards_doc', columns: ['documentId'] },
      ],
      teardownPolicy: 'drop-on-uninstall',
    });

    // 2. Perform CRUD queries
    await this.addCard('note-101', 'What is WAL mode in SQLite?', 'Write-Ahead Logging.');
    const dueCards = await this.getDueCards();
    console.log(`Found ${dueCards.length} cards due for review.`);
  }

  async addCard(documentId: string, front: string, back: string) {
    await this.cardsTable.insert({
      id: crypto.randomUUID(),
      documentId,
      front,
      back,
      repetition: 0,
      intervalDays: 1.0,
      easeFactor: 2.5,
      nextReviewDate: Date.now() + 86400000,
    });
  }

  async getDueCards(): Promise<FlashcardRow[]> {
    return this.cardsTable.select({
      where: { nextReviewDate: Date.now() },
      orderBy: 'nextReviewDate',
      orderDirection: 'ASC',
      limit: 50,
    });
  }
}
```

### Features of `defineTable()`
- **Foreign Key Cascade**: Columns referencing `documents(id)` with `onDelete: 'cascade'` are cleaned up automatically when the user deletes a note.
- **Automated Versioned Migrations**: Declare a `migrations` map for seamless schema evolution across plugin versions.
- **Teardown Safety**: When `teardownPolicy: 'drop-on-uninstall'` is specified, Flint removes the table upon extension uninstallation, leaving no database bloat behind.


## 4. Off-Thread Web Workers (`this.registerWorkerTask`)

---

For computationally heavy tasks (such as semantic vector embeddings, image hashing, or large graph layout computations), Flint provides an off-thread Web Worker pool to preserve 60 FPS typing performance.

```typescript
// 1. Register the task in onload()
this.registerWorkerTask('calculate-embeddings', async (input: { texts: string[] }, emitEvent) => {
  const vectors = [];
  for (let i = 0; i < input.texts.length; i++) {
    // Perform intensive vector calculation
    vectors.push(new Float32Array(384));
    emitEvent('embedding:progress', { percent: ((i + 1) / input.texts.length) * 100 });
  }
  return vectors;
});

// 2. Execute off-thread when needed
const embeddings = await this.runTask('calculate-embeddings', { texts: ['Hello world', 'Local first'] });
```


## 5. Related Reading & References

---

- [[Database Schema Reference]]: Inspect Flint's internal SQLite tables and indexes.
- [[Dual-Storage Architecture]]: Understand how in-memory SQLite syncs with disk Markdown.
- [[Flint SDK API Reference]]: Complete EventBus signatures and database manager interfaces.
- [[Optimizing Extension Load Time]]: Best practices for debouncing database writes.
- [[Model Context Protocol (MCP) Tools]]: Expose database-backed queries to AI agents.
