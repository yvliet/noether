import { DocNode } from '../types';

import homeRaw from '../content/docs/home.md?raw';

import introRaw from '../content/docs/getting-started/introduction.md?raw';
import installRaw from '../content/docs/getting-started/installation.md?raw';

import editorMarkdownRaw from '../content/docs/user-guide/editor-and-markdown.md?raw';
import linksGraphRaw from '../content/docs/user-guide/links-and-graph.md?raw';
import spatialCanvasRaw from '../content/docs/user-guide/spatial-canvas.md?raw';
import spacedRepetitionRaw from '../content/docs/user-guide/spaced-repetition.md?raw';
import tasksJournalRaw from '../content/docs/user-guide/tasks-and-journal.md?raw';
import hearthsStorageRaw from '../content/docs/user-guide/hearths-and-storage.md?raw';
import shortcutsCommandsRaw from '../content/docs/user-guide/shortcuts-and-commands.md?raw';
import aiMcpRaw from '../content/docs/user-guide/ai-and-mcp.md?raw';

import dualStorageRaw from '../content/docs/architecture/dual-storage.md?raw';
import kernelDesignRaw from '../content/docs/architecture/kernel-design.md?raw';
import performanceEngineeringRaw from '../content/docs/architecture/performance-engineering.md?raw';

import quickStartRaw from '../content/docs/plugins/quick-start.md?raw';
import manifestSpecRaw from '../content/docs/plugins/manifest-spec.md?raw';
import extensionPointsRaw from '../content/docs/plugins/extension-points.md?raw';
import editorPluginsRaw from '../content/docs/plugins/editor-plugins.md?raw';
import mcpToolsRaw from '../content/docs/plugins/mcp-tools.md?raw';
import eventsStorageRaw from '../content/docs/plugins/events-and-storage.md?raw';
import optimizeLoadTimeRaw from '../content/docs/plugins/optimize-load-time.md?raw';
import publishingRaw from '../content/docs/plugins/publishing.md?raw';
import starterTemplatesRaw from '../content/docs/plugins/starter-templates.md?raw';

import buildFirstThemeRaw from '../content/docs/themes/build-first-theme.md?raw';
import submitThemeRaw from '../content/docs/themes/submit-theme.md?raw';

import foundationsRaw from '../content/docs/reference/css-variables/foundations.md?raw';
import windowVariablesRaw from '../content/docs/reference/css-variables/window.md?raw';
import editorVariablesRaw from '../content/docs/reference/css-variables/editor.md?raw';
import componentsVariablesRaw from '../content/docs/reference/css-variables/components.md?raw';
import pluginsVariablesRaw from '../content/docs/reference/css-variables/plugins.md?raw';
import publishVariablesRaw from '../content/docs/reference/css-variables/publish.md?raw';
import aboutStylingRaw from '../content/docs/reference/css-variables/about-styling.md?raw';

import manifestApiRaw from '../content/docs/reference/typescript-api/manifest.md?raw';
import versionsRaw from '../content/docs/reference/typescript-api/versions.md?raw';
import extensionClassRaw from '../content/docs/reference/typescript-api/extension-class.md?raw';
import appApiRaw from '../content/docs/reference/typescript-api/app-api.md?raw';
import databaseApiRaw from '../content/docs/reference/typescript-api/database-api.md?raw';
import mcpApiRaw from '../content/docs/reference/typescript-api/mcp-api.md?raw';
import portalSlotsApiRaw from '../content/docs/reference/typescript-api/portal-slots.md?raw';
import workerPoolApiRaw from '../content/docs/reference/typescript-api/worker-pool.md?raw';

import componentsRaw from '../content/docs/reference/components.md?raw';
import sdkApiRaw from '../content/docs/reference/sdk-api.md?raw';
import databaseSchemaRaw from '../content/docs/reference/database-schema.md?raw';

import communityOverviewRaw from '../content/docs/community-directory/directory-overview.md?raw';
import setUpAndClaimRaw from '../content/docs/community-directory/set-up-and-claim.md?raw';
import manageExtensionRaw from '../content/docs/community-directory/manage-extension.md?raw';
import developerPoliciesRaw from '../content/docs/community-directory/developer-policies.md?raw';
import submissionRequirementsRaw from '../content/docs/community-directory/submission-requirements.md?raw';
import organizationsRaw from '../content/docs/community-directory/organizations.md?raw';
import faqRaw from '../content/docs/community-directory/faq.md?raw';

