import React, { useState, useEffect, useMemo, useCallback, useContext, useRef } from 'react';
import { RotateCcwIcon } from '@/components/common/Icons';
import { useSettingsStore } from '@/store/settingsStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useNoetherApp, useCommands } from '@/core/app/AppContext';
import { CommandItem } from '@/core/extensions/types';
import { platform } from '@/lib/platform/platformAdapter';
import {
  highlightMatch,
  SettingsSearchContext,
} from '../shared/SettingRow';

interface HotkeyRowProps {
  cmd: CommandItem;
  cmdTitle: string;
  searchQuery: string;
  isCustomized: boolean;
  activeHotkey?: string;
  isRecording: boolean;
  onStartRecord: (id: string) => void;
  onReset: (id: string, title: string) => void;
}

const HotkeyRow: React.FC<HotkeyRowProps> = React.memo(({
  cmd,
  cmdTitle,
  searchQuery,
  isCustomized,
  activeHotkey,
  isRecording,
  onStartRecord,
  onReset,
}) => {
  return (
    <div
      className="p-3.5 flex items-center justify-between hover:bg-[var(--noether-btn-hover-bg)]"
    >
      <div className="flex flex-col">
        <span className="text-[13px] font-normal text-[var(--noether-text-primary)]">
          {highlightMatch(cmdTitle, searchQuery)}
        </span>
        {cmd.section && (
          <span className="text-[10px] text-[var(--noether-text-muted)] uppercase mt-0.5">
            {highlightMatch(cmd.section, searchQuery)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isCustomized && (
          <button
            onClick={() => onReset(cmd.id, cmdTitle)}
            title="Reset to default"
            className="text-[10px] text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] p-1 hover:bg-[var(--noether-btn-hover-bg)] rounded-[4px] cursor-pointer"
          >
            <RotateCcwIcon size={12} />
          </button>
        )}
        {isRecording ? (
          <span
            style={{
              backgroundColor: 'var(--noether-accent-subtle, rgba(235, 88, 77,0.2))',
              borderColor: 'var(--noether-accent, #eb584d)',
              color: 'var(--noether-accent, #eb584d)',
            }}
            className="px-2.5 py-1 border text-xs font-mono rounded-[5px] animate-pulse"
          >
            Press keys...
          </span>
        ) : activeHotkey ? (
          <button
            onClick={() => onStartRecord(cmd.id)}
            title="Click to reassign hotkey"
            className="noether-btn text-xs font-mono text-[#bbb] hover:text-white py-1 px-2.5"
          >
            {activeHotkey}
          </button>
        ) : (
          <button
            onClick={() => onStartRecord(cmd.id)}
            className="text-[11px] text-[#777] hover:text-white px-2 py-1 rounded-[5px] hover:bg-[#2a2a2a] cursor-pointer"
          >
            + Assign
          </button>
        )}
      </div>
    </div>
  );
});

export const HotkeysTab: React.FC = React.memo(() => {
  const app = useNoetherApp();
  const allCommands = useCommands();
  const customHotkeys = useSettingsStore((s) => s.customHotkeys);
  const setCustomHotkey = useSettingsStore((s) => s.setCustomHotkey);
  const resetCustomHotkey = useSettingsStore((s) => s.resetCustomHotkey);
  const resetAllHotkeys = useSettingsStore((s) => s.resetAllHotkeys);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);
  const { searchQuery, showAllOccurrences } = useContext(SettingsSearchContext);

  const [recordingCommandId, setRecordingCommandId] = useState<string | null>(null);
  const [renderedCount, setRenderedCount] = useState<number>(40);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Hotkey recording effect
  useEffect(() => {
    if (!recordingCommandId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingCommandId(null);
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        resetCustomHotkey(recordingCommandId);
        setRecordingCommandId(null);
        showToast('Reset shortcut to default', 'info');
        return;
      }

      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const isMac = platform.isMacOS();
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push(isMac ? 'Cmd' : 'Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push(isMac ? 'Option' : 'Alt');

      let keyName = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (keyName === ' ') keyName = 'Space';
      if (keyName === 'ArrowLeft') keyName = 'Left';
      if (keyName === 'ArrowRight') keyName = 'Right';
      if (keyName === 'ArrowUp') keyName = 'Up';
      if (keyName === 'ArrowDown') keyName = 'Down';
      parts.push(keyName);
      const newHotkey = parts.join('+');

      // Canonical normalization for conflict checking
      const normalize = (h: string) =>
        h
          .toLowerCase()
          .replace(/\bcmd\b|\bmeta\b/g, 'ctrl')
          .replace(/\boption\b/g, 'alt')
          .replace(/\barrowleft\b/g, 'left')
          .replace(/\barrowright\b/g, 'right')
          .replace(/\barrowup\b/g, 'up')
          .replace(/\barrowdown\b/g, 'down')
          .split('+')
          .sort()
          .join('+');

      const normalizedNew = normalize(newHotkey);
      const conflictingCmd = allCommands.find((c) => {
        if (c.id === recordingCommandId) return false;
        const existing = customHotkeys[c.id] !== undefined ? customHotkeys[c.id] : c.hotkey;
        if (!existing) return false;
        return normalize(existing) === normalizedNew;
      });

      setCustomHotkey(recordingCommandId, newHotkey);
      setRecordingCommandId(null);

      if (conflictingCmd) {
        const confTitle = typeof conflictingCmd.title === 'function' ? conflictingCmd.title(app) : conflictingCmd.title;
        showToast(`Assigned ${newHotkey} (overrides conflict with "${confTitle}")`, 'warning');
      } else {
        showToast(`Assigned shortcut: ${newHotkey}`, 'success');
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingCommandId, setCustomHotkey, resetCustomHotkey, showToast, allCommands, customHotkeys, app]);

  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return allCommands;
    const q = searchQuery.toLowerCase().trim();
    return allCommands.filter((cmd) => {
      const cmdTitle = typeof cmd.title === 'function' ? cmd.title(app) : cmd.title;
      return (
        cmdTitle.toLowerCase().includes(q) ||
        (cmd.section && cmd.section.toLowerCase().includes(q)) ||
        (cmd.hotkey && cmd.hotkey.toLowerCase().includes(q)) ||
        'hotkeys'.includes(q) ||
        'shortcuts'.includes(q)
      );
    });
  }, [allCommands, searchQuery, app]);

  // Reset slice limit when query changes
  useEffect(() => {
    setRenderedCount(40);
  }, [searchQuery]);

  // Sliced viewport streaming via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setRenderedCount((prev) => Math.min(prev + 40, filteredCommands.length));
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredCommands.length]);

  const handleStartRecord = useCallback((id: string) => {
    setRecordingCommandId(id);
  }, []);

  const handleResetCommand = useCallback((id: string, title: string) => {
    resetCustomHotkey(id);
    showToast(`Reset shortcut for "${title}"`, 'info');
  }, [resetCustomHotkey, showToast]);

  const handleResetAll = useCallback(() => {
    openConfirmDialog({
      title: 'Reset All Shortcuts',
      message: 'Are you sure you want to reset all customized keyboard shortcuts to their default values?',
      subtext: 'All custom hotkey assignments will be restored to their original defaults.',
      confirmText: 'Reset all',
      isDanger: true,
      showDontAskAgain: false,
      onConfirm: () => {
        resetAllHotkeys();
        showToast('Reset all customized shortcuts to defaults', 'info');
      },
    });
  }, [openConfirmDialog, resetAllHotkeys, showToast]);

  if (showAllOccurrences && searchQuery.trim() && filteredCommands.length === 0) {
    return null;
  }

  const visibleCommands = filteredCommands.slice(0, renderedCount);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between px-4">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-[var(--noether-text-primary)] mb-0.5">
            {highlightMatch('Hotkeys & Shortcuts', searchQuery)}
          </h3>
          <p className="text-[11px] text-[var(--noether-text-muted)] leading-relaxed">
            {highlightMatch('View, customize, or rebind keyboard shortcuts across all workspace commands.', searchQuery)}
          </p>
        </div>
        {Object.keys(customHotkeys).length > 0 && (
          <button
            onClick={handleResetAll}
            className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
            title="Reset all customized shortcuts to defaults"
          >
            <RotateCcwIcon size={12} />
            <span>Reset all</span>
          </button>
        )}
      </div>

      {recordingCommandId && (
        <div
          style={{ borderColor: 'var(--noether-accent, #eb584d)' }}
          className="mx-4 p-3 bg-[#242424] border rounded-xl flex items-center justify-between text-xs text-white"
        >
          <span>Press your desired key combination (e.g. <b>Ctrl+Shift+K</b>)...</span>
          <button
            onClick={() => setRecordingCommandId(null)}
            className="noether-btn text-xs !py-0.5 !px-2"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      <div className="bg-[var(--noether-bg-card,#202020)] border border-[var(--noether-border-base,#2a2a2a)] rounded-xl overflow-hidden divide-y divide-[var(--noether-border-subtle,#282828)]">
        {visibleCommands.map((cmd) => {
          const cmdTitle = typeof cmd.title === 'function' ? cmd.title(app) : cmd.title;
          const activeHotkey = customHotkeys[cmd.id] !== undefined ? customHotkeys[cmd.id] : cmd.hotkey;
          const isCustomized = customHotkeys[cmd.id] !== undefined;
          const isRecording = recordingCommandId === cmd.id;

          return (
            <HotkeyRow
              key={cmd.id}
              cmd={cmd}
              cmdTitle={cmdTitle}
              searchQuery={searchQuery}
              isCustomized={isCustomized}
              activeHotkey={activeHotkey}
              isRecording={isRecording}
              onStartRecord={handleStartRecord}
              onReset={handleResetCommand}
            />
          );
        })}
      </div>

      {/* Sentinel element to trigger streaming of subsequent items on scroll */}
      {renderedCount < filteredCommands.length && (
        <div ref={sentinelRef} className="h-6 flex items-center justify-center text-xs text-[var(--noether-text-muted)]">
          Loading more shortcuts...
        </div>
      )}
    </div>
  );
});
