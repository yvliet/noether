import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TablesSettingsState {
  defaultRows: number;
  defaultCols: number;
  enableColumnResizing: boolean;

  setDefaultRows: (rows: number) => void;
  setDefaultCols: (cols: number) => void;
  setEnableColumnResizing: (val: boolean) => void;
  restoreDefaults: () => void;
}

export const DEFAULT_TABLES_SETTINGS = {
  defaultRows: 3,
  defaultCols: 3,
  enableColumnResizing: true,
};

export const useTablesSettings = create<TablesSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_TABLES_SETTINGS,

      setDefaultRows: (defaultRows) => set({ defaultRows }),
      setDefaultCols: (defaultCols) => set({ defaultCols }),
      setEnableColumnResizing: (enableColumnResizing) => set({ enableColumnResizing }),

      restoreDefaults: () => set({ ...DEFAULT_TABLES_SETTINGS }),
    }),
    {
      name: 'flint_plugin_data_tables',
    }
  )
);