export const DOCS_TREE: DocNode[] = [
  {
    id: 'home',
    title: 'Home',
    slug: 'home',
    aliases: ['Flint Developer Docs', 'Overview', 'Developer Portal'],
    content: homeRaw,
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    slug: 'getting-started',
    isFolder: true,
    children: [
      {
        id: 'introduction',
        title: 'Introduction to Flint',
        slug: 'introduction',
        aliases: ['Introduction', 'Intro', 'Core Philosophy', 'Hearth'],
        content: introRaw,
      },
      {
        id: 'installation',
        title: 'Installation & Setup',
        slug: 'installation',
        aliases: ['Installation', 'Install', 'Setup', 'Building from source'],
        content: installRaw,
      },
    ],
  },
  {
    id: 'user-guide',
    title: 'User Guide',
    slug: 'user-guide',
    isFolder: true,
    children: [
      {
        id: 'editor-and-markdown',
        title: 'Live Preview Editor & Markdown',
        slug: 'editor-and-markdown',
        aliases: ['Editor', 'Markdown', 'Live Preview', 'Slash Commands', 'Math', 'KaTeX', 'Tables', 'Callouts'],
        content: editorMarkdownRaw,
      },
      {
        id: 'links-and-graph',
        title: 'Links, Backlinks & Graph',
        slug: 'links-and-graph',
        aliases: ['Wikilinks', 'Backlinks', 'Graph View', 'Knowledge Graph', 'Unlinked Mentions', 'Visited Links'],
        content: linksGraphRaw,
      },
      {
        id: 'spatial-canvas',
        title: 'Infinite 2D Spatial Canvas',
        slug: 'spatial-canvas',
        aliases: ['Canvas', 'Whiteboard', 'Spatial Canvas', 'Mindmap', 'Visual Notes'],
        content: spatialCanvasRaw,
      },
      {
        id: 'spaced-repetition',
        title: 'FSRS Spaced Repetition',
        slug: 'spaced-repetition',
        aliases: ['Spaced Repetition', 'FSRS', 'Flashcards', 'Active Recall', 'Review Deck'],
        content: spacedRepetitionRaw,
      },
      {
        id: 'tasks-and-journal',
        title: 'Tasks Dashboard & Journal',
        slug: 'tasks-and-journal',
        aliases: ['Tasks', 'Kanban', 'Journal', 'Daily Notes', 'Checklists'],
        content: tasksJournalRaw,
      },
      {
        id: 'hearths-and-storage',
        title: 'Hearths & Workspace Storage',
        slug: 'hearths-and-storage',
        aliases: ['Hearths', 'Workspaces', 'Full-Text Search', 'FTS5', 'Trash Bin', 'Sync'],
        content: hearthsStorageRaw,
      },
      {
        id: 'shortcuts-and-commands',
        title: 'Keyboard Shortcuts & Commands',
        slug: 'shortcuts-and-commands',
        aliases: ['Keyboard Shortcuts', 'Shortcuts', 'Command Palette', 'Hotkeys', 'Keybindings'],
        content: shortcutsCommandsRaw,
      },
      {
        id: 'ai-and-mcp',
        title: 'AI Assistants & MCP Tools',
        slug: 'ai-and-mcp',
        aliases: ['MCP', 'Model Context Protocol', 'AI Assistants', 'Claude Desktop', 'Antigravity', 'Cursor', 'Copilot'],
        content: aiMcpRaw,
      },
    ],
  },
  {
    id: 'architecture',
    title: 'Architecture',
    slug: 'architecture',
    isFolder: true,
    children: [
      {
        id: 'dual-storage',
        title: 'Dual-Storage Architecture',
        slug: 'dual-storage',
        aliases: ['Dual storage architecture', 'Dual Storage', 'Storage Architecture'],
        content: dualStorageRaw,
      },
      {
        id: 'kernel-design',
        title: 'Micro-Kernel & Core Isolation',
        slug: 'kernel-design',
        aliases: [
          'Kernel design',
          'Kernel Design & Core Isolation',
          'Micro-Kernel & Isolation',
          'Micro-Kernel',
          'Micro-Kernel & Extension Architecture',
          'Microkernel',
          'Microkernel & Extension Architecture',
          'Microkernel & Core Isolation',
        ],
        content: kernelDesignRaw,
      },
      {
        id: 'performance-engineering',
        title: 'Systems & Performance Engineering',
        slug: 'performance-engineering',
        aliases: ['Performance', 'Systems Engineering', 'Sub-8ms', 'Working Set Trimming'],
        content: performanceEngineeringRaw,
      },
    ],
  },
  {
    id: 'extensions',
    title: 'Extensions',
    slug: 'extensions',
    isFolder: true,
    children: [
      {
        id: 'build-first-extension',
        title: 'Plugin Quick Start',
        slug: 'build-first-extension',
        aliases: ['Build your first extension', 'Quick Start', 'First Plugin', 'Word Counter'],
        content: quickStartRaw,
      },
      {
        id: 'starter-templates',
        title: 'Starter Templates & Boilerplates',
        slug: 'starter-templates',
        aliases: [
          'Starter Templates & Boilerplates',
          'Starter Templates',
          'Boilerplates',
          'Templates',
          'Starter Boilerplates',
          'Extension Templates',
          'MCP Starter',
        ],
        content: starterTemplatesRaw,
      },
      {
        id: 'manifest-spec',
        title: 'Manifest Specification',
        slug: 'manifest-spec',
        aliases: ['Manifest spec', 'manifest.json', 'Extension Manifest'],
        content: manifestSpecRaw,
      },
      {
        id: 'extension-points',
        title: 'UI Extension Points',
        slug: 'extension-points',
        aliases: ['Extension points', 'Action Rail', 'Command Palette', 'Status Bar', 'Context Menus'],
        content: extensionPointsRaw,
      },
      {
        id: 'editor-plugins',
        title: 'ProseMirror & Editor Bridge',
        slug: 'editor-plugins',
        aliases: ['Editor plugins', 'TipTap Bridge', 'ProseMirror Bridge'],
        content: editorPluginsRaw,
      },
      {
        id: 'mcp-tools',
        title: 'Model Context Protocol (MCP) Tools',
        slug: 'mcp-tools',
        aliases: ['Model Context Protocol (MCP)', 'MCP', 'MCP Tools', 'Model Context Protocol'],
        content: mcpToolsRaw,
      },
      {
        id: 'events-storage',
        title: 'Events & Relational Storage',
        slug: 'events-storage',
        aliases: ['Events and storage', 'EventBus', 'Event Bus', 'Relational Storage', 'WASM SQLite Storage'],
        content: eventsStorageRaw,
      },
      {
        id: 'optimize-load-time',
        title: 'Optimizing Extension Load Time',
        slug: 'optimize-load-time',
        aliases: ['Optimize extension load time', 'Performance', 'Sub-50ms', 'Startup Performance'],
        content: optimizeLoadTimeRaw,
      },
      {
        id: 'submit-extension',
        title: 'Publishing to Marketplace',
        slug: 'submit-extension',
        aliases: ['Submit your extension', 'Publishing Extensions', 'Marketplace', 'Publishing to Marketplace'],
        content: publishingRaw,
      },
    ],
  },
  {
    id: 'themes',
    title: 'Themes',
    slug: 'themes',
    isFolder: true,
    children: [
      {
        id: 'build-first-theme',
        title: 'Build Your First Theme',
        slug: 'build-first-theme',
        aliases: ['Build your first theme', 'Custom Themes', 'Theme Tutorial'],
        content: buildFirstThemeRaw,
      },
      {
        id: 'submit-theme',
        title: 'Submitting Themes',
        slug: 'submit-theme',
        aliases: ['Submit your theme', 'Submit theme', 'Publish theme'],
        content: submitThemeRaw,
      },
    ],
  },
  {
    id: 'reference',
    title: 'Reference',
    slug: 'reference',
    isFolder: true,
    children: [
      {
        id: 'css-variables',
        title: 'CSS variables',
        slug: 'css-variables',
        aliases: ['CSS Variables & Design Tokens', 'CSS Variables', 'Design Tokens', 'CSS Tokens'],
        isFolder: true,
        children: [
          {
            id: 'components-variables',
            title: 'Components',
            slug: 'components-variables',
            aliases: ['Components CSS Variables', 'Button Tokens', 'Input Tokens'],
            content: componentsVariablesRaw,
          },
          {
            id: 'editor-variables',
            title: 'Editor',
            slug: 'editor-variables',
            aliases: ['Editor Variables', 'Canvas Tokens', 'Syntax Tokens'],
            content: editorVariablesRaw,
          },
          {
            id: 'foundations',
            title: 'Foundations',
            slug: 'foundations',
            aliases: ['Foundations', 'Colors', 'Surfaces', 'Borders', 'Typography Tokens'],
            content: foundationsRaw,
          },
          {
            id: 'plugins-variables',
            title: 'Plugins',
            slug: 'plugins-variables',
            aliases: ['Plugins CSS Variables', 'Extension Tokens', 'Portal Tokens'],
            content: pluginsVariablesRaw,
          },
          {
            id: 'publish-variables',
            title: 'Publish',
            slug: 'publish-variables',
            aliases: ['Publish Variables', 'Marketplace Tokens', 'Banner Standards'],
            content: publishVariablesRaw,
          },
          {
            id: 'window-variables',
            title: 'Window',
            slug: 'window-variables',
            isFolder: true,
            children: [
              {
                id: 'about-styling',
                title: 'About styling',
                slug: 'about-styling',
                aliases: ['About styling', 'Styling Philosophy', 'Token Cascade'],
                content: aboutStylingRaw,
              },
              {
                id: 'window-tokens',
                title: 'CSS variables',
                slug: 'window-tokens',
                aliases: ['Window CSS variables', 'Window Frame', 'Titlebar Variables'],
                content: windowVariablesRaw,
              },
            ],
          },
        ],
      },
      {
        id: 'typescript-api',
        title: 'TypeScript API',
        slug: 'typescript-api',
        aliases: ['TypeScript API Reference', 'TypeScript API', 'TS API', 'Flint TypeScript API'],
        isFolder: true,
        children: [
          {
            id: 'manifest-api',
            title: 'Manifest',
            slug: 'manifest-api',
            aliases: ['Manifest API', 'ExtensionManifest', 'Manifest Interface'],
            content: manifestApiRaw,
          },
          {
            id: 'extension-class',
            title: 'Extension Base Class',
            slug: 'extension-class',
            aliases: ['Extension Class', 'Extension SDK'],
            content: extensionClassRaw,
          },
          {
            id: 'app-api',
            title: 'FlintApp API',
            slug: 'app-api',
            aliases: ['FlintApp API', 'Workspace API', 'Vault API'],
            content: appApiRaw,
          },
          {
            id: 'database-api',
            title: 'Database & SQLite',
            slug: 'database-api',
            aliases: ['Database API', 'defineTable API', 'SQLite Tables'],
            content: databaseApiRaw,
          },
          {
            id: 'mcp-api',
            title: 'Model Context Protocol',
            slug: 'mcp-api',
            aliases: ['MCP API', 'registerTool API', 'Zod Tools'],
            content: mcpApiRaw,
          },
          {
            id: 'portal-slots-api',
            title: 'Portal Slots',
            slug: 'portal-slots-api',
            aliases: ['Portal Slots API', 'registerPortalSlot'],
            content: portalSlotsApiRaw,
          },
          {
            id: 'worker-pool-api',
            title: 'Worker Task Pool',
            slug: 'worker-pool-api',
            aliases: ['Worker Pool API', 'registerWorkerTask'],
            content: workerPoolApiRaw,
          },
          {
            id: 'versions',
            title: 'Versions',
            slug: 'versions',
            aliases: ['Versions', 'Compatibility', 'minAppVersion Matrix'],
            content: versionsRaw,
          },
        ],
      },
      {
        id: 'components',
        title: 'Flint UI Components',
        slug: 'components',
        aliases: ['Components', 'Flint UI', 'Button', 'TextInput', 'SettingBuilder', 'Toggle', 'Select', 'Slider'],
        content: componentsRaw,
      },
      {
        id: 'sdk-api',
        title: 'SDK Quick Reference',
        slug: 'sdk-api',
        aliases: [
          'SDK Quick Reference',
          'Flint SDK Overview',
          'Flint SDK API Reference',
          'Flint SDK',
          'SDK API Reference',
          'SDK Reference',
          'SDK API',
          'SDK',
        ],
        content: sdkApiRaw,
      },
      {
        id: 'database-schema',
        title: 'Database Schema Reference',
        slug: 'database-schema',
        aliases: ['Database schema', 'SQLite Schema', 'Database Schema', 'Schema'],
        content: databaseSchemaRaw,
      },
    ],
  },
  {
    id: 'community-directory',
    title: 'Community Directory',
    slug: 'community-directory',
    isFolder: true,
    children: [
      {
        id: 'directory-overview',
        title: 'Community Directory Overview',
        slug: 'community-directory-overview',
        aliases: ['Community directory', 'Directory Overview', 'Community'],
        content: communityOverviewRaw,
      },
      {
        id: 'set-up-and-claim',
        title: 'Setting Up & Claiming Extensions',
        slug: 'set-up-and-claim',
        aliases: ['Set up and claim', 'Claim account', 'Claim namespace'],
        content: setUpAndClaimRaw,
      },
      {
        id: 'manage-extension',
        title: 'Managing Your Extension',
        slug: 'manage-extension',
        aliases: ['Manage your extension or theme', 'Manage extension', 'Managing extensions'],
        content: manageExtensionRaw,
      },
      {
        id: 'developer-policies',
        title: 'Developer Policies & Guidelines',
        slug: 'developer-policies',
        aliases: ['Developer policies', 'Policies', 'Privacy Policy', 'Security Guidelines'],
        content: developerPoliciesRaw,
      },
      {
        id: 'submission-requirements',
        title: 'Plugin Submission Requirements',
        slug: 'submission-requirements',
        aliases: ['Submission requirements for plugins', 'Submission requirements', 'Plugin Requirements'],
        content: submissionRequirementsRaw,
      },
      {
        id: 'organizations',
        title: 'Organizations & Teams',
        slug: 'organizations',
        aliases: ['Organizations', 'Teams'],
        content: organizationsRaw,
      },
      {
        id: 'faq',
        title: 'Developer FAQ',
        slug: 'faq',
        aliases: ['Frequently asked questions', 'FAQ'],
        content: faqRaw,
      },
    ],
  },
];
