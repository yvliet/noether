import { useEffect } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useDocumentStore } from '@/store/documentStore';
import { useFileHistoryStore } from '@/store/fileHistoryStore';
import { appInstance } from '@/core/app/FlintApp';
import { platform } from '@/lib/platform/platformAdapter';

function matchesHotkey(e: KeyboardEvent, hotkeyStr?: string): boolean {
  if (!hotkeyStr) return false;
  const parts = hotkeyStr.split('+').map((p) => p.trim().toLowerCase());
  const needsCtrl = parts.includes('ctrl') || parts.includes('cmd');
  const needsShift = parts.includes('shift');
  const needsAlt = parts.includes('alt');

  const actualCtrl = e.ctrlKey || e.metaKey;
  const actualShift = e.shiftKey;
  const actualAlt = e.altKey;

  if (needsCtrl !== actualCtrl) return false;
  if (needsShift !== actualShift) return false;
  if (needsAlt !== actualAlt) return false;

  const nonModifiers = parts.filter((p) => !['ctrl', 'cmd', 'shift', 'alt'].includes(p));
  if (nonModifiers.length !== 1) return false;

  const targetKey = nonModifiers[0];
  const eKey = e.key.toLowerCase();

  if (targetKey === 'space' && eKey === ' ') return true;
  if (targetKey === ',' && (eKey === ',' || e.code === 'Comma')) return true;
  if (targetKey === '.' && (eKey === '.' || e.code === 'Period')) return true;
  if (targetKey === '\\' && eKey === '\\') return true;
  if (targetKey === '/' && eKey === '/') return true;
  if (targetKey === 'f1' && eKey === 'f1') return true;
  if ((targetKey === '=' || targetKey === '+') && (eKey === '=' || eKey === '+' || e.code === 'Equal' || e.code === 'NumpadAdd')) return true;
  if ((targetKey === '-' || targetKey === '_') && (eKey === '-' || eKey === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract')) return true;
  if (targetKey === '0' && (eKey === '0' || e.code === 'Digit0' || e.code === 'Numpad0')) return true;
  if ((targetKey === 'left' || targetKey === 'arrowleft') && (eKey === 'arrowleft' || e.code === 'ArrowLeft')) return true;
  if ((targetKey === 'right' || targetKey === 'arrowright') && (eKey === 'arrowright' || e.code === 'ArrowRight')) return true;
  if ((targetKey === 'up' || targetKey === 'arrowup') && (eKey === 'arrowup' || e.code === 'ArrowUp')) return true;
  if ((targetKey === 'down' || targetKey === 'arrowdown') && (eKey === 'arrowdown' || e.code === 'ArrowDown')) return true;
  if (targetKey === 'tab' && (eKey === 'tab' || e.code === 'Tab')) return true;
  if (targetKey === 'pagedown' && (eKey === 'pagedown' || e.code === 'PageDown')) return true;
  if (targetKey === 'pageup' && (eKey === 'pageup' || e.code === 'PageUp')) return true;

  return eKey === targetKey || e.code.toLowerCase() === `key${targetKey}` || e.code.toLowerCase() === `digit${targetKey}`;
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      const keyLower = e.key.toLowerCase();
      const code = e.code;

      const ws = useWorkspaceStore.getState();
      const ds = useDocumentStore.getState();
      const ss = useSettingsStore.getState();
      const hs = useFileHistoryStore.getState();

      const isMatch = (commandId: string, defaultHotkeys: string[]): boolean => {
        const custom = ss.customHotkeys[commandId];
        if (custom) {
          return matchesHotkey(e, custom);
        }
        return defaultHotkeys.some((h) => matchesHotkey(e, h));
      };

      // 1. Escape: Close any open modal or return from non-document views
      if (e.key === 'Escape') {
        if (ws.confirmDialog?.isOpen) {
          e.preventDefault();
          ws.closeConfirmDialog();
          return;
        }
        if (ws.inputDialog?.isOpen) {
          e.preventDefault();
          ws.closeInputDialog();
          return;
        }
        if (ws.isCommandPaletteOpen) {
          e.preventDefault();
          ws.setIsCommandPaletteOpen(false);
          return;
        }
        if (ws.isReviewModalOpen) {
          e.preventDefault();
          ws.setIsReviewModalOpen(false);
          return;
        }
        if (ws.isSettingsOpen) {
          e.preventDefault();
          ws.setIsSettingsOpen(false);
          return;
        }
        if (ws.isHelpModalOpen) {
          e.preventDefault();
          ws.setIsHelpModalOpen(false);
          return;
        }
        if (ws.isHearthModalOpen) {
          e.preventDefault();
          ws.setIsHearthModalOpen(false);
          return;
        }
        if (ws.mainViewMode !== 'document') {
          e.preventDefault();
          ws.setMainViewMode('document');
          return;
        }
      }

      // 1.1 Zoom Controls (Available globally: Ctrl + +, Ctrl + =, Ctrl + -, Ctrl + 0)
      const isZoomIn =
        isMatch('workspace:zoom-in', ['Ctrl+=', 'Ctrl++', 'Ctrl+Shift+=', 'Ctrl+Shift++']) ||
        (isCtrlOrMeta && !isAlt && (e.key === '=' || e.key === '+' || code === 'Equal' || code === 'NumpadAdd'));

      const isZoomOut =
        isMatch('workspace:zoom-out', ['Ctrl+-', 'Ctrl+_', 'Ctrl+Shift+-', 'Ctrl+Shift+_']) ||
        (isCtrlOrMeta && !isAlt && (e.key === '-' || e.key === '_' || code === 'Minus' || code === 'NumpadSubtract'));

      const isZoomReset =
        isMatch('workspace:zoom-reset', ['Ctrl+0']) ||
        (isCtrlOrMeta && !isShift && !isAlt && (e.key === '0' || code === 'Digit0' || code === 'Numpad0'));

      if (isZoomIn || isZoomOut || isZoomReset) {
        e.preventDefault();
        e.stopPropagation();

        if (isZoomIn) {
          const currentZoom = ss.zoomLevel || 100;
          if (currentZoom >= 200) {
            ws.showToast('Zoom: 200% (Maximum limit reached)', 'info');
          } else {
            const nextZoom = Math.min(200, Math.round((currentZoom + 10) / 5) * 5);
            ss.setZoomLevel(nextZoom);
            ws.showToast(`Zoom: ${nextZoom}%`, 'info');
          }
          return;
        }

        if (isZoomOut) {
          const currentZoom = ss.zoomLevel || 100;
          if (currentZoom <= 50) {
            ws.showToast('Zoom: 50% (Minimum limit reached)', 'info');
          } else {
            const nextZoom = Math.max(50, Math.round((currentZoom - 10) / 5) * 5);
            ss.setZoomLevel(nextZoom);
            ws.showToast(`Zoom: ${nextZoom}%`, 'info');
          }
          return;
        }

        if (isZoomReset) {
          if (ss.zoomLevel !== 100) {
            ss.setZoomLevel(100);
            ws.showToast('Zoom: 100% (Default)', 'info');
          } else {
            ws.showToast('Zoom: 100% (Already default)', 'info');
          }
          return;
        }
      }

      const target = (e.target || document.activeElement) as HTMLElement | null;

      // If a modal is open, don't execute other navigation shortcuts
      if (
        ws.confirmDialog?.isOpen ||
        ws.inputDialog?.isOpen ||
        ws.isReviewModalOpen ||
        ws.isSettingsOpen ||
        ws.isHelpModalOpen ||
        ws.isHearthModalOpen
      ) {
        return;
      }

      // 2. Toggle Left Sidebar: Ctrl + \
      if (isMatch('workspace:toggle-left-sidebar', ['Ctrl+\\'])) {
        e.preventDefault();
        ws.setIsLeftSidebarOpen(!ws.isLeftSidebarOpen);
        return;
      }

      // 3. Toggle Right Sidebar: Ctrl + Alt + \
      if (isMatch('workspace:toggle-right-sidebar', ['Ctrl+Alt+\\'])) {
        e.preventDefault();
        ws.setIsRightSidebarOpen(!ws.isRightSidebarOpen);
        return;
      }

      // 4. Command Palette / Quick Open: Ctrl + K, Ctrl + P
      if (isMatch('workspace:command-palette', ['Ctrl+K', 'Ctrl+P']) || isMatch('workspace:quick-open', ['Ctrl+K', 'Ctrl+P'])) {
        // If user is inside an editor, allow Ctrl+K for editor link wrapping/insertion instead of hijacking
        const isEditor = Boolean(target?.closest('.ProseMirror'));
        if (isEditor && (e.key === 'k' || e.key === 'K')) {
          return;
        }
        e.preventDefault();
        ws.setIsCommandPaletteOpen(true);
        return;
      }

      // If Command Palette is open, let its own handlers handle keyboard navigation
      if (ws.isCommandPaletteOpen) {
        return;
      }

      // 5. New Note: Ctrl + N
      if (isMatch('workspace:new-note', ['Ctrl+N'])) {
        e.preventDefault();
        ds.createNewNote('Untitled');
        return;
      }

      // 6. New Canvas: Ctrl + Shift + C or Ctrl + Shift + N
      if (isMatch('workspace:new-canvas', ['Ctrl+Shift+C', 'Ctrl+Shift+N'])) {
        const handled = await appInstance.commands.executeCommand('cmd-canvas', appInstance);
        if (handled) {
          e.preventDefault();
          return;
        }
      }

      // 7. Graph View: Ctrl + G
      if (isMatch('workspace:graph-view', ['Ctrl+G'])) {
        const handled = await appInstance.commands.executeCommand('cmd-graph-view', appInstance);
        if (handled) {
          e.preventDefault();
          return;
        }
      }

      // 8. Journal / Daily Note: Ctrl + Shift + D
      if (isMatch('workspace:journal', ['Ctrl+Shift+D']) || isMatch('workspace:daily-note', ['Ctrl+Shift+D'])) {
        const handled = await appInstance.commands.executeCommand('cmd-journal', appInstance);
        if (handled) {
          e.preventDefault();
          return;
        }
      }

      // 9. Tasks View: Ctrl + Shift + T
      if (isMatch('workspace:tasks-view', ['Ctrl+Shift+T'])) {
        const handled = await appInstance.commands.executeCommand('cmd-tasks', appInstance);
        if (handled) {
          e.preventDefault();
          return;
        }
      }

      // 10. FSRS Review: Ctrl + Shift + R
      if (isMatch('workspace:fsrs-review', ['Ctrl+Shift+R'])) {
        const handled = await appInstance.commands.executeCommand('cmd-fsrs-review', appInstance);
        if (handled) {
          e.preventDefault();
          return;
        }
      }

      // 11. Hearth Switcher: Ctrl + Shift + O
      if (isMatch('workspace:hearth-switcher', ['Ctrl+Shift+O']) || isMatch('workspace:vault-switcher', ['Ctrl+Shift+O'])) {
        e.preventDefault();
        ws.setIsHearthModalOpen(true);
        return;
      }

      // 12. Settings: Ctrl + ,
      if (isMatch('workspace:settings', ['Ctrl+,'])) {
        e.preventDefault();
        ws.setIsSettingsOpen(true);
        return;
      }

      // 14. Help & Shortcuts: F1 or Ctrl + /
      if (isMatch('workspace:help', ['F1', 'Ctrl+/'])) {
        e.preventDefault();
        ws.setIsHelpModalOpen(true);
        return;
      }

      // 14. Left Sidebar View Switchers
      // Ctrl + Shift + E -> Files
      if (isMatch('workspace:sidebar-files', ['Ctrl+Shift+E'])) {
        e.preventDefault();
        ws.setActiveLeftView('files');
        return;
      }
      // Ctrl + Shift + F -> Search
      if (isMatch('workspace:sidebar-search', ['Ctrl+Shift+F'])) {
        e.preventDefault();
        ws.setActiveLeftView('search');
        return;
      }
      // Ctrl + Shift + B -> Bookmarks
      if (isMatch('workspace:sidebar-bookmarks', ['Ctrl+Shift+B'])) {
        e.preventDefault();
        ws.setActiveLeftView('bookmarks');
        return;
      }

      // In-Document Find: Ctrl + F
      if (isMatch('editor:find-in-note', ['Ctrl+F'])) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('flint:find-in-note', { detail: { paneId: ws.focusedPaneId } }));
        return;
      }
      // In-Document Replace: Ctrl + H
      if (isMatch('editor:replace-in-note', ['Ctrl+H'])) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('flint:replace-in-note', { detail: { paneId: ws.focusedPaneId } }));
        return;
      }

      // Close active tab: Ctrl + W
      if (isMatch('workspace:close-tab', ['Ctrl+W'])) {
        e.preventDefault();
        if (ws.isSplitView && ws.activePane === 'split' && ws.splitActiveTabId) {
          ws.closeSplitTab(ws.splitActiveTabId);
        } else if (ws.activeTabId) {
          ws.closeTab(ws.activeTabId);
        }
        return;
      }

      // New Tab: Ctrl + T
      if (isMatch('workspace:new-tab', ['Ctrl+T'])) {
        e.preventDefault();
        ws.openEmptyTab();
        return;
      }

      // Toggle Source Mode: Ctrl + Alt + S
      if (isMatch('editor:toggle-source-mode', ['Ctrl+Alt+S'])) {
        e.preventDefault();
        const curMode = ss.defaultEditingMode;
        const next = curMode === 'Source mode' ? 'Live Preview' : 'Source mode';
        ss.setDefaultEditingMode(next);
        if (ss.defaultTabMode === 'Reading view') {
          ss.setDefaultTabMode('Editing view');
        }
        ws.showToast(`Switched to ${next}`, 'info');
        return;
      }

      // Toggle Reading View: Ctrl + E
      if (isMatch('editor:toggle-reading-view', ['Ctrl+E'])) {
        e.preventDefault();
        const curMode = ss.defaultTabMode;
        const next = curMode === 'Reading view' ? 'Editing view' : 'Reading view';
        ss.setDefaultTabMode(next);
        ws.showToast(`Switched to ${next}`, 'info');
        return;
      }

      // Next Tab: Ctrl + Tab, Ctrl + PageDown, or Alt + E
      const isNextTab =
        isMatch('workspace:next-tab', ['Ctrl+Tab', 'Ctrl+PageDown', 'Alt+E']) ||
        ((e.key === 'Tab' || code === 'Tab') && isCtrlOrMeta && !isShift && !isAlt) ||
        (e.key === 'PageDown' && isCtrlOrMeta && !isShift && !isAlt) ||
        ((keyLower === 'e' || code === 'KeyE') && isAlt && !isCtrlOrMeta && !isShift);

      if (isNextTab) {
        e.preventDefault();
        const currentTabs = ws.isSplitView && ws.activePane === 'split' ? ws.splitTabs : ws.tabs;
        const currentActiveId = ws.isSplitView && ws.activePane === 'split' ? ws.splitActiveTabId : ws.activeTabId;
        if (currentTabs.length > 1) {
          const currentIndex = currentTabs.findIndex((t) => t.id === currentActiveId);
          const nextIndex = (currentIndex + 1) % currentTabs.length;
          if (ws.isSplitView && ws.activePane === 'split') {
            ws.setSplitActiveTabId(currentTabs[nextIndex].id);
          } else {
            ws.setActiveTabId(currentTabs[nextIndex].id);
          }
        }
        return;
      }

      // Previous Tab: Ctrl + Shift + Tab, Ctrl + PageUp, or Alt + Q
      const isPrevTab =
        isMatch('workspace:prev-tab', ['Ctrl+Shift+Tab', 'Ctrl+PageUp', 'Alt+Q']) ||
        ((e.key === 'Tab' || code === 'Tab') && isCtrlOrMeta && isShift && !isAlt) ||
        (e.key === 'PageUp' && isCtrlOrMeta && !isShift && !isAlt) ||
        ((keyLower === 'q' || code === 'KeyQ') && isAlt && !isCtrlOrMeta && !isShift);

      if (isPrevTab) {
        e.preventDefault();
        const currentTabs = ws.isSplitView && ws.activePane === 'split' ? ws.splitTabs : ws.tabs;
        const currentActiveId = ws.isSplitView && ws.activePane === 'split' ? ws.splitActiveTabId : ws.activeTabId;
        if (currentTabs.length > 1) {
          const currentIndex = currentTabs.findIndex((t) => t.id === currentActiveId);
          const prevIndex = (currentIndex - 1 + currentTabs.length) % currentTabs.length;
          if (ws.isSplitView && ws.activePane === 'split') {
            ws.setSplitActiveTabId(currentTabs[prevIndex].id);
          } else {
            ws.setActiveTabId(currentTabs[prevIndex].id);
          }
        }
        return;
      }

      // Direct Tab Jump by Number: Ctrl + 1 .. Ctrl + 9
      if (isCtrlOrMeta && !isShift && !isAlt) {
        const digitMatch = code.match(/^Digit([1-9])$/) || (e.key >= '1' && e.key <= '9' ? [null, e.key] : null);
        if (digitMatch) {
          const num = parseInt(digitMatch[1], 10);
          const currentTabs = ws.isSplitView && ws.activePane === 'split' ? ws.splitTabs : ws.tabs;
          if (currentTabs.length > 0) {
            let targetIdx = -1;
            if (num === 9) {
              // Ctrl+9 switches to the last tab in browser standard
              targetIdx = currentTabs.length - 1;
            } else {
              targetIdx = num - 1;
            }
            if (targetIdx >= 0 && targetIdx < currentTabs.length) {
              e.preventDefault();
              if (ws.isSplitView && ws.activePane === 'split') {
                ws.setSplitActiveTabId(currentTabs[targetIdx].id);
              } else {
                ws.setActiveTabId(currentTabs[targetIdx].id);
              }
              return;
            }
          }
        }
      }

      // 16. Toggle Split View: Ctrl + Alt + S
      if ((keyLower === 's' || code === 'KeyS') && isCtrlOrMeta && isAlt) {
        e.preventDefault();
        ws.toggleSplitView();
        return;
      }

      // 16b. Explicit Save: Ctrl + S / Cmd + S
      if ((keyLower === 's' || code === 'KeyS') && isCtrlOrMeta && !isAlt && !isShift) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('flint:save-note'));
        return;
      }

      // 17. History Navigation & Editor Context Guard
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'MATH-FIELD' ||
        Boolean(target?.closest('math-field')) ||
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'MATH-FIELD';
      const isContentEditor =
        Boolean(target?.isContentEditable) ||
        Boolean(target?.closest('[contenteditable="true"]')) ||
        Boolean(target?.closest('.ProseMirror')) ||
        Boolean(target?.closest('.tiptap')) ||
        Boolean(target?.closest('.flint-doc-wrapper')) ||
        Boolean(target?.closest('.editor-canvas')) ||
        Boolean(activeEl?.isContentEditable) ||
        Boolean(activeEl?.closest('[contenteditable="true"]')) ||
        Boolean(activeEl?.closest('.ProseMirror')) ||
        Boolean(activeEl?.closest('.tiptap')) ||
        Boolean(activeEl?.closest('.flint-doc-wrapper')) ||
        Boolean(activeEl?.closest('.editor-canvas'));
      const isAnyEditorOrInput = isInput || isContentEditor;
      const isSidebarFocused = Boolean(target?.closest('[data-sidebar="true"]') || activeEl?.closest('[data-sidebar="true"]'));
      const isCanvasOrGraph = Boolean(
        target?.closest('[data-canvas-view="true"]') ||
        target?.closest('.flint-canvas-view') ||
        activeEl?.closest('[data-canvas-view="true"]') ||
        activeEl?.closest('.flint-canvas-view') ||
        ws.mainViewMode === 'canvas' ||
        ws.mainViewMode === 'graph'
      );

      // 18. File Action Undo & Redo (Only when explicitly focused in sidebar/file tree)
      if (!isAnyEditorOrInput && isSidebarFocused) {
        const isUndo =
          isMatch('workspace:undo-file-action', ['Ctrl+Alt+Z', 'Ctrl+Z']) ||
          ((keyLower === 'z' || code === 'KeyZ') && isCtrlOrMeta && !isShift && !isAlt);

        if (isUndo) {
          e.preventDefault();
          e.stopPropagation();
          hs.undo();
          return;
        }

        const isRedo =
          isMatch('workspace:redo-file-action', ['Ctrl+Alt+Y', 'Ctrl+Y', 'Ctrl+Shift+Z']) ||
          ((keyLower === 'y' || code === 'KeyY') && isCtrlOrMeta && !isShift && !isAlt) ||
          ((keyLower === 'z' || code === 'KeyZ') && isCtrlOrMeta && isShift && !isAlt);

        if (isRedo) {
          e.preventDefault();
          e.stopPropagation();
          hs.redo();
          return;
        }
      }

      // Generic Registered Plugin & App Commands Hotkey Dispatch
      const registeredCommands = appInstance.commands.getAllCommands();
      for (const cmd of registeredCommands) {
        const customHotkey = ss.customHotkeys[cmd.id];
        const defaultHotkeys = cmd.hotkey ? [cmd.hotkey] : [];
        if (customHotkey || defaultHotkeys.length > 0) {
          if (isMatch(cmd.id, defaultHotkeys)) {
            if (!isAnyEditorOrInput || cmd.allowInInput) {
              e.preventDefault();
              e.stopPropagation();
              cmd.action(appInstance);
              return;
            }
          }
        }
      }

      if (!isAnyEditorOrInput) {
        const isBack =
          isMatch('workspace:navigate-back', ['Alt+Left', 'Alt+ArrowLeft', 'Alt+A']) ||
          ((e.key === 'ArrowLeft' || keyLower === 'a' || code === 'KeyA') && isAlt && !isCtrlOrMeta && !isShift);

        if (isBack) {
          e.preventDefault();
          ws.navigateBack();
          return;
        }

        const isForward =
          isMatch('workspace:navigate-forward', ['Alt+Right', 'Alt+ArrowRight', 'Alt+D']) ||
          ((e.key === 'ArrowRight' || keyLower === 'd' || code === 'KeyD') && isAlt && !isCtrlOrMeta && !isShift);

        if (isForward) {
          e.preventDefault();
          ws.navigateForward();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);
}
