import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DocNode } from './types';
import { DOCS_TREE } from './data/docsContent';
import { DocTreeSidebar } from './components/tree/DocTreeSidebar';
import { DocsReader, extractTocItems, computeBacklinks } from './components/docs/DocsReader';
import { InteractiveGraphWidget } from './components/graph/InteractiveGraphWidget';
import { OnThisPageOutline } from './components/docs/OnThisPageOutline';

export const App: React.FC = () => {
  // Find doc recursively by slug or id
  const findDocBySlugOrId = useCallback((slugOrId: string, nodes: DocNode[] = DOCS_TREE): DocNode | null => {
    const target = slugOrId.toLowerCase();
    for (const n of nodes) {
      if (n.slug?.toLowerCase() === target || n.id.toLowerCase() === target) {
        return n;
      }
      if (n.children) {
        const found = findDocBySlugOrId(target, n.children);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Determine initial doc from URL hash (#docs/<slug>[#<heading>])
  const [activeDoc, setActiveDoc] = useState<DocNode>(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash.startsWith('#docs/')) {
      const raw = hash.replace('#docs/', '');
      const slug = raw.split('#')[0];
      const match = findDocBySlugOrId(slug);
      if (match) return match;
    }
    return DOCS_TREE[0];
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightRailOpen, setIsRightRailOpen] = useState(true);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  // Extract table of content items for active document
  const tocItems = useMemo(() => {
    return extractTocItems(activeDoc.content || '');
  }, [activeDoc.content]);

  // Compute backlinks ("Links to this page") for active document
  const backlinks = useMemo(() => {
    return computeBacklinks(activeDoc, DOCS_TREE);
  }, [activeDoc]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initial scroll to heading anchor if present in URL
  useEffect(() => {
    const hash = window.location.hash.toLowerCase();
    if (hash.startsWith('#docs/')) {
      const raw = hash.replace('#docs/', '');
      const parts = raw.split('#');
      if (parts.length > 1 && parts[1]) {
        setTimeout(() => {
          const el = document.getElementById(parts[1]);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, []);

  // Listen to browser hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith('#docs/')) {
        const raw = hash.replace('#docs/', '');
        const [slug, headingAnchor] = raw.split('#');
        const match = findDocBySlugOrId(slug);
        if (match) {
          setActiveDoc(match);
          if (headingAnchor) {
            setTimeout(() => {
              const el = document.getElementById(headingAnchor);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 60);
          } else {
            scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          }
        }
      } else if (!hash || hash === '#' || hash === '#home') {
        setActiveDoc(DOCS_TREE[0]);
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [findDocBySlugOrId]);

  const handleSelectDoc = useCallback((doc: DocNode) => {
    setActiveDoc(doc);
    window.location.hash = `#docs/${doc.slug || doc.id}`;
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const handleScrollToHeading = useCallback((headingId: string) => {
    setActiveHeadingId(headingId);
    const element = document.getElementById(headingId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Highlight current section in outline deterministically as reader scrolls the page
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || tocItems.length === 0) {
      setActiveHeadingId('');
      return;
    }

    let rAFId: number | null = null;

    const updateActiveHeading = () => {
      const containerRect = container.getBoundingClientRect();
      const { scrollTop, scrollHeight, clientHeight } = container;

      // When reader has reached the bottom of the page, highlight the final section
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setActiveHeadingId(tocItems[tocItems.length - 1].id);
        return;
      }

      // Find the last heading that has scrolled past the upper reading threshold
      const ACTIVATION_OFFSET = 120; // px below top of scroll container
      let currentActiveId = tocItems[0].id;

      for (let i = 0; i < tocItems.length; i++) {
        const item = tocItems[i];
        const el = document.getElementById(item.id);
        if (!el) continue;

        const relTop = el.getBoundingClientRect().top - containerRect.top;
        if (relTop <= ACTIVATION_OFFSET) {
          currentActiveId = item.id;
        } else {
          // Headings are ordered sequentially down the page
          break;
        }
      }

      setActiveHeadingId(currentActiveId);
    };

    const handleScroll = () => {
      if (rAFId !== null) return;
      rAFId = requestAnimationFrame(() => {
        rAFId = null;
        updateActiveHeading();
      });
    };

    // Initial check and layout calibration
    updateActiveHeading();
    const timer = setTimeout(updateActiveHeading, 60);

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      if (rAFId !== null) cancelAnimationFrame(rAFId);
      clearTimeout(timer);
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [tocItems, activeDoc.id]);

  return (
    <div
      ref={scrollContainerRef}
      className="w-full h-screen overflow-y-auto custom-scrollbar bg-[#151515] text-[#dadada] overscroll-none"
    >
      <div className="w-full flex items-start min-h-full justify-between px-4 sm:px-8 lg:pl-[124px] lg:pr-[6vw]">
        {/* Column 1: Left Navigation Sidebar (pinned with sticky top-0 and its own tree scrollbar) */}
        {isSidebarOpen && (
          <DocTreeSidebar
            nodes={DOCS_TREE}
            activeDocId={activeDoc.id}
            onSelectDoc={handleSelectDoc}
          />
        )}

        {/* Column 2: Center Reading Canvas (natural content height, no inner scrollbar) */}
        <DocsReader
          doc={activeDoc}
          allDocs={DOCS_TREE}
          onSelectDoc={handleSelectDoc}
        />

        {/* Column 3: Right Panel (Interactive Graph Widget + Outline, sticky top-0, unaffected by page scrolling) */}
        {isRightRailOpen && (
          <aside className="w-[260px] xl:w-[280px] shrink-0 sticky top-0 h-screen hidden lg:flex flex-col bg-transparent select-none pt-[35px] pb-6 overflow-hidden">
            {/* Interactive Graph View Canvas */}
            <InteractiveGraphWidget
              nodes={DOCS_TREE}
              activeDocId={activeDoc.id}
              onSelectDoc={handleSelectDoc}
            />

            {/* On This Page Document Outline & Backlinks */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar mt-6">
              <OnThisPageOutline
                items={tocItems}
                activeHeadingId={activeHeadingId}
                onSelectHeading={handleScrollToHeading}
                backlinks={backlinks}
                onSelectDoc={handleSelectDoc}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
