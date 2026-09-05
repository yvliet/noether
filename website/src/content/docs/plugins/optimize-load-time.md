# Optimizing Extension Load Time

Flint prioritizes an instant desktop feel with sub-50ms cold startup times. Heavy extensions that block the main thread during initialization degrade application performance. Follow these optimization techniques to keep your extensions light and responsive.


## 1. Lazy-Loading Heavy Dependencies

---

Never import heavy third-party libraries (such as PDF parsers, charting engines, or LaTeX renderers) at the top level of your entry file:

```typescript
// ❌ Slower: Evaluates the heavy bundle immediately on Flint boot
import * as Papa from 'papaparse';

export default class CsvExporterExtension extends Extension {
  async onload() {
    this.addCommand({
      id: 'export-csv',
      title: 'Export Table as CSV',
      action: () => {
        Papa.unparse(...);
      }
    });
  }
}
```

Instead, dynamically import modules when the user actually triggers the action:

```typescript
// ✅ Optimized: Zero startup overhead
export default class CsvExporterExtension extends Extension {
  async onload() {
    this.addCommand({
      id: 'export-csv',
      title: 'Export Table as CSV',
      action: async () => {
        const Papa = await import('papaparse');
        Papa.unparse(...);
      }
    });
  }
}
```


## 2. Offloading to the Web Worker Pool

---

If your extension needs to perform computationally intensive calculations (such as computing graph layouts, generating semantic embeddings, or indexing thousands of blocks), offload the work to Flint's Web Worker thread pool:

```typescript
// Execute heavy work off the UI thread
const result = await this.app.workerPool.runTask({
  taskName: 'heavy-indexing',
  payload: { documentIds },
  timeoutMs: 10000,
});
```

This prevents frame drops and keeps editor input latency under 8ms. Learn more in [[Flint SDK API Reference]].


## 3. Debouncing Database Writes

---

When your extension listens to `document:changed` events to update custom metadata, avoid writing to SQLite on every single keystroke. Keep an in-memory state representation and debounce database persistence:

```typescript
import { Extension } from 'flint';

export default class WordCounterExtension extends Extension {
  private saveDebounceTimer: number | null = null;

  async onload() {
    this.registerEvent(
      this.app.events.on('document:changed', ({ documentId, content }) => {
        this.updateMemoryStats(documentId, content);

        if (this.saveDebounceTimer !== null) {
          window.clearTimeout(this.saveDebounceTimer);
        }
        this.saveDebounceTimer = window.setTimeout(() => {
          this.flushStatsToDatabase(documentId);
        }, 500);
      })
    );
  }
}
```


## 4. Measuring Activation Latency

---

You can benchmark your extension's activation time inside `onload()`:

```typescript
async onload() {
  const start = performance.now();

  // Initialization logic...

  const elapsed = performance.now() - start;
  if (elapsed > 30) {
    console.warn(`[Performance] Extension onload took ${elapsed.toFixed(2)}ms`);
  }
}
```

For more architectural best practices, read [[Micro-Kernel & Extension Architecture]] and [[Developer Policies & Guidelines]].
