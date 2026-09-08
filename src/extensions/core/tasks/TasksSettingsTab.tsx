import React from 'react';
import { useTasksSettings, DEFAULT_TASKS_SETTINGS, TaskSortBy } from './tasksSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { RotateCcwIcon } from '@/components/common/Icons';
import { CustomSelect } from '@/components/common/CustomSelect';

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
            className="flint-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
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
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0 flex items-center justify-center"
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
          <div className="flex items-center gap-2">
            {sortBy !== DEFAULT_TASKS_SETTINGS.sortBy && (
              <button
                type="button"
                onClick={() => setSortBy(DEFAULT_TASKS_SETTINGS.sortBy)}
                title="Restore default (Document Order)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <CustomSelect<TaskSortBy>
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'document', label: 'Document Order' },
                { value: 'title', label: 'Alphabetical' },
                { value: 'status', label: 'Status' },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
