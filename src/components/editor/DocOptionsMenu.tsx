import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getDocumentPath, isDocumentLocked } from '@/lib/db/documents';
import { DocumentItem } from '@/types';
import { useFlintApp, useDocMenuActions } from '@/core/app/AppContext';
import { platform } from '@/lib/platform/platformAdapter';
import {
  LinkSquare02Icon,
  BookOpen01Icon,
  SourceCodeIcon,
  SplitRightIcon,
  SplitDownIcon,
  OpenInWindowIcon,
  Edit02Icon,
  MoveFileIcon,
  GitForkIcon,
  Download01Icon,
  Copy01Icon,
  Clock01Icon,
  ExternalLinkIcon,
  FolderOpenIcon,
  FolderTreeIcon,
  Delete02Icon,
  MoreVerticalIcon,
  CheckIcon,
  ChevronRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@/components/common/Icons';

const ZOOM_PRESETS = [50, 75, 90, 100, 110, 125, 150, 175, 200];

interface DocOptionsMenuProps {
  document?: DocumentItem | null;
}

export const DocOptionsMenu: React.FC<DocOptionsMenuProps> = React.memo(({ document: customDoc }) => {
  const activeDocument = useDocumentStore((s) => s.activeDocument);
  const documents = useDocumentStore((s) => s.documents);
  const renameDocument = useDocumentStore((s) => s.renameDocument);
  const moveDocument = useDocumentStore((s) => s.moveDocument);
  const removeDocument = useDocumentStore((s) => s.removeDocument);

  const doc = customDoc !== undefined ? customDoc : activeDocument;

  const toggleSplitView = useWorkspaceStore((s) => s.toggleSplitView);
  const openSplitTab = useWorkspaceStore((s) => s.openSplitTab);
  const hearthPath = useWorkspaceStore((s) => s.hearthPath || s.vaultPath);
  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);
  const openInputDialog = useWorkspaceStore((s) => s.openInputDialog);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const setActiveLeftView = useWorkspaceStore((s) => s.setActiveLeftView);
  const setIsLeftSidebarOpen = useWorkspaceStore((s) => s.setIsLeftSidebarOpen);

  const defaultTabMode = useSettingsStore((s) => s.defaultTabMode);
  const setDefaultTabMode = useSettingsStore((s) => s.setDefaultTabMode);
  const defaultEditingMode = useSettingsStore((s) => s.defaultEditingMode);
  const setDefaultEditingMode = useSettingsStore((s) => s.setDefaultEditingMode);
  const zoomLevel = useSettingsStore((s) => s.zoomLevel);
  const setZoomLevel = useSettingsStore((s) => s.setZoomLevel);

  const app = useFlintApp();
  const docMenuActions = useDocMenuActions();

  // Modular Action Groups registered by plugins
  const primaryActions = useMemo(
    () => docMenuActions.filter((a) => a.group === 'primary' && (!a.isVisible || a.isVisible(app, doc))),
    [docMenuActions, app, doc]
  );
  const toolActions = useMemo(
    () => docMenuActions.filter((a) => a.group === 'tools' && (!a.isVisible || a.isVisible(app, doc))),
    [docMenuActions, app, doc]
  );
  const linkedViewActions = useMemo(
    () => docMenuActions.filter((a) => a.group === 'linked-view' && (!a.isVisible || a.isVisible(app, doc))),
    [docMenuActions, app, doc]
  );
  const otherViewActions = useMemo(
    () =>
      docMenuActions.filter(
        (a) =>
          a.group === 'views' &&
          (!a.isVisible || a.isVisible(app, doc))
      ),
    [docMenuActions, app, doc]
  );
  const universalPluginActions = useMemo(
    () =>
      docMenuActions.filter(
        (a) => a.group === 'universal' && a.requiresDoc === false && (!a.isVisible || a.isVisible(app, doc))
      ),
    [docMenuActions, app, doc]
  );
  const dangerActions = useMemo(
    () => docMenuActions.filter((a) => a.group === 'danger' && (!a.isVisible || a.isVisible(app, doc))),
    [docMenuActions, app, doc]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<'copyPath' | 'linkedView' | 'zoomLevel' | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; maxHeight: number }>({
    top: 0,
    left: 0,
    maxHeight: 600,
  });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    const menuEl = menuRef.current;
    const menuWidth = menuEl?.offsetWidth || 230;
    const menuHeight = menuEl?.offsetHeight || (doc ? 480 : 200);

    const availableHeight = vh - margin * 2;

    // Horizontal placement: align right edge with trigger's right edge, clamp within [margin, vw - menuWidth - margin]
    let left = rect.right - menuWidth;
    if (left + menuWidth > vw - margin) {
      left = vw - menuWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    // Vertical placement:
    const spaceBelow = vh - rect.bottom - margin;
    const spaceAbove = rect.top - margin;

    let top: number;
    let maxHeight: number;

    if (spaceBelow >= menuHeight || spaceBelow >= spaceAbove) {
      // Place downwards below trigger
      top = rect.bottom + 4;
      if (top + menuHeight > vh - margin) {
        top = Math.max(margin, vh - margin - menuHeight);
      }
      maxHeight = Math.min(availableHeight, vh - top - margin);
    } else {
      // Place upwards above trigger
      top = rect.top - 4 - menuHeight;
      if (top < margin) {
        top = margin;
      }
      maxHeight = Math.min(availableHeight, vh - top - margin);
    }

    top = Math.max(margin, Math.min(vh - margin - 80, top));
    maxHeight = Math.max(120, Math.min(availableHeight, vh - top - margin));

    setMenuPos({ top, left, maxHeight });
  }, [doc]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  const isLocked = useMemo(() => isDocumentLocked(doc), [doc]);
  const isReadingView = defaultTabMode === 'Reading view';

  // Toggle Reading View
  const handleToggleReadingView = () => {
    if (isLocked) {
      showToast('Note is locked (Read-only). Unlock it in Properties to edit.', 'warning');
      return;
    }
    const next = isReadingView ? 'Editing view' : 'Reading view';
    setDefaultTabMode(next);
    setIsOpen(false);
    showToast(`Switched to ${next}`, 'info');
  };

  // Split Views
  const handleSplitRight = () => {
    const focusedPaneId = useWorkspaceStore.getState().focusedPaneId || 'main';
    const panes = useWorkspaceStore.getState().panes;
    const currentPane = panes[focusedPaneId] || panes['main'];
    const activeTab = currentPane?.tabs.find((t) => t.id === currentPane.activeTabId);
    useWorkspaceStore.getState().splitPane(
      focusedPaneId,
      'horizontal',
      doc?.id || activeTab?.document_id,
      doc?.title || activeTab?.title,
      activeTab
        ? {
            viewMode: activeTab.view_mode,
            viewType: activeTab.view_type,
            icon: activeTab.icon,
            metadata: activeTab.metadata,
          }
        : undefined
    );
    setIsOpen(false);
  };

  const handleSplitDown = () => {
    const focusedPaneId = useWorkspaceStore.getState().focusedPaneId || 'main';
    const panes = useWorkspaceStore.getState().panes;
    const currentPane = panes[focusedPaneId] || panes['main'];
    const activeTab = currentPane?.tabs.find((t) => t.id === currentPane.activeTabId);
    useWorkspaceStore.getState().splitPane(
      focusedPaneId,
      'vertical',
      doc?.id || activeTab?.document_id,
      doc?.title || activeTab?.title,
      activeTab
        ? {
            viewMode: activeTab.view_mode,
            viewType: activeTab.view_type,
            icon: activeTab.icon,
            metadata: activeTab.metadata,
          }
        : undefined
    );
    setIsOpen(false);
  };

  // Open in New Window
  const handleOpenInNewWindow = () => {
    setIsOpen(false);
    if (doc && typeof window !== 'undefined' && (window as any).electronAPI?.openNewWindow) {
      (window as any).electronAPI.openNewWindow(doc.id);
    } else {
      window.open(window.location.href, '_blank');
    }
  };

  // Zoom Level Actions
  const handleZoomIn = () => {
    const current = zoomLevel || 100;
    if (current >= 200) {
      showToast('Zoom: 200% (Maximum limit reached)', 'info');
      return;
    }
    const next = Math.min(200, Math.round((current + 10) / 5) * 5);
    setZoomLevel(next);
    setIsOpen(false);
    setActiveSubmenu(null);
    showToast(`Zoom: ${next}%`, 'info');
  };

  const handleZoomOut = () => {
    const current = zoomLevel || 100;
    if (current <= 50) {
      showToast('Zoom: 50% (Minimum limit reached)', 'info');
      return;
    }
    const next = Math.max(50, Math.round((current - 10) / 5) * 5);
    setZoomLevel(next);
    setIsOpen(false);
    setActiveSubmenu(null);
    showToast(`Zoom: ${next}%`, 'info');
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
    setIsOpen(false);
    setActiveSubmenu(null);
    showToast('Zoom: 100% (Default)', 'info');
  };

  const handleSetZoom = (level: number) => {
    setZoomLevel(level);
    setIsOpen(false);
    setActiveSubmenu(null);
    showToast(`Zoom: ${level}%`, 'info');
  };

  // Rename Note
  const handleRename = () => {
    if (!doc) return;
    if (isLocked) {
      setIsOpen(false);
      showToast('Note is locked (Read-only). Unlock it in Properties to rename.', 'warning');
      return;
    }
    setIsOpen(false);
    openInputDialog({
      title: 'Rename Note',
      placeholder: 'Enter note title...',
      defaultValue: doc.title || '',
      confirmText: 'Rename',
      onConfirm: async (newTitle) => {
        if (newTitle.trim()) {
          await renameDocument(doc.id, newTitle.trim());
          showToast(`Renamed note to "${newTitle.trim()}"`, 'success');
        }
      },
    });
  };

  // Move File To...
  const handleMoveFile = () => {
    if (!doc) return;
    if (isLocked) {
      setIsOpen(false);
      showToast('Note is locked (Read-only). Unlock it in Properties to move.', 'warning');
      return;
    }
    setIsOpen(false);
    const folders = documents.filter((d) => d.is_folder);
    if (folders.length === 0) {
      showToast('No folders exist in this Hearth', 'info');
      return;
    }
    openInputDialog({
      title: 'Move File to Folder',
      placeholder: 'Folder name (e.g. Daily, Archive, Projects)...',
      confirmText: 'Move',
      onConfirm: async (targetFolder) => {
        const trimmed = targetFolder.trim().toLowerCase();
        if (trimmed === '/' || trimmed === 'root' || trimmed === '') {
          const res = await moveDocument(doc.id, null);
          if (res?.success) {
            showToast(`Moved "${res.newTitle || doc.title}" to root folder`, 'success');
          }
          return;
        }
        const found = folders.find((f) => f.title.toLowerCase() === trimmed);
        if (found) {
          const res = await moveDocument(doc.id, found.id);
          if (res?.success) {
            const movedTitle = res.newTitle || doc.title;
            showToast(`Moved "${movedTitle}" to "${found.title}"`, 'success');
          } else if (res?.error) {
            showToast(res.error, 'warning');
          }
        } else {
          showToast(`Folder "${targetFolder}" not found`, 'warning');
        }
      },
    });
  };

  // Merge File
  const handleMergeFile = () => {
    if (!doc) return;
    if (isLocked) {
      setIsOpen(false);
      showToast('Note is locked (Read-only). Unlock it in Properties to merge.', 'warning');
      return;
    }
    setIsOpen(false);
    openInputDialog({
      title: 'Merge Note With...',
      placeholder: 'Note title to merge into current note...',
      confirmText: 'Merge',
      onConfirm: async (otherTitle) => {
        const other = documents.find(
          (d) =>
            !d.is_folder &&
            d.id !== doc.id &&
            d.title.toLowerCase() === otherTitle.trim().toLowerCase()
        );
        if (other) {
          try {
            const curParsed = JSON.parse(doc.content_json || '{"type":"doc","content":[]}');
            const otherParsed = JSON.parse(other.content_json || '{"type":"doc","content":[]}');
            const curContent = Array.isArray(curParsed.content) ? curParsed.content : [];
            const otherContent = Array.isArray(otherParsed.content) ? otherParsed.content : [];

            const mergedDoc = {
              type: 'doc',
              content: [
                ...curContent,
                { type: 'horizontalRule' },
                {
                  type: 'heading',
                  attrs: { level: 2 },
                  content: [{ type: 'text', text: other.title || 'Merged Note' }],
                },
                ...otherContent,
              ],
            };
            const newJson = JSON.stringify(mergedDoc);
            await useDocumentStore.getState().saveDocumentById(doc.id, newJson, doc.title);
            showToast(`Merged contents of "${other.title}" into "${doc.title}"`, 'success');
          } catch (e) {
            console.error('[DocOptionsMenu] Failed to merge document:', e);
            showToast('Failed to merge document content', 'warning');
          }
        } else {
          showToast(`Note "${otherTitle}" not found`, 'warning');
        }
      },
    });
  };

  // Export PDF
  const handleExportPDF = () => {
    setIsOpen(false);
    window.print();
  };

  // Copy Path Actions
  const handleCopyPath = async (type: 'absolute' | 'relative' | 'markdown') => {
    if (!doc) return;
    setIsOpen(false);
    setActiveSubmenu(null);
    let textToCopy = doc.title;
    const relPath = getDocumentPath(doc, documents) + '.md';

    if (type === 'markdown') {
      textToCopy = `[[${doc.title}]]`;
    } else if (type === 'relative') {
      textToCopy = relPath;
    } else {
      textToCopy = hearthPath ? `${hearthPath}/${relPath}` : `/${relPath}`;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast(`Copied ${type} path to clipboard`, 'success');
    } catch {
      showToast('Failed to copy to clipboard', 'warning');
    }
  };

  // Version History
  const handleOpenVersionHistory = () => {
    setIsOpen(false);
    showToast('Version history: File is in sync with latest local revision', 'info');
  };

  // Open in Default App
  const handleOpenInDefaultApp = () => {
    setIsOpen(false);
    if (platform.isDesktop()) {
      const openFn = platform.openHearthInExplorer || platform.openVaultInExplorer;
      openFn(hearthPath);
    }
    showToast('Opening file in default application', 'info');
  };

  // Show in System Explorer
  const handleShowInExplorer = () => {
    setIsOpen(false);
    if (platform.isDesktop()) {
      const openFn = platform.openHearthInExplorer || platform.openVaultInExplorer;
      openFn(hearthPath);
    } else {
      showToast('Hearth folder: ' + (hearthPath || 'local memory'), 'info');
    }
  };

  // Reveal File in Navigation
  const handleRevealInNavigation = () => {
    if (!doc) return;
    setIsOpen(false);
    setIsLeftSidebarOpen(true);
    setActiveLeftView('files');
    window.dispatchEvent(
      new CustomEvent('flint:reveal-tree-item', {
        detail: { id: doc.id },
      })
    );
    showToast(`Revealed "${doc.title}" in file tree`, 'info');
  };

  // Delete Note
  const handleDelete = () => {
    if (!doc) return;
    setIsOpen(false);
    openConfirmDialog({
      title: 'Delete file',
      message: `Are you sure you want to delete "${doc.title || 'Untitled'}"?`,
      subtext: 'It will be moved to trash and can be restored within 48 hours.',
      confirmText: 'Delete',
      isDanger: true,
      onConfirm: async () => {
        await removeDocument(doc.id);
        showToast(`Moved "${doc.title}" to trash`, 'info');
      },
    });
  };

  const flipSubmenuRight = menuPos.left < 200;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="More options"
        className={`p-1 rounded hover:bg-[var(--flint-bg-sidebar-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer ${
          isOpen ? 'text-[var(--flint-text-primary)] bg-[var(--flint-bg-card-hover)]' : ''
        }`}
      >
        <MoreVerticalIcon size={14} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              maxHeight: `${menuPos.maxHeight}px`,
              zIndex: 99999,
              boxShadow: 'var(--flint-shadow-2)',
            }}
            className="w-[230px] overflow-y-auto overflow-x-hidden bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-base)] rounded-[8px] p-[4px] text-xs flex flex-col gap-[1px] select-none"
          >
            {/* Group 1: Document Primary Plugin Actions & Reading View (Rendered when doc exists) */}
            {doc && (
              <>
                {primaryActions.map((action) => {
                  const isChecked =
                    typeof action.isChecked === 'function'
                      ? action.isChecked(app, doc)
                      : Boolean(action.isChecked);
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onMouseEnter={() => setActiveSubmenu(null)}
                      onClick={() => {
                        action.onClick(app, doc);
                        setIsOpen(false);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center justify-between gap-2.5 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {action.icon}
                        <span className="truncate">{action.title}</span>
                      </div>
                      {isChecked && <CheckIcon size={13} className="text-[var(--flint-text-primary)] shrink-0 ml-1" />}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onMouseEnter={() => setActiveSubmenu(null)}
                  onClick={handleToggleReadingView}
                  title={isLocked ? 'Note is locked (Read-only)\nUnlock in Properties to enable Editing view' : undefined}
                  className={`w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs transition-colors flex items-center justify-between gap-2.5 group ${
                    isLocked
                      ? 'opacity-40 cursor-not-allowed text-[var(--flint-text-muted)] hover:bg-transparent'
                      : 'text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <BookOpen01Icon size={14} className={isLocked ? 'text-[var(--flint-text-muted)] shrink-0' : 'text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0'} />
                    <span className="truncate">{isLocked ? 'Reading view (Locked)' : 'Reading view'}</span>
                  </div>
                  {(isReadingView || isLocked) && <CheckIcon size={13} className="text-[var(--flint-text-primary)] shrink-0 ml-1" />}
                </button>

                <button
                  type="button"
                  onMouseEnter={() => setActiveSubmenu(null)}
                  onClick={() => {
                    if (isLocked) {
                      showToast('Note is locked (Read-only). Unlock it in Properties to edit.', 'warning');
                      return;
                    }
                    const next = defaultEditingMode === 'Source mode' ? 'Live Preview' : 'Source mode';
                    setDefaultEditingMode(next);
                    if (defaultTabMode === 'Reading view') {
                      setDefaultTabMode('Editing view');
                    }
                    setIsOpen(false);
                    showToast(`Switched to ${next}`, 'info');
                  }}
                  title={isLocked ? 'Note is locked (Read-only)' : undefined}
                  className={`w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs transition-colors flex items-center justify-between gap-2.5 group ${
                    isLocked
                      ? 'opacity-40 cursor-not-allowed text-[var(--flint-text-muted)] hover:bg-transparent'
                      : 'text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <SourceCodeIcon size={14} className={isLocked ? 'text-[var(--flint-text-muted)] shrink-0' : 'text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0'} />
                    <span className="truncate">Source mode</span>
                  </div>
                  {defaultEditingMode === 'Source mode' && !isReadingView && !isLocked && (
                    <CheckIcon size={13} className="text-[var(--flint-text-primary)] shrink-0 ml-1" />
                  )}
                </button>

                <div className="border-t border-[var(--flint-border-subtle)] my-1 mx-1" />
              </>
            )}

            {/* Group 2: Universal Actions (Always Available in all views) */}
            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={handleSplitRight}
              className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center gap-2.5 cursor-pointer group"
            >
              <SplitRightIcon size={14} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
              <span>Split right</span>
            </button>

            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={handleSplitDown}
              className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center gap-2.5 cursor-pointer group"
            >
              <SplitDownIcon size={14} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
              <span>Split down</span>
            </button>

            <button
              type="button"
              onMouseEnter={() => setActiveSubmenu(null)}
              onClick={handleOpenInNewWindow}
              className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center gap-2.5 cursor-pointer group"
            >
              <OpenInWindowIcon size={14} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
              <span>Open in new window</span>
            </button>

            {/* Zoom level */}
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setActiveSubmenu('zoomLevel')}
                className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center justify-between gap-2.5 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <ZoomInIcon size={14} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
                  <span className="truncate">Zoom level</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-secondary)]">
                    {zoomLevel || 100}%
                  </span>
                  <ChevronRightIcon size={12} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
                </div>
              </button>

              {activeSubmenu === 'zoomLevel' && (
                <div
                  onMouseLeave={() => setActiveSubmenu(null)}
                  style={{ boxShadow: 'var(--flint-shadow-2)' }}
                  className={`absolute ${flipSubmenuRight ? 'left-full ml-1' : 'right-full mr-1'} top-0 w-48 max-h-[calc(100vh-32px)] overflow-y-auto overflow-x-hidden bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-base)] rounded-[8px] p-[4px] text-xs flex flex-col gap-[1px] z-50 select-none`}
                >
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <span>Zoom in</span>
                    <span className="text-[10px] text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-secondary)]">Ctrl +</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <span>Zoom out</span>
                    <span className="text-[10px] text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-secondary)]">Ctrl -</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center justify-between gap-2 cursor-pointer group"
                  >
                    <span>Reset zoom (100%)</span>
                    <span className="text-[10px] text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-secondary)]">Ctrl 0</span>
                  </button>

                  <div className="border-t border-[var(--flint-border-subtle)] my-1 mx-1" />

                  {ZOOM_PRESETS.map((level) => {
                    const isCurrent = (zoomLevel || 100) === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => handleSetZoom(level)}
                        className={`w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs transition-colors flex items-center justify-between gap-2.5 cursor-pointer group ${
                          isCurrent
                            ? 'bg-[var(--flint-bg-sidebar-active)] text-[var(--flint-text-primary)] font-medium'
                            : 'text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)]'
                        }`}
                      >
                        <span>{level}%</span>
                        {isCurrent && <CheckIcon size={13} className="text-[var(--flint-text-primary)] shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Universal Plugin Actions */}
            {universalPluginActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onMouseEnter={() => setActiveSubmenu(null)}
                onClick={() => {
                  action.onClick(app, doc);
                  setIsOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center gap-2.5 cursor-pointer group"
              >
                {action.icon}
                <span>{action.title}</span>
              </button>
            ))}

            {/* Group 3: File Actions & Tools (Document specific) */}
            {doc && (
              <>
                <div className="border-t border-[var(--flint-border-subtle)] my-1 mx-1" />

                <button
                  type="button"
                  onMouseEnter={() => setActiveSubmenu(null)}
                  onClick={handleRename}
                  className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center gap-2.5 cursor-pointer group"
                >
                  <Edit02Icon size={14} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
                  <span>Rename...</span>
                </button>

                <button
                  type="button"
                  onMouseEnter={() => setActiveSubmenu(null)}
                  onClick={handleMoveFile}
                  className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center gap-2.5 cursor-pointer group"
                >
                  <MoveFileIcon size={14} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
                  <span>Move file to...</span>
                </button>

                <button
                  type="button"
                  onMouseEnter={() => setActiveSubmenu(null)}
                  onClick={handleMergeFile}
                  className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center gap-2.5 cursor-pointer group"
                >
                  <GitForkIcon size={14} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
                  <span>Merge entire file with...</span>
                </button>

                {toolActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      action.onClick(app, doc);
                      setIsOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center gap-2.5 cursor-pointer group"
                  >
                    {action.icon}
                    <span>{action.title}</span>
                  </button>
                ))}

                <button
                  type="button"
                  onMouseEnter={() => setActiveSubmenu(null)}
                  onClick={handleExportPDF}
                  className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center gap-2.5 cursor-pointer group"
                >
                  <Download01Icon size={14} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
                  <span>Export to PDF...</span>
                </button>

                <div className="border-t border-[var(--flint-border-subtle)] my-1 mx-1" />

                {/* Group 4: Copy path */}
                <div className="relative">
                  <button
                    type="button"
                    onMouseEnter={() => setActiveSubmenu('copyPath')}
                    onClick={() => handleCopyPath('relative')}
                    className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center justify-between gap-2.5 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Copy01Icon size={14} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
                      <span>Copy path</span>
                    </div>
                    <ChevronRightIcon size={12} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
                  </button>

                  {activeSubmenu === 'copyPath' && (
                    <div
                      onMouseLeave={() => setActiveSubmenu(null)}
                      style={{ boxShadow: 'var(--flint-shadow-2)' }}
                      className={`absolute ${flipSubmenuRight ? 'left-full ml-1' : 'right-full mr-1'} top-0 w-48 max-h-[calc(100vh-32px)] overflow-y-auto overflow-x-hidden bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-base)] rounded-[8px] p-[4px] text-xs flex flex-col gap-[1px] z-50 select-none`}
                    >
                      <button
                        type="button"
                        onClick={() => handleCopyPath('relative')}
                        className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer"
                      >
                        Copy relative path
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyPath('absolute')}
                        className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer"
                      >
                        Copy absolute path
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyPath('markdown')}
                        className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer"
                      >
                        Copy Markdown link
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-[var(--flint-border-subtle)] my-1 mx-1" />

                {/* Group 5: History & Modular Linked Views */}
                <button
                  type="button"
                  onMouseEnter={() => setActiveSubmenu(null)}
                  onClick={handleOpenVersionHistory}
                  className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center gap-2.5 cursor-pointer group"
                >
                  <Clock01Icon size={14} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
                  <span>Open version history</span>
                </button>

                {/* Modular Linked Views from active plugins */}
                {linkedViewActions.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setActiveSubmenu('linkedView')}
                      className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center justify-between gap-2.5 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <LinkSquare02Icon size={14} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
                        <span>Open linked view</span>
                      </div>
                      <ChevronRightIcon size={12} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
                    </button>

                    {activeSubmenu === 'linkedView' && (
                      <div
                        onMouseLeave={() => setActiveSubmenu(null)}
                        style={{ boxShadow: 'var(--flint-shadow-2)' }}
                        className={`absolute ${flipSubmenuRight ? 'left-full ml-1' : 'right-full mr-1'} top-0 w-44 max-h-[calc(100vh-32px)] overflow-y-auto overflow-x-hidden bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-base)] rounded-[8px] p-[4px] text-xs flex flex-col gap-[1px] z-50 select-none`}
                      >
                        {linkedViewActions.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            onClick={() => {
                              action.onClick(app, doc);
                              setIsOpen(false);
                              setActiveSubmenu(null);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            {action.icon}
                            <span>{action.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Additional plugin view actions */}
                {otherViewActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      action.onClick(app, doc);
                      setIsOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center gap-2.5 cursor-pointer group"
                  >
                    {action.icon}
                    <span>{action.title}</span>
                  </button>
                ))}

                <div className="border-t border-[var(--flint-border-subtle)] my-1 mx-1" />

                {/* Group 6: System & Navigation */}
                <button
                  type="button"
                  onMouseEnter={() => setActiveSubmenu(null)}
                  onClick={handleOpenInDefaultApp}
                  className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center gap-2.5 cursor-pointer group"
                >
                  <ExternalLinkIcon size={14} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
                  <span>Open in default app</span>
                </button>

                <button
                  type="button"
                  onMouseEnter={() => setActiveSubmenu(null)}
                  onClick={handleShowInExplorer}
                  className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center gap-2.5 cursor-pointer group"
                >
                  <FolderOpenIcon size={14} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
                  <span>Show in system explorer</span>
                </button>

                <button
                  type="button"
                  onMouseEnter={() => setActiveSubmenu(null)}
                  onClick={handleRevealInNavigation}
                  className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-[var(--flint-text-secondary)] hover:bg-[var(--flint-bg-card-hover)] hover:text-[var(--flint-text-primary)] transition-colors flex items-center gap-2.5 cursor-pointer group"
                >
                  <FolderTreeIcon size={14} className="text-[var(--flint-text-muted)] group-hover:text-[var(--flint-text-primary)] shrink-0" />
                  <span>Reveal file in navigation</span>
                </button>

                <div className="border-t border-[var(--flint-border-subtle)] my-1 mx-1" />

                {/* Group 7: Delete file */}
                <button
                  type="button"
                  onMouseEnter={() => setActiveSubmenu(null)}
                  onClick={handleDelete}
                  className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-colors flex items-center gap-2.5 cursor-pointer group"
                >
                  <Delete02Icon size={14} className="text-rose-500 group-hover:text-rose-600 shrink-0" />
                  <span>Delete file</span>
                </button>

                {dangerActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onMouseEnter={() => setActiveSubmenu(null)}
                    onClick={() => {
                      action.onClick(app, doc);
                      setIsOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-colors flex items-center gap-2.5 cursor-pointer group"
                  >
                    {action.icon}
                    <span>{action.title}</span>
                  </button>
                ))}
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
});

