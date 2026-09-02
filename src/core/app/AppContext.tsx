import React, { createContext, useContext, useSyncExternalStore } from 'react';
import { FlintApp, appInstance } from './FlintApp';
import {
  ActionRailItem,
  RibbonItem,
  CommandItem,
  ViewDefinition,
  SidebarTabDefinition,
  StatusBarItem,
  ExtensionSettingTab,
  PluginSettingTab,
  DocMenuActionDefinition,
  FileTreeActionDefinition,
  EditorPlaceholderHint,
  ContextMenuItemDefinition,
  ContextMenuScope,
  ModalDefinition,
  PropertyTypeDefinition,
  PropertyFilterDefinition,
  PropertyIconDefinition,
  FileTreeSectionDefinition,
  FileTreeItemDecorator,
  TabDecoratorDefinition,
  BreadcrumbProviderDefinition,
} from '../extensions/types';

import { ExtensionListSnapshot, PluginListSnapshot } from '../extensions/ExtensionManager';

const AppContext = createContext<FlintApp | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode; app?: FlintApp }> = ({
  children,
  app,
}) => {
  const value = app || appInstance;
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useFlintApp = (): FlintApp => {
  const ctx = useContext(AppContext);
  if (ctx) return ctx;
  return appInstance;
};

export const useActionRailItems = (): ActionRailItem[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.actionRail.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.actionRail.getItems()
  );
};

export const useRibbonItems = (): RibbonItem[] => {
  return useActionRailItems();
};

export const useCommands = (): CommandItem[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.commands.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.commands.getAllCommands()
  );
};

export const useViews = (): ViewDefinition[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.views.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.views.getAllViews()
  );
};

export const useSidebarTabs = (side?: 'left' | 'right'): SidebarTabDefinition[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.sidebars.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.sidebars.getTabs(side)
  );
};

export const useFileTreeActions = (): FileTreeActionDefinition[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.sidebars.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.sidebars.getFileTreeActions()
  );
};

export const useStatusBarItems = (alignment?: 'left' | 'right'): StatusBarItem[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.statusBar.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.statusBar.getItems(alignment)
  );
};

export const useSettingTabs = (): ExtensionSettingTab[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.settingsRegistry.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.settingsRegistry.getTabs()
  );
};

export const useDocumentHeaders = (): import('../extensions/types').DocumentHeaderDefinition[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.editor.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.editor.getDocumentHeaders()
  );
};

export const useDocumentFooters = (): import('../extensions/types').DocumentFooterDefinition[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.editor.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.editor.getDocumentFooters()
  );
};

export const useDocMenuActions = (): DocMenuActionDefinition[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.editor.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.editor.getDocMenuActions()
  );
};

export const usePlaceholderHints = (): EditorPlaceholderHint[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.editor.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.editor.getPlaceholderHints()
  );
};

export const useExtensionList = (): ExtensionListSnapshot => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.extensions.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.extensions.getSnapshot()
  );
};

export const usePluginList = (): PluginListSnapshot => {
  return useExtensionList();
};

export const useContextMenuItems = (
  scope?: ContextMenuScope,
  data?: any
): ContextMenuItemDefinition[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.contextMenu.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.contextMenu.getItemsForScope(scope, data, app)
  );
};

export const useModals = (): ModalDefinition[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.modals.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.modals.getAllModals()
  );
};

export const usePropertyTypes = (): PropertyTypeDefinition[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.properties.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.properties.getPropertyTypes()
  );
};

export const usePropertyFilters = (): PropertyFilterDefinition[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.properties.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.properties.getPropertyFilters()
  );
};

export const useCustomPropertyIcons = (): PropertyIconDefinition[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.properties.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.properties.getPropertyIcons()
  );
};

export const useFileTreeSections = (): FileTreeSectionDefinition[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.sidebars.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.sidebars.getFileTreeSections()
  );
};

export const useFileTreeDecorators = (): FileTreeItemDecorator[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.sidebars.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.sidebars.getFileTreeDecorators()
  );
};

export const useTabDecorators = (): TabDecoratorDefinition[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      return app.tabDecorators.subscribe(onStoreChange);
    },
    () => app.tabDecorators.getDecorators()
  );
};

export const useBreadcrumbProviders = (): BreadcrumbProviderDefinition[] => {
  const app = useFlintApp();
  return useSyncExternalStore(
    (onStoreChange) => {
      const d = app.editor.subscribe(onStoreChange);
      return () => d.dispose();
    },
    () => app.editor.getBreadcrumbProviders()
  );
};


