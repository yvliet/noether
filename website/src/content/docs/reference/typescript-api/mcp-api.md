# TypeScript API: Model Context Protocol (MCP)

Every extension managing queryable state can expose native AI agent tools and prompts using standard Zod schemas via `this.registerTool()`.

## 1. Registering an AI Tool (`McpZodToolDefinition`)
---

```typescript
import { z } from 'noether';

this.registerTool({
  name: 'calculate_reading_metrics',
  description: 'Calculates word count, reading time, and complexity for a document.',
  schema: z.object({
    documentId: z.string().describe('Target document identifier'),
    targetWpm: z.number().default(200).describe('Words per minute reading baseline'),
  }),
  isDestructive: false,
  handler: async ({ documentId, targetWpm }, app) => {
    const doc = await app.vault.readDocument(documentId);
    const words = (doc?.title || '').split(/\s+/).filter(Boolean).length;
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

## 2. Registering an AI Workflow Prompt (`McpPromptDefinition`)
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

## 3. Core Interface Contracts
---

```typescript
export interface McpToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface McpPromptResult {
  description?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text';
      text: string;
    };
  }>;
}
```

## 4. The Host `ToolRegistry` (`app.tools`)
---

Extensions and host views can inspect and invoke tools programmatically:

- `app.tools.registerTool(tool: McpToolDefinition | McpZodToolDefinition): Disposable`
- `app.tools.unregisterTool(name: string): void`
- `app.tools.getTool(name: string): McpToolDefinition | undefined`
- `app.tools.getAllTools(): McpToolDefinition[]`
- `app.tools.executeTool(name: string, args: Record<string, unknown>): Promise<McpToolResult>`
- `app.tools.registerPrompt(prompt: McpPromptDefinition): Disposable`
- `app.tools.getAllPrompts(): McpPromptDefinition[]`

