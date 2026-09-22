import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useNoetherApp,
  useGlobalTasks,
  useVaultDocuments,
  useNoetherStore,
} from 'noether';
import { useTasksSettings } from './tasksSettings';
import {
  CheckmarkSquare02Icon,
  File01Icon,
  Search01Icon,
  RotateCcwIcon,
  CheckmarkCircle02Icon,
} from '@/components/common/Icons';
import { PageView } from '@/components/layout/PageView';

export const TasksView: React.FC = React.memo(() => {
  const app = useNoetherApp();
  const globalTasks = useGlobalTasks();
  const documents = useVaultDocuments();

  const openTab = useCallback((docId: string, title?: string, opts?: any) => {
    app.workspace.openTab(docId, title, opts);
  }, [app]);
  const refreshGlobalTasks = useCallback(() => {
    return app.vault.refreshGlobalTasks();
  }, [app]);
  const toggleGlobalTask = useCallback((docId: string, taskText: string, completed: boolean) => {
    return app.vault.toggleTask(docId, taskText, completed);
  }, [app]);
  const setActiveDocumentById = useCallback((id: string, _opts?: any) => {
    return app.vault.openDocument(id);
  }, [app]);

  const { showCompletedTasks, sortBy, strikethroughCompleted } = useTasksSettings();

  const inlineTitle = useNoetherStore('settings', (s) => s?.inlineTitle ?? true);
  const readableLineLength = useNoetherStore('settings', (s) => s?.readableLineLength ?? false);
  const quickFontSize = useNoetherStore('settings', (s) => s?.quickFontSize ?? true);
  const fontSize = useNoetherStore('settings', (s) => s?.fontSize ?? 16);
  const setFontSize = useCallback((size: number) => {
    (app.settings as any).setFontSize?.(size);
  }, [app]);

  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshGlobalTasks();
  }, [refreshGlobalTasks]);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshGlobalTasks();
    setTimeout(() => setIsRefreshing(false), 350);
  }, [refreshGlobalTasks]);

  const filteredTasks = useMemo(() => {
    let list = globalTasks.filter((t) => {
      if (filter === 'pending' && t.completed) return false;
      if (filter === 'completed' && !t.completed) return false;
      if (filter === 'all' && !showCompletedTasks && t.completed) return false;
      if (
        search.trim() &&
        !t.text.toLowerCase().includes(search.toLowerCase()) &&
        !t.document_title.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    if (sortBy === 'title') {
      list = [...list].sort((a, b) => a.text.localeCompare(b.text));
    } else if (sortBy === 'status') {
      list = [...list].sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0));
    }

    return list;
  }, [globalTasks, filter, search, showCompletedTasks, sortBy]);

  const handleToggle = useCallback(async (docId: string, taskText: string, currentCompleted: boolean) => {
    await toggleGlobalTask(docId, taskText, !currentCompleted);
  }, [toggleGlobalTask]);

  const handleOpenDoc = useCallback((docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    const title = doc?.title || 'Untitled';
    openTab(docId, title, { replaceCurrentTab: true });
    setActiveDocumentById(docId, { preserveViewMode: true });
  }, [documents, openTab, setActiveDocumentById]);

  const totalCount = useMemo(() => globalTasks.length, [globalTasks]);
  const completedCount = useMemo(() => globalTasks.filter((t) => t.completed).length, [globalTasks]);
  const pendingCount = useMemo(() => totalCount - completedCount, [totalCount, completedCount]);

  return (
    <PageView
      title="Tasks"
      icon={<CheckmarkSquare02Icon size={13} />}
      customRightActions={
        <button
          type="button"
          onClick={handleManualRefresh}
          title="Refresh tasks"
          className={`noether-toolbar-btn ${
            isRefreshing ? 'animate-spin !text-white' : ''
          }`}
        >
          <RotateCcwIcon size={14} />
        </button>
      }
    >
          {/* Note Title Header (Identical to Note H1 Title) */}
          {inlineTitle && (
            <div className="mb-4">
              <h1 className="w-full text-3xl font-bold text-[#e5e7eb] pb-2 font-sans tracking-tight flex items-center gap-3">
                <span>Tasks</span>
              </h1>
            </div>
          )}

          {/* Sub-header Controls: Counts, Filters, and Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[var(--noether-border-base)]">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[var(--noether-bg-card)] p-0.5 rounded-[5px] border border-[var(--noether-border-base)] text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-[4px] font-normal cursor-pointer ${
                  filter === 'all'
                    ? 'bg-[var(--noether-bg-input)] text-[var(--noether-text-primary)] border border-[var(--noether-border-strong)]'
                    : 'border border-transparent text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-btn-hover-bg)]'
                }`}
              >
                All <span className="opacity-60 ml-0.5 text-[11px]">{totalCount}</span>
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-2.5 py-1 rounded-[4px] font-normal cursor-pointer ${
                  filter === 'pending'
                    ? 'bg-[var(--noether-bg-input)] text-[var(--noether-text-primary)] border border-[var(--noether-border-strong)]'
                    : 'border border-transparent text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-btn-hover-bg)]'
                }`}
              >
                Pending <span className="opacity-60 ml-0.5 text-[11px]">{pendingCount}</span>
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-2.5 py-1 rounded-[4px] font-normal cursor-pointer ${
                  filter === 'completed'
                    ? 'bg-[var(--noether-bg-input)] text-[var(--noether-text-primary)] border border-[var(--noether-border-strong)]'
                    : 'border border-transparent text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-btn-hover-bg)]'
                }`}
              >
                Completed <span className="opacity-60 ml-0.5 text-[11px]">{completedCount}</span>
              </button>
            </div>

            {/* Note-styled Search Input */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--noether-bg-input)] border border-[var(--noether-border-base)] text-xs text-[var(--noether-text-primary)] w-full sm:w-64 focus-within:border-[var(--noether-border-strong)]">
              <Search01Icon size={14} className="text-[var(--noether-text-muted)] shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks or notes..."
                className="bg-transparent outline-none text-xs text-[var(--noether-text-primary)] placeholder-[var(--noether-text-faint)] w-full font-sans selection:bg-[var(--noether-accent)] selection:text-white"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Task Items List Laid Out in Note Prose Flow */}
          <div className="flex flex-col gap-1.5 flex-1">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-20 text-[var(--noether-text-muted)] text-xs flex flex-col items-center select-none">
                <CheckmarkSquare02Icon size={36} className="opacity-25 mb-3 text-[var(--noether-text-muted)]" />
                <p className="text-sm text-[var(--noether-text-primary)] font-normal font-sans">
                  {search ? 'No tasks match your search' : filter === 'completed' ? 'No completed tasks yet' : 'No tasks found'}
                </p>
                <p className="text-[11px] text-[var(--noether-text-muted)] mt-1.5 font-sans">
                  Insert checklists into your notes with <code className="text-[var(--noether-text-primary)] bg-[var(--noether-bg-card)] px-1.5 py-0.5 rounded">/task</code> or <code className="text-[var(--noether-text-primary)] bg-[var(--noether-bg-card)] px-1.5 py-0.5 rounded">- [ ]</code>
                </p>
              </div>
            ) : (
              filteredTasks.map((t) => (
                <div
                  key={t.id}
                  className="group flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-[var(--noether-btn-hover-bg)]"
                >
                  {/* Task Checkbox */}
                  <div className="flex items-center justify-center h-[21px] shrink-0">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => handleToggle(t.document_id, t.text, t.completed)}
                      className="w-4 h-4 rounded cursor-pointer accent-[var(--noether-accent)] m-0"
                    />
                  </div>

                  {/* Task Content and Backlink Badge */}
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
                    <span
                      className={`text-[13px] leading-relaxed select-text font-sans ${
                        t.completed
                          ? `${strikethroughCompleted ? 'line-through' : ''} text-[var(--noether-text-muted)]`
                          : 'text-[var(--noether-text-primary)]'
                      }`}
                    >
                      {t.text}
                    </span>

                    {/* Note Backlink Chip (Wikilink Style) */}
                    <button
                      onClick={() => handleOpenDoc(t.document_id)}
                      title={`Open note: ${t.document_title}`}
                      className="inline-flex items-center gap-1 text-[11px] text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] bg-[var(--noether-bg-card)] hover:bg-[var(--noether-btn-hover-bg)] px-2 py-0.5 rounded shrink-0 cursor-pointer max-w-[200px] border border-[var(--noether-border-base)]"
                    >
                      <File01Icon size={11} className="shrink-0 text-[var(--noether-text-muted)]" />
                      <span className="truncate">{t.document_title}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Summary / Quick Status */}
          {filteredTasks.length > 0 && (
            <div className="mt-8 pt-4 border-t border-[#222] flex items-center justify-between text-[11px] text-[#555]">
              <span>
                Showing {filteredTasks.length} of {totalCount} tasks
              </span>
              <div className="flex items-center gap-2">
                <CheckmarkCircle02Icon size={12} className="text-[#555]" />
                <span>{completedCount} completed</span>
              </div>
            </div>
          )}
    </PageView>
  );
});

