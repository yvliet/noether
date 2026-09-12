/**
 * @module docsIndex
 * @description
 * Complete hierarchical tree and lookup registry of Noether developer documentation.
 * Exports structured tree items for the sidebar file tree as well as raw markdown
 * content for instantaneous client-side rendering.
 */

import introRaw from './docs/getting-started/introduction.md?raw';
import installRaw from './docs/getting-started/installation.md?raw';

import editorMarkdownRaw from './docs/user-guide/editor-and-markdown.md?raw';
import linksGraphRaw from './docs/user-guide/links-and-graph.md?raw';
import spatialCanvasRaw from './docs/user-guide/spatial-canvas.md?raw';
import spacedRepetitionRaw from './docs/user-guide/spaced-repetition.md?raw';
import tasksJournalRaw from './docs/user-guide/tasks-and-journal.md?raw';
import vaultsStorageRaw from './docs/user-guide/vaults-and-storage.md?raw';
import shortcutsCommandsRaw from './docs/user-guide/shortcuts-and-commands.md?raw';
import aiMcpRaw from './docs/user-guide/ai-and-mcp.md?raw';

import dualStorageRaw from './docs/architecture/dual-storage.md?raw';
import kernelDesignRaw from './docs/architecture/kernel-design.md?raw';
import quickStartRaw from './docs/extensions/quick-start.md?raw';
import manifestSpecRaw from './docs/extensions/manifest-spec.md?raw';
import extensionPointsRaw from './docs/extensions/extension-points.md?raw';
import mcpToolsRaw from './docs/extensions/mcp-tools.md?raw';
import eventsStorageRaw from './docs/extensions/events-and-storage.md?raw';
import publishingRaw from './docs/extensions/publishing.md?raw';
import syncRaw from './docs/extensions/sync.md?raw';
import moreIconsRaw from './docs/extensions/more-icons.md?raw';

export interface DocItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  path: string;
  content: string;
}

export interface DocFolder {
  id: string;
  title: string;
  icon?: string;
  isFolder: true;
  children: (DocFolder | DocItem)[];
}

export type DocNode = DocFolder | DocItem;

export const isDocFolder = (node: DocNode): node is DocFolder => {
  return 'isFolder' in node && node.isFolder === true;
};

// ── Document Definitions ──

