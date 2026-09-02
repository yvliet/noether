import {
  StickyNote02Icon,
  Folder01Icon,
  NeuralNetworkIcon,
  Layout01Icon,
} from '@hugeicons/core-free-icons';
import { renderHugeIconSvg } from '@/components/common/Icons';

export const STICKY_NOTE_02_SVG = renderHugeIconSvg(StickyNote02Icon, { size: 15, color: '#dcdcdc', style: 'flex-shrink:0;' });
export const FOLDER_SVG = renderHugeIconSvg(Folder01Icon, { size: 15, color: '#dcdcdc', strokeWidth: 2, style: 'flex-shrink:0;' });
export const NEURAL_NETWORK_SVG = renderHugeIconSvg(NeuralNetworkIcon, { size: 15, color: '#dcdcdc', strokeWidth: 1.5, style: 'flex-shrink:0;' });
export const GIT_FORK_SVG = NEURAL_NETWORK_SVG;
export const CANVAS_LAYOUT_SVG = renderHugeIconSvg(Layout01Icon, { size: 15, color: '#dcdcdc', strokeWidth: 1.5, style: 'flex-shrink:0;' });

class DragTooltipManager {
  private el: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private subtitleEl: HTMLElement | null = null;
  private iconEl: HTMLElement | null = null;
  private currentSvg: string | null = null;

  init() {
    if (this.el || typeof document === 'undefined') return;

    const container = document.createElement('div');
    container.id = 'flint-drag-preview-tooltip';
    container.style.position = 'fixed';
    container.style.top = '0px';
    container.style.left = '0px';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '999999';
    container.style.display = 'none';
    container.style.willChange = 'transform';
    container.style.backgroundColor = '#080808';
    container.style.color = '#ffffff';
    container.style.padding = '6px 12px';
    container.style.borderRadius = '6px';
    container.style.border = '1px solid rgba(255,255,255,0.12)';
    container.style.boxShadow = '0 6px 16px rgba(0,0,0,0.6)';
    container.style.fontFamily = 'var(--font-interface)';
    container.style.flexDirection = 'column';
    container.style.gap = '2px';
    container.style.minWidth = '120px';
    container.style.maxWidth = '260px';
    container.style.userSelect = 'none';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '6px';
    header.style.minWidth = '0';

    const icon = document.createElement('span');
    icon.style.display = 'flex';
    icon.style.alignItems = 'center';
    icon.style.flexShrink = '0';
    this.iconEl = icon;

    const title = document.createElement('span');
    title.style.fontWeight = '600';
    title.style.fontSize = '13px';
    title.style.color = '#ffffff';
    title.style.lineHeight = '1.2';
    title.style.overflow = 'hidden';
    title.style.textOverflow = 'ellipsis';
    title.style.whiteSpace = 'nowrap';
    title.style.letterSpacing = '-0.01em';
    this.titleEl = title;

    header.appendChild(icon);
    header.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.style.fontSize = '11.5px';
    subtitle.style.fontWeight = '500';
    subtitle.style.color = '#9e9e9e';
    subtitle.style.lineHeight = '1.2';
    subtitle.style.overflow = 'hidden';
    subtitle.style.textOverflow = 'ellipsis';
    subtitle.style.whiteSpace = 'nowrap';
    subtitle.style.marginTop = '2px';
    subtitle.style.display = 'none';
    this.subtitleEl = subtitle;

    container.appendChild(header);
    container.appendChild(subtitle);

    document.body.appendChild(container);
    this.el = container;
  }

  show(title: string, subtitle: string | null, iconSvgOrDef: string | any, x: number, y: number) {
    this.init();
    if (!this.el || !this.titleEl || !this.subtitleEl || !this.iconEl) return;

    if (this.titleEl.textContent !== title) {
      this.titleEl.textContent = title;
    }
    if (subtitle) {
      if (this.subtitleEl.textContent !== subtitle) {
        this.subtitleEl.textContent = subtitle;
      }
      this.subtitleEl.style.display = 'block';
    } else {
      this.subtitleEl.textContent = '';
      this.subtitleEl.style.display = 'none';
    }
    const svgContent = typeof iconSvgOrDef === 'string'
      ? iconSvgOrDef
      : renderHugeIconSvg(iconSvgOrDef, { size: 15, color: '#dcdcdc', style: 'flex-shrink:0;' });
    if (this.currentSvg !== svgContent) {
      this.iconEl.innerHTML = svgContent;
      this.currentSvg = svgContent;
    }
    this.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    this.el.style.display = 'flex';
  }

  updatePosition(x: number, y: number) {
    if (!this.el || this.el.style.display === 'none') return;
    if (x === 0 && y === 0) return;
    this.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  updateTitle(title: string) {
    if (!this.titleEl) return;
    if (this.titleEl.textContent !== title) {
      this.titleEl.textContent = title;
    }
  }

  updateSubtitle(subtitle: string | null) {
    if (!this.subtitleEl) return;
    if (subtitle) {
      if (this.subtitleEl.textContent !== subtitle) {
        this.subtitleEl.textContent = subtitle;
      }
      this.subtitleEl.style.display = 'block';
    } else {
      this.subtitleEl.textContent = '';
      this.subtitleEl.style.display = 'none';
    }
  }

  hide() {
    if (this.el) {
      this.el.style.display = 'none';
    }
  }
}

export const dragTooltipManager = new DragTooltipManager();
