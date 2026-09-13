import { DocNode } from '../types';

import homeRaw from '../content/help/home.md?raw';
import introRaw from '../content/help/getting-started/introduction.md?raw';
import installRaw from '../content/help/getting-started/installation.md?raw';

import editorMarkdownRaw from '../content/help/user-guide/editor-and-markdown.md?raw';
import linksGraphRaw from '../content/help/user-guide/links-and-graph.md?raw';
import spatialCanvasRaw from '../content/help/user-guide/spatial-canvas.md?raw';
import spacedRepetitionRaw from '../content/help/user-guide/spaced-repetition.md?raw';
import tasksJournalRaw from '../content/help/user-guide/tasks-and-journal.md?raw';
import vaultsStorageRaw from '../content/help/user-guide/vaults-and-storage.md?raw';
import shortcutsCommandsRaw from '../content/help/user-guide/shortcuts-and-commands.md?raw';
import aiMcpRaw from '../content/help/user-guide/ai-and-mcp.md?raw';

import workflowsRaw from '../content/help/workflows/workflows-and-strategies.md?raw';
import faqRaw from '../content/help/faq/user-faq.md?raw';

export const HELP_TREE: DocNode[] = [
  {
    id: 'home',
    title: 'Home',
    slug: 'home',
    aliases: ['Noether Help', 'Help Hub', 'Overview'],
    portal: 'help',
    content: homeRaw,
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    slug: 'getting-started',
    portal: 'help',
    isFolder: true,
    children: [
      {
        id: 'introduction',
        title: 'Introduction to Noether',
        slug: 'introduction',
        aliases: ['Introduction', 'Intro', 'Core Philosophy', 'Flint', 'Emmy Noether'],
        portal: 'help',
        content: introRaw,
      },
      {
        id: 'installation',
        title: 'Installation & Setup',
        slug: 'installation',
        aliases: ['Installation', 'Install', 'Setup', 'Downloads'],
        portal: 'help',
        content: installRaw,
      },
    ],
  },
  {
    id: 'user-guide',
    title: 'User Guide',
    slug: 'user-guide',
    portal: 'help',
    isFolder: true,
    children: [
      {
        id: 'editor-and-markdown',
        title: 'Live Preview Editor & Markdown',
        slug: 'editor-and-markdown',
        aliases: ['Editor', 'Markdown', 'Live Preview', 'Slash Commands', 'Math', 'KaTeX', 'Tables', 'Callouts'],
        portal: 'help',
        content: editorMarkdownRaw,
      },
      {
        id: 'links-and-graph',
        title: 'Links, Backlinks & Graph',
        slug: 'links-and-graph',
        aliases: ['Wikilinks', 'Backlinks', 'Graph View', 'Knowledge Graph', 'Floating Graph', 'Float'],
        portal: 'help',
        content: linksGraphRaw,
      },
      {
        id: 'spatial-canvas',
        title: 'Infinite 2D Spatial Canvas',
        slug: 'spatial-canvas',
        aliases: ['Canvas', 'Whiteboard', 'Spatial Canvas', 'Mindmap', 'Visual Notes'],
        portal: 'help',
        content: spatialCanvasRaw,
      },
      {
        id: 'spaced-repetition',
        title: 'FSRS Spaced Repetition',
        slug: 'spaced-repetition',
        aliases: ['Spaced Repetition', 'FSRS', 'Flashcards', 'Active Recall', 'Review Deck'],
        portal: 'help',
        content: spacedRepetitionRaw,
      },
      {
        id: 'tasks-and-journal',
        title: 'Tasks Dashboard & Journal',
        slug: 'tasks-and-journal',
        aliases: ['Tasks', 'Kanban', 'Journal', 'Daily Notes', 'Checklists'],
        portal: 'help',
        content: tasksJournalRaw,
      },
      {
        id: 'vaults-and-storage',
        title: 'Vaults & Workspace Storage',
        slug: 'vaults-and-storage',
        aliases: ['Vaults', 'Workspaces', 'Full-Text Search', 'FTS5', 'Trash Bin', 'Sync'],
        portal: 'help',
        content: vaultsStorageRaw,
      },
      {
        id: 'shortcuts-and-commands',
        title: 'Keyboard Shortcuts & Commands',
        slug: 'shortcuts-and-commands',
        aliases: ['Keyboard Shortcuts', 'Shortcuts', 'Command Palette', 'Hotkeys', 'Keybindings'],
        portal: 'help',
        content: shortcutsCommandsRaw,
      },
      {
        id: 'ai-and-mcp',
        title: 'AI Assistants & MCP Tools',
        slug: 'ai-and-mcp',
        aliases: ['MCP', 'Model Context Protocol', 'AI Assistants', 'Claude Desktop', 'Antigravity', 'Cursor'],
        portal: 'help',
        content: aiMcpRaw,
      },
    ],
  },
  {
    id: 'workflows',
    title: 'Workflows & Strategies',
    slug: 'workflows-and-strategies',
    aliases: ['Workflows', 'Strategies', 'Topic Folders', 'Life Folder'],
    portal: 'help',
    content: workflowsRaw,
  },
  {
    id: 'faq',
    title: 'Frequently Asked Questions',
    slug: 'faq',
    aliases: ['FAQ', 'Questions', 'Privacy', 'Offline'],
    portal: 'help',
    content: faqRaw,
  },
];

// Flat lookup map
export function flattenHelpNodes(nodes: DocNode[] = HELP_TREE): DocNode[] {
  const result: DocNode[] = [];
  for (const node of nodes) {
    if (node.content) {
      result.push(node);
    }
    if (node.children) {
      result.push(...flattenHelpNodes(node.children));
    }
  }
  return result;
}

export const HELP_DOCS_FLAT: DocNode[] = flattenHelpNodes(HELP_TREE);

export function findHelpDocBySlug(slugOrId: string): DocNode | null {
  const target = slugOrId.toLowerCase().replace(/^\/+|\/+$/g, '');
  return (
    HELP_DOCS_FLAT.find(
      (n) =>
        n.slug.toLowerCase() === target ||
        n.id.toLowerCase() === target ||
        n.aliases?.some((a) => a.toLowerCase() === target)
    ) || null
  );
}
