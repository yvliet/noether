import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  NoetherLogoIcon,
  FolderOpenIcon,
  Cancel01Icon,
  ArrowLeft01Icon,
  MoreVerticalIcon,
  Copy01Icon,
  Edit02Icon,
  MoveFileIcon,
  WindowMinimizeIcon,
  WindowMaximizeIcon,
  WindowRestoreIcon,
  WindowCloseIcon,
} from '@/components/common/Icons';
import { RecentVaultItem } from '@/types';
import { TooltipProvider } from '@/components/common/TooltipProvider';
import { useIsMaximized } from '@/hooks/useIsMaximized';
import { platform } from '@/lib/platform/platformAdapter';
import { APP_VERSION } from '@/version';

export const VaultSwitcherWindow: React.FC = React.memo(() => {
  const isMaximized = useIsMaximized();
  const [view, setView] = useState<'main' | 'create'>('main');
  const [currentVaultPath, setCurrentVaultPath] = useState<string>('');
  const [recentVaults, setRecentVaults] = useState<RecentVaultItem[]>([]);
  const [newVaultName, setNewVaultName] = useState('');
  const [newVaultLocation, setNewVaultLocation] = useState('');
  const [activeMenuPath, setActiveMenuPath] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top?: number; right?: number; bottom?: number }>({});

  const [editingVaultPath, setEditingVaultPath] = useState<string | null>(null);
  const [editVaultName, setEditVaultName] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingVaultPath && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingVaultPath]);

  // Load vault information on window open
  useEffect(() => {
    platform.getCurrentVault().then((data) => {
      if (data) {
        setCurrentVaultPath(data.path);
        setRecentVaults(data.recentVaults || []);
      }
    });
  }, []);

  // Close context menu on global click / mousedown
  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuPath(null);
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  const handleMinimize = useCallback(() => {
    platform.minimize();
  }, []);

  const handleMaximize = useCallback(() => {
    platform.maximize();
  }, []);

  const handleClose = useCallback(() => {
    platform.close();
    platform.closeVaultWindow();
  }, []);

  const handleOpenRecent = useCallback(async (targetPath: string) => {
    if (editingVaultPath) return;
    if (targetPath && currentVaultPath && targetPath.toLowerCase() === currentVaultPath.toLowerCase()) {
      await platform.closeVaultWindow();
      return;
    }
    await platform.setCurrentVault(targetPath);
  }, [editingVaultPath, currentVaultPath]);

  const handleSaveRename = useCallback(async (targetPath: string) => {
    const trimmed = editVaultName.trim();
    if (trimmed) {
      const res = await platform.renameVault(targetPath, trimmed);
      if (res && res.success) {
        const newPath = res.path || targetPath;
        if (targetPath === currentVaultPath) {
          setCurrentVaultPath(newPath);
        }
        if (res.recentVaults && res.recentVaults.length > 0) {
          setRecentVaults(res.recentVaults);
        } else {
          setRecentVaults((prev) =>
            prev.map((v) => (v.path === targetPath ? { ...v, name: trimmed, path: newPath } : v))
          );
        }
      } else if (res?.error) {
        alert(res.error);
      }
    }
    setEditingVaultPath(null);
  }, [editVaultName, currentVaultPath]);

  const handleRemoveRecent = useCallback(async (targetPath: string) => {
    const res = await platform.removeRecentVault(targetPath);
    if (res && res.success) {
      setRecentVaults(res.recentVaults || []);
    }
  }, []);

  const handleOpenFolderAsVault = useCallback(async () => {
    await platform.selectVaultFolder();
  }, []);

  const handleBrowseLocation = useCallback(async () => {
    const res = await platform.selectParentFolder();
    if (res && !res.canceled && res.path) {
      setNewVaultLocation(res.path);
    }
  }, []);

  const handleCreateVault = useCallback(async () => {
    if (!newVaultName.trim() || !newVaultLocation.trim()) return;
    await platform.createNewVault(newVaultName.trim(), newVaultLocation.trim());
  }, [newVaultName, newVaultLocation]);

  const handleOpenInExplorer = useCallback(async () => {
    await platform.openVaultInExplorer(currentVaultPath);
  }, [currentVaultPath]);

  return (
    <div className="relative w-full h-full flex flex-row bg-[var(--noether-bg-app)] text-[var(--noether-text-primary)] select-none font-sans overflow-hidden">
      {/* LEFT COLUMN: Clean Vaults List */}
      <div className="w-[280px] bg-[var(--noether-bg-sidebar)] border-r border-[var(--noether-border-base)] h-full flex flex-col pt-7 px-3 pb-4 shrink-0 overflow-hidden relative">
        {/* Drag handle at top of left column */}
        <div
          className="absolute top-0 left-0 right-0 h-7 cursor-default"
          data-tauri-drag-region
          onMouseDown={() => platform.startDragging()}
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-0.5 pr-0.5">
          {recentVaults && recentVaults.length > 0 ? (
            recentVaults.map((rv) => {
              const isEditing = editingVaultPath === rv.path;
              return (
                <div
                  key={rv.path}
                  onClick={() => {
                    if (!isEditing) handleOpenRecent(rv.path);
                  }}
                  className="group relative flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer bg-transparent text-[var(--noether-text-muted)] hover:bg-[var(--noether-bg-sidebar-hover)] hover:text-[var(--noether-text-primary)]"
                >
                  <div className="flex flex-col min-w-0 pr-2 flex-1 overflow-visible">
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editVaultName}
                        onChange={(e) => setEditVaultName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSaveRename(rv.path);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingVaultPath(null);
                          }
                        }}
                        onBlur={() => handleSaveRename(rv.path)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-transparent border-none outline-none p-0 m-0 text-[13px] tracking-tight text-[var(--noether-text-primary)] font-normal caret-white selection:bg-[#505560] selection:text-white leading-tight"
                      />
                    ) : (
                      <span className="text-[13px] text-[var(--noether-text-primary)] font-normal tracking-tight truncate">
                        {rv.name || 'Vault'}
                      </span>
                    )}
                    <span className="text-[11px] text-[var(--noether-text-muted)] font-normal truncate mt-0.5 select-text">
                      {rv.path}
                    </span>
                  </div>

                  {!isEditing && (
                    <div className="relative shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeMenuPath === rv.path) {
                            setActiveMenuPath(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const spaceBelow = window.innerHeight - rect.bottom;
                            if (spaceBelow < 180 && rect.top > 180) {
                              setMenuPos({
                                bottom: window.innerHeight - rect.top + 4,
                                right: Math.max(8, window.innerWidth - rect.right),
                              });
                            } else {
                              setMenuPos({
                                top: rect.bottom + 4,
                                right: Math.max(8, window.innerWidth - rect.right),
                              });
                            }
                            setActiveMenuPath(rv.path);
                          }
                        }}
                        className="p-1 rounded text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Options"
                      >
                        <MoreVerticalIcon size={14} />
                      </button>

                      {activeMenuPath === rv.path &&
                        createPortal(
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'fixed',
                              top: menuPos.top !== undefined ? `${menuPos.top}px` : undefined,
                              bottom: menuPos.bottom !== undefined ? `${menuPos.bottom}px` : undefined,
                              right: menuPos.right !== undefined ? `${menuPos.right}px` : undefined,
                              zIndex: 99999,
                            }}
                            className="w-[230px] bg-[var(--noether-bg-popover,var(--noether-bg-card))] border border-[var(--noether-border-base)] rounded-lg shadow-2xl p-1 text-xs text-[var(--noether-text-primary)] select-none flex flex-col font-sans"
                          >
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(rv.path);
                                setActiveMenuPath(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-[var(--noether-bg-card-hover)] rounded-md text-[var(--noether-text-primary)] flex items-center gap-2.5 cursor-pointer"
                            >
                              <Copy01Icon size={14} className="text-[var(--noether-text-muted)]" />
                              <span>Copy Vault path</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuPath(null);
                                setEditingVaultPath(rv.path);
                                setEditVaultName(rv.name || 'Vault');
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-[var(--noether-bg-card-hover)] rounded-md text-[var(--noether-text-primary)] flex items-center gap-2.5 cursor-pointer"
                            >
                              <Edit02Icon size={14} className="text-[var(--noether-text-muted)]" />
                              <span>Rename Vault...</span>
                            </button>

                          <button
                            onClick={async () => {
                              setActiveMenuPath(null);
                              await platform.selectParentFolder();
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-[var(--noether-bg-card-hover)] rounded-md text-[var(--noether-text-primary)] flex items-center gap-2.5 cursor-pointer"
                          >
                            <MoveFileIcon size={14} className="text-[var(--noether-text-muted)]" />
                            <span>Move Vault...</span>
                          </button>

                          <div className="h-[1px] bg-[var(--noether-border-subtle)] my-1" />

                          <button
                            onClick={() => {
                              setActiveMenuPath(null);
                              platform.openVaultInExplorer(rv.path);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-[var(--noether-bg-card-hover)] rounded-md text-[var(--noether-text-primary)] flex items-center gap-2.5 cursor-pointer"
                          >
                            <FolderOpenIcon size={14} className="text-[var(--noether-text-muted)]" />
                            <span>Reveal Vault in file explorer</span>
                          </button>

                          <div className="h-[1px] bg-[var(--noether-border-subtle)] my-1" />

                          <button
                            onClick={() => {
                              setActiveMenuPath(null);
                              handleRemoveRecent(rv.path);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-[var(--noether-bg-card-hover)] rounded-md text-[var(--noether-danger,#ef4444)] hover:text-red-400 flex items-center gap-2.5 cursor-pointer"
                          >
                            <Cancel01Icon size={14} className="text-[var(--noether-danger,#ef4444)]" />
                            <span>Remove from list</span>
                          </button>
                        </div>,
                        document.body
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-[11px] text-[var(--noether-text-muted)]">
              No recent Vaults found.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Full 100% height */}
      <div className="flex-1 bg-[var(--noether-bg-app)] h-full flex flex-col items-center justify-center p-8 overflow-hidden relative">
        {/* Drag handle across top of right column */}
        <div
          className="absolute top-0 left-0 right-28 h-8 z-40 cursor-default"
          data-tauri-drag-region
          onMouseDown={() => platform.startDragging()}
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />

        {/* Top-Right Frameless Window Controls */}
        <div
          className="absolute top-0 right-0 z-50 flex items-center h-8"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={handleMinimize}
            className="h-full w-10 hover:bg-[var(--noether-bg-card-hover)] text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] flex items-center justify-center cursor-pointer"
            title="Minimize"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <WindowMinimizeIcon />
          </button>
          <button
            onClick={handleMaximize}
            className="h-full w-10 hover:bg-[var(--noether-bg-card-hover)] text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] flex items-center justify-center cursor-pointer"
            title={isMaximized ? 'Restore' : 'Maximize'}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {isMaximized ? <WindowRestoreIcon /> : <WindowMaximizeIcon />}
          </button>
          <button
            onClick={handleClose}
            className="h-full w-10 hover:bg-[#e81123] text-[var(--noether-text-muted)] hover:text-white flex items-center justify-center cursor-pointer"
            title="Close"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <WindowCloseIcon />
          </button>
        </div>

        {/* PERMANENT STATIONARY BRANDING (Size and position never change) */}
        <div className="flex flex-col items-center mb-7 shrink-0 select-none">
          <NoetherLogoIcon size={100} className="mb-3" />
          <h1 className="text-2xl font-medium tracking-tight text-[var(--noether-text-primary)] font-brand">Noether</h1>
          <span className="text-xs text-[var(--noether-text-muted)] mt-1">Version {APP_VERSION}</span>
        </div>

        {/* VIEWPORT CONTAINER */}
        <div className="w-full max-w-[480px] relative">
          {view === 'main' ? (
            /* VIEW 1: MAIN ACTION CARDS */
            <div className="w-full flex flex-col gap-3 px-1">
              {/* Card 1: Create new Vault */}
              <div className="bg-[var(--noether-bg-card)] border border-[var(--noether-border-base)] rounded-xl p-4 flex items-center justify-between">
                <div className="flex flex-col pr-3">
                  <span className="font-semibold text-xs text-[var(--noether-text-primary)]">Create new Vault</span>
                  <span className="text-[11px] text-[var(--noether-text-muted)] mt-0.5">
                    Create a new Noether Vault under a folder.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setNewVaultName('');
                    setNewVaultLocation('');
                    setView('create');
                  }}
                  className="noether-btn noether-btn-primary shrink-0"
                >
                  Create
                </button>
              </div>

              {/* Card 2: Open folder as Vault */}
              <div className="bg-[var(--noether-bg-card)] border border-[var(--noether-border-base)] rounded-xl p-4 flex items-center justify-between">
                <div className="flex flex-col pr-3">
                  <span className="font-semibold text-xs text-[var(--noether-text-primary)]">Open folder as Vault</span>
                  <span className="text-[11px] text-[var(--noether-text-muted)] mt-0.5">
                    Choose an existing folder of Markdown files.
                  </span>
                </div>
                <button
                  onClick={handleOpenFolderAsVault}
                  className="noether-btn shrink-0 flex items-center gap-1.5"
                >
                  <FolderOpenIcon size={13} />
                  <span>Open</span>
                </button>
              </div>

              {/* Card 3: Open in Explorer */}
              {currentVaultPath && (
                <div className="bg-[var(--noether-bg-card)] border border-[var(--noether-border-base)] rounded-xl p-4 flex items-center justify-between">
                  <div className="flex flex-col pr-3">
                    <span className="font-semibold text-xs text-[var(--noether-text-primary)]">Open in File Explorer</span>
                    <span className="text-[11px] text-[var(--noether-text-muted)] mt-0.5">
                      View currently opened Vault files on disk.
                    </span>
                  </div>
                  <button
                    onClick={handleOpenInExplorer}
                    className="noether-btn shrink-0"
                  >
                    Show
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* VIEW 2: CREATE LOCAL VAULT VIEW */
            <div className="w-full flex flex-col px-1">
              {/* Back button & Title aligned with card content */}
              <div className="px-4 flex flex-col">
                <button
                  onClick={() => setView('main')}
                  className="flex items-center gap-1.5 text-xs text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] mb-1 w-fit cursor-pointer -ml-0.5"
                >
                  <ArrowLeft01Icon size={13} />
                  <span>Back</span>
                </button>
                <h2 className="text-sm font-bold text-[var(--noether-text-primary)] mb-3">Create local Vault</h2>
              </div>

              {/* Form Card */}
              <div className="bg-[var(--noether-bg-card)] border border-[var(--noether-border-base)] rounded-xl p-4 flex flex-col">
                {/* Row 1: Vault Name */}
                <div className="flex items-center justify-between pb-3.5">
                  <div className="flex flex-col pr-4">
                    <span className="font-semibold text-xs text-[var(--noether-text-primary)]">Vault name</span>
                    <span className="text-[11px] text-[var(--noether-text-muted)] mt-0.5">
                      Pick a name for your Vault.
                    </span>
                  </div>
                  <input
                    type="text"
                    value={newVaultName}
                    onChange={(e) => setNewVaultName(e.target.value)}
                    placeholder="Vault name"
                    className="w-48 bg-[var(--noether-bg-input)] border border-[var(--noether-border-base)] focus:border-[var(--noether-border-focus,var(--noether-accent))] rounded-[5px] px-3 py-1.5 text-xs text-[var(--noether-text-primary)] outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]"
                  />
                </div>

                {/* Divider Line */}
                <div className="border-t border-[var(--noether-border-subtle)] w-full" />

                {/* Row 2: Location */}
                <div className="flex items-center justify-between pt-3.5">
                  <div className="flex flex-col pr-4 min-w-0">
                    <span className="font-semibold text-xs text-[var(--noether-text-primary)]">Location</span>
                    <span className="text-[11px] text-[var(--noether-text-muted)] mt-0.5 truncate">
                      Pick a location for your new Vault.
                    </span>
                    {newVaultLocation && (
                      <span className="text-[10px] text-emerald-400 truncate mt-1 select-text">
                        {newVaultLocation}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleBrowseLocation}
                    className="noether-btn shrink-0"
                  >
                    Browse
                  </button>
                </div>
              </div>

              {/* Centered Create Button */}
              <div className="flex justify-center mt-5">
                <button
                  onClick={handleCreateVault}
                  disabled={!newVaultName.trim() || !newVaultLocation.trim()}
                  className="noether-btn noether-btn-primary !px-7 !py-2"
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <TooltipProvider />
    </div>
  );
});

export default VaultSwitcherWindow;
