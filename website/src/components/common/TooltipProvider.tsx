import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface TargetRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface TooltipData {
  text: string;
  shortcuts?: string[];
  targetRect: TargetRect;
  placement: TooltipPlacement;
}

interface PositionState {
  x: number;
  y: number;
  arrowOffset: number;
  placement: TooltipPlacement;
  ready: boolean;
}

const SHORTCUT_REGEX = /^(.*?)\s*\(((?:(?:Ctrl|Cmd|Alt|Shift|Option)\s*[+\-]\s*)+.*?|F\d+|Esc|Escape|Enter|Tab)\)$/i;

const formatShortcutStr = (str: string): string => {
  let cleaned = str
    .replace(/^[\d\.\-\*\s]+/, '') // strip leading list numbering like "1. ", "- ", etc.
    .replace(/^\((.+)\)$/, '$1')   // strip wrapping parentheses
    .trim();

  // If shortcut ends with "++", e.g. "Ctrl++" -> "Ctrl + +"
  cleaned = cleaned.replace(/\+{2,}$/, ' + +');
  // Normalize single '+' delimiters between modifiers and keys
  cleaned = cleaned.replace(/\s*\+\s*/g, ' + ');
  // Clean up duplicate spaces
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.trim();
};

const splitShortcutStr = (str: string): string[] => {
  if (str.includes(' / ')) {
    return str.split(' / ');
  }
  if (str.includes(' | ')) {
    return str.split(' | ');
  }
  // Match commas separating distinct shortcuts (not a key comma like "Ctrl+,")
  const parts = str.split(/(?<![+\-\s])\s*,\s*(?=(?:Ctrl|Cmd|Alt|Shift|Option|F\d+|Esc|Tab|Enter|[A-Za-z0-9]))/i);
  if (parts.length > 1) {
    return parts;
  }
  const commaSpaceParts = str.split(/,\s+(?=(?:Ctrl|Cmd|Alt|Shift|Option|F\d+|Esc|Tab|Enter)\b)/i);
  if (commaSpaceParts.length > 1) {
    return commaSpaceParts;
  }
  return [str];
};

