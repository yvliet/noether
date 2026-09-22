import React, { useState, useMemo, useCallback } from 'react';
import {
  useNoetherApp,
  useActiveDocument,
  useDocumentProperties,
  useNoetherStore,
} from 'noether';
import { usePropertiesSettings } from './propertiesSettings';
import { DocumentProperties } from '@/types';
import {
  PlusSignIcon,
  Search01Icon,
  ArrowDownAZIcon,
  Clock01Icon,
  Cancel01Icon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@/components/common/Icons';
import { renderPropertyIcon, getPropertyIconName } from './propertyIcons';
import { PropertyRow } from './PropertyRow';
import { usePropertyFilters } from '@/core/app/AppContext';
import { SidebarActionHeader, SidebarActionButton } from '@/components/common/SidebarActionHeader';

export const PropertiesView: React.FC = () => {
  const app = useNoetherApp();
  const activeDocument = useActiveDocument();
  const documentProperties = useDocumentProperties();
  const updateProperties = useCallback((docId: string, props: Record<string, any>) => {
    return app.vault.setDocumentProperties(docId, props);
  }, [app]);
  const wordCount = useNoetherStore('workspace', (s) => s?.wordCount ?? 0);
  const charCount = useNoetherStore('workspace', (s) => s?.charCount ?? 0);
  const {
    propertyIcons,
    setPropertyIcon,
    removePropertyIcon,
    defaultPropertyType,
    sortPropertiesAlphabetically,
  } = usePropertiesSettings();
  const propertyFilters = usePropertyFilters();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortAlpha, setSortAlpha] = useState(sortPropertiesAlphabetically);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [focusValueKey, setFocusValueKey] = useState<string | null>(null);

  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newAliasInput, setNewAliasInput] = useState('');
  const [isAddingAlias, setIsAddingAlias] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);

  const currentProps: DocumentProperties = useMemo(() => {
    if (activeDocument?.properties) {
      try {
        return typeof activeDocument.properties === 'string'
          ? JSON.parse(activeDocument.properties)
          : activeDocument.properties;
      } catch (e) {}
    }
    return documentProperties || {};
  }, [activeDocument?.properties, documentProperties]);

  const allKeys = useMemo(() => {
    let keys = Object.keys(currentProps).filter((k) => {
      if (!activeDocument) return true;
      return propertyFilters.every(
        (f) => !f.shouldHideProperty(k, currentProps[k], { docId: activeDocument.id, properties: currentProps })
      );
    });
    const standardKeys = ['aliases', 'tags', 'cssclasses'];
    const merged = Array.from(new Set([...standardKeys, ...keys]));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return merged.filter((k) => k.toLowerCase().includes(q));
    }

    if (sortAlpha) {
      return merged.sort((a, b) => a.localeCompare(b));
    }
    return merged;
  }, [currentProps, activeDocument, propertyFilters, searchQuery, sortAlpha]);

  const createdDateStr = useMemo(() => {
    if (!activeDocument?.created_at) return '';
    return new Date(activeDocument.created_at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [activeDocument?.created_at]);

  const modifiedDateStr = useMemo(() => {
    if (!activeDocument?.updated_at) return '';
    return new Date(activeDocument.updated_at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [activeDocument?.updated_at]);

  const isLocked = Boolean(currentProps?.locked ?? currentProps?.Locked) || (activeDocument ? app.vault.isDocumentLocked(activeDocument.id) : false);

  const customKeys = useMemo(() => {
    const systemKeys = new Set(['tags', 'aliases', 'created', 'modified', 'locked', 'read_only', 'lock', 'readonly', 'updated']);
    return allKeys.filter((k) => !systemKeys.has(k.toLowerCase()));
  }, [allKeys]);

  const handleSaveValue = useCallback(async (key: string, value: any) => {
    if (!activeDocument) return;
    const nextProps = { ...currentProps, [key]: value };
    await updateProperties(activeDocument.id, nextProps);
  }, [activeDocument, currentProps, updateProperties]);

  const handleRenameProperty = useCallback(async (oldKey: string, newKey: string) => {
    if (!activeDocument || !newKey || oldKey === newKey) return;
    const cleanNewKey = newKey.trim().replace(/\s+/g, '_');
    if (!cleanNewKey) return;

    // Retain exact property key order
    const nextProps: DocumentProperties = {};
    for (const [k, v] of Object.entries(currentProps)) {
      if (k === oldKey) {
        nextProps[cleanNewKey] = v;
      } else {
        nextProps[k] = v;
      }
    }

    if (propertyIcons?.[oldKey.toLowerCase()]) {
      setPropertyIcon(cleanNewKey, propertyIcons[oldKey.toLowerCase()]);
    }

    await updateProperties(activeDocument.id, nextProps);
  }, [activeDocument, currentProps, propertyIcons, setPropertyIcon, updateProperties]);

  const handleDeleteProperty = useCallback(async (key: string) => {
    if (!activeDocument) return;
    const nextProps = { ...currentProps };
    delete nextProps[key];
    await updateProperties(activeDocument.id, nextProps);
  }, [activeDocument, currentProps, updateProperties]);

  const handleAddDirectProperty = useCallback(async () => {
    if (!activeDocument) return;

    let candidateKey = 'Property';
    let counter = 1;
    while (currentProps[candidateKey] !== undefined || currentProps[candidateKey.toLowerCase()] !== undefined) {
      candidateKey = `Property_${counter}`;
      counter++;
    }

    let initVal: any = '';
    if (defaultPropertyType === 'number') initVal = 0;
    else if (defaultPropertyType === 'checkbox') initVal = false;

    const nextProps = { ...currentProps, [candidateKey]: initVal };
    setFocusKey(candidateKey);
    await updateProperties(activeDocument.id, nextProps);
  }, [activeDocument, currentProps, defaultPropertyType, updateProperties]);

  const tagsList: string[] = useMemo(() => {
    return Array.isArray(currentProps.Tags)
      ? currentProps.Tags
      : (Array.isArray(currentProps.tags) ? currentProps.tags : []);
  }, [currentProps]);

  const aliasesList: string[] = useMemo(() => {
    return Array.isArray(currentProps.Aliases)
      ? currentProps.Aliases
      : (Array.isArray(currentProps.aliases) ? currentProps.aliases : []);
  }, [currentProps]);

  const handleAddTag = useCallback(async (keepAdding = false) => {
    if (!activeDocument) return;
    const cleanTag = newTagInput.trim().replace(/^#/, '');
    if (!cleanTag) {
      setIsAddingTag(false);
      return;
    }
    if (!tagsList.includes(cleanTag)) {
      const nextProps = { ...currentProps, Tags: [...tagsList, cleanTag] };
      delete nextProps.tags;
      await updateProperties(activeDocument.id, nextProps);
    }
    setNewTagInput('');
    setIsAddingTag(keepAdding);
  }, [activeDocument, newTagInput, tagsList, currentProps, updateProperties]);

  const handleRemoveTag = useCallback(async (tagToRemove: string) => {
    if (!activeDocument) return;
    const nextProps = { ...currentProps, Tags: tagsList.filter((t: string) => t !== tagToRemove) };
    delete nextProps.tags;
    await updateProperties(activeDocument.id, nextProps);
  }, [activeDocument, tagsList, currentProps, updateProperties]);

  const handleAddAlias = useCallback(async (keepAdding = false) => {
    if (!activeDocument) return;
    const clean = newAliasInput.trim();
    if (!clean) {
      setIsAddingAlias(false);
      return;
    }
    if (!aliasesList.includes(clean)) {
      const nextProps = { ...currentProps, Aliases: [...aliasesList, clean] };
      delete nextProps.aliases;
      await updateProperties(activeDocument.id, nextProps);
    }
    setNewAliasInput('');
    setIsAddingAlias(keepAdding);
  }, [activeDocument, newAliasInput, aliasesList, currentProps, updateProperties]);

  const handleRemoveAlias = useCallback(async (aliasToRemove: string) => {
    if (!activeDocument) return;
    const nextProps = { ...currentProps, Aliases: aliasesList.filter((a: string) => a !== aliasToRemove) };
    delete nextProps.aliases;
    await updateProperties(activeDocument.id, nextProps);
  }, [activeDocument, aliasesList, currentProps, updateProperties]);

  if (!activeDocument) {
    return (
      <div className="text-center py-12 text-[#555] text-[13px] select-none">
        No note selected.
      </div>
    );
  }

  const readingTimeMins = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="flex flex-col h-full select-none text-xs">
      {/* Top Centered Action Header */}
      <SidebarActionHeader>
        {!isLocked && (
          <SidebarActionButton
            onClick={handleAddDirectProperty}
            title={`Add Property\nCreate a new metadata field for this note`}
            icon={<PlusSignIcon size={16} />}
          />
        )}

        <SidebarActionButton
          onClick={() => setSortAlpha(!sortAlpha)}
          isActive={sortAlpha}
          title={`Sort Properties\nSwitch to ${sortAlpha ? 'default order' : 'alphabetical order'}`}
          icon={<ArrowDownAZIcon size={16} />}
        />

        <SidebarActionButton
          onClick={() => {
            setIsSearchOpen(!isSearchOpen);
            if (isSearchOpen) setSearchQuery('');
          }}
          isActive={isSearchOpen}
          title={isSearchOpen ? 'Close search' : 'Search properties'}
          icon={<Search01Icon size={16} />}
        />
      </SidebarActionHeader>

      {/* Optional Search Input */}
      {isSearchOpen && (
        <div className="px-2 pb-1.5">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[var(--noether-bg-input)] border border-[var(--noether-border-base)] text-xs text-[var(--noether-text-secondary)]">
            <Search01Icon size={13} className="text-[var(--noether-text-muted)] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter properties..."
              autoFocus
              className="bg-transparent outline-none flex-1 text-xs text-[var(--noether-text-secondary)] placeholder-[var(--noether-text-faint)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] cursor-pointer"
              >
                <Cancel01Icon size={11} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Properties Content */}
      <div className="flex-1 overflow-y-auto px-2 py-1 custom-scrollbar flex flex-col gap-1">
        <div className="flex flex-col gap-0.5">
          {/* Created Date */}
          {createdDateStr && (!searchQuery || 'created'.includes(searchQuery.toLowerCase())) && (
            <PropertyRow
              key="system-created"
              propertyKey="Created"
              value={createdDateStr}
              isReadOnlyKey
              isReadOnlyValue
              onSaveValue={() => {}}
              onRenameKey={() => {}}
              onDelete={() => {}}
              propertyIcons={propertyIcons}
              setPropertyIcon={setPropertyIcon}
              removePropertyIcon={removePropertyIcon}
              variant="sidebar"
            />
          )}

          {/* Modified Date */}
          {modifiedDateStr && (!searchQuery || 'modified'.includes(searchQuery.toLowerCase())) && (
            <PropertyRow
              key="system-modified"
              propertyKey="Modified"
              value={modifiedDateStr}
              isReadOnlyKey
              isReadOnlyValue
              onSaveValue={() => {}}
              onRenameKey={() => {}}
              onDelete={() => {}}
              propertyIcons={propertyIcons}
              setPropertyIcon={setPropertyIcon}
              removePropertyIcon={removePropertyIcon}
              variant="sidebar"
            />
          )}

          {/* Locked / Read Only Toggle */}
          {(!searchQuery || 'locked'.includes(searchQuery.toLowerCase()) || 'read only'.includes(searchQuery.toLowerCase())) && (
            <PropertyRow
              key="system-locked"
              propertyKey="Locked"
              value={isLocked ? 'Yes' : 'No'}
              isReadOnlyKey
              onSaveValue={async (_key, val) => {
                if (!activeDocument) return;
                const nextProps: Record<string, any> = { ...currentProps, Locked: val };
                delete nextProps.locked;
                await updateProperties(activeDocument.id, nextProps);
              }}
              onRenameKey={() => {}}
              onDelete={() => {}}
              propertyIcons={propertyIcons}
              setPropertyIcon={setPropertyIcon}
              removePropertyIcon={removePropertyIcon}
              variant="sidebar"
            />
          )}

          {/* Tags Row */}
          {(!searchQuery || 'tags'.includes(searchQuery.toLowerCase())) && (
            <div key="system-tags" className="flex items-center gap-2 flex-wrap min-h-[28px] px-1.5 py-0.5 rounded-[5px] hover:bg-[var(--noether-bg-sidebar-hover)] group">
              <div className="relative flex items-center shrink-0 w-24">
                <span
                  title={getPropertyIconName('Tags', propertyIcons)}
                  className="p-1 -ml-1 text-[var(--noether-text-muted)] cursor-default flex items-center justify-center shrink-0 mr-1 select-none"
                >
                  {renderPropertyIcon('Tags', propertyIcons, { size: 12, className: 'text-[var(--noether-text-muted)] shrink-0' })}
                </span>

                <span
                  title={`Note Tags\nCategorize and filter notes with tags`}
                  className="text-[11px] font-normal text-[var(--noether-text-muted)] cursor-default"
                >
                  Tags
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0 pl-0.5">
                {tagsList.map((tag: string, idx: number) => (
                  <span
                    key={`${tag}-${idx}`}
                    title={`Tag: #${tag}${isLocked ? '' : "\nClick 'x' to remove tag"}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-[var(--noether-bg-card)] hover:bg-[var(--noether-bg-sidebar-hover,#1f1f1f)] text-[var(--noether-text-secondary)] hover:text-[var(--noether-text-primary)] border border-[var(--noether-border-base)] hover:border-[var(--noether-border-strong)] shadow-xs font-normal text-xs"
                  >
                    #{tag}
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        title={`Remove #${tag}\nDelete this tag`}
                        className="text-[var(--noether-text-muted)] hover:text-rose-500 cursor-pointer ml-0.5"
                      >
                        <Cancel01Icon size={10} />
                      </button>
                    )}
                  </span>
                ))}

                {!isLocked && (
                  isAddingTag ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-[var(--noether-bg-card)] text-[var(--noether-text-primary)] border border-[var(--noether-border-base)] shadow-xs font-normal text-xs">
                      <span className="inline-flex items-center">
                        <span>#</span>
                        <input
                          type="text"
                          autoFocus
                          value={newTagInput}
                          style={{ width: `${Math.max(1, newTagInput.length)}ch` }}
                          onChange={(e) => setNewTagInput(e.target.value.replace(/^#/, ''))}
                          onBlur={() => {
                            if (newTagInput.trim()) {
                              handleAddTag(false);
                            } else {
                              setIsAddingTag(false);
                            }
                          }}
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
                              e.stopPropagation();
                              return;
                            }
                            if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
                              e.preventDefault();
                              if (newTagInput.trim()) {
                                handleAddTag(true);
                              } else {
                                setIsAddingTag(false);
                              }
                            } else if (e.key === 'Escape') {
                              setNewTagInput('');
                              setIsAddingTag(false);
                            } else if (e.key === 'Backspace' && !newTagInput && tagsList.length > 0) {
                              handleRemoveTag(tagsList[tagsList.length - 1]);
                            }
                          }}
                          placeholder=""
                          className="bg-transparent border-none outline-none text-[var(--noether-text-primary)] font-normal text-xs p-0 m-0 min-w-0"
                        />
                      </span>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setNewTagInput('');
                          setIsAddingTag(false);
                        }}
                        title={`Cancel\nDiscard tag input`}
                        className="text-[var(--noether-text-muted)] hover:text-rose-500 cursor-pointer ml-0.5"
                      >
                        <Cancel01Icon size={10} />
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingTag(true)}
                      title={`Add Tag\nAttach a new tag to this note`}
                      className="text-[11px] text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] px-1.5 py-0.5 rounded hover:bg-[var(--noether-bg-sidebar-hover)] cursor-pointer"
                    >
                      + Add tag
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Aliases Row */}
          {(!searchQuery || 'aliases'.includes(searchQuery.toLowerCase())) && (
            <div key="system-aliases" className="flex items-center gap-2 flex-wrap min-h-[28px] px-1.5 py-0.5 rounded-[5px] hover:bg-[var(--noether-bg-sidebar-hover)] group">
              <div className="relative flex items-center shrink-0 w-24">
                <span
                  title={getPropertyIconName('Aliases', propertyIcons)}
                  className="p-1 -ml-1 text-[var(--noether-text-muted)] cursor-default flex items-center justify-center shrink-0 mr-1 select-none"
                >
                  {renderPropertyIcon('Aliases', propertyIcons, { size: 12, className: 'text-[var(--noether-text-muted)] shrink-0' })}
                </span>

                <span
                  title={`Note Aliases\nAlternate names and titles for linking`}
                  className="text-[11px] font-normal text-[var(--noether-text-muted)] cursor-default"
                >
                  Aliases
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0 pl-0.5">
                {aliasesList.map((alias: string, idx: number) => (
                  <span
                    key={`${alias}-${idx}`}
                    title={`Alias: ${alias}${isLocked ? '' : "\nClick 'x' to remove alias"}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-[var(--noether-bg-card)] hover:bg-[var(--noether-bg-sidebar-hover,#1f1f1f)] text-[var(--noether-text-secondary)] hover:text-[var(--noether-text-primary)] border border-[var(--noether-border-base)] hover:border-[var(--noether-border-strong)] shadow-xs font-normal text-xs"
                  >
                    {alias}
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAlias(alias)}
                        title={`Remove "${alias}"\nDelete this alias`}
                        className="text-[var(--noether-text-muted)] hover:text-rose-500 cursor-pointer ml-0.5"
                      >
                        <Cancel01Icon size={10} />
                      </button>
                    )}
                  </span>
                ))}

                {!isLocked && (
                  isAddingAlias ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-[var(--noether-bg-card)] text-[var(--noether-text-primary)] border border-[var(--noether-border-base)] shadow-xs font-normal text-xs">
                      <input
                        type="text"
                        autoFocus
                        value={newAliasInput}
                        style={{ width: `${Math.max(3, newAliasInput.length)}ch` }}
                        onChange={(e) => setNewAliasInput(e.target.value)}
                        onBlur={() => {
                          if (newAliasInput.trim()) {
                            handleAddAlias(false);
                          } else {
                            setIsAddingAlias(false);
                          }
                        }}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
                            e.stopPropagation();
                            return;
                          }
                          if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
                            e.preventDefault();
                            if (newAliasInput.trim()) {
                              handleAddAlias(true);
                            } else {
                              setIsAddingAlias(false);
                            }
                          } else if (e.key === 'Escape') {
                            setNewAliasInput('');
                            setIsAddingAlias(false);
                          } else if (e.key === 'Backspace' && !newAliasInput && aliasesList.length > 0) {
                            handleRemoveAlias(aliasesList[aliasesList.length - 1]);
                          }
                        }}
                        placeholder=""
                        className="bg-transparent border-none outline-none text-[var(--noether-text-primary)] font-normal text-xs p-0 m-0 min-w-0"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setNewAliasInput('');
                          setIsAddingAlias(false);
                        }}
                        title={`Cancel\nDiscard alias input`}
                        className="text-[var(--noether-text-muted)] hover:text-rose-500 cursor-pointer ml-0.5"
                      >
                        <Cancel01Icon size={10} />
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingAlias(true)}
                      title={`Add Alias\nAttach an alternate name to this note`}
                      className="text-[11px] text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] px-1.5 py-0.5 rounded hover:bg-[var(--noether-bg-sidebar-hover)] cursor-pointer"
                    >
                      + Add alias
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Custom Properties Rows */}
          {customKeys.map((key) => (
            <PropertyRow
              key={key}
              propertyKey={key}
              value={currentProps[key]}
              autoFocusKey={focusKey === key}
              autoFocusValue={focusValueKey === key}
              isReadOnlyKey={isLocked}
              isReadOnlyValue={isLocked}
              onSaveValue={handleSaveValue}
              onRenameKey={handleRenameProperty}
              onDelete={handleDeleteProperty}
              onShiftFocusToValue={(k) => setFocusValueKey(k)}
              propertyIcons={propertyIcons}
              setPropertyIcon={setPropertyIcon}
              removePropertyIcon={removePropertyIcon}
              variant="sidebar"
            />
          ))}
        </div>

        {/* Document Details Section */}
        <div className="mt-2 pt-2 border-t border-[var(--noether-border-subtle)] flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
            className="flex items-center justify-between px-1.5 py-1 rounded-[5px] hover:bg-[var(--noether-bg-sidebar-hover)] text-left cursor-pointer group text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)]"
          >
            <div className="flex items-center gap-1.5 font-normal text-[11px]">
              {isDetailsOpen ? (
                <ChevronDownIcon size={12} className="text-[var(--noether-text-muted)]" />
              ) : (
                <ChevronRightIcon size={12} className="text-[var(--noether-text-muted)]" />
              )}
              <span>Document details</span>
            </div>
          </button>

          {isDetailsOpen && (
            <div className="px-1.5 py-1 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--noether-text-muted)]">Words</span>
                <span className="text-[var(--noether-text-primary)] font-normal">{wordCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--noether-text-muted)]">Characters</span>
                <span className="text-[var(--noether-text-primary)] font-normal">{charCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--noether-text-muted)]">Read time</span>
                <span className="text-[var(--noether-text-primary)] font-normal">{readingTimeMins} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--noether-text-muted)]">Type</span>
                <span className="text-[var(--noether-text-primary)] font-normal uppercase text-[10px]">
                  {(!activeDocument.doc_type || activeDocument.doc_type === 'base') ? 'MD' : activeDocument.doc_type}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
