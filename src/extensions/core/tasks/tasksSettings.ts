import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TaskSortBy = 'document' | 'title' | 'status';

export interface TasksSettingsState {
  autoCompleteSubtasks: boolean;
  showCompletedTasks: boolean;
  sortBy: TaskSortBy;
  strikethroughCompleted: boolean;

  setAutoCompleteSubtasks: (val: boolean) => void;
  setShowCompletedTasks: (val: boolean) => void;
  setSortBy: (val: TaskSortBy) => void;
  setStrikethroughCompleted: (val: boolean) => void;
  restoreDefaults: () => void;
}

export const DEFAULT_TASKS_SETTINGS = {
  autoCompleteSubtasks: false,
  showCompletedTasks: true,
  sortBy: 'document' as TaskSortBy,
  strikethroughCompleted: true,
};

export const useTasksSettings = create<TasksSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_TASKS_SETTINGS,

      setAutoCompleteSubtasks: (autoCompleteSubtasks) => set({ autoCompleteSubtasks }),
      setShowCompletedTasks: (showCompletedTasks) => set({ showCompletedTasks }),
      setSortBy: (sortBy) => set({ sortBy }),
      setStrikethroughCompleted: (strikethroughCompleted) => set({ strikethroughCompleted }),

      restoreDefaults: () => set({ ...DEFAULT_TASKS_SETTINGS }),
    }),
    {
      name: 'flint_plugin_data_tasks',
    }
  )
);
