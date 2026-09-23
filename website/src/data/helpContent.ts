import { DocNode } from '../types';

import homeRaw from '../content/help/home.md?raw';
import introRaw from '../content/help/getting-started/introduction.md?raw';
import installRaw from '../content/help/getting-started/installation.md?raw';

import editorRaw from '../content/help/user-guide/editor.md?raw';
import basicFormattingRaw from '../content/help/user-guide/basic-formatting.md?raw';
import mathLatexRaw from '../content/help/user-guide/math-and-latex.md?raw';
import tablesRaw from '../content/help/user-guide/tables.md?raw';
import calloutsRaw from '../content/help/user-guide/callouts.md?raw';
import vaultsStorageRaw from '../content/help/user-guide/vaults-and-storage.md?raw';
import workspaceDockingRaw from '../content/help/user-guide/workspace-docking.md?raw';
import shortcutsCommandsRaw from '../content/help/user-guide/shortcuts-and-commands.md?raw';
import pdfViewerRaw from '../content/help/user-guide/pdf-viewer.md?raw';
import aiMcpRaw from '../content/help/user-guide/ai-and-mcp.md?raw';
import mcpToolsRefRaw from '../content/help/user-guide/mcp-tools-reference.md?raw';

import backlinksRaw from '../content/help/core-extensions/backlinks.md?raw';
import bookmarksRaw from '../content/help/core-extensions/bookmarks.md?raw';
import canvasRaw from '../content/help/core-extensions/canvas.md?raw';
import coversRaw from '../content/help/core-extensions/covers.md?raw';
import graphRaw from '../content/help/core-extensions/graph.md?raw';
import historyRaw from '../content/help/core-extensions/history.md?raw';
import journalRaw from '../content/help/core-extensions/journal.md?raw';
import marketplaceRaw from '../content/help/core-extensions/marketplace.md?raw';
import moreIconsRaw from '../content/help/core-extensions/more-icons.md?raw';
import outlineRaw from '../content/help/core-extensions/outline.md?raw';
import propertiesRaw from '../content/help/core-extensions/properties.md?raw';
import syncRaw from '../content/help/core-extensions/sync.md?raw';
import tagsRaw from '../content/help/core-extensions/tags.md?raw';
import tasksRaw from '../content/help/core-extensions/tasks.md?raw';

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
    title: 'Core Features',
    slug: 'user-guide',
    portal: 'help',
    isFolder: true,
    children: [
      {
        id: 'editor',
        title: 'Editor',
        slug: 'editor',
        aliases: ['Live Preview Editor & Markdown', 'Live Preview', 'Source Mode', 'Editor Modes', 'Document Options', 'Image Lightbox', 'Find & Replace'],
        portal: 'help',
        content: editorRaw,
      },
      {
        id: 'basic-formatting',
        title: 'Basic Formatting',
        slug: 'basic-formatting',
        aliases: ['Formatting', 'Markdown', 'Text Formatting', 'Headings', 'Lists', 'Checklists', 'Wikilinks', 'Slash Commands'],
        portal: 'help',
        content: basicFormattingRaw,
      },
      {
        id: 'math-and-latex',
        title: 'Math & LaTeX',
        slug: 'math-and-latex',
        aliases: ['Math', 'LaTeX', 'KaTeX', 'Formulas', 'MathLive', 'Math Keyboard'],
        portal: 'help',
        content: mathLatexRaw,
      },
      {
        id: 'tables',
        title: 'Tables',
        slug: 'tables',
        aliases: ['Table Editor', 'Interactive Tables', 'Markdown Tables'],
        portal: 'help',
        content: tablesRaw,
      },
      {
        id: 'callouts',
        title: 'Callouts',
        slug: 'callouts',
        aliases: ['Admonitions', 'Callout Boxes', 'Alerts', 'Badges'],
        portal: 'help',
        content: calloutsRaw,
      },
      {
        id: 'vaults-and-storage',
        title: 'Vaults & Storage',
        slug: 'vaults-and-storage',
        aliases: ['Vaults & Workspace Storage', 'Vaults', 'Workspaces', 'Trash Bin', 'Sync', 'Organization', 'Folder Structure'],
        portal: 'help',
        content: vaultsStorageRaw,
      },
      {
        id: 'workspace-docking',
        title: 'Workspace Layout & Docking',
        slug: 'workspace-docking',
        aliases: ['Docking', 'Layout', 'Sidebar', 'Search', 'Vault Search', 'Panels', 'File Tree'],
        portal: 'help',
        content: workspaceDockingRaw,
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
        id: 'pdf-viewer',
        title: 'PDF Viewer & Presentation Mode',
        slug: 'pdf-viewer',
        aliases: ['PDF', 'PDF Viewer', 'Presentation Mode', 'Slides', 'Slideshow', 'PDF Outline', 'Thumbnails'],
        portal: 'help',
        content: pdfViewerRaw,
      },
      {
        id: 'ai-and-mcp',
        title: 'AI Assistants & MCP',
        slug: 'ai-and-mcp',
        aliases: ['AI Assistants & MCP Tools', 'MCP', 'Model Context Protocol', 'AI Assistants', 'Claude Desktop', 'Antigravity', 'Cursor'],
        portal: 'help',
        content: aiMcpRaw,
      },
      {
        id: 'mcp-tools-reference',
        title: 'MCP Tools Reference',
        slug: 'mcp-tools-reference',
        aliases: ['MCP Tools', 'Tools Reference', 'Built-in Tools', 'Native Vault Tools'],
        portal: 'help',
        content: mcpToolsRefRaw,
      },
    ],
  },
  {
    id: 'core-extensions',
    title: 'Core Extensions',
    slug: 'core-extensions',
    portal: 'help',
    isFolder: true,
    children: [
      {
        id: 'backlinks',
        title: 'Backlinks',
        slug: 'backlinks',
        aliases: ['Backlinks', 'Linked Mentions', 'Unlinked Mentions', 'Incoming Links'],
        portal: 'help',
        content: backlinksRaw,
      },
      {
        id: 'bookmarks',
        title: 'Bookmarks',
        slug: 'bookmarks',
        aliases: ['Bookmarks', 'Pinned Notes', 'Favorites'],
        portal: 'help',
        content: bookmarksRaw,
      },
      {
        id: 'canvas',
        title: 'Canvas',
        slug: 'canvas',
        aliases: ['Canvas', 'Whiteboard', 'Spatial Canvas', 'Visual Notes', 'Cards'],
        portal: 'help',
        content: canvasRaw,
      },
      {
        id: 'covers',
        title: 'Covers',
        slug: 'covers',
        aliases: ['Covers', 'Header Banners', 'Wallhaven', 'Banner Images'],
        portal: 'help',
        content: coversRaw,
      },
      {
        id: 'graph',
        title: 'Graph View',
        slug: 'graph',
        aliases: ['Graph View', 'Graph', 'Knowledge Graph', 'Floating Graph', 'Local Graph', 'Timelapse'],
        portal: 'help',
        content: graphRaw,
      },
      {
        id: 'history',
        title: 'Version History',
        slug: 'history',
        aliases: ['Version History', 'Snapshots', 'Revisions', 'Diff Viewer'],
        portal: 'help',
        content: historyRaw,
      },
      {
        id: 'journal',
        title: 'Daily Journal',
        slug: 'journal',
        aliases: ['Daily Journal', 'Journal', 'Daily Notes', 'Scratchpad'],
        portal: 'help',
        content: journalRaw,
      },
      {
        id: 'marketplace',
        title: 'Community Marketplace',
        slug: 'marketplace',
        aliases: ['Marketplace', 'Community Extensions', 'Community Themes', 'Registry'],
        portal: 'help',
        content: marketplaceRaw,
      },
      {
        id: 'more-icons',
        title: 'More Icons',
        slug: 'more-icons',
        aliases: ['More Icons', 'File Icons', 'Folder Icons', 'Hugeicons', 'Lucide'],
        portal: 'help',
        content: moreIconsRaw,
      },
      {
        id: 'outline',
        title: 'Outline',
        slug: 'outline',
        aliases: ['Outline', 'Table of Contents', 'Headings'],
        portal: 'help',
        content: outlineRaw,
      },
      {
        id: 'properties',
        title: 'Properties',
        slug: 'properties',
        aliases: ['Properties', 'Frontmatter', 'YAML', 'Metadata'],
        portal: 'help',
        content: propertiesRaw,
      },
      {
        id: 'sync',
        title: 'Sync',
        slug: 'sync',
        aliases: ['Sync', 'Cloud Sync', 'Turso', 'Supabase', 'Cloudflare D1', 'E2EE'],
        portal: 'help',
        content: syncRaw,
      },
      {
        id: 'tags',
        title: 'Tags',
        slug: 'tags',
        aliases: ['Tags', 'Tag Pane', 'Nested Tags', '#tag'],
        portal: 'help',
        content: tagsRaw,
      },
      {
        id: 'tasks',
        title: 'Tasks',
        slug: 'tasks',
        aliases: ['Tasks', 'Task Dashboard', 'Kanban', 'Checklists', '- [ ]'],
        portal: 'help',
        content: tasksRaw,
      },
    ],
  },
  {
    id: 'faq',
    title: 'Frequently Asked Questions',
    slug: 'faq',
    aliases: ['FAQ', 'Questions', 'Privacy', 'Offline', 'Mobile'],
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
