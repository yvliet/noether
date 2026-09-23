import { DocNode } from '../types';

import homeRaw from '../content/docs/home.md?raw';

import noetherStoryRaw from '../content/docs/engineering/noether.md?raw';
import contributingRaw from '../content/docs/engineering/contributing.md?raw';

import dualStorageRaw from '../content/docs/architecture/dual-storage.md?raw';
import kernelDesignRaw from '../content/docs/architecture/kernel-design.md?raw';
import performanceEngineeringRaw from '../content/docs/architecture/performance-engineering.md?raw';
import runtimeBridgeRaw from '../content/docs/architecture/runtime-and-bridge.md?raw';
import eventbusStateRaw from '../content/docs/architecture/eventbus-and-state.md?raw';
import editorEngineRaw from '../content/docs/architecture/editor-engine.md?raw';
import mcpRuntimeRaw from '../content/docs/architecture/mcp-runtime.md?raw';
import securitySandboxingRaw from '../content/docs/architecture/security-and-sandboxing.md?raw';

import quickStartRaw from '../content/docs/extensions/quick-start.md?raw';
import manifestSpecRaw from '../content/docs/extensions/manifest-spec.md?raw';
import extensionPointsRaw from '../content/docs/extensions/extension-points.md?raw';
import editorExtensionsRaw from '../content/docs/extensions/editor-extensions.md?raw';
import mcpToolsRaw from '../content/docs/extensions/mcp-tools.md?raw';
import eventsStorageRaw from '../content/docs/extensions/events-and-storage.md?raw';
import optimizeLoadTimeRaw from '../content/docs/extensions/optimize-load-time.md?raw';
import publishingRaw from '../content/docs/extensions/publishing.md?raw';
import starterTemplatesRaw from '../content/docs/extensions/starter-templates.md?raw';
import moreIconsRaw from '../content/docs/extensions/more-icons.md?raw';
import coversRaw from '../content/docs/extensions/covers.md?raw';
import syncRaw from '../content/docs/extensions/sync.md?raw';
import historyRaw from '../content/docs/extensions/history.md?raw';

import buildFirstThemeRaw from '../content/docs/themes/build-first-theme.md?raw';
import submitThemeRaw from '../content/docs/themes/submit-theme.md?raw';

