import React from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  File01Icon as HugeFile01Icon,
  FileAddIcon as HugeFileAddIcon,
  Folder01Icon as HugeFolder01Icon,
  FolderOpenIcon as HugeFolderOpenIcon,
  FolderAddIcon as HugeFolderAddIcon,
  Search01Icon as HugeSearch01Icon,
  Bookmark01Icon as HugeBookmark01Icon,
  PlusSignIcon as HugePlusSignIcon,
  Cancel01Icon as HugeCancel01Icon,
  ArrowLeft01Icon as HugeArrowLeft01Icon,
  ArrowRight01Icon as HugeArrowRight01Icon,
  ArrowDown01Icon as HugeArrowDown01Icon,
  ArrowUp01Icon as HugeArrowUp01Icon,
  BookOpen01Icon as HugeBookOpen01Icon,
  MoreVerticalIcon as HugeMoreVerticalIcon,
  LinkSquare02Icon as HugeLinkSquare02Icon,
  Tag01Icon as HugeTag01Icon,
  LeftToRightListBulletIcon as HugeLeftToRightListBulletIcon,
  LeftToRightListNumberIcon as HugeLeftToRightListNumberIcon,
  CheckmarkSquare02Icon as HugeCheckmarkSquare02Icon,
  MinusSignIcon as HugeMinusSignIcon,
  SquareIcon as HugeSquareIcon,
  CancelCircleIcon as HugeCancelCircleIcon,
  Brain02Icon as HugeBrain02Icon,
  Calendar01Icon as HugeCalendar01Icon,
  CommandIcon as HugeCommandIcon,
  HelpCircleIcon as HugeHelpCircleIcon,
  Settings02Icon as HugeSettings02Icon,
  Database01Icon as HugeDatabase01Icon,
  DatabaseIcon as HugeDatabaseIcon,
  DatabaseSync01Icon as HugeDatabaseSync01Icon,
  ArrowUpDownIcon as HugeArrowUpDownIcon,
  GitForkIcon as HugeGitForkIcon,
  Layout01Icon as HugeLayout01Icon,
  LayoutLeftIcon as HugeLayoutLeftIcon,
  LayoutRightIcon as HugeLayoutRightIcon,
  LayoutAlignLeftIcon as HugeLayoutAlignLeftIcon,
  LayoutAlignRightIcon as HugeLayoutAlignRightIcon,
  Edit02Icon as HugeEdit02Icon,
  Delete02Icon as HugeDelete02Icon,
  SparklesIcon as HugeSparklesIcon,
  Heading01Icon as HugeHeading01Icon,
  Heading02Icon as HugeHeading02Icon,
  Heading03Icon as HugeHeading03Icon,
  QuoteDownIcon as HugeQuoteDownIcon,
  CodeIcon as HugeCodeIcon,
  SourceCodeIcon as HugeSourceCodeIcon,
  DivideSignIcon as HugeDivideSignIcon,
  ArrowShrink02Icon as HugeArrowShrink02Icon,
  ArrowUpNarrowWideIcon as HugeArrowUpNarrowWideIcon,
  Sorting01Icon as HugeSorting01Icon,
  Download01Icon as HugeDownload01Icon,
  CheckmarkCircle02Icon as HugeCheckmarkCircle02Icon,
  TextFontIcon as HugeTextFontIcon,
  SidebarLeft01Icon as HugeSidebarLeft01Icon,
  SidebarRight01Icon as HugeSidebarRight01Icon,
  Copy01Icon as HugeCopy01Icon,
  PackageIcon as HugePackageIcon,
  FolderTreeIcon as HugeFolderTreeIcon,
  HashIcon as HugeHashIcon,
  SlidersHorizontalIcon as HugeSlidersHorizontalIcon,
  ArrowDownAZIcon as HugeArrowDownAZIcon,
  ArrowDownOneZeroIcon as HugeArrowDownOneZeroIcon,
  Clock01Icon as HugeClock01Icon,
  ExternalLinkIcon as HugeExternalLinkIcon,
  Link02Icon as HugeLink02Icon,
  FilterIcon as HugeFilterIcon,
  ListTreeIcon as HugeListTreeIcon,
  CheckIcon as HugeCheckIcon,
  Maximize01Icon as HugeMaximize01Icon,
  Minimize01Icon as HugeMinimize01Icon,
  PlayIcon as HugePlayIcon,
  PauseIcon as HugePauseIcon,
  RotateCcwIcon as HugeRotateCcwIcon,
  HistoryIcon as HugeHistoryIcon,
  PaletteIcon as HugePaletteIcon,
  MonitorIcon as HugeMonitorIcon,
  Key01Icon as HugeKey01Icon,
  GlobeIcon as HugeGlobeIcon,
  Shield01Icon as HugeShield01Icon,
  Layers01Icon as HugeLayers01Icon,
  StickyNote02Icon as HugeStickyNote02Icon,
  ColorPickerIcon as HugeColorPickerIcon,
  SquareSplitVerticalIcon as HugeSquareSplitVerticalIcon,
  SquareSplitHorizontalIcon as HugeSquareSplitHorizontalIcon,
  AppWindowIcon as HugeAppWindowIcon,
  AddCircleIcon as HugeAddCircleIcon,
  FolderTransferIcon as HugeFolderTransferIcon,
  SearchReplaceIcon as HugeSearchReplaceIcon,
  ReplaceIcon as HugeReplaceIcon,
  Store01Icon as HugeStore01Icon,
  ShoppingBag01Icon as HugeShoppingBag01Icon,
  UserIcon as HugeUserIcon,
  SearchAddIcon as HugeSearchAddIcon,
  SearchMinusIcon as HugeSearchMinusIcon,
  ZoomInIcon as HugeZoomInIcon,
  ZoomOutIcon as HugeZoomOutIcon,
  CenterFocusIcon as HugeCenterFocusIcon,
  BubblesIcon as HugeBubblesIcon,
  Motion01Icon as HugeMotion01Icon,
  ScissorIcon as HugeScissorIcon,
  Scissor01Icon as HugeScissor01Icon,
  ClipboardPasteIcon as HugeClipboardPasteIcon,
  ClipboardTypeIcon as HugeClipboardTypeIcon,
  TextBoldIcon as HugeTextBoldIcon,
  TextItalicIcon as HugeTextItalicIcon,
  TextStrikethroughIcon as HugeTextStrikethroughIcon,
  HighlighterIcon as HugeHighlighterIcon,
  PlusSignSquareIcon as HugePlusSignSquareIcon,
  Link01Icon as HugeLink01Icon,
  ParagraphIcon as HugeParagraphIcon,
  PaintBrush01Icon as HugePaintBrush01Icon,
  SigmaIcon as HugeSigmaIcon,
  PercentIcon as HugePercentIcon,
  RemoveFormattingIcon as HugeRemoveFormattingIcon,
  Heading04Icon as HugeHeading04Icon,
  Heading05Icon as HugeHeading05Icon,
  Heading06Icon as HugeHeading06Icon,
  Menu01Icon as HugeMenu01Icon,
  TextFootnoteIcon as HugeTextFootnoteIcon,
  TextSelectionIcon as HugeTextSelectionIcon,
  NeuralNetworkIcon as HugeNeuralNetworkIcon,
  Alert02Icon as HugeAlert02Icon,
  Alert01Icon as HugeAlert01Icon,
  TableIcon as HugeTableIcon,
  ChevronDownIcon as HugeChevronDownIcon,
  ChevronRightIcon as HugeChevronRightIcon,
  ArrowExpandIcon as HugeArrowExpandIcon,
} from '@hugeicons/core-free-icons';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
  [key: string]: any;
}

