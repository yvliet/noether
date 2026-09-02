export const outlineReadme = `# Document Outline

Interactive table of contents and document heading tree navigation.

---

## Overview

The **Outline** plugin generates a real-time table of contents for the active note. It extracts Markdown headings (\`# H1\` through \`###### H6\`), renders an indentation tree, and provides smooth scroll navigation to any heading anchor.

---

## Architecture & Flint APIs

This plugin showcases real-time editor AST synchronization and sidebar tab registration.

### 1. Registering the Right Sidebar Outline Panel
\`\`\`tsx
this.app.sidebars.registerSidebarTab('right', {
  id: 'outline-view',
  title: 'Outline',
  icon: <StructureFolderIcon size={14} />,
  render: () => <OutlineView />,
});
\`\`\`

### 2. Smooth Scroll to Heading
Clicking an outline item smoothly scrolls the TipTap editor canvas to the target node:

\`\`\`tsx
const scrollToHeading = (headingText: string, level: number) => {
  const headings = document.querySelectorAll(\`h\${level}\`);
  for (const h of Array.from(headings)) {
    if (h.textContent?.includes(headingText)) {
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
  }
};
\`\`\`

---

## Developer Guide: Headings Analysis Extension

\`\`\`tsx
import { Extension } from '@/core/extensions/Extension';

export class ReadingTimeExtension extends Extension {
  async onload() {
    this.app.events.on('editor:content-change', ({ content }) => {
      const words = content.trim().split(/\s+/).length;
      const readingMinutes = Math.ceil(words / 200);
      console.log(\`Estimated reading time: \${readingMinutes} min\`);
    });
  }
}
\`\`\`
`;
