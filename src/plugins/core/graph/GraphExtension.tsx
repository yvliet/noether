/**
 * @module GraphExtension
 * @description
 * Built-in core extension rendering a 2D force-directed interactive knowledge graph.
 * Registers the graph view, action rail shortcut, navigation command, and settings tab.
 *
 * Uses native FlintApp APIs (app.workspace.setMainViewMode).
 *
 * @since 0.2.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { NeuralNetworkIcon } from '@/components/common/Icons';
import { GraphSettingsTab } from './GraphSettingsTab';
import { graphReadme } from './readme';

const LazyGraphView = React.lazy(() =>
  import('./GraphView').then((m) => ({ default: m.GraphView }))
);

export const GRAPH_MANIFEST: ExtensionManifest = {
  id: 'graph-view',
  name: 'Graph View',
  version: '1.0.0',
  description: 'Interactive force-directed graph visualizing knowledge network relationships between notes.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['graph', 'visualization', 'network', 'knowledge', 'links'],
  readme: graphReadme,
};

export class GraphExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = GRAPH_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Main View
    this.registerView({
      type: 'graph',
      title: 'Graph View',
      icon: <NeuralNetworkIcon size={14} />,
      render: (props) => (
        <React.Suspense fallback={<div className="w-full h-full bg-transparent" />}>
          <LazyGraphView
            tabId={(props as any)?.tabId}
            documentId={(props as any)?.documentId}
            isSidebar={(props as any)?.isSidebar}
          />
        </React.Suspense>
      ),
    });

    // 2. Register Action Rail item
    this.addActionRailIcon(
      'open-graph-view',
      <NeuralNetworkIcon size={16} />,
      'Open graph view (Ctrl+G)',
      (app) => {
        app.workspace.setMainViewMode('graph');
      },
      50
    );

    // 3. Register Command
    this.addCommand({
      id: 'cmd-open-graph-view',
      title: 'Open graph view',
      section: 'Navigation',
      icon: <NeuralNetworkIcon size={16} />,
      hotkey: 'Ctrl+G',
      action: (app) => {
        app.workspace.setMainViewMode('graph');
      },
    });

    // 4. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'graph-settings',
      name: 'Graph view',
      icon: <NeuralNetworkIcon size={14} />,
      render: () => <GraphSettingsTab />,
    });
  }
}

// Backwards compatibility alias
export const GraphPlugin = GraphExtension;
export default GraphExtension;
