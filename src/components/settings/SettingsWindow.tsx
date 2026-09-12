import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import {
  Search01Icon,
  Settings02Icon,
  PaletteIcon,
  MonitorIcon,
  Edit02Icon,
  Folder01Icon,
  File01Icon,
  KeyIcon,
  PackageIcon,
  GlobeIcon,
  PuzzleIcon,
  LinkSquare02Icon,
  Layout01Icon,
  Calendar01Icon,
  Brain02Icon,
  CheckmarkSquare02Icon,
  GitForkIcon,
  Tag01Icon,
  LeftToRightListBulletIcon,
  CheckIcon,
  FolderOpenIcon,
  RotateCcwIcon,
  ChevronRightIcon,
  ArrowLeft01Icon,
  PlusSignIcon,
  Delete02Icon,
  Download01Icon,
  SparklesIcon,
  Copy01Icon,
  Store01Icon,
  BookOpen01Icon,
  WindowMinimizeIcon,
  WindowMaximizeIcon,
  WindowRestoreIcon,
  WindowCloseIcon,
  CancelCircleIcon,
} from '@/components/common/Icons';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import { useIsMaximized } from '@/hooks/useIsMaximized';
import { CustomSelect } from '@/components/common/CustomSelect';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { Slider } from '@/components/common/Slider';
import { ColorPicker } from '@/components/common/ColorPicker';
import { themeRegistry, ThemeDefinition } from '@/core/themes';
import {
  useSettingsStore,
  applyAppearanceDOM,
  DEFAULT_SETTINGS,
  ThemePalette,
  DefaultTabMode,
  DefaultEditingMode,
  DocPropertiesMode,
  NewNoteLocation,
  LinkFormat,
} from '@/store/settingsStore';
import { appInstance } from '@/core/app/NoetherApp';
import { AppProvider, useNoetherApp, useExtensionList, useSettingTabs, useCommands } from '@/core/app/AppContext';
import { ExtensionSettingTab } from '@/core/extensions/types';
import { platform } from '@/lib/platform/platformAdapter';
import { dbAdapter } from '@/lib/db/adapter';
import { APP_VERSION } from '@/version';
import { useAutoUpdater } from '@/hooks/useAutoUpdater';
import { fileTypeRegistry } from '@/core/registries/FileTypeRegistry';

