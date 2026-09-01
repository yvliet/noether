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
    const getFn = platform.getCurrentHearth || platform.getCurrentVault;
    getFn().then((data) => {
      if (data) {
        setCurrentHearthPath(data.path);
        setRecentHearths((data as any).recentHearths || (data as any).recentVaults || []);
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
    if (platform.closeHearthWindow) {
      platform.closeHearthWindow();
    } else {
      platform.closeVaultWindow();
    }
  }, []);

  const handleOpenRecent = useCallback(async (targetPath: string) => {
    if (editingHearthPath) return;
    if (targetPath && currentHearthPath && targetPath.toLowerCase() === currentHearthPath.toLowerCase()) {
      const closeFn = platform.closeHearthWindow || platform.closeVaultWindow;
      await closeFn?.();
      return;
    }
    const switchFn = platform.setCurrentHearth || platform.setCurrentVault;
    await switchFn(targetPath);
  }, [editingHearthPath, currentHearthPath]);

  const handleSaveRename = useCallback(async (targetPath: string) => {
    const trimmed = editHearthName.trim();
    if (trimmed) {
      const renameFn = platform.renameHearth || platform.renameVault;
      const res = await renameFn(targetPath, trimmed);
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
    const removeFn = platform.removeRecentHearth || platform.removeRecentVault;
    const res = await removeFn(targetPath);
    if (res && res.success) {
      setRecentHearths((res as any).recentHearths || (res as any).recentVaults || []);
    }
  }, []);

  const handleOpenFolderAsHearth = useCallback(async () => {
    const selectFn = platform.selectHearthFolder || platform.selectVaultFolder;
    await selectFn();
  }, []);

  const handleBrowseLocation = useCallback(async () => {
    const res = await platform.selectParentFolder();
    if (res && !res.canceled && res.path) {
      setNewHearthLocation(res.path);
    }
  }, []);

  const handleCreateHearth = useCallback(async () => {
    if (!newHearthName.trim() || !newHearthLocation.trim()) return;
    const createFn = platform.createNewHearth || platform.createNewVault;
    await createFn(newHearthName.trim(), newHearthLocation.trim());
  }, [newHearthName, newHearthLocation]);

  const handleOpenInExplorer = useCallback(async () => {
    const openFn = platform.openHearthInExplorer || platform.openVaultInExplorer;
    await openFn(currentHearthPath);
  }, [currentHearthPath]);

  return (
    <div className="relative w-full h-full flex flex-row bg-[#181818] text-[#dcddde] select-none font-sans overflow-hidden">
      {/* LEFT COLUMN: Clean Hearths List (Full 100% height #141414) */}
      <div className="w-[280px] bg-[#141414] border-r border-[#242424] h-full flex flex-col pt-7 px-3 pb-4 shrink-0 overflow-hidden relative">
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
                  className="group relative flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors bg-transparent text-[#999] hover:bg-[#202020] hover:text-[#e0e0e0]"
                >
                  <div className="flex flex-col min-w-0 pr-2 flex-1">
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
                        className="w-full bg-transparent border-none outline-none p-0 m-0 text-[13px] tracking-tight text-white font-normal caret-white selection:bg-[#505560] selection:text-white"
                      />
                    ) : (
                      <span className="text-[13px] text-white font-normal tracking-tight truncate">
                        {rv.name || 'Hearth'}
                      </span>
                    )}
                    <span className="text-[11px] text-[#777] font-normal truncate mt-0.5 select-text">
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
                        className="p-1 rounded text-[#777] hover:text-white hover:bg-[#333] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
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
                            className="w-[230px] bg-[#1e1e1e] border border-[#333] rounded-lg shadow-2xl p-1 text-xs text-[#dcddde] select-none flex flex-col font-sans"
                          >
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(rv.path);
                                setActiveMenuPath(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-[#2c2c2c] rounded-md text-[#dcddde] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Copy01Icon size={14} className="text-[#888]" />
                              <span>Copy Hearth path</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuPath(null);
                                setEditingHearthPath(rv.path);
                                setEditHearthName(rv.name || 'Hearth');
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-[#2c2c2c] rounded-md text-[#dcddde] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Edit02Icon size={14} className="text-[#888]" />
                              <span>Rename Hearth...</span>
                            </button>

                          <button
                            onClick={async () => {
                              setActiveMenuPath(null);
                              await platform.selectParentFolder();
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-[#2c2c2c] rounded-md text-[#dcddde] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <MoveFileIcon size={14} className="text-[#888]" />
                            <span>Move Hearth...</span>
                          </button>

                          <div className="h-[1px] bg-[#2a2a2a] my-1" />

                          <button
                            onClick={() => {
                              setActiveMenuPath(null);
                              const openFn = platform.openHearthInExplorer || platform.openVaultInExplorer;
                              openFn(rv.path);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-[#2c2c2c] rounded-md text-[#dcddde] hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <FolderOpenIcon size={14} className="text-[#888]" />
                            <span>Reveal Hearth in file explorer</span>
                          </button>

                          <div className="h-[1px] bg-[#2a2a2a] my-1" />

                          <button
                            onClick={() => {
                              setActiveMenuPath(null);
                              handleRemoveRecent(rv.path);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-[#2c2c2c] rounded-md text-[#e05252] hover:text-red-400 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <Cancel01Icon size={14} className="text-[#e05252]" />
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
            <div className="text-center py-10 text-[11px] text-[#555]">
              No recent Hearths found.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Full 100% height #181818 with Fixed Header & Slide Transition */}
      <div className="flex-1 bg-[#181818] h-full flex flex-col items-center justify-center p-8 overflow-hidden relative">
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
            className="h-full w-10 hover:bg-[#282828] text-[#888] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Minimize"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <WindowMinimizeIcon />
          </button>
          <button
            onClick={handleMaximize}
            className="h-full w-10 hover:bg-[#282828] text-[#888] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title={isMaximized ? 'Restore' : 'Maximize'}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {isMaximized ? <WindowRestoreIcon /> : <WindowMaximizeIcon />}
          </button>
          <button
            onClick={handleClose}
            className="h-full w-10 hover:bg-[#e81123] text-[#888] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <WindowCloseIcon />
          </button>
        </div>

        {/* PERMANENT STATIONARY BRANDING (Size and position never change) */}
        <div className="flex flex-col items-center mb-7 shrink-0 select-none">
          <FlintLogoIcon size={100} className="mb-3" />
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Flint</h1>
          <span className="text-xs text-[#777] mt-1">Version 0.1.0</span>
        </div>

        {/* SLIDING VIEWPORT CONTAINER */}
        <div className="w-full max-w-[480px] overflow-hidden relative">
          <div
            className={`w-full flex flex-row transition-transform duration-300 ease-in-out ${
              view === 'create' ? '-translate-x-full' : 'translate-x-0'
            }`}
          >
            {/* SLIDE 1: MAIN ACTION CARDS */}
            <div className="w-full shrink-0 flex flex-col gap-3 px-1">
              {/* Card 1: Create new Hearth */}
              <div className="bg-[#202020] border border-[#2c2c2c] rounded-xl p-4 flex items-center justify-between">
                <div className="flex flex-col pr-3">
                  <span className="font-semibold text-xs text-white">Create new Hearth</span>
                  <span className="text-[11px] text-[#888] mt-0.5">
                    Create a new Flint Hearth under a folder.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setNewHearthName('');
                    setNewHearthLocation('');
                    setView('create');
                  }}
                  style={{ backgroundColor: 'var(--flint-accent, #ea580c)' }}
                  className="px-4 py-1.5 rounded-[5px] hover:brightness-110 active:brightness-90 text-white text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.35)] border border-black/20 transition-all shrink-0 cursor-pointer"
                >
                  Create
                </button>
              </div>

              {/* Card 2: Open folder as Hearth */}
              <div className="bg-[#202020] border border-[#2c2c2c] rounded-xl p-4 flex items-center justify-between">
                <div className="flex flex-col pr-3">
                  <span className="font-semibold text-xs text-white">Open folder as Hearth</span>
                  <span className="text-[11px] text-[#888] mt-0.5">
                    Choose an existing folder of Markdown files.
                  </span>
                </div>
                <button
                  onClick={handleOpenFolderAsHearth}
                  className="px-4 py-1.5 rounded-[5px] bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white text-xs font-medium border border-[#383838] hover:border-[#484848] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <FolderOpenIcon size={13} />
                  <span>Open</span>
                </button>
              </div>

              {/* Card 3: Open in Explorer */}
              {currentHearthPath && (
                <div className="bg-[#202020] border border-[#2c2c2c] rounded-xl p-4 flex items-center justify-between">
                  <div className="flex flex-col pr-3">
                    <span className="font-semibold text-xs text-white">Open in File Explorer</span>
                    <span className="text-[11px] text-[#888] mt-0.5">
                      View currently opened Hearth files on disk.
                    </span>
                  </div>
                  <button
                    onClick={handleOpenInExplorer}
                    className="px-3.5 py-1.5 rounded-[5px] bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white text-xs font-medium border border-[#383838] hover:border-[#484848] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all shrink-0 cursor-pointer"
                  >
                    Show
                  </button>
                </div>
              )}
            </div>

            {/* SLIDE 2: CREATE LOCAL HEARTH VIEW */}
            <div className="w-full shrink-0 flex flex-col px-1">
              {/* Back button & Title aligned with card content */}
              <div className="px-4 flex flex-col">
                <button
                  onClick={() => setView('main')}
                  className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors mb-1 w-fit cursor-pointer -ml-0.5"
                >
                  <ArrowLeft01Icon size={13} />
                  <span>Back</span>
                </button>
                <h2 className="text-sm font-bold text-white mb-3">Create local Hearth</h2>
              </div>

              {/* Form Card */}
              <div className="bg-[#202020] border border-[#2c2c2c] rounded-xl p-4 flex flex-col">
                {/* Row 1: Hearth Name */}
                <div className="flex items-center justify-between pb-3.5">
                  <div className="flex flex-col pr-4">
                    <span className="font-semibold text-xs text-white">Hearth name</span>
                    <span className="text-[11px] text-[#888] mt-0.5">
                      Pick a name for your Hearth.
                    </span>
                  </div>
                  <input
                    type="text"
                    value={newHearthName}
                    onChange={(e) => setNewHearthName(e.target.value)}
                    placeholder="Hearth name"
                    className="w-48 bg-[#161616] border border-[#333] focus:border-[#555] rounded-[5px] px-3 py-1.5 text-xs text-white outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors"
                  />
                </div>

                {/* Divider Line */}
                <div className="border-t border-[#2a2a2a] w-full" />

                {/* Row 2: Location */}
                <div className="flex items-center justify-between pt-3.5">
                  <div className="flex flex-col pr-4 min-w-0">
                    <span className="font-semibold text-xs text-white">Location</span>
                    <span className="text-[11px] text-[#888] mt-0.5 truncate">
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
                    className="px-3.5 py-1.5 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] border border-[#383838] hover:border-[#484848] rounded-[5px] text-xs font-medium text-[#dcddde] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all shrink-0 cursor-pointer"
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
                  style={{ backgroundColor: 'var(--flint-accent, #ea580c)' }}
                  className="px-7 py-2 hover:brightness-110 active:brightness-90 disabled:opacity-40 text-white text-xs font-semibold rounded-[5px] shadow-[0_1px_2px_rgba(0,0,0,0.35)] border border-black/20 transition-all cursor-pointer"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <TooltipProvider />
    </div>
  );
});

// Alias for backwards compatibility
export const VaultSwitcherWindow = HearthSwitcherWindow;
export default HearthSwitcherWindow;
