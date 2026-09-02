/**
 * @module HelpModal
 * @description
 * Native overlay dialog displaying core Flint documentation, hotkeys, and markdown guide.
 * Extension-specific documentation is rendered on-demand via the extension documentation viewer.
 *
 * @since 0.1.0
 */

import React, { useState } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import {
  Cancel01Icon,
  HelpCircleIcon,
} from '@/components/common/Icons';

export const HelpModal: React.FC = React.memo(() => {
  const isHelpModalOpen = useWorkspaceStore((state) => state.isHelpModalOpen);
  const setIsHelpModalOpen = useWorkspaceStore((state) => state.setIsHelpModalOpen);
  const [tab, setTab] = useState<'shortcuts' | 'markdown'>('shortcuts');

  if (!isHelpModalOpen) return null;

  return (
    <div
      onClick={() => setIsHelpModalOpen(false)}
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 select-none"
    >
      <div
        data-card="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[var(--flint-bg-popover,var(--flint-bg-card))] border border-[var(--flint-border-subtle,#2e2e2e)] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs max-h-[600px]"
      >
        {/* Header */}
        <div className="h-12 px-5 border-b border-[var(--flint-border-subtle,#282828)] flex items-center justify-between bg-[var(--flint-bg-topbar,#181818)] shrink-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--flint-text-primary)]">
            <HelpCircleIcon size={16} className="text-[var(--flint-text-muted)]" />
            <span>Flint Guide & Keyboard Shortcuts</span>
          </div>
          <button
            onClick={() => setIsHelpModalOpen(false)}
            className="p-1 rounded hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] cursor-pointer"
          >
            <Cancel01Icon size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-[var(--flint-border-subtle,#262626)] bg-[var(--flint-bg-sidebar,#1a1a1a)] shrink-0">
          <button
            onClick={() => setTab('shortcuts')}
            className={`pb-2 px-1 font-medium transition-colors border-b-2 cursor-pointer ${
              tab === 'shortcuts'
                ? 'border-[var(--flint-accent)] text-[var(--flint-text-primary)]'
                : 'border-transparent text-[var(--flint-text-muted)] hover:text-[var(--flint-text-secondary)]'
            }`}
          >
            Keyboard Shortcuts
          </button>
          <button
            onClick={() => setTab('markdown')}
            className={`pb-2 px-1 font-medium transition-colors border-b-2 cursor-pointer ${
              tab === 'markdown'
                ? 'border-[var(--flint-accent)] text-[var(--flint-text-primary)]'
                : 'border-transparent text-[var(--flint-text-muted)] hover:text-[var(--flint-text-secondary)]'
            }`}
          >
            Markdown Formatting
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4 text-xs">
          {tab === 'shortcuts' && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between py-1.5 border-b border-[#282828]">
                <span className="text-[#dcddde]">Toggle Left Sidebar</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#aaa]">
                  <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Ctrl</kbd> + <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">\ </kbd>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#282828]">
                <span className="text-[#dcddde]">Toggle Right Sidebar</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#aaa]">
                  <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Ctrl</kbd> + <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Shift</kbd> + <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">\ </kbd>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#282828]">
                <span className="text-[#dcddde]">Quick Open & Command Search</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#aaa]">
                  <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Ctrl</kbd> + <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">K</kbd>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#282828]">
                <span className="text-[#dcddde]">Create New Note</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#aaa]">
                  <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Ctrl</kbd> + <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">N</kbd>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#282828]">
                <span className="text-[#dcddde]">Hearth Switcher</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#aaa]">
                  <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Ctrl</kbd> + <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Shift</kbd> + <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">O</kbd>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#282828]">
                <span className="text-[#dcddde]">New Tab / Close Tab</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#aaa]">
                  <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Ctrl</kbd> + <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">T</kbd> / <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">W</kbd>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#282828]">
                <span className="text-[#dcddde]">Next / Previous Tab</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#aaa]">
                  <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Ctrl+Tab</kbd> / <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Ctrl+Shift+Tab</kbd>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#282828]">
                <span className="text-[#dcddde]">Go to Tab 1-8 / Last Tab</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#aaa]">
                  <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Ctrl+1..8</kbd> / <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Ctrl+9</kbd>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#282828]">
                <span className="text-[#dcddde]">Navigate Back / Forward</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#aaa]">
                  <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Alt+←</kbd> / <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Alt+→</kbd>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#282828]">
                <span className="text-[#dcddde]">Toggle Split Editor</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#aaa]">
                  <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Ctrl</kbd> + <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Alt</kbd> + <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">S</kbd>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#282828]">
                <span className="text-[#dcddde]">Slash Commands Menu</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#aaa]">
                  <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">/</kbd>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#282828]">
                <span className="text-[#dcddde]">Wiki-Link to Another Document</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#aaa]">
                  <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">[[</kbd>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#282828]">
                <span className="text-[#dcddde]">Zoom In / Zoom Out</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#aaa]">
                  <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Ctrl + +</kbd> / <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Ctrl + -</kbd>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#282828]">
                <span className="text-[#dcddde]">Reset Zoom (100%)</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#aaa]">
                  <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Ctrl + 0</kbd>
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#282828]">
                <span className="text-[#dcddde]">Settings</span>
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#aaa]">
                  <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">Ctrl</kbd> + <kbd className="bg-[#2a2a2a] px-1.5 py-0.5 rounded border border-[#383838]">,</kbd>
                </span>
              </div>
            </div>
          )}

          {tab === 'markdown' && (
            <div className="flex flex-col gap-3 leading-relaxed text-[#bbb]">
              <div>
                <span className="font-semibold text-white">#tag and #topic/subtopic</span>
                <p className="text-[11px] text-[#777]">Categorizes notes across your Hearth and organizes them in the Tags pane.</p>
              </div>

              <div>
                <span className="font-semibold text-white">[[Target Note Title]]</span>
                <p className="text-[11px] text-[#777]">Creates bi-directional links and generates backlinks in the right sidebar.</p>
              </div>

              <div>
                <span className="font-semibold text-white"># Heading 1, ## Heading 2, ### Heading 3</span>
                <p className="text-[11px] text-[#777]">Creates structured headings for outline auto-generation and jumping.</p>
              </div>

              <div>
                <span className="font-semibold text-white">- [ ] Task Item</span>
                <p className="text-[11px] text-[#777]">Creates interactive checklist items tracked globally.</p>
              </div>

              <div>
                <span className="font-semibold text-white">`code` and ```code block```</span>
                <p className="text-[11px] text-[#777]">Monospace code snippets and syntax highlighting.</p>
              </div>

              <div>
                <span className="font-semibold text-white">&gt; Blockquote</span>
                <p className="text-[11px] text-[#777]">Creates indented callouts and citations.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
