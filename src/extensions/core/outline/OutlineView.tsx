import React, { useState, useMemo, useEffect } from 'react';
import { useDocumentHeadings } from 'noether';
import { useOutlineSettings } from './outlineSettings';
import { HeadingItem } from '@/types';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  Search01Icon,
  HelpCircleIcon,
} from '@/components/common/Icons';
import { CollapseAllButton } from '@/components/common/CollapseAllButton';
import { SidebarActionHeader, SidebarActionButton } from '@/components/common/SidebarActionHeader';

interface OutlineNode {
  heading: HeadingItem;
  children: OutlineNode[];
  index: number;
}

function buildHeadingTree(headings: HeadingItem[]): OutlineNode[] {
  const root: OutlineNode[] = [];
  const stack: OutlineNode[] = [];

  headings.forEach((h, index) => {
    const node: OutlineNode = {
      heading: h,
      children: [],
      index,
    };

    while (stack.length > 0 && stack[stack.length - 1].heading.level >= h.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  });

  return root;
}

interface OutlineTreeNodeProps {
  node: OutlineNode;
  activeId: string | null;
  onSelect: (node: OutlineNode) => void;
  collapsedIds: Set<string>;
  toggleCollapse: (id: string) => void;
  filterQuery: string;
}

const OutlineTreeNode: React.FC<OutlineTreeNodeProps> = ({
  node,
  activeId,
  onSelect,
  collapsedIds,
  toggleCollapse,
  filterQuery,
}) => {
  const { showHeadingNumbers } = useOutlineSettings();
  const nodeId = node.heading.id || `node-${node.index}`;
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsedIds.has(nodeId);
  const isActive = activeId === nodeId;

  // Filter matching
  const matchesFilter = filterQuery
    ? node.heading.text.toLowerCase().includes(filterQuery.toLowerCase())
    : true;
  const hasMatchingDescendant = useMemo(() => {
    if (!filterQuery) return true;
    const check = (n: OutlineNode): boolean => {
      if (n.heading.text.toLowerCase().includes(filterQuery.toLowerCase())) return true;
      return n.children.some(check);
    };
    return check(node);
  }, [node, filterQuery]);

  if (filterQuery && !matchesFilter && !hasMatchingDescendant) {
    return null;
  }

  return (
    <div className="flex flex-col select-none">
      {/* Heading Item Row */}
      <div
        onClick={() => onSelect(node)}
        className={`group flex items-center gap-1.5 px-2 py-1 rounded-[5px] cursor-pointer ${
          isActive
            ? 'bg-[var(--noether-bg-sidebar-active)] text-[var(--noether-text-primary)] font-normal'
            : 'text-[var(--noether-text-secondary)] hover:bg-[var(--noether-bg-sidebar-hover)] hover:text-[var(--noether-text-primary)]'
        }`}
      >
        {/* Chevron for items with children, or empty spacer for leaf items */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(nodeId);
            }}
            className="w-4 h-4 flex items-center justify-center text-[var(--noether-text-muted)] group-hover:text-[var(--noether-text-secondary)] hover:text-[var(--noether-text-primary)] shrink-0"
          >
            {isCollapsed ? <ChevronRightIcon size={12} /> : <ChevronDownIcon size={12} />}
          </button>
        ) : (
          <div className="w-4 h-4 shrink-0" />
        )}

        {showHeadingNumbers && (
          <span className="text-[10px] font-mono text-[var(--noether-text-muted)] shrink-0 px-1 py-0.2 bg-[var(--noether-bg-input)] rounded-[3px]">
            H{node.heading.level}
          </span>
        )}

        {/* Heading Text */}
        <span className="truncate flex-1 text-[13px] tracking-tight leading-tight">
          {node.heading.text || 'Untitled'}
        </span>
      </div>

      {/* Children Sub-Tree with Hierarchy Guide Vertical Line */}
      {hasChildren && !isCollapsed && (
        <div className="border-l border-[var(--noether-border-base)] ml-[16px] pl-[6px] flex flex-col gap-0.5 mt-0.5">
          {node.children.map((child) => (
            <OutlineTreeNode
              key={child.heading.id || child.index}
              node={child}
              activeId={activeId}
              onSelect={onSelect}
              collapsedIds={collapsedIds}
              toggleCollapse={toggleCollapse}
              filterQuery={filterQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const OutlineView: React.FC = () => {
  const headings = useDocumentHeadings();
  const { collapseOutlineByDefault, maxHeadingLevel } = useOutlineSettings();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredHeadings = useMemo(() => {
    return headings.filter((h) => h.level <= maxHeadingLevel);
  }, [headings, maxHeadingLevel]);

  const tree = useMemo(() => buildHeadingTree(filteredHeadings), [filteredHeadings]);

  useEffect(() => {
    if (collapseOutlineByDefault) {
      const allWithChildren = new Set<string>();
      const collect = (nodes: OutlineNode[]) => {
        nodes.forEach((n) => {
          if (n.children.length > 0) {
            allWithChildren.add(n.heading.id || `node-${n.index}`);
            collect(n.children);
          }
        });
      };
      collect(tree);
      setCollapsedIds(allWithChildren);
    }
  }, [collapseOutlineByDefault, tree]);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCollapseAll = () => {
    if (collapsedIds.size > 0) {
      setCollapsedIds(new Set());
    } else {
      const allWithChildren = new Set<string>();
      const collect = (nodes: OutlineNode[]) => {
        nodes.forEach((n) => {
          if (n.children.length > 0) {
            allWithChildren.add(n.heading.id || `node-${n.index}`);
            collect(n.children);
          }
        });
      };
      collect(tree);
      setCollapsedIds(allWithChildren);
    }
  };

  const collapsibleCount = useMemo(() => {
    let count = 0;
    const countCollapsible = (nodes: OutlineNode[]) => {
      nodes.forEach((n) => {
        if (n.children.length > 0) {
          count++;
          countCollapsible(n.children);
        }
      });
    };
    countCollapsible(tree);
    return count;
  }, [tree]);

  const handleSelect = (node: OutlineNode) => {
    setActiveId(node.heading.id || `node-${node.index}`);

    window.dispatchEvent(
      new CustomEvent('noether:select-heading', {
        detail: {
          index: node.index,
          text: node.heading.text,
        },
      })
    );
  };

  return (
    <div className="flex flex-col h-full select-none text-xs">
      {/* Top Centered Action Header (Matching Left Sidebar) */}
      <SidebarActionHeader>
        <CollapseAllButton
          isCollapsed={collapsedIds.size > 0}
          onToggle={handleCollapseAll}
          disabled={collapsibleCount === 0}
          collapsedTitle="Expand all headings"
          expandedTitle="Collapse all headings"
          disabledTitle="No collapsible headings"
        />

        <SidebarActionButton
          onClick={() => {
            setIsSearchOpen(!isSearchOpen);
            if (isSearchOpen) setSearchQuery('');
          }}
          isActive={isSearchOpen}
          title={isSearchOpen ? 'Close search' : 'Search headings'}
          icon={<Search01Icon size={16} />}
        />
      </SidebarActionHeader>

      {/* Optional Search Input */}
      {isSearchOpen && (
        <div className="px-2.5 py-1.5">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[var(--noether-bg-input)] border border-[var(--noether-border-base)] text-xs text-[var(--noether-text-secondary)]">
            <Search01Icon size={13} className="text-[var(--noether-text-muted)] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter headings..."
              autoFocus
              className="bg-transparent outline-none flex-1 text-xs text-[var(--noether-text-secondary)] placeholder-[var(--noether-text-faint)]"
            />
          </div>
        </div>
      )}

      {/* Main Outline Content */}
      <div className="flex-1 overflow-y-auto px-2 py-1 custom-scrollbar">
        {headings.length === 0 ? (
          <div className="text-center py-12 flex items-center justify-center gap-1.5 select-none text-[var(--noether-text-muted)]">
            <span className="text-[13px]">No headings found.</span>
            <span
              data-tooltip="Type # Heading 1 or ## Heading 2&#10;in your note to generate an outline"
              className="inline-flex items-center text-[var(--noether-text-muted)] hover:text-[var(--noether-text-primary)] cursor-help"
            >
              <HelpCircleIcon size={13} />
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {tree.map((node) => (
              <OutlineTreeNode
                key={node.heading.id || node.index}
                node={node}
                activeId={activeId}
                onSelect={handleSelect}
                collapsedIds={collapsedIds}
                toggleCollapse={toggleCollapse}
                filterQuery={searchQuery}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
