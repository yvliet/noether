# TypeScript API: Model Context Protocol (MCP)

Every extension managing queryable state can expose native AI agent tools and prompts using standard Zod schemas via `this.registerTool()`.


## 1. Registering an AI Tool

---

```typescript
import { z } from 'flint';

this.registerTool({
  name: 'calculate_reading_metrics',
  description: 'Calculates word count, reading time, and complexity for a document.',
  schema: z.object({
    documentId: z.string().describe('Target document identifier'),
    targetWpm: z.number().default(200).describe('Words per minute reading baseline'),
  }),
  handler: async ({ documentId, targetWpm }, app) => {
    const doc = await app.vault.readNote(documentId);
    const words = (doc?.content || '').split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(words / targetWpm);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ documentId, words, estimatedMinutes: minutes }),
        },
      ],
    };
  },
});
```


## 2. Registering an AI Workflow Prompt

---

```typescript
this.registerPrompt({
  name: 'summarize_reading_digest',
  description: 'Prepares a structured synthesis prompt for the user active reading list.',
  arguments: [
    { name: 'category', description: 'Category filter', required: false },
  ],
  getMessages: async ({ category }, app) => {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please generate a reading digest summary for category: ${category || 'all'}.`,
          },
        },
      ],
    };
  },
});
```
