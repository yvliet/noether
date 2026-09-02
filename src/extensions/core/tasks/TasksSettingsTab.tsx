import React from 'react';
import { useTasksSettings, DEFAULT_TASKS_SETTINGS, TaskSortBy } from './tasksSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { RotateCcwIcon } from '@/components/common/Icons';

export const TasksSettingsTab: React.FC = () => {
  const {
    autoCompleteSubtasks,
    setAutoCompleteSubtasks,
    showCompletedTasks,
    setShowCompletedTasks,
    sortBy,
    setSortBy,
    strikethroughCompleted,
    setStrikethroughCompleted,
    restoreDefaults,
  } = useTasksSettings();

  const { showToast } = useWorkspaceStore();

  const isModified =
    autoCompleteSubtasks !== DEFAULT_TASKS_SETTINGS.autoCompleteSubtasks ||
    showCompletedTasks !== DEFAULT_TASKS_SETTINGS.showCompletedTasks ||
    sortBy !== DEFAULT_TASKS_SETTINGS.sortBy ||
    strikethroughCompleted !== DEFAULT_TASKS_SETTINGS.strikethroughCompleted;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Tasks</h3>
          <p className="text-[11px] text-[#777]">Configure task aggregation, completion behavior, and presentation.</p>
        </div>
        {isModified && (
          <button
            onClick={() => {
              restoreDefaults();
              showToast('Restored Tasks defaults', 'info');
            }}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Auto-complete subtasks */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Auto-complete subtasks</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Automatically mark parent task as complete when all nested subtasks are checked.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {autoCompleteSubtasks !== DEFAULT_TASKS_SETTINGS.autoCompleteSubtasks && (
              <button
                type="button"
                onClick={() => setAutoCompleteSubtasks(DEFAULT_TASKS_SETTINGS.autoCompleteSubtasks)}
                title="Restore default (Disabled)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <ToggleSwitch checked={autoCompleteSubtasks} onChange={setAutoCompleteSubtasks} />
          </div>
        </div>

        {/* Show completed tasks */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show completed tasks</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Display finished checkboxes in the global tasks panel.
            </span>
          </div>
          <ToggleSwitch checked={showCompletedTasks} onChange={setShowCompletedTasks} />
        </div>

        {/* Strikethrough completed */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Strikethrough completed text</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Render a line through completed task labels.
            </span>
          </div>
          <ToggleSwitch checked={strikethroughCompleted} onChange={setStrikethroughCompleted} />
        </div>

        {/* Sort tasks by */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Sort tasks by</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Order tasks by their containing document order, alphabetical text, or completion status.
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {([
              { key: 'document', label: 'Document Order' },
              { key: 'title', label: 'Alphabetical' },
              { key: 'status', label: 'Status' },
            ] as { key: TaskSortBy; label: string }[]).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setSortBy(opt.key)}
                className={`px-3 py-1 text-xs rounded-[5px] border transition-all cursor-pointer ${
                  sortBy === opt.key
                    ? 'bg-[var(--flint-accent)] border-transparent text-white font-medium shadow-xs'
                    : 'bg-[#181818] border-[#333] text-[#888] hover:text-white hover:border-[#444]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
