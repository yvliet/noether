import React, { useCallback } from 'react';
import {
  FlintLogoIcon,
  FileAddIcon,
  CommandIcon,
  HelpCircleIcon,
  Settings02Icon,
  ArrowUpDownIcon,
} from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useFlintApp, useRibbonItems } from '@/core/app/AppContext';
import { useSettingsStore } from '@/store/settingsStore';
import { platform } from '@/lib/platform/platformAdapter';

export const ActionRail: React.FC = React.memo(() => {
  const app = useFlintApp();
  const ribbonItems = useRibbonItems();

  const setMainViewMode = useWorkspaceStore((s) => s.setMainViewMode);
  const isLeftSidebarOpen = useWorkspaceStore((s) => s.isLeftSidebarOpen);
  const setIsCommandPaletteOpen = useWorkspaceStore((s) => s.setIsCommandPaletteOpen);
  const setIsSettingsOpen = useWorkspaceStore((s) => s.setIsSettingsOpen);
  const setIsHelpModalOpen = useWorkspaceStore((s) => s.setIsHelpModalOpen);
  const setIsHearthModalOpen = useWorkspaceStore((s) => s.setIsHearthModalOpen);
  const panes = useWorkspaceStore((s) => s.panes);
  const focusedPaneId = useWorkspaceStore((s) => s.focusedPaneId);
  const rootActiveTabId = useWorkspaceStore((s) => s.activeTabId);
  const rootTabs = useWorkspaceStore((s) => s.tabs);
  const activePaneModel = panes[focusedPaneId] || panes['main'];
  const activeTabId = activePaneModel?.activeTabId || rootActiveTabId;
  const tabs = activePaneModel?.tabs || rootTabs;
  const mainViewMode = useWorkspaceStore((s) => s.mainViewMode);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const createNewNote = useDocumentStore((s) => s.createNewNote);

  const handleCreateNewNote = useCallback(async () => {
    await createNewNote('Untitled');
  }, [createNewNote]);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, [setIsSettingsOpen]);

  const lastTriggerTimeRef = React.useRef<number>(0);
  const handleItemTrigger = useCallback(
    async (item: (typeof ribbonItems)[number]) => {
      const now = Date.now();
      if (now - lastTriggerTimeRef.current < 200) return;
      lastTriggerTimeRef.current = now;

      try {
        await Promise.resolve(item.onClick(app));
      } catch (err) {
        console.error('[ActionRail] Failed to handle icon click:', item.id, err);
        showToast(`Failed to open ${item.title || 'item'}`, 'warning');
      }
    },
    [app, showToast]
  );

  return (
    <aside
      data-action-rail="true"
      data-ribbon="true"
      data-tauri-drag-region="false"
      data-no-drag="true"
      aria-label="Action Rail"
      style={
        {
          background: 'var(--flint-bg-ribbon, var(--flint-bg-sidebar))',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties
      }
      className="flint-action-rail flint-ribbon no-drag relative w-11 flex flex-col items-center justify-between py-2 select-none z-20 shrink-0 border-r border-[var(--flint-border-base)]"
    >
      {/* Top Action Icons */}
      <div data-no-drag="true" className="no-drag flex flex-col items-center gap-1 w-full">
        {/* Flint Blaze Logo */}
        <div
          data-action-rail-id="core:home"
          data-no-drag="true"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={() => setMainViewMode('document')}
          className="no-drag w-8 h-8 rounded-lg flex items-center justify-center mb-1 cursor-pointer hover:bg-[var(--flint-bg-card-hover)]"
          title="Flint"
          data-tooltip="Flint"
        >
          <FlintLogoIcon size={20} className="text-[var(--flint-text-primary)]" />
        </div>

        {/* Quick New Note */}
        <button
          data-action-rail-id="core:create-note"
          data-no-drag="true"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={handleCreateNewNote}
          title="Create new note (Ctrl+N)"
          data-tooltip="Create new note (Ctrl+N)"
          className="no-drag w-7 h-7 rounded-md flex items-center justify-center text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer"
        >
          <FileAddIcon size={16} />
        </button>

        {/* Dynamic Registered Items from Built-in & Community Extensions */}
        {ribbonItems.map((item) => {
          return (
            <button
              key={item.id}
              data-action-rail-id={item.id}
              data-tooltip={item.title}
              data-no-drag="true"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              onClick={() => {
                handleItemTrigger(item);
              }}
              title={item.title}
              className="no-drag relative w-7 h-7 rounded-md flex items-center justify-center cursor-pointer text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)]"
            >
              {item.icon}
              {item.badge != null && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--flint-accent)] animate-pulse" />
              )}
            </button>
          );
        })}

        {/* Quick Open & Command Palette Button */}
        <button
          data-action-rail-id="core:command-palette"
          data-no-drag="true"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={() => setIsCommandPaletteOpen(true)}
          title="Quick Open & commands (Ctrl+K)"
          data-tooltip="Quick Open & commands (Ctrl+K)"
          className="no-drag w-7 h-7 rounded-md flex items-center justify-center text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer"
        >
          <CommandIcon size={16} />
        </button>
      </div>

      {/* Bottom Group (Hearth, Help, Settings) - Only visible when Left Sidebar is collapsed */}
      {!isLeftSidebarOpen && (
        <div data-no-drag="true" className="no-drag flex flex-col items-center gap-1 w-full pt-1.5 border-t border-[var(--flint-border-base)]">
          {/* Hearth Switcher */}
          <button
            data-action-rail-id="core:hearth-switcher"
            data-no-drag="true"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onClick={() => setIsHearthModalOpen(true)}
            title="Hearth switcher (Ctrl+Shift+O)"
            data-tooltip="Hearth switcher (Ctrl+Shift+O)"
            className="no-drag w-7 h-7 rounded-md flex items-center justify-center text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer"
          >
            <ArrowUpDownIcon size={15} />
          </button>

          {/* Help & Hotkeys */}
          <button
            data-action-rail-id="core:help"
            data-no-drag="true"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onClick={() => setIsHelpModalOpen(true)}
            title="Help & shortcuts (F1)"
            data-tooltip="Help & shortcuts (F1)"
            className="no-drag w-7 h-7 rounded-md flex items-center justify-center text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer"
          >
            <HelpCircleIcon size={16} />
          </button>

          {/* Settings */}
          <button
            data-action-rail-id="core:settings"
            data-no-drag="true"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            onClick={handleOpenSettings}
            title="Settings (Ctrl+,)"
            data-tooltip="Settings (Ctrl+,)"
            className="no-drag w-7 h-7 rounded-md flex items-center justify-center text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer"
          >
            <Settings02Icon size={16} />
          </button>
        </div>
      )}
    </aside>
  );
});

// Alias for backwards compatibility
export const Ribbon = ActionRail;