export const FlintLogoIcon = React.memo<IconProps>(({ size = 20, className = '', ...props }) => {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const isDefaultAccent = !accentColor || accentColor.toLowerCase() === '#ea580c';

  if (isDefaultAccent) {
    return (
      <img
        src="/flint-icon.png"
        width={size}
        height={size}
        className={className}
        alt="Flint"
        draggable={false}
        {...(props as any)}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: 'relative',
        flexShrink: 0,
        display: 'inline-block',
        isolation: 'isolate',
      }}
      {...(props as any)}
    >
      <img
        src="/flint-icon-mono.png"
        width={size}
        height={size}
        alt="Flint"
        draggable={false}
        style={{ display: 'block', width: size, height: size }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'var(--flint-accent, ' + accentColor + ')',
          mixBlendMode: 'overlay',
          WebkitMaskImage: 'url(/flint-icon-mono.png)',
          maskImage: 'url(/flint-icon-mono.png)',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
});

const createIcon = (iconDef: any) => {
  return React.memo<IconProps>(({ size = 16, className = '', color = 'currentColor', strokeWidth = 1.5, ...props }) => (
    <HugeiconsIcon
      icon={iconDef}
      size={size}
      className={className}
      color={color}
      strokeWidth={strokeWidth}
      {...(props as any)}
    />
  ));
};

export const File01Icon = createIcon(HugeFile01Icon);
export const FileAddIcon = createIcon(HugeFileAddIcon);
export const Folder01Icon = createIcon(HugeFolder01Icon);
export const FolderOpenIcon = createIcon(HugeFolderOpenIcon);
export const FolderAddIcon = createIcon(HugeFolderAddIcon);
export const Search01Icon = createIcon(HugeSearch01Icon);
export const Bookmark01Icon = createIcon(HugeBookmark01Icon);
export const PlusSignIcon = createIcon(HugePlusSignIcon);
export const Cancel01Icon = createIcon(HugeCancel01Icon);
export const ArrowLeft01Icon = createIcon(HugeArrowLeft01Icon);
export const ArrowRight01Icon = createIcon(HugeArrowRight01Icon);
export const ArrowDown01Icon = createIcon(HugeArrowDown01Icon);
export const ArrowUp01Icon = createIcon(HugeArrowUp01Icon);
export const ChevronRightIcon = createIcon(HugeChevronRightIcon);
export const ChevronDownIcon = createIcon(HugeChevronDownIcon);
export const BookOpen01Icon = createIcon(HugeBookOpen01Icon);
export const MoreVerticalIcon = createIcon(HugeMoreVerticalIcon);
export const LinkSquare02Icon = createIcon(HugeLinkSquare02Icon);
export const Tag01Icon = createIcon(HugeTag01Icon);
export const LeftToRightListBulletIcon = createIcon(HugeLeftToRightListBulletIcon);
export const LeftToRightListNumberIcon = createIcon(HugeLeftToRightListNumberIcon);
export const CheckmarkSquare02Icon = createIcon(HugeCheckmarkSquare02Icon);
export const MinusSignIcon = createIcon(HugeMinusSignIcon);
export const SquareIcon = createIcon(HugeSquareIcon);
export const CancelCircleIcon = createIcon(HugeCancelCircleIcon);
export const Alert02Icon = createIcon(HugeAlert02Icon);
export const AlertTriangleIcon = createIcon(HugeAlert01Icon);
export const Brain02Icon = createIcon(HugeBrain02Icon);

export const Calendar01Icon = createIcon(HugeCalendar01Icon);
export const CommandIcon = createIcon(HugeCommandIcon);
export const HelpCircleIcon = createIcon(HugeHelpCircleIcon);
export const Settings02Icon = createIcon(HugeSettings02Icon);
export const Database01Icon = createIcon(HugeDatabase01Icon);
export const DatabaseIcon = createIcon(HugeDatabaseIcon);
export const DatabaseSync01Icon = createIcon(HugeDatabaseSync01Icon);
export const ArrowUpDownIcon = createIcon(HugeArrowUpDownIcon);
export const GitForkIcon = createIcon(HugeGitForkIcon);
export const NeuralNetworkIcon = createIcon(HugeNeuralNetworkIcon);
export const Layout01Icon = createIcon(HugeLayout01Icon);
export const LayoutLeftIcon = createIcon(HugeLayoutLeftIcon);
export const LayoutRightIcon = createIcon(HugeLayoutRightIcon);
export const LayoutAlignLeftIcon = createIcon(HugeLayoutAlignLeftIcon);
export const LayoutAlignRightIcon = createIcon(HugeLayoutAlignRightIcon);
export const Edit02Icon = createIcon(HugeEdit02Icon);
export const Delete02Icon = createIcon(HugeDelete02Icon);
export const SparklesIcon = createIcon(HugeSparklesIcon);
export const Heading101Icon = createIcon(HugeHeading01Icon);
export const Heading201Icon = createIcon(HugeHeading02Icon);
export const Heading301Icon = createIcon(HugeHeading03Icon);
export const QuoteDownIcon = createIcon(HugeQuoteDownIcon);
export const CodeIcon = createIcon(HugeCodeIcon);
export const SourceCodeIcon = createIcon(HugeSourceCodeIcon);
export const Divide01Icon = createIcon(HugeDivideSignIcon);
export const ArrowShrink02Icon = createIcon(HugeArrowShrink02Icon);
export const ArrowUpNarrowWideIcon = createIcon(HugeArrowUpNarrowWideIcon);
export const Sorting01Icon = createIcon(HugeSorting01Icon);
export const Download01Icon = createIcon(HugeDownload01Icon);
export const CheckmarkCircle02Icon = createIcon(HugeCheckmarkCircle02Icon);
export const TextFontIcon = createIcon(HugeTextFontIcon);
export const SidebarLeft01Icon = createIcon(HugeSidebarLeft01Icon);
export const SidebarRight01Icon = createIcon(HugeSidebarRight01Icon);
export const Copy01Icon = createIcon(HugeCopy01Icon);
export const PackageIcon = createIcon(HugePackageIcon);
export const FolderTreeIcon = createIcon(HugeFolderTreeIcon);
export const HashIcon = createIcon(HugeHashIcon);
export const SlidersHorizontalIcon = createIcon(HugeSlidersHorizontalIcon);
export const ArrowDownAZIcon = createIcon(HugeArrowDownAZIcon);
export const ArrowDown10Icon = createIcon(HugeArrowDownOneZeroIcon);
export const Clock01Icon = createIcon(HugeClock01Icon);
export const ExternalLinkIcon = createIcon(HugeExternalLinkIcon);
export const Link2Icon = createIcon(HugeLink02Icon);
export const FilterIcon = createIcon(HugeFilterIcon);
export const ListTreeIcon = createIcon(HugeListTreeIcon);
export const CheckIcon = createIcon(HugeCheckIcon);
export const Maximize2Icon = createIcon(HugeMaximize01Icon);
export const Maximize01Icon = Maximize2Icon;
export const Minimize2Icon = createIcon(HugeMinimize01Icon);
export const PlayIcon = createIcon(HugePlayIcon);
export const PauseIcon = createIcon(HugePauseIcon);
export const RotateCcwIcon = createIcon(HugeRotateCcwIcon);
export const HistoryIcon = createIcon(HugeHistoryIcon);
export const PaletteIcon = createIcon(HugePaletteIcon);
export const MonitorIcon = createIcon(HugeMonitorIcon);
export const KeyIcon = createIcon(HugeKey01Icon);
export const GlobeIcon = createIcon(HugeGlobeIcon);
export const ShieldIcon = createIcon(HugeShield01Icon);
export const LayersIcon = createIcon(HugeLayers01Icon);
export const StickyNote02Icon = createIcon(HugeStickyNote02Icon);
export const UserIcon = createIcon(HugeUserIcon);

export const EyedropperIcon = createIcon(HugeColorPickerIcon);
export const SplitRightIcon = createIcon(HugeSquareSplitHorizontalIcon);
export const SplitDownIcon = createIcon(HugeSquareSplitVerticalIcon);
export const OpenInWindowIcon = createIcon(HugeAppWindowIcon);
export const PlusCircleIcon = createIcon(HugeAddCircleIcon);
export const MoveFileIcon = createIcon(HugeFolderTransferIcon);
export const SearchReplaceIcon = createIcon(HugeSearchReplaceIcon);
export const ReplaceIcon = createIcon(HugeReplaceIcon);
export const Store01Icon = createIcon(HugeStore01Icon);
export const ShoppingBag01Icon = createIcon(HugeShoppingBag01Icon);
export const ZoomInIcon = createIcon(HugeSearchAddIcon);
export const ZoomOutIcon = createIcon(HugeSearchMinusIcon);
export const SearchAddIcon = createIcon(HugeSearchAddIcon);
export const SearchMinusIcon = createIcon(HugeSearchMinusIcon);
export const CenterFocusIcon = createIcon(HugeCenterFocusIcon);
export const BubblesIcon = createIcon(HugeBubblesIcon);
export const Motion01Icon = createIcon(HugeMotion01Icon);
export const ScissorIcon = createIcon(HugeScissorIcon);
export const Scissor01Icon = createIcon(HugeScissor01Icon);
export const ClipboardPasteIcon = createIcon(HugeClipboardPasteIcon);
export const ClipboardTypeIcon = createIcon(HugeClipboardTypeIcon);
export const TextBoldIcon = createIcon(HugeTextBoldIcon);
export const TextItalicIcon = createIcon(HugeTextItalicIcon);
export const TextStrikethroughIcon = createIcon(HugeTextStrikethroughIcon);
export const HighlighterIcon = createIcon(HugeHighlighterIcon);
export const PlusSignSquareIcon = createIcon(HugePlusSignSquareIcon);
export const Link01Icon = createIcon(HugeLink01Icon);
export const ParagraphIcon = createIcon(HugeParagraphIcon);
export const PaintBrush01Icon = createIcon(HugePaintBrush01Icon);
export const SigmaIcon = createIcon(HugeSigmaIcon);
export const PercentIcon = createIcon(HugePercentIcon);
export const RemoveFormattingIcon = createIcon(HugeRemoveFormattingIcon);
export const Heading401Icon = createIcon(HugeHeading04Icon);
export const Heading501Icon = createIcon(HugeHeading05Icon);
export const Heading601Icon = createIcon(HugeHeading06Icon);
export const Menu01Icon = createIcon(HugeMenu01Icon);
export const TextFootnoteIcon = createIcon(HugeTextFootnoteIcon);
export const TextSelectionIcon = createIcon(HugeTextSelectionIcon);
export const TableIcon = createIcon(HugeTableIcon);
export const ArrowExpandIcon = createIcon(HugeArrowExpandIcon);

/**
 * Custom dual-stacked chevrons indicator.
 * Preserved as an intentional custom path since @hugeicons/core-free-icons does not offer an identical stacked glyph.
 */
export const ChevronsUpDownIcon = React.memo<IconProps>(({
  size = 14,
  className = '',
  color = 'currentColor',
  strokeWidth = 1.75,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="m7 15 5 5 5-5" />
    <path d="m7 9 5-5 5 5" />
  </svg>
));

/**
 * Native OS Titlebar Control: Minimize (Windows 11 caption style)
 */
export const WindowMinimizeIcon = React.memo<IconProps>(({
  size = 10,
  className = '',
  color = 'currentColor',
  ...props
}) => (
  <svg width={size} height="1" viewBox="0 0 10 1" fill={color} className={className} {...props}>
    <rect width="10" height="1" />
  </svg>
));

/**
 * Native OS Titlebar Control: Maximize (Windows 11 caption style)
 */
export const WindowMaximizeIcon = React.memo<IconProps>(({
  size = 10,
  className = '',
  color = 'currentColor',
  strokeWidth = 1,
  ...props
}) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke={color} strokeWidth={strokeWidth} className={className} {...props}>
    <rect x="0.5" y="0.5" width="9" height="9" />
  </svg>
));

/**
 * Native OS Titlebar Control: Restore (Windows 11 caption style)
 */
export const WindowRestoreIcon = React.memo<IconProps>(({
  size = 10,
  className = '',
  color = 'currentColor',
  strokeWidth = 1,
  ...props
}) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke={color} strokeWidth={strokeWidth} className={className} {...props}>
    <rect x="0.5" y="2.5" width="7" height="7" />
    <path d="M 2.5 2.5 L 2.5 0.5 L 9.5 0.5 L 9.5 7.5 L 7.5 7.5" />
  </svg>
));