export const TooltipProvider: React.FC = React.memo(() => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const activeTargetRef = useRef<Element | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PositionState>({
    x: 0,
    y: 0,
    arrowOffset: 0,
    placement: 'bottom',
    ready: false,
  });

  const updateTooltipForElement = useCallback((target: Element | null) => {
    if (!target) {
      activeTargetRef.current = null;
      setTooltip(null);
      return;
    }

    // Convert native title attribute to data-tooltip to suppress browser OS tooltip
    let rawContent = target.getAttribute('data-tooltip');
    const titleAttr = target.getAttribute('title');
    if (titleAttr) {
      rawContent = titleAttr;
      if (!target.closest('.ProseMirror, [contenteditable="true"]')) {
        target.setAttribute('data-tooltip', titleAttr);
        target.removeAttribute('title');
      }
    }

    if (!rawContent || !rawContent.trim()) {
      activeTargetRef.current = null;
      setTooltip(null);
      return;
    }

    activeTargetRef.current = target;

    // Extract shortcuts either from data-shortcuts, data-shortcut, multiline rawContent, or parenthesized suffixes
    const explicitShortcuts = target.getAttribute('data-shortcuts');
    const explicitShortcut = target.getAttribute('data-shortcut') || target.getAttribute('data-tooltip-shortcut');
    let text = rawContent.replace(/\\n/g, '\n').trim();
    let shortcuts: string[] = [];

    if (explicitShortcuts) {
      try {
        const parsed = JSON.parse(explicitShortcuts);
        if (Array.isArray(parsed)) {
          shortcuts = parsed.map((s) => formatShortcutStr(String(s))).filter(Boolean);
        }
      } catch {
        if (explicitShortcuts.includes('\n')) {
          shortcuts = explicitShortcuts
            .split('\n')
            .map((s) => formatShortcutStr(s))
            .filter(Boolean);
        } else {
          shortcuts = splitShortcutStr(explicitShortcuts)
            .map((s) => formatShortcutStr(s))
            .filter(Boolean);
        }
      }
    }

    if (shortcuts.length === 0 && explicitShortcut) {
      try {
        const parsed = JSON.parse(explicitShortcut);
        if (Array.isArray(parsed)) {
          shortcuts = parsed.map((s) => formatShortcutStr(String(s))).filter(Boolean);
        }
      } catch {
        if (explicitShortcut.includes('\n')) {
          shortcuts = explicitShortcut.split('\n').map((s) => formatShortcutStr(s)).filter(Boolean);
        } else {
          shortcuts = splitShortcutStr(explicitShortcut)
            .map((s) => formatShortcutStr(s))
            .filter(Boolean);
        }
      }
    }

    if (shortcuts.length === 0 && text.includes('\n')) {
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        text = lines[0];
        shortcuts = lines.slice(1).map((s) => {
          if (/(Ctrl|Cmd|Alt|Shift|Option|\+|F\d+|\bEsc\b|\bTab\b|\bSpace\b|\bEnter\b)/i.test(s) && s.length < 30) {
            return formatShortcutStr(s);
          }
          return s;
        }).filter(Boolean);
      }
    }

    if (shortcuts.length === 0) {
      const hintMatch = text.match(/^(.*?[\.\!\?]?)\s+(You can disable\b.*)$/i);
      if (hintMatch) {
        text = hintMatch[1].trim();
        shortcuts = [hintMatch[2].trim()];
      }
    }

    if (shortcuts.length === 0) {
      const multiParenMatches = Array.from(text.matchAll(/\(([^)]+)\)/g));
      if (multiParenMatches.length > 0) {
        let cleanText = text;
        const extracted: string[] = [];
        for (const m of multiParenMatches) {
          const inner = m[1].trim();
          if (/(Ctrl|Cmd|Alt|Shift|Option|\+|F\d+|\bEsc\b|\bTab\b|\bSpace\b|\bEnter\b)/i.test(inner)) {
            const parts = splitShortcutStr(inner);
            for (const p of parts) {
              const formatted = formatShortcutStr(p);
              if (formatted) extracted.push(formatted);
            }
            cleanText = cleanText.replace(m[0], '');
          }
        }
        if (extracted.length > 0) {
          text = cleanText.trim();
          shortcuts = extracted;
        }
      }
    }

    if (shortcuts.length === 0) {
      const match = text.match(SHORTCUT_REGEX);
      if (match) {
        text = match[1].trim();
        const formatted = formatShortcutStr(match[2]);
        if (formatted) shortcuts = [formatted];
      }
    }

    const anchorSelector = target.getAttribute('data-tooltip-anchor');
    const anchorEl = anchorSelector
      ? (target.querySelector(anchorSelector) || document.querySelector(anchorSelector))
      : null;

    const tRect = target.getBoundingClientRect();
    const aRect = anchorEl ? anchorEl.getBoundingClientRect() : tRect;

    if (tRect.width === 0 && tRect.height === 0) {
      activeTargetRef.current = null;
      setTooltip(null);
      return;
    }

    const preferredPlacement = target.getAttribute('data-tooltip-position') as TooltipPlacement | null;
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    let placement: TooltipPlacement = preferredPlacement || 'bottom';

    if (!preferredPlacement) {
      // 1. Sidebar bias: elements inside the sticky left sidebar render on the right
      const isSidebar = Boolean(
        target.closest('aside, .sidebar-container, [data-sidebar]') ||
        (tRect.left < 280 && tRect.top > 60)
      );

      // 2. Top bar bias: elements in the top navigation strip render at the bottom
      const isTopBar = Boolean(
        !isSidebar && (
          target.closest('header, [data-top-bar]') ||
          tRect.top <= 80
        )
      );

      // 3. Right outline bias: elements in the right TOC outline render on the left
      const isRightOutline = Boolean(
        target.closest('[data-outline]') ||
        tRect.left > winWidth - 280
      );

      if (isTopBar) {
        placement = 'bottom';
      } else if (isSidebar) {
        placement = 'right';
      } else if (isRightOutline) {
        placement = 'left';
      } else if (tRect.bottom > winHeight - 65) {
        placement = 'top';
      } else if (tRect.top < 65) {
        placement = 'bottom';
      } else if (tRect.right > winWidth - 70) {
        placement = 'left';
      } else if (tRect.left < 70) {
        placement = 'right';
      }
    }

    const targetRect: TargetRect = {
      left: aRect.left,
      top: Math.min(tRect.top, aRect.top),
      right: aRect.right,
      bottom: Math.max(tRect.bottom, aRect.bottom),
      width: aRect.width,
      height: tRect.height,
    };

    setTooltip({
      text,
      shortcuts,
      targetRect,
      placement,
    });
  }, []);

  useLayoutEffect(() => {
    if (!tooltip || !tooltipRef.current) {
      setPos((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }

    const el = tooltipRef.current;
    const tw = el.offsetWidth || 120;
    const th = el.offsetHeight || 32;
    const { targetRect } = tooltip;
    let placement = tooltip.placement;
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const gap = 7;
    const margin = 8;

    let x = 0;
    let y = 0;
    let arrowOffset = 0;

    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    // Smart auto-flip if requested placement overflows the viewport
    if (placement === 'bottom' && targetRect.bottom + gap + th > winHeight - margin) {
      if (targetRect.top - gap - th >= margin) {
        placement = 'top';
      }
    } else if (placement === 'top' && targetRect.top - gap - th < margin) {
      if (targetRect.bottom + gap + th <= winHeight - margin) {
        placement = 'bottom';
      }
    } else if (placement === 'right' && targetRect.right + gap + tw > winWidth - margin) {
      if (targetRect.left - gap - tw >= margin) {
        placement = 'left';
      }
    } else if (placement === 'left' && targetRect.left - gap - tw < margin) {
      if (targetRect.right + gap + tw <= winWidth - margin) {
        placement = 'right';
      }
    }

    const isVertical = placement === 'bottom' || placement === 'top';
    if (isVertical) {
      y = placement === 'bottom' ? targetRect.bottom + gap : targetRect.top - gap - th;
      const idealLeft = targetCenterX - tw / 2;
      x = Math.max(margin, Math.min(winWidth - tw - margin, idealLeft));
      arrowOffset = Math.max(10, Math.min(tw - 10, targetCenterX - x));
    } else {
      x = placement === 'right' ? targetRect.right + gap : targetRect.left - gap - tw;
      const idealTop = targetCenterY - th / 2;
      y = Math.max(margin, Math.min(winHeight - th - margin, idealTop));
      arrowOffset = Math.max(10, Math.min(th - 10, targetCenterY - y));
    }

    // Viewport clamping safeguard: ensure tooltip is NEVER offscreen
    x = Math.max(margin, Math.min(winWidth - tw - margin, x));
    y = Math.max(margin, Math.min(winHeight - th - margin, y));

    setPos({ x, y, arrowOffset, placement, ready: true });
  }, [tooltip]);

  useEffect(() => {
    // 1. Initial pass to convert all existing title attributes
    const sanitizeElement = (el: HTMLElement) => {
      if (el.closest('.ProseMirror, [contenteditable="true"]')) return;
      const title = el.getAttribute('title');
      if (title) {
        el.setAttribute('data-tooltip', title);
        el.removeAttribute('title');
      }
    };

    const sanitizeSubtree = (root: Node) => {
      if (root.nodeType === Node.ELEMENT_NODE) {
        const el = root as HTMLElement;
        sanitizeElement(el);
        const titledChildren = el.querySelectorAll?.('[title]');
        if (titledChildren && titledChildren.length > 0) {
          titledChildren.forEach((child) => sanitizeElement(child as HTMLElement));
        }
      }
    };

    document.querySelectorAll('[title]').forEach((el) => {
      sanitizeElement(el as HTMLElement);
    });

    // 2. Throttled MutationObserver observing attributes AND childList insertions
    let mutationRaf: number | null = null;
    const pendingMutations: MutationRecord[] = [];

    const processMutations = () => {
      mutationRaf = null;
      for (const m of pendingMutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach(sanitizeSubtree);
        } else if (m.type === 'attributes') {
          const el = m.target as HTMLElement;
          if (m.attributeName === 'title') {
            const title = el.getAttribute('title');
            if (title && !el.closest('.ProseMirror, [contenteditable="true"]')) {
              el.setAttribute('data-tooltip', title);
              el.removeAttribute('title');
              if (el === activeTargetRef.current) {
                updateTooltipForElement(el);
              }
            }
          } else if (
            el === activeTargetRef.current &&
            (m.attributeName === 'data-tooltip' ||
              m.attributeName === 'data-shortcut' ||
              m.attributeName === 'data-shortcuts' ||
              m.attributeName === 'data-tooltip-shortcut' ||
              m.attributeName === 'data-tooltip-position' ||
              m.attributeName === 'data-tooltip-anchor')
          ) {
            updateTooltipForElement(el);
          }
        }
      }
      pendingMutations.length = 0;
    };

    const observer = new MutationObserver((mutations) => {
      pendingMutations.push(...mutations);
      if (mutationRaf === null) {
        mutationRaf = requestAnimationFrame(processMutations);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: [
        'title',
        'data-tooltip',
        'data-shortcut',
        'data-shortcuts',
        'data-tooltip-shortcut',
        'data-tooltip-position',
        'data-tooltip-anchor',
      ],
    });

    // 3. Pointer & Mouse event listeners (capture phase to strip title and show tooltip immediately)
    const handlePointerOver = (e: Event) => {
      const rawTarget = e.target as Element | null;
      if (!rawTarget) return;

      // Aggressively strip any title attribute on target or ancestors in capture phase
      let curr: Element | null = rawTarget;
      while (curr && curr !== document.documentElement) {
        if (curr.hasAttribute('title') && !curr.closest('.ProseMirror, [contenteditable="true"]')) {
          const t = curr.getAttribute('title');
          if (t) {
            curr.setAttribute('data-tooltip', t);
            curr.removeAttribute('title');
          }
        }
        curr = curr.parentElement;
      }

      const target = rawTarget.closest?.('[data-tooltip], [title]');
      if (!target) {
        if (activeTargetRef.current) {
          activeTargetRef.current = null;
          setTooltip(null);
        }
        return;
      }

      if (target === activeTargetRef.current && !target.hasAttribute('title')) {
        return;
      }

      updateTooltipForElement(target);
    };

    const handlePointerOut = (e: Event) => {
      const pe = e as PointerEvent;
      const related = pe.relatedTarget as Element | null;
      if (!related || !activeTargetRef.current?.contains(related)) {
        activeTargetRef.current = null;
        setTooltip(null);
      }
    };

    const handleDismiss = () => {
      activeTargetRef.current = null;
      setTooltip(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    document.addEventListener('pointerover', handlePointerOver, true);
    document.addEventListener('mouseover', handlePointerOver, true);
    document.addEventListener('pointerout', handlePointerOut, true);
    document.addEventListener('pointerdown', handleDismiss, true);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('blur', handleDismiss);

    return () => {
      if (mutationRaf !== null) {
        cancelAnimationFrame(mutationRaf);
      }
      observer.disconnect();
      document.removeEventListener('pointerover', handlePointerOver, true);
      document.removeEventListener('mouseover', handlePointerOver, true);
      document.removeEventListener('pointerout', handlePointerOut, true);
      document.removeEventListener('pointerdown', handleDismiss, true);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('blur', handleDismiss);
    };
  }, [updateTooltipForElement]);

  if (!tooltip) return null;

  return ReactDOM.createPortal(
    <div
      ref={tooltipRef}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        opacity: pos.ready ? 1 : 0,
        visibility: pos.ready ? 'visible' : 'hidden',
        backgroundColor: 'var(--noether-tooltip-bg, #0d0d0d)',
        color: 'var(--noether-tooltip-text, var(--noether-text-primary, #ffffff))',
      }}
      className="fixed z-[99999] pointer-events-none px-2.5 py-1.5 text-[11.5px] font-medium leading-relaxed rounded-[5px] shadow-2xl w-max max-w-[min(340px,calc(100vw-24px))] select-none border-0 outline-none"
    >
      {/* Dynamic Arrow Element */}
      {pos.ready && (
        <span
          style={{
            ...(pos.placement === 'bottom'
              ? { left: `${pos.arrowOffset}px`, borderBottomColor: 'var(--noether-tooltip-bg, #0d0d0d)' }
              : pos.placement === 'top'
              ? { left: `${pos.arrowOffset}px`, borderTopColor: 'var(--noether-tooltip-bg, #0d0d0d)' }
              : pos.placement === 'right'
              ? { top: `${pos.arrowOffset}px`, borderRightColor: 'var(--noether-tooltip-bg, #0d0d0d)' }
              : { top: `${pos.arrowOffset}px`, borderLeftColor: 'var(--noether-tooltip-bg, #0d0d0d)' }),
          }}
          className={`absolute pointer-events-none w-0 h-0 ${
            pos.placement === 'bottom'
              ? '-top-[4px] -translate-x-1/2 border-x-4 border-x-transparent border-b-4'
              : pos.placement === 'top'
              ? '-bottom-[4px] -translate-x-1/2 border-x-4 border-x-transparent border-t-4'
              : pos.placement === 'right'
              ? '-left-[4px] -translate-y-1/2 border-y-4 border-y-transparent border-r-4'
              : '-right-[4px] -translate-y-1/2 border-y-4 border-y-transparent border-l-4'
          }`}
        />
      )}

      <div
        style={{ color: 'var(--noether-tooltip-text, var(--noether-text-primary, #ffffff))' }}
        className="leading-snug font-medium break-words"
      >
        {tooltip.text}
      </div>
      {tooltip.shortcuts && tooltip.shortcuts.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          {tooltip.shortcuts.map((sc, idx) => (
            <div
              key={idx}
              style={{ color: 'var(--noether-tooltip-muted, var(--noether-text-muted, #888888))' }}
              className="flex items-start gap-1.5 leading-snug text-[11px] font-normal break-words"
            >
              {tooltip.shortcuts!.length > 1 && (
                <span
                  style={{ backgroundColor: 'var(--noether-border-strong, #666666)' }}
                  className="w-1 h-1 rounded-full shrink-0 mt-1"
                />
              )}
              <span className="break-words">{sc}</span>
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
});

TooltipProvider.displayName = 'TooltipProvider';
