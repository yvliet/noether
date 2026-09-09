import React, { useCallback } from 'react';
import {
  TerminalIcon,
  HelpCircleIcon,
  Settings02Icon,
  ArrowUpDownIcon,
} from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useFlintApp, useRibbonItems } from '@/core/app/AppContext';
import { useSettingsStore } from '@/store/settingsStore';
import { platform } from '@/lib/platform/platformAdapter';

export const ActionRail: React.FC = React.memo(() => {
  const app = useFlintApp();
  const ribbonItems = useRibbonItems();

  const isLeftSidebarOpen = useWorkspaceStore((s) => s.isLeftSidebarOpen);
  const setIsCommandPaletteOpen = useWorkspaceStore((s) => s.setIsCommandPaletteOpen);
  const setIsSettingsOpen = useWorkspaceStore((s) => s.setIsSettingsOpen);
  const setIsHelpModalOpen = useWorkspaceStore((s) => s.setIsHelpModalOpen);
  const setIsHearthModalOpen = useWorkspaceStore((s) => s.setIsHearthModalOpen);
  const showToast = useWorkspaceStore((s) => s.showToast);

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
        {/* Command Palette Button (Topmost) */}
        <button
          data-action-rail-id="core:command-palette"
          data-no-drag="true"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={() => setIsCommandPaletteOpen(true)}
          title="Command palette (Ctrl+K)"
          data-tooltip="Command palette (Ctrl+K)"
          className="no-drag w-7 h-7 rounded-md flex items-center justify-center text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer"
        >
          <TerminalIcon size={16} />
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
              onPointerDown={(event) => {
                if (event.button === 0) {
                  event.preventDefault();
                  event.stopPropagation();
                  handleItemTrigger(item);
                }
              }}
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
