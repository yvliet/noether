export const marketplaceReadme = `# Plugin Marketplace

Discover, browse, install, and update Flint community plugins and themes.

---

## Overview

The **Plugin Marketplace** provides an in-app catalog to discover community plugins and themes. Users can search by keyword, view ratings, inspect documentation READMEs, and install extensions with one click.

---

## Architecture & Flint APIs

This plugin demonstrates how to build an in-app extension ecosystem using Flint's Plugin Manager and custom view engine.

### 1. View & Ribbon Registration
\`\`\`tsx
this.app.views.registerView({
  type: 'marketplace',
  title: 'Community Marketplace',
  icon: <ShoppingBag01Icon size={14} />,
  render: () => <MarketplaceView />,
});

this.app.ribbon.registerRibbonAction({
  id: 'open-marketplace-view',
  title: 'Plugin Marketplace',
  icon: <ShoppingBag01Icon size={16} />,
  onClick: () => {
    this.app.workspace.openCustomTab({
      viewType: 'marketplace',
      title: 'Marketplace',
      documentId: '__marketplace__',
    });
  },
});
\`\`\`

### 2. Dynamic Extension Loading Pipeline
When a user clicks **Install**:
1. Manifest and bundled JS are fetched from the registry repository.
2. Code is evaluated into a sandboxed \`Extension\` instance.
3. \`app.extensions.loadExtension(manifest)\` registers commands, views, and settings.
4. \`app.extensions.enableExtension(id)\` invokes the extension's \`onload()\` lifecycle hook.

---

## Developer Guide: Publishing to Flint Marketplace

To publish your extension to the Flint community marketplace:
1. Create a repository with \`manifest.json\` containing \`id\`, \`name\`, \`version\`, \`author\`, \`description\`, and \`readme\`.
2. Bundle your entry point with Vite/esbuild into \`main.js\`.
3. Submit a pull request to Flint's community extension registry.
`;
