import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNoetherApp, useStatusBarItems } from '@/core/app/AppContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { isDocumentLocked } from '@/lib/db/documents';
import {
  BookOpen01Icon,
  SourceCodeIcon,
  Edit02Icon,
  CheckIcon,
} from '@/components/common/Icons';

const StatusBarItemRenderer: React.FC<{
  item: import('@/core/extensions/types').StatusBarItem;
  app: import('@/core/app/NoetherApp').NoetherApp;
}> = React.memo(({ item, app }) => {
  return <>{item.render(app)}</>;
});

const WordCharCountItem: React.FC = React.memo(() => {
  const wordCount = useWorkspaceStore((s) => s.wordCount);
  const charCount = useWorkspaceStore((s) => s.charCount);
  const showWordCount = useSettingsStore((s) => s.showWordCountInStatusBar);
  const showCharCount = useSettingsStore((s) => s.showCharCountInStatusBar);
  const showReadingTime = useSettingsStore((s) => s.showReadingTimeInStatusBar);

  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const parts: string[] = [];
  if (showWordCount) {
    parts.push(`${wordCount} ${wordCount === 1 ? 'word' : 'words'}`);
  }
  if (showCharCount) {
    parts.push(`${charCount} ${charCount === 1 ? 'character' : 'characters'}`);
  }
  if (showReadingTime && wordCount > 0) {
    parts.push(`${readingTimeMinutes} min read`);
  }

  if (parts.length === 0) return null;

  return (
    <span className="cursor-default select-none text-[#777777]">
      {parts.join('  ')}
    </span>
  );
});

