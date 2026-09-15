import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder01Icon,
  ChevronRightIcon,
  Delete02Icon,
  PlusSignIcon,
  Cancel01Icon,
} from '@/components/common/Icons';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { CustomSelect } from '@/components/common/CustomSelect';
import {
  useSettingsStore,
  DEFAULT_SETTINGS,
  NewNoteLocation,
  LinkFormat,
} from '@/store/settingsStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useDocumentStore } from '@/store/documentStore';
import {
  SettingRow,
  SettingSection,
  FieldResetButton,
} from '../shared/SettingRow';

export interface FilesTabProps {
  onOpenTrash: () => void;
}

export const FilesTab: React.FC<FilesTabProps> = React.memo(({ onOpenTrash }) => {
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
  const excludedFolders = useSettingsStore((s) => s.excludedFolders);
  const addExcludedFolder = useSettingsStore((s) => s.addExcludedFolder);
  const removeExcludedFolder = useSettingsStore((s) => s.removeExcludedFolder);
  const promptFolderSelection = useWorkspaceStore((s) => s.promptFolderSelection);
  const setIsSettingsOpen = useWorkspaceStore((s) => s.setIsSettingsOpen);
  const restoreTabDefaults = useSettingsStore((s) => s.restoreTabDefaults);

  const [tempVaultName, setTempVaultName] = useState(vaultName);
  const [newExcludedInput, setNewExcludedInput] = useState('');

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

  const handleAddExcludedFolder = useCallback(() => {
    const trimmed = newExcludedInput.trim();
    if (trimmed) {
      addExcludedFolder(trimmed);
      setNewExcludedInput('');
      showToast(`Added "${trimmed}" to excluded folders`, 'success');
    }
  }, [newExcludedInput, addExcludedFolder, showToast]);

  const isFilesModified =
    skipDeleteConfirmation !== DEFAULT_SETTINGS.skipDeleteConfirmation ||
    skipRenameConfirmation !== DEFAULT_SETTINGS.skipRenameConfirmation ||
    closeTabsOnDelete !== DEFAULT_SETTINGS.closeTabsOnDelete ||
    newNoteLocation !== DEFAULT_SETTINGS.newNoteLocation ||
    attachmentFolder !== DEFAULT_SETTINGS.attachmentFolder ||
    showBrokenEmbedIndicators !== DEFAULT_SETTINGS.showBrokenEmbedIndicators ||
    linkFormat !== DEFAULT_SETTINGS.linkFormat ||
    autoUpdateLinks !== DEFAULT_SETTINGS.autoUpdateLinks ||
    excludedFolders.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Section 1: Vault & File Management */}
      <SettingSection
        title="Vault & File Management"
        description="Vault display name, deletion confirmation safeguards, and automatic tab cleanup."
        tabName="Files and links"
        sectionName="Vault"
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

      {/* Section 2: Default Locations & Linking */}
      <SettingSection
        title="Default Locations & Linking"
        description="Target destination folders for newly created notes, media assets, and internal wikilinks."
        tabName="Files and links"
        sectionName="Default location for new notes"
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

      {/* Section 3: Excluded Files & Folders */}
      <SettingSection
        title="Excluded Files & Folders"
        description="Folders to ignore across search, backlink indexing, and workspace navigation."
        tabName="Files and links"
        sectionName="Excluded files and folders"
      >
        <SettingRow
          title="Manage excluded folders"
          description="Folders to ignore across search, backlink indexing, and workspace navigation."
          keywords={['exclude', 'ignore', 'hidden', 'folder', 'filter', 'pattern']}
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Folder name (e.g. archive)..."
              value={newExcludedInput}
              onChange={(e) => setNewExcludedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddExcludedFolder();
              }}
              className="bg-[#2a2a2a] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none w-48 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] placeholder-[#666]"
            />
            <button
              onClick={handleAddExcludedFolder}
              disabled={!newExcludedInput.trim()}
              className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5"
            >
              <PlusSignIcon size={12} />
              <span>Add</span>
            </button>
          </div>
        </SettingRow>

        {excludedFolders.length > 0 && (
          <div className="p-3.5 flex flex-wrap gap-2">
            {excludedFolders.map((folder) => (
              <div
                key={folder}
                className="flex items-center gap-1.5 bg-[#252525] border border-[#333] text-white text-xs px-2.5 py-1 rounded-md"
              >
                <Folder01Icon size={12} className="text-[#888]" />
                <span>{folder}</span>
                <button
                  onClick={() => {
                    removeExcludedFolder(folder);
                    showToast(`Removed "${folder}" from excluded folders`, 'info');
                  }}
                  className="p-0.5 hover:bg-[#333] text-[#888] hover:text-white rounded cursor-pointer ml-1"
                  title="Remove"
                >
                  <Cancel01Icon size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </SettingSection>

      {/* Section 4: Trash & Recovery */}
      <SettingSection
        title="Trash & Recovery"
        description="View discarded notes or permanently purge all items from the local trash bin."
        tabName="Files and links"
        sectionName="Trash"
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
