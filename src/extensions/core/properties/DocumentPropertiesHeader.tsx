import React, { useState, useMemo, useCallback } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { usePropertiesSettings } from './propertiesSettings';
import { DocumentProperties } from '@/types';
import {
  PlusSignIcon,
  Cancel01Icon,
} from '@/components/common/Icons';
import { renderPropertyIcon, getPropertyIconName } from './propertyIcons';
import { PropertyRow } from './PropertyRow';
import { usePropertyFilters } from '@/core/app/AppContext';
import { isDocumentLocked } from '@/lib/db/documents';

export interface DocumentPropertiesHeaderProps {
  documentId: string;
  mode?: 'Visible' | 'Source';
  isFolded?: boolean;
}

export const DocumentPropertiesHeader: React.FC<DocumentPropertiesHeaderProps> = ({
  documentId,
  mode = 'Visible',
  isFolded = false,
}) => {
  const { documentProperties, updateProperties } = useDocumentStore();
  const { propertyIcons, setPropertyIcon, removePropertyIcon, defaultPropertyType, showInDocument } = usePropertiesSettings();
  const propertyFilters = usePropertyFilters();

  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [focusValueKey, setFocusValueKey] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const activeDocument = useDocumentStore((s) => s.activeDocument);
  const documents = useDocumentStore((s) => s.documents);
  const currentDoc = (activeDocument && activeDocument.id === documentId) ? activeDocument : documents.find((d) => d.id === documentId);

  const currentProps: DocumentProperties = useMemo(() => {
    if (currentDoc?.properties) {
      try {
        return typeof currentDoc.properties === 'string'
          ? JSON.parse(currentDoc.properties)
          : currentDoc.properties;
      } catch (e) {}
    }
    return documentProperties || {};
  }, [currentDoc?.properties, documentProperties]);

  const shouldHideProp = useCallback(
    (key: string, val: any) => {
      return propertyFilters.some((f) =>
        f.shouldHideProperty(key, val, { docId: documentId, properties: currentProps })
      );
    },
    [propertyFilters, documentId, currentProps]
  );

  const rawYaml = useMemo(() => {
    const lines: string[] = ['---'];
    Object.entries(currentProps).forEach(([k, v]) => {
      if (shouldHideProp(k, v)) return;
      if (Array.isArray(v)) {
        lines.push(`${k}: [${v.map((item) => JSON.stringify(item)).join(', ')}]`);
      } else if (typeof v === 'boolean') {
        lines.push(`${k}: ${v}`);
      } else if (typeof v === 'number') {
        lines.push(`${k}: ${v}`);
      } else if (typeof v === 'string') {
        lines.push(`${k}: "${v.replace(/"/g, '\\"')}"`);
      }
    });
    lines.push('---');
    return lines.join('\n');
  }, [currentProps, shouldHideProp]);

  const handleSaveValue = useCallback(async (key: string, value: any) => {
    const nextProps = { ...currentProps, [key]: value };
    await updateProperties(documentId, nextProps);
  }, [currentProps, documentId, updateProperties]);

  const handleRenameProperty = useCallback(async (oldKey: string, newKey: string) => {
    if (!newKey || oldKey === newKey) return;
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

    // Preserve custom icon assignment if present
    if (propertyIcons?.[oldKey.toLowerCase()]) {
      setPropertyIcon(cleanNewKey, propertyIcons[oldKey.toLowerCase()]);
    }

    await updateProperties(documentId, nextProps);
  }, [currentProps, documentId, propertyIcons, setPropertyIcon, updateProperties]);

  const handleDeleteProperty = useCallback(async (key: string) => {
    const nextProps = { ...currentProps };
    delete nextProps[key];
    await updateProperties(documentId, nextProps);
  }, [currentProps, documentId, updateProperties]);

  const handleAddDirectProperty = useCallback(async () => {
    // Determine unique property key name
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
    await updateProperties(documentId, nextProps);
  }, [currentProps, defaultPropertyType, documentId, updateProperties]);

  const tagKey = currentProps.Tags !== undefined ? 'Tags' : 'tags';

  const handleAddTag = useCallback(async (keepAdding = false) => {
    const cleanTag = newTagInput.trim().replace(/^#/, '');
    if (!cleanTag) {
      setIsAddingTag(false);
      return;
    }
    const currentTags = Array.isArray(currentProps[tagKey])
      ? currentProps[tagKey]
      : (Array.isArray(currentProps.tags) ? currentProps.tags : (Array.isArray(currentProps.Tags) ? currentProps.Tags : []));
    if (!currentTags.includes(cleanTag)) {
      await handleSaveValue(tagKey, [...currentTags, cleanTag]);
    }
    setNewTagInput('');
    setIsAddingTag(keepAdding);
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


  const createdDateStr = useMemo(() => {
    if (!currentDoc?.created_at) return '';
    return new Date(currentDoc.created_at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [currentDoc?.created_at]);

  const modifiedDateStr = useMemo(() => {
    if (!currentDoc?.updated_at) return '';
    return new Date(currentDoc.updated_at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [currentDoc?.updated_at]);

  const isLocked = isDocumentLocked(currentProps);

  const handleToggleLock = useCallback(async (_key: string, val: any) => {
    const lockKey = currentProps.Locked !== undefined ? 'Locked' : 'locked';
    await handleSaveValue(lockKey, val);
  }, [currentProps, handleSaveValue]);

  if (!showInDocument || isFolded) {
    return null;
  }

  if (mode === 'Source') {
    return (
      <div className="bg-[#1b1b1b] border border-[#2c2c2c] rounded-lg p-3 font-mono text-xs text-[#a0a0a0] mb-3">
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#282828] text-[11px] text-[#666]">
          <span>YAML FRONTMATTER</span>
        </div>
        <pre className="whitespace-pre-wrap select-text text-[#dcddde]">{rawYaml}</pre>
      </div>
    );
  }

  const tags: string[] = Array.isArray(currentProps[tagKey])
    ? currentProps[tagKey]
    : (Array.isArray(currentProps.tags) ? currentProps.tags : (Array.isArray(currentProps.Tags) ? currentProps.Tags : []));
  const systemKeys = new Set(['tags', 'aliases', 'created', 'modified', 'locked', 'read_only', 'lock', 'readonly', 'updated']);
  const customKeys = Object.keys(currentProps).filter((k) => {
    if (systemKeys.has(k.toLowerCase())) return false;
    if (shouldHideProp(k, currentProps[k])) return false;
    return true;
  });

  return (
    <div className="text-xs mb-3">
      <div className="flex flex-col gap-1.5">
        {/* 1. Created Date (Human-readable, read-only) */}
        {createdDateStr && (
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
            variant="doc"
          />
        )}

        {/* 2. Modified Date (Human-readable, updated on save) */}
        {modifiedDateStr && (
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
            variant="doc"
          />
        )}

        {/* 3. Read Only / Lock (Clickable yes/no toggle) */}
        <PropertyRow
          propertyKey="Locked"
          value={isLocked ? 'Yes' : 'No'}
          isReadOnlyKey
          onSaveValue={handleToggleLock}
          onRenameKey={() => {}}
          onDelete={() => {}}
          propertyIcons={propertyIcons}
          setPropertyIcon={setPropertyIcon}
          removePropertyIcon={removePropertyIcon}
          variant="doc"
        />

        {/* 4. Tags Row */}
        <div className="flex items-center gap-2 flex-wrap min-h-[28px]">
          <div className="relative flex items-center shrink-0 w-24">
            <span
              title={getPropertyIconName('Tags', propertyIcons)}
              className="p-1 -ml-1 text-[var(--flint-text-muted)] cursor-default flex items-center gap-1.5 mr-1 select-none"
            >
              {renderPropertyIcon('Tags', propertyIcons, { size: 12, className: 'text-[var(--flint-text-muted)]' })}
            </span>

            <span
              title={`Note Tags\nCategorize and filter notes with tags`}
              className="text-[11px] font-medium text-[var(--flint-text-muted)] cursor-default"
            >
              Tags
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {tags.map((tag) => (
              <span
                key={tag}
                title={`Tag: #${tag}${isLocked ? '' : "\nClick 'x' to remove tag"}`}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[5px] bg-[var(--flint-bg-card)] hover:bg-[var(--flint-bg-card-hover)] text-[var(--flint-text-secondary)] hover:text-[var(--flint-text-primary)] border border-[var(--flint-border-base)] hover:border-[var(--flint-border-strong)] shadow-xs transition-all font-medium text-xs"
              >
                #{tag}
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    title={`Remove #${tag}\nDelete this tag`}
                    className="text-[var(--flint-text-muted)] hover:text-rose-500 cursor-pointer ml-0.5"
                  >
                    <Cancel01Icon size={10} />
                  </button>
                )}
              </span>
            ))}

            {!isLocked && (
              isAddingTag ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[5px] bg-[var(--flint-bg-card)] text-[var(--flint-text-primary)] border border-[var(--flint-border-base)] shadow-xs font-medium text-xs">
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
                        } else if (e.key === 'Backspace' && !newTagInput && tags.length > 0) {
                          handleRemoveTag(tags[tags.length - 1]);
                        }
                      }}
                      placeholder=""
                      className="bg-transparent border-none outline-none text-[var(--flint-text-primary)] font-medium text-xs p-0 m-0 min-w-0"
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
                    className="text-[var(--flint-text-muted)] hover:text-rose-500 cursor-pointer ml-0.5"
                  >
                    <Cancel01Icon size={10} />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingTag(true)}
                  title={`Add Tag\nAttach a new tag to this note`}
                  className="text-[11px] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] px-1.5 py-0.5 rounded hover:bg-[var(--flint-bg-card-hover)] transition-colors cursor-pointer"
                >
                  + Add tag
                </button>
              )
            )}
          </div>
        </div>

        {/* 5. Custom Properties Rows */}
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
            variant="doc"
          />
        ))}

        {/* Seamless Add Property Button */}
        {!isLocked && (
          <div className="pt-0.5">
            <button
              type="button"
              onClick={handleAddDirectProperty}
              title={`Add Property\nCreate a new metadata field for this note`}
              className="text-[11px] text-[var(--flint-text-muted)] hover:text-[var(--flint-text-primary)] flex items-center gap-1 cursor-pointer transition-colors py-0.5 px-1 rounded hover:bg-[var(--flint-bg-card-hover)]"
            >
              <PlusSignIcon size={11} /> Add property
            </button>
          </div>
        )}
      </div>

      {/* Header Bottom Divider */}
      <div className="border-b border-[var(--flint-border-subtle)] mt-3" />
    </div>
  );
};