export const DOC_ITEMS: Record<string, DocItem> = {
  'getting-started/introduction': {
    id: 'intro',
    slug: 'getting-started/introduction',
    title: 'Introduction to Noether',
    description: 'What Noether is, local-first architecture, WASM SQLite, and the Vault concept.',
    category: 'Getting Started',
    icon: 'BookOpen01Icon',
    path: 'website/src/content/docs/getting-started/introduction.md',
    content: introRaw,
  },
  'getting-started/installation': {
    id: 'installation',
    slug: 'getting-started/installation',
    title: 'Installation & Setup',
    description: 'Desktop installation across macOS, Windows, and Linux, plus building from source.',
    category: 'Getting Started',
    icon: 'Download01Icon',
    path: 'website/src/content/docs/getting-started/installation.md',
    content: installRaw,
  },
  'user-guide/editor-and-markdown': {
    id: 'editor-and-markdown',
    slug: 'user-guide/editor-and-markdown',
    title: 'Live Preview Editor & Markdown',
    description: 'TipTap/ProseMirror live preview, slash commands, math equations, tables, and callouts.',
    category: 'User Guide',
    icon: 'Edit02Icon',
    path: 'website/src/content/docs/user-guide/editor-and-markdown.md',
    content: editorMarkdownRaw,
  },
  'user-guide/links-and-graph': {
    id: 'links-and-graph',
    slug: 'user-guide/links-and-graph',
    title: 'Links, Backlinks & Graph',
    description: 'Bidirectional linking, visited link tracking, backlinks pane, and 2D physics graph.',
    category: 'User Guide',
    icon: 'Share05Icon',
    path: 'website/src/content/docs/user-guide/links-and-graph.md',
    content: linksGraphRaw,
  },
  'user-guide/spatial-canvas': {
    id: 'spatial-canvas',
    slug: 'user-guide/spatial-canvas',
    title: 'Infinite 2D Spatial Canvas',
    description: 'Visual whiteboarding, note cards, sticky notes, groups, and connector arrows.',
    category: 'User Guide',
    icon: 'Layout01Icon',
    path: 'website/src/content/docs/user-guide/spatial-canvas.md',
    content: spatialCanvasRaw,
  },
  'user-guide/spaced-repetition': {
    id: 'spaced-repetition',
    slug: 'user-guide/spaced-repetition',
    title: 'FSRS Spaced Repetition',
    description: 'Active recall flashcards, FSRS-4.5 scheduling, review deck modal, and memory metrics.',
    category: 'User Guide',
    icon: 'SparklesIcon',
    path: 'website/src/content/docs/user-guide/spaced-repetition.md',
    content: spacedRepetitionRaw,
  },
  'user-guide/tasks-and-journal': {
    id: 'tasks-and-journal',
    slug: 'user-guide/tasks-and-journal',
    title: 'Tasks Dashboard & Journal',
    description: 'Vault-wide task aggregation, kanban boards, and daily reflection scratchpads.',
    category: 'User Guide',
    icon: 'ChecklistIcon',
    path: 'website/src/content/docs/user-guide/tasks-and-journal.md',
    content: tasksJournalRaw,
  },
  'user-guide/vaults-and-storage': {
    id: 'vaults-and-storage',
    slug: 'user-guide/vaults-and-storage',
    title: 'Vaults & Workspace Storage',
    description: 'Vault management, SQLite FTS5 search, soft-delete safety, and sync strategies.',
    category: 'User Guide',
    icon: 'Folder01Icon',
    path: 'website/src/content/docs/user-guide/vaults-and-storage.md',
    content: vaultsStorageRaw,
  },
  'user-guide/shortcuts-and-commands': {
    id: 'shortcuts-and-commands',
    slug: 'user-guide/shortcuts-and-commands',
    title: 'Keyboard Shortcuts & Commands',
    description: 'Command Palette (Ctrl+K), split editor, navigation hotkeys, and editing cheat sheet.',
    category: 'User Guide',
    icon: 'KeyboardIcon',
    path: 'website/src/content/docs/user-guide/shortcuts-and-commands.md',
    content: shortcutsCommandsRaw,
  },
  'user-guide/ai-and-mcp': {
    id: 'ai-and-mcp',
    slug: 'user-guide/ai-and-mcp',
    title: 'AI Assistants & MCP Tools',
    description: 'Connecting Claude Desktop, Antigravity, and Cursor via native Model Context Protocol.',
    category: 'User Guide',
    icon: 'AiChat01Icon',
    path: 'website/src/content/docs/user-guide/ai-and-mcp.md',
    content: aiMcpRaw,
  },
  'architecture/dual-storage': {
    id: 'dual-storage',
    slug: 'architecture/dual-storage',
    title: 'Dual-Storage Architecture',
    description: 'Separation of disk Markdown files and embedded SQLite metadata engine.',
    category: 'Architecture',
    icon: 'DatabaseIcon',
    path: 'website/src/content/docs/architecture/dual-storage.md',
    content: dualStorageRaw,
  },
  'architecture/kernel-design': {
    id: 'kernel-design',
    slug: 'architecture/kernel-design',
    title: 'Micro-Kernel & Isolation',
    description: 'Micro-kernel design, zero native extension leakage, and dependency injection.',
    category: 'Architecture',
    icon: 'CpuIcon',
    path: 'website/src/content/docs/architecture/kernel-design.md',
    content: kernelDesignRaw,
  },
  'extensions/quick-start': {
    id: 'quick-start',
    slug: 'extensions/quick-start',
    title: 'Extension Quick Start',
    description: 'Step-by-step guide to building your first Noether extension in under 5 minutes.',
    category: 'Extension Development',
    icon: 'Rocket01Icon',
    path: 'website/src/content/docs/extensions/quick-start.md',
    content: quickStartRaw,
  },
  'extensions/manifest-spec': {
    id: 'manifest-spec',
    slug: 'extensions/manifest-spec',
    title: 'Manifest Specification',
    description: 'Complete JSON schema and field reference for manifest.json.',
    category: 'Extension Development',
    icon: 'FileCode01Icon',
    path: 'website/src/content/docs/extensions/manifest-spec.md',
    content: manifestSpecRaw,
  },
  'extensions/extension-points': {
    id: 'extension-points',
    slug: 'extensions/extension-points',
    title: 'UI Extension Points',
    description: 'Registering Action Rail icons, Command Palette entries, Status Bar items, Context Menus, and Views.',
    category: 'Extension Development',
    icon: 'Layout01Icon',
    path: 'website/src/content/docs/extensions/extension-points.md',
    content: extensionPointsRaw,
  },
  'extensions/more-icons': {
    id: 'more-icons',
    slug: 'extensions/more-icons',
    title: 'More icons Extension',
    description: 'Custom file and folder icons, Lucide and Hugeicons catalogs, and automated MCP icon tools.',
    category: 'Extension Development',
    icon: 'SparklesIcon',
    path: 'website/src/content/docs/extensions/more-icons.md',
    content: moreIconsRaw,
  },
  'extensions/mcp-tools': {
    id: 'mcp-tools',
    slug: 'extensions/mcp-tools',
    title: 'Model Context Protocol (MCP)',
    description: 'Exposing native AI agent tools and prompts with JSON Schema and Zod validation.',
    category: 'Extension Development',
    icon: 'AiChat01Icon',
    path: 'website/src/content/docs/extensions/mcp-tools.md',
    content: mcpToolsRaw,
  },
  'extensions/events-and-storage': {
    id: 'events-and-storage',
    slug: 'extensions/events-and-storage',
    title: 'Events & Relational Storage',
    description: 'Subscribing to the EventBus, managing settings, and creating declarative SQLite tables.',
    category: 'Extension Development',
    icon: 'Activity01Icon',
    path: 'website/src/content/docs/extensions/events-and-storage.md',
    content: eventsStorageRaw,
  },
  'extensions/publishing': {
    id: 'publishing',
    slug: 'extensions/publishing',
    title: 'Publishing to Marketplace',
    description: 'Submitting extensions via the Web Portal or CLI to the Noether community marketplace.',
    category: 'Extension Development',
    icon: 'Upload01Icon',
    path: 'website/src/content/docs/extensions/publishing.md',
    content: publishingRaw,
  },
  'extensions/sync': {
    id: 'sync',
    slug: 'extensions/sync',
    title: 'Sync',
    description: 'Sync notes across devices using free cloud databases (Supabase, Turso, Cloudflare D1, REST).',
    category: 'Extension Development',
    icon: 'DatabaseSync01Icon',
    path: 'website/src/content/docs/extensions/sync.md',
    content: syncRaw,
  },
};

