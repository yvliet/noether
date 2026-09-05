import { FlintApp } from '@/core/app/FlintApp';
import { GraphExtension, GRAPH_MANIFEST } from './graph/GraphExtension';
import { CanvasExtension, CANVAS_MANIFEST } from './canvas/CanvasExtension';
import { FsrsExtension, FSRS_MANIFEST } from './fsrs/FsrsExtension';
import { TasksExtension, TASKS_MANIFEST } from './tasks/TasksExtension';
import { JournalExtension, JOURNAL_MANIFEST } from './journal/JournalExtension';
import { BacklinksExtension, BACKLINKS_MANIFEST } from './backlinks/BacklinksExtension';
import { TagsExtension, TAGS_MANIFEST } from './tags/TagsExtension';
import { OutlineExtension, OUTLINE_MANIFEST } from './outline/OutlineExtension';
import { PropertiesExtension, PROPERTIES_MANIFEST } from './properties/PropertiesExtension';
import { QuicknoteExtension, QUICKNOTE_MANIFEST } from './quicknote/QuicknoteExtension';
import { TablesExtension, TABLES_MANIFEST } from './tables/TablesExtension';
import { BookmarksExtension, BOOKMARKS_MANIFEST } from './bookmarks/BookmarksExtension';
import { MarketplaceExtension, MARKETPLACE_MANIFEST } from './marketplace/MarketplaceExtension';
import { CascadeExtension, CASCADE_MANIFEST } from './cascade/CascadeExtension';
import { IconifyExtension, ICONIFY_MANIFEST } from './iconify/IconifyExtension';
import { CopilotExtension, COPILOT_MANIFEST } from './copilot/CopilotExtension';
import { DefaultCommandsExtension, DEFAULT_COMMANDS_MANIFEST } from './defaults/DefaultCommandsExtension';
import { DefaultStatusBarExtension, DEFAULT_STATUS_BAR_MANIFEST } from './defaults/DefaultStatusBarExtension';

export function registerAllCoreExtensions(app: FlintApp): void {
  app.extensions.registerExtension(DEFAULT_COMMANDS_MANIFEST, DefaultCommandsExtension);
  app.extensions.registerExtension(DEFAULT_STATUS_BAR_MANIFEST, DefaultStatusBarExtension);
  app.extensions.registerExtension(BOOKMARKS_MANIFEST, BookmarksExtension);
  app.extensions.registerExtension(MARKETPLACE_MANIFEST, MarketplaceExtension);
  app.extensions.registerExtension(TABLES_MANIFEST, TablesExtension);
  app.extensions.registerExtension(GRAPH_MANIFEST, GraphExtension);
  app.extensions.registerExtension(CANVAS_MANIFEST, CanvasExtension);
  app.extensions.registerExtension(TASKS_MANIFEST, TasksExtension);
  app.extensions.registerExtension(JOURNAL_MANIFEST, JournalExtension);
  app.extensions.registerExtension(BACKLINKS_MANIFEST, BacklinksExtension);
  app.extensions.registerExtension(TAGS_MANIFEST, TagsExtension);
  app.extensions.registerExtension(OUTLINE_MANIFEST, OutlineExtension);
  app.extensions.registerExtension(PROPERTIES_MANIFEST, PropertiesExtension);
  app.extensions.registerExtension(ICONIFY_MANIFEST, IconifyExtension);

  // Bundled community extensions (isCore: false)
  app.extensions.registerExtension(CASCADE_MANIFEST, CascadeExtension);
  app.extensions.registerExtension(COPILOT_MANIFEST, CopilotExtension);
  app.extensions.registerExtension(QUICKNOTE_MANIFEST, QuicknoteExtension);
  app.extensions.registerExtension(FSRS_MANIFEST, FsrsExtension);
}

// Backwards-compat alias
export const registerAllCorePlugins = registerAllCoreExtensions;
