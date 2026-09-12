import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DocNode } from './types';
import { DOCS_TREE } from './data/docsContent';
import { DocTreeSidebar } from './components/tree/DocTreeSidebar';
import { DocsReader, extractTocItems, computeBacklinks } from './components/docs/DocsReader';
import { InteractiveGraphWidget } from './components/graph/InteractiveGraphWidget';
import { OnThisPageOutline } from './components/docs/OnThisPageOutline';
import { Menu01Icon, Sun01Icon, Moon02Icon } from './components/common/Icons';

const THEME_STORAGE_KEY = 'noether_docs_theme';

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

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const mobileBackdropRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  // Track viewport breakpoint to completely unmount graph physics on mobile
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (e.matches) {
        setIsMobileNavOpen(false);
      }
    };
    setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileNavOpen) {
        setIsMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileNavOpen]);

  // Interactive direct touch manipulation: hardware-accelerated direct DOM translation (zero React re-renders while dragging)
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isTracking = false;
    let isDragging = false;
    let rAFId: number | null = null;
    let pendingTx: number | null = null;
    let pendingProgress: number | null = null;

    const getDrawerWidth = () => {
      if (typeof window === 'undefined') return 320;
      return Math.min(window.innerWidth * 0.85, 320);
    };

    const updateDOM = () => {
      rAFId = null;
      if (mobileDrawerRef.current && pendingTx !== null) {
        mobileDrawerRef.current.style.transform = `translate3d(${pendingTx}px, 0, 0)`;
      }
      if (mobileBackdropRef.current && pendingProgress !== null) {
        mobileBackdropRef.current.style.opacity = `${pendingProgress}`;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      isDragging = false;

      // When closed, track swipes beginning near left screen edge (<= 100px)
      // When open, track swipes anywhere on screen
      if (!isMobileNavOpen) {
        isTracking = touchStartX <= 100;
      } else {
        isTracking = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTracking || e.touches.length !== 1) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - touchStartX;
      const deltaY = currentY - touchStartY;

      // Lock gesture to horizontal axis once initiated
      if (!isDragging) {
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
          isTracking = false;
          return;
        }
        if (Math.abs(deltaX) > 8) {
          isDragging = true;
          // Prepare elements for GPU drag layer
          if (mobileBackdropRef.current) {
            mobileBackdropRef.current.style.visibility = 'visible';
            mobileBackdropRef.current.style.pointerEvents = 'auto';
            mobileBackdropRef.current.style.willChange = 'opacity';
          }
          if (mobileDrawerRef.current) {
            mobileDrawerRef.current.style.visibility = 'visible';
            mobileDrawerRef.current.style.pointerEvents = 'auto';
            mobileDrawerRef.current.style.willChange = 'transform';
          }
        } else {
          return;
        }
      }

      // Prevent browser default history swipe-back navigation bubble
      if (e.cancelable) {
        e.preventDefault();
      }

      const drawerWidth = getDrawerWidth();

      if (!isMobileNavOpen) {
        // Dragging to open (stick to finger moving right)
        if (deltaX > 0) {
          const visibleWidth = Math.min(drawerWidth, deltaX);
          pendingTx = -drawerWidth + visibleWidth;
          pendingProgress = Math.max(0, Math.min(1, visibleWidth / drawerWidth));
        } else {
          pendingTx = -drawerWidth;
          pendingProgress = 0;
        }
      } else {
        // Dragging to close (stick to finger moving left)
        if (deltaX < 0) {
          pendingTx = Math.max(-drawerWidth, deltaX);
          pendingProgress = Math.max(0, Math.min(1, (drawerWidth + pendingTx) / drawerWidth));
        } else {
          pendingTx = 0;
          pendingProgress = 1;
        }
      }

      if (rAFId === null) {
        rAFId = requestAnimationFrame(updateDOM);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTracking) return;
      isTracking = false;

      if (rAFId !== null) {
        cancelAnimationFrame(rAFId);
        rAFId = null;
      }

      // Clean up GPU drag willChange styles and direct DOM overrides
      if (mobileBackdropRef.current) {
        mobileBackdropRef.current.style.willChange = '';
        mobileBackdropRef.current.style.opacity = '';
        mobileBackdropRef.current.style.visibility = '';
        mobileBackdropRef.current.style.pointerEvents = '';
      }
      if (mobileDrawerRef.current) {
        mobileDrawerRef.current.style.willChange = '';
        mobileDrawerRef.current.style.transform = '';
        mobileDrawerRef.current.style.visibility = '';
        mobileDrawerRef.current.style.pointerEvents = '';
      }

      if (isDragging && e.changedTouches.length === 1) {
        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX;
        const elapsedTime = Date.now() - touchStartTime;
        const drawerWidth = getDrawerWidth();

        if (!isMobileNavOpen) {
          const isFlick = deltaX > 45 && elapsedTime < 300;
          const isPassedThreshold = deltaX > drawerWidth * 0.35;
          if (isFlick || isPassedThreshold) {
            setIsMobileNavOpen(true);
          } else {
            setIsMobileNavOpen(false);
          }
        } else {
          const isFlick = deltaX < -45 && elapsedTime < 300;
          const isPassedThreshold = deltaX < -drawerWidth * 0.35;
          if (isFlick || isPassedThreshold) {
            setIsMobileNavOpen(false);
          } else {
            setIsMobileNavOpen(true);
          }
        }
      }

      isDragging = false;
      pendingTx = null;
      pendingProgress = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      if (rAFId !== null) cancelAnimationFrame(rAFId);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isMobileNavOpen]);

  // Theme management shared with mobile top bar
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

  const homeNode = useMemo(() => {
    return DOCS_TREE.find((n) => n.id === 'home' || n.slug === 'home') || DOCS_TREE[0];
  }, []);

  return (
    <div
      ref={scrollContainerRef}
      className="w-full h-screen overflow-y-auto custom-scrollbar bg-[#151515] text-[#dadada] overscroll-none touch-pan-y flex flex-col"
    >
      {/* Mobile Top Navigation Header (< 1024px) */}
      <header className="sticky top-0 z-30 flex lg:hidden items-center justify-between px-4 py-2.5 bg-[#151515] border-b border-[#2e2e2e] select-none w-full shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open navigation menu"
            className="p-1.5 -ml-1 rounded-md text-[#999999] hover:text-white hover:bg-[#202020] cursor-pointer"
          >
            <Menu01Icon size={18} />
          </button>

          <a
            href="#docs/home"
            onClick={(e) => {
              e.preventDefault();
              handleSelectDoc(homeNode);
            }}
            className="flex items-center gap-1.5 text-white hover:text-white cursor-pointer"
          >
            <img
              src="./noether-icon-simple.png"
              alt="Noether"
              className="h-[18px] w-auto object-contain shrink-0"
            />
            <span className="text-[17px] tracking-tight text-white leading-none font-brand">
              <span className="font-medium">Noether</span> <span className="font-extralight">Docs</span>
            </span>
          </a>
        </div>

        {/* Mobile Theme Toggle */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={toggleTheme}
            title={isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`flex items-center justify-between w-[44px] h-[22px] px-1.5 rounded-full cursor-pointer select-none transition-none ${
              isDarkTheme
                ? 'bg-[#1e1e1e] border border-[#2b2b2b] hover:border-[#3a3a3a]'
                : 'bg-[#e4e4e7] border border-[#d4d4d8] hover:border-[#a1a1aa]'
            }`}
          >
            {isDarkTheme ? (
              <>
                <Moon02Icon size={12} className="text-[#999999] shrink-0" />
                <div className="w-3 h-3 rounded-full bg-white shrink-0 shadow-sm" />
              </>
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-white shrink-0 shadow-sm" />
                <Sun01Icon size={12} className="text-[#52525b] shrink-0" />
              </>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      <div
        ref={mobileBackdropRef}
        onClick={() => setIsMobileNavOpen(false)}
        className={`fixed inset-0 bg-black/65 z-40 lg:hidden transition-none ${
          isMobileNavOpen ? 'visible pointer-events-auto opacity-100' : 'invisible pointer-events-none opacity-0'
        }`}
      />

      {/* Mobile Navigation Drawer */}
      <div
        ref={mobileDrawerRef}
        className={`fixed inset-y-0 left-0 w-[290px] sm:w-[320px] max-w-[85vw] bg-[#151515] border-r border-[#363636] z-50 flex flex-col shadow-2xl lg:hidden transition-none ${
          isMobileNavOpen
            ? 'visible pointer-events-auto translate-x-0'
            : 'invisible pointer-events-none -translate-x-full'
        }`}
      >
        <DocTreeSidebar
          nodes={DOCS_TREE}
          activeDocId={activeDoc.id}
          onSelectDoc={(doc) => {
            handleSelectDoc(doc);
            setIsMobileNavOpen(false);
          }}
          onClose={() => setIsMobileNavOpen(false)}
          className="w-full h-full border-r-0"
        />
      </div>

      {/* Main Multi-Column Content Area */}
      <div className="w-full flex items-start flex-1 justify-between px-2 sm:px-6 lg:pl-[124px] lg:pr-[6vw]">
        {/* Column 1: Left Navigation Sidebar (pinned desktop sidebar, hidden on mobile) */}
        <div className="hidden lg:flex shrink-0 sticky top-0 h-screen">
          <DocTreeSidebar
            nodes={DOCS_TREE}
            activeDocId={activeDoc.id}
            onSelectDoc={handleSelectDoc}
          />
        </div>

        {/* Column 2: Center Reading Canvas */}
        <DocsReader
          doc={activeDoc}
          allDocs={DOCS_TREE}
          onSelectDoc={handleSelectDoc}
          backlinks={backlinks}
        />

        {/* Column 3: Right Panel (Interactive Graph Widget + Outline, desktop only) */}
        {isDesktop && (
          <aside className="w-[260px] xl:w-[280px] shrink-0 sticky top-0 h-screen hidden lg:flex flex-col bg-transparent select-none pt-[35px] pb-6 overflow-hidden">
            {/* Interactive Graph View Canvas (Unmounted on mobile for zero physics overhead) */}
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

