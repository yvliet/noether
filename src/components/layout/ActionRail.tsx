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

  const createNewNote = useDocumentStore((s) => s.createNewNote);

  const handleCreateNewNote = useCallback(async () => {
    await createNewNote('Untitled');
  }, [createNewNote]);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, [setIsSettingsOpen]);

  return (
    <aside
      data-action-rail="true"
      data-ribbon="true"
      aria-label="Action Rail"
      style={{ background: 'var(--flint-bg-ribbon, var(--flint-bg-sidebar))' }}
      className="flint-action-rail flint-ribbon relative w-11 flex flex-col items-center justify-between py-2 select-none z-20 shrink-0 border-r border-[var(--flint-border-base)]"
    >
      {/* Top Action Icons */}
      <div className="flex flex-col items-center gap-1 w-full">
        {/* Flint Blaze Logo */}
        <div
          onClick={() => setMainViewMode('document')}
          className="w-8 h-8 rounded-lg flex items-center justify-center mb-1 cursor-pointer hover:bg-[var(--flint-bg-card-hover)] transition-colors"
          title="Flint"
        >
          <FlintLogoIcon size={20} className="text-[var(--flint-text-primary)]" />
        </div>

        {/* Quick New Note */}
        <button
          onClick={handleCreateNewNote}
          title="Create new note (Ctrl+N)"
          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] transition-colors cursor-pointer"
        >
          <FileAddIcon size={16} />
        </button>

        {/* Dynamic Registered Items from Built-in & Community Extensions */}
        {ribbonItems.map((item) => {
          const isActive =
            typeof item.isActive === 'function'
              ? item.isActive(app)
              : typeof item.isActive === 'boolean'
              ? item.isActive
              : false;

          return (
            <button
              key={item.id}
              onClick={() => item.onClick(app)}
              title={item.title}
              className={`relative w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                isActive
                  ? 'text-[var(--flint-text-primary)] bg-[var(--flint-bg-card-hover)]'
                  : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)]'
              }`}
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
          onClick={() => setIsCommandPaletteOpen(true)}
          title="Quick Open & commands (Ctrl+K)"
          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] transition-colors cursor-pointer"
        >
          <CommandIcon size={16} />
        </button>
      </div>

      {/* Bottom Group (Hearth, Help, Settings) - Only visible when Left Sidebar is collapsed */}
      {!isLeftSidebarOpen && (
        <div className="flex flex-col items-center gap-1 w-full pt-1.5 border-t border-[var(--flint-border-base)]">
          {/* Hearth Switcher */}
          <button
            onClick={() => setIsHearthModalOpen(true)}
            title="Hearth switcher (Ctrl+Shift+O)"
            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] transition-colors cursor-pointer"
          >
            <ArrowUpDownIcon size={15} />
          </button>

          {/* Help & Hotkeys */}
          <button
            onClick={() => setIsHelpModalOpen(true)}
            title="Help & shortcuts (F1)"
            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] transition-colors cursor-pointer"
          >
            <HelpCircleIcon size={16} />
          </button>

          {/* Settings */}
          <button
            onClick={handleOpenSettings}
            title="Settings (Ctrl+,)"
            className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] transition-colors cursor-pointer"
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