// ── Hierarchical Navigation Tree ──

export const docsTree: DocFolder[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    isFolder: true,
    children: [
      DOC_ITEMS['getting-started/introduction'],
      DOC_ITEMS['getting-started/installation'],
    ],
  },
  {
    id: 'user-guide',
    title: 'User Guide',
    isFolder: true,
    children: [
      DOC_ITEMS['user-guide/editor-and-markdown'],
      DOC_ITEMS['user-guide/links-and-graph'],
      DOC_ITEMS['user-guide/spatial-canvas'],
      DOC_ITEMS['user-guide/spaced-repetition'],
      DOC_ITEMS['user-guide/tasks-and-journal'],
      DOC_ITEMS['user-guide/vaults-and-storage'],
      DOC_ITEMS['user-guide/shortcuts-and-commands'],
      DOC_ITEMS['user-guide/ai-and-mcp'],
    ],
  },
  {
    id: 'architecture',
    title: 'Architecture',
    isFolder: true,
    children: [
      DOC_ITEMS['architecture/dual-storage'],
      DOC_ITEMS['architecture/kernel-design'],
    ],
  },
  {
    id: 'extensions',
    title: 'Extension Development',
    isFolder: true,
    children: [
      DOC_ITEMS['extensions/quick-start'],
      DOC_ITEMS['extensions/manifest-spec'],
      DOC_ITEMS['extensions/extension-points'],
      DOC_ITEMS['extensions/more-icons'],
      DOC_ITEMS['extensions/mcp-tools'],
      DOC_ITEMS['extensions/events-and-storage'],
      DOC_ITEMS['extensions/publishing'],
      DOC_ITEMS['extensions/sync'],
    ],
  },
];

// ── Flat Helpers & Lookups ──

export const docsFlatList: DocItem[] = Object.values(DOC_ITEMS);

export function getDocBySlug(slug: string): DocItem | undefined {
  const normalized = slug.replace(/^\/+|\/+$/g, '');
  return DOC_ITEMS[normalized];
}

export function getFirstDoc(): DocItem {
  return DOC_ITEMS['getting-started/introduction'];
}

export function getAdjacentDocs(currentSlug: string): {
  prev?: DocItem;
  next?: DocItem;
} {
  const index = docsFlatList.findIndex((item) => item.slug === currentSlug);
  if (index === -1) return {};

  return {
    prev: index > 0 ? docsFlatList[index - 1] : undefined,
    next: index < docsFlatList.length - 1 ? docsFlatList[index + 1] : undefined,
  };
}
