/**
 * @module QuicknoteExtension
 * @description
 * Built-in core extension providing a physical sticky note HUD overlay for
 * rapid thought, task, and note capture.
 *
 * Exclusively uses the Flint SDK, IoC Registries, and EventBus.
 *
 * @since 0.2.0
 */

import React from 'react';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import { StickyNote02Icon } from '@/components/common/Icons';
import { useQuicknoteSettings } from './quicknoteSettings';
import { quicknoteReadme } from './readme';
import { platformAdapter } from '@/lib/platform/platformAdapter';

const LazyQuicknoteModal = React.lazy(() =>
  import('./QuicknoteModal').then((m) => ({ default: m.QuicknoteModal }))
);

const LazyQuicknoteSettingsTab = React.lazy(() =>
  import('./QuicknoteSettingsTab').then((m) => ({ default: m.QuicknoteSettingsTab }))
);

export const QUICKNOTE_MANIFEST: ExtensionManifest = {
  id: 'quicknote',
  name: 'Quicknote',
  version: '1.0.0',
  description: 'Physical sticky note overlay for rapid thought, task, and note capture.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['quicknote', 'sticky-notes', 'capture', 'post-it', 'scratchpad'],
  readme: quicknoteReadme,
};

export class QuicknoteExtension extends Extension {
  private unregisterGlobalShortcutListener: (() => void) | null = null;
  private unsubscribeSettings: (() => void) | null = null;

  constructor(app: FlintApp, manifest: ExtensionManifest = QUICKNOTE_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // 1. Register Quicknote Modal dynamically into the global app modal host
    this.registerModal({
      id: 'quicknote-modal',
      render: () => (
        <React.Suspense fallback={null}>
          <LazyQuicknoteModal />
        </React.Suspense>
      ),
    });

    // 2. Register Quicknote Command & In-App Hotkey
    this.addCommand({
      id: 'quicknote:capture',
      title: 'Quicknote: Capture sticky note',
      section: 'Quick Capture',
      icon: <StickyNote02Icon size={16} />,
      hotkey: 'Ctrl+Shift+Space',
      action: () => {
        useQuicknoteSettings.getState().toggleQuicknote();
      },
    });

    // 3. Register Action Rail Icon
    this.addActionRailIcon(
      'quicknote-action-rail',
      <StickyNote02Icon size={16} />,
      'Quicknote (Ctrl+Shift+Space)',
      () => {
        useQuicknoteSettings.getState().toggleQuicknote();
      },
      2
    );

    // 4. Register Extension Settings Tab
    this.registerSettingTab({
      id: 'quicknote-settings',
      name: 'Quicknote',
      icon: <StickyNote02Icon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyQuicknoteSettingsTab />
        </React.Suspense>
      ),
    });

    // 5. Register System-Wide Global Hotkey
    const currentShortcut = useQuicknoteSettings.getState().quicknoteShortcut || 'Ctrl+Shift+Space';
    platformAdapter.registerGlobalShortcut('quicknote', currentShortcut);

    this.unregisterGlobalShortcutListener = platformAdapter.onGlobalShortcut((id: string) => {
      if (id === 'quicknote') {
        useQuicknoteSettings.getState().toggleQuicknote();
      }
    });

    // Listen for shortcut changes in settings
    this.unsubscribeSettings = useQuicknoteSettings.subscribe((state, prevState) => {
      if (state.quicknoteShortcut !== prevState.quicknoteShortcut) {
        platformAdapter.registerGlobalShortcut('quicknote', state.quicknoteShortcut || 'Ctrl+Shift+Space');
      }
    });
  }

  public onunload(): void {
    if (this.unregisterGlobalShortcutListener) {
      this.unregisterGlobalShortcutListener();
      this.unregisterGlobalShortcutListener = null;
    }
    if (this.unsubscribeSettings) {
      this.unsubscribeSettings();
      this.unsubscribeSettings = null;
    }
    platformAdapter.unregisterGlobalShortcut('quicknote');
  }
}

export default QuicknoteExtension;