// Individual Field Reset Button (renders subtle undo icon when setting is not default)
const FieldResetButton: React.FC<{
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

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

interface SettingsSearchContextValue {
  searchQuery: string;
  showAllOccurrences?: boolean;
}

const SettingsSearchContext = React.createContext<SettingsSearchContextValue>({ searchQuery: '', showAllOccurrences: false });

interface SettingRowProps {
  title: string;
  description?: string | React.ReactNode;
  descriptionText?: string;
  keywords?: string[];
  resetButton?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const SettingRow: React.FC<SettingRowProps> = ({
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
      className={`flex items-center justify-between p-4 ${onClick ? 'cursor-pointer hover:bg-[#242424]/40' : ''} ${className}`}
    >
      <div className="flex flex-col pr-4 min-w-0 flex-1">
        <span className="text-[13px] font-normal text-[#dcddde]">
          {highlightMatch(title, searchQuery)}
        </span>
        {description && (
          <span className="text-[11px] text-[#777] mt-0.5 leading-relaxed">
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

interface SettingSectionProps {
  tabName: string;
  sectionName: string;
  defaultHeading?: string;
  defaultDescription?: string;
  isModified?: boolean;
  onReset?: () => void;
  resetTitle?: string;
  children: React.ReactNode;
}

const SettingSection: React.FC<SettingSectionProps> = ({
  tabName,
  sectionName,
  defaultHeading,
  defaultDescription,
  isModified,
  onReset,
  resetTitle,
  children,
}) => {
  const { searchQuery, showAllOccurrences } = useContext(SettingsSearchContext);

  if (showAllOccurrences && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    const sectionMatches =
      tabName.toLowerCase().includes(q) || sectionName.toLowerCase().includes(q);

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
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-4 mb-1">
          <div>
            <h3 className="text-sm font-semibold text-white mb-0.5">
              {highlightMatch(tabName, searchQuery)}
            </h3>
            <p className="text-[11px] text-[var(--noether-text-muted)]">
              {highlightMatch(sectionName, searchQuery)}
            </p>
          </div>
        </div>
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
          {filteredChildren}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {defaultHeading ? (
        <div className="px-4 mb-1">
          <h3 className="text-sm font-semibold text-white">{defaultHeading}</h3>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4">
          <div>
            <h3 className="text-sm font-semibold text-white mb-0.5">{tabName}</h3>
            {defaultDescription && (
              <p className="text-[11px] text-[#777]">{defaultDescription}</p>
            )}
          </div>
          {isModified && onReset && (
            <button
              onClick={onReset}
              className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
              title={resetTitle || 'Restore defaults'}
            >
              <RotateCcwIcon size={12} />
              <span>Restore defaults</span>
            </button>
          )}
        </div>
      )}
      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {children}
      </div>
    </div>
  );
};

interface SettingIndexEntry {
  tabId: string;
  tabName: string;
  sectionName: string;
  title: string;
  description: string;
  keywords?: string[];
}

const SETTINGS_SEARCH_INDEX: SettingIndexEntry[] = [
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

  // Hotkeys
  { tabId: 'hotkeys', tabName: 'Hotkeys', sectionName: 'Hotkeys', title: 'Keyboard shortcuts', description: 'View and customize keyboard shortcuts across all commands', keywords: ['hotkeys', 'shortcuts', 'keybindings', 'commands'] },

  // Built-in extensions
  { tabId: 'core-extensions', tabName: 'Built-in extensions', sectionName: 'Built-in extensions', title: 'Core extensions', description: 'Built-in features designed as modular extensions. Toggle them anytime', keywords: ['extensions', 'built-in', 'core', 'plugins', 'modules'] },

  // Community extensions
  { tabId: 'community-extensions', tabName: 'Community extensions', sectionName: 'Community extensions', title: 'Community extensions', description: 'Browse and install community extensions from the Noether ecosystem', keywords: ['community', 'marketplace', 'plugins', 'install', 'discover'] },
];

function formatRelativeTime(timestamp: number): string {
  const elapsedMs = Date.now() - timestamp;
  const mins = Math.floor(elapsedMs / (60 * 1000));
  if (mins < 1) return 'Deleted just now';
  if (mins < 60) return `Deleted ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Deleted ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Deleted ${days}d ago`;
}

const AVAILABLE_FONTS = [
  'Agency FB',
  'ALGERIAN',
  'Alice',
  'Arial',
  'Arial Black',
  'Arial Narrow',
  'Arial Rounded MT',
  'BIZ UDGothic',
  'BIZ UDMincho',
  'BIZ UDPGothic',
  'BIZ UDPMincho',
  'Bahnschrift',
  'Baskerville Old Face',
  'Bauhaus 93',
  'Bell MT',
  'Calibri',
  'Cambria',
  'Cascadia Code',
  'Century Gothic',
  'Comic Sans MS',
  'Consolas',
  'Courier New',
  'Fira Code',
  'Franklin Gothic Medium',
  'Georgia',
  'Gill Sans',
  'Impact',
  'Inter',
  'JetBrains Mono',
  'Lucida Console',
  'Lucida Sans',
  'Menlo',
  'Monaco',
  'Montserrat',
  'Open Sans',
  'Palatino',
  'Roboto',
  'Segoe UI',
  'Source Code Pro',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
];

// ==========================================
// SUBVIEW: FONT PICKER
// ==========================================
interface FontPickerViewProps {
  mode: 'interface' | 'text' | 'monospace';
  onClose: () => void;
}

const FontPickerView: React.FC<FontPickerViewProps> = React.memo(({ mode, onClose }) => {
  const interfaceFont = useSettingsStore((s) => s.interfaceFont);
  const setInterfaceFont = useSettingsStore((s) => s.setInterfaceFont);
  const textFont = useSettingsStore((s) => s.textFont);
  const setTextFont = useSettingsStore((s) => s.setTextFont);
  const monospaceFont = useSettingsStore((s) => s.monospaceFont);
  const setMonospaceFont = useSettingsStore((s) => s.setMonospaceFont);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const [fontSearchQuery, setFontSearchQuery] = useState('');

  const filteredFonts = useMemo(() => {
    return fontSearchQuery
      ? AVAILABLE_FONTS.filter((f) => f.toLowerCase().includes(fontSearchQuery.toLowerCase()))
      : AVAILABLE_FONTS;
  }, [fontSearchQuery]);

  const handleSelectFont = useCallback((fontName: string) => {
    if (mode === 'interface') {
      setInterfaceFont(fontName);
    } else if (mode === 'text') {
      setTextFont(fontName);
    } else if (mode === 'monospace') {
      setMonospaceFont(fontName);
    }
    onClose();
    showToast(`Applied font: ${fontName}`, 'success');
  }, [mode, setInterfaceFont, setTextFont, setMonospaceFont, onClose, showToast]);

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4 flex flex-col gap-1.5">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white cursor-pointer -ml-1 w-fit"
        >
          <ArrowLeft01Icon size={14} />
          <span className="capitalize font-medium">{mode} font</span>
        </button>

        <p className="text-xs text-[#777]">
          {mode === 'interface' && (interfaceFont ? `Current font: ${interfaceFont}` : 'No custom font is applied right now. Add one below.')}
          {mode === 'text' && (textFont ? `Current font: ${textFont}` : 'No custom font is applied right now. Add one below.')}
          {mode === 'monospace' && (monospaceFont ? `Current font: ${monospaceFont}` : 'No custom font is applied right now. Add one below.')}
        </p>
      </div>

      <div className="bg-[#202020] border border-[#2c2c2c] rounded-xl overflow-hidden p-3 flex flex-col gap-2">
        <div className="relative">
          <Search01Icon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            value={fontSearchQuery}
            onChange={(e) => setFontSearchQuery(e.target.value)}
            placeholder="Enter font name..."
            className="w-full bg-[#161616] border border-[#2c2c2c] focus:border-[#444] rounded-md pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-[var(--noether-text-faint)] outline-none"
          />
        </div>

        <div className="max-h-[380px] overflow-y-auto custom-scrollbar flex flex-col divide-y divide-[#282828] mt-1">
          {filteredFonts.map((font) => (
            <button
              key={font}
              onClick={() => handleSelectFont(font)}
              style={{ fontFamily: font }}
              className="text-left px-3 py-2.5 text-sm text-[#ccc] hover:text-white hover:bg-[#262626] rounded-md cursor-pointer flex items-center justify-between"
            >
              <span>{font}</span>
              {((mode === 'interface' && interfaceFont === font) ||
                (mode === 'text' && textFont === font) ||
                (mode === 'monospace' && monospaceFont === font)) && (
                <CheckIcon size={14} className="text-white" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

// ==========================================
// SUBVIEW: TRASH VIEWER
// ==========================================
interface TrashViewProps {
  onClose: () => void;
}

const TrashView: React.FC<TrashViewProps> = React.memo(({ onClose }) => {
  const trashItems = useDocumentStore((s) => s.trashItems);
  const loadTrash = useDocumentStore((s) => s.loadTrash);
  const restoreFromTrash = useDocumentStore((s) => s.restoreFromTrash);
  const deletePermanently = useDocumentStore((s) => s.deletePermanently);
  const emptyAllTrash = useDocumentStore((s) => s.emptyAllTrash);
  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const [trashSearchQuery, setTrashSearchQuery] = useState('');

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const filteredTrashItems = useMemo(() => {
    if (!trashSearchQuery.trim()) return trashItems;
    const q = trashSearchQuery.toLowerCase();
    return trashItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.original_path && item.original_path.toLowerCase().includes(q))
    );
  }, [trashItems, trashSearchQuery]);

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] cursor-pointer -ml-1 w-fit"
        >
          <ArrowLeft01Icon size={14} />
          <span className="font-medium">Files and links / Trash</span>
        </button>

        <div className="flex items-center gap-2">
          {platform.isDesktop() && (
            <button
              onClick={async () => {
                const res = await platform.openTrashFolder();
                if (res?.success) {
                  showToast('Opened .trash folder in File Explorer', 'info');
                } else {
                  showToast('Failed to open .trash folder', 'warning');
                }
              }}
              className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
              title="Open .trash folder in system file manager"
            >
              <Folder01Icon size={12} />
              <span>Open folder</span>
            </button>
          )}

          {trashItems.length > 0 && (
            <button
              onClick={() => {
                openConfirmDialog({
                  title: 'Empty Trash',
                  message: 'Are you sure you want to permanently delete all items in the trash?',
                  subtext: 'All deleted files and folders will be permanently destroyed.',
                  confirmText: 'Empty Trash',
                  isDanger: true,
                  onConfirm: async () => {
                    await emptyAllTrash();
                  },
                });
              }}
              className="noether-btn noether-btn-danger text-xs py-1 px-2.5 flex items-center gap-1.5"
            >
              <Delete02Icon size={12} />
              <span>Empty trash</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-4">
        <p className="text-xs text-[#777]">
          Items in trash are automatically cleared after 48 hours. You can restore them back to your Vault anytime before they expire.
        </p>
      </div>

      <div className="bg-[#202020] border border-[#2c2c2c] rounded-xl overflow-hidden p-3 flex flex-col gap-2">
        <div className="relative">
          <Search01Icon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            value={trashSearchQuery}
            onChange={(e) => setTrashSearchQuery(e.target.value)}
            placeholder="Search deleted files..."
            className="w-full bg-[#161616] border border-[#2c2c2c] focus:border-[#444] rounded-md pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-[var(--noether-text-faint)] outline-none"
          />
        </div>

        {filteredTrashItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[#666]">
            <Delete02Icon size={32} className="text-[#444] mb-2" />
            <div className="text-xs text-[#aaa] font-medium">Trash is empty</div>
            <div className="text-[11px] text-[#666] mt-1 max-w-xs">
              Deleted files and folders will stay here for 48 hours before being automatically removed.
            </div>
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto custom-scrollbar flex flex-col divide-y divide-[#282828] mt-1">
            {filteredTrashItems.map((item) => {
              const elapsedMs = Date.now() - item.deleted_at;
              const remainingMs = Math.max(0, 48 * 60 * 60 * 1000 - elapsedMs);
              const remHours = Math.ceil(remainingMs / (60 * 60 * 1000));
              const customType = fileTypeRegistry.getByDocType(item.doc_type) || fileTypeRegistry.getByPath(item.title);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 hover:bg-[var(--noether-bg-card-hover)] group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                    <div className="w-7 h-7 rounded-lg bg-[var(--noether-bg-card)] flex items-center justify-center text-[var(--noether-text-muted)] shrink-0">
                      {item.is_folder ? (
                        <Folder01Icon size={15} />
                      ) : customType ? (
                        <Layout01Icon size={15} />
                      ) : (
                        <File01Icon size={15} />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--noether-text-primary)] truncate">
                          {customType ? fileTypeRegistry.cleanTitle(item.title) : item.title}
                        </span>
                        {customType && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--noether-bg-card-hover)] text-[var(--noether-text-muted)] uppercase font-semibold">
                            {customType.badgeLabel || customType.extension}
                          </span>
                        )}
                        {item.is_folder ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--noether-bg-card-hover)] text-[var(--noether-text-muted)] uppercase font-semibold">
                            Folder
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--noether-text-muted)] mt-0.5 truncate">
                        <span>{formatRelativeTime(item.deleted_at)}</span>
                        <span>•</span>
                        <span className="text-amber-500/80 font-medium">
                          Auto-clears in {remHours}h
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={async () => {
                        await restoreFromTrash(item.id);
                      }}
                      title="Restore to Vault"
                      className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
                    >
                      <RotateCcwIcon size={12} />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => {
                        openConfirmDialog({
                          title: 'Delete Permanently',
                          message: `Permanently delete "${item.title}"?`,
                          subtext: 'This action cannot be undone.',
                          confirmText: 'Delete',
                          isDanger: true,
                          onConfirm: async () => {
                            await deletePermanently(item.id);
                          },
                        });
                      }}
                      title="Delete permanently"
                      className="p-1.5 text-[var(--noether-text-muted)] hover:text-rose-400 hover:bg-[var(--noether-bg-card-hover)] rounded-[5px] cursor-pointer"
                    >
                      <Delete02Icon size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

// ==========================================
// TAB: GENERAL
// ==========================================
const GeneralTab: React.FC = React.memo(() => {
  const autoUpdates = useSettingsStore((s) => s.autoUpdates);
  const setAutoUpdates = useSettingsStore((s) => s.setAutoUpdates);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const restoreTabDefaults = useSettingsStore((s) => s.restoreTabDefaults);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const setIsUpdateModalOpen = useWorkspaceStore((s) => s.setIsUpdateModalOpen);
  const { checkForUpdatesNow, isChecking, hasUpdate, latestRelease } = useAutoUpdater();

  const isGeneralModified =
    autoUpdates !== DEFAULT_SETTINGS.autoUpdates ||
    language !== DEFAULT_SETTINGS.language;

  return (
    <div className="flex flex-col gap-5">
      <SettingSection
        tabName="General"
        sectionName="General"
        defaultDescription="Application updates and display language."
        isModified={isGeneralModified}
        onReset={() => {
          restoreTabDefaults('general');
          showToast('Restored General settings to default', 'info');
        }}
        resetTitle="Restore default general settings"
      >
        {/* Row: Version & Updates */}
        <SettingRow
          title={`Version ${APP_VERSION}`}
          description={
            <div className="flex flex-col">
              <span className="text-xs text-[#888]">Installer version: {APP_VERSION}</span>
              <a
                href="https://github.com/yvliet/Noether/releases"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#38bdf8] hover:underline mt-0.5 inline-block w-fit"
              >
                Read the changelog.
              </a>
            </div>
          }
          descriptionText={`Installer version: ${APP_VERSION}. Check for updates or read the changelog.`}
          keywords={['version', 'update', 'installer', 'changelog', 'release']}
        >
          <div className="flex items-center gap-2">
            {hasUpdate && latestRelease && (
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(true, latestRelease)}
                className="noether-btn noether-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
              >
                <SparklesIcon size={13} />
                <span>Update to v{latestRelease.version}</span>
              </button>
            )}
            <button
              type="button"
              onClick={checkForUpdatesNow}
              disabled={isChecking}
              className="noether-btn text-xs py-1.5 px-3 disabled:opacity-50 cursor-pointer"
            >
              {isChecking ? 'Checking...' : 'Check for updates'}
            </button>
          </div>
        </SettingRow>

        {/* Row: Automatic updates */}
        <SettingRow
          title="Automatic updates"
          description="Turn this off to prevent the app from checking for updates."
          keywords={['automatic updates', 'auto updates', 'upgrade']}
          resetButton={
            <FieldResetButton
              isModified={autoUpdates !== DEFAULT_SETTINGS.autoUpdates}
              onReset={() => setAutoUpdates(DEFAULT_SETTINGS.autoUpdates)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={autoUpdates} onChange={setAutoUpdates} />
        </SettingRow>

        {/* Row: Language */}
        <SettingRow
          title="Display language"
          description="Change the display language."
          keywords={['language', 'display language', 'locale', 'translation']}
          resetButton={
            <FieldResetButton
              isModified={language !== DEFAULT_SETTINGS.language}
              onReset={() => setLanguage(DEFAULT_SETTINGS.language)}
              title="Restore default language (English)"
            />
          }
        >
          <CustomSelect
            value={language}
            onChange={setLanguage}
            options={[
              { value: 'English', label: 'English' },
              { value: 'German', label: 'Deutsch' },
              { value: 'Spanish', label: 'Español' },
              { value: 'French', label: 'Français' },
              { value: 'Japanese', label: '日本語' },
            ]}
          />
        </SettingRow>

        {/* Row: Help */}
        <SettingRow
          title="Help"
          description="Learn how to use Noether and get help from the community."
          keywords={['help', 'community', 'documentation', 'guide']}
        >
          <button
            onClick={() => useWorkspaceStore.getState().setIsHelpModalOpen(true)}
            className="noether-btn"
          >
            Open
          </button>
        </SettingRow>
      </SettingSection>
    </div>
  );
});

// ==========================================
// TAB: APPEARANCE
// ==========================================
interface AppearanceTabProps {
  onOpenFontPicker: (mode: 'interface' | 'text' | 'monospace') => void;
}

const AppearanceTab: React.FC<AppearanceTabProps> = React.memo(({ onOpenFontPicker }) => {
  const { searchQuery, showAllOccurrences } = useContext(SettingsSearchContext);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const setAccentColor = useSettingsStore((s) => s.setAccentColor);
  const activeTheme = useSettingsStore((s) => s.activeTheme);
  const setActiveTheme = useSettingsStore((s) => s.setActiveTheme);
  const interfaceFont = useSettingsStore((s) => s.interfaceFont);
  const setInterfaceFont = useSettingsStore((s) => s.setInterfaceFont);
  const textFont = useSettingsStore((s) => s.textFont);
  const setTextFont = useSettingsStore((s) => s.setTextFont);
  const monospaceFont = useSettingsStore((s) => s.monospaceFont);
  const setMonospaceFont = useSettingsStore((s) => s.setMonospaceFont);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const quickFontSize = useSettingsStore((s) => s.quickFontSize);
  const setQuickFontSize = useSettingsStore((s) => s.setQuickFontSize);
  const restoreTabDefaults = useSettingsStore((s) => s.restoreTabDefaults);
  const showToast = useWorkspaceStore((s) => s.showToast);

  // Theme Manager state
  const [themeFilter, setThemeFilter] = useState<'all' | 'dark' | 'light' | 'gradient' | 'custom'>('all');
  const [themeSearchQuery, setThemeSearchQuery] = useState('');
  const [isCreatingTheme, setIsCreatingTheme] = useState(false);
  const [isImportingTheme, setIsImportingTheme] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [themesVersion, setThemesVersion] = useState(0);

  // Custom Theme Form fields
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeType, setNewThemeType] = useState<'dark' | 'light'>('dark');
  const [newThemeHasGradient, setNewThemeHasGradient] = useState(false);
  const [newThemeTopbar, setNewThemeTopbar] = useState('#0d0d0d');
  const [newThemeTopbarGradient, setNewThemeTopbarGradient] = useState('linear-gradient(135deg, #090616 0%, #170d38 50%, #22104a 100%)');
  const [newThemeSidebar, setNewThemeSidebar] = useState('#151515');
  const [newThemeMain, setNewThemeMain] = useState('#1c1c1c');
  const [newThemeCard, setNewThemeCard] = useState('#222222');
  const [newThemeAccent, setNewThemeAccent] = useState('#eb584d');
  const [newThemeCss, setNewThemeCss] = useState('');

  const allThemes = useMemo(() => {
    return themeRegistry.getAllThemes();
  }, [themesVersion]);

  const filteredThemes = useMemo(() => {
    return allThemes.filter((theme) => {
      // Type filter
      if (themeFilter === 'dark' && theme.type !== 'dark') return false;
      if (themeFilter === 'light' && theme.type !== 'light') return false;
      if (themeFilter === 'gradient' && !theme.hasGradient) return false;
      if (themeFilter === 'custom' && theme.isBuiltIn) return false;

      // Text search
      if (themeSearchQuery.trim()) {
        const q = themeSearchQuery.toLowerCase();
        return (
          theme.name.toLowerCase().includes(q) ||
          (theme.description && theme.description.toLowerCase().includes(q)) ||
          (theme.author && theme.author.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allThemes, themeFilter, themeSearchQuery]);

  const isAppearanceModified =
    accentColor !== DEFAULT_SETTINGS.accentColor ||
    activeTheme !== DEFAULT_SETTINGS.activeTheme ||
    interfaceFont !== DEFAULT_SETTINGS.interfaceFont ||
    textFont !== DEFAULT_SETTINGS.textFont ||
    monospaceFont !== DEFAULT_SETTINGS.monospaceFont ||
    fontSize !== DEFAULT_SETTINGS.fontSize ||
    quickFontSize !== DEFAULT_SETTINGS.quickFontSize;

  const isThemeSearchMatch = useMemo(() => {
    if (!showAllOccurrences || !searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      'theme'.includes(q) ||
      'themes'.includes(q) ||
      'appearance'.includes(q) ||
      allThemes.some(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      )
    );
  }, [showAllOccurrences, searchQuery, allThemes]);

  const handleOpenExtensionsFolder = useCallback(() => {
    if (platform.isDesktop()) {
      platform.openExtensionsFolder();
    } else {
      showToast('Extensions folder: .noether/extensions/ inside Vault', 'info');
    }
  }, [showToast]);

  return (
    <div className="flex flex-col gap-6">
      {/* Section 1: Accent Color */}
      <SettingSection
        tabName="Appearance"
        sectionName="Colors"
        defaultDescription="Color schemes, themes, fonts, and zoom scaling."
        isModified={isAppearanceModified}
        onReset={() => {
          restoreTabDefaults('appearance');
          showToast('Restored Appearance settings to default', 'info');
        }}
        resetTitle="Restore default appearance settings"
      >
        <SettingRow
          title="Accent color"
          description={
            <div className="flex flex-col">
              <span>{highlightMatch('Choose the primary accent highlight color.', searchQuery)}</span>
              <div className="flex items-center gap-1.5 mt-2.5">
                {[
                  { name: 'Noether Coral', color: '#eb584d' },
                  { name: 'Electric Blue', color: '#3b82f6' },
                  { name: 'Emerald Green', color: '#10b981' },
                  { name: 'Amethyst', color: '#8b5cf6' },
                  { name: 'Rose', color: '#ec4899' },
                  { name: 'Cyan Sea', color: '#06b6d4' },
                  { name: 'Amber', color: '#f59e0b' },
                  { name: 'Nord Frost', color: '#88c0d0' },
                ].map((swatch) => (
                  <button
                    key={swatch.color}
                    onClick={() => setAccentColor(swatch.color)}
                    title={swatch.name}
                    className={`w-5 h-5 rounded-full border cursor-pointer ${
                      accentColor.toLowerCase() === swatch.color.toLowerCase()
                        ? 'scale-125 border-white ring-2 ring-white/20'
                        : 'border-black/30 hover:scale-110'
                    }`}
                    style={{ backgroundColor: swatch.color }}
                  />
                ))}
              </div>
            </div>
          }
          descriptionText="Choose the primary accent highlight color."
          keywords={['accent', 'color', 'highlight', 'picker']}
          resetButton={
            <FieldResetButton
              isModified={accentColor !== DEFAULT_SETTINGS.accentColor}
              onReset={() => setAccentColor(DEFAULT_SETTINGS.accentColor)}
              title="Restore default accent color (#eb584d)"
            />
          }
        >
          <div className="flex items-center gap-2.5 pt-0.5">
            <ColorPicker value={accentColor} onChange={setAccentColor} />
          </div>
        </SettingRow>
      </SettingSection>

      {/* Section 2: Visual Themes Showcase */}
      {isThemeSearchMatch && (
      <div className="flex flex-col gap-3">
        {showAllOccurrences && searchQuery.trim() ? (
          <div className="flex items-center justify-between px-4 mb-1">
            <div>
              <h3 className="text-sm font-semibold text-white mb-0.5">
                {highlightMatch('Appearance', searchQuery)}
              </h3>
              <p className="text-[11px] text-[var(--noether-text-muted)]">
                {highlightMatch('Themes', searchQuery)}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4">
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Themes</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#2a2a2a] text-[#888] rounded-full">
                  {allThemes.length}
                </span>
              </h4>
              <p className="text-[11px] text-[#777]">
                Choose from high-contrast palettes, rich gradients, or craft custom themes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const currentDef = themeRegistry.getTheme(activeTheme);
                  const jsonStr = themeRegistry.exportTheme(currentDef);
                  navigator.clipboard.writeText(jsonStr);
                  showToast(`Exported "${currentDef.name}" JSON to clipboard`, 'success');
                }}
                title="Export current theme as JSON"
                className="noether-btn text-xs !py-1 !px-2.5 flex items-center gap-1.5"
              >
                <Copy01Icon size={13} />
                <span>Export</span>
              </button>

              <button
                onClick={() => setIsImportingTheme(true)}
                title="Import theme JSON"
                className="noether-btn text-xs !py-1 !px-2.5 flex items-center gap-1.5"
              >
                <Download01Icon size={13} />
                <span>Import</span>
              </button>

              <button
                onClick={() => {
                  setNewThemeName('');
                  setNewThemeType('dark');
                  setNewThemeHasGradient(false);
                  setNewThemeTopbar('#0d0d0d');
                  setNewThemeTopbarGradient('linear-gradient(135deg, #090616 0%, #170d38 50%, #22104a 100%)');
                  setNewThemeSidebar('#151515');
                  setNewThemeMain('#1c1c1c');
                  setNewThemeCard('#222222');
                  setNewThemeAccent('#eb584d');
                  setNewThemeCss('');
                  setIsCreatingTheme(true);
                }}
                className="noether-btn noether-btn-primary flex items-center gap-1.5"
              >
                <PlusSignIcon size={13} />
                <span>New Theme</span>
              </button>
            </div>
          </div>
        )}

        {/* Filter Tabs & Search Bar */}
        <div className="flex items-center justify-between gap-3 bg-[#1e1e1e] p-1.5 rounded-lg border border-[#282828]">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: `All (${allThemes.length})` },
              { id: 'dark', label: `Dark (${allThemes.filter((t) => t.type === 'dark').length})` },
              { id: 'light', label: `Light (${allThemes.filter((t) => t.type === 'light').length})` },
              ...(allThemes.some((t) => !t.isBuiltIn && !t.isPreinstalled && !t.isCore)
                ? [{ id: 'custom', label: `Custom (${allThemes.filter((t) => !t.isBuiltIn && !t.isPreinstalled && !t.isCore).length})` }]
                : []),
            ].map((tab) => {
              const isSelected = themeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setThemeFilter(tab.id as any)}
                  className={`px-2.5 py-1 text-xs rounded-[5px] cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${
                    isSelected
                      ? 'bg-[#2a2a2a] text-white font-medium border border-[#383838]'
                      : 'bg-[#181818] text-[#888] hover:text-[#dcddde] hover:bg-[#222222] border border-[#282828] hover:border-[#333]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 bg-[#161616] px-2 py-1 rounded-md border border-[#282828] w-48">
            <Search01Icon size={12} className="text-[#666] shrink-0" />
            <input
              type="text"
              value={themeSearchQuery}
              onChange={(e) => setThemeSearchQuery(e.target.value)}
              placeholder="Search themes..."
              className="bg-transparent outline-none text-xs text-white placeholder-[var(--noether-text-faint)] w-full"
            />
          </div>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredThemes.map((theme) => {
            const isActive = (activeTheme || 'default').toLowerCase() === theme.id.toLowerCase();
            const v = theme.variables;
            return (
              <div
                key={theme.id}
                onClick={() => {
                  setActiveTheme(theme.id);
                  showToast(`Applied "${theme.name}" theme`, 'info');
                }}
                className={`group relative flex flex-col rounded-xl overflow-hidden border cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#242424] border-[var(--noether-accent)] ring-1 ring-[var(--noether-accent)] shadow-md'
                    : 'bg-[#1e1e1e] border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#222222]'
                }`}
              >
                {/* Top UI Preview Banner */}
                <div
                  className="h-14 relative w-full flex flex-col p-1.5 overflow-hidden"
                  style={{
                    background: v.topBarGradient || v.bgTopBar || '#111',
                  }}
                >
                  {/* Window mock titlebar tabs */}
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    <div
                      className="ml-2 px-2 py-0.5 rounded-t text-[9px] font-medium"
                      style={{
                        background: v.bgTabActive || v.bgMain || '#1e1e1e',
                        color: v.textPrimary || '#fff',
                      }}
                    >
                      Tab
                    </div>
                  </div>

                  {/* Simulated Sidebar + Canvas container */}
                  <div className="flex-1 flex gap-1 mt-1 rounded overflow-hidden">
                    <div
                      className="w-1/4 h-full rounded-sm"
                      style={{
                        background: v.sidebarGradient || v.bgSidebar || '#141414',
                      }}
                    />
                    <div
                      className="flex-1 h-full rounded-sm flex items-center justify-between px-2"
                      style={{
                        background: v.mainGradient || v.bgMain || '#1e1e1e',
                      }}
                    >
                      <div
                        className="w-12 h-1 rounded"
                        style={{ background: v.borderBase || 'rgba(255,255,255,0.1)' }}
                      />
                      <div
                        className="w-2.5 h-2.5 rounded-full shadow-xs"
                        style={{ background: accentColor || v.accent || '#eb584d' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3 flex flex-col justify-between flex-1 gap-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white group-hover:text-[var(--noether-accent)]">
                        {theme.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {theme.hasGradient && (
                          <span className="text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                            Gradient
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded ${
                            theme.type === 'light'
                              ? 'bg-amber-950/50 text-amber-300 border border-amber-800/30'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700/50'
                          }`}
                        >
                          {theme.type}
                        </span>
                      </div>
                    </div>

                    {theme.description && (
                      <p className="text-[11px] text-[#777] mt-0.5 line-clamp-1">
                        {theme.description}
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Status & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#262626]">
                    <span className="text-[10px] text-[#666]">
                      By {theme.author || 'Noether'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {!theme.isBuiltIn && !theme.isPreinstalled && !theme.isCore && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete custom theme "${theme.name}"?`)) {
                              themeRegistry.deleteCustomTheme(theme.id);
                              setThemesVersion((prev) => prev + 1);
                              if (isActive) setActiveTheme('default');
                              showToast(`Deleted theme "${theme.name}"`, 'info');
                            }
                          }}
                          title="Delete custom theme"
                          className="p-1 text-[#777] hover:text-rose-400 hover:bg-[#2a2a2a] rounded cursor-pointer"
                        >
                          <Delete02Icon size={13} />
                        </button>
                      )}

                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--noether-accent)]">
                          <CheckIcon size={12} />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#777] group-hover:text-[#ccc]">
                          Click to apply
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Section 3: CSS Snippets */}
      <SettingSection
        tabName="Appearance"
        sectionName="CSS snippets"
        defaultHeading="CSS snippets"
      >
        <SettingRow
          title="CSS snippets"
          description="Manage your custom CSS snippet files for granular appearance modifications."
          keywords={['css', 'snippets', 'custom', 'styles']}
          onClick={handleOpenExtensionsFolder}
        >
          <div className="flex items-center gap-1 text-xs text-[#888]">
            <FolderOpenIcon size={14} className="mr-1" />
            <span>Open Snippets Folder</span>
            <ChevronRightIcon size={14} />
          </div>
        </SettingRow>
      </SettingSection>

      {/* Modal: Create Custom Theme */}
      {isCreatingTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-[#1c1c1c] border border-[#333] rounded-xl shadow-2xl p-5 flex flex-col gap-4 text-xs text-[#dcddde]">
            <div className="flex items-center justify-between pb-2 border-b border-[#282828]">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <SparklesIcon size={16} className="text-[var(--noether-accent)]" />
                <span>Create Custom Theme</span>
              </h4>
              <button
                onClick={() => setIsCreatingTheme(false)}
                className="text-[#777] hover:text-white p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Live Theme Preview Strip */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-[#888] font-medium uppercase tracking-wider">
                Live Palette Preview
              </span>
              <div
                className="h-16 rounded-lg border border-[#333] p-2 flex flex-col justify-between overflow-hidden"
                style={{
                  background: newThemeHasGradient ? newThemeTopbarGradient : newThemeTopbar,
                }}
              >
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                  <div
                    className="px-2 py-0.5 rounded text-[10px] font-medium"
                    style={{ background: newThemeMain, color: '#fff' }}
                  >
                    Tab
                  </div>
                </div>
                <div className="flex gap-1.5 h-6">
                  <div
                    className="w-16 rounded flex items-center justify-center text-[9px] text-white/50"
                    style={{ background: newThemeSidebar }}
                  >
                    Sidebar
                  </div>
                  <div
                    className="flex-1 rounded flex items-center justify-between px-2 text-[9px] text-white/50"
                    style={{ background: newThemeMain }}
                  >
                    <span>Canvas</span>
                    <div
                      className="w-3 h-3 rounded-full shadow-xs"
                      style={{ background: newThemeAccent }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[#888]">Theme Name</label>
                <input
                  type="text"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder="e.g. Neon Emerald"
                  className="bg-[#141414] border border-[#2a2a2a] focus:border-[var(--noether-accent)] rounded px-2.5 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[#888]">Base Mode</label>
                <CustomSelect
                  value={newThemeType}
                  onChange={(val) => setNewThemeType(val as 'dark' | 'light')}
                  options={[
                    { value: 'dark', label: 'Dark' },
                    { value: 'light', label: 'Light' },
                  ]}
                  className="w-full"
                  buttonClassName="w-full justify-between"
                />
              </div>
            </div>

            {/* Gradient Toggle */}
            <div className="flex items-center justify-between p-2 bg-[#161616] rounded border border-[#282828]">
              <div className="flex flex-col">
                <span className="text-xs text-white">Enable Top Bar Gradient</span>
                <span className="text-[10px] text-[#666]">
                  Use a custom linear gradient for the top navigation bar.
                </span>
              </div>
              <ToggleSwitch
                checked={newThemeHasGradient}
                onChange={setNewThemeHasGradient}
              />
            </div>

            {newThemeHasGradient && (
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[#888]">Top Bar Gradient CSS</label>
                <input
                  type="text"
                  value={newThemeTopbarGradient}
                  onChange={(e) => setNewThemeTopbarGradient(e.target.value)}
                  placeholder="linear-gradient(135deg, ...)"
                  className="bg-[#141414] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                />
              </div>
            )}

            {/* Color Palette Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-2 bg-[#161616] rounded border border-[#282828]">
                <span className="text-xs">Top Bar Color</span>
                <ColorPicker value={newThemeTopbar} onChange={setNewThemeTopbar} />
              </div>
              <div className="flex items-center justify-between p-2 bg-[#161616] rounded border border-[#282828]">
                <span className="text-xs">Sidebar Color</span>
                <ColorPicker value={newThemeSidebar} onChange={setNewThemeSidebar} />
              </div>
              <div className="flex items-center justify-between p-2 bg-[#161616] rounded border border-[#282828]">
                <span className="text-xs">Main Canvas</span>
                <ColorPicker value={newThemeMain} onChange={setNewThemeMain} />
              </div>
              <div className="flex items-center justify-between p-2 bg-[#161616] rounded border border-[#282828]">
                <span className="text-xs">Accent Color</span>
                <ColorPicker value={newThemeAccent} onChange={setNewThemeAccent} />
              </div>
            </div>

            {/* Custom CSS (optional) */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#888]">Custom CSS Snippet (Optional)</label>
              <textarea
                rows={2}
                value={newThemeCss}
                onChange={(e) => setNewThemeCss(e.target.value)}
                placeholder=".cm-editor { ... }"
                className="bg-[#141414] border border-[#2a2a2a] rounded p-2 text-xs text-white font-mono outline-none resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#282828]">
              <button
                type="button"
                onClick={() => setIsCreatingTheme(false)}
                className="noether-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newThemeName.trim()) {
                    showToast('Please specify a theme name', 'warning');
                    return;
                  }
                  const themeId = `custom-${Date.now()}`;
                  const customDef = themeRegistry.createCustomThemeDefinition({
                    id: themeId,
                    name: newThemeName.trim(),
                    type: newThemeType,
                    hasGradient: newThemeHasGradient,
                    author: 'You',
                    description: 'Custom user defined theme',
                    variables: {
                      bgTopBar: newThemeTopbar,
                      topBarGradient: newThemeHasGradient ? newThemeTopbarGradient : undefined,
                      bgSidebar: newThemeSidebar,
                      bgMain: newThemeMain,
                      bgCard: newThemeCard,
                      accent: newThemeAccent,
                      tabCornerFill: newThemeMain,
                      tabCornerHoverFill: newThemeCard,
                    },
                    customCss: newThemeCss.trim() || undefined,
                  });
                  themeRegistry.registerCustomTheme(customDef);
                  setThemesVersion((prev) => prev + 1);
                  setActiveTheme(themeId);
                  setIsCreatingTheme(false);
                  showToast(`Created & applied theme "${newThemeName}"`, 'success');
                }}
                className="noether-btn noether-btn-primary"
              >
                Save & Apply Theme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Import Theme JSON */}
      {isImportingTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#1c1c1c] border border-[#333] rounded-xl shadow-2xl p-5 flex flex-col gap-4 text-xs text-[#dcddde]">
            <div className="flex items-center justify-between pb-2 border-b border-[#282828]">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <Download01Icon size={16} className="text-[var(--noether-accent)]" />
                <span>Import Theme JSON</span>
              </h4>
              <button
                onClick={() => setIsImportingTheme(false)}
                className="text-[#777] hover:text-white p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-[#888]">Paste Theme JSON Specification:</label>
              <textarea
                rows={6}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='{"name": "My Theme", "type": "dark", "variables": { ... }}'
                className="bg-[#141414] border border-[#2a2a2a] rounded p-2.5 text-xs text-white font-mono outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#282828]">
              <button
                type="button"
                onClick={() => setIsImportingTheme(false)}
                className="noether-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const imported = themeRegistry.importTheme(importJsonText);
                  if (imported) {
                    setThemesVersion((prev) => prev + 1);
                    setActiveTheme(imported.id);
                    setIsImportingTheme(false);
                    setImportJsonText('');
                    showToast(`Imported & applied theme "${imported.name}"`, 'success');
                  } else {
                    showToast('Invalid theme JSON format', 'warning');
                  }
                }}
                className="noether-btn noether-btn-primary"
              >
                Import & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Font */}
      <SettingSection
        tabName="Appearance"
        sectionName="Font"
        defaultHeading="Font"
      >
        <SettingRow
          title="Interface font"
          description="Set base font for all of Noether."
          keywords={['font', 'interface', 'system font', 'typography']}
          onClick={() => onOpenFontPicker('interface')}
          resetButton={
            <FieldResetButton
              isModified={interfaceFont !== DEFAULT_SETTINGS.interfaceFont}
              onReset={() => setInterfaceFont(DEFAULT_SETTINGS.interfaceFont)}
              title="Restore default interface font (System font)"
            />
          }
        >
          <div className="flex items-center gap-2 text-xs text-[#888]">
            {interfaceFont && <span className="text-white font-medium">{interfaceFont}</span>}
            <ChevronRightIcon size={14} />
          </div>
        </SettingRow>

        <SettingRow
          title="Text font"
          description="Set font for editing and reading views."
          keywords={['font', 'text', 'reading', 'typography']}
          onClick={() => onOpenFontPicker('text')}
          resetButton={
            <FieldResetButton
              isModified={textFont !== DEFAULT_SETTINGS.textFont}
              onReset={() => setTextFont(DEFAULT_SETTINGS.textFont)}
              title="Restore default text font"
            />
          }
        >
          <div className="flex items-center gap-2 text-xs text-[#888]">
            {textFont && <span className="text-white font-medium">{textFont}</span>}
            <ChevronRightIcon size={14} />
          </div>
        </SettingRow>

        <SettingRow
          title="Monospace font"
          description="Set font for places like code blocks and frontmatter."
          keywords={['font', 'code', 'monospace', 'mono']}
          onClick={() => onOpenFontPicker('monospace')}
          resetButton={
            <FieldResetButton
              isModified={monospaceFont !== DEFAULT_SETTINGS.monospaceFont}
              onReset={() => setMonospaceFont(DEFAULT_SETTINGS.monospaceFont)}
              title="Restore default monospace font"
            />
          }
        >
          <div className="flex items-center gap-2 text-xs text-[#888]">
            {monospaceFont && <span className="text-white font-medium">{monospaceFont}</span>}
            <ChevronRightIcon size={14} />
          </div>
        </SettingRow>

        <SettingRow
          title="Font size"
          description="Font size in pixels that affects editing and reading views."
          keywords={['font', 'size', 'pixels', 'zoom']}
          resetButton={
            <FieldResetButton
              isModified={fontSize !== DEFAULT_SETTINGS.fontSize}
              onReset={() => setFontSize(DEFAULT_SETTINGS.fontSize)}
              title="Restore default font size (16px)"
            />
          }
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#dcddde] w-4 text-right font-normal">{fontSize}</span>
            <Slider
              min={12}
              max={24}
              value={fontSize}
              onChange={setFontSize}
              className="w-28"
            />
          </div>
        </SettingRow>

        <SettingRow
          title="Quick font size adjustment"
          description="Adjust the font size using Ctrl + Scroll, or using the trackpad pinch-zoom gesture."
          keywords={['scroll', 'zoom', 'wheel', 'font', 'trackpad', 'pinch']}
          resetButton={
            <FieldResetButton
              isModified={quickFontSize !== DEFAULT_SETTINGS.quickFontSize}
              onReset={() => setQuickFontSize(DEFAULT_SETTINGS.quickFontSize)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={quickFontSize} onChange={setQuickFontSize} />
        </SettingRow>
      </SettingSection>

      {/* Section 5: Advanced */}
      <SettingSection
        tabName="Appearance"
        sectionName="Advanced"
        defaultHeading="Advanced"
      >
        <SettingRow
          title="Custom app icon"
          description="Set a custom icon for the app."
          keywords={['app icon', 'icon', 'logo', 'custom']}
        >
          <button
            onClick={() => showToast('Custom app icon feature active', 'info')}
            className="noether-btn"
          >
            Choose
          </button>
        </SettingRow>
      </SettingSection>
    </div>
  );
});

// ==========================================
// TAB: INTERFACE
// ==========================================
const InterfaceTab: React.FC = React.memo(() => {
  const showTabTitleBar = useSettingsStore((s) => s.showTabTitleBar);
  const setShowTabTitleBar = useSettingsStore((s) => s.setShowTabTitleBar);
  const restoreTabs = useSettingsStore((s) => s.restoreTabs);
  const setRestoreTabs = useSettingsStore((s) => s.setRestoreTabs);
  const showRibbon = useSettingsStore((s) => s.showRibbon);
  const setShowRibbon = useSettingsStore((s) => s.setShowRibbon);
  const zoomLevel = useSettingsStore((s) => s.zoomLevel);
  const setZoomLevel = useSettingsStore((s) => s.setZoomLevel);
  const nativeMenus = useSettingsStore((s) => s.nativeMenus);
  const setNativeMenus = useSettingsStore((s) => s.setNativeMenus);
  const windowFrameStyle = useSettingsStore((s) => s.windowFrameStyle);
  const setWindowFrameStyle = useSettingsStore((s) => s.setWindowFrameStyle);
  const openSettingsInNewWindow = useSettingsStore((s) => s.openSettingsInNewWindow);
  const setOpenSettingsInNewWindow = useSettingsStore((s) => s.setOpenSettingsInNewWindow);
  const restoreTabDefaults = useSettingsStore((s) => s.restoreTabDefaults);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const isInterfaceModified =
    showTabTitleBar !== DEFAULT_SETTINGS.showTabTitleBar ||
    restoreTabs !== DEFAULT_SETTINGS.restoreTabs ||
    showRibbon !== DEFAULT_SETTINGS.showRibbon ||
    zoomLevel !== DEFAULT_SETTINGS.zoomLevel ||
    nativeMenus !== DEFAULT_SETTINGS.nativeMenus ||
    windowFrameStyle !== DEFAULT_SETTINGS.windowFrameStyle ||
    openSettingsInNewWindow !== DEFAULT_SETTINGS.openSettingsInNewWindow;

  return (
    <div className="flex flex-col gap-6">
      <SettingSection
        tabName="Interface"
        sectionName="Interface"
        defaultDescription="Window frame, ribbon, tab bar, and UI zooming."
        isModified={isInterfaceModified}
        onReset={() => {
          restoreTabDefaults('interface');
          showToast('Restored Interface settings to default', 'info');
        }}
        resetTitle="Restore default interface settings"
      >
        {/* Show tab title bar */}
        <SettingRow
          title="Show tab title bar"
          description="Display the header at the top of every tab."
          keywords={['tab', 'strip', 'titlebar', 'tabs', 'header']}
          resetButton={
            <FieldResetButton
              isModified={showTabTitleBar !== DEFAULT_SETTINGS.showTabTitleBar}
              onReset={() => setShowTabTitleBar(DEFAULT_SETTINGS.showTabTitleBar)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={showTabTitleBar} onChange={setShowTabTitleBar} />
        </SettingRow>

        {/* Restore open tabs on startup */}
        <SettingRow
          title="Restore open tabs"
          description="Automatically restore your open tabs and split panes when restarting or reloading the app."
          keywords={['restore', 'session', 'startup', 'tabs', 'split panes']}
          resetButton={
            <FieldResetButton
              isModified={restoreTabs !== DEFAULT_SETTINGS.restoreTabs}
              onReset={() => setRestoreTabs(DEFAULT_SETTINGS.restoreTabs)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={restoreTabs} onChange={setRestoreTabs} />
        </SettingRow>

        {/* Show Action Rail */}
        <SettingRow
          title="Show Action Rail"
          description="Display vertical action toolbar on the side of the window."
          keywords={['action rail', 'rail', 'sidebar', 'panel', 'toolbar']}
          resetButton={
            <FieldResetButton
              isModified={showRibbon !== DEFAULT_SETTINGS.showRibbon}
              onReset={() => setShowRibbon(DEFAULT_SETTINGS.showRibbon)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={showRibbon} onChange={setShowRibbon} />
        </SettingRow>

        {/* Action rail configuration */}
        <SettingRow
          title="Action rail configuration"
          description="Configure what commands appear in the action rail."
          keywords={['action rail', 'commands', 'configure']}
          onClick={() => showToast('Action Rail configuration', 'info')}
        >
          <ChevronRightIcon size={14} className="text-[#777]" />
        </SettingRow>
      </SettingSection>

      {/* Section: Advanced */}
      <SettingSection
        tabName="Interface"
        sectionName="Advanced"
        defaultHeading="Advanced"
      >
        {/* Zoom level */}
        <SettingRow
          title="Zoom level"
          description="Controls the overall zoom level of the app."
          keywords={['zoom', 'scale', 'ui', 'display', 'size']}
          resetButton={
            <FieldResetButton
              isModified={zoomLevel !== DEFAULT_SETTINGS.zoomLevel}
              onReset={() => setZoomLevel(DEFAULT_SETTINGS.zoomLevel, true)}
              title="Restore default zoom level (100%)"
            />
          }
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#dcddde] w-10 text-right font-normal">{zoomLevel}%</span>
            <Slider
              min={75}
              max={150}
              step={5}
              value={zoomLevel}
              onChange={(val) => setZoomLevel(val, true)}
              className="w-28"
            />
          </div>
        </SettingRow>

        {/* Native menus */}
        <SettingRow
          title="Native menus"
          description="Menus throughout the app will match the operating system. They will not be affected by your theme."
          keywords={['native menus', 'context menu', 'os', 'menus']}
          resetButton={
            <FieldResetButton
              isModified={nativeMenus !== DEFAULT_SETTINGS.nativeMenus}
              onReset={() => setNativeMenus(DEFAULT_SETTINGS.nativeMenus)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch checked={nativeMenus} onChange={setNativeMenus} />
        </SettingRow>

        {/* Window frame style */}
        <SettingRow
          title="Window frame style"
          description="Determines the styling of the title bar of Noether windows. Requires a full restart to take effect."
          keywords={['frame', 'window', 'titlebar', 'borders', 'native']}
          resetButton={
            <FieldResetButton
              isModified={windowFrameStyle !== DEFAULT_SETTINGS.windowFrameStyle}
              onReset={() => setWindowFrameStyle(DEFAULT_SETTINGS.windowFrameStyle)}
              title="Restore default (Hidden)"
            />
          }
        >
          <CustomSelect
            value={windowFrameStyle}
            onChange={setWindowFrameStyle}
            options={[
              { value: 'Hidden (default)', label: 'Hidden (default)' },
              { value: 'Native', label: 'Native' },
            ]}
          />
        </SettingRow>

        {/* Open settings in new window */}
        <SettingRow
          title="Open settings in new window"
          description="Open settings in its own window instead of embedded in the app."
          keywords={['window', 'settings', 'modal', 'separate', 'standalone']}
          resetButton={
            <FieldResetButton
              isModified={openSettingsInNewWindow !== DEFAULT_SETTINGS.openSettingsInNewWindow}
              onReset={() => setOpenSettingsInNewWindow(DEFAULT_SETTINGS.openSettingsInNewWindow)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={openSettingsInNewWindow} onChange={setOpenSettingsInNewWindow} />
        </SettingRow>
      </SettingSection>
    </div>
  );
});

// ==========================================
// TAB: EDITOR
// ==========================================
const EditorTab: React.FC = React.memo(() => {
  const { searchQuery } = useContext(SettingsSearchContext);
  const defaultTabMode = useSettingsStore((s) => s.defaultTabMode);
  const setDefaultTabMode = useSettingsStore((s) => s.setDefaultTabMode);
  const defaultEditingMode = useSettingsStore((s) => s.defaultEditingMode);
  const setDefaultEditingMode = useSettingsStore((s) => s.setDefaultEditingMode);
  const showModeInStatusBar = useSettingsStore((s) => s.showModeInStatusBar);
  const setShowModeInStatusBar = useSettingsStore((s) => s.setShowModeInStatusBar);
  const showWordCountInStatusBar = useSettingsStore((s) => s.showWordCountInStatusBar);
  const setShowWordCountInStatusBar = useSettingsStore((s) => s.setShowWordCountInStatusBar);
  const showCharCountInStatusBar = useSettingsStore((s) => s.showCharCountInStatusBar);
  const setShowCharCountInStatusBar = useSettingsStore((s) => s.setShowCharCountInStatusBar);
  const showReadingTimeInStatusBar = useSettingsStore((s) => s.showReadingTimeInStatusBar);
  const setShowReadingTimeInStatusBar = useSettingsStore((s) => s.setShowReadingTimeInStatusBar);
  const inlineTitle = useSettingsStore((s) => s.inlineTitle);
  const setInlineTitle = useSettingsStore((s) => s.setInlineTitle);
  const readableLineLength = useSettingsStore((s) => s.readableLineLength);
  const setReadableLineLength = useSettingsStore((s) => s.setReadableLineLength);
  const strictLineBreaks = useSettingsStore((s) => s.strictLineBreaks);
  const setStrictLineBreaks = useSettingsStore((s) => s.setStrictLineBreaks);
  const propertiesInDoc = useSettingsStore((s) => s.propertiesInDoc);
  const setPropertiesInDoc = useSettingsStore((s) => s.setPropertiesInDoc);
  const foldHeading = useSettingsStore((s) => s.foldHeading);
  const setFoldHeading = useSettingsStore((s) => s.setFoldHeading);
  const foldIndent = useSettingsStore((s) => s.foldIndent);
  const setFoldIndent = useSettingsStore((s) => s.setFoldIndent);
  const lineNumbers = useSettingsStore((s) => s.lineNumbers);
  const setLineNumbers = useSettingsStore((s) => s.setLineNumbers);
  const indentationGuides = useSettingsStore((s) => s.indentationGuides);
  const setIndentationGuides = useSettingsStore((s) => s.setIndentationGuides);
  const accentListPrefixes = useSettingsStore((s) => s.accentListPrefixes);
  const setAccentListPrefixes = useSettingsStore((s) => s.setAccentListPrefixes);
  const autoPairing = useSettingsStore((s) => s.autoPairing);
  const setAutoPairing = useSettingsStore((s) => s.setAutoPairing);
  const autoPairMath = useSettingsStore((s) => s.autoPairMath);
  const setAutoPairMath = useSettingsStore((s) => s.setAutoPairMath);
  const tabSize = useSettingsStore((s) => s.tabSize);
  const setTabSize = useSettingsStore((s) => s.setTabSize);
  const showExternalLinkIcon = useSettingsStore((s) => s.showExternalLinkIcon);
  const setShowExternalLinkIcon = useSettingsStore((s) => s.setShowExternalLinkIcon);
  const spellcheck = useSettingsStore((s) => s.spellcheck);
  const setSpellcheck = useSettingsStore((s) => s.setSpellcheck);
  const colorLinksWithAccent = useSettingsStore((s) => s.colorLinksWithAccent);
  const setColorLinksWithAccent = useSettingsStore((s) => s.setColorLinksWithAccent);
  const blueLinks = useSettingsStore((s) => s.blueLinks);
  const setBlueLinks = useSettingsStore((s) => s.setBlueLinks);
  const underlineLinks = useSettingsStore((s) => s.underlineLinks);
  const setUnderlineLinks = useSettingsStore((s) => s.setUnderlineLinks);
  const matchLinkUnderlineColor = useSettingsStore((s) => s.matchLinkUnderlineColor);
  const setMatchLinkUnderlineColor = useSettingsStore((s) => s.setMatchLinkUnderlineColor);
  const restoreTabDefaults = useSettingsStore((s) => s.restoreTabDefaults);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const isEditorModified =
    defaultTabMode !== DEFAULT_SETTINGS.defaultTabMode ||
    defaultEditingMode !== DEFAULT_SETTINGS.defaultEditingMode ||
    showModeInStatusBar !== DEFAULT_SETTINGS.showModeInStatusBar ||
    showWordCountInStatusBar !== DEFAULT_SETTINGS.showWordCountInStatusBar ||
    showCharCountInStatusBar !== DEFAULT_SETTINGS.showCharCountInStatusBar ||
    showReadingTimeInStatusBar !== DEFAULT_SETTINGS.showReadingTimeInStatusBar ||
    inlineTitle !== DEFAULT_SETTINGS.inlineTitle ||
    readableLineLength !== DEFAULT_SETTINGS.readableLineLength ||
    strictLineBreaks !== DEFAULT_SETTINGS.strictLineBreaks ||
    propertiesInDoc !== DEFAULT_SETTINGS.propertiesInDoc ||
    foldHeading !== DEFAULT_SETTINGS.foldHeading ||
    foldIndent !== DEFAULT_SETTINGS.foldIndent ||
    lineNumbers !== DEFAULT_SETTINGS.lineNumbers ||
    indentationGuides !== DEFAULT_SETTINGS.indentationGuides ||
    accentListPrefixes !== DEFAULT_SETTINGS.accentListPrefixes ||
    autoPairing !== DEFAULT_SETTINGS.autoPairing ||
    autoPairMath !== DEFAULT_SETTINGS.autoPairMath ||
    tabSize !== DEFAULT_SETTINGS.tabSize ||
    showExternalLinkIcon !== DEFAULT_SETTINGS.showExternalLinkIcon ||
    spellcheck !== DEFAULT_SETTINGS.spellcheck ||
    colorLinksWithAccent !== DEFAULT_SETTINGS.colorLinksWithAccent ||
    blueLinks !== DEFAULT_SETTINGS.blueLinks ||
    underlineLinks !== DEFAULT_SETTINGS.underlineLinks ||
    matchLinkUnderlineColor !== DEFAULT_SETTINGS.matchLinkUnderlineColor;

  return (
    <div className="flex flex-col gap-6">
      <SettingSection
        tabName="Editor"
        sectionName="Editor"
        defaultDescription="View modes, typing behavior, line length, and auto-pairing."
        isModified={isEditorModified}
        onReset={() => {
          restoreTabDefaults('editor');
          showToast('Restored Editor settings to default', 'info');
        }}
        resetTitle="Restore default editor settings"
      >
        {/* Default view for new tabs */}
        <SettingRow
          title="Default view for new tabs"
          description="The default view that a new Markdown tab gets opened in."
          keywords={['view', 'reading', 'editing', 'new tab', 'markdown']}
          resetButton={
            <FieldResetButton
              isModified={defaultTabMode !== DEFAULT_SETTINGS.defaultTabMode}
              onReset={() => setDefaultTabMode(DEFAULT_SETTINGS.defaultTabMode)}
              title="Restore default (Editing view)"
            />
          }
        >
          <CustomSelect
            value={defaultTabMode}
            onChange={(val) => setDefaultTabMode(val as DefaultTabMode)}
            options={[
              { value: 'Editing view', label: 'Editing view' },
              { value: 'Reading view', label: 'Reading view' },
            ]}
          />
        </SettingRow>

        {/* Default editing mode */}
        <SettingRow
          title="Default editing mode"
          description="The default editing mode a new tab will start with."
          keywords={['live preview', 'source mode', 'editing', 'mode']}
          resetButton={
            <FieldResetButton
              isModified={defaultEditingMode !== DEFAULT_SETTINGS.defaultEditingMode}
              onReset={() => setDefaultEditingMode(DEFAULT_SETTINGS.defaultEditingMode)}
              title="Restore default (Live Preview)"
            />
          }
        >
          <CustomSelect
            value={defaultEditingMode}
            onChange={(val) => setDefaultEditingMode(val as DefaultEditingMode)}
            options={[
              { value: 'Live Preview', label: 'Live Preview' },
              { value: 'Source mode', label: 'Source mode' },
            ]}
          />
        </SettingRow>

        {/* Show editing mode in status bar */}
        <SettingRow
          title="Show editing mode in status bar"
          description="Show the editing mode toggle in the status bar."
          keywords={['status bar', 'mode', 'editing']}
          resetButton={
            <FieldResetButton
              isModified={showModeInStatusBar !== DEFAULT_SETTINGS.showModeInStatusBar}
              onReset={() => setShowModeInStatusBar(DEFAULT_SETTINGS.showModeInStatusBar)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={showModeInStatusBar} onChange={setShowModeInStatusBar} />
        </SettingRow>

        {/* Show word count in status bar */}
        <SettingRow
          title="Show word count in status bar"
          description="Show the word count of the current note in the status bar."
          keywords={['word count', 'status bar', 'words']}
          resetButton={
            <FieldResetButton
              isModified={showWordCountInStatusBar !== DEFAULT_SETTINGS.showWordCountInStatusBar}
              onReset={() => setShowWordCountInStatusBar(DEFAULT_SETTINGS.showWordCountInStatusBar)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={showWordCountInStatusBar} onChange={setShowWordCountInStatusBar} />
        </SettingRow>

        {/* Show character count in status bar */}
        <SettingRow
          title="Show character count in status bar"
          description="Show the character count of the current note in the status bar."
          keywords={['character count', 'status bar', 'characters']}
          resetButton={
            <FieldResetButton
              isModified={showCharCountInStatusBar !== DEFAULT_SETTINGS.showCharCountInStatusBar}
              onReset={() => setShowCharCountInStatusBar(DEFAULT_SETTINGS.showCharCountInStatusBar)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch checked={showCharCountInStatusBar} onChange={setShowCharCountInStatusBar} />
        </SettingRow>

        {/* Show reading time in status bar */}
        <SettingRow
          title="Show reading time in status bar"
          description="Show estimated reading time of the current note in the status bar."
          keywords={['reading time', 'status bar', 'minutes']}
          resetButton={
            <FieldResetButton
              isModified={showReadingTimeInStatusBar !== DEFAULT_SETTINGS.showReadingTimeInStatusBar}
              onReset={() => setShowReadingTimeInStatusBar(DEFAULT_SETTINGS.showReadingTimeInStatusBar)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch checked={showReadingTimeInStatusBar} onChange={setShowReadingTimeInStatusBar} />
        </SettingRow>
      </SettingSection>

      {/* Section: Display */}
      <SettingSection
        tabName="Editor"
        sectionName="Display"
        defaultHeading="Display"
      >
        {/* Inline title */}
        <SettingRow
          title="Inline title"
          description="Display the filename as an editable title inline with the file contents."
          keywords={['inline title', 'title', 'filename', 'header']}
          resetButton={
            <FieldResetButton
              isModified={inlineTitle !== DEFAULT_SETTINGS.inlineTitle}
              onReset={() => setInlineTitle(DEFAULT_SETTINGS.inlineTitle)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={inlineTitle} onChange={setInlineTitle} />
        </SettingRow>

        {/* Readable line length */}
        <SettingRow
          title="Readable line length"
          description="Limit maximum line length. Less content fits onscreen, but long blocks of text are more readable."
          keywords={['line length', 'readable', 'width', 'margins']}
          resetButton={
            <FieldResetButton
              isModified={readableLineLength !== DEFAULT_SETTINGS.readableLineLength}
              onReset={() => setReadableLineLength(DEFAULT_SETTINGS.readableLineLength)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={readableLineLength} onChange={setReadableLineLength} />
        </SettingRow>

        {/* Strict line breaks */}
        <SettingRow
          title="Strict line breaks"
          description="Markdown specs ignore single line breaks in reading view. Turn this off to make single line breaks visible."
          keywords={['line breaks', 'markdown', 'enter', 'newline']}
          resetButton={
            <FieldResetButton
              isModified={strictLineBreaks !== DEFAULT_SETTINGS.strictLineBreaks}
              onReset={() => setStrictLineBreaks(DEFAULT_SETTINGS.strictLineBreaks)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch checked={strictLineBreaks} onChange={setStrictLineBreaks} />
        </SettingRow>

        {/* Properties in document */}
        <SettingRow
          title="Properties in document"
          description="Choose how properties are displayed at the top of notes. Select “source” to show properties as raw YAML."
          keywords={['properties', 'frontmatter', 'yaml', 'metadata']}
          resetButton={
            <FieldResetButton
              isModified={propertiesInDoc !== DEFAULT_SETTINGS.propertiesInDoc}
              onReset={() => setPropertiesInDoc(DEFAULT_SETTINGS.propertiesInDoc)}
              title="Restore default (Visible)"
            />
          }
        >
          <CustomSelect
            value={propertiesInDoc}
            onChange={(val) => setPropertiesInDoc(val as any)}
            options={[
              { value: 'Visible', label: 'Visible' },
              { value: 'Hidden', label: 'Hidden' },
              { value: 'Source', label: 'Source' },
            ]}
          />
        </SettingRow>

        {/* Fold heading */}
        <SettingRow
          title="Fold heading"
          description="Lets you fold all content under a heading."
          keywords={['fold', 'heading', 'collapse', 'outline']}
          resetButton={
            <FieldResetButton
              isModified={foldHeading !== DEFAULT_SETTINGS.foldHeading}
              onReset={() => setFoldHeading(DEFAULT_SETTINGS.foldHeading)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={foldHeading} onChange={setFoldHeading} />
        </SettingRow>

        {/* Fold indent */}
        <SettingRow
          title="Fold indent"
          description="Lets you fold part of an indentation, such as lists."
          keywords={['fold', 'indent', 'list', 'collapse']}
          resetButton={
            <FieldResetButton
              isModified={foldIndent !== DEFAULT_SETTINGS.foldIndent}
              onReset={() => setFoldIndent(DEFAULT_SETTINGS.foldIndent)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={foldIndent} onChange={setFoldIndent} />
        </SettingRow>

        {/* Line numbers */}
        <SettingRow
          title="Line numbers"
          description="Show line numbers in the gutter."
          keywords={['line numbers', 'gutter', 'numbers']}
          resetButton={
            <FieldResetButton
              isModified={lineNumbers !== DEFAULT_SETTINGS.lineNumbers}
              onReset={() => setLineNumbers(DEFAULT_SETTINGS.lineNumbers)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch checked={lineNumbers} onChange={setLineNumbers} />
        </SettingRow>

        {/* Indentation guides */}
        <SettingRow
          title="Indentation guides"
          description="Show vertical relationship lines between list items."
          keywords={['indentation', 'guides', 'lines', 'vertical']}
          resetButton={
            <FieldResetButton
              isModified={indentationGuides !== DEFAULT_SETTINGS.indentationGuides}
              onReset={() => setIndentationGuides(DEFAULT_SETTINGS.indentationGuides)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={indentationGuides} onChange={setIndentationGuides} />
        </SettingRow>

        {/* Accent number & list markers */}
        <SettingRow
          title="Accent number & list markers"
          description="Recolor list numbers and bullets with your theme's dimmed accent color."
          keywords={['accent', 'list', 'bullet', 'markers', 'numbers']}
          resetButton={
            <FieldResetButton
              isModified={accentListPrefixes !== DEFAULT_SETTINGS.accentListPrefixes}
              onReset={() => setAccentListPrefixes(DEFAULT_SETTINGS.accentListPrefixes)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch checked={accentListPrefixes} onChange={setAccentListPrefixes} />
        </SettingRow>

        {/* Auto pairing */}
        <SettingRow
          title="Auto-pair brackets and quotes"
          description="Automatically pair [[wikilinks]], ((blocks)), and markdown syntax."
          keywords={['auto-pair', 'brackets', 'quotes', 'wikilinks']}
          resetButton={
            <FieldResetButton
              isModified={autoPairing !== DEFAULT_SETTINGS.autoPairing}
              onReset={() => setAutoPairing(DEFAULT_SETTINGS.autoPairing)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={autoPairing} onChange={setAutoPairing} />
        </SettingRow>

        {/* Auto-pair math formulas */}
        <SettingRow
          title="Auto-pair math formulas"
          description="Automatically wrap selections in math or open the math editor when typing $. When disabled, typing $ inserts a literal dollar sign, but typing double dollars ($$) will still open a math formula."
          keywords={['math', 'formulas', 'latex', 'dollar', 'auto-pair']}
          resetButton={
            <FieldResetButton
              isModified={autoPairMath !== DEFAULT_SETTINGS.autoPairMath}
              onReset={() => setAutoPairMath(DEFAULT_SETTINGS.autoPairMath)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch checked={autoPairMath} onChange={setAutoPairMath} />
        </SettingRow>

        {/* Show external link icon */}
        <SettingRow
          title="Show external link icon"
          description="Display an external link icon next to links in rendered markdown notes."
          keywords={['external link', 'icon', 'url', 'http']}
          resetButton={
            <FieldResetButton
              isModified={showExternalLinkIcon !== DEFAULT_SETTINGS.showExternalLinkIcon}
              onReset={() => setShowExternalLinkIcon(DEFAULT_SETTINGS.showExternalLinkIcon)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch checked={showExternalLinkIcon} onChange={setShowExternalLinkIcon} />
        </SettingRow>

        {/* Color all links with accent color */}
        <SettingRow
          title="Color all links with accent color"
          description="Display markdown links, wikilinks, and document links using your active accent color."
          keywords={['links', 'accent', 'color', 'wikilink']}
          resetButton={
            <FieldResetButton
              isModified={colorLinksWithAccent !== DEFAULT_SETTINGS.colorLinksWithAccent}
              onReset={() => setColorLinksWithAccent(DEFAULT_SETTINGS.colorLinksWithAccent)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={colorLinksWithAccent} onChange={setColorLinksWithAccent} />
        </SettingRow>

        {/* Classic blue links */}
        <SettingRow
          title="Classic blue links"
          className={colorLinksWithAccent ? 'opacity-40' : ''}
          description={
            <>
              {highlightMatch(
                'Display links in standard browser blue with purple visited links instead of neutral text color.',
                searchQuery
              )}
              {colorLinksWithAccent && ' (Disabled while accent color is active)'}
            </>
          }
          descriptionText="Display links in standard browser blue with purple visited links instead of neutral text color."
          keywords={['blue links', 'classic', 'browser', 'color']}
          resetButton={
            <FieldResetButton
              isModified={!colorLinksWithAccent && blueLinks !== DEFAULT_SETTINGS.blueLinks}
              onReset={() => setBlueLinks(DEFAULT_SETTINGS.blueLinks)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch
            checked={blueLinks}
            onChange={setBlueLinks}
            disabled={colorLinksWithAccent}
            title={colorLinksWithAccent ? 'Disabled while accent-colored links are enabled' : undefined}
          />
        </SettingRow>

        {/* Underline links */}
        <SettingRow
          title="Underline links"
          description="Display underlines under links. When turned off, underlines only appear on hover."
          keywords={['underline', 'links', 'hover']}
          resetButton={
            <FieldResetButton
              isModified={underlineLinks !== DEFAULT_SETTINGS.underlineLinks}
              onReset={() => setUnderlineLinks(DEFAULT_SETTINGS.underlineLinks)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={underlineLinks} onChange={setUnderlineLinks} />
        </SettingRow>

        {/* Match underline color to link */}
        <SettingRow
          title="Match underline color to link"
          className={!underlineLinks ? 'opacity-40' : ''}
          description={
            <>
              {highlightMatch(
                'Color the underline to match the link text color instead of the subtle border color.',
                searchQuery
              )}
              {!underlineLinks && ' (Disabled while link underlines are turned off)'}
            </>
          }
          descriptionText="Color the underline to match the link text color instead of the subtle border color."
          keywords={['match', 'underline', 'color']}
          resetButton={
            <FieldResetButton
              isModified={underlineLinks && matchLinkUnderlineColor !== DEFAULT_SETTINGS.matchLinkUnderlineColor}
              onReset={() => setMatchLinkUnderlineColor(DEFAULT_SETTINGS.matchLinkUnderlineColor)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch
            checked={matchLinkUnderlineColor}
            onChange={setMatchLinkUnderlineColor}
            disabled={!underlineLinks}
            title={!underlineLinks ? 'Disabled while link underlines are turned off' : undefined}
          />
        </SettingRow>

        {/* Spellcheck */}
        <SettingRow
          title="Spellcheck"
          description="Highlight spelling mistakes and typos with red wavy underlines in the editor."
          keywords={['spellcheck', 'spelling', 'typo', 'grammar']}
          resetButton={
            <FieldResetButton
              isModified={spellcheck !== DEFAULT_SETTINGS.spellcheck}
              onReset={() => setSpellcheck(DEFAULT_SETTINGS.spellcheck)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={spellcheck} onChange={setSpellcheck} />
        </SettingRow>

        {/* Tab indent size */}
        <SettingRow
          title="Tab indent size"
          description="Number of spaces when pressing Tab key."
          keywords={['tab', 'indent', 'spaces', 'size']}
          resetButton={
            <FieldResetButton
              isModified={tabSize !== DEFAULT_SETTINGS.tabSize}
              onReset={() => setTabSize(DEFAULT_SETTINGS.tabSize)}
              title="Restore default (5 spaces)"
            />
          }
        >
          <CustomSelect
            value={tabSize}
            onChange={(val) => setTabSize(val as any)}
            options={[
              { value: '2', label: '2 spaces' },
              { value: '3', label: '3 spaces' },
              { value: '4', label: '4 spaces' },
              { value: '5', label: '5 spaces' },
              { value: '6', label: '6 spaces' },
              { value: '7', label: '7 spaces' },
              { value: '8', label: '8 spaces' },
            ]}
          />
        </SettingRow>
      </SettingSection>
    </div>
  );
});

// ==========================================
// TAB: FILES AND LINKS
// ==========================================
interface FilesTabProps {
  onOpenTrash: () => void;
}

const FilesTab: React.FC<FilesTabProps> = React.memo(({ onOpenTrash }) => {
  const vaultName = useWorkspaceStore((s) => s.vaultName);
  const vaultPath = useWorkspaceStore((s) => s.vaultPath);
  const renameVault = useWorkspaceStore((s) => s.renameVault);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);

  const trashItems = useDocumentStore((s) => s.trashItems);
  const loadTrash = useDocumentStore((s) => s.loadTrash);
  const emptyAllTrash = useDocumentStore((s) => s.emptyAllTrash);

  const skipDeleteConfirmation = useSettingsStore((s) => s.skipDeleteConfirmation);
  const setSkipDeleteConfirmation = useSettingsStore((s) => s.setSkipDeleteConfirmation);
  const skipRenameConfirmation = useSettingsStore((s) => s.skipRenameConfirmation);
  const setSkipRenameConfirmation = useSettingsStore((s) => s.setSkipRenameConfirmation);
  const closeTabsOnDelete = useSettingsStore((s) => s.closeTabsOnDelete);
  const setCloseTabsOnDelete = useSettingsStore((s) => s.setCloseTabsOnDelete);
  const newNoteLocation = useSettingsStore((s) => s.newNoteLocation);
  const setNewNoteLocation = useSettingsStore((s) => s.setNewNoteLocation);
  const attachmentFolder = useSettingsStore((s) => s.attachmentFolder);
  const setAttachmentFolder = useSettingsStore((s) => s.setAttachmentFolder);
  const showBrokenEmbedIndicators = useSettingsStore((s) => s.showBrokenEmbedIndicators);
  const setShowBrokenEmbedIndicators = useSettingsStore((s) => s.setShowBrokenEmbedIndicators);
  const linkFormat = useSettingsStore((s) => s.linkFormat);
  const setLinkFormat = useSettingsStore((s) => s.setLinkFormat);
  const autoUpdateLinks = useSettingsStore((s) => s.autoUpdateLinks);
  const setAutoUpdateLinks = useSettingsStore((s) => s.setAutoUpdateLinks);
  const promptFolderSelection = useWorkspaceStore((s) => s.promptFolderSelection);
  const setIsSettingsOpen = useWorkspaceStore((s) => s.setIsSettingsOpen);
  const restoreTabDefaults = useSettingsStore((s) => s.restoreTabDefaults);

  const [tempVaultName, setTempVaultName] = useState(vaultName);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  useEffect(() => {
    setTempVaultName(vaultName);
  }, [vaultName]);

  const handleSaveVaultName = useCallback(async () => {
    if (tempVaultName.trim()) {
      const res = await renameVault(vaultPath, tempVaultName.trim());
      if (!res?.success) {
        setTempVaultName(vaultName);
      }
    }
  }, [tempVaultName, vaultPath, renameVault, vaultName]);

  const handlePickAttachmentFolder = useCallback(() => {
    promptFolderSelection({
      title: 'Click on a folder for attachments',
      allowRoot: true,
      onSelect: (folderPath) => {
        setAttachmentFolder(folderPath);
        setIsSettingsOpen(true, 'files');
        showToast(folderPath ? `Attachment location set to "${folderPath}"` : 'Attachment location set to Vault root', 'success');
      },
      onCancel: () => {
        setIsSettingsOpen(true, 'files');
      },
    });
  }, [promptFolderSelection, setAttachmentFolder, setIsSettingsOpen, showToast]);

  const isFilesModified =
    skipDeleteConfirmation !== DEFAULT_SETTINGS.skipDeleteConfirmation ||
    skipRenameConfirmation !== DEFAULT_SETTINGS.skipRenameConfirmation ||
    closeTabsOnDelete !== DEFAULT_SETTINGS.closeTabsOnDelete ||
    newNoteLocation !== DEFAULT_SETTINGS.newNoteLocation ||
    attachmentFolder !== DEFAULT_SETTINGS.attachmentFolder ||
    showBrokenEmbedIndicators !== DEFAULT_SETTINGS.showBrokenEmbedIndicators ||
    linkFormat !== DEFAULT_SETTINGS.linkFormat ||
    autoUpdateLinks !== DEFAULT_SETTINGS.autoUpdateLinks;

  return (
    <div className="flex flex-col gap-6">
      {/* Section: Vault config */}
      <SettingSection
        tabName="Files and links"
        sectionName="Vault"
        defaultDescription="Vault management, link formats, and internal link syncing."
        isModified={isFilesModified}
        onReset={() => {
          restoreTabDefaults('files');
          showToast('Restored Files & links settings to default', 'info');
        }}
        resetTitle="Restore default files & links settings"
      >
        <SettingRow
          title="Vault name"
          description="Change the display name of this Vault."
          keywords={['vault', 'name', 'rename']}
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tempVaultName}
              onChange={(e) => setTempVaultName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveVaultName();
              }}
              className="bg-[#2a2a2a] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none w-44 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]"
            />
            {tempVaultName !== vaultName && (
              <button
                onClick={handleSaveVaultName}
                className="noether-btn noether-btn-primary"
              >
                Save
              </button>
            )}
          </div>
        </SettingRow>

        <SettingRow
          title="Close tabs when files are deleted"
          description="Automatically close open tabs when their file is deleted. When turned off, dead tabs remain open as error views."
          keywords={['close tab', 'delete', 'trash', 'dead tabs']}
          resetButton={
            <FieldResetButton
              isModified={closeTabsOnDelete !== DEFAULT_SETTINGS.closeTabsOnDelete}
              onReset={() => {
                setCloseTabsOnDelete(DEFAULT_SETTINGS.closeTabsOnDelete);
                useWorkspaceStore.getState().cleanUpDeadTabs();
              }}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch
            checked={closeTabsOnDelete}
            onChange={(val) => {
              setCloseTabsOnDelete(val);
              if (val) {
                useWorkspaceStore.getState().cleanUpDeadTabs();
              }
            }}
          />
        </SettingRow>

        <SettingRow
          title="Skip delete confirmation"
          description="Delete notes and folders immediately without prompting."
          keywords={['confirm', 'delete', 'trash', 'dialog', 'prompt']}
          resetButton={
            <FieldResetButton
              isModified={skipDeleteConfirmation !== DEFAULT_SETTINGS.skipDeleteConfirmation}
              onReset={() => setSkipDeleteConfirmation(DEFAULT_SETTINGS.skipDeleteConfirmation)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch
            checked={skipDeleteConfirmation}
            onChange={setSkipDeleteConfirmation}
          />
        </SettingRow>

        <SettingRow
          title="Skip rename on duplicate confirmation"
          description="Automatically rename duplicate items (e.g. Note (1)) when moving without prompting."
          keywords={['confirm', 'rename', 'dialog', 'duplicate', 'prompt']}
          resetButton={
            <FieldResetButton
              isModified={skipRenameConfirmation !== DEFAULT_SETTINGS.skipRenameConfirmation}
              onReset={() => setSkipRenameConfirmation(DEFAULT_SETTINGS.skipRenameConfirmation)}
              title="Restore default (Disabled)"
            />
          }
        >
          <ToggleSwitch
            checked={skipRenameConfirmation}
            onChange={setSkipRenameConfirmation}
          />
        </SettingRow>
      </SettingSection>

      {/* Section: Default location */}
      <SettingSection
        tabName="Files and links"
        sectionName="Default location for new notes"
        defaultHeading="Default location for new notes"
      >
        {/* New note location */}
        <SettingRow
          title="New note location"
          description="Where newly created notes are placed."
          keywords={['new note', 'location', 'root', 'same folder']}
          resetButton={
            <FieldResetButton
              isModified={newNoteLocation !== DEFAULT_SETTINGS.newNoteLocation}
              onReset={() => setNewNoteLocation(DEFAULT_SETTINGS.newNoteLocation)}
              title="Restore default (Vault root)"
            />
          }
        >
          <CustomSelect
            value={newNoteLocation}
            onChange={(val) => setNewNoteLocation(val as NewNoteLocation)}
            options={[
              { value: 'root', label: 'Vault root folder' },
              { value: 'same', label: 'Same folder as current file' },
            ]}
          />
        </SettingRow>

        {/* New attachment location */}
        <SettingRow
          title="Default location for new attachments"
          description="Folder where pasted images and media attachments are placed (leave blank for Vault root)."
          keywords={['attachment', 'images', 'media', 'folder', 'pasted']}
          resetButton={
            <FieldResetButton
              isModified={attachmentFolder !== DEFAULT_SETTINGS.attachmentFolder}
              onReset={() => setAttachmentFolder(DEFAULT_SETTINGS.attachmentFolder)}
              title="Restore default (Vault root)"
            />
          }
        >
          <button
            type="button"
            onClick={handlePickAttachmentFolder}
            className="noether-btn text-xs py-1 px-2.5 flex items-center gap-2 group"
            title="Click to select folder in File Explorer"
          >
            <Folder01Icon size={13} className="text-[#888] group-hover:text-white" />
            <span className="max-w-[130px] truncate text-[#dcddde]">
              {attachmentFolder ? attachmentFolder : 'Vault root ( / )'}
            </span>
            <span className="text-[10px] text-[#888] group-hover:text-[#ccc] bg-[#282828] px-1.5 py-0.5 rounded border border-[#383838]">
              Set
            </span>
          </button>
        </SettingRow>

        {/* Missing attachment indicators */}
        <SettingRow
          title="Missing attachment indicators"
          description="Display a yellow dot on files and containing folders in the navigation bar when an embedded image or file is missing."
          keywords={['broken embed', 'missing', 'asset', 'warning', 'indicator']}
          resetButton={
            <FieldResetButton
              isModified={showBrokenEmbedIndicators !== DEFAULT_SETTINGS.showBrokenEmbedIndicators}
              onReset={() => setShowBrokenEmbedIndicators(DEFAULT_SETTINGS.showBrokenEmbedIndicators)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch
            checked={showBrokenEmbedIndicators}
            onChange={setShowBrokenEmbedIndicators}
          />
        </SettingRow>

        {/* New link format */}
        <SettingRow
          title="New link format"
          description="How wikilinks like [[Target]] are formatted."
          keywords={['link format', 'shortest', 'relative', 'absolute', 'wikilink']}
          resetButton={
            <FieldResetButton
              isModified={linkFormat !== DEFAULT_SETTINGS.linkFormat}
              onReset={() => setLinkFormat(DEFAULT_SETTINGS.linkFormat)}
              title="Restore default (Shortest path)"
            />
          }
        >
          <CustomSelect
            value={linkFormat}
            onChange={(val) => setLinkFormat(val as LinkFormat)}
            options={[
              { value: 'shortest', label: 'Shortest path when possible' },
              { value: 'relative', label: 'Relative path from file' },
              { value: 'absolute', label: 'Absolute path in Vault' },
            ]}
          />
        </SettingRow>

        {/* Auto update links */}
        <SettingRow
          title="Automatically update internal links"
          description="Update internal links when a note is renamed or moved."
          keywords={['auto update', 'links', 'rename', 'move', 'backlinks']}
          resetButton={
            <FieldResetButton
              isModified={autoUpdateLinks !== DEFAULT_SETTINGS.autoUpdateLinks}
              onReset={() => setAutoUpdateLinks(DEFAULT_SETTINGS.autoUpdateLinks)}
              title="Restore default (Enabled)"
            />
          }
        >
          <ToggleSwitch checked={autoUpdateLinks} onChange={setAutoUpdateLinks} />
        </SettingRow>
      </SettingSection>

      {/* Section: Trash */}
      <SettingSection
        tabName="Files and links"
        sectionName="Trash"
        defaultHeading="Trash"
      >
        <SettingRow
          title="Open trash"
          description="View and restore deleted files and folders. Items are automatically cleared after 48 hours."
          keywords={['trash', 'deleted', 'restore', 'recover']}
          onClick={async () => {
            await loadTrash();
            onOpenTrash();
          }}
        >
          <div className="flex items-center gap-2 text-xs text-[#888]">
            <span className="text-white font-medium">
              {trashItems.length} {trashItems.length === 1 ? 'item' : 'items'}
            </span>
            <ChevronRightIcon size={14} />
          </div>
        </SettingRow>

        <SettingRow
          title="Empty trash"
          description="Permanently delete all items currently in trash."
          keywords={['empty trash', 'purge', 'permanent', 'destroy']}
        >
          <button
            disabled={trashItems.length === 0}
            onClick={() => {
              openConfirmDialog({
                title: 'Empty Trash',
                message: 'Are you sure you want to permanently delete all items in the trash?',
                subtext: 'All deleted files and folders will be permanently destroyed.',
                confirmText: 'Empty Trash',
                isDanger: true,
                onConfirm: async () => {
                  await emptyAllTrash();
                },
              });
            }}
            className="noether-btn noether-btn-danger flex items-center gap-1.5"
          >
            <Delete02Icon size={12} />
            <span>Empty Trash</span>
          </button>
        </SettingRow>
      </SettingSection>
    </div>
  );
});

// ==========================================
// TAB: HOTKEYS
// ==========================================
const HotkeysTab: React.FC = React.memo(() => {
  const app = useNoetherApp();
  const allCommands = useCommands();
  const customHotkeys = useSettingsStore((s) => s.customHotkeys);
  const setCustomHotkey = useSettingsStore((s) => s.setCustomHotkey);
  const resetCustomHotkey = useSettingsStore((s) => s.resetCustomHotkey);
  const resetAllHotkeys = useSettingsStore((s) => s.resetAllHotkeys);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const { searchQuery, showAllOccurrences } = useContext(SettingsSearchContext);

  const [recordingCommandId, setRecordingCommandId] = useState<string | null>(null);

  // Hotkey recording effect
  useEffect(() => {
    if (!recordingCommandId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setRecordingCommandId(null);
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        resetCustomHotkey(recordingCommandId);
        setRecordingCommandId(null);
        showToast('Reset shortcut to default', 'info');
        return;
      }

      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');

      let keyName = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (keyName === ' ') keyName = 'Space';
      parts.push(keyName);
      const newHotkey = parts.join('+');

      setCustomHotkey(recordingCommandId, newHotkey);
      setRecordingCommandId(null);
      showToast(`Assigned shortcut: ${newHotkey}`, 'success');
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingCommandId, setCustomHotkey, resetCustomHotkey, showToast]);

  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return allCommands;
    const q = searchQuery.toLowerCase().trim();
    return allCommands.filter((cmd) => {
      const cmdTitle = typeof cmd.title === 'function' ? cmd.title(app) : cmd.title;
      return (
        cmdTitle.toLowerCase().includes(q) ||
        (cmd.section && cmd.section.toLowerCase().includes(q)) ||
        (cmd.hotkey && cmd.hotkey.toLowerCase().includes(q)) ||
        'hotkeys'.includes(q) ||
        'shortcuts'.includes(q)
      );
    });
  }, [allCommands, searchQuery, app]);

  if (showAllOccurrences && searchQuery.trim() && filteredCommands.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {showAllOccurrences && searchQuery.trim() ? (
        <div className="flex items-center justify-between px-4 mb-1">
          <div>
            <h3 className="text-sm font-semibold text-white mb-0.5">
              {highlightMatch('Hotkeys', searchQuery)}
            </h3>
            <p className="text-[11px] text-[var(--noether-text-muted)]">
              {highlightMatch('Hotkeys', searchQuery)}
            </p>
          </div>
          {Object.keys(customHotkeys).length > 0 && (
            <button
              onClick={() => {
                resetAllHotkeys();
                showToast('Reset all customized shortcuts to defaults', 'info');
              }}
              className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
              title="Reset all customized shortcuts to defaults"
            >
              <RotateCcwIcon size={12} />
              <span>Reset all</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-4">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Hotkeys</h3>
            <p className="text-[11px] text-[#777]">View and customize keyboard shortcuts across all commands.</p>
          </div>
          {Object.keys(customHotkeys).length > 0 && (
            <button
              onClick={() => {
                resetAllHotkeys();
                showToast('Reset all customized shortcuts to defaults', 'info');
              }}
              className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
              title="Reset all customized shortcuts to defaults"
            >
              <RotateCcwIcon size={12} />
              <span>Reset all</span>
            </button>
          )}
        </div>
      )}

      {recordingCommandId && (
        <div
          style={{ borderColor: 'var(--noether-accent, #eb584d)' }}
          className="mx-4 p-3 bg-[#242424] border rounded-xl flex items-center justify-between text-xs text-white"
        >
          <span>Press your desired key combination (e.g. <b>Ctrl+Shift+K</b>)...</span>
          <button
            onClick={() => setRecordingCommandId(null)}
            className="noether-btn text-xs !py-0.5 !px-2"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828] mt-1">
        {filteredCommands.map((cmd) => {
          const cmdTitle = typeof cmd.title === 'function' ? cmd.title(app) : cmd.title;
          const activeHotkey = customHotkeys[cmd.id] !== undefined ? customHotkeys[cmd.id] : cmd.hotkey;
          const isCustomized = customHotkeys[cmd.id] !== undefined;
          const isRecording = recordingCommandId === cmd.id;

          return (
            <div
              key={cmd.id}
              className="p-3.5 flex items-center justify-between hover:bg-[#242424]/40"
            >
              <div className="flex flex-col">
                <span className="text-[13px] font-normal text-white">
                  {highlightMatch(cmdTitle, searchQuery)}
                </span>
                {cmd.section && (
                  <span className="text-[10px] text-[#666] uppercase mt-0.5">
                    {highlightMatch(cmd.section, searchQuery)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isCustomized && (
                  <button
                    onClick={() => {
                      resetCustomHotkey(cmd.id);
                      showToast(`Reset shortcut for "${cmdTitle}"`, 'info');
                    }}
                    title="Reset to default"
                    className="text-[10px] text-[#777] hover:text-white p-1 hover:bg-[#282828] rounded-[4px] cursor-pointer"
                  >
                    <RotateCcwIcon size={12} />
                  </button>
                )}
                {isRecording ? (
                  <span
                    style={{
                      backgroundColor: 'var(--noether-accent-subtle, rgba(235, 88, 77,0.2))',
                      borderColor: 'var(--noether-accent, #eb584d)',
                      color: 'var(--noether-accent, #eb584d)',
                    }}
                    className="px-2.5 py-1 border text-xs font-mono rounded-[5px] animate-pulse"
                  >
                    Press keys...
                  </span>
                ) : activeHotkey ? (
                  <button
                    onClick={() => setRecordingCommandId(cmd.id)}
                    title="Click to reassign hotkey"
                    className="noether-btn text-xs font-mono text-[#bbb] hover:text-white py-1 px-2.5"
                  >
                    {activeHotkey}
                  </button>
                ) : (
                  <button
                    onClick={() => setRecordingCommandId(cmd.id)}
                    className="text-[11px] text-[#777] hover:text-white px-2 py-1 rounded-[5px] hover:bg-[#2a2a2a] cursor-pointer"
                  >
                    + Assign
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// Helper: match tab ID flexibly by exact ID, extensionId, subId, or prefix
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

// ==========================================
// TAB: CORE EXTENSIONS
// ==========================================
interface CoreExtensionsTabProps {
  onNavigateTab: (tabId: string) => void;
  onClose?: () => void;
}

const CoreExtensionsTab: React.FC<CoreExtensionsTabProps> = React.memo(({ onNavigateTab, onClose }) => {
  const app = useNoetherApp();
  const extensionList = useExtensionList();
  const allSettingTabs = useSettingTabs();
  const { searchQuery, showAllOccurrences } = useContext(SettingsSearchContext);

  const coreExtensionTabs = useMemo(() => {
    return allSettingTabs.filter((tab) => {
      const extId = tab.extensionId || tab.id.split(':')[0];
      const manifest = app.extensions.getExtensionManifest(extId);
      return manifest?.isCore === true;
    });
  }, [allSettingTabs, app]);

  const filteredCore = useMemo(() => {
    if (!searchQuery.trim()) return extensionList.core;
    const q = searchQuery.toLowerCase().trim();
    return extensionList.core.filter((ext) => {
      return (
        ext.name.toLowerCase().includes(q) ||
        (ext.description && ext.description.toLowerCase().includes(q)) ||
        ext.id.toLowerCase().includes(q) ||
        'built-in extensions'.includes(q) ||
        'core extensions'.includes(q)
      );
    });
  }, [extensionList.core, searchQuery]);

  const handleToggleExtension = useCallback(async (extensionId: string) => {
    const isEnabled = app.extensions.isExtensionEnabled(extensionId);
    if (isEnabled) {
      await app.extensions.disableExtension(extensionId);
    } else {
      await app.extensions.enableExtension(extensionId);
    }
  }, [app]);

  if (showAllOccurrences && searchQuery.trim() && filteredCore.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {showAllOccurrences && searchQuery.trim() ? (
        <div className="px-4 mb-1">
          <h3 className="text-sm font-semibold text-white mb-0.5">
            {highlightMatch('Built-in extensions', searchQuery)}
          </h3>
          <p className="text-[11px] text-[var(--noether-text-muted)]">
            {highlightMatch('Built-in extensions', searchQuery)}
          </p>
        </div>
      ) : (
        <div className="px-4">
          <h3 className="text-sm font-semibold text-white mb-1">Built-in extensions</h3>
          <p className="text-[11px] text-[#777]">
            Built-in features designed as modular extensions. Toggle them anytime.
          </p>
        </div>
      )}

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828] mt-1">
        {filteredCore.map((ext) => {
          const isEnabled = app.extensions.isExtensionEnabled(ext.id);
          const settingsTab = coreExtensionTabs.find((tab) => isTabMatch(tab, ext.id));
          return (
            <div
              key={ext.id}
              className="p-3.5 flex items-center justify-between hover:bg-[#242424]/40"
            >
              <div className="flex-1 pr-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-normal text-white">
                    {highlightMatch(ext.name, searchQuery)}
                  </span>
                  <span className="text-[11px] text-[#777] font-normal">v{ext.version}</span>
                </div>
                {ext.description && (
                  <p className="text-[11px] text-[#777] mt-0.5 leading-relaxed">
                    {highlightMatch(ext.description, searchQuery)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {ext.readme && (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('noether_open_extension_doc', JSON.stringify({ extensionId: ext.id, title: ext.name, timestamp: Date.now() }));
                      useWorkspaceStore.getState().openExtensionDocTab(ext.id, ext.name);
                      if (onClose) {
                        onClose();
                      } else {
                        useWorkspaceStore.getState().setIsSettingsOpen(false);
                        if (platform.isDesktop()) {
                          platform.closeSettingsWindow();
                        }
                      }
                    }}
                    title={`View ${ext.name} README`}
                    className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#777] hover:text-[#dcddde] hover:bg-[#2a2a2a] cursor-pointer"
                  >
                    <BookOpen01Icon size={14} />
                  </button>
                )}
                {isEnabled && settingsTab && (
                  <button
                    onClick={() => onNavigateTab(settingsTab.id)}
                    title={`${ext.name} options`}
                    className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#777] hover:text-[#dcddde] hover:bg-[#2a2a2a] cursor-pointer"
                  >
                    <Settings02Icon size={15} />
                  </button>
                )}
                <ToggleSwitch
                  checked={isEnabled}
                  onChange={() => handleToggleExtension(ext.id)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ==========================================
// TAB: COMMUNITY EXTENSIONS
// ==========================================
interface CommunityExtensionsTabProps {
  onNavigateTab: (tabId: string) => void;
  onClose?: () => void;
}

const CommunityExtensionsTab: React.FC<CommunityExtensionsTabProps> = React.memo(({ onNavigateTab, onClose }) => {
  const app = useNoetherApp();
  const extensionList = useExtensionList();
  const allSettingTabs = useSettingTabs();
  const showToast = useWorkspaceStore((s) => s.showToast);
  const openConfirmDialog = useWorkspaceStore((s) => s.openConfirmDialog);
  const { searchQuery, showAllOccurrences } = useContext(SettingsSearchContext);

  const communityExtensionTabs = useMemo(() => {
    return allSettingTabs.filter((tab) => {
      const extId = tab.extensionId || tab.id.split(':')[0];
      const manifest = app.extensions.getExtensionManifest(extId);
      return !manifest || manifest.isCore !== true;
    });
  }, [allSettingTabs, app]);

  const filteredCommunity = useMemo(() => {
    if (!searchQuery.trim()) return extensionList.community;
    const q = searchQuery.toLowerCase().trim();
    return extensionList.community.filter((ext) => {
      return (
        ext.name.toLowerCase().includes(q) ||
        (ext.description && ext.description.toLowerCase().includes(q)) ||
        ext.id.toLowerCase().includes(q) ||
        (ext.author && ext.author.toLowerCase().includes(q)) ||
        'community extensions'.includes(q)
      );
    });
  }, [extensionList.community, searchQuery]);

  const handleToggleExtension = useCallback(async (extensionId: string) => {
    const isEnabled = app.extensions.isExtensionEnabled(extensionId);
    if (isEnabled) {
      await app.extensions.disableExtension(extensionId);
    } else {
      await app.extensions.enableExtension(extensionId);
    }
  }, [app]);

  const handleUninstallExtension = useCallback((ext: { id: string; name: string }) => {
    openConfirmDialog({
      title: 'Uninstall Extension',
      message: `Are you sure you want to uninstall "${ext.name}"?`,
      subtext: 'This will remove the extension files from disk, reset its settings, and drop its database tables.',
      confirmText: 'Uninstall',
      isDanger: true,
      onConfirm: async () => {
        const ok = await app.extensions.uninstallExtension(ext.id);
        if (ok) {
          showToast(`Uninstalled "${ext.name}"`, 'info');
        } else {
          showToast(`Failed to uninstall "${ext.name}"`, 'warning');
        }
      },
    });
  }, [app, openConfirmDialog, showToast]);

  const handleOpenExtensionsFolder = useCallback(() => {
    if (platform.isDesktop()) {
      platform.openExtensionsFolder();
    } else {
      showToast('Extensions folder: .noether/extensions/ inside Vault', 'info');
    }
  }, [showToast]);

  const handleReloadExtensions = useCallback(async () => {
    await app.extensions.refreshCommunityExtensions();
    showToast('Reloaded extensions from disk', 'success');
  }, [app, showToast]);

  const [updaterTick, setUpdaterTick] = useState(0);
  useEffect(() => {
    return app.extensions.updater.subscribe(() => {
      setUpdaterTick((t) => t + 1);
    });
  }, [app]);

  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const availableUpdates = app.extensions.updater.getAvailableUpdates();

  const handleCheckUpdates = useCallback(async () => {
    setIsCheckingUpdates(true);
    try {
      const updates = await app.extensions.updater.checkForUpdates();
      if (updates.length > 0) {
        showToast(`Found ${updates.length} extension update${updates.length > 1 ? 's' : ''}`, 'info');
      } else {
        showToast('All community extensions are up to date', 'success');
      }
    } catch (err) {
      console.error('[CommunityExtensionsTab] Failed to check for updates:', err);
      showToast('Failed to check for extension updates', 'warning');
    } finally {
      setIsCheckingUpdates(false);
    }
  }, [app, showToast]);

  const handleUpdateAll = useCallback(async () => {
    await app.extensions.updater.updateAll();
  }, [app]);

  const handleUpdateExtension = useCallback(
    async (id: string) => {
      await app.extensions.updater.updateExtension(id);
    },
    [app]
  );

  if (showAllOccurrences && searchQuery.trim() && filteredCommunity.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {showAllOccurrences && searchQuery.trim() ? (
        <div className="px-4 mb-1">
          <h3 className="text-sm font-semibold text-white mb-0.5">
            {highlightMatch('Community extensions', searchQuery)}
          </h3>
          <p className="text-[11px] text-[var(--noether-text-muted)]">
            {highlightMatch('Community extensions', searchQuery)}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Community extensions</h3>
            <p className="text-[11px] text-[#777]">
              Installed community extensions in your Vault.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {availableUpdates.length > 0 && (
              <button
                onClick={handleUpdateAll}
                className="noether-btn noether-btn-primary flex items-center gap-1.5"
              >
                <Download01Icon size={12} />
                <span>Update all ({availableUpdates.length})</span>
              </button>
            )}
            <button
              onClick={handleCheckUpdates}
              disabled={isCheckingUpdates || app.extensions.updater.checking}
              className="noether-btn flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcwIcon
                size={12}
                className={isCheckingUpdates || app.extensions.updater.checking ? 'animate-spin' : ''}
              />
              <span>{isCheckingUpdates || app.extensions.updater.checking ? 'Checking...' : 'Check for updates'}</span>
            </button>
            <button
              onClick={handleReloadExtensions}
              className="noether-btn flex items-center gap-1.5"
            >
              <RotateCcwIcon size={12} />
              <span>Reload</span>
            </button>
            <button
              onClick={handleOpenExtensionsFolder}
              className="noether-btn flex items-center gap-1.5"
            >
              <FolderOpenIcon size={12} />
              <span>Open extensions folder</span>
            </button>
          </div>
        </div>
      )}

      {filteredCommunity.length > 0 ? (
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828] mt-1">
          {filteredCommunity.map((ext) => {
            const isEnabled = app.extensions.isExtensionEnabled(ext.id);
            const communityTab = communityExtensionTabs.find((t) => isTabMatch(t, ext.id));
            const updateInfo = app.extensions.updater.getUpdate(ext.id);
            const isUpdating = app.extensions.updater.isUpdating(ext.id);
            return (
              <div
                key={ext.id}
                className="p-3.5 flex items-center justify-between hover:bg-[#242424]/40"
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-normal text-white">
                      {highlightMatch(ext.name, searchQuery)}
                    </span>
                    <span className="text-[11px] text-[#777] font-normal">v{ext.version}</span>
                    {ext.author && (
                      <span className="text-[10px] text-[#777]">
                        by {highlightMatch(ext.author, searchQuery)}
                      </span>
                    )}
                  </div>
                  {ext.description && (
                    <p className="text-[11px] text-[#777] mt-0.5 leading-relaxed">
                      {highlightMatch(ext.description, searchQuery)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {updateInfo && (
                    <button
                      type="button"
                      onClick={() => handleUpdateExtension(ext.id)}
                      disabled={isUpdating}
                      className="noether-btn noether-btn-primary text-[11px] !py-1 !px-2.5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Download01Icon size={12} className={isUpdating ? 'animate-bounce' : ''} />
                      <span>{isUpdating ? 'Updating...' : `Update to v${updateInfo.latestVersion}`}</span>
                    </button>
                  )}
                  {ext.readme && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('noether_open_extension_doc', JSON.stringify({ extensionId: ext.id, title: ext.name, timestamp: Date.now() }));
                        useWorkspaceStore.getState().openExtensionDocTab(ext.id, ext.name);
                        if (onClose) {
                          onClose();
                        } else {
                          useWorkspaceStore.getState().setIsSettingsOpen(false);
                          if (platform.isDesktop()) {
                            platform.closeSettingsWindow();
                          }
                        }
                      }}
                      title={`View ${ext.name} README`}
                      className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#777] hover:text-[#dcddde] hover:bg-[#2a2a2a] cursor-pointer"
                    >
                      <BookOpen01Icon size={14} />
                    </button>
                  )}
                  {isEnabled && communityTab && (
                    <button
                      onClick={() => onNavigateTab(communityTab.id)}
                      title={`${ext.name} options`}
                      className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#777] hover:text-[#dcddde] hover:bg-[#2a2a2a] cursor-pointer"
                    >
                      <Settings02Icon size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleUninstallExtension(ext)}
                    title={`Uninstall ${ext.name}`}
                    className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#777] hover:text-[#f85153] hover:bg-[#2a2a2a] cursor-pointer"
                  >
                    <Delete02Icon size={14} />
                  </button>
                  <ToggleSwitch
                    checked={isEnabled}
                    onChange={() => handleToggleExtension(ext.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-8 text-center mt-1 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--noether-accent)]/10 border border-[var(--noether-accent)]/20 flex items-center justify-center text-[var(--noether-accent)] mb-3 shadow-xs">
            <Store01Icon size={24} />
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">Discover Community Extensions</h4>
          <p className="text-xs text-[#888] max-w-md leading-relaxed mb-5">
            Extend Noether with community extensions for enhanced workflows, visualizations, and integrations.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                useWorkspaceStore.getState().openCustomTab({
                  viewType: 'marketplace',
                  title: 'Community Extensions',
                  icon: <Store01Icon size={14} />,
                });
                useWorkspaceStore.getState().setIsSettingsOpen(false);
                if (platform.isDesktop()) {
                  platform.closeSettingsWindow();
                }
              }}
              className="noether-btn noether-btn-primary flex items-center gap-2 !py-2 !px-4"
            >
              <Store01Icon size={14} />
              <span>Browse Extension Marketplace</span>
            </button>
            <button
              onClick={handleOpenExtensionsFolder}
              className="noether-btn flex items-center gap-1.5 !py-2 !px-3.5"
            >
              Open extensions folder
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export interface SettingsWindowContentProps {
  onClose?: () => void;
  isModal?: boolean;
  initialTab?: string;
}

export const SettingsWindowContent: React.FC<SettingsWindowContentProps> = React.memo(({ onClose, isModal = false, initialTab }) => {
  const app = useNoetherApp();
  const allSettingTabs = useSettingTabs();
  const allCommands = useCommands();

  const vaultName = useWorkspaceStore((s) => s.vaultName);
  const setVaultName = useWorkspaceStore((s) => s.setVaultName);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const restoreAllDefaults = useSettingsStore((s) => s.restoreAllDefaults);

  const [activeTab, setActiveTab] = useState<string>(initialTab || 'general');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllOccurrences, setShowAllOccurrences] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sub-view navigation (e.g. for Font Pickers & Trash)
  const [fontPickerMode, setFontPickerMode] = useState<'interface' | 'text' | 'monospace' | null>(null);
  const [isTrashViewOpen, setIsTrashViewOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    platform.getCurrentVault().then((data) => {
      if (data?.name) {
        setVaultName(data.name);
      }
    });
    app.extensions.init();
    dbAdapter.init().then(() => {
      useDocumentStore.getState().loadTrash();
    });
  }, [app, setVaultName]);

  useEffect(() => {
    const unsub = platform.onVaultFilesChanged(async () => {
      await dbAdapter.resetAndReload();
      useDocumentStore.getState().loadTrash();
    });
    return () => {
      unsub();
    };
  }, []);

  // When closing or unmounting Settings, apply any pending appearance/zoom updates to DOM
  useEffect(() => {
    platform.setWindowTitle(`Settings﹕${vaultName || 'Vault'}﹕Noether`);
    return () => {
      applyAppearanceDOM();
    };
  }, [vaultName]);

  const isMaximized = useIsMaximized();

  const handleMinimize = useCallback(() => {
    platform.minimize();
  }, []);

  const handleMaximize = useCallback(() => {
    platform.maximize();
  }, []);

  const handleClose = useCallback(() => {
    if (isModal && onClose) {
      onClose();
    } else if (platform.isDesktop()) {
      platform.close();
      platform.closeSettingsWindow();
    } else if (onClose) {
      onClose();
    } else {
      useWorkspaceStore.getState().setIsSettingsOpen(false);
    }
  }, [isModal, onClose]);

  // Options Sidebar Items
  const optionsItems = useMemo(() => [
    { id: 'general', label: 'General', icon: <Settings02Icon size={14} />, keywords: ['general', 'updates', 'language', 'startup'] },
    { id: 'appearance', label: 'Appearance', icon: <PaletteIcon size={14} />, keywords: ['appearance', 'theme', 'color', 'accent', 'font', 'dark', 'light'] },
    { id: 'interface', label: 'Interface', icon: <MonitorIcon size={14} />, keywords: ['interface', 'zoom', 'ribbon', 'window', 'tab', 'action rail'] },
    { id: 'editor', label: 'Editor', icon: <Edit02Icon size={14} />, keywords: ['editor', 'line', 'preview', 'indent', 'heading', 'pairing', 'properties', 'reading', 'math', 'formulas', 'dollar', 'auto-pair'] },
    { id: 'files', label: 'Files and links', icon: <Folder01Icon size={14} />, keywords: ['files and links', 'files', 'links', 'trash', 'deleted', 'delete', 'vault', 'vault', 'wikilink'] },
    { id: 'hotkeys', label: 'Hotkeys', icon: <KeyIcon size={14} />, keywords: ['hotkeys', 'shortcuts', 'keys', 'commands'] },
    { id: 'core-extensions', label: 'Built-in extensions', icon: <PackageIcon size={14} />, keywords: ['built-in extensions', 'core extensions', 'core plugins', 'plugins', 'modules', 'extensions'] },
    { id: 'community-extensions', label: 'Community extensions', icon: <PuzzleIcon size={14} />, keywords: ['community extensions', 'community plugins', 'plugins', 'marketplace', 'extensions'] },
  ], []);

  const extensionList = useExtensionList();

  // Dynamic Core & Community Extensions Setting Tabs from Registries + Enabled Extensions Fallback
  const coreExtensionTabs = useMemo(() => {
    const registered = allSettingTabs.filter((tab) => {
      const extId = tab.extensionId || tab.id.split(':')[0];
      const manifest = app.extensions.getExtensionManifest(extId);
      return manifest?.isCore === true;
    });

    const result: ExtensionSettingTab[] = [...registered];
    const enabledCoreManifests = extensionList.core.filter((m) => app.extensions.isExtensionEnabled(m.id));

    for (const manifest of enabledCoreManifests) {
      if (!result.some((t) => isTabMatch(t, manifest.id))) {
        result.push({
          id: `${manifest.id}:${manifest.id}-settings`,
          name: manifest.name,
          extensionId: manifest.id,
          icon: <PackageIcon size={14} />,
          render: () => (
            <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-5 flex flex-col gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">{manifest.name}</h4>
                <p className="text-xs text-[#888] leading-relaxed">{manifest.description}</p>
              </div>
            </div>
          ),
        });
      }
    }

    return result;
  }, [allSettingTabs, app, extensionList.core]);

  const communityExtensionTabs = useMemo(() => {
    const registered = allSettingTabs.filter((tab) => {
      const extId = tab.extensionId || tab.id.split(':')[0];
      const manifest = app.extensions.getExtensionManifest(extId);
      return !manifest || manifest.isCore !== true;
    });

    const result: ExtensionSettingTab[] = [...registered];
    const enabledCommunityManifests = extensionList.community.filter((m) => app.extensions.isExtensionEnabled(m.id));

    for (const manifest of enabledCommunityManifests) {
      if (!result.some((t) => isTabMatch(t, manifest.id))) {
        result.push({
          id: `${manifest.id}:${manifest.id}-settings`,
          name: manifest.name,
          extensionId: manifest.id,
          icon: <PuzzleIcon size={14} />,
          render: () => (
            <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-5 flex flex-col gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">{manifest.name}</h4>
                <p className="text-xs text-[#888] leading-relaxed">{manifest.description}</p>
              </div>
            </div>
          ),
        });
      }
    }

    return result;
  }, [allSettingTabs, app, extensionList.community]);

  const matchingTabIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase().trim();
    const matched = new Set<string>();
    for (const item of SETTINGS_SEARCH_INDEX) {
      if (
        item.tabName.toLowerCase().includes(q) ||
        item.sectionName.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(q)))
      ) {
        matched.add(item.tabId);
      }
    }
    const commandMatch = allCommands.some((cmd) => {
      const title = typeof cmd.title === 'function' ? cmd.title(app) : cmd.title;
      return (
        title.toLowerCase().includes(q) ||
        (cmd.section && cmd.section.toLowerCase().includes(q)) ||
        (cmd.hotkey && cmd.hotkey.toLowerCase().includes(q)) ||
        'hotkeys'.includes(q) ||
        'shortcuts'.includes(q)
      );
    });
    if (commandMatch) {
      matched.add('hotkeys');
    }
    return matched;
  }, [searchQuery, allCommands, app]);

  const hasAnyMatches = useMemo(() => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    if (matchingTabIds.size > 0) return true;
    const coreMatch = extensionList.core.some(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        'built-in extensions'.includes(q) ||
        'core extensions'.includes(q)
    );
    if (coreMatch) return true;
    const commMatch = extensionList.community.some(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        (e.author && e.author.toLowerCase().includes(q)) ||
        'community extensions'.includes(q)
    );
    if (commMatch) return true;
    return false;
  }, [searchQuery, matchingTabIds, extensionList]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return optionsItems;
    const q = searchQuery.toLowerCase().trim();
    return optionsItems.filter((i) =>
      matchingTabIds.has(i.id) ||
      i.label.toLowerCase().includes(q) ||
      i.keywords.some((k) => k.includes(q))
    );
  }, [searchQuery, optionsItems, matchingTabIds]);

  const filteredCoreExtensions = useMemo(() => {
    return coreExtensionTabs.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const extId = item.extensionId || item.id.split(':')[0];
        const manifest = app.extensions.getExtensionManifest(extId);
        const nameMatch = item.name.toLowerCase().includes(q);
        const manifestMatch =
          manifest?.name.toLowerCase().includes(q) ||
          manifest?.description?.toLowerCase().includes(q);
        return nameMatch || manifestMatch || extId.toLowerCase().includes(q);
      }
      return true;
    });
  }, [coreExtensionTabs, searchQuery, app]);

  const filteredCommunityExtensions = useMemo(() => {
    return communityExtensionTabs.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const extId = item.extensionId || item.id.split(':')[0];
        const manifest = app.extensions.getExtensionManifest(extId);
        const nameMatch = item.name.toLowerCase().includes(q);
        const manifestMatch =
          manifest?.name.toLowerCase().includes(q) ||
          manifest?.description?.toLowerCase().includes(q);
        return nameMatch || manifestMatch || extId.toLowerCase().includes(q);
      }
      return true;
    });
  }, [communityExtensionTabs, searchQuery, app]);

  const handleNavigateTab = useCallback((tabId: string) => {
    setFontPickerMode(null);
    setIsTrashViewOpen(false);
    setShowAllOccurrences(false);
    setActiveTab(tabId);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setFontPickerMode(null);
    setIsTrashViewOpen(false);
    setShowAllOccurrences(Boolean(val.trim()));
  }, []);

  const handleSearchFocusOrClick = useCallback(() => {
    if (searchQuery.trim()) {
      setFontPickerMode(null);
      setIsTrashViewOpen(false);
      setShowAllOccurrences(true);
    }
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setShowAllOccurrences(false);
    searchInputRef.current?.focus();
  }, []);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (searchQuery) {
        e.stopPropagation();
        handleClearSearch();
      }
    }
  }, [searchQuery, handleClearSearch]);

  return (
    <div
      data-card="true"
      className={`${
        isModal
          ? 'relative w-[960px] h-[660px] max-w-[calc(100%-32px)] max-h-[calc(100%-32px)] rounded-xl border border-[var(--noether-border-subtle,#2c2c2c)] shadow-2xl'
          : 'w-full h-full'
      } flex flex-col bg-[var(--noether-bg-main,#181818)] text-[var(--noether-text-secondary,#dcddde)] select-none font-sans overflow-hidden`}
    >
      {/* 1. Obsidian Window Header Bar */}
      <header
        data-tauri-drag-region
        onMouseDown={(e) => {
          if (!isModal && e.button === 0 && !(e.target as HTMLElement).closest('button, input, [data-no-drag="true"]')) {
            platform.startDragging();
          }
        }}
        onDoubleClick={(e) => {
          if (!isModal && !(e.target as HTMLElement).closest('button, input, [data-no-drag="true"]')) {
            platform.maximize();
          }
        }}
        style={{ WebkitAppRegion: isModal ? undefined : 'drag' } as React.CSSProperties}
        className="relative h-10 bg-[var(--noether-bg-topbar,#141414)] border-b border-[var(--noether-border-subtle,#242424)] flex items-center justify-between px-3 select-none z-30 shrink-0 text-xs cursor-default"
      >
        {/* Left spacer */}
        <div className={`${isModal ? 'w-11' : 'w-16'} h-full`} />

        {/* Centered Window Title: Settings / <VaultName> / Noether 0.1.0 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-medium text-xs text-[var(--noether-text-muted,#888)] flex items-center gap-1.5 select-none">
            <span className="text-[var(--noether-text-secondary,#ccc)]">Settings</span>
            <span className="text-[var(--noether-text-faint,#555)]">﹕</span>
            <span className="text-[var(--noether-text-primary)] font-medium">{vaultName || 'Noether Vault'}</span>
            <span className="text-[var(--noether-text-faint,#555)]">﹕</span>
            <span className="text-[var(--noether-text-muted,#888)]">Noether</span>
          </span>
        </div>

        {/* Top-Right Frameless Window Controls */}
        <div
          className="flex items-center h-full -mr-3 z-10"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          data-no-drag="true"
        >
          {!isModal && (
            <>
              <button
                type="button"
                data-no-drag="true"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMinimize();
                }}
                className="h-full w-11 hover:bg-[var(--noether-bg-card-hover,#252525)] text-[var(--noether-text-muted,#888)] hover:text-[var(--noether-text-primary)] flex items-center justify-center cursor-pointer"
                title="Minimize"
              >
                <WindowMinimizeIcon />
              </button>
              <button
                type="button"
                data-no-drag="true"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMaximize();
                }}
                className="h-full w-11 hover:bg-[var(--noether-bg-card-hover,#252525)] text-[var(--noether-text-muted,#888)] hover:text-[var(--noether-text-primary)] flex items-center justify-center cursor-pointer"
                title={isMaximized ? 'Restore' : 'Maximize'}
              >
                {isMaximized ? <WindowRestoreIcon /> : <WindowMaximizeIcon />}
              </button>
            </>
          )}
          <button
            type="button"
            data-no-drag="true"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="h-full w-11 hover:bg-[#e81123] text-[var(--noether-text-muted,#888)] hover:text-white flex items-center justify-center cursor-pointer"
            title="Close"
          >
            <WindowCloseIcon />
          </button>
        </div>
      </header>

      {/* 2. Main 2-Column Obsidian Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Navigation Sidebar */}
        <aside className="w-[230px] bg-[var(--noether-bg-sidebar,#141414)] border-r border-[var(--noether-border-subtle,#242424)] h-full flex flex-col p-3 shrink-0 overflow-hidden">
          {/* Search Box */}
          <div className="relative mb-3 shrink-0">
            <Search01Icon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--noether-text-muted)] pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleSearchFocusOrClick}
              onClick={handleSearchFocusOrClick}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search settings..."
              className="w-full bg-[var(--noether-bg-input)] border border-[var(--noether-border-base)] rounded-md pl-8 pr-7 py-1.5 text-xs text-[var(--noether-text-primary)] placeholder-[var(--noether-text-faint)] outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                title="Clear search (Esc)"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] cursor-pointer p-0.5"
              >
                <CancelCircleIcon size={13} />
              </button>
            )}
          </div>

          {/* Nav Categories List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1">
            {/* Section 1: Options */}
            {filteredOptions.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <div className="text-[11px] font-medium text-[var(--noether-text-muted,#666)] px-2.5 py-1">Options</div>
                {filteredOptions.map((item) => {
                  const isActive = !showAllOccurrences && (activeTab === item.id || (isTrashViewOpen && item.id === 'files')) && !fontPickerMode;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setFontPickerMode(null);
                        setIsTrashViewOpen(false);
                        setShowAllOccurrences(false);
                        setActiveTab(item.id);
                      }}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs cursor-pointer ${
                        isActive
                          ? 'bg-[var(--noether-bg-sidebar-active,#252525)] text-[var(--noether-text-primary)] font-medium shadow-xs'
                          : 'text-[var(--noether-text-secondary,#999)] hover:bg-[var(--noether-bg-sidebar-hover,#202020)] hover:text-[var(--noether-text-primary)]'
                      }`}
                    >
                      <span className={isActive ? 'text-[var(--noether-text-primary)]' : 'text-[var(--noether-text-muted,#888)]'}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Section 2: Built-in Extensions */}
            {filteredCoreExtensions.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <div className="text-[11px] font-medium text-[var(--noether-text-muted,#666)] px-2.5 py-1">Built-in extensions</div>
                {filteredCoreExtensions.map((item) => {
                  const isActive = !showAllOccurrences && isTabMatch(item, activeTab) && !fontPickerMode && !isTrashViewOpen;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setFontPickerMode(null);
                        setIsTrashViewOpen(false);
                        setShowAllOccurrences(false);
                        setActiveTab(item.id);
                      }}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs cursor-pointer ${
                        isActive
                          ? 'bg-[var(--noether-bg-sidebar-active,#252525)] text-[var(--noether-text-primary)] font-medium shadow-xs'
                          : 'text-[var(--noether-text-secondary,#999)] hover:bg-[var(--noether-bg-sidebar-hover,#202020)] hover:text-[var(--noether-text-primary)]'
                      }`}
                    >
                      <span className={isActive ? 'text-[var(--noether-text-primary)]' : 'text-[var(--noether-text-muted,#888)]'}>{item.icon || <PackageIcon size={14} />}</span>
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Section 3: Community Extensions Settings */}
            {filteredCommunityExtensions.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <div className="text-[11px] font-medium text-[var(--noether-text-muted,#666)] px-2.5 py-1">Community extensions</div>
                {filteredCommunityExtensions.map((tab) => {
                  const isActive = !showAllOccurrences && isTabMatch(tab, activeTab) && !fontPickerMode && !isTrashViewOpen;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setFontPickerMode(null);
                        setIsTrashViewOpen(false);
                        setShowAllOccurrences(false);
                        setActiveTab(tab.id);
                      }}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs cursor-pointer ${
                        isActive
                          ? 'bg-[var(--noether-bg-sidebar-active,#252525)] text-[var(--noether-text-primary)] font-medium shadow-xs'
                          : 'text-[var(--noether-text-secondary,#999)] hover:bg-[var(--noether-bg-sidebar-hover,#202020)] hover:text-[var(--noether-text-primary)]'
                      }`}
                    >
                      <span className={isActive ? 'text-[var(--noether-text-primary)]' : 'text-[var(--noether-text-muted,#888)]'}>{tab.icon || <PuzzleIcon size={14} />}</span>
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Global Reset Action */}
          <div className="pt-2 mt-auto border-t border-[var(--noether-border-subtle,#242424)] shrink-0">
            <button
              onClick={async () => {
                await app.restoreAllDefaults();
                showToast('Restored all settings and extension defaults', 'info');
              }}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-[var(--noether-text-muted,#777)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-sidebar-hover,#202020)] cursor-pointer border border-transparent hover:border-[var(--noether-border-base)]"
              title="Restore all settings across all tabs and extensions to default"
            >
              <RotateCcwIcon size={12} />
              <span>Restore all defaults</span>
            </button>
          </div>
        </aside>

        {/* RIGHT COLUMN: Tab Content */}
        <main className="flex-1 bg-[var(--noether-bg-main,#181818)] h-full overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-2xl mx-auto">
            <SettingsSearchContext.Provider value={{ searchQuery, showAllOccurrences }}>
              {showAllOccurrences && searchQuery.trim() ? (
                <div className="flex flex-col gap-6">
                  {hasAnyMatches ? (
                    <>
                      <GeneralTab />
                      <AppearanceTab onOpenFontPicker={setFontPickerMode} />
                      <InterfaceTab />
                      <EditorTab />
                      <FilesTab onOpenTrash={() => setIsTrashViewOpen(true)} />
                      <HotkeysTab />
                      <CoreExtensionsTab onNavigateTab={handleNavigateTab} onClose={handleClose} />
                      <CommunityExtensionsTab onNavigateTab={handleNavigateTab} onClose={handleClose} />
                    </>
                  ) : (
                    <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-8 text-center mt-4 flex flex-col items-center justify-center">
                      <div className="w-10 h-10 rounded-xl bg-[var(--noether-bg-card-hover)] flex items-center justify-center text-[var(--noether-text-muted)] mb-3">
                        <Search01Icon size={20} />
                      </div>
                      <h4 className="text-sm font-semibold text-white mb-1">No settings found</h4>
                      <p className="text-xs text-[var(--noether-text-muted)] max-w-sm leading-relaxed">
                        No settings matching &ldquo;<span className="text-[var(--noether-accent)]">{searchQuery}</span>&rdquo; were found.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* SUB-VIEW: FONT PICKER */}
                  {fontPickerMode && (
                    <FontPickerView
                      mode={fontPickerMode}
                      onClose={() => setFontPickerMode(null)}
                    />
                  )}

                  {/* SUB-VIEW: TRASH VIEWER */}
                  {isTrashViewOpen && (
                    <TrashView onClose={() => setIsTrashViewOpen(false)} />
                  )}

                  {/* TAB: GENERAL */}
                  {!fontPickerMode && !isTrashViewOpen && activeTab === 'general' && (
                    <GeneralTab />
                  )}

                  {/* TAB: APPEARANCE */}
                  {!fontPickerMode && !isTrashViewOpen && activeTab === 'appearance' && (
                    <AppearanceTab onOpenFontPicker={setFontPickerMode} />
                  )}

                  {/* TAB: INTERFACE */}
                  {!fontPickerMode && !isTrashViewOpen && activeTab === 'interface' && (
                    <InterfaceTab />
                  )}

                  {/* TAB: EDITOR */}
                  {!fontPickerMode && !isTrashViewOpen && activeTab === 'editor' && (
                    <EditorTab />
                  )}

                  {/* TAB: FILES AND LINKS */}
                  {!fontPickerMode && !isTrashViewOpen && activeTab === 'files' && (
                    <FilesTab onOpenTrash={() => setIsTrashViewOpen(true)} />
                  )}

                  {/* TAB: HOTKEYS */}
                  {!fontPickerMode && !isTrashViewOpen && activeTab === 'hotkeys' && (
                    <HotkeysTab />
                  )}

                  {/* TAB: CORE EXTENSIONS */}
                  {!fontPickerMode && !isTrashViewOpen && (activeTab === 'core-extensions' || activeTab === 'core-plugins') && (
                    <CoreExtensionsTab onNavigateTab={handleNavigateTab} onClose={handleClose} />
                  )}

                  {/* TAB: COMMUNITY EXTENSIONS */}
                  {!fontPickerMode && !isTrashViewOpen && (activeTab === 'community-extensions' || activeTab === 'community-plugins') && (
                    <CommunityExtensionsTab onNavigateTab={handleNavigateTab} onClose={handleClose} />
                  )}

                  {/* DYNAMIC EXTENSION SETTING TAB RENDER (CORE & COMMUNITY) */}
                  {(() => {
                    if (fontPickerMode || isTrashViewOpen) return null;
                    const BUILTIN_TABS = new Set([
                      'general', 'appearance', 'interface', 'editor', 'files', 'hotkeys',
                      'core-extensions', 'core-plugins', 'community-extensions', 'community-plugins',
                    ]);
                    if (BUILTIN_TABS.has(activeTab)) return null;

                    const currentTab =
                      allSettingTabs.find((t) => isTabMatch(t, activeTab)) ||
                      coreExtensionTabs.find((t) => isTabMatch(t, activeTab)) ||
                      communityExtensionTabs.find((t) => isTabMatch(t, activeTab));
                    const candidateId = activeTab.includes(':') ? activeTab.split(':')[0] : activeTab;
                    const manifest = currentTab
                      ? app.extensions.getExtensionManifest(currentTab.extensionId || currentTab.id.split(':')[0])
                      : (app.extensions.getExtensionManifest(candidateId) || app.extensions.getExtensionManifest(activeTab));

                    if (!currentTab && !manifest) return null;

                    const extId = currentTab?.extensionId || manifest?.id || candidateId;
                    const isEnabled = extId ? app.extensions.isExtensionEnabled(extId) : false;
                    const tabName = manifest?.name || currentTab?.name || extId;

                    return (
                      <div className="flex flex-col gap-4">
                        {/* Top Extension Header with Enabled Toggle matching CoreExtensions row design */}
                        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
                          <div className="flex-1 pr-4">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[13px] font-normal text-white">
                                {tabName}
                              </span>
                              {manifest?.version && (
                                <span className="text-[11px] text-[#777] font-normal">
                                  v{manifest.version}
                                </span>
                              )}
                            </div>
                            {manifest?.description && (
                              <p className="text-[11px] text-[#777] mt-0.5 leading-relaxed">
                                {manifest.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {currentTab?.onRestoreDefaults && isEnabled && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await currentTab.onRestoreDefaults?.();
                                  showToast(`Restored ${tabName} defaults`, 'info');
                                }}
                                title={`Restore default ${tabName} settings`}
                                className="px-2.5 py-1 rounded-[5px] flex items-center gap-1.5 text-xs text-[#888] hover:text-white hover:bg-[#2a2a2a] cursor-pointer"
                              >
                                <RotateCcwIcon size={12} />
                                <span>Restore defaults</span>
                              </button>
                            )}
                            {manifest?.readme && (
                              <button
                                type="button"
                                onClick={() => {
                                  localStorage.setItem('noether_open_extension_doc', JSON.stringify({ extensionId: extId, title: tabName, timestamp: Date.now() }));
                                  useWorkspaceStore.getState().openExtensionDocTab(extId, tabName);
                                  handleClose();
                                }}
                                title={`View ${tabName} documentation`}
                                className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#777] hover:text-[#dcddde] hover:bg-[#2a2a2a] cursor-pointer"
                              >
                                <BookOpen01Icon size={14} />
                              </button>
                            )}
                            <ToggleSwitch
                              checked={isEnabled}
                              onChange={async (val) => {
                                if (val) {
                                  await app.extensions.enableExtension(extId);
                                  showToast(`Enabled ${tabName}`, 'success');
                                } else {
                                  await app.extensions.disableExtension(extId);
                                  showToast(`Disabled ${tabName}`, 'info');
                                }
                              }}
                            />
                          </div>
                        </div>

                        {/* Extension Setting Content */}
                        {!isEnabled ? (
                          <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3">
                            <span className="text-xs text-[#888]">
                              {tabName} is currently disabled.
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                await app.extensions.enableExtension(extId);
                                showToast(`Enabled ${tabName}`, 'success');
                              }}
                              className="noether-btn noether-btn-primary"
                            >
                              Enable {tabName}
                            </button>
                          </div>
                        ) : currentTab?.render ? (
                          <div className="flex flex-col gap-4">
                            {currentTab.render()}
                          </div>
                        ) : (
                          <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-5 flex flex-col gap-2">
                            <h4 className="text-sm font-semibold text-white">{tabName}</h4>
                            <p className="text-xs text-[#888] leading-relaxed">
                              {manifest?.description || `${tabName} is enabled and active.`}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </SettingsSearchContext.Provider>
          </div>
        </main>
      </div>
    </div>
  );
});

export const SettingsWindow: React.FC<{ initialTab?: string }> = ({ initialTab }) => {
  return (
    <AppProvider app={appInstance}>
      <SettingsWindowContent initialTab={initialTab} />
    </AppProvider>
  );
};