const ModeDropdownMenu: React.FC = React.memo(() => {
  const showMode = useSettingsStore((s) => s.showModeInStatusBar);
  const defaultTabMode = useSettingsStore((s) => s.defaultTabMode);
  const defaultEditingMode = useSettingsStore((s) => s.defaultEditingMode);
  const setDefaultTabMode = useSettingsStore((s) => s.setDefaultTabMode);
  const setDefaultEditingMode = useSettingsStore((s) => s.setDefaultEditingMode);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const activeDocument = useDocumentStore((s) => s.activeDocument);

  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ bottom?: number; left?: number; right?: number }>({});

  const isLocked = useMemo(() => isDocumentLocked(activeDocument), [activeDocument]);

  const currentMode: 'Reading' | 'Source mode' | 'Live Preview' =
    isLocked || defaultTabMode === 'Reading view'
      ? 'Reading'
      : defaultEditingMode === 'Source mode'
      ? 'Source mode'
      : 'Live Preview';

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const menuWidth = menuRef.current?.offsetWidth || 170;

    const bottom = vh - rect.top + 4;
    let left: number | undefined = undefined;
    let right: number | undefined = undefined;

    if (rect.left + menuWidth > vw - 8) {
      right = Math.max(8, vw - rect.right);
    } else {
      left = Math.max(8, rect.left);
    }

    setMenuPos({
      bottom,
      left,
      right,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const rafId = requestAnimationFrame(updatePosition);

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => updatePosition();

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const selectMode = (mode: 'Reading' | 'Source mode' | 'Live Preview') => {
    if (isLocked && mode !== 'Reading') {
      showToast('Current note is locked (Read-only). Unlock it in Properties to edit.', 'warning');
      setIsOpen(false);
      return;
    }
    if (mode === 'Reading') {
      setDefaultTabMode('Reading view');
    } else if (mode === 'Source mode') {
      setDefaultTabMode('Editing view');
      setDefaultEditingMode('Source mode');
    } else {
      setDefaultTabMode('Editing view');
      setDefaultEditingMode('Live Preview');
    }
    setIsOpen(false);
  };

  if (!showMode) return null;

  const renderIcon = (size: number = 12) => {
    if (currentMode === 'Reading') return <BookOpen01Icon size={size} />;
    if (currentMode === 'Source mode') return <SourceCodeIcon size={size} />;
    return <Edit02Icon size={size} />;
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={isLocked ? 'Reading (Locked)' : currentMode}
        className={`p-1 rounded-[4px] cursor-pointer flex items-center justify-center ${
          isOpen ? 'bg-[#282828] text-white' : 'text-[#777] hover:text-[#dcddde] hover:bg-[#242424]'
        }`}
      >
        {renderIcon(12)}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              bottom: menuPos.bottom !== undefined ? `${menuPos.bottom}px` : undefined,
              left: menuPos.left !== undefined ? `${menuPos.left}px` : undefined,
              right: menuPos.right !== undefined ? `${menuPos.right}px` : undefined,
              zIndex: 99999,
            }}
            className="min-w-[160px] w-max bg-[#1e1e1e] border border-[#333333] rounded-[6px] shadow-[0_8px_24px_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.3)] p-1 text-xs flex flex-col gap-0.5 whitespace-nowrap select-none"
          >
            <button
              type="button"
              onClick={() => selectMode('Reading')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs cursor-pointer whitespace-nowrap ${
                currentMode === 'Reading'
                  ? 'text-white font-medium bg-[#2a2a2a]'
                  : 'text-[#c5c6c8] hover:bg-[#282828] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 whitespace-nowrap">
                <BookOpen01Icon size={14} className="text-[#888] shrink-0" />
                <span className="whitespace-nowrap">{isLocked ? 'Reading (Locked)' : 'Reading'}</span>
              </div>
              {currentMode === 'Reading' && <CheckIcon size={14} className="text-white shrink-0 ml-3" />}
            </button>

            <button
              type="button"
              onClick={() => selectMode('Source mode')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs whitespace-nowrap ${
                isLocked
                  ? 'opacity-40 cursor-not-allowed text-[#777] hover:bg-transparent'
                  : currentMode === 'Source mode'
                  ? 'text-white font-medium bg-[#2a2a2a] cursor-pointer'
                  : 'text-[#c5c6c8] hover:bg-[#282828] hover:text-white cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2.5 whitespace-nowrap">
                <SourceCodeIcon size={14} className="text-[#888] shrink-0" />
                <span className="whitespace-nowrap">Source mode</span>
              </div>
              {currentMode === 'Source mode' && <CheckIcon size={14} className="text-white shrink-0 ml-3" />}
            </button>

            <button
              type="button"
              onClick={() => selectMode('Live Preview')}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs whitespace-nowrap ${
                isLocked
                  ? 'opacity-40 cursor-not-allowed text-[#777] hover:bg-transparent'
                  : currentMode === 'Live Preview'
                  ? 'text-white font-medium bg-[#2a2a2a] cursor-pointer'
                  : 'text-[#c5c6c8] hover:bg-[#282828] hover:text-white cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2.5 whitespace-nowrap">
                <Edit02Icon size={14} className="text-[#888] shrink-0" />
                <span className="whitespace-nowrap">Live Preview</span>
              </div>
              {currentMode === 'Live Preview' && <CheckIcon size={14} className="text-white shrink-0 ml-3" />}
            </button>
          </div>,
          document.body
        )}
    </div>
  );
});

export const StatusBar: React.FC = React.memo(() => {
  const app = useNoetherApp();
  const leftItems = useStatusBarItems('left');
  const rightItems = useStatusBarItems('right');

  const showMode = useSettingsStore((s) => s.showModeInStatusBar);
  const showWordCount = useSettingsStore((s) => s.showWordCountInStatusBar);
  const showCharCount = useSettingsStore((s) => s.showCharCountInStatusBar);
  const showReadingTime = useSettingsStore((s) => s.showReadingTimeInStatusBar);
  const activeDocument = useDocumentStore((s) => s.activeDocument);

  const hasNativeMetrics = Boolean(activeDocument && (showWordCount || showCharCount || showReadingTime));
  const hasItems = leftItems.length > 0 || rightItems.length > 0 || (showMode && Boolean(activeDocument)) || hasNativeMetrics;

  if (!hasItems) {
    return null;
  }

  return (
    <div
      data-noether-statusbar="true"
      style={{
        background: 'var(--noether-bg-statusbar, var(--noether-bg-card))',
        color: 'var(--noether-text-muted)',
      }}
      className="noether-status-bar absolute bottom-0 right-0 z-20 flex items-center gap-2 px-2 py-0.5 border-t border-l border-[var(--noether-border-base)] rounded-tl-md text-[11px] select-none shadow-sm"
    >
      {/* Left-aligned status items (if any) */}
      {leftItems.map((item) => (
        <StatusBarItemRenderer key={item.id} item={item} app={app} />
      ))}

      {/* Right-aligned native metrics */}
      {activeDocument && <WordCharCountItem />}

      {/* Right-aligned status items */}
      {rightItems.map((item) => (
        <StatusBarItemRenderer key={item.id} item={item} app={app} />
      ))}

      {/* Right-aligned mode switcher */}
      {activeDocument && <ModeDropdownMenu />}
    </div>
  );
});
