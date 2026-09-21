import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useNoetherApp,
  useActiveDocument,
  useVaultDocuments,
} from 'noether';
import {
  HistoryIcon,
  PlusSignIcon,
  Search01Icon,
  RotateCcwIcon,
  ArrowLeft01Icon,
  Copy01Icon,
  CheckIcon,
  ExternalLinkIcon,
  ChevronRightIcon,
} from '@/components/common/Icons';
import { getDocumentPath } from '@/lib/db/documents';
import { parseGitDiff, computeLineDiff, formatRelativeTime, DiffLine } from './diffUtils';
import { useHistorySettings } from './historySettings';
import { SidebarActionHeader, SidebarActionButton } from '@/components/common/SidebarActionHeader';

interface RevisionItem {
  hash: string;
  shortHash: string;
  author: string;
  timestamp: number;
  message: string;
}

export const HistoryView: React.FC = React.memo(() => {
  const app = useNoetherApp();
  const activeDocument = useActiveDocument();
  const documents = useVaultDocuments();
  const { maxHistoryItems } = useHistorySettings();

  const [gitStatus, setGitStatus] = useState<{
    installed: boolean;
    initialized: boolean;
    loading: boolean;
  }>({ installed: true, initialized: true, loading: true });

  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<RevisionItem | null>(null);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);
  const [historicalContent, setHistoricalContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<'diff' | 'draft'>('diff');

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // 1. Check Git environment status
  const checkStatus = useCallback(async () => {
    try {
      const res = await app.vcs.checkStatus();
      setGitStatus({
        installed: res.installed ?? false,
        initialized: res.initialized ?? false,
        loading: false,
      });
      return res;
    } catch {
      setGitStatus({ installed: false, initialized: false, loading: false });
      return { installed: false, initialized: false };
    }
  }, [app]);

  // 2. Resolve relative path for active document
  const activeRelativePath = useMemo(() => {
    if (!activeDocument) return null;
    const path = getDocumentPath(activeDocument, documents);
    if (!path) return `${activeDocument.title}.md`;
    return path.endsWith('.md') ? path : `${path}.md`;
  }, [activeDocument, documents]);

  // 3. Load revision history for active note
  const loadHistory = useCallback(async () => {
    if (!activeRelativePath) {
      setRevisions([]);
      return;
    }

    setIsLoadingHistory(true);
    try {
      const status = await checkStatus();
      if (!status.installed || !status.initialized) {
        setIsLoadingHistory(false);
        return;
      }

      const res = await app.vcs.getFileHistory(activeRelativePath, maxHistoryItems);
      if (res.success && res.revisions) {
        setRevisions(res.revisions);
      } else {
        setRevisions([]);
      }
    } catch (err) {
      console.warn('[Version History] Error loading file history:', err);
      setRevisions([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [activeRelativePath, checkStatus, app, maxHistoryItems]);

  useEffect(() => {
    loadHistory();
    setSelectedRevision(null);
    setDiffLines([]);
    setHistoricalContent('');
  }, [activeDocument?.id, loadHistory]);

  // 4. Inspect specific historical revision
  const handleSelectRevision = useCallback(
    async (rev: RevisionItem) => {
      if (!activeRelativePath) return;
      setSelectedRevision(rev);

      try {
        // Fetch raw historical content
        const contentRes = await app.vcs.getHistoricalContent(activeRelativePath, rev.hash);
        const rawContent = contentRes.content || '';
        setHistoricalContent(rawContent);

        // Fetch diff text
        const diffRes = await app.vcs.getFileDiff(activeRelativePath, rev.hash);
        if (diffRes.success && diffRes.diff) {
          const parsed = parseGitDiff(diffRes.diff);
          setDiffLines(parsed);
        } else {
          // Fallback to local line diff between historical content and active buffer
          const currentContent = activeDocument?.content_json || '';
          const computed = computeLineDiff(rawContent, currentContent);
          setDiffLines(computed);
        }
      } catch (err) {
        console.warn('[Version History] Error inspecting revision:', err);
      }
    },
    [activeRelativePath, activeDocument, app]
  );

  // 5. Take manual snapshot
  const handleTakeSnapshot = useCallback(async () => {
    if (!activeRelativePath || isTakingSnapshot) return;
    setIsTakingSnapshot(true);
    try {
      const res = await app.vcs.createSnapshot(
        activeRelativePath,
        `Snapshot: ${activeDocument?.title || 'Note'}`
      );
      if (res.success) {
        app.workspace.showToast('Created version snapshot', 'success');
        await loadHistory();
      } else {
        app.workspace.showToast(res.error || 'Failed to create snapshot', 'warning');
      }
    } catch (err: any) {
      app.workspace.showToast(err?.message || 'Error creating snapshot', 'warning');
    } finally {
      setIsTakingSnapshot(false);
    }
  }, [activeRelativePath, isTakingSnapshot, activeDocument, app, loadHistory]);

  // 6. Initialize Git in vault
  const handleInitVault = useCallback(async () => {
    try {
      const res = await app.vcs.initVault();
      if (res.success) {
        app.workspace.showToast('Version History enabled for this vault', 'success');
        await checkStatus();
        await handleTakeSnapshot();
      } else {
        app.workspace.showToast(res.error || 'Failed to initialize Git', 'warning');
      }
    } catch (err: any) {
      app.workspace.showToast(err?.message || 'Error initializing Git', 'warning');
    }
  }, [app, checkStatus, handleTakeSnapshot]);

  // 7. Restore selected historical draft
  const handleRestoreDraft = useCallback(async () => {
    if (!activeDocument || !selectedRevision || !historicalContent || isRestoring) return;

    setIsRestoring(true);
    try {
      // 1. Take a safety snapshot of current draft first so nothing is ever lost
      if (activeRelativePath) {
        await app.vcs.createSnapshot(activeRelativePath, `Before restoring to ${selectedRevision.shortHash}`);
      }

      // 2. Overwrite active document with historical content
      await app.vault.saveDocument(activeDocument.id, historicalContent);

      app.workspace.showToast(
        `Restored note to draft from ${formatRelativeTime(selectedRevision.timestamp)}`,
        'success'
      );
      setSelectedRevision(null);
      await loadHistory();
    } catch (err: any) {
      app.workspace.showToast(err?.message || 'Failed to restore draft', 'warning');
    } finally {
      setIsRestoring(false);
    }
  }, [activeDocument, selectedRevision, historicalContent, isRestoring, activeRelativePath, app, loadHistory]);

  // 8. Copy historical content
  const handleCopyText = useCallback(() => {
    if (!historicalContent) return;
    navigator.clipboard.writeText(historicalContent);
    setHasCopied(true);
    app.workspace.showToast('Copied historical draft to clipboard', 'info');
    setTimeout(() => setHasCopied(false), 1500);
  }, [historicalContent, app]);

  // Filtered revisions
  const filteredRevisions = useMemo(() => {
    if (!searchQuery.trim()) return revisions;
    const q = searchQuery.toLowerCase();
    return revisions.filter(
      (r) =>
        r.message.toLowerCase().includes(q) ||
        r.shortHash.toLowerCase().includes(q) ||
        formatRelativeTime(r.timestamp).toLowerCase().includes(q)
    );
  }, [revisions, searchQuery]);

  // Empty state: no active note
  if (!activeDocument) {
    return (
      <div className="text-center py-12 text-[#555] text-[13px] select-none">
        No document open.
      </div>
    );
  }

  // Not Installed state
  if (!gitStatus.loading && !gitStatus.installed) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center select-none text-xs gap-2 text-[#666]">
        <HistoryIcon size={36} className="opacity-40 mb-1" />
        <span className="text-[13px] text-[#888] font-normal">Git Required</span>
        <p className="text-xs text-[#666] leading-relaxed max-w-[240px]">
          Version History uses standard local Git to store revisions directly inside your vault.
        </p>
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.open('https://git-scm.com/downloads', '_blank');
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--noether-bg-surface)] hover:bg-[#252525] border border-[var(--noether-border-base)] text-[#ccc] hover:text-white mt-1 cursor-pointer"
        >
          <span>Download Git</span>
          <ExternalLinkIcon size={12} />
        </button>
      </div>
    );
  }

  // Not Initialized state
  if (!gitStatus.loading && !gitStatus.initialized) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center select-none text-xs gap-2 text-[#666]">
        <HistoryIcon size={36} className="opacity-40 mb-1" />
        <span className="text-[13px] text-[#888] font-normal">Enable Version History</span>
        <p className="text-xs text-[#666] leading-relaxed max-w-[240px]">
          Track edits, compare drafts side-by-side, and restore revisions with instant local snapshots.
        </p>
        <button
          onClick={handleInitVault}
          className="noether-btn noether-btn-primary mt-1 cursor-pointer"
        >
          Enable History
        </button>
      </div>
    );
  }

  // Detail / Diff Inspection View
  if (selectedRevision) {
    return (
      <div className="flex flex-col h-full select-none text-xs">
        {/* Detail Action Header */}
        <div className="h-9 px-2 flex items-center justify-between border-b border-[var(--noether-border-base)] shrink-0">
          <button
            onClick={() => setSelectedRevision(null)}
            title="Back to timeline"
            className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-[#202020] text-[#888] hover:text-[#dcddde]"
          >
            <ArrowLeft01Icon size={13} />
            <span className="text-[11px]">Timeline</span>
          </button>

          <div className="flex items-center gap-1 bg-[#181818] p-0.5 rounded border border-[var(--noether-border-base)]">
            <button
              onClick={() => setViewMode('diff')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                viewMode === 'diff'
                  ? 'bg-[#2a2a2a] text-white shadow-xs'
                  : 'text-[#777] hover:text-[#aaa]'
              }`}
            >
              Diff
            </button>
            <button
              onClick={() => setViewMode('draft')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                viewMode === 'draft'
                  ? 'bg-[#2a2a2a] text-white shadow-xs'
                  : 'text-[#777] hover:text-[#aaa]'
              }`}
            >
              Draft
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyText}
              title="Copy historical draft"
              className="p-1.5 rounded hover:bg-[#202020] text-[#888] hover:text-[#dcddde]"
            >
              {hasCopied ? <CheckIcon size={13} className="text-emerald-400" /> : <Copy01Icon size={13} />}
            </button>
          </div>
        </div>

        {/* Revision Metadata Sub-header */}
        <div className="px-3 py-2 bg-[var(--noether-bg-surface)] border-b border-[var(--noether-border-base)] flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-[#e0e0e0] truncate text-[12px]">
              {selectedRevision.message}
            </span>
            <div className="flex items-center gap-2 text-[10px] text-[#777] mt-0.5">
              <span>{formatRelativeTime(selectedRevision.timestamp)}</span>
              <span>•</span>
              <span className="text-[#666]">{selectedRevision.shortHash}</span>
            </div>
          </div>

          <button
            onClick={handleRestoreDraft}
            disabled={isRestoring}
            className="px-2.5 py-1 rounded bg-[var(--noether-accent)] hover:opacity-90 text-white text-[11px] font-medium shrink-0 disabled:opacity-50"
          >
            {isRestoring ? 'Restoring...' : 'Restore draft'}
          </button>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed p-2 bg-[#121212]">
          {viewMode === 'diff' ? (
            diffLines.length === 0 ? (
              <div className="text-center py-8 text-[#555] font-sans">
                No text changes between this revision and current draft.
              </div>
            ) : (
              <div className="flex flex-col">
                {diffLines.map((line, idx) => {
                  if (line.type === 'add') {
                    return (
                      <div key={idx} className="flex gap-2 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-300">
                        <span className="w-5 select-none text-emerald-600 text-right shrink-0">
                          {line.newLineNumber ?? '+'}
                        </span>
                        <span className="select-none text-emerald-500 shrink-0">+</span>
                        <span className="break-all whitespace-pre-wrap flex-1">{line.content}</span>
                      </div>
                    );
                  }
                  if (line.type === 'remove') {
                    return (
                      <div key={idx} className="flex gap-2 px-1.5 py-0.5 bg-rose-500/10 text-rose-300">
                        <span className="w-5 select-none text-rose-600 text-right shrink-0">
                          {line.oldLineNumber ?? '-'}
                        </span>
                        <span className="select-none text-rose-500 shrink-0">-</span>
                        <span className="break-all whitespace-pre-wrap flex-1">{line.content}</span>
                      </div>
                    );
                  }
                  if (line.type === 'header') {
                    return (
                      <div key={idx} className="px-1.5 py-1 text-[10px] text-[#555] bg-[#1a1a1a] select-none my-1">
                        {line.content}
                      </div>
                    );
                  }
                  return (
                    <div key={idx} className="flex gap-2 px-1.5 py-0.5 text-[#888]">
                      <span className="w-5 select-none text-[#444] text-right shrink-0">
                        {line.newLineNumber ?? line.oldLineNumber ?? ''}
                      </span>
                      <span className="select-none text-transparent shrink-0"> </span>
                      <span className="break-all whitespace-pre-wrap flex-1">{line.content}</span>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <pre className="whitespace-pre-wrap break-all text-[#bbb] font-sans text-xs leading-relaxed p-1">
              {historicalContent || '(Empty document)'}
            </pre>
          )}
        </div>
      </div>
    );
  }

  // Standard Timeline View
  return (
    <div className="flex flex-col h-full select-none text-xs">
      {/* Top Action Header (Matching BacklinksView & OutlineView) */}
      <SidebarActionHeader borderBottom>
        <SidebarActionButton
          onClick={handleTakeSnapshot}
          disabled={isTakingSnapshot}
          title="Take snapshot now"
          icon={<PlusSignIcon size={16} />}
        />

        <SidebarActionButton
          onClick={() => {
            setIsSearchOpen(!isSearchOpen);
            if (isSearchOpen) setSearchQuery('');
          }}
          isActive={isSearchOpen}
          title={isSearchOpen ? 'Close search' : 'Filter revisions'}
          icon={<Search01Icon size={16} />}
        />

        <SidebarActionButton
          onClick={loadHistory}
          disabled={isLoadingHistory}
          title="Refresh history"
          icon={<RotateCcwIcon size={16} className={isLoadingHistory ? 'animate-spin' : ''} />}
        />
      </SidebarActionHeader>

      {/* Search Input Bar */}
      {isSearchOpen && (
        <div className="px-2.5 py-1.5 border-b border-[var(--noether-border-base)]">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[var(--noether-bg-input)] border border-[var(--noether-border-base)] text-xs text-[var(--noether-text-secondary)]">
            <Search01Icon size={13} className="text-[var(--noether-text-muted)] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter drafts..."
              autoFocus
              className="bg-transparent outline-none flex-1 text-xs text-[var(--noether-text-secondary)] placeholder-[var(--noether-text-faint)]"
            />
          </div>
        </div>
      )}

      {/* Sub-header Note Context */}
      <div className="px-3 py-2 flex items-center justify-between text-[11px] text-[#888] border-b border-[var(--noether-border-base)] bg-[var(--noether-bg-surface)]">
        <span className="truncate max-w-[180px] font-medium text-[#ccc]">
          {activeDocument.title || 'Untitled'}
        </span>
        <span className="text-[11px] text-[#777]">
          {filteredRevisions.length} {filteredRevisions.length === 1 ? 'draft' : 'drafts'}
        </span>
      </div>

      {/* Timeline List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar flex flex-col gap-1.5">
        {isLoadingHistory && revisions.length === 0 ? (
          <div className="text-center py-10 text-[#555] text-[12px]">
            Reading version history...
          </div>
        ) : filteredRevisions.length === 0 ? (
          <div className="text-center py-10 text-[#555] text-[12px] flex flex-col items-center gap-2">
            <span>No previous drafts recorded.</span>
            <button
              onClick={handleTakeSnapshot}
              className="text-[11px] text-[var(--noether-accent)] hover:underline"
            >
              Take first snapshot
            </button>
          </div>
        ) : (
          filteredRevisions.map((rev) => (
            <div
              key={rev.hash}
              onClick={() => handleSelectRevision(rev)}
              className="group flex items-center justify-between p-2 rounded-md hover:bg-[#1a1a1a] cursor-pointer border border-transparent hover:border-[var(--noether-border-base)]"
            >
              <div className="flex flex-col min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-[#ccc] group-hover:text-white text-[12px] truncate">
                    {rev.message}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#777]">
                  <span>{formatRelativeTime(rev.timestamp)}</span>
                  <span>•</span>
                  <span className="text-[#666]">{rev.shortHash}</span>
                </div>
              </div>

              <ChevronRightIcon
                size={13}
                className="text-[#555] group-hover:text-[#aaa] shrink-0"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
});
