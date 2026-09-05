/**
 * @module SampleExtension
 * @description
 * Entry point for the sample Flint community extension.
 */

import { Extension, ExtensionManifest, McpToolResult } from 'flint';

export const MANIFEST: ExtensionManifest = {
  id: 'flint-sample-extension',
  name: 'Sample Extension',
  version: '1.0.0',
  description: 'A starter extension demonstrating commands, status bar indicators, and MCP tools.',
  author: 'Community Developer',
  tags: ['sample', 'starter'],
};

export default class SampleExtension extends Extension {
  public async onload(): Promise<void> {
    console.log(`[${this.manifest.name}] Loaded successfully.`);

    // 1. Register a command in the command palette
    this.addCommand({
      id: 'greet',
      title: 'Sample Extension: Greet User',
      section: 'Sample',
      action: (app) => {
        app.workspace.showToast('Hello from your new Flint extension!', 'success');
      },
    });

    // 2. Register a status bar item
    this.addStatusBarItem({
      id: 'sample-status',
      text: 'Flint Ready',
      tooltip: 'Sample extension is active',
      position: 'right',
      priority: 10,
    });

    // 3. Register an MCP Tool
    this.registerTool({
      name: 'get_sample_info',
      description: 'Returns metadata and status from the sample extension.',
      parameters: {
        type: 'object',
        properties: {},
      },
      handler: async (): Promise<McpToolResult> => {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'operational',
                version: this.manifest.version,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        };
      },
    });
  }

  public onunload(): void {
    console.log(`[${this.manifest.name}] Unloaded.`);
  }
}
