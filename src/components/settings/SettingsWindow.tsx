import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { appInstance } from '@/core/app/FlintApp';
import { AppProvider, useFlintApp, useExtensionList, useSettingTabs, useCommands } from '@/core/app/AppContext';
import { ExtensionSettingTab } from '@/core/extensions/types';
import { platform } from '@/lib/platform/platformAdapter';
import { dbAdapter } from '@/lib/db/adapter';

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
      className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
    >
      <RotateCcwIcon size={13} />
    </button>
  );
};

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
            className="w-full bg-[#161616] border border-[#2c2c2c] focus:border-[#444] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-[#666] outline-none"
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
          className="flex items-center gap-1.5 text-xs text-[#888] hover:text-white cursor-pointer -ml-1 w-fit transition-colors"
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
              className="px-2.5 py-1 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] border border-[#383838] hover:border-[#484848] text-[#dcddde] hover:text-white text-xs rounded-[5px] cursor-pointer flex items-center gap-1.5 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
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
              className="px-2.5 py-1 bg-[#e11d48] hover:bg-[#f43f5e] active:bg-[#be123c] text-white text-xs font-semibold rounded-[5px] border border-black/20 shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Delete02Icon size={12} />
              <span>Empty trash</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-4">
        <p className="text-xs text-[#777]">
          Items in trash are automatically cleared after 48 hours. You can restore them back to your Hearth anytime before they expire.
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
            className="w-full bg-[#161616] border border-[#2c2c2c] focus:border-[#444] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-[#666] outline-none"
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
              const isCanvas = item.doc_type === 'canvas' || item.title.toLowerCase().endsWith('.canvas');

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 hover:bg-[#242424]/60 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                    <div className="w-7 h-7 rounded-lg bg-[#282828] flex items-center justify-center text-[#999] shrink-0">
                      {item.is_folder ? (
                        <Folder01Icon size={15} />
                      ) : isCanvas ? (
                        <Layout01Icon size={15} />
                      ) : (
                        <File01Icon size={15} />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white truncate">
                          {item.title}
                        </span>
                        {isCanvas && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#333] text-[#aaa] uppercase font-semibold">
                            Canvas
                          </span>
                        )}
                        {item.is_folder ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#333] text-[#aaa] uppercase font-semibold">
                            Folder
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#666] mt-0.5 truncate">
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
                      title="Restore to Hearth"
                      className="px-2.5 py-1 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white rounded-[5px] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all border border-[#383838] hover:border-[#484848] shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
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
                      className="p-1.5 text-[#777] hover:text-rose-400 hover:bg-[#2a2a2a] rounded-[5px] cursor-pointer transition-colors"
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
  const earlyAccess = useSettingsStore((s) => s.earlyAccess);
  const setEarlyAccess = useSettingsStore((s) => s.setEarlyAccess);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const restoreTabDefaults = useSettingsStore((s) => s.restoreTabDefaults);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const isGeneralModified =
    autoUpdates !== DEFAULT_SETTINGS.autoUpdates ||
    earlyAccess !== DEFAULT_SETTINGS.earlyAccess ||
    language !== DEFAULT_SETTINGS.language;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">General</h3>
          <p className="text-[11px] text-[#777]">Application updates, display language, and account info.</p>
        </div>
        {isGeneralModified && (
          <button
            onClick={() => {
              restoreTabDefaults('general');
              showToast('Restored General settings to default', 'info');
            }}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
            title="Restore default general settings"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Row: Version & Updates */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <div className="text-sm font-medium text-white">Version 0.1.0</div>
            <div className="text-xs text-[#888] mt-0.5">Installer version: 0.1.0</div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#38bdf8] hover:underline mt-0.5 inline-block w-fit"
            >
              Read the changelog.
            </a>
          </div>
          <button
            onClick={() => showToast('Flint is up to date (v0.1.0)', 'info')}
            className="px-3.5 py-1.5 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white text-xs font-medium rounded-[5px] border border-[#383838] hover:border-[#484848] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all cursor-pointer"
          >
            Check for updates
          </button>
        </div>

        {/* Row: Automatic updates */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Automatic updates</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Turn this off to prevent the app from checking for updates.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FieldResetButton
              isModified={autoUpdates !== DEFAULT_SETTINGS.autoUpdates}
              onReset={() => setAutoUpdates(DEFAULT_SETTINGS.autoUpdates)}
              title="Restore default (Enabled)"
            />
            <ToggleSwitch checked={autoUpdates} onChange={setAutoUpdates} />
          </div>
        </div>

        {/* Row: Receive early access versions */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Receive early access versions</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Auto-update to the latest early access version. These versions include new features but may be less stable.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FieldResetButton
              isModified={earlyAccess !== DEFAULT_SETTINGS.earlyAccess}
              onReset={() => setEarlyAccess(DEFAULT_SETTINGS.earlyAccess)}
              title="Restore default (Disabled)"
            />
            <ToggleSwitch checked={earlyAccess} onChange={setEarlyAccess} />
          </div>
        </div>

        {/* Row: Language */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Language</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Change the display language.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FieldResetButton
              isModified={language !== DEFAULT_SETTINGS.language}
              onReset={() => setLanguage(DEFAULT_SETTINGS.language)}
              title="Restore default language (English)"
            />
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
          </div>
        </div>

        {/* Row: Help */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Help</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Learn how to use Flint and get help from the community.
            </span>
          </div>
          <button
            onClick={() => useWorkspaceStore.getState().setIsHelpModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white text-xs font-medium rounded-[5px] border border-[#383838] hover:border-[#484848] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all cursor-pointer"
          >
            Open
          </button>
        </div>
      </div>

      {/* Subheading: Account */}
      <div>
        <div className="px-4 mb-2.5">
          <h3 className="text-sm font-semibold text-white">Account</h3>
        </div>
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Your account</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                You're not logged in right now. An account is only needed for Cloud Sync and early access versions.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => showToast('Flint is in local offline-first mode', 'info')}
                className="px-3.5 py-1.5 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white text-xs font-medium rounded-[5px] border border-[#383838] hover:border-[#484848] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all cursor-pointer"
              >
                Log in
              </button>
              <button
                onClick={() => showToast('Cloud sync coming soon', 'info')}
                className="px-3.5 py-1.5 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white text-xs font-medium rounded-[5px] border border-[#383838] hover:border-[#484848] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all cursor-pointer"
              >
                Sign up
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Commercial license</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Help keep Flint 100% user-supported and unlock enterprise compliance.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => showToast('License activated', 'success')}
                className="px-3.5 py-1.5 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white text-xs font-medium rounded-[5px] border border-[#383838] hover:border-[#484848] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all cursor-pointer"
              >
                Activate
              </button>
              <button
                onClick={() => showToast('Opening purchase link', 'info')}
                className="px-3.5 py-1.5 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white text-xs font-medium rounded-[5px] border border-[#383838] hover:border-[#484848] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all cursor-pointer"
              >
                Purchase
              </button>
            </div>
          </div>
        </div>
      </div>
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
  const [newThemeAccent, setNewThemeAccent] = useState('#ea580c');
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

  const handleOpenExtensionsFolder = useCallback(() => {
    if (platform.isDesktop()) {
      platform.openExtensionsFolder();
    } else {
      showToast('Extensions folder: .flint/extensions/ inside Hearth', 'info');
    }
  }, [showToast]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Appearance</h3>
          <p className="text-[11px] text-[#777]">Color schemes, themes, fonts, and zoom scaling.</p>
        </div>
        {isAppearanceModified && (
          <button
            onClick={() => {
              restoreTabDefaults('appearance');
              showToast('Restored Appearance settings to default', 'info');
            }}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
            title="Restore default appearance settings"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      {/* Section 1: Accent Color */}
      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden">
        {/* Accent color */}
        <div className="flex items-start justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Accent color</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Choose the primary accent highlight color.
            </span>
            {/* Quick Accent Swatches */}
            <div className="flex items-center gap-1.5 mt-2.5">
              {[
                { name: 'Flint Ember', color: '#ea580c' },
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
                  className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                    accentColor.toLowerCase() === swatch.color.toLowerCase()
                      ? 'scale-125 border-white ring-2 ring-white/20'
                      : 'border-black/30 hover:scale-110'
                  }`}
                  style={{ backgroundColor: swatch.color }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2.5 pt-0.5">
            <FieldResetButton
              isModified={accentColor !== DEFAULT_SETTINGS.accentColor}
              onReset={() => setAccentColor(DEFAULT_SETTINGS.accentColor)}
              title="Restore default accent color (#ea580c)"
            />
            <ColorPicker value={accentColor} onChange={setAccentColor} />
          </div>
        </div>
      </div>

      {/* Section 2: Visual Themes Showcase */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
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
              className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#2e2e2e] text-[#aaa] hover:text-white text-xs font-medium rounded-md border border-[#333] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Copy01Icon size={13} />
              <span>Export</span>
            </button>

            <button
              onClick={() => setIsImportingTheme(true)}
              title="Import theme JSON"
              className="px-2.5 py-1.5 bg-[#252525] hover:bg-[#2e2e2e] text-[#aaa] hover:text-white text-xs font-medium rounded-md border border-[#333] transition-colors cursor-pointer flex items-center gap-1.5"
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
                setNewThemeAccent('#ea580c');
                setNewThemeCss('');
                setIsCreatingTheme(true);
              }}
              className="px-3 py-1.5 bg-[var(--flint-accent)] hover:opacity-90 active:scale-95 text-white text-xs font-medium rounded-md shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <PlusSignIcon size={13} />
              <span>New Theme</span>
            </button>
          </div>
        </div>

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
                  className={`px-2.5 py-1 text-xs rounded-[5px] transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${
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
              className="bg-transparent outline-none text-xs text-white placeholder-[#555] w-full"
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
                className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-[#242424] border-[var(--flint-accent)] ring-1 ring-[var(--flint-accent)] shadow-md'
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
                        style={{ background: accentColor || v.accent || '#ea580c' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3 flex flex-col justify-between flex-1 gap-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white group-hover:text-[var(--flint-accent)] transition-colors">
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
                      By {theme.author || 'Flint'}
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
                          className="p-1 text-[#777] hover:text-rose-400 hover:bg-[#2a2a2a] rounded cursor-pointer transition-colors"
                        >
                          <Delete02Icon size={13} />
                        </button>
                      )}

                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--flint-accent)]">
                          <CheckIcon size={12} />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#777] group-hover:text-[#ccc] transition-colors">
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

      {/* Section 3: CSS Snippets */}
      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        <div
          onClick={handleOpenExtensionsFolder}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#242424]/40"
        >
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">CSS snippets</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Manage your custom CSS snippet files for granular appearance modifications.
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#888]">
            <FolderOpenIcon size={14} className="mr-1" />
            <span>Open Snippets Folder</span>
            <ChevronRightIcon size={14} />
          </div>
        </div>
      </div>

      {/* Modal: Create Custom Theme */}
      {isCreatingTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-[#1c1c1c] border border-[#333] rounded-xl shadow-2xl p-5 flex flex-col gap-4 text-xs text-[#dcddde]">
            <div className="flex items-center justify-between pb-2 border-b border-[#282828]">
              <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                <SparklesIcon size={16} className="text-[var(--flint-accent)]" />
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
                  className="bg-[#141414] border border-[#2a2a2a] focus:border-[var(--flint-accent)] rounded px-2.5 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[#888]">Base Mode</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewThemeType('dark')}
                    className={`flex-1 py-1.5 rounded border text-xs cursor-pointer transition-colors ${
                      newThemeType === 'dark'
                        ? 'bg-[#2a2a2a] border-[var(--flint-accent)] text-white font-medium'
                        : 'bg-[#141414] border-[#282828] text-[#777]'
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewThemeType('light')}
                    className={`flex-1 py-1.5 rounded border text-xs cursor-pointer transition-colors ${
                      newThemeType === 'light'
                        ? 'bg-[#2a2a2a] border-[var(--flint-accent)] text-white font-medium'
                        : 'bg-[#141414] border-[#282828] text-[#777]'
                    }`}
                  >
                    Light
                  </button>
                </div>
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
                className="px-3 py-1.5 rounded bg-[#252525] hover:bg-[#2e2e2e] text-[#bbb] text-xs cursor-pointer"
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
                className="px-4 py-1.5 rounded bg-[var(--flint-accent)] hover:opacity-90 active:scale-95 text-white font-medium text-xs cursor-pointer shadow-xs"
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
                <Download01Icon size={16} className="text-[var(--flint-accent)]" />
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
                className="px-3 py-1.5 rounded bg-[#252525] hover:bg-[#2e2e2e] text-[#bbb] text-xs cursor-pointer"
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
                className="px-4 py-1.5 rounded bg-[var(--flint-accent)] hover:opacity-90 active:scale-95 text-white font-medium text-xs cursor-pointer shadow-xs"
              >
                Import & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section: Font */}
      <div>
        <div className="px-4 mb-2.5">
          <h3 className="text-sm font-semibold text-white">Font</h3>
        </div>
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
          {/* Interface font */}
          <div
            onClick={() => onOpenFontPicker('interface')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#242424]/40"
          >
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Interface font</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Set base font for all of Flint.
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#888]">
              <FieldResetButton
                isModified={interfaceFont !== DEFAULT_SETTINGS.interfaceFont}
                onReset={() => setInterfaceFont(DEFAULT_SETTINGS.interfaceFont)}
                title="Restore default interface font (System font)"
              />
              {interfaceFont && <span className="text-white font-medium">{interfaceFont}</span>}
              <ChevronRightIcon size={14} />
            </div>
          </div>

          {/* Text font */}
          <div
            onClick={() => onOpenFontPicker('text')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#242424]/40"
          >
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Text font</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Set font for editing and reading views.
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#888]">
              <FieldResetButton
                isModified={textFont !== DEFAULT_SETTINGS.textFont}
                onReset={() => setTextFont(DEFAULT_SETTINGS.textFont)}
                title="Restore default text font"
              />
              {textFont && <span className="text-white font-medium">{textFont}</span>}
              <ChevronRightIcon size={14} />
            </div>
          </div>

          {/* Monospace font */}
          <div
            onClick={() => onOpenFontPicker('monospace')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#242424]/40"
          >
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Monospace font</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Set font for places like code blocks and frontmatter.
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#888]">
              <FieldResetButton
                isModified={monospaceFont !== DEFAULT_SETTINGS.monospaceFont}
                onReset={() => setMonospaceFont(DEFAULT_SETTINGS.monospaceFont)}
                title="Restore default monospace font"
              />
              {monospaceFont && <span className="text-white font-medium">{monospaceFont}</span>}
              <ChevronRightIcon size={14} />
            </div>
          </div>

          {/* Font size slider */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Font size</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Font size in pixels that affects editing and reading views.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <FieldResetButton
                isModified={fontSize !== DEFAULT_SETTINGS.fontSize}
                onReset={() => setFontSize(DEFAULT_SETTINGS.fontSize)}
                title="Restore default font size (16px)"
              />
              <span className="text-xs text-[#dcddde] w-4 text-right font-normal">{fontSize}</span>
              <Slider
                min={12}
                max={24}
                value={fontSize}
                onChange={setFontSize}
                className="w-28"
              />
            </div>
          </div>

          {/* Quick font size adjustment */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Quick font size adjustment</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Adjust the font size using Ctrl + Scroll, or using the trackpad pinch-zoom gesture.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={quickFontSize !== DEFAULT_SETTINGS.quickFontSize}
                onReset={() => setQuickFontSize(DEFAULT_SETTINGS.quickFontSize)}
                title="Restore default (Enabled)"
              />
              <ToggleSwitch checked={quickFontSize} onChange={setQuickFontSize} />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Advanced */}
      <div>
        <div className="px-4 mb-2.5">
          <h3 className="text-sm font-semibold text-white">Advanced</h3>
        </div>
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Custom app icon</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Set a custom icon for the app.
              </span>
            </div>
            <button
              onClick={() => showToast('Custom app icon feature active', 'info')}
              className="px-3.5 py-1.5 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white text-xs font-medium rounded-[5px] border border-[#383838] hover:border-[#484848] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all cursor-pointer"
            >
              Choose
            </button>
          </div>
        </div>
      </div>
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
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Interface</h3>
          <p className="text-[11px] text-[#777]">Window frame, ribbon, tab bar, and UI zooming.</p>
        </div>
        {isInterfaceModified && (
          <button
            onClick={() => {
              restoreTabDefaults('interface');
              showToast('Restored Interface settings to default', 'info');
            }}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
            title="Restore default interface settings"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Show tab title bar */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show tab title bar</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Display the header at the top of every tab.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FieldResetButton
              isModified={showTabTitleBar !== DEFAULT_SETTINGS.showTabTitleBar}
              onReset={() => setShowTabTitleBar(DEFAULT_SETTINGS.showTabTitleBar)}
              title="Restore default (Enabled)"
            />
            <ToggleSwitch checked={showTabTitleBar} onChange={setShowTabTitleBar} />
          </div>
        </div>

        {/* Restore open tabs on startup */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Restore open tabs</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Automatically restore your open tabs and split panes when restarting or reloading the app.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FieldResetButton
              isModified={restoreTabs !== DEFAULT_SETTINGS.restoreTabs}
              onReset={() => setRestoreTabs(DEFAULT_SETTINGS.restoreTabs)}
              title="Restore default (Enabled)"
            />
            <ToggleSwitch checked={restoreTabs} onChange={setRestoreTabs} />
          </div>
        </div>

        {/* Show Action Rail */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show Action Rail</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Display vertical action toolbar on the side of the window.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FieldResetButton
              isModified={showRibbon !== DEFAULT_SETTINGS.showRibbon}
              onReset={() => setShowRibbon(DEFAULT_SETTINGS.showRibbon)}
              title="Restore default (Enabled)"
            />
            <ToggleSwitch checked={showRibbon} onChange={setShowRibbon} />
          </div>
        </div>

        {/* Action rail configuration */}
        <div
          onClick={() => showToast('Action Rail configuration', 'info')}
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#242424]/40"
        >
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Action rail configuration</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Configure what commands appear in the action rail.
            </span>
          </div>
          <ChevronRightIcon size={14} className="text-[#777]" />
        </div>
      </div>

      {/* Section: Advanced */}
      <div>
        <div className="px-4 mb-2.5">
          <h3 className="text-sm font-semibold text-white">Advanced</h3>
        </div>
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
          {/* Zoom level */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Zoom level</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Controls the overall zoom level of the app.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <FieldResetButton
                isModified={zoomLevel !== DEFAULT_SETTINGS.zoomLevel}
                onReset={() => setZoomLevel(DEFAULT_SETTINGS.zoomLevel, true)}
                title="Restore default zoom level (100%)"
              />
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
          </div>

          {/* Native menus */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Native menus</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Menus throughout the app will match the operating system. They will not be affected by your theme.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={nativeMenus !== DEFAULT_SETTINGS.nativeMenus}
                onReset={() => setNativeMenus(DEFAULT_SETTINGS.nativeMenus)}
                title="Restore default (Disabled)"
              />
              <ToggleSwitch checked={nativeMenus} onChange={setNativeMenus} />
            </div>
          </div>

          {/* Window frame style */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Window frame style</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Determines the styling of the title bar of Flint windows. Requires a full restart to take effect.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={windowFrameStyle !== DEFAULT_SETTINGS.windowFrameStyle}
                onReset={() => setWindowFrameStyle(DEFAULT_SETTINGS.windowFrameStyle)}
                title="Restore default (Hidden)"
              />
              <CustomSelect
                value={windowFrameStyle}
                onChange={setWindowFrameStyle}
                options={[
                  { value: 'Hidden (default)', label: 'Hidden (default)' },
                  { value: 'Native', label: 'Native' },
                ]}
              />
            </div>
          </div>

          {/* Open settings in new window */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Open settings in new window</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Open settings in its own window instead of embedded in the app.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={openSettingsInNewWindow !== DEFAULT_SETTINGS.openSettingsInNewWindow}
                onReset={() => setOpenSettingsInNewWindow(DEFAULT_SETTINGS.openSettingsInNewWindow)}
                title="Restore default (Enabled)"
              />
              <ToggleSwitch checked={openSettingsInNewWindow} onChange={setOpenSettingsInNewWindow} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ==========================================
// TAB: EDITOR
// ==========================================
const EditorTab: React.FC = React.memo(() => {
  const defaultTabMode = useSettingsStore((s) => s.defaultTabMode);
  const setDefaultTabMode = useSettingsStore((s) => s.setDefaultTabMode);
  const defaultEditingMode = useSettingsStore((s) => s.defaultEditingMode);
  const setDefaultEditingMode = useSettingsStore((s) => s.setDefaultEditingMode);
  const showModeInStatusBar = useSettingsStore((s) => s.showModeInStatusBar);
  const setShowModeInStatusBar = useSettingsStore((s) => s.setShowModeInStatusBar);
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
  const tabSize = useSettingsStore((s) => s.tabSize);
  const setTabSize = useSettingsStore((s) => s.setTabSize);
  const restoreTabDefaults = useSettingsStore((s) => s.restoreTabDefaults);
  const showToast = useWorkspaceStore((s) => s.showToast);

  const isEditorModified =
    defaultTabMode !== DEFAULT_SETTINGS.defaultTabMode ||
    defaultEditingMode !== DEFAULT_SETTINGS.defaultEditingMode ||
    showModeInStatusBar !== DEFAULT_SETTINGS.showModeInStatusBar ||
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
    tabSize !== DEFAULT_SETTINGS.tabSize;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Editor</h3>
          <p className="text-[11px] text-[#777]">View modes, typing behavior, line length, and auto-pairing.</p>
        </div>
        {isEditorModified && (
          <button
            onClick={() => {
              restoreTabDefaults('editor');
              showToast('Restored Editor settings to default', 'info');
            }}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
            title="Restore default editor settings"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Default view for new tabs */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Default view for new tabs</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              The default view that a new Markdown tab gets opened in.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FieldResetButton
              isModified={defaultTabMode !== DEFAULT_SETTINGS.defaultTabMode}
              onReset={() => setDefaultTabMode(DEFAULT_SETTINGS.defaultTabMode)}
              title="Restore default (Editing view)"
            />
            <CustomSelect
              value={defaultTabMode}
              onChange={(val) => setDefaultTabMode(val as DefaultTabMode)}
              options={[
                { value: 'Editing view', label: 'Editing view' },
                { value: 'Reading view', label: 'Reading view' },
              ]}
            />
          </div>
        </div>

        {/* Default editing mode */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Default editing mode</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              The default editing mode a new tab will start with.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FieldResetButton
              isModified={defaultEditingMode !== DEFAULT_SETTINGS.defaultEditingMode}
              onReset={() => setDefaultEditingMode(DEFAULT_SETTINGS.defaultEditingMode)}
              title="Restore default (Live Preview)"
            />
            <CustomSelect
              value={defaultEditingMode}
              onChange={(val) => setDefaultEditingMode(val as DefaultEditingMode)}
              options={[
                { value: 'Live Preview', label: 'Live Preview' },
                { value: 'Source mode', label: 'Source mode' },
              ]}
            />
          </div>
        </div>

        {/* Show editing mode in status bar */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Show editing mode in status bar</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Show the editing mode toggle in the status bar.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FieldResetButton
              isModified={showModeInStatusBar !== DEFAULT_SETTINGS.showModeInStatusBar}
              onReset={() => setShowModeInStatusBar(DEFAULT_SETTINGS.showModeInStatusBar)}
              title="Restore default (Enabled)"
            />
            <ToggleSwitch checked={showModeInStatusBar} onChange={setShowModeInStatusBar} />
          </div>
        </div>
      </div>

      {/* Section: Display */}
      <div>
        <div className="px-4 mb-2.5">
          <h3 className="text-sm font-semibold text-white">Display</h3>
        </div>
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
          {/* Inline title */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Inline title</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Display the filename as an editable title inline with the file contents.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={inlineTitle !== DEFAULT_SETTINGS.inlineTitle}
                onReset={() => setInlineTitle(DEFAULT_SETTINGS.inlineTitle)}
                title="Restore default (Enabled)"
              />
              <ToggleSwitch checked={inlineTitle} onChange={setInlineTitle} />
            </div>
          </div>

          {/* Readable line length */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Readable line length</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Limit maximum line length. Less content fits onscreen, but long blocks of text are more readable.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={readableLineLength !== DEFAULT_SETTINGS.readableLineLength}
                onReset={() => setReadableLineLength(DEFAULT_SETTINGS.readableLineLength)}
                title="Restore default (Enabled)"
              />
              <ToggleSwitch checked={readableLineLength} onChange={setReadableLineLength} />
            </div>
          </div>

          {/* Strict line breaks */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Strict line breaks</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Markdown specs ignore single line breaks in reading view. Turn this off to make single line breaks visible.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={strictLineBreaks !== DEFAULT_SETTINGS.strictLineBreaks}
                onReset={() => setStrictLineBreaks(DEFAULT_SETTINGS.strictLineBreaks)}
                title="Restore default (Disabled)"
              />
              <ToggleSwitch checked={strictLineBreaks} onChange={setStrictLineBreaks} />
            </div>
          </div>

          {/* Properties in document */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Properties in document</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Choose how properties are displayed at the top of notes. Select “source” to show properties as raw YAML.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={propertiesInDoc !== DEFAULT_SETTINGS.propertiesInDoc}
                onReset={() => setPropertiesInDoc(DEFAULT_SETTINGS.propertiesInDoc)}
                title="Restore default (Visible)"
              />
              <CustomSelect
                value={propertiesInDoc}
                onChange={(val) => setPropertiesInDoc(val as any)}
                options={[
                  { value: 'Visible', label: 'Visible' },
                  { value: 'Hidden', label: 'Hidden' },
                  { value: 'Source', label: 'Source' },
                ]}
              />
            </div>
          </div>

          {/* Fold heading */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Fold heading</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Lets you fold all content under a heading.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={foldHeading !== DEFAULT_SETTINGS.foldHeading}
                onReset={() => setFoldHeading(DEFAULT_SETTINGS.foldHeading)}
                title="Restore default (Enabled)"
              />
              <ToggleSwitch checked={foldHeading} onChange={setFoldHeading} />
            </div>
          </div>

          {/* Fold indent */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Fold indent</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Lets you fold part of an indentation, such as lists.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={foldIndent !== DEFAULT_SETTINGS.foldIndent}
                onReset={() => setFoldIndent(DEFAULT_SETTINGS.foldIndent)}
                title="Restore default (Enabled)"
              />
              <ToggleSwitch checked={foldIndent} onChange={setFoldIndent} />
            </div>
          </div>

          {/* Line numbers */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Line numbers</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Show line numbers in the gutter.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={lineNumbers !== DEFAULT_SETTINGS.lineNumbers}
                onReset={() => setLineNumbers(DEFAULT_SETTINGS.lineNumbers)}
                title="Restore default (Disabled)"
              />
              <ToggleSwitch checked={lineNumbers} onChange={setLineNumbers} />
            </div>
          </div>

          {/* Indentation guides */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Indentation guides</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Show vertical relationship lines between list items.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={indentationGuides !== DEFAULT_SETTINGS.indentationGuides}
                onReset={() => setIndentationGuides(DEFAULT_SETTINGS.indentationGuides)}
                title="Restore default (Enabled)"
              />
              <ToggleSwitch checked={indentationGuides} onChange={setIndentationGuides} />
            </div>
          </div>

          {/* Accent list markers */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Accent number & list markers</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Recolor list numbers and bullets with your theme's dimmed accent color.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={accentListPrefixes !== DEFAULT_SETTINGS.accentListPrefixes}
                onReset={() => setAccentListPrefixes(DEFAULT_SETTINGS.accentListPrefixes)}
                title="Restore default (Disabled)"
              />
              <ToggleSwitch checked={accentListPrefixes} onChange={setAccentListPrefixes} />
            </div>
          </div>

          {/* Auto pairing */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Auto-pair brackets and quotes</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Automatically pair [[wikilinks]], ((blocks)), and markdown syntax.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={autoPairing !== DEFAULT_SETTINGS.autoPairing}
                onReset={() => setAutoPairing(DEFAULT_SETTINGS.autoPairing)}
                title="Restore default (Enabled)"
              />
              <ToggleSwitch checked={autoPairing} onChange={setAutoPairing} />
            </div>
          </div>

          {/* Tab size */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Tab indent size</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Number of spaces when pressing Tab key.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={tabSize !== DEFAULT_SETTINGS.tabSize}
                onReset={() => setTabSize(DEFAULT_SETTINGS.tabSize)}
                title="Restore default (5 spaces)"
              />
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
            </div>
          </div>
        </div>
      </div>
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
  const hearthName = useWorkspaceStore((s) => s.hearthName || s.vaultName);
  const hearthPath = useWorkspaceStore((s) => s.hearthPath || s.vaultPath);
  const renameHearth = useWorkspaceStore((s) => s.renameHearth);
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
  const linkFormat = useSettingsStore((s) => s.linkFormat);
  const setLinkFormat = useSettingsStore((s) => s.setLinkFormat);
  const autoUpdateLinks = useSettingsStore((s) => s.autoUpdateLinks);
  const setAutoUpdateLinks = useSettingsStore((s) => s.setAutoUpdateLinks);
  const promptFolderSelection = useWorkspaceStore((s) => s.promptFolderSelection);
  const setIsSettingsOpen = useWorkspaceStore((s) => s.setIsSettingsOpen);
  const restoreTabDefaults = useSettingsStore((s) => s.restoreTabDefaults);

  const [tempHearthName, setTempHearthName] = useState(hearthName);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  useEffect(() => {
    setTempHearthName(hearthName);
  }, [hearthName]);

  const handleSaveHearthName = useCallback(async () => {
    if (tempHearthName.trim()) {
      await renameHearth(hearthPath, tempHearthName.trim());
    }
  }, [tempHearthName, hearthPath, renameHearth]);

  const handlePickAttachmentFolder = useCallback(() => {
    promptFolderSelection({
      title: 'Click on a folder for attachments',
      allowRoot: true,
      onSelect: (folderPath) => {
        setAttachmentFolder(folderPath);
        setIsSettingsOpen(true, 'files');
        showToast(folderPath ? `Attachment location set to "${folderPath}"` : 'Attachment location set to Hearth root', 'success');
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
    linkFormat !== DEFAULT_SETTINGS.linkFormat ||
    autoUpdateLinks !== DEFAULT_SETTINGS.autoUpdateLinks;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Files and links</h3>
          <p className="text-[11px] text-[#777]">Hearth management, link formats, and internal link syncing.</p>
        </div>
        {isFilesModified && (
          <button
            onClick={() => {
              restoreTabDefaults('files');
              showToast('Restored Files & links settings to default', 'info');
            }}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
            title="Restore default files & links settings"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      {/* Section: Hearth config */}
      <div>
        <div className="px-4 mb-2.5">
          <h3 className="text-sm font-semibold text-white">Hearth</h3>
        </div>
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Hearth name</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Change the display name of this Hearth.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tempHearthName}
                onChange={(e) => setTempHearthName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveHearthName();
                }}
                className="bg-[#2a2a2a] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none w-44 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors"
              />
              {tempHearthName !== hearthName && (
                <button
                  onClick={handleSaveHearthName}
                  style={{ backgroundColor: 'var(--flint-accent, #ea580c)' }}
                  className="px-3.5 py-1.5 hover:brightness-110 active:brightness-90 text-white text-xs font-semibold rounded-[5px] shadow-[0_1px_2px_rgba(0,0,0,0.35)] border border-black/20 cursor-pointer transition-all"
                >
                  Save
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Close tabs when files are deleted</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Automatically close open tabs when their file is deleted. When turned off, dead tabs remain open as error views.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={closeTabsOnDelete !== DEFAULT_SETTINGS.closeTabsOnDelete}
                onReset={() => {
                  setCloseTabsOnDelete(DEFAULT_SETTINGS.closeTabsOnDelete);
                  useWorkspaceStore.getState().cleanUpDeadTabs();
                }}
                title="Restore default (Enabled)"
              />
              <ToggleSwitch
                checked={closeTabsOnDelete}
                onChange={(val) => {
                  setCloseTabsOnDelete(val);
                  if (val) {
                    useWorkspaceStore.getState().cleanUpDeadTabs();
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Skip delete confirmation</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Delete notes and folders immediately without prompting.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={skipDeleteConfirmation !== DEFAULT_SETTINGS.skipDeleteConfirmation}
                onReset={() => setSkipDeleteConfirmation(DEFAULT_SETTINGS.skipDeleteConfirmation)}
                title="Restore default (Disabled)"
              />
              <ToggleSwitch
                checked={skipDeleteConfirmation}
                onChange={setSkipDeleteConfirmation}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Skip rename on duplicate confirmation</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Automatically rename duplicate items (e.g. Note (1)) when moving without prompting.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={skipRenameConfirmation !== DEFAULT_SETTINGS.skipRenameConfirmation}
                onReset={() => setSkipRenameConfirmation(DEFAULT_SETTINGS.skipRenameConfirmation)}
                title="Restore default (Disabled)"
              />
              <ToggleSwitch
                checked={skipRenameConfirmation}
                onChange={setSkipRenameConfirmation}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Default location */}
      <div>
        <div className="px-4 mb-2.5">
          <h3 className="text-sm font-semibold text-white">Default location for new notes</h3>
        </div>
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
          {/* New note location */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">New note location</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Where newly created notes are placed.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={newNoteLocation !== DEFAULT_SETTINGS.newNoteLocation}
                onReset={() => setNewNoteLocation(DEFAULT_SETTINGS.newNoteLocation)}
                title="Restore default (Hearth root)"
              />
              <CustomSelect
                value={newNoteLocation}
                onChange={(val) => setNewNoteLocation(val as NewNoteLocation)}
                options={[
                  { value: 'root', label: 'Hearth root folder' },
                  { value: 'same', label: 'Same folder as current file' },
                ]}
              />
            </div>
          </div>

          {/* New attachment location */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Default location for new attachments</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Folder where pasted images and media attachments are placed (leave blank for Hearth root).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={attachmentFolder !== DEFAULT_SETTINGS.attachmentFolder}
                onReset={() => setAttachmentFolder(DEFAULT_SETTINGS.attachmentFolder)}
                title="Restore default (Hearth root)"
              />
              <button
                type="button"
                onClick={handlePickAttachmentFolder}
                className="flex items-center gap-2 bg-[#181818] hover:bg-[#222222] active:bg-[#151515] border border-[#383838] hover:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors cursor-pointer group"
                title="Click to select folder in File Explorer"
              >
                <Folder01Icon size={13} className="text-[#888] group-hover:text-white transition-colors" />
                <span className="max-w-[130px] truncate text-[#dcddde]">
                  {attachmentFolder ? attachmentFolder : 'Hearth root ( / )'}
                </span>
                <span className="text-[10px] text-[#888] group-hover:text-[#ccc] bg-[#282828] px-1.5 py-0.5 rounded border border-[#383838]">
                  Set
                </span>
              </button>
            </div>
          </div>

          {/* New link format */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">New link format</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                How wikilinks like [[Target]] are formatted.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={linkFormat !== DEFAULT_SETTINGS.linkFormat}
                onReset={() => setLinkFormat(DEFAULT_SETTINGS.linkFormat)}
                title="Restore default (Shortest path)"
              />
              <CustomSelect
                value={linkFormat}
                onChange={(val) => setLinkFormat(val as LinkFormat)}
                options={[
                  { value: 'shortest', label: 'Shortest path when possible' },
                  { value: 'relative', label: 'Relative path from file' },
                  { value: 'absolute', label: 'Absolute path in Hearth' },
                ]}
              />
            </div>
          </div>

          {/* Auto update links */}
          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Automatically update internal links</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Update internal links when a note is renamed or moved.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FieldResetButton
                isModified={autoUpdateLinks !== DEFAULT_SETTINGS.autoUpdateLinks}
                onReset={() => setAutoUpdateLinks(DEFAULT_SETTINGS.autoUpdateLinks)}
                title="Restore default (Enabled)"
              />
              <ToggleSwitch checked={autoUpdateLinks} onChange={setAutoUpdateLinks} />
            </div>
          </div>
        </div>
      </div>

      {/* Section: Trash */}
      <div>
        <div className="px-4 mb-2.5">
          <h3 className="text-sm font-semibold text-white">Trash</h3>
        </div>
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
          <div
            onClick={async () => {
              await loadTrash();
              onOpenTrash();
            }}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#242424]/40 transition-colors"
          >
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Open trash</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                View and restore deleted files and folders. Items are automatically cleared after 48 hours.
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#888]">
              <span className="text-white font-medium">
                {trashItems.length} {trashItems.length === 1 ? 'item' : 'items'}
              </span>
              <ChevronRightIcon size={14} />
            </div>
          </div>

          <div className="flex items-center justify-between p-4">
            <div className="flex flex-col pr-4">
              <span className="text-[13px] font-normal text-[#dcddde]">Empty trash</span>
              <span className="text-[11px] text-[#777] mt-0.5">
                Permanently delete all items currently in trash.
              </span>
            </div>
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
              className="px-3.5 py-1.5 bg-[#e11d48] hover:bg-[#f43f5e] active:bg-[#be123c] disabled:opacity-40 disabled:hover:bg-[#e11d48] text-white text-xs font-semibold rounded-[5px] border border-black/20 shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Delete02Icon size={12} />
              <span>Empty Trash</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ==========================================
// TAB: HOTKEYS
// ==========================================
const HotkeysTab: React.FC = React.memo(() => {
  const allCommands = useCommands();
  const customHotkeys = useSettingsStore((s) => s.customHotkeys);
  const setCustomHotkey = useSettingsStore((s) => s.setCustomHotkey);
  const resetCustomHotkey = useSettingsStore((s) => s.resetCustomHotkey);
  const resetAllHotkeys = useSettingsStore((s) => s.resetAllHotkeys);
  const showToast = useWorkspaceStore((s) => s.showToast);

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

  return (
    <div className="flex flex-col gap-4">
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
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
            title="Reset all customized shortcuts to defaults"
          >
            <RotateCcwIcon size={12} />
            <span>Reset all</span>
          </button>
        )}
      </div>

      {recordingCommandId && (
        <div
          style={{ borderColor: 'var(--flint-accent, #ea580c)' }}
          className="mx-4 p-3 bg-[#242424] border rounded-xl flex items-center justify-between text-xs text-white"
        >
          <span>Press your desired key combination (e.g. <b>Ctrl+Shift+K</b>)...</span>
          <button
            onClick={() => setRecordingCommandId(null)}
            className="px-2.5 py-1 text-[11px] bg-[#333] hover:bg-[#444] text-[#ccc] rounded-[5px] shadow-[0_1px_2px_rgba(0,0,0,0.2)] cursor-pointer"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828] mt-1">
        {allCommands.map((cmd) => {
          const activeHotkey = customHotkeys[cmd.id] !== undefined ? customHotkeys[cmd.id] : cmd.hotkey;
          const isCustomized = customHotkeys[cmd.id] !== undefined;
          const isRecording = recordingCommandId === cmd.id;

          return (
            <div
              key={cmd.id}
              className="p-3.5 flex items-center justify-between hover:bg-[#242424]/40"
            >
              <div className="flex flex-col">
                <span className="text-[13px] font-normal text-white">{cmd.title}</span>
                {cmd.section && (
                  <span className="text-[10px] text-[#666] uppercase mt-0.5">{cmd.section}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isCustomized && (
                  <button
                    onClick={() => {
                      resetCustomHotkey(cmd.id);
                      showToast(`Reset shortcut for "${cmd.title}"`, 'info');
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
                      backgroundColor: 'var(--flint-accent-subtle, rgba(234,88,12,0.2))',
                      borderColor: 'var(--flint-accent, #ea580c)',
                      color: 'var(--flint-accent, #ea580c)',
                    }}
                    className="px-2.5 py-1 border text-xs font-mono rounded-[5px] animate-pulse"
                  >
                    Press keys...
                  </span>
                ) : activeHotkey ? (
                  <button
                    onClick={() => setRecordingCommandId(cmd.id)}
                    title="Click to reassign hotkey"
                    className="px-2.5 py-1 bg-[#141414] hover:bg-[#222] border border-[#333] hover:border-[#555] text-xs font-mono text-[#bbb] hover:text-white rounded-[5px] shadow-[0_1px_2px_rgba(0,0,0,0.2)] cursor-pointer transition-colors"
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

// Helper: match tab ID flexibly by exact ID, extensionId, pluginId, subId, or prefix
export function isTabMatch(tab: { id: string; extensionId?: string; pluginId?: string }, targetTabId: string): boolean {
  if (!targetTabId || !tab) return false;
  if (tab.id === targetTabId) return true;
  const targetId = tab.extensionId || tab.pluginId;
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
  const app = useFlintApp();
  const extensionList = useExtensionList();
  const allSettingTabs = useSettingTabs();

  const coreExtensionTabs = useMemo(() => {
    return allSettingTabs.filter((tab) => {
      const extId = tab.extensionId || tab.pluginId || tab.id.split(':')[0];
      const manifest = app.extensions.getExtensionManifest(extId);
      return manifest?.isCore === true;
    });
  }, [allSettingTabs, app]);

  const handleToggleExtension = useCallback(async (extensionId: string) => {
    const isEnabled = app.extensions.isExtensionEnabled(extensionId);
    if (isEnabled) {
      await app.extensions.disableExtension(extensionId);
    } else {
      await app.extensions.enableExtension(extensionId);
    }
  }, [app]);

  return (
    <div className="flex flex-col gap-4">
      <div className="px-4">
        <h3 className="text-sm font-semibold text-white mb-1">Built-in extensions</h3>
        <p className="text-[11px] text-[#777]">
          Built-in features designed as modular extensions. Toggle them anytime.
        </p>
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828] mt-1">
        {extensionList.core.map((ext) => {
          const isEnabled = app.extensions.isExtensionEnabled(ext.id);
          const settingsTab = coreExtensionTabs.find((tab) => isTabMatch(tab, ext.id));
          return (
            <div
              key={ext.id}
              className="p-3.5 flex items-center justify-between hover:bg-[#242424]/40"
            >
              <div className="flex-1 pr-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-normal text-white">{ext.name}</span>
                  <span className="text-[11px] text-[#777] font-normal">v{ext.version}</span>
                </div>
                <p className="text-[11px] text-[#777] mt-0.5 leading-relaxed">{ext.description}</p>
              </div>

              <div className="flex items-center gap-2">
                {ext.readme && (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('flint_open_plugin_doc', JSON.stringify({ pluginId: ext.id, title: ext.name, timestamp: Date.now() }));
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
                    className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#777] hover:text-[#dcddde] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                  >
                    <BookOpen01Icon size={14} />
                  </button>
                )}
                {isEnabled && settingsTab && (
                  <button
                    onClick={() => onNavigateTab(settingsTab.id)}
                    title={`${ext.name} options`}
                    className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#777] hover:text-[#dcddde] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
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

// Backwards-compatibility alias
const CorePluginsTab = CoreExtensionsTab;

// ==========================================
// TAB: COMMUNITY EXTENSIONS
// ==========================================
interface CommunityExtensionsTabProps {
  onNavigateTab: (tabId: string) => void;
  onClose?: () => void;
}

const CommunityExtensionsTab: React.FC<CommunityExtensionsTabProps> = React.memo(({ onNavigateTab, onClose }) => {
  const app = useFlintApp();
  const extensionList = useExtensionList();
  const allSettingTabs = useSettingTabs();
  const showToast = useWorkspaceStore((s) => s.showToast);

  const communityExtensionTabs = useMemo(() => {
    return allSettingTabs.filter((tab) => {
      const extId = tab.extensionId || tab.pluginId || tab.id.split(':')[0];
      const manifest = app.extensions.getExtensionManifest(extId);
      return !manifest || manifest.isCore !== true;
    });
  }, [allSettingTabs, app]);

  const handleToggleExtension = useCallback(async (extensionId: string) => {
    const isEnabled = app.extensions.isExtensionEnabled(extensionId);
    if (isEnabled) {
      await app.extensions.disableExtension(extensionId);
    } else {
      await app.extensions.enableExtension(extensionId);
    }
  }, [app]);

  const handleOpenExtensionsFolder = useCallback(() => {
    if (platform.isDesktop()) {
      platform.openExtensionsFolder();
    } else {
      showToast('Extensions folder: .flint/extensions/ inside Hearth', 'info');
    }
  }, [showToast]);

  const handleReloadExtensions = useCallback(async () => {
    await app.extensions.refreshCommunityExtensions();
    showToast('Reloaded extensions from disk', 'success');
  }, [app, showToast]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Community extensions</h3>
          <p className="text-[11px] text-[#777]">
            Installed community extensions in your Hearth.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReloadExtensions}
            className="px-3.5 py-1.5 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white text-xs font-medium rounded-[5px] border border-[#383838] hover:border-[#484848] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcwIcon size={12} />
            <span>Reload</span>
          </button>
          <button
            onClick={handleOpenExtensionsFolder}
            className="px-3.5 py-1.5 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white text-xs font-medium rounded-[5px] border border-[#383838] hover:border-[#484848] shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <FolderOpenIcon size={12} />
            <span>Open extensions folder</span>
          </button>
        </div>
      </div>

      {extensionList.community.length > 0 ? (
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828] mt-1">
          {extensionList.community.map((ext) => {
            const isEnabled = app.extensions.isExtensionEnabled(ext.id);
            const communityTab = communityExtensionTabs.find((t) => isTabMatch(t, ext.id));
            return (
              <div
                key={ext.id}
                className="p-3.5 flex items-center justify-between hover:bg-[#242424]/40"
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-normal text-white">{ext.name}</span>
                    <span className="text-[11px] text-[#777] font-normal">v{ext.version}</span>
                    {ext.author && (
                      <span className="text-[10px] text-[#777]">by {ext.author}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#777] mt-0.5 leading-relaxed">{ext.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  {ext.readme && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('flint_open_plugin_doc', JSON.stringify({ pluginId: ext.id, title: ext.name, timestamp: Date.now() }));
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
                      className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#777] hover:text-[#dcddde] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                    >
                      <BookOpen01Icon size={14} />
                    </button>
                  )}
                  {isEnabled && communityTab && (
                    <button
                      onClick={() => onNavigateTab(communityTab.id)}
                      title={`${ext.name} options`}
                      className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#777] hover:text-[#dcddde] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
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
      ) : (
        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-8 text-center mt-1 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--flint-accent)]/10 border border-[var(--flint-accent)]/20 flex items-center justify-center text-[var(--flint-accent)] mb-3 shadow-xs">
            <Store01Icon size={24} />
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">Discover Community Extensions</h4>
          <p className="text-xs text-[#888] max-w-md leading-relaxed mb-5">
            Extend Flint with community extensions for enhanced workflows, visualizations, and integrations.
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
              className="px-4 py-2 bg-[var(--flint-accent)] hover:opacity-90 active:opacity-100 text-white rounded-[6px] text-xs font-medium transition-all cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <Store01Icon size={14} />
              <span>Browse Extension Marketplace</span>
            </button>
            <button
              onClick={handleOpenExtensionsFolder}
              className="px-3.5 py-2 bg-[#2a2a2a] hover:bg-[#333333] active:bg-[#222222] text-[#dcddde] hover:text-white rounded-[6px] border border-[#383838] hover:border-[#484848] transition-all cursor-pointer text-xs font-medium"
            >
              Open extensions folder
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// Backwards-compatibility alias
const CommunityPluginsTab = CommunityExtensionsTab;

export interface SettingsWindowContentProps {
  onClose?: () => void;
  isModal?: boolean;
  initialTab?: string;
}

export const SettingsWindowContent: React.FC<SettingsWindowContentProps> = React.memo(({ onClose, isModal = false, initialTab }) => {
  const app = useFlintApp();
  const allSettingTabs = useSettingTabs();

  const hearthName = useWorkspaceStore((s) => s.hearthName || s.vaultName);
  const setHearthName = useWorkspaceStore((s) => s.setHearthName);
  const showToast = useWorkspaceStore((s) => s.showToast);
  const restoreAllDefaults = useSettingsStore((s) => s.restoreAllDefaults);

  const [activeTab, setActiveTab] = useState<string>(initialTab || 'general');
  const [searchQuery, setSearchQuery] = useState('');

  // Sub-view navigation (e.g. for Font Pickers & Trash)
  const [fontPickerMode, setFontPickerMode] = useState<'interface' | 'text' | 'monospace' | null>(null);
  const [isTrashViewOpen, setIsTrashViewOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const getFn = platform.getCurrentHearth || platform.getCurrentVault;
    getFn().then((data) => {
      if (data?.name) {
        setHearthName(data.name);
      }
    });
    app.extensions.init();
    dbAdapter.init().then(() => {
      useDocumentStore.getState().loadTrash();
    });
  }, [app, setHearthName]);

  useEffect(() => {
    const onFiles = platform.onHearthFilesChanged || platform.onVaultFilesChanged;
    const unsub = onFiles(async () => {
      await dbAdapter.resetAndReload();
      useDocumentStore.getState().loadTrash();
    });
    return () => {
      unsub();
    };
  }, []);

  // When closing or unmounting Settings, apply any pending appearance/zoom updates to DOM
  useEffect(() => {
    platform.setWindowTitle(`Settings﹕${hearthName || 'Hearth'}﹕Flint`);
    return () => {
      applyAppearanceDOM();
    };
  }, [hearthName]);

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
    { id: 'editor', label: 'Editor', icon: <Edit02Icon size={14} />, keywords: ['editor', 'line', 'preview', 'indent', 'heading', 'pairing', 'properties', 'reading'] },
    { id: 'files', label: 'Files and links', icon: <Folder01Icon size={14} />, keywords: ['files and links', 'files', 'links', 'trash', 'deleted', 'delete', 'hearth', 'vault', 'wikilink'] },
    { id: 'hotkeys', label: 'Hotkeys', icon: <KeyIcon size={14} />, keywords: ['hotkeys', 'shortcuts', 'keys', 'commands'] },
    { id: 'core-extensions', label: 'Built-in extensions', icon: <PackageIcon size={14} />, keywords: ['built-in extensions', 'core extensions', 'core plugins', 'plugins', 'modules', 'extensions'] },
    { id: 'community-extensions', label: 'Community extensions', icon: <GlobeIcon size={14} />, keywords: ['community extensions', 'community plugins', 'plugins', 'marketplace', 'extensions'] },
  ], []);

  const extensionList = useExtensionList();

  // Dynamic Core & Community Extensions Setting Tabs from Registries + Enabled Extensions Fallback
  const coreExtensionTabs = useMemo(() => {
    const registered = allSettingTabs.filter((tab) => {
      const extId = tab.extensionId || tab.pluginId || tab.id.split(':')[0];
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
          pluginId: manifest.id,
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
      const extId = tab.extensionId || tab.pluginId || tab.id.split(':')[0];
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
          pluginId: manifest.id,
          icon: <GlobeIcon size={14} />,
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

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return optionsItems;
    const q = searchQuery.toLowerCase().trim();
    return optionsItems.filter((i) =>
      i.label.toLowerCase().includes(q) || i.keywords.some((k) => k.includes(q))
    );
  }, [searchQuery, optionsItems]);

  const filteredCoreExtensions = useMemo(() => {
    return coreExtensionTabs.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const extId = item.extensionId || item.pluginId || item.id.split(':')[0];
        const manifest = app.extensions.getExtensionManifest(extId);
        const nameMatch = item.name.toLowerCase().includes(q);
        const manifestMatch =
          manifest?.name.toLowerCase().includes(q) ||
          manifest?.description?.toLowerCase().includes(q);
        return nameMatch || manifestMatch;
      }
      return true;
    });
  }, [coreExtensionTabs, searchQuery, app]);

  const filteredCommunityExtensions = useMemo(() => {
    return communityExtensionTabs.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const extId = item.extensionId || item.pluginId || item.id.split(':')[0];
        const manifest = app.extensions.getExtensionManifest(extId);
        const nameMatch = item.name.toLowerCase().includes(q);
        const manifestMatch =
          manifest?.name.toLowerCase().includes(q) ||
          manifest?.description?.toLowerCase().includes(q);
        return nameMatch || manifestMatch;
      }
      return true;
    });
  }, [communityExtensionTabs, searchQuery, app]);

  const handleNavigateTab = useCallback((tabId: string) => {
    setFontPickerMode(null);
    setIsTrashViewOpen(false);
    setActiveTab(tabId);
  }, []);

  return (
    <div
      data-card="true"
      className={`${
        isModal
          ? 'relative w-[960px] h-[660px] max-w-[calc(100%-32px)] max-h-[calc(100%-32px)] rounded-xl border border-[var(--flint-border-subtle,#2c2c2c)] shadow-2xl'
          : 'w-full h-full'
      } flex flex-col bg-[var(--flint-bg-main,#181818)] text-[var(--flint-text-secondary,#dcddde)] select-none font-sans overflow-hidden`}
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
        className="relative h-10 bg-[var(--flint-bg-topbar,#141414)] border-b border-[var(--flint-border-subtle,#242424)] flex items-center justify-between px-3 select-none z-30 shrink-0 text-xs cursor-default"
      >
        {/* Left spacer */}
        <div className={`${isModal ? 'w-11' : 'w-16'} h-full`} />

        {/* Centered Window Title: Settings / <HearthName> / Flint 0.1.0 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-medium text-xs text-[var(--flint-text-muted,#888)] flex items-center gap-1.5 select-none">
            <span className="text-[var(--flint-text-secondary,#ccc)]">Settings</span>
            <span className="text-[var(--flint-text-faint,#555)]">﹕</span>
            <span className="text-[var(--flint-text-primary)] font-medium">{hearthName || 'Flint Hearth'}</span>
            <span className="text-[var(--flint-text-faint,#555)]">﹕</span>
            <span className="text-[var(--flint-text-muted,#888)]">Flint</span>
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
                className="h-full w-11 hover:bg-[var(--flint-bg-card-hover,#252525)] text-[var(--flint-text-muted,#888)] hover:text-[var(--flint-text-primary)] flex items-center justify-center cursor-pointer transition-colors"
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
                className="h-full w-11 hover:bg-[var(--flint-bg-card-hover,#252525)] text-[var(--flint-text-muted,#888)] hover:text-[var(--flint-text-primary)] flex items-center justify-center cursor-pointer transition-colors"
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
            className="h-full w-11 hover:bg-[#e81123] text-[var(--flint-text-muted,#888)] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Close"
          >
            <WindowCloseIcon />
          </button>
        </div>
      </header>

      {/* 2. Main 2-Column Obsidian Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Navigation Sidebar */}
        <aside className="w-[230px] bg-[var(--flint-bg-sidebar,#141414)] border-r border-[var(--flint-border-subtle,#242424)] h-full flex flex-col p-3 shrink-0 overflow-hidden">
          {/* Search Box */}
          <div className="relative mb-3 shrink-0">
            <Search01Icon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--flint-text-muted,#666)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="w-full bg-[var(--flint-bg-input,#1e1e1e)] border border-[var(--flint-border-base,#2c2c2c)] focus:border-[var(--flint-border-strong,#444)] rounded-lg pl-8 pr-2.5 py-1 text-xs text-[var(--flint-text-primary)] placeholder-[var(--flint-text-muted,#666)] outline-none"
            />
          </div>

          {/* Nav Categories List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1">
            {/* Section 1: Options */}
            {filteredOptions.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <div className="text-[11px] font-medium text-[var(--flint-text-muted,#666)] px-2.5 py-1">Options</div>
                {filteredOptions.map((item) => {
                  const isActive = (activeTab === item.id || (isTrashViewOpen && item.id === 'files')) && !fontPickerMode;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setFontPickerMode(null);
                        setIsTrashViewOpen(false);
                        setActiveTab(item.id);
                      }}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[var(--flint-bg-sidebar-active,#252525)] text-[var(--flint-text-primary)] font-medium shadow-xs'
                          : 'text-[var(--flint-text-secondary,#999)] hover:bg-[var(--flint-bg-sidebar-hover,#202020)] hover:text-[var(--flint-text-primary)]'
                      }`}
                    >
                      <span className={isActive ? 'text-[var(--flint-text-primary)]' : 'text-[var(--flint-text-muted,#888)]'}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Section 2: Built-in Extensions */}
            {filteredCoreExtensions.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <div className="text-[11px] font-medium text-[var(--flint-text-muted,#666)] px-2.5 py-1">Built-in extensions</div>
                {filteredCoreExtensions.map((item) => {
                  const isActive = isTabMatch(item, activeTab) && !fontPickerMode && !isTrashViewOpen;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setFontPickerMode(null);
                        setIsTrashViewOpen(false);
                        setActiveTab(item.id);
                      }}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[var(--flint-bg-sidebar-active,#252525)] text-[var(--flint-text-primary)] font-medium shadow-xs'
                          : 'text-[var(--flint-text-secondary,#999)] hover:bg-[var(--flint-bg-sidebar-hover,#202020)] hover:text-[var(--flint-text-primary)]'
                      }`}
                    >
                      <span className={isActive ? 'text-[var(--flint-text-primary)]' : 'text-[var(--flint-text-muted,#888)]'}>{item.icon || <PackageIcon size={14} />}</span>
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Section 3: Community Extensions Settings */}
            {filteredCommunityExtensions.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <div className="text-[11px] font-medium text-[var(--flint-text-muted,#666)] px-2.5 py-1">Community extensions</div>
                {filteredCommunityExtensions.map((tab) => {
                  const isActive = isTabMatch(tab, activeTab) && !fontPickerMode && !isTrashViewOpen;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setFontPickerMode(null);
                        setIsTrashViewOpen(false);
                        setActiveTab(tab.id);
                      }}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-[var(--flint-bg-sidebar-active,#252525)] text-[var(--flint-text-primary)] font-medium shadow-xs'
                          : 'text-[var(--flint-text-secondary,#999)] hover:bg-[var(--flint-bg-sidebar-hover,#202020)] hover:text-[var(--flint-text-primary)]'
                      }`}
                    >
                      <span className={isActive ? 'text-[var(--flint-text-primary)]' : 'text-[var(--flint-text-muted,#888)]'}>{tab.icon || <PackageIcon size={14} />}</span>
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Global Reset Action */}
          <div className="pt-2 mt-auto border-t border-[var(--flint-border-subtle,#242424)] shrink-0">
            <button
              onClick={() => {
                restoreAllDefaults();
                showToast('Restored all settings to default values', 'info');
              }}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-[var(--flint-text-muted,#777)] hover:text-[var(--flint-text-primary)] hover:bg-[var(--flint-bg-sidebar-hover,#202020)] transition-colors cursor-pointer border border-transparent hover:border-[var(--flint-border-base)]"
              title="Restore all settings across all tabs to default"
            >
              <RotateCcwIcon size={12} />
              <span>Restore all defaults</span>
            </button>
          </div>
        </aside>

        {/* RIGHT COLUMN: Tab Content */}
        <main className="flex-1 bg-[var(--flint-bg-main,#181818)] h-full overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-2xl mx-auto">
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
            {!fontPickerMode && !isTrashViewOpen && allSettingTabs.some((t) => isTabMatch(t, activeTab)) && (
              <div className="flex flex-col gap-4">
                {(() => {
                  const currentTab = allSettingTabs.find((t) => isTabMatch(t, activeTab));
                  if (!currentTab) return null;
                  const extId = currentTab.extensionId || currentTab.pluginId || currentTab.id.split(':')[0];
                  const manifest = app.extensions.getExtensionManifest(extId);
                  const isEnabled = app.extensions.isExtensionEnabled(extId);

                  return (
                    <>
                      {/* Top Extension Header with Enabled Toggle matching CoreExtensions row design */}
                      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
                        <div className="flex-1 pr-4">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[13px] font-normal text-white">
                              {manifest?.name || currentTab.name}
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
                          {manifest?.readme && (
                            <button
                              type="button"
                              onClick={() => {
                                localStorage.setItem('flint_open_plugin_doc', JSON.stringify({ pluginId: extId, title: manifest?.name || currentTab.name, timestamp: Date.now() }));
                                useWorkspaceStore.getState().openExtensionDocTab(extId, manifest?.name || currentTab.name);
                                handleClose();
                              }}
                              title={`View ${manifest?.name || currentTab.name} documentation`}
                              className="w-7 h-7 rounded-[5px] flex items-center justify-center text-[#777] hover:text-[#dcddde] hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                            >
                              <BookOpen01Icon size={14} />
                            </button>
                          )}
                          <ToggleSwitch
                            checked={isEnabled}
                            onChange={async (val) => {
                              if (val) {
                                await app.extensions.enableExtension(extId);
                                showToast(`Enabled ${manifest?.name || 'extension'}`, 'success');
                              } else {
                                await app.extensions.disableExtension(extId);
                                showToast(`Disabled ${manifest?.name || 'extension'}`, 'info');
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Extension Setting Content */}
                      {isEnabled ? (
                        <div className="flex flex-col gap-4">
                          {currentTab.render()}
                        </div>
                      ) : (
                        <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3">
                          <span className="text-xs text-[#888]">
                            {manifest?.name || 'This extension'} is currently disabled.
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              await app.extensions.enableExtension(extId);
                              showToast(`Enabled ${manifest?.name || 'extension'}`, 'success');
                            }}
                            className="px-3.5 py-1.5 text-xs bg-[var(--flint-accent)] hover:bg-[var(--flint-accent-hover)] text-white rounded-lg font-medium transition-colors cursor-pointer"
                          >
                            Enable {manifest?.name || 'Extension'}
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
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
