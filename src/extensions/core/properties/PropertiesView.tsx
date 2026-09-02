import React, { useState, useMemo, useCallback } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { usePropertiesSettings } from './propertiesSettings';
import { DocumentProperties } from '@/types';
import {
  PlusSignIcon,
  Search01Icon,
  ArrowDownAZIcon,
  Clock01Icon,
  Cancel01Icon,
} from '@/components/common/Icons';
import { renderPropertyIcon, getPropertyIconName } from './propertyIcons';
import { PropertyRow } from './PropertyRow';
import { usePropertyFilters } from '@/core/app/AppContext';
import { isDocumentLocked } from '@/lib/db/documents';

export const PropertiesView: React.FC = () => {
  const { activeDocument, documentProperties, updateProperties } = useDocumentStore();
  const { wordCount, charCount } = useWorkspaceStore();
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
  const [newAliasInput, setNewAliasInput] = useState('');

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

  const isLocked = isDocumentLocked(currentProps);

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

  const tagKey = currentProps.Tags !== undefined ? 'Tags' : 'tags';
  const aliasKey = currentProps.Aliases !== undefined ? 'Aliases' : 'aliases';

  const handleAddTag = useCallback(async () => {
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().replace(/^#/, '');
    const currentTags = Array.isArray(currentProps[tagKey])
      ? currentProps[tagKey]
      : (Array.isArray(currentProps.tags) ? currentProps.tags : (Array.isArray(currentProps.Tags) ? currentProps.Tags : []));
    if (!currentTags.includes(cleanTag)) {
      await handleSaveValue(tagKey, [...currentTags, cleanTag]);
    }
    setNewTagInput('');
  }, [newTagInput, currentProps, tagKey, handleSaveValue]);

  const handleRemoveTag = useCallback(async (tagToRemove: string) => {
    const currentTags = Array.isArray(currentProps[tagKey])
      ? currentProps[tagKey]
      : (Array.isArray(currentProps.tags) ? currentProps.tags : (Array.isArray(currentProps.Tags) ? currentProps.Tags : []));
    await handleSaveValue(
      tagKey,
      currentTags.filter((t: string) => t !== tagToRemove)
    );
  }, [currentProps, tagKey, handleSaveValue]);

  const handleAddAlias = useCallback(async () => {
    if (!newAliasInput.trim()) return;
    const clean = newAliasInput.trim();
    const currentAliases = Array.isArray(currentProps[aliasKey])
      ? currentProps[aliasKey]
      : (Array.isArray(currentProps.aliases) ? currentProps.aliases : (Array.isArray(currentProps.Aliases) ? currentProps.Aliases : []));
    if (!currentAliases.includes(clean)) {
      await handleSaveValue(aliasKey, [...currentAliases, clean]);
    }
    setNewAliasInput('');
  }, [newAliasInput, currentProps, aliasKey, handleSaveValue]);

  const handleRemoveAlias = useCallback(async (aliasToRemove: string) => {
    const currentAliases = Array.isArray(currentProps[aliasKey])
      ? currentProps[aliasKey]
      : (Array.isArray(currentProps.aliases) ? currentProps.aliases : (Array.isArray(currentProps.Aliases) ? currentProps.Aliases : []));
    await handleSaveValue(
      aliasKey,
      currentAliases.filter((a: string) => a !== aliasToRemove)
    );
  }, [currentProps, aliasKey, handleSaveValue]);

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
      {/* Top Action Header */}
      <div className="h-9 px-2 flex items-center justify-between text-[var(--flint-text-muted)] shrink-0 border-b border-[var(--flint-border-subtle)]">
        {!isLocked && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleAddDirectProperty}
              title={`Add Property\nCreate a new metadata field for this note`}
              className="p-1.5 rounded hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
            >
              <PlusSignIcon size={13} />
              <span>Add property</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSortAlpha(!sortAlpha)}
            title={`Sort Properties\nSwitch to ${sortAlpha ? 'default order' : 'alphabetical order'}`}
            className={`p-1.5 rounded hover:bg-[var(--flint-bg-card-hover)] transition-colors cursor-pointer ${
              sortAlpha ? 'text-[var(--flint-text-primary)] bg-[var(--flint-bg-card-hover)]' : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)]'
            }`}
          >
            <ArrowDownAZIcon size={14} />
          </button>

          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) setSearchQuery('');
            }}
            title={isSearchOpen ? `Close Search\nHide property filter` : `Search Properties\nFilter properties by name`}
            className={`p-1.5 rounded hover:bg-[var(--flint-bg-card-hover)] transition-colors cursor-pointer ${
              isSearchOpen ? 'text-[var(--flint-text-primary)] bg-[var(--flint-bg-card-hover)]' : 'text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)]'
            }`}
          >
            <Search01Icon size={14} />
          </button>
        </div>
      </div>

      {/* Optional Search Input */}
      {isSearchOpen && (
        <div className="px-2.5 py-1.5 border-b border-[var(--flint-border-subtle)]">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[var(--flint-bg-input)] border border-[var(--flint-border-base)] text-xs text-[var(--flint-text-primary)] shadow-xs">
            <Search01Icon size={13} className="text-[var(--flint-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter properties..."
              autoFocus
              className="bg-transparent outline-none flex-1 text-xs text-[var(--flint-text-primary)] placeholder:text-[var(--flint-text-muted)]"
            />
          </div>
        </div>
      )}

      {/* Main Properties Content */}
      <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar flex flex-col gap-2">
        {/* Core & Custom Properties List */}
        <div className="flex flex-col gap-1.5">
          {/* Created Date */}
          {createdDateStr && (!searchQuery || 'created'.includes(searchQuery.toLowerCase())) && (
            <div className="p-2 rounded-lg bg-[var(--flint-bg-card)] border border-[var(--flint-border-subtle)] shadow-xs">
              <PropertyRow
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
            </div>
          )}

          {/* Modified Date */}
          {modifiedDateStr && (!searchQuery || 'modified'.includes(searchQuery.toLowerCase())) && (
            <div className="p-2 rounded-lg bg-[var(--flint-bg-card)] border border-[var(--flint-border-subtle)] shadow-xs">
              <PropertyRow
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
            </div>
          )}

          {/* Locked / Read Only Toggle */}
          {(!searchQuery || 'locked'.includes(searchQuery.toLowerCase()) || 'read only'.includes(searchQuery.toLowerCase())) && (
            <div className="p-2 rounded-lg bg-[var(--flint-bg-card)] border border-[var(--flint-border-subtle)] shadow-xs">
              <PropertyRow
                propertyKey="Locked"
                value={isLocked ? 'Yes' : 'No'}
                isReadOnlyKey
                onSaveValue={async (_key, val) => {
                  const lockKey = currentProps.Locked !== undefined ? 'Locked' : 'locked';
                  await handleSaveValue(lockKey, val);
                }}
                onRenameKey={() => {}}
                onDelete={() => {}}
                propertyIcons={propertyIcons}
                setPropertyIcon={setPropertyIcon}
                removePropertyIcon={removePropertyIcon}
                variant="sidebar"
              />
            </div>
          )}

          {/* Tags Section */}
          {(!searchQuery || 'tags'.includes(searchQuery.toLowerCase())) && (
            <div className="p-2 rounded-lg bg-[var(--flint-bg-card)] border border-[var(--flint-border-subtle)] shadow-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[var(--flint-text-secondary)]">
                <div className="relative flex items-center">
                  <span
                    title={getPropertyIconName('Tags', propertyIcons)}
                    className="p-1 -ml-1 text-[var(--flint-text-muted)] cursor-default flex items-center gap-1.5 mr-1 select-none"
                  >
                    {renderPropertyIcon('Tags', propertyIcons, { size: 12, className: 'text-[var(--flint-text-muted)]' })}
                  </span>

                  <span
                    title={`Note Tags\nCategorize and filter notes with tags`}
                    className="font-medium text-[11px] cursor-default text-[var(--flint-text-muted)]"
                  >
                    Tags
                  </span>
                </div>
                <span className="text-[10px] text-[var(--flint-text-muted)] font-mono">
                  {(Array.isArray(currentProps[tagKey]) ? currentProps[tagKey] : (Array.isArray(currentProps.tags) ? currentProps.tags : (Array.isArray(currentProps.Tags) ? currentProps.Tags : []))).length}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 items-center">
                {(Array.isArray(currentProps[tagKey]) ? currentProps[tagKey] : (Array.isArray(currentProps.tags) ? currentProps.tags : (Array.isArray(currentProps.Tags) ? currentProps.Tags : []))).map((t: string) => (
                  <span
                    key={t}
                    title={`Tag: #${t}${isLocked ? '' : "\nClick 'x' to remove tag"}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-[var(--flint-bg-input)] hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-accent)] hover:text-[var(--flint-accent-hover,var(--flint-accent))] text-[11px] font-mono border border-[var(--flint-border-base)] hover:border-[var(--flint-border-strong)] shadow-xs group transition-all"
                  >
                    #{t}
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        title={`Remove #${t}\nDelete this tag`}
                        className="text-[var(--flint-text-muted)] hover:text-rose-500 opacity-60 group-hover:opacity-100 cursor-pointer"
                      >
                        <Cancel01Icon size={10} />
                      </button>
                    )}
                  </span>
                ))}
                {!isLocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-[var(--flint-bg-input)] text-[var(--flint-accent)] text-[11px] font-mono border border-[var(--flint-border-base)] shadow-xs">
                    <span className="inline-flex items-center">
                      <span>#</span>
                      <input
                        type="text"
                        value={newTagInput}
                        style={{ width: `${Math.max(1, newTagInput.length)}ch` }}
                        onChange={(e) => setNewTagInput(e.target.value.replace(/^#/, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
                            e.preventDefault();
                            if (newTagInput.trim()) {
                              handleAddTag();
                            }
                          } else if (e.key === 'Backspace' && !newTagInput) {
                            const tagsList = Array.isArray(currentProps[tagKey]) ? currentProps[tagKey] : (Array.isArray(currentProps.tags) ? currentProps.tags : (Array.isArray(currentProps.Tags) ? currentProps.Tags : []));
                            if (tagsList.length > 0) {
                              handleRemoveTag(tagsList[tagsList.length - 1]);
                            }
                          }
                        }}
                        onBlur={() => {
                          if (newTagInput.trim()) {
                            handleAddTag();
                          }
                        }}
                        placeholder=""
                        className="bg-transparent border-none outline-none text-[var(--flint-accent)] text-[11px] font-mono p-0 m-0 min-w-0"
                      />
                    </span>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setNewTagInput('');
                      }}
                      title={`Cancel\nDiscard tag input`}
                      className="text-[var(--flint-text-muted)] hover:text-rose-500 cursor-pointer ml-0.5"
                    >
                      <Cancel01Icon size={10} />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Aliases Section */}
          {(!searchQuery || 'aliases'.includes(searchQuery.toLowerCase())) && (
            <div className="p-2 rounded-lg bg-[var(--flint-bg-card)] border border-[var(--flint-border-subtle)] shadow-xs flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[var(--flint-text-secondary)]">
                <div className="relative flex items-center">
                  <span
                    title={getPropertyIconName('Aliases', propertyIcons)}
                    className="p-1 -ml-1 text-[var(--flint-text-muted)] cursor-default flex items-center gap-1.5 mr-1 select-none"
                  >
                    {renderPropertyIcon('Aliases', propertyIcons, { size: 12, className: 'text-[var(--flint-text-muted)]' })}
                  </span>

                  <span
                    title={`Note Aliases\nAlternate names and titles for linking`}
                    className="font-medium text-[11px] cursor-default text-[var(--flint-text-muted)]"
                  >
                    Aliases
                  </span>
                </div>
                <span className="text-[10px] text-[var(--flint-text-muted)] font-mono">
                  {(Array.isArray(currentProps[aliasKey]) ? currentProps[aliasKey] : (Array.isArray(currentProps.aliases) ? currentProps.aliases : (Array.isArray(currentProps.Aliases) ? currentProps.Aliases : []))).length}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 items-center">
                {(Array.isArray(currentProps[aliasKey]) ? currentProps[aliasKey] : (Array.isArray(currentProps.aliases) ? currentProps.aliases : (Array.isArray(currentProps.Aliases) ? currentProps.Aliases : []))).map((a: string) => (
                  <span
                    key={a}
                    title={`Alias: ${a}${isLocked ? '' : "\nClick 'x' to remove alias"}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-[var(--flint-bg-input)] hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-primary)] hover:text-[var(--flint-text-primary)] text-[11px] border border-[var(--flint-border-base)] hover:border-[var(--flint-border-strong)] shadow-xs group transition-all font-medium"
                  >
                    {a}
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAlias(a)}
                        title={`Remove "${a}"\nDelete this alias`}
                        className="text-[var(--flint-text-muted)] hover:text-rose-500 opacity-60 group-hover:opacity-100 cursor-pointer"
                      >
                        <Cancel01Icon size={10} />
                      </button>
                    )}
                  </span>
                ))}
                {!isLocked && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] bg-[var(--flint-bg-input)] text-[var(--flint-text-primary)] text-[11px] border border-[var(--flint-border-base)] shadow-xs">
                    <span className="inline-grid grid-cols-1 items-center">
                      <span className="col-start-1 row-start-1 invisible whitespace-pre text-[11px] pointer-events-none min-w-[3ch]">
                        {newAliasInput || 'Add alias'}
                      </span>
                      <input
                        type="text"
                        value={newAliasInput}
                        onChange={(e) => setNewAliasInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
                            e.preventDefault();
                            if (newAliasInput.trim()) {
                              handleAddAlias();
                            }
                          } else if (e.key === 'Backspace' && !newAliasInput) {
                            const aliasesList = Array.isArray(currentProps[aliasKey]) ? currentProps[aliasKey] : (Array.isArray(currentProps.aliases) ? currentProps.aliases : (Array.isArray(currentProps.Aliases) ? currentProps.Aliases : []));
                            if (aliasesList.length > 0) {
                              handleRemoveAlias(aliasesList[aliasesList.length - 1]);
                            }
                          }
                        }}
                        onBlur={() => {
                          if (newAliasInput.trim()) {
                            handleAddAlias();
                          }
                        }}
                        placeholder="Add alias"
                        className="col-start-1 row-start-1 bg-transparent border-none outline-none text-[var(--flint-text-primary)] placeholder:text-[var(--flint-text-muted)] text-[11px] p-0 m-0 w-full"
                      />
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Custom Properties Rows */}
          {customKeys.map((key) => (
            <div key={key} className="p-2 rounded-lg bg-[var(--flint-bg-card)] border border-[var(--flint-border-subtle)] shadow-xs">
              <PropertyRow
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
            </div>
          ))}
        </div>

        {/* Note Statistics Card */}
        <div className="mt-2 p-3 rounded-lg bg-[var(--flint-bg-card)] border border-[var(--flint-border-subtle)] shadow-xs flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[var(--flint-text-secondary)] font-medium text-[11px] border-b border-[var(--flint-border-subtle)] pb-1.5">
            <Clock01Icon size={13} className="text-[var(--flint-text-muted)]" />
            <span>Document Details</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[var(--flint-text-muted)]">Words:</span>{' '}
              <span className="text-[var(--flint-text-primary)] font-medium">{wordCount}</span>
            </div>
            <div>
              <span className="text-[var(--flint-text-muted)]">Characters:</span>{' '}
              <span className="text-[var(--flint-text-primary)] font-medium">{charCount}</span>
            </div>
            <div>
              <span className="text-[var(--flint-text-muted)]">Reading time:</span>{' '}
              <span className="text-[var(--flint-text-primary)] font-medium">{readingTimeMins} min</span>
            </div>
            <div>
              <span className="text-[var(--flint-text-muted)]">Doc Type:</span>{' '}
              <span className="text-[var(--flint-text-primary)] font-medium uppercase">{activeDocument.doc_type || 'Note'}</span>
            </div>
          </div>

          <div className="border-t border-[var(--flint-border-subtle)] pt-2 flex flex-col gap-1 text-[10px] text-[var(--flint-text-muted)]">
            <div className="flex items-center justify-between">
              <span>Created:</span>
              <span className="text-[var(--flint-text-secondary)]">
                {new Date(activeDocument.created_at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Modified:</span>
              <span className="text-[var(--flint-text-secondary)]">
                {new Date(activeDocument.updated_at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
