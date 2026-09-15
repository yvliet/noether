import React, { useContext } from 'react';
import { RotateCcwIcon } from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';

export const FieldResetButton: React.FC<{
  isModified: boolean;
  onReset: () => void;
  title?: string;
}> = ({ isModified, onReset, title = 'Restore default' }) => {
  if (!isModified) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onReset();
      }}
      title={title}
      className="p-1 rounded-md text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] cursor-pointer shrink-0 flex items-center justify-center"
    >
      <RotateCcwIcon size={13} />
    </button>
  );
};

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isTabMatch(tab: { id: string; extensionId?: string }, targetTabId: string): boolean {
  if (!targetTabId || !tab) return false;
  if (tab.id === targetTabId) return true;
  const targetId = tab.extensionId;
  if (targetId && targetId === targetTabId) return true;
  const parts = tab.id.split(':');
  const extId = parts[0];
  const subId = parts.length > 1 ? parts.slice(1).join(':') : parts[0];
  return (
    extId === targetTabId ||
    subId === targetTabId ||
    tab.id.startsWith(`${targetTabId}:`) ||
    tab.id.endsWith(`:${targetTabId}`)
  );
}

export function highlightMatch(text: string | null | undefined, query: string): React.ReactNode {
  if (!text) return null;
  if (!query || !query.trim()) return text;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;
  const pattern = terms.map(escapeRegExp).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <span key={index} className="text-[var(--noether-accent)] font-medium">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

export interface SettingsSearchContextValue {
  searchQuery: string;
  showAllOccurrences?: boolean;
}

export const SettingsSearchContext = React.createContext<SettingsSearchContextValue>({
  searchQuery: '',
  showAllOccurrences: false,
});

export interface SettingRowProps {
  title: string;
  description?: string | React.ReactNode;
  descriptionText?: string;
  keywords?: string[];
  resetButton?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const SettingRow: React.FC<SettingRowProps> = ({
  title,
  description,
  descriptionText,
  keywords,
  resetButton,
  children,
  className = '',
  onClick,
}) => {
  const { searchQuery } = useContext(SettingsSearchContext);

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-4 ${onClick ? 'cursor-pointer hover:bg-[var(--noether-btn-hover-bg)]' : ''} ${className}`}
    >
      <div className="flex flex-col pr-4 min-w-0 flex-1">
        <span className="text-[13px] font-normal text-[var(--noether-text-primary)]">
          {highlightMatch(title, searchQuery)}
        </span>
        {description && (
          <span className="text-[11px] text-[var(--noether-text-muted)] mt-0.5 leading-relaxed">
            {typeof description === 'string'
              ? highlightMatch(description, searchQuery)
              : description}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {resetButton}
        {children}
      </div>
    </div>
  );
};

export interface SettingSectionProps {
  title?: string;
  heading?: string;
  defaultHeading?: string;
  description?: string | React.ReactNode;
  caption?: string | React.ReactNode;
  defaultDescription?: string;
  tabName?: string;
  sectionName?: string;
  isModified?: boolean;
  onReset?: () => void;
  resetTitle?: string;
  children: React.ReactNode;
  className?: string;
}

export const SettingSection: React.FC<SettingSectionProps> = ({
  title,
  heading,
  defaultHeading,
  description,
  caption,
  defaultDescription,
  tabName,
  sectionName,
  isModified,
  onReset,
  resetTitle,
  children,
  className = '',
}) => {
  const { searchQuery, showAllOccurrences } = useContext(SettingsSearchContext);

  const displayTitle = title || heading || defaultHeading || sectionName || tabName || '';
  const displayDesc = description || caption || defaultDescription || '';

  if (showAllOccurrences && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    const descText = typeof displayDesc === 'string' ? displayDesc : '';
    const sectionMatches =
      (displayTitle && displayTitle.toLowerCase().includes(q)) ||
      (tabName && tabName.toLowerCase().includes(q)) ||
      (sectionName && sectionName.toLowerCase().includes(q)) ||
      (descText && descText.toLowerCase().includes(q));

    let matchCount = 0;
    const filteredChildren = React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;
      const props = child.props as SettingRowProps;
      if (props && props.title) {
        const descStr = props.descriptionText || (typeof props.description === 'string' ? props.description : '');
        const matches =
          sectionMatches ||
          props.title.toLowerCase().includes(q) ||
          descStr.toLowerCase().includes(q) ||
          (props.keywords && props.keywords.some((k) => k.toLowerCase().includes(q)));
        if (matches) {
          matchCount++;
          return child;
        }
        return null;
      }
      matchCount++;
      return child;
    });

    if (matchCount === 0) return null;

    return (
      <div className={`flex flex-col gap-2.5 ${className}`}>
        {displayTitle && (
          <div className="flex items-center justify-between px-4">
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-[var(--noether-text-primary)] mb-0.5">
                {highlightMatch(displayTitle, searchQuery)}
              </h3>
              {displayDesc && (
                <p className="text-[11px] text-[var(--noether-text-muted)] leading-relaxed">
                  {typeof displayDesc === 'string'
                    ? highlightMatch(displayDesc, searchQuery)
                    : displayDesc}
                </p>
              )}
            </div>
          </div>
        )}
        <div className="bg-[var(--noether-bg-card,#202020)] border border-[var(--noether-border-base,#2a2a2a)] rounded-xl overflow-hidden divide-y divide-[var(--noether-border-subtle,#282828)]">
          {filteredChildren}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {displayTitle && (
        <div className="flex items-center justify-between px-4">
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold text-[var(--noether-text-primary)] mb-0.5">
              {displayTitle}
            </h3>
            {displayDesc && (
              <p className="text-[11px] text-[var(--noether-text-muted)] leading-relaxed">
                {displayDesc}
              </p>
            )}
          </div>
          {isModified && onReset && (
            <button
              type="button"
              onClick={() => {
                useWorkspaceStore.getState().openConfirmDialog({
                  title: `Restore ${displayTitle} Defaults`,
                  message: `Are you sure you want to reset all "${displayTitle}" settings to their default values?`,
                  subtext: 'Any customized options in this section will be replaced with standard defaults.',
                  confirmText: 'Restore defaults',
                  isDanger: true,
                  showDontAskAgain: false,
                  onConfirm: onReset,
                });
              }}
              className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
              title={resetTitle || 'Restore defaults'}
            >
              <RotateCcwIcon size={12} />
              <span>Restore defaults</span>
            </button>
          )}
        </div>
      )}
      <div className="bg-[var(--noether-bg-card,#202020)] border border-[var(--noether-border-base,#2a2a2a)] rounded-xl overflow-hidden divide-y divide-[var(--noether-border-subtle,#282828)]">
        {children}
      </div>
    </div>
  );
};

export interface SettingIndexEntry {
  tabId: string;
  tabName: string;
  sectionName: string;
  title: string;
  description: string;
  keywords?: string[];
}

export const SETTINGS_SEARCH_INDEX: SettingIndexEntry[] = [
  // General
  { tabId: 'general', tabName: 'General', sectionName: 'General', title: 'Version & Updates', description: 'Installer version and changelog', keywords: ['version', 'update', 'changelog'] },
  { tabId: 'general', tabName: 'General', sectionName: 'General', title: 'Automatic updates', description: 'Turn this off to prevent the app from checking for updates', keywords: ['auto', 'updates', 'upgrade'] },
  { tabId: 'general', tabName: 'General', sectionName: 'General', title: 'Display language', description: 'Set interface language for Noether', keywords: ['language', 'locale', 'translation'] },

  // Appearance
  { tabId: 'appearance', tabName: 'Appearance', sectionName: 'Base theme', title: 'Base color theme', description: 'Dark, light, or sync with your operating system', keywords: ['theme', 'dark', 'light', 'system', 'mode'] },
  { tabId: 'appearance', tabName: 'Appearance', sectionName: 'Themes', title: 'Themes', description: 'Installed built-in and community themes', keywords: ['theme', 'palette', 'style'] },
  { tabId: 'appearance', tabName: 'Appearance', sectionName: 'Themes', title: 'Import theme', description: 'Import custom theme JSON', keywords: ['import', 'theme', 'json'] },
  { tabId: 'appearance', tabName: 'Appearance', sectionName: 'Typography', title: 'Interface font', description: 'Set base font for all of Noether', keywords: ['font', 'interface', 'system font', 'typography'] },
  { tabId: 'appearance', tabName: 'Appearance', sectionName: 'Typography', title: 'Text font', description: 'Set font for editing and reading views', keywords: ['font', 'text', 'reading', 'typography'] },
  { tabId: 'appearance', tabName: 'Appearance', sectionName: 'Typography', title: 'Monospace font', description: 'Set font for code blocks and monospace text', keywords: ['font', 'code', 'monospace', 'mono'] },
  { tabId: 'appearance', tabName: 'Appearance', sectionName: 'Typography', title: 'Font size', description: 'Set base font size in pixels', keywords: ['font', 'size', 'pixels', 'zoom'] },
  { tabId: 'appearance', tabName: 'Appearance', sectionName: 'Typography', title: 'Quick font size adjustment', description: 'Adjust font size with Ctrl+Scroll or Cmd+Scroll', keywords: ['scroll', 'zoom', 'wheel', 'font'] },
  { tabId: 'appearance', tabName: 'Appearance', sectionName: 'Colors', title: 'Accent color', description: 'Set custom accent color for highlights, active tabs, and interactive controls', keywords: ['accent', 'color', 'highlight', 'picker'] },
  { tabId: 'appearance', tabName: 'Appearance', sectionName: 'Advanced', title: 'Custom app icon', description: 'Set a custom icon for the app', keywords: ['app icon', 'icon', 'logo'] },

  // Interface
  { tabId: 'interface', tabName: 'Interface', sectionName: 'Window Frame', title: 'Window frame style', description: 'Native OS window borders or frameless Noether obsidian style', keywords: ['frame', 'window', 'titlebar', 'borders', 'native'] },
  { tabId: 'interface', tabName: 'Interface', sectionName: 'Window Frame', title: 'Open settings in separate window', description: 'Launch settings in independent OS window', keywords: ['window', 'settings', 'modal', 'separate'] },
  { tabId: 'interface', tabName: 'Interface', sectionName: 'Navigation', title: 'Show tab title bar', description: 'Display tab strip above active note editor', keywords: ['tab', 'strip', 'titlebar', 'tabs'] },
  { tabId: 'interface', tabName: 'Interface', sectionName: 'Navigation', title: 'Restore tabs on startup', description: 'Automatically restore open tabs from previous session', keywords: ['restore', 'session', 'startup', 'tabs'] },
  { tabId: 'interface', tabName: 'Interface', sectionName: 'Navigation', title: 'Show action rail', description: 'Show thin utility action rail along editor edge', keywords: ['action rail', 'rail', 'sidebar', 'panel'] },
  { tabId: 'interface', tabName: 'Interface', sectionName: 'Navigation', title: 'Show left ribbon', description: 'Display left ribbon bar with quick actions', keywords: ['ribbon', 'left', 'bar', 'sidebar'] },
  { tabId: 'interface', tabName: 'Interface', sectionName: 'Navigation', title: 'Native context menus', description: 'Use OS native context menus instead of styled menus', keywords: ['context menu', 'native', 'right click'] },
  { tabId: 'interface', tabName: 'Interface', sectionName: 'Zoom & Display', title: 'Display zoom level', description: 'Scale application interface', keywords: ['zoom', 'scale', 'ui', 'display'] },

  // Editor
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Editor', title: 'Default view for new tabs', description: 'The default view that a new Markdown tab gets opened in. Editing view or Reading view', keywords: ['view', 'reading', 'editing', 'new tab', 'markdown'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Editor', title: 'Default editing mode', description: 'The default editing mode a new tab will start with. Live Preview or Source mode', keywords: ['live preview', 'source mode', 'editing', 'mode'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Editor', title: 'Show editing mode in status bar', description: 'Show the editing mode toggle in the status bar', keywords: ['status bar', 'mode', 'editing'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Editor', title: 'Show word count in status bar', description: 'Show the word count of the current note in the status bar', keywords: ['word count', 'status bar', 'words'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Editor', title: 'Show character count in status bar', description: 'Show the character count of the current note in the status bar', keywords: ['character count', 'status bar', 'characters'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Editor', title: 'Show reading time in status bar', description: 'Show estimated reading time of the current note in the status bar', keywords: ['reading time', 'status bar', 'minutes'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Inline title', description: 'Display the filename as an editable title inline with the file contents', keywords: ['inline title', 'title', 'filename', 'header'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Readable line length', description: 'Limit maximum line length. Less content fits onscreen, but long blocks of text are more readable', keywords: ['line length', 'readable', 'width', 'margins'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Strict line breaks', description: 'Markdown specs ignore single line breaks in reading view. Turn this off to make single line breaks visible', keywords: ['line breaks', 'markdown', 'enter', 'newline'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Properties in document', description: 'Choose how properties are displayed at the top of notes. Visible, Hidden, or Source raw YAML', keywords: ['properties', 'frontmatter', 'yaml', 'metadata'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Fold heading', description: 'Lets you fold all content under a heading', keywords: ['fold', 'heading', 'collapse', 'outline'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Fold indent', description: 'Lets you fold part of an indentation, such as lists', keywords: ['fold', 'indent', 'list', 'collapse'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Line numbers', description: 'Show line numbers in the gutter', keywords: ['line numbers', 'gutter', 'numbers'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Indentation guides', description: 'Show vertical relationship lines between list items', keywords: ['indentation', 'guides', 'lines', 'vertical'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Accent number & list markers', description: 'Recolor list numbers and bullets with your theme\'s dimmed accent color', keywords: ['accent', 'list', 'bullet', 'markers', 'numbers'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Auto-pair brackets and quotes', description: 'Automatically pair [[wikilinks]], ((blocks)), and markdown syntax', keywords: ['auto-pair', 'brackets', 'quotes', 'wikilinks'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Auto-pair math formulas', description: 'Automatically wrap selections in math or open the math editor when typing $', keywords: ['math', 'formulas', 'latex', 'dollar', 'auto-pair'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Show external link icon', description: 'Display an external link icon next to links in rendered markdown notes', keywords: ['external link', 'icon', 'url', 'http'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Color all links with accent color', description: 'Display markdown links, wikilinks, and document links using your active accent color', keywords: ['links', 'accent', 'color', 'wikilink'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Classic blue links', description: 'Display links in standard browser blue with purple visited links instead of neutral text color', keywords: ['blue links', 'classic', 'browser', 'color'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Underline links', description: 'Display underlines under links. When turned off, underlines only appear on hover', keywords: ['underline', 'links', 'hover'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Match underline color to link', description: 'Color the underline to match the link text color instead of the subtle border color', keywords: ['match', 'underline', 'color'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Spellcheck', description: 'Highlight spelling mistakes and typos with red wavy underlines in the editor', keywords: ['spellcheck', 'spelling', 'typo', 'grammar'] },
  { tabId: 'editor', tabName: 'Editor', sectionName: 'Display', title: 'Tab indent size', description: 'Number of spaces when pressing Tab key', keywords: ['tab', 'indent', 'spaces', 'size'] },

  // Files and links
  { tabId: 'files', tabName: 'Files and links', sectionName: 'Vault', title: 'Vault name', description: 'Rename active vault folder display name', keywords: ['vault', 'name', 'rename'] },
  { tabId: 'files', tabName: 'Files and links', sectionName: 'Vault', title: 'Vault path', description: 'Filesystem location of active vault', keywords: ['vault', 'path', 'folder', 'location'] },
  { tabId: 'files', tabName: 'Files and links', sectionName: 'Deletions', title: 'Deleted files', description: 'Manage and restore files from trash', keywords: ['trash', 'deleted', 'restore', 'recover'] },
  { tabId: 'files', tabName: 'Files and links', sectionName: 'Deletions', title: 'Confirm file deletion', description: 'Show confirmation dialog before moving items to trash', keywords: ['confirm', 'delete', 'trash', 'dialog'] },
  { tabId: 'files', tabName: 'Files and links', sectionName: 'Deletions', title: 'Confirm file rename', description: 'Show confirmation dialog before renaming files', keywords: ['confirm', 'rename', 'dialog'] },
  { tabId: 'files', tabName: 'Files and links', sectionName: 'Deletions', title: 'Close tabs on delete', description: 'Close active tab when the corresponding file is moved to trash', keywords: ['close tab', 'delete', 'trash'] },
  { tabId: 'files', tabName: 'Files and links', sectionName: 'Deletions', title: 'Empty trash', description: 'Permanently delete all items currently in trash', keywords: ['empty trash', 'purge', 'permanent'] },
  { tabId: 'files', tabName: 'Files and links', sectionName: 'Locations', title: 'New note location', description: 'Where newly created notes are placed: Vault root folder or same folder as current file', keywords: ['new note', 'location', 'root', 'same folder'] },
  { tabId: 'files', tabName: 'Files and links', sectionName: 'Locations', title: 'Default location for new attachments', description: 'Folder where pasted images and media attachments are placed', keywords: ['attachment', 'images', 'media', 'folder', 'pasted'] },
  { tabId: 'files', tabName: 'Files and links', sectionName: 'Links', title: 'New link format', description: 'Shortest path, relative path, or absolute path for internal links', keywords: ['link format', 'shortest', 'relative', 'absolute', 'wikilink'] },
  { tabId: 'files', tabName: 'Files and links', sectionName: 'Links', title: 'Automatically update internal links', description: 'Automatically update wikilinks when notes are renamed or moved', keywords: ['auto update', 'links', 'rename', 'move', 'backlinks'] },
  { tabId: 'files', tabName: 'Files and links', sectionName: 'Links', title: 'Show broken embed indicators', description: 'Display inline alert tags when an embedded note or asset cannot be found', keywords: ['broken embed', 'missing', 'asset', 'warning'] },
  { tabId: 'files', tabName: 'Files and links', sectionName: 'Excluded files and folders', title: 'Manage excluded folders', description: 'Folders and path patterns to ignore across search, backlink indexing, and workspace navigation', keywords: ['exclude', 'ignore', 'hidden', 'folder', 'filter', 'pattern'] },

  // Hotkeys
  { tabId: 'hotkeys', tabName: 'Hotkeys', sectionName: 'Hotkeys', title: 'Keyboard shortcuts', description: 'View and customize keyboard shortcuts across all commands', keywords: ['hotkeys', 'shortcuts', 'keybindings', 'commands'] },

  // Core extensions
  { tabId: 'core-extensions', tabName: 'Core extensions', sectionName: 'Core extensions', title: 'Core extensions', description: 'Core features designed as modular extensions. Toggle them anytime', keywords: ['extensions', 'core', 'core extensions', 'built-in', 'plugins', 'modules'] },

  // Community extensions
  { tabId: 'community-extensions', tabName: 'Community extensions', sectionName: 'Community extensions', title: 'Community extensions', description: 'Browse and install community extensions from the Noether ecosystem', keywords: ['community', 'marketplace', 'plugins', 'install', 'discover'] },
];
