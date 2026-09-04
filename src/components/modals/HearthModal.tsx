import React, { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import {
  FlintLogoIcon,
  Cancel01Icon,
  FolderOpenIcon,
  MoreVerticalIcon,
  Copy01Icon,
  Edit02Icon,
  MoveFileIcon,
} from '@/components/common/Icons';
import { useAppContextMenu, ContextMenuItem } from '@/components/common/ContextMenu';
import { platform } from '@/lib/platform/platformAdapter';
import { RecentHearthItem } from '@/types';

export const HearthModal: React.FC = React.memo(() => {
  const isHearthModalOpen = useWorkspaceStore((state) => state.isHearthModalOpen || state.isVaultModalOpen);
  const setIsHearthModalOpen = useWorkspaceStore((state) => state.setIsHearthModalOpen);
  const hearthPath = useWorkspaceStore((state) => state.hearthPath || state.vaultPath);
  const recentHearths = useWorkspaceStore((state) => state.recentHearths || state.recentVaults);
  const selectHearthFolder = useWorkspaceStore((state) => state.selectHearthFolder);
  const selectParentFolder = useWorkspaceStore((state) => state.selectParentFolder);
  const createNewHearth = useWorkspaceStore((state) => state.createNewHearth);
  const renameHearth = useWorkspaceStore((state) => state.renameHearth);
  const removeRecentHearth = useWorkspaceStore((state) => state.removeRecentHearth);
  const switchHearth = useWorkspaceStore((state) => state.switchHearth);
  const openHearthInExplorer = useWorkspaceStore((state) => state.openHearthInExplorer);
  const showToast = useWorkspaceStore((state) => state.showToast);

  const { showContextMenu } = useAppContextMenu();

  const [isCreating, setIsCreating] = useState(false);
  const [newHearthName, setNewHearthName] = useState('My Notes');
  const [newHearthParentPath, setNewHearthParentPath] = useState('');

  // Inline rename state
  const [editingHearthPath, setEditingHearthPath] = useState<string | null>(null);
  const [editHearthName, setEditHearthName] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingHearthPath && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingHearthPath]);

  if (!isHearthModalOpen) return null;

  const handleBrowseParent = async () => {
    const chosen = await selectParentFolder();
    if (chosen) {
      setNewHearthParentPath(chosen);
    }
  };

  const handleConfirmCreate = async () => {
    if (!newHearthName.trim()) return;
    await createNewHearth(newHearthName.trim(), newHearthParentPath);
    setIsCreating(false);
    setIsHearthModalOpen(false);
  };

  const handleOpenFolderAsHearth = async () => {
    await selectHearthFolder();
    setIsHearthModalOpen(false);
  };

  const handleSwitchHearth = async (targetPath: string) => {
    if (editingHearthPath) return;
    if (targetPath && hearthPath && targetPath.toLowerCase() === hearthPath.toLowerCase()) {
      showToast('This Hearth is already open', 'info');
      setIsHearthModalOpen(false);
      return;
    }
    await switchHearth(targetPath);
    setIsHearthModalOpen(false);
  };

  const handleSaveRename = async (targetPath: string) => {
    const trimmed = editHearthName.trim();
    if (trimmed) {
      await renameHearth(targetPath, trimmed);
    }
    setEditingHearthPath(null);
  };

  const getMenuItems = (rv: RecentHearthItem): ContextMenuItem[] => [
    {
      id: 'copy-hearth-id',
      title: 'Copy Hearth path',
      icon: <Copy01Icon size={14} />,
      onClick: () => {
        navigator.clipboard.writeText(rv.path);
        showToast('Copied Hearth path to clipboard', 'info');
      },
    },
    {
      id: 'rename-hearth',
      title: 'Rename Hearth...',
      icon: <Edit02Icon size={14} />,
      onClick: () => {
        setEditingHearthPath(rv.path);
        setEditHearthName(rv.name || 'Hearth');
      },
    },
    {
      id: 'move-hearth',
      title: 'Move Hearth...',
      icon: <MoveFileIcon size={14} />,
      onClick: async () => {
        const newParent = await selectParentFolder();
        if (newParent) {
          showToast(`Selected location: ${newParent}`, 'info');
        }
      },
    },
    { type: 'separator' },
    {
      id: 'reveal-in-explorer',
      title: 'Reveal Hearth in file explorer',
      icon: <FolderOpenIcon size={14} />,
      onClick: () => {
        platform.openHearthInExplorer(rv.path);
      },
    },
    { type: 'separator' },
    {
      id: 'remove-recent',
      title: 'Remove from list',
      icon: <Cancel01Icon size={14} />,
      isDanger: true,
      onClick: () => {
        removeRecentHearth(rv.path);
      },
    },
  ];

  return (
    <div
      onClick={() => setIsHearthModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none font-sans"
    >
      <div
        data-card="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[780px] h-[520px] bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-subtle,#2b2b2b)] rounded-xl shadow-2xl overflow-hidden flex flex-row text-xs text-[var(--flint-text-secondary,#dcddde)] relative"
      >
        {/* Top Right Close Button */}
        <button
          onClick={() => setIsHearthModalOpen(false)}
          className="absolute top-3 right-3 z-30 p-1.5 rounded-md hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer"
          title="Close"
        >
          <Cancel01Icon size={14} />
        </button>

        {/* LEFT PANE: Existing / Recent Hearths List */}
        <div className="w-[280px] bg-[var(--flint-bg-sidebar,#141414)] border-r border-[var(--flint-border-subtle,#242424)] flex flex-col p-3 shrink-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-0.5 pr-0.5">
            {recentHearths && recentHearths.length > 0 ? (
              recentHearths.map((rv) => {
                const isEditing = editingHearthPath === rv.path;
                return (
                  <div
                    key={rv.path}
                    onClick={() => {
                      if (!isEditing) handleSwitchHearth(rv.path);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      showContextMenu(e, getMenuItems(rv));
                    }}
                    className="group relative flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors bg-transparent text-[var(--flint-text-secondary,#999)] hover:bg-[var(--flint-bg-sidebar-hover,#202020)] hover:text-[var(--flint-text-primary,#e0e0e0)]"
                  >
                    <div className="flex flex-col min-w-0 pr-2 flex-1 select-none overflow-visible">
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editHearthName}
                          onChange={(e) => setEditHearthName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSaveRename(rv.path);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingHearthPath(null);
                            }
                          }}
                          onBlur={() => handleSaveRename(rv.path)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-transparent border-none outline-none p-0 m-0 text-[13px] tracking-tight text-[var(--flint-text-primary,#fff)] font-normal caret-[var(--flint-text-primary,#fff)] selection:bg-[#505560] selection:text-white leading-tight"
                        />
                      ) : (
                        <span className="text-[13px] text-[var(--flint-text-primary)] font-normal tracking-tight truncate">
                          {rv.name || 'Hearth'}
                        </span>
                      )}
                      <span className="text-[11px] text-[var(--flint-text-muted,#777)] font-normal truncate mt-0.5 select-text">
                        {rv.path}
                      </span>
                    </div>

                    {!isEditing && (
                      <div className="relative shrink-0 flex items-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            showContextMenu({ x: rect.right, y: rect.bottom + 4 }, getMenuItems(rv));
                          }}
                          className="p-1 rounded text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Options"
                        >
                          <MoreVerticalIcon size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-[11px] text-[var(--flint-text-muted,#555)]">
                No recent Hearths found.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Branding & Action Cards */}
        <div className="flex-1 bg-[var(--flint-bg-main,#181818)] flex flex-col items-center justify-center p-8 overflow-y-auto custom-scrollbar">
          {/* Logo & Branding */}
          <div className="flex flex-col items-center mb-7 shrink-0">
            <FlintLogoIcon size={100} className="mb-3 text-[var(--flint-text-primary)]" />
            <h1 className="text-2xl font-bold tracking-tight text-[var(--flint-text-primary)] font-sans">Flint</h1>
            <span className="text-xs text-[var(--flint-text-muted,#777)] mt-1">Version 0.1.0</span>
          </div>

          {/* Action Cards Container */}
          <div className="w-full max-w-[420px] flex flex-col gap-3">
            {/* Card 1: Create new Hearth */}
            <div className="bg-[var(--flint-bg-card,#202020)] border border-[var(--flint-border-subtle,#2c2c2c)] rounded-xl p-4 transition-all shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex flex-col pr-3">
                  <span className="font-semibold text-xs text-[var(--flint-text-primary)]">Create new Hearth</span>
                  <span className="text-[11px] text-[var(--flint-text-muted,#888)] mt-0.5">
                    Create a new Flint Hearth under a folder.
                  </span>
                </div>
                {!isCreating && (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="flint-btn flint-btn-primary shrink-0"
                  >
                    Create
                  </button>
                )}
              </div>

              {/* Expanded Create Form */}
              {isCreating && (
                <div className="mt-4 pt-3 border-t border-[var(--flint-border-subtle,#2d2d2d)] flex flex-col gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--flint-text-muted,#888)]">
                      Hearth Name
                    </label>
                    <input
                      type="text"
                      value={newHearthName}
                      onChange={(e) => setNewHearthName(e.target.value)}
                      placeholder="My Notes"
                      className="w-full bg-[var(--flint-bg-input)] border border-[var(--flint-border-base)] focus:border-[var(--flint-border-strong)] rounded-[5px] px-2.5 py-1.5 text-xs text-[var(--flint-text-primary)] outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--flint-text-muted,#888)]">
                      Location
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={newHearthParentPath || 'Default Documents'}
                        placeholder="Choose location..."
                        className="flex-1 bg-[var(--flint-bg-input)] border border-[var(--flint-border-base)] rounded-[5px] px-2.5 py-1.5 text-xs text-[var(--flint-text-muted,#999)] outline-none truncate text-[11px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
                      />
                      <button
                        onClick={handleBrowseParent}
                        className="flint-btn shrink-0"
                      >
                        Browse
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-1">
                    <button
                      onClick={() => setIsCreating(false)}
                      className="flint-btn"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmCreate}
                      disabled={!newHearthName.trim()}
                      className="flint-btn flint-btn-primary"
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Open folder as Hearth */}
            <div className="bg-[var(--flint-bg-card,#202020)] border border-[var(--flint-border-subtle,#2c2c2c)] rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div className="flex flex-col pr-3">
                <span className="font-semibold text-xs text-[var(--flint-text-primary)]">Open folder as Hearth</span>
                <span className="text-[11px] text-[var(--flint-text-muted,#888)] mt-0.5">
                  Choose an existing folder of Markdown files.
                </span>
              </div>
              <button
                onClick={handleOpenFolderAsHearth}
                className="flint-btn shrink-0 flex items-center gap-1.5"
              >
                <FolderOpenIcon size={13} />
                <span>Open</span>
              </button>
            </div>

            {/* Card 3: Reveal in Explorer */}
            {hearthPath && (
              <div className="bg-[var(--flint-bg-card,#202020)] border border-[var(--flint-border-subtle,#2c2c2c)] rounded-xl p-4 flex items-center justify-between shadow-xs">
                <div className="flex flex-col pr-3">
                  <span className="font-semibold text-xs text-[var(--flint-text-primary)]">Open in File Explorer</span>
                  <span className="text-[11px] text-[var(--flint-text-muted,#888)] mt-0.5">
                    View currently opened Hearth files on disk.
                  </span>
                </div>
                <button
                  onClick={openHearthInExplorer}
                  className="flint-btn shrink-0"
                >
                  Show
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// Alias for backwards compatibility
export const VaultModal = HearthModal;
export default HearthModal;
