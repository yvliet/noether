/**
 * @module DefaultStatusBarExtension
 * @description
 * Built-in core extension that renders metrics and controls along the status bar:
 * live word and character counts, reading time estimation, editor mode dropdown
 * (Live Preview / Source / Reading), and SQLite database sync health status.
 *
 * @since 0.1.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Extension } from '@/core/extensions/Extension';
import { ExtensionManifest } from '@/core/extensions/types';
import { FlintApp } from '@/core/app/FlintApp';
import {
  DatabaseSync01Icon,
  DatabaseIcon,
  Edit02Icon,
  BookOpen01Icon,
  SourceCodeIcon,
  CheckIcon,
} from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useSettingsStore } from '@/store/settingsStore';
import { isDocumentLocked } from '@/lib/db/documents';
import { useDefaultStatusBarSettings } from './defaultStatusBarSettings';
import { defaultStatusBarReadme } from './defaultStatusBarReadme';

const LazyDefaultStatusBarSettingsTab = React.lazy(() =>
  import('./DefaultStatusBarSettingsTab').then((m) => ({ default: m.DefaultStatusBarSettingsTab }))
);

export const DEFAULT_STATUS_BAR_MANIFEST: ExtensionManifest = {
  id: 'default-status-bar',
  name: 'Default Status Bar Metrics',
  version: '1.0.0',
  description: 'Displays word & character counts, editor mode switcher, and database health in the status bar.',
  author: 'Yuliet Li',
  isCore: true,
  tags: ['statusbar', 'metrics', 'wordcount', 'sync', 'modes'],
  readme: defaultStatusBarReadme,
};

const ModeDropdownMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ bottom?: number; left?: number; right?: number }>({});
  const { defaultTabMode, defaultEditingMode, setDefaultTabMode, setDefaultEditingMode } = useSettingsStore();

  const activeDocument = useDocumentStore((s) => s.activeDocument);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const isLocked = isDocumentLocked(activeDocument);

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
        className={`p-1 rounded-[4px] transition-colors cursor-pointer flex items-center justify-center ${
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
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs cursor-pointer transition-colors whitespace-nowrap ${
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
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs transition-colors whitespace-nowrap ${
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
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-[4px] text-left text-xs transition-colors whitespace-nowrap ${
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
};

const DatabaseStatusIndicator: React.FC = () => {
  const isDatabaseActive = useWorkspaceStore((s) => s.isDatabaseActive);

  if (!isDatabaseActive) {
    return (
      <div
        className="p-1 rounded-[4px] flex items-center justify-center text-red-500 hover:text-red-400 cursor-default transition-colors"
        title="Database sync inactive"
      >
        <DatabaseIcon size={12} className="text-red-500" />
      </div>
    );
  }

  return (
    <div
      className="p-1 rounded-[4px] flex items-center justify-center text-[#777] hover:text-[#dcddde] hover:bg-[#242424] cursor-default transition-colors select-none"
      title="Database sync active"
    >
      <DatabaseSync01Icon size={12} />
    </div>
  );
};

const WordCharCountItem: React.FC = () => {
  const wordCount = useWorkspaceStore((s) => s.wordCount);
  const charCount = useWorkspaceStore((s) => s.charCount);
  const { showWordCount, showCharCount, showReadingTime } = useDefaultStatusBarSettings();

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
};

export class DefaultStatusBarExtension extends Extension {
  constructor(app: FlintApp, manifest: ExtensionManifest = DEFAULT_STATUS_BAR_MANIFEST) {
    super(app, manifest);
  }

  public onload(): void {
    // Word & Character count
    this.addStatusBarItem({
      id: 'word-char-count',
      alignment: 'right',
      order: 20,
      render: () => <WordCharCountItem />,
    });

    // Editor mode switcher dropdown (Pen icon)
    this.addStatusBarItem({
      id: 'mode-switcher',
      alignment: 'right',
      order: 45,
      render: () => <ModeDropdownMenu />,
    });

    // SQLite / Database sync indicator
    this.addStatusBarItem({
      id: 'sqlite-status',
      alignment: 'right',
      order: 50,
      render: () => <DatabaseStatusIndicator />,
    });

    // Extension Settings Tab
    this.registerSettingTab({
      id: 'status-bar-settings',
      name: 'Status bar metrics',
      icon: <DatabaseSync01Icon size={14} />,
      render: () => (
        <React.Suspense fallback={null}>
          <LazyDefaultStatusBarSettingsTab />
        </React.Suspense>
      ),
    });
  }
}

// Backwards-compat alias
export const DefaultStatusBarPlugin = DefaultStatusBarExtension;