import foundationsRaw from '../content/docs/reference/css-variables/foundations.md?raw';
import windowVariablesRaw from '../content/docs/reference/css-variables/window.md?raw';
import editorVariablesRaw from '../content/docs/reference/css-variables/editor.md?raw';
import componentsVariablesRaw from '../content/docs/reference/css-variables/components.md?raw';
import extensionsVariablesRaw from '../content/docs/reference/css-variables/extensions.md?raw';
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
    aliases: ['Noether Docs', 'Noether Developer Docs', 'Overview', 'Developer Portal'],
    portal: 'docs',
    content: homeRaw,
  },
  {
    id: 'engineering',
    title: 'Engineering & Origin',
    slug: 'engineering',
    portal: 'docs',
    isFolder: true,
    children: [
      {
        id: 'noether',
        title: 'The Story of Noether',
        slug: 'noether',
        aliases: ['Noether Story', 'The Story of Noether', 'Origins', 'Flint'],
        portal: 'docs',
        content: noetherStoryRaw,
      },
      {
        id: 'contributing',
        title: 'Contributing to Noether',
        slug: 'contributing',
        aliases: ['Contributing', 'Setup', 'Development Setup', 'Pull Requests'],
        portal: 'docs',
        content: contributingRaw,
      },
    ],
  },
  {
    id: 'architecture',
    title: 'Architecture',
    slug: 'architecture',
    portal: 'docs',
    isFolder: true,
    children: [
      {
        id: 'dual-storage',
        title: 'Dual-Storage Architecture',
        slug: 'dual-storage',
        aliases: ['Dual storage architecture', 'Dual Storage', 'Storage Architecture'],
        portal: 'docs',
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
        portal: 'docs',
        content: kernelDesignRaw,
      },
      {
        id: 'performance-engineering',
        title: 'Systems & Performance Engineering',
        slug: 'performance-engineering',
        aliases: ['Performance', 'Systems Engineering', 'Low Latency', 'High Performance', 'Working Set Trimming'],
        portal: 'docs',
        content: performanceEngineeringRaw,
      },
      {
        id: 'runtime-and-bridge',
        title: 'Native Runtime & Platform Bridge',
        slug: 'runtime-and-bridge',
        aliases: ['Runtime', 'Platform Bridge', 'Tauri Bridge', 'Rust Backend', 'Atomic Saves'],
        portal: 'docs',
        content: runtimeBridgeRaw,
      },
      {
        id: 'eventbus-and-state',
        title: 'Reactive EventBus & State Pipeline',
        slug: 'eventbus-and-state',
        aliases: ['EventBus', 'State Pipeline', 'Zustand Stores', 'Events'],
        portal: 'docs',
        content: eventbusStateRaw,
      },
      {
        id: 'editor-engine',
        title: 'Editor Engine & Live Preview',
        slug: 'editor-engine',
        aliases: ['Editor Engine', 'Live Preview Architecture', 'ProseMirror Engine', 'TipTap Engine'],
        portal: 'docs',
        content: editorEngineRaw,
      },
      {
        id: 'mcp-runtime',
        title: 'Model Context Protocol (MCP) Runtime',
        slug: 'mcp-runtime',
        aliases: ['MCP Runtime', 'MCP Architecture', 'Stdio Server', 'Model Context Protocol'],
        portal: 'docs',
        content: mcpRuntimeRaw,
      },
      {
        id: 'security-and-sandboxing',
        title: 'Security & Filesystem Boundary',
        slug: 'security-and-sandboxing',
        aliases: ['Security', 'Sandboxing', 'Filesystem Boundary', 'is_safe_vault_path'],
        portal: 'docs',
        content: securitySandboxingRaw,
      },
    ],
  },
  {
    id: 'extensions',
    title: 'Extensions',
    slug: 'extensions',
    portal: 'docs',
    isFolder: true,
    children: [
      {
        id: 'build-first-extension',
        title: 'Extension Quick Start',
        slug: 'build-first-extension',
        aliases: ['Build your first extension', 'Quick Start', 'First Extension', 'Word Counter'],
        portal: 'docs',
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
        portal: 'docs',
        content: starterTemplatesRaw,
      },
      {
        id: 'manifest-spec',
        title: 'Manifest Specification',
        slug: 'manifest-spec',
        aliases: ['Manifest spec', 'manifest.json', 'Extension Manifest'],
        portal: 'docs',
        content: manifestSpecRaw,
      },
      {
        id: 'extension-points',
        title: 'UI Extension Points',
        slug: 'extension-points',
        aliases: ['Extension points', 'Action Rail', 'Command Palette', 'Status Bar', 'Context Menus'],
        portal: 'docs',
        content: extensionPointsRaw,
      },
      {
        id: 'editor-extensions',
        title: 'ProseMirror & Editor Bridge',
        slug: 'editor-extensions',
        aliases: ['Editor extensions', 'Editor plugins', 'TipTap Bridge', 'ProseMirror Bridge'],
        portal: 'docs',
        content: editorExtensionsRaw,
      },
      {
        id: 'more-icons',
        title: 'More icons Extension',
        slug: 'more-icons',
        aliases: ['More icons', 'Iconify', 'File Tree Icons', 'Custom Icons', 'more-icons'],
        portal: 'docs',
        content: moreIconsRaw,
      },
      {
        id: 'covers',
        title: 'Covers Extension',
        slug: 'covers',
        aliases: ['Covers', 'Banners', 'Note Covers', 'Cover Images', 'Header Banners'],
        portal: 'docs',
        content: coversRaw,
      },
      {
        id: 'mcp-tools',
        title: 'Model Context Protocol (MCP) Tools',
        slug: 'mcp-tools',
        aliases: ['Model Context Protocol (MCP)', 'MCP', 'MCP Tools', 'Model Context Protocol'],
        portal: 'docs',
        content: mcpToolsRaw,
      },
      {
        id: 'events-storage',
        title: 'Events & Relational Storage',
        slug: 'events-storage',
        aliases: ['Events and storage', 'EventBus', 'Event Bus', 'Relational Storage', 'WASM SQLite Storage'],
        portal: 'docs',
        content: eventsStorageRaw,
      },
      {
        id: 'sync',
        title: 'Sync',
        slug: 'sync',
        aliases: ['Sync', 'Cloud Sync', 'Database Sync', 'Multi-device Sync'],
        portal: 'docs',
        content: syncRaw,
      },
      {
        id: 'history',
        title: 'Version History',
        slug: 'history',
        aliases: ['Version History', 'History', 'Git History', 'Diffs', 'Drafts', 'Revisions'],
        portal: 'docs',
        content: historyRaw,
      },
      {
        id: 'optimize-load-time',
        title: 'Optimizing Extension Load Time',
        slug: 'optimize-load-time',
        aliases: ['Optimize extension load time', 'Performance', 'Sub-50ms', 'Startup Performance'],
        portal: 'docs',
        content: optimizeLoadTimeRaw,
      },
      {
        id: 'submit-extension',
        title: 'Publishing to Marketplace',
        slug: 'submit-extension',
        aliases: ['Submit your extension', 'Publishing Extensions', 'Marketplace', 'Publishing to Marketplace'],
        portal: 'docs',
        content: publishingRaw,
      },
    ],
  },
  {
    id: 'themes',
    title: 'Themes',
    slug: 'themes',
    portal: 'docs',
    isFolder: true,
    children: [
      {
        id: 'build-first-theme',
        title: 'Build Your First Theme',
        slug: 'build-first-theme',
        aliases: ['Build your first theme', 'Custom Themes', 'Theme Tutorial'],
        portal: 'docs',
        content: buildFirstThemeRaw,
      },
      {
        id: 'submit-theme',
        title: 'Submitting Themes',
        slug: 'submit-theme',
        aliases: ['Submit your theme', 'Submit theme', 'Publish theme'],
        portal: 'docs',
        content: submitThemeRaw,
      },
    ],
  },
  {
    id: 'reference',
    title: 'Reference',
    slug: 'reference',
    portal: 'docs',
    isFolder: true,
    children: [
      {
        id: 'css-variables',
        title: 'CSS variables',
        slug: 'css-variables',
        aliases: ['CSS Variables & Design Tokens', 'CSS Variables', 'Design Tokens', 'CSS Tokens'],
        portal: 'docs',
        isFolder: true,
        children: [
          {
            id: 'components-variables',
            title: 'Components',
            slug: 'components-variables',
            aliases: ['Components CSS Variables', 'Button Tokens', 'Input Tokens'],
            portal: 'docs',
            content: componentsVariablesRaw,
          },
          {
            id: 'editor-variables',
            title: 'Editor',
            slug: 'editor-variables',
            aliases: ['Editor Variables', 'Canvas Tokens', 'Syntax Tokens'],
            portal: 'docs',
            content: editorVariablesRaw,
          },
          {
            id: 'foundations',
            title: 'Foundations',
            slug: 'foundations',
            aliases: ['Foundations', 'Colors', 'Surfaces', 'Borders', 'Typography Tokens'],
            portal: 'docs',
            content: foundationsRaw,
          },
          {
            id: 'extensions-variables',
            title: 'Extensions',
            slug: 'extensions-variables',
            aliases: ['Extensions CSS Variables', 'Extension Tokens', 'Portal Tokens'],
            portal: 'docs',
            content: extensionsVariablesRaw,
          },
          {
            id: 'publish-variables',
            title: 'Publish',
            slug: 'publish-variables',
            aliases: ['Publish Variables', 'Marketplace Tokens', 'Banner Standards'],
            portal: 'docs',
            content: publishVariablesRaw,
          },
          {
            id: 'window-variables',
            title: 'Window',
            slug: 'window-variables',
            portal: 'docs',
            isFolder: true,
            children: [
              {
                id: 'about-styling',
                title: 'About styling',
                slug: 'about-styling',
                aliases: ['About styling', 'Styling Philosophy', 'Token Cascade'],
                portal: 'docs',
                content: aboutStylingRaw,
              },
              {
                id: 'window-tokens',
                title: 'CSS variables',
                slug: 'window-tokens',
                aliases: ['Window CSS variables', 'Window Frame', 'Titlebar Variables'],
                portal: 'docs',
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
        aliases: ['TypeScript API Reference', 'TypeScript API', 'TS API', 'Noether TypeScript API'],
        portal: 'docs',
        isFolder: true,
        children: [
          {
            id: 'manifest-api',
            title: 'Manifest',
            slug: 'manifest-api',
            aliases: ['Manifest API', 'ExtensionManifest', 'Manifest Interface'],
            portal: 'docs',
            content: manifestApiRaw,
          },
          {
            id: 'extension-class',
            title: 'Extension Base Class',
            slug: 'extension-class',
            aliases: ['Extension Class', 'Extension SDK'],
            portal: 'docs',
            content: extensionClassRaw,
          },
          {
            id: 'app-api',
            title: 'NoetherApp API',
            slug: 'app-api',
            aliases: ['NoetherApp API', 'Workspace API', 'Vault API'],
            portal: 'docs',
            content: appApiRaw,
          },
          {
            id: 'database-api',
            title: 'Database & SQLite',
            slug: 'database-api',
            aliases: ['Database API', 'defineTable API', 'SQLite Tables'],
            portal: 'docs',
            content: databaseApiRaw,
          },
          {
            id: 'mcp-api',
            title: 'Model Context Protocol',
            slug: 'mcp-api',
            aliases: ['MCP API', 'registerTool API', 'Zod Tools'],
            portal: 'docs',
            content: mcpApiRaw,
          },
          {
            id: 'portal-slots-api',
            title: 'Portal Slots',
            slug: 'portal-slots-api',
            aliases: ['Portal Slots API', 'registerPortalSlot'],
            portal: 'docs',
            content: portalSlotsApiRaw,
          },
          {
            id: 'worker-pool-api',
            title: 'Worker Task Pool',
            slug: 'worker-pool-api',
            aliases: ['Worker Pool API', 'registerWorkerTask'],
            portal: 'docs',
            content: workerPoolApiRaw,
          },
          {
            id: 'versions',
            title: 'Versions',
            slug: 'versions',
            aliases: ['Versions', 'Compatibility', 'minAppVersion Table'],
            portal: 'docs',
            content: versionsRaw,
          },
        ],
      },
      {
        id: 'components',
        title: 'Noether UI Components',
        slug: 'components',
        aliases: ['Components', 'Noether UI', 'Button', 'TextInput', 'SettingBuilder', 'Toggle', 'Select', 'Slider'],
        portal: 'docs',
        content: componentsRaw,
      },
      {
        id: 'sdk-api',
        title: 'SDK Quick Reference',
        slug: 'sdk-api',
        aliases: [
          'SDK Quick Reference',
          'Noether SDK Overview',
          'Noether SDK API Reference',
          'Noether SDK',
          'SDK API Reference',
          'SDK Reference',
          'SDK API',
          'SDK',
        ],
        portal: 'docs',
        content: sdkApiRaw,
      },
      {
        id: 'database-schema',
        title: 'Database Schema Reference',
        slug: 'database-schema',
        aliases: ['Database schema', 'SQLite Schema', 'Database Schema', 'Schema'],
        portal: 'docs',
        content: databaseSchemaRaw,
      },
    ],
  },
  {
    id: 'community-directory',
    title: 'Community Directory',
    slug: 'community-directory',
    portal: 'docs',
    isFolder: true,
    children: [
      {
        id: 'directory-overview',
        title: 'Community Directory Overview',
        slug: 'community-directory-overview',
        aliases: ['Community directory', 'Directory Overview', 'Community'],
        portal: 'docs',
        content: communityOverviewRaw,
      },
      {
        id: 'set-up-and-claim',
        title: 'Setting Up & Claiming Extensions',
        slug: 'set-up-and-claim',
        aliases: ['Set up and claim', 'Claim account', 'Claim namespace'],
        portal: 'docs',
        content: setUpAndClaimRaw,
      },
      {
        id: 'manage-extension',
        title: 'Managing Your Extension',
        slug: 'manage-extension',
        aliases: ['Manage your extension or theme', 'Manage extension', 'Managing extensions'],
        portal: 'docs',
        content: manageExtensionRaw,
      },
      {
        id: 'developer-policies',
        title: 'Developer Policies & Guidelines',
        slug: 'developer-policies',
        aliases: ['Developer policies', 'Policies', 'Privacy Policy', 'Security Guidelines'],
        portal: 'docs',
        content: developerPoliciesRaw,
      },
      {
        id: 'submission-requirements',
        title: 'Extension Submission Requirements',
        slug: 'submission-requirements',
        aliases: ['Submission requirements', 'Extension Requirements'],
        portal: 'docs',
        content: submissionRequirementsRaw,
      },
      {
        id: 'organizations',
        title: 'Organizations & Teams',
        slug: 'organizations',
        aliases: ['Organizations', 'Teams'],
        portal: 'docs',
        content: organizationsRaw,
      },
      {
        id: 'faq',
        title: 'Developer FAQ',
        slug: 'faq',
        aliases: ['Frequently asked questions', 'FAQ'],
        portal: 'docs',
        content: faqRaw,
      },
    ],
  },
];

// Flat lookup map
export function flattenDocsNodes(nodes: DocNode[] = DOCS_TREE): DocNode[] {
  const result: DocNode[] = [];
  for (const node of nodes) {
    if (node.content) {
      result.push(node);
    }
    if (node.children) {
      result.push(...flattenDocsNodes(node.children));
    }
  }
  return result;
}

export const DOCS_FLAT: DocNode[] = flattenDocsNodes(DOCS_TREE);

export function findDocsDocBySlug(slugOrId: string): DocNode | null {
  const target = slugOrId.toLowerCase().replace(/^\/+|\/+$/g, '');
  return (
    DOCS_FLAT.find(
      (n) =>
        n.slug.toLowerCase() === target ||
        n.id.toLowerCase() === target ||
        n.aliases?.some((a) => a.toLowerCase() === target)
    ) || null
  );
}
