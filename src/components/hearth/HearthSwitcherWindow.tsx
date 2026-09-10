import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FlintLogoIcon,
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
import { RecentHearthItem } from '@/types';
import { TooltipProvider } from '@/components/common/TooltipProvider';
import { useIsMaximized } from '@/hooks/useIsMaximized';
import { platform } from '@/lib/platform/platformAdapter';
import { APP_VERSION } from '@/version';

export const HearthSwitcherWindow: React.FC = React.memo(() => {
  const isMaximized = useIsMaximized();
  const [view, setView] = useState<'main' | 'create'>('main');
  const [currentHearthPath, setCurrentHearthPath] = useState<string>('');
  const [recentHearths, setRecentHearths] = useState<RecentHearthItem[]>([]);
  const [newHearthName, setNewHearthName] = useState('');
  const [newHearthLocation, setNewHearthLocation] = useState('');
  const [activeMenuPath, setActiveMenuPath] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top?: number; right?: number; bottom?: number }>({});

  const [editingHearthPath, setEditingHearthPath] = useState<string | null>(null);
  const [editHearthName, setEditHearthName] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingHearthPath && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingHearthPath]);

  // Load hearth information on window open
  useEffect(() => {
    platform.getCurrentHearth().then((data) => {
      if (data) {
        setCurrentHearthPath(data.path);
        setRecentHearths(data.recentHearths || []);
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
    platform.closeHearthWindow();
  }, []);

  const handleOpenRecent = useCallback(async (targetPath: string) => {
    if (editingHearthPath) return;
    if (targetPath && currentHearthPath && targetPath.toLowerCase() === currentHearthPath.toLowerCase()) {
      await platform.closeHearthWindow();
      return;
    }
    await platform.setCurrentHearth(targetPath);
  }, [editingHearthPath, currentHearthPath]);

  const handleSaveRename = useCallback(async (targetPath: string) => {
    const trimmed = editHearthName.trim();
    if (trimmed) {
      const res = await platform.renameHearth(targetPath, trimmed);
      if (res && res.success) {
        const newPath = res.path || targetPath;
        if (targetPath === currentHearthPath) {
          setCurrentHearthPath(newPath);
        }
        if (res.recentHearths && res.recentHearths.length > 0) {
          setRecentHearths(res.recentHearths);
        } else {
          setRecentHearths((prev) =>
            prev.map((v) => (v.path === targetPath ? { ...v, name: trimmed, path: newPath } : v))
          );
        }
      } else if (res?.error) {
        alert(res.error);
      }
    }
    setEditingHearthPath(null);
  }, [editHearthName, currentHearthPath]);

  const handleRemoveRecent = useCallback(async (targetPath: string) => {
    const res = await platform.removeRecentHearth(targetPath);
    if (res && res.success) {
      setRecentHearths(res.recentHearths || []);
    }
  }, []);

  const handleOpenFolderAsHearth = useCallback(async () => {
    await platform.selectHearthFolder();
  }, []);

  const handleBrowseLocation = useCallback(async () => {
    const res = await platform.selectParentFolder();
    if (res && !res.canceled && res.path) {
      setNewHearthLocation(res.path);
    }
  }, []);

  const handleCreateHearth = useCallback(async () => {
    if (!newHearthName.trim() || !newHearthLocation.trim()) return;
    await platform.createNewHearth(newHearthName.trim(), newHearthLocation.trim());
  }, [newHearthName, newHearthLocation]);

  const handleOpenInExplorer = useCallback(async () => {
    await platform.openHearthInExplorer(currentHearthPath);
  }, [currentHearthPath]);

  return (
    <div className="relative w-full h-full flex flex-row bg-[var(--flint-bg-app)] text-[var(--flint-text-primary)] select-none font-sans overflow-hidden">
      {/* LEFT COLUMN: Clean Hearths List */}
      <div className="w-[280px] bg-[var(--flint-bg-sidebar)] border-r border-[var(--flint-border-base)] h-full flex flex-col pt-7 px-3 pb-4 shrink-0 overflow-hidden relative">
        {/* Drag handle at top of left column */}
        <div
          className="absolute top-0 left-0 right-0 h-7 cursor-default"
          data-tauri-drag-region
          onMouseDown={() => platform.startDragging()}
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-0.5 pr-0.5">
          {recentHearths && recentHearths.length > 0 ? (
            recentHearths.map((rv) => {
              const isEditing = editingHearthPath === rv.path;
              return (
                <div
                  key={rv.path}
                  onClick={() => {
                    if (!isEditing) handleOpenRecent(rv.path);
                  }}
                  className="group relative flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer bg-transparent text-[var(--flint-text-muted)] hover:bg-[var(--flint-bg-sidebar-hover)] hover:text-[var(--flint-text-primary)]"
                >
                  <div className="flex flex-col min-w-0 pr-2 flex-1 overflow-visible">
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
                        className="w-full bg-transparent border-none outline-none p-0 m-0 text-[13px] tracking-tight text-[var(--flint-text-primary)] font-normal caret-white selection:bg-[#505560] selection:text-white leading-tight"
                      />
                    ) : (
                      <span className="text-[13px] text-[var(--flint-text-primary)] font-normal tracking-tight truncate">
                        {rv.name || 'Hearth'}
                      </span>
                    )}
                    <span className="text-[11px] text-[var(--flint-text-muted)] font-normal truncate mt-0.5 select-text">
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
                        className="p-1 rounded text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-card-hover)] cursor-pointer opacity-0 group-hover:opacity-100"
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
                            className="w-[230px] bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-base)] rounded-lg shadow-2xl p-1 text-xs text-[var(--flint-text-primary)] select-none flex flex-col font-sans"
                          >
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(rv.path);
                                setActiveMenuPath(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-[var(--flint-bg-card-hover)] rounded-md text-[var(--flint-text-primary)] flex items-center gap-2.5 cursor-pointer"
                            >
                              <Copy01Icon size={14} className="text-[var(--flint-text-muted)]" />
                              <span>Copy Hearth path</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuPath(null);
                                setEditingHearthPath(rv.path);
                                setEditHearthName(rv.name || 'Hearth');
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-[var(--flint-bg-card-hover)] rounded-md text-[var(--flint-text-primary)] flex items-center gap-2.5 cursor-pointer"
                            >
                              <Edit02Icon size={14} className="text-[var(--flint-text-muted)]" />
                              <span>Rename Hearth...</span>
                            </button>

                          <button
                            onClick={async () => {
                              setActiveMenuPath(null);
                              await platform.selectParentFolder();
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-[var(--flint-bg-card-hover)] rounded-md text-[var(--flint-text-primary)] flex items-center gap-2.5 cursor-pointer"
                          >
                            <MoveFileIcon size={14} className="text-[var(--flint-text-muted)]" />
                            <span>Move Hearth...</span>
                          </button>

                          <div className="h-[1px] bg-[var(--flint-border-subtle)] my-1" />

                          <button
                            onClick={() => {
                              setActiveMenuPath(null);
                              platform.openHearthInExplorer(rv.path);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-[var(--flint-bg-card-hover)] rounded-md text-[var(--flint-text-primary)] flex items-center gap-2.5 cursor-pointer"
                          >
                            <FolderOpenIcon size={14} className="text-[var(--flint-text-muted)]" />
                            <span>Reveal Hearth in file explorer</span>
                          </button>

                          <div className="h-[1px] bg-[var(--flint-border-subtle)] my-1" />

                          <button
                            onClick={() => {
                              setActiveMenuPath(null);
                              handleRemoveRecent(rv.path);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-[var(--flint-bg-card-hover)] rounded-md text-[var(--flint-danger,#ef4444)] hover:text-red-400 flex items-center gap-2.5 cursor-pointer"
                          >
                            <Cancel01Icon size={14} className="text-[var(--flint-danger,#ef4444)]" />
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
            <div className="text-center py-10 text-[11px] text-[var(--flint-text-muted)]">
              No recent Hearths found.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Full 100% height */}
      <div className="flex-1 bg-[var(--flint-bg-app)] h-full flex flex-col items-center justify-center p-8 overflow-hidden relative">
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
            className="h-full w-10 hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] flex items-center justify-center cursor-pointer"
            title="Minimize"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <WindowMinimizeIcon />
          </button>
          <button
            onClick={handleMaximize}
            className="h-full w-10 hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] flex items-center justify-center cursor-pointer"
            title={isMaximized ? 'Restore' : 'Maximize'}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {isMaximized ? <WindowRestoreIcon /> : <WindowMaximizeIcon />}
          </button>
          <button
            onClick={handleClose}
            className="h-full w-10 hover:bg-[#e81123] text-[var(--flint-text-muted)] hover:text-white flex items-center justify-center cursor-pointer"
            title="Close"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <WindowCloseIcon />
          </button>
        </div>

        {/* PERMANENT STATIONARY BRANDING (Size and position never change) */}
        <div className="flex flex-col items-center mb-7 shrink-0 select-none">
          <FlintLogoIcon size={100} className="mb-3" />
          <h1 className="text-2xl font-bold tracking-tight text-[var(--flint-text-primary)] font-sans">Flint</h1>
          <span className="text-xs text-[var(--flint-text-muted)] mt-1">Version {APP_VERSION}</span>
        </div>

        {/* VIEWPORT CONTAINER */}
        <div className="w-full max-w-[480px] relative">
          {view === 'main' ? (
            /* VIEW 1: MAIN ACTION CARDS */
            <div className="w-full flex flex-col gap-3 px-1">
              {/* Card 1: Create new Hearth */}
              <div className="bg-[var(--flint-bg-card)] border border-[var(--flint-border-base)] rounded-xl p-4 flex items-center justify-between">
                <div className="flex flex-col pr-3">
                  <span className="font-semibold text-xs text-[var(--flint-text-primary)]">Create new Hearth</span>
                  <span className="text-[11px] text-[var(--flint-text-muted)] mt-0.5">
                    Create a new Flint Hearth under a folder.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setNewHearthName('');
                    setNewHearthLocation('');
                    setView('create');
                  }}
                  className="flint-btn flint-btn-primary shrink-0"
                >
                  Create
                </button>
              </div>

              {/* Card 2: Open folder as Hearth */}
              <div className="bg-[var(--flint-bg-card)] border border-[var(--flint-border-base)] rounded-xl p-4 flex items-center justify-between">
                <div className="flex flex-col pr-3">
                  <span className="font-semibold text-xs text-[var(--flint-text-primary)]">Open folder as Hearth</span>
                  <span className="text-[11px] text-[var(--flint-text-muted)] mt-0.5">
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

              {/* Card 3: Open in Explorer */}
              {currentHearthPath && (
                <div className="bg-[var(--flint-bg-card)] border border-[var(--flint-border-base)] rounded-xl p-4 flex items-center justify-between">
                  <div className="flex flex-col pr-3">
                    <span className="font-semibold text-xs text-[var(--flint-text-primary)]">Open in File Explorer</span>
                    <span className="text-[11px] text-[var(--flint-text-muted)] mt-0.5">
                      View currently opened Hearth files on disk.
                    </span>
                  </div>
                  <button
                    onClick={handleOpenInExplorer}
                    className="flint-btn shrink-0"
                  >
                    Show
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* VIEW 2: CREATE LOCAL HEARTH VIEW */
            <div className="w-full flex flex-col px-1">
              {/* Back button & Title aligned with card content */}
              <div className="px-4 flex flex-col">
                <button
                  onClick={() => setView('main')}
                  className="flex items-center gap-1.5 text-xs text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] mb-1 w-fit cursor-pointer -ml-0.5"
                >
                  <ArrowLeft01Icon size={13} />
                  <span>Back</span>
                </button>
                <h2 className="text-sm font-bold text-[var(--flint-text-primary)] mb-3">Create local Hearth</h2>
              </div>

              {/* Form Card */}
              <div className="bg-[var(--flint-bg-card)] border border-[var(--flint-border-base)] rounded-xl p-4 flex flex-col">
                {/* Row 1: Hearth Name */}
                <div className="flex items-center justify-between pb-3.5">
                  <div className="flex flex-col pr-4">
                    <span className="font-semibold text-xs text-[var(--flint-text-primary)]">Hearth name</span>
                    <span className="text-[11px] text-[var(--flint-text-muted)] mt-0.5">
                      Pick a name for your Hearth.
                    </span>
                  </div>
                  <input
                    type="text"
                    value={newHearthName}
                    onChange={(e) => setNewHearthName(e.target.value)}
                    placeholder="Hearth name"
                    className="w-48 bg-[var(--flint-bg-input)] border border-[var(--flint-border-base)] focus:border-[var(--flint-border-focus,var(--flint-accent))] rounded-[5px] px-3 py-1.5 text-xs text-[var(--flint-text-primary)] outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]"
                  />
                </div>

                {/* Divider Line */}
                <div className="border-t border-[var(--flint-border-subtle)] w-full" />

                {/* Row 2: Location */}
                <div className="flex items-center justify-between pt-3.5">
                  <div className="flex flex-col pr-4 min-w-0">
                    <span className="font-semibold text-xs text-[var(--flint-text-primary)]">Location</span>
                    <span className="text-[11px] text-[var(--flint-text-muted)] mt-0.5 truncate">
                      Pick a location for your new Hearth.
                    </span>
                    {newHearthLocation && (
                      <span className="text-[10px] text-emerald-400 truncate mt-1 select-text">
                        {newHearthLocation}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleBrowseLocation}
                    className="flint-btn shrink-0"
                  >
                    Browse
                  </button>
                </div>
              </div>

              {/* Centered Create Button */}
              <div className="flex justify-center mt-5">
                <button
                  onClick={handleCreateHearth}
                  disabled={!newHearthName.trim() || !newHearthLocation.trim()}
                  className="flint-btn flint-btn-primary !px-7 !py-2"
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

export default HearthSwitcherWindow;
