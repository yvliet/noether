import { NoetherApp } from '@/core/app/NoetherApp';
import { GraphExtension, GRAPH_MANIFEST } from './graph/GraphExtension';
import { CanvasExtension, CANVAS_MANIFEST } from './canvas/CanvasExtension';
import { TasksExtension, TASKS_MANIFEST } from './tasks/TasksExtension';
import { JournalExtension, JOURNAL_MANIFEST } from './journal/JournalExtension';
import { BacklinksExtension, BACKLINKS_MANIFEST } from './backlinks/BacklinksExtension';
import { TagsExtension, TAGS_MANIFEST } from './tags/TagsExtension';
import { OutlineExtension, OUTLINE_MANIFEST } from './outline/OutlineExtension';
import { PropertiesExtension, PROPERTIES_MANIFEST } from './properties/PropertiesExtension';
import { TablesExtension, TABLES_MANIFEST } from './tables/TablesExtension';
import { BookmarksExtension, BOOKMARKS_MANIFEST } from './bookmarks/BookmarksExtension';
import { MarketplaceExtension, MARKETPLACE_MANIFEST } from './marketplace/MarketplaceExtension';
import { MoreIconsExtension, MORE_ICONS_MANIFEST } from './more-icons/MoreIconsExtension';
import { SketchExtension, SKETCH_MANIFEST } from './sketch/SketchExtension';
import { DefaultCommandsExtension, DEFAULT_COMMANDS_MANIFEST } from './defaults/DefaultCommandsExtension';
import { SyncExtension, SYNC_MANIFEST } from './sync/SyncExtension';

export function registerAllCoreExtensions(app: NoetherApp): void {
  app.extensions.registerExtension(DEFAULT_COMMANDS_MANIFEST, DefaultCommandsExtension);
  app.extensions.registerExtension(SYNC_MANIFEST, SyncExtension);
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
  app.extensions.registerExtension(MORE_ICONS_MANIFEST, MoreIconsExtension);
  app.extensions.registerExtension(SKETCH_MANIFEST, SketchExtension);
}
