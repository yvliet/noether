import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNoetherApp, useVaultTags } from 'noether';
import { useTagsSettings } from './tagsSettings';
import { TagItem, TagTreeNode } from '@/types';
import { buildTagTree } from '@/lib/db/tags';
import {
  Tag01Icon,
  Search01Icon,
  ArrowDownAZIcon,
  ArrowDown10Icon,
  FolderTreeIcon,
  HashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  File01Icon,
  HelpCircleIcon,
} from '@/components/common/Icons';
import { CollapseAllButton } from '@/components/common/CollapseAllButton';
import { Tooltip } from '@/components/common/Tooltip';

interface TagTreeRowProps {
  node: TagTreeNode;
  expandedTags: Set<string>;
  toggleTagExpand: (tag: string) => void;
  onSelectDoc: (id: string) => void;
  activeTag: string | null;
  setActiveTag: (tag: string | null) => void;
  filterQuery: string;
}

const TagTreeRow: React.FC<TagTreeRowProps> = ({
  node,
  expandedTags,
  toggleTagExpand,
  onSelectDoc,
  activeTag,
  setActiveTag,
  filterQuery,
}) => {
  const { showHashPrefix, showTagsCount } = useTagsSettings();
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedTags.has(node.fullPath);
  const isTagSelected = activeTag === node.fullPath;

  const matchesFilter = filterQuery
    ? node.fullPath.toLowerCase().includes(filterQuery.toLowerCase())
    : true;
  const hasMatchingDescendant = useMemo(() => {
    if (!filterQuery) return true;
    const check = (n: TagTreeNode): boolean => {
      if (n.fullPath.toLowerCase().includes(filterQuery.toLowerCase())) return true;
      return n.children.some(check);
    };
    return check(node);
  }, [node, filterQuery]);

  if (filterQuery && !matchesFilter && !hasMatchingDescendant) {
    return null;
  }

  return (
    <div className="flex flex-col select-none">
      <div
        onClick={() => {
          toggleTagExpand(node.fullPath);
          setActiveTag(isTagSelected ? null : node.fullPath);
        }}
        className={`group flex items-center justify-between px-2 py-1 rounded-[5px] cursor-pointer transition-colors ${
          isTagSelected
            ? 'bg-[#262626] text-white'
            : 'text-[#a0a0a0] hover:bg-[#1e1e1e] hover:text-[#e0e0e0]'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          {hasChildren || node.docs.length > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleTagExpand(node.fullPath);
              }}
              className="w-4 h-4 flex items-center justify-center text-[#666] group-hover:text-[#aaa] shrink-0"
            >
              {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
            </button>
          ) : (
            <div className="w-4 h-4 shrink-0" />
          )}

          {showHashPrefix && <span className="text-[#666] font-mono text-[11px]">#</span>}
          <span className="text-[12px] truncate">{node.name}</span>
        </div>

        {showTagsCount && (
          <span className="text-[10px] text-[#666] font-mono group-hover:text-[#888] shrink-0 ml-1">
            {node.count}
          </span>
        )}
      </div>

      {isExpanded && (
        <div className="border-l border-[#282828] ml-[15px] pl-[6px] flex flex-col gap-0.5 mt-0.5">
          {node.children.map((child) => (
            <TagTreeRow
              key={child.fullPath}
              node={child}
              expandedTags={expandedTags}
              toggleTagExpand={toggleTagExpand}
              onSelectDoc={onSelectDoc}
              activeTag={activeTag}
              setActiveTag={setActiveTag}
              filterQuery={filterQuery}
            />
          ))}

          {node.docs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onSelectDoc(doc.id)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-[4px] cursor-pointer text-[#777] hover:text-[#dcddde] hover:bg-[#1c1c1c] transition-colors"
            >
              <File01Icon size={12} className="text-[#555] shrink-0" />
              <span className="truncate text-[11px]">{doc.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const TagsView: React.FC = () => {
  const app = useNoetherApp();
  const vaultTags = useVaultTags();
  const setActiveDocumentById = useCallback((id: string) => {
    app.vault.openDocument(id);
  }, [app]);
  const { sortTagsBy, showTagsCount, showHashPrefix } = useTagsSettings();
  const [sortMode, setSortMode] = useState<'count' | 'alpha'>(sortTagsBy === 'alphabetical' ? 'alpha' : 'count');
  const [viewMode, setViewMode] = useState<'flat' | 'tree'>('tree');

  useEffect(() => {
    setSortMode(sortTagsBy === 'alphabetical' ? 'alpha' : 'count');
  }, [sortTagsBy]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const processedTags = useMemo(() => {
    let list = [...vaultTags];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.tag.toLowerCase().includes(q));
    }
    if (sortMode === 'count') {
      list.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    } else {
      list.sort((a, b) => a.tag.localeCompare(b.tag));
    }
    return list;
  }, [vaultTags, searchQuery, sortMode]);

  const treeNodes = useMemo(() => buildTagTree(processedTags), [processedTags]);

  const toggleTagExpand = (tag: string) => {
    setExpandedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const handleCollapseAll = () => {
    if (expandedTags.size > 0) {
      setExpandedTags(new Set());
    } else {
      const allPaths = new Set<string>();
      const collect = (nodes: TagTreeNode[]) => {
        for (const n of nodes) {
          allPaths.add(n.fullPath);
          if (n.children.length > 0) collect(n.children);
        }
      };
      collect(treeNodes);
      setExpandedTags(allPaths);
    }
  };

  const hasCollapsibleTags = useMemo(() => {
    const check = (nodes: TagTreeNode[]): boolean => nodes.some((n) => n.children.length > 0 || check(n.children));
    return check(treeNodes);
  }, [treeNodes]);

  const handleSelectDoc = (id: string) => {
    setActiveDocumentById(id);
  };

  return (
    <div className="flex flex-col h-full select-none text-xs">
      {/* Top Centered Action Header */}
      <div className="h-9 px-2 flex items-center justify-center gap-1.5 text-[var(--noether-text-muted)] shrink-0">
        <Tooltip content="Sort order" shortcut={sortMode === 'count' ? 'Frequency: 9-1' : 'Alphabetical: A-Z'}>
          <button
            onClick={() => setSortMode(sortMode === 'count' ? 'alpha' : 'count')}
            className={`p-1.5 rounded-[5px] cursor-pointer ${
              sortMode === 'count'
                ? 'bg-[var(--noether-bg-card-hover)] text-[var(--noether-text-primary)] border border-[var(--noether-border-strong)] shadow-[0_1px_2px_rgba(0,0,0,0.35)]'
                : 'text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] border border-transparent'
            }`}
          >
            {sortMode === 'count' ? <ArrowDown10Icon size={14} /> : <ArrowDownAZIcon size={14} />}
          </button>
        </Tooltip>

        <button
          onClick={() => setViewMode(viewMode === 'tree' ? 'flat' : 'tree')}
          title={`View mode: ${viewMode === 'tree' ? 'Hierarchical Tree' : 'Flat List'}`}
          className="p-1.5 rounded-[5px] hover:bg-[var(--noether-bg-card-hover)] text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] cursor-pointer"
        >
          {viewMode === 'tree' ? <FolderTreeIcon size={14} /> : <HashIcon size={14} />}
        </button>

        {viewMode === 'tree' && (
          <CollapseAllButton
            isCollapsed={expandedTags.size === 0}
            onToggle={handleCollapseAll}
            disabled={!hasCollapsibleTags || processedTags.length === 0}
            collapsedTitle="Expand all tags"
            expandedTitle="Collapse all tags"
            disabledTitle="No collapsible tags"
          />
        )}

        <button
          onClick={() => {
            setIsSearchOpen(!isSearchOpen);
            if (isSearchOpen) setSearchQuery('');
          }}
          title={isSearchOpen ? 'Close search' : 'Search tags'}
          className={`p-1.5 rounded-[5px] cursor-pointer ${
            isSearchOpen
              ? 'text-[var(--noether-text-primary)] bg-[var(--noether-bg-card-hover)] border border-[var(--noether-border-strong)] shadow-[0_1px_2px_rgba(0,0,0,0.35)]'
              : 'text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] hover:bg-[var(--noether-bg-card-hover)] border border-transparent'
          }`}
        >
          <Search01Icon size={14} />
        </button>
      </div>

      {isSearchOpen && (
        <div className="px-2.5 py-1.5">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[var(--noether-bg-input)] border border-[var(--noether-border-base)] text-xs text-[var(--noether-text-secondary)]">
            <Search01Icon size={13} className="text-[var(--noether-text-muted)] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tags..."
              autoFocus
              className="bg-transparent outline-none flex-1 text-xs text-[var(--noether-text-secondary)] placeholder-[var(--noether-text-faint)]"
            />
          </div>
        </div>
      )}

      {/* Main Tag Content */}
      <div className="flex-1 overflow-y-auto px-2 py-1 custom-scrollbar flex flex-col gap-0.5">
        {vaultTags.length === 0 ? (
          <div className="text-center py-12 flex items-center justify-center gap-1.5 select-none text-[#555]">
            <span className="text-[13px]">No tags found.</span>
            <span
              data-tooltip="Type #tag or #topic/subtopic&#10;in your notes to categorize ideas"
              className="inline-flex items-center text-[#555] hover:text-[#bbb] cursor-help transition-colors"
            >
              <HelpCircleIcon size={13} />
            </span>
          </div>
        ) : viewMode === 'tree' ? (
          <div className="flex flex-col gap-0.5">
            {treeNodes.map((node) => (
              <TagTreeRow
                key={node.fullPath}
                node={node}
                expandedTags={expandedTags}
                toggleTagExpand={toggleTagExpand}
                onSelectDoc={handleSelectDoc}
                activeTag={activeTag}
                setActiveTag={setActiveTag}
                filterQuery={searchQuery}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {processedTags.map((t) => {
              const isExpanded = expandedTags.has(t.tag);
              return (
                <div key={t.tag} className="flex flex-col">
                  <div
                    onClick={() => toggleTagExpand(t.tag)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-[#1e1e1e] cursor-pointer text-[#a0a0a0] hover:text-white transition-colors group"
                  >
                    <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                      {showHashPrefix && <span className="text-[#666] font-mono text-[11px]">#</span>}
                      <span className="text-[12px] truncate">{t.tag}</span>
                    </div>
                    {showTagsCount && (
                      <span className="text-[10px] text-[#666] font-mono group-hover:text-[#888]">
                        {t.count}
                      </span>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="border-l border-[#282828] ml-[15px] pl-[8px] flex flex-col gap-0.5 my-1">
                      {t.docs.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => handleSelectDoc(doc.id)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-[4px] cursor-pointer text-[#777] hover:text-[#dcddde] hover:bg-[#1c1c1c] transition-colors"
                        >
                          <File01Icon size={12} className="text-[#555] shrink-0" />
                          <span className="truncate text-[11px]">{doc.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
