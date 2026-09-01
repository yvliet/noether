import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PropertyType = 'text' | 'number' | 'checkbox' | 'tags' | 'aliases';

export interface PropertiesSettingsState {
  showInDocument: boolean;
  startFolded: boolean;
  defaultPropertyType: PropertyType;
  sortPropertiesAlphabetically: boolean;
  propertyIcons: Record<string, string>;
  hideEmptyProperties: boolean;

  setShowInDocument: (val: boolean) => void;
  setStartFolded: (val: boolean) => void;
  setDefaultPropertyType: (val: PropertyType) => void;
  setSortPropertiesAlphabetically: (val: boolean) => void;
  setPropertyIcon: (propertyKey: string, iconId: string) => void;
  removePropertyIcon: (propertyKey: string) => void;
  resetPropertyIcons: () => void;
  setHideEmptyProperties: (val: boolean) => void;
  restoreDefaults: () => void;
}

export const DEFAULT_PROPERTIES_SETTINGS = {
  showInDocument: true,
  startFolded: false,
  defaultPropertyType: 'text' as PropertyType,
  sortPropertiesAlphabetically: false,
  propertyIcons: {
    tags: 'tag',
    aliases: 'link',
    description: 'note',
    author: 'user',
    created: 'calendar',
    status: 'check',
    rating: 'star',
    priority: 'flag',
    source: 'external-link',
    category: 'layer',
  } as Record<string, string>,
  hideEmptyProperties: false,
};

export const usePropertiesSettings = create<PropertiesSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_PROPERTIES_SETTINGS,

      setShowInDocument: (showInDocument) => set({ showInDocument }),
      setStartFolded: (startFolded) => {
        set({ startFolded });
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('flint:header-fold-default-changed', { detail: { startFolded } }));
          } catch {}
        }
      },
      setDefaultPropertyType: (defaultPropertyType) => set({ defaultPropertyType }),
      setSortPropertiesAlphabetically: (sortPropertiesAlphabetically) => set({ sortPropertiesAlphabetically }),
      setPropertyIcon: (propertyKey, iconId) =>
        set((state) => ({
          propertyIcons: {
            ...(state.propertyIcons || DEFAULT_PROPERTIES_SETTINGS.propertyIcons),
            [propertyKey.trim().toLowerCase()]: iconId,
          },
        })),
      removePropertyIcon: (propertyKey) =>
        set((state) => {
          const next = { ...(state.propertyIcons || DEFAULT_PROPERTIES_SETTINGS.propertyIcons) };
          delete next[propertyKey.trim().toLowerCase()];
          return { propertyIcons: next };
        }),
      resetPropertyIcons: () =>
        set({
          propertyIcons: { ...DEFAULT_PROPERTIES_SETTINGS.propertyIcons },
        }),
      setHideEmptyProperties: (hideEmptyProperties) => set({ hideEmptyProperties }),

      restoreDefaults: () => {
        set({ ...DEFAULT_PROPERTIES_SETTINGS });
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(
              new CustomEvent('flint:header-fold-default-changed', {
                detail: { startFolded: DEFAULT_PROPERTIES_SETTINGS.startFolded },
              })
            );
          } catch {}
        }
      },
    }),
    {
      name: 'flint_plugin_data_properties',
    }
  )
);
