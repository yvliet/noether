import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTasksSettings } from './tasksSettings';
import {
  CheckmarkSquare02Icon,
  File01Icon,
  Search01Icon,
  RotateCcwIcon,
  CheckmarkCircle02Icon,
} from '@/components/common/Icons';
import { PageSubHeader } from '@/components/layout/PageSubHeader';

export const TasksView: React.FC = React.memo(() => {
  const openTab = useWorkspaceStore((s) => s.openTab);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const globalTasks = useDocumentStore((s) => s.globalTasks);
  const refreshGlobalTasks = useDocumentStore((s) => s.refreshGlobalTasks);
  const toggleGlobalTask = useDocumentStore((s) => s.toggleGlobalTask);
  const setActiveDocumentById = useDocumentStore((s) => s.setActiveDocumentById);
  const documents = useDocumentStore((s) => s.documents);

  const { showCompletedTasks, sortBy, strikethroughCompleted } = useTasksSettings();

  const inlineTitle = useSettingsStore((s) => s.inlineTitle);
  const readableLineLength = useSettingsStore((s) => s.readableLineLength);
  const quickFontSize = useSettingsStore((s) => s.quickFontSize);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);

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
    showToast(currentCompleted ? 'Marked task as pending' : 'Completed task! 🎉', 'success');
  }, [toggleGlobalTask, showToast]);

  const handleOpenDoc = useCallback((docId: string) => {
    const doc = documents.find((d) => d.id === docId);
    const title = doc?.title || 'Untitled';
    openTab(docId, title);
    setActiveDocumentById(docId);
  }, [documents, openTab, setActiveDocumentById]);

  const totalCount = useMemo(() => globalTasks.length, [globalTasks]);
  const completedCount = useMemo(() => globalTasks.filter((t) => t.completed).length, [globalTasks]);
  const pendingCount = useMemo(() => totalCount - completedCount, [totalCount, completedCount]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#181818] select-none">
      {/* 1. Modular Sub-Header */}
      <PageSubHeader
        title="Tasks"
        icon={<CheckmarkSquare02Icon size={13} />}
        document={null}
        customRightActions={
          <button
            type="button"
            onClick={handleManualRefresh}
            title="Refresh tasks"
            className={`p-1 rounded hover:bg-[#222] text-[#777] hover:text-[#dcddde] transition-colors cursor-pointer ${
              isRefreshing ? 'animate-spin text-white' : ''
            }`}
          >
            <RotateCcwIcon size={14} />
          </button>
        }
      />

      {/* 2. Scrollable Body Laid Out Like a Standard Note */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div
          className={`mx-auto pt-4 pb-12 flex flex-col ${
            readableLineLength ? 'max-w-3xl px-10' : 'w-full px-12 max-w-none'
          }`}
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#242424]">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-[#1a1a1a] p-0.5 rounded-[5px] border border-[#262626] text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-[4px] transition-all font-medium cursor-pointer ${
                  filter === 'all'
                    ? 'bg-[#2a2a2a] text-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] border border-[#383838]'
                    : 'border border-transparent text-[#888] hover:text-[#dcddde]'
                }`}
              >
                All <span className="opacity-60 ml-0.5 text-[11px]">{totalCount}</span>
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-2.5 py-1 rounded-[4px] transition-all font-medium cursor-pointer ${
                  filter === 'pending'
                    ? 'bg-[#2a2a2a] text-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] border border-[#383838]'
                    : 'border border-transparent text-[#888] hover:text-[#dcddde]'
                }`}
              >
                Pending <span className="opacity-60 ml-0.5 text-[11px]">{pendingCount}</span>
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-2.5 py-1 rounded-[4px] transition-all font-medium cursor-pointer ${
                  filter === 'completed'
                    ? 'bg-[#2a2a2a] text-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] border border-[#383838]'
                    : 'border border-transparent text-[#888] hover:text-[#dcddde]'
                }`}
              >
                Completed <span className="opacity-60 ml-0.5 text-[11px]">{completedCount}</span>
              </button>
            </div>

            {/* Note-styled Search Input */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#262626] text-xs text-[#dcddde] w-full sm:w-64 focus-within:border-[#3e3e3e] transition-colors">
              <Search01Icon size={14} className="text-[#666] shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks or notes..."
                className="bg-transparent outline-none text-xs text-white placeholder-[#555] w-full font-sans selection:bg-[#505560] selection:text-white"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-[#666] hover:text-[#bbb] text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Task Items List Laid Out in Note Prose Flow */}
          <div className="flex flex-col gap-1.5 flex-1">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-20 text-[#666] text-xs flex flex-col items-center select-none">
                <CheckmarkSquare02Icon size={36} className="opacity-25 mb-3 text-[#888]" />
                <p className="text-sm text-[#888] font-medium font-sans">
                  {search ? 'No tasks match your search' : filter === 'completed' ? 'No completed tasks yet' : 'No tasks found'}
                </p>
                <p className="text-[11px] text-[#555] mt-1.5 font-sans">
                  Insert checklists into your notes with <code className="text-[#888] bg-[#222] px-1.5 py-0.5 rounded">/task</code> or <code className="text-[#888] bg-[#222] px-1.5 py-0.5 rounded">- [ ]</code>
                </p>
              </div>
            ) : (
              filteredTasks.map((t) => (
                <div
                  key={t.id}
                  className="group flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-[#1f1f1f]/80 transition-colors border border-transparent hover:border-[#282828]"
                >
                  {/* Task Checkbox */}
                  <div className="flex items-center justify-center h-[21px] shrink-0">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => handleToggle(t.document_id, t.text, t.completed)}
                      className="w-4 h-4 rounded cursor-pointer accent-[#e5e7eb] m-0"
                    />
                  </div>

                  {/* Task Content and Backlink Badge */}
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
                    <span
                      className={`text-[13px] leading-relaxed select-text font-sans ${
                        t.completed
                          ? `${strikethroughCompleted ? 'line-through' : ''} text-[#666]`
                          : 'text-[#e5e7eb]'
                      }`}
                    >
                      {t.text}
                    </span>

                    {/* Note Backlink Chip (Wikilink Style) */}
                    <button
                      onClick={() => handleOpenDoc(t.document_id)}
                      title={`Open note: ${t.document_title}`}
                      className="inline-flex items-center gap-1 text-[11px] text-[#888] hover:text-[#e5e7eb] bg-[#222]/70 hover:bg-[#2a2a2a] px-2 py-0.5 rounded transition-all shrink-0 cursor-pointer max-w-[200px] border border-[#2a2a2a]"
                    >
                      <File01Icon size={11} className="shrink-0 text-[#777]" />
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
        </div>
      </div>
    </div>
  );
});