/**
 * Native OS Titlebar Control: Close (Windows 11 caption style)
 */
export const WindowCloseIcon = React.memo<IconProps>(({
  size = 10,
  className = '',
  color = 'currentColor',
  strokeWidth = 1.2,
  ...props
}) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke={color} strokeWidth={strokeWidth} className={className} {...props}>
    <path d="M 0 0 L 10 10 M 10 0 L 0 10" />
  </svg>
));

export interface RenderHugeIconSvgOptions {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  className?: string;
  style?: string;
}

/**
 * Converts any HugeIcon definition tuple array into standard standalone SVG HTML markup.
 * Designed for non-React contexts (ProseMirror gutter fold widgets, native DOM drag tooltips, canvas).
 */
export function renderHugeIconSvg(
  iconDef: any,
  options: RenderHugeIconSvgOptions = {}
): string {
  const size = options.size ?? 16;
  const color = options.color ?? 'currentColor';
  const strokeWidth = options.strokeWidth ?? 1.5;
  const classNameAttr = options.className ? ` class="${options.className}"` : '';
  const styleAttr = options.style ? ` style="${options.style}"` : '';

  if (!Array.isArray(iconDef)) {
    return '';
  }

  const innerMarkup = iconDef
    .map(([tag, attrs]: [string, Record<string, any>]) => {
      const attrStrings = Object.entries(attrs || {})
        .filter(([k]) => k !== 'key')
        .map(([k, v]) => {
          const attrName = k.replace(/([A-Z])/g, '-$1').toLowerCase();
          const attrVal = k === 'stroke' && v === 'currentColor' ? color : v;
          return `${attrName}="${attrVal}"`;
        })
        .join(' ');
      return `<${tag} ${attrStrings}/>`;
    })
    .join('');

  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${classNameAttr}${styleAttr}>${innerMarkup}</svg>`;
}



