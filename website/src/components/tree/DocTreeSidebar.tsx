import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { DocNode } from '../../types';
import { DocTreeNodeRow } from './DocTreeNodeRow';
import { Search01Icon, Cancel01Icon, Sun01Icon, Moon02Icon } from '../common/Icons';

export interface DocTreeSidebarProps {
  nodes: DocNode[];
  activeDocId: string;
  onSelectDoc: (node: DocNode) => void;
  className?: string;
}

const STORAGE_KEY = 'flint_docs_open_folders';
const THEME_STORAGE_KEY = 'flint_docs_theme';

const findAncestorFolderIds = (targetId: string, list: DocNode[], path: string[] = []): string[] | null => {
  if (!targetId) return null;
  const t = targetId.toLowerCase();
  for (const item of list) {
    if (item.id?.toLowerCase() === t || item.slug?.toLowerCase() === t) {
      return path;
    }
    if (item.children && item.children.length > 0) {
      const found = findAncestorFolderIds(targetId, item.children, [...path, item.id]);
      if (found) return found;
    }
  }
  return null;
};

export const DocTreeSidebar: React.FC<DocTreeSidebarProps> = React.memo(({
  nodes,
  activeDocId,
  onSelectDoc,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved) return saved === 'dark';
    } catch {}
    return !document.documentElement.classList.contains('theme-light');
  });

  const toggleTheme = useCallback(() => {
    setIsDarkTheme((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
      } catch {}
      if (next) {
        document.documentElement.classList.remove('theme-light', 'light');
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('theme-light', 'light');
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (isDarkTheme) {
      document.documentElement.classList.remove('theme-light', 'light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('theme-light', 'light');
    }
  }, [isDarkTheme]);

  // Restore previous visit's folder state, or expand active doc ancestors on first load
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return new Set<string>(parsed);
        }
      }
    } catch {
      // Ignore localStorage read errors
    }

    const initial = new Set<string>();
    const ancestors = findAncestorFolderIds(activeDocId, nodes);
    if (ancestors && ancestors.length > 0) {
      ancestors.forEach((id) => initial.add(id));
    }
    return initial;
  });

  // Persist open folders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(openFolderIds)));
    } catch {
      // Ignore localStorage write errors
    }
  }, [openFolderIds]);

  // Ensure active doc's parent folders are opened when navigating
  useEffect(() => {
    if (!activeDocId) return;
    const ancestors = findAncestorFolderIds(activeDocId, nodes);
    if (ancestors && ancestors.length > 0) {
      setOpenFolderIds((prev) => {
        let changed = false;
        const next = new Set(prev);
        ancestors.forEach((id) => {
          if (!next.has(id)) {
            next.add(id);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [activeDocId, nodes]);

  const toggleFolder = useCallback((id: string) => {
    setOpenFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Separate Home root item from regular folder tree
  const homeNode = useMemo(() => {
    return nodes.find((n) => n.id === 'home' || n.slug === 'home');
  }, [nodes]);

  const treeNodes = useMemo(() => {
    return nodes.filter((n) => n.id !== 'home' && n.slug !== 'home');
  }, [nodes]);

  // Filter nodes recursively based on search input
  const { filteredNodes, matchCount } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { filteredNodes: treeNodes, matchCount: 0 };
    }

    const q = searchQuery.toLowerCase();
    let count = 0;
    const matchingFolderIds = new Set<string>();

    const filter = (list: DocNode[], parentIds: string[] = []): DocNode[] => {
      const result: DocNode[] = [];

      for (const node of list) {
        const titleMatch = node.title.toLowerCase().includes(q);
        const contentMatch = node.content ? node.content.toLowerCase().includes(q) : false;
        const currentPath = [...parentIds, node.id];

        let filteredChildren: DocNode[] | undefined;
        if (node.children) {
          filteredChildren = filter(node.children, currentPath);
        }

        const hasMatchingChild = filteredChildren && filteredChildren.length > 0;

        if (titleMatch || contentMatch || hasMatchingChild) {
          if (titleMatch || contentMatch) {
            count++;
            parentIds.forEach((pid) => matchingFolderIds.add(pid));
          }
          if (hasMatchingChild) {
            matchingFolderIds.add(node.id);
          }

          result.push({
            ...node,
            children: filteredChildren,
          });
        }
      }

      return result;
    };

    const res = filter(treeNodes);
    setOpenFolderIds((prev) => new Set([...prev, ...matchingFolderIds]));
    return { filteredNodes: res, matchCount: count };
  }, [treeNodes, searchQuery]);

  const renderNode = (node: DocNode, level = 0): React.ReactNode => {
    const isFolder = Boolean(node.isFolder || (node.children && node.children.length > 0));
    const isOpen = openFolderIds.has(node.id);
    const isActive = activeDocId === node.id || activeDocId === node.slug;

    return (
      <DocTreeNodeRow
        key={node.id}
        id={node.id}
        level={level}
        title={node.title}
        typeBadge={node.badge}
        isFolder={isFolder}
        isOpen={isOpen}
        isActive={isActive}
        onSelect={() => {
          if (!isFolder) {
            onSelectDoc(node);
          } else {
            toggleFolder(node.id);
          }
        }}
        onToggle={() => toggleFolder(node.id)}
      >
        {isFolder && node.children && node.children.map((child) => renderNode(child, level + 1))}
      </DocTreeNodeRow>
    );
  };

  return (
    <aside
      className={`sidebar-container w-[280px] shrink-0 sticky top-0 h-screen max-h-screen flex flex-col bg-transparent select-none pt-2 pl-4 pr-1.5 border-r border-[#363636] overscroll-contain overflow-x-hidden ${className}`}
    >
      {/* Top Header: Brand Lockup with PNG Icon matching Image 1 */}
      <div className="pt-4 px-3 pb-2.5 flex items-center">
        <a
          href="#docs/home"
          onClick={(e) => {
            e.preventDefault();
            if (homeNode) onSelectDoc(homeNode);
            else window.location.hash = '#docs/home';
          }}
          className="flex items-start gap-1.5 text-white hover:text-white cursor-pointer"
        >
          <img
            src="./flint-icon.png"
            alt="Flint"
            className="h-[21px] w-auto object-contain shrink-0 translate-y-[1.5px]"
          />
          <span className="text-[21px] font-bold tracking-tight text-white leading-tight">
            Flint Docs
          </span>
        </a>
      </div>

      {/* Obsidian-style Theme Toggle Pill [ 🌙 ⚪ ] / [ ⚪ ☀️ ] */}
      <div className="px-3 pb-3 flex items-center">
        <button
          type="button"
          onClick={toggleTheme}
          title={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`flex items-center justify-between w-[46px] h-[22px] px-1.5 rounded-full cursor-pointer select-none transition-none ${
            isDarkTheme
              ? 'bg-[#1e1e1e] border border-[#2b2b2b] hover:border-[#3a3a3a]'
              : 'bg-[#e4e4e7] border border-[#d4d4d8] hover:border-[#a1a1aa]'
          }`}
        >
          {isDarkTheme ? (
            <>
              {/* Moon Icon */}
              <Moon02Icon size={12} className="text-[#999999] shrink-0" />
              {/* Toggle Knob on the right */}
              <div className="w-3 h-3 rounded-full bg-white shrink-0 shadow-sm" />
            </>
          ) : (
            <>
              {/* Toggle Knob on the left */}
              <div className="w-3 h-3 rounded-full bg-white shrink-0 shadow-sm" />
              {/* Sun Icon behind/on the right */}
              <Sun01Icon size={12} className="text-[#52525b] shrink-0" />
            </>
          )}
        </button>
      </div>

      {/* Search Bar matching Obsidian Docs */}
      <div className="px-3 pb-3">
        <div className="relative flex items-center w-full">
          <Search01Icon size={13} className="absolute left-2.5 text-[#555555] pointer-events-none shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search page or heading..."
            className="w-full h-8 pl-8 pr-7 bg-[#1a1a1a] border border-[#282828] rounded-md text-[13px] text-[#dadada] placeholder-[#666666] outline-none focus:border-[#444444]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-[#666666] hover:text-[#dadada] cursor-pointer"
            >
              <Cancel01Icon size={12} />
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="text-[11px] text-[#777777] mt-1.5 px-0.5">
            {matchCount} {matchCount === 1 ? 'match' : 'matches'}
          </div>
        )}
      </div>

      {/* File Tree Navigation */}
      <div className="flex-1 sidebar-hover-scrollbar px-1 pb-6">
        <div className="flex flex-col w-full space-y-0.5">
          {filteredNodes.map((node) => renderNode(node, 0))}

          {/* Root Home entry at bottom matching Obsidian layout */}
          {homeNode && !searchQuery && (
            <div
              onClick={() => onSelectDoc(homeNode)}
              style={{ paddingLeft: 28 }}
              className={`flex items-center pr-2 py-1 cursor-pointer text-[13.5px] font-normal transition-none bg-transparent ${
                activeDocId === 'home' || activeDocId === homeNode.slug || activeDocId === homeNode.id
                  ? 'text-[#ea580c] hover:text-[#f97316]'
                  : 'text-[#999999] hover:text-[#ffffff]'
              }`}
            >
              <span>Home</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
});

DocTreeSidebar.displayName = 'DocTreeSidebar';
