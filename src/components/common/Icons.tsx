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
  ArrowRight02Icon as HugeArrowRight02Icon,
  ArrowDown01Icon as HugeArrowDown01Icon,
  ArrowUp01Icon as HugeArrowUp01Icon,
  BookOpen01Icon as HugeBookOpen01Icon,
  BookOpen02Icon as HugeBookOpen02Icon,
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
  DashboardSquare01Icon as HugeDashboardSquare01Icon,
  DashboardSquareAddIcon as HugeDashboardSquareAddIcon,
  Layout01Icon as HugeLayout01Icon,
  LayoutLeftIcon as HugeLayoutLeftIcon,
  LayoutRightIcon as HugeLayoutRightIcon,
  LayoutAlignLeftIcon as HugeLayoutAlignLeftIcon,
  LayoutAlignRightIcon as HugeLayoutAlignRightIcon,
  Edit02Icon as HugeEdit02Icon,
  PencilEdit02Icon as HugePencilEdit02Icon,
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
  GlobeOffIcon as HugeGlobeOffIcon,
  InternetIcon as HugeInternetIcon,
  NoInternetIcon as HugeNoInternetIcon,
  PuzzleIcon as HugePuzzleIcon,
  Shield01Icon as HugeShield01Icon,
  Layers01Icon as HugeLayers01Icon,
  StickyNote02Icon as HugeStickyNote02Icon,
  StickyNote03Icon as HugeStickyNote03Icon,
  FileEmpty01Icon as HugeFileEmpty01Icon,
  FileEmpty02Icon as HugeFileEmpty02Icon,
  FileImageIcon as HugeFileImageIcon,
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
  ZoomIcon as HugeZoomIcon,
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
  Link04Icon as HugeLink04Icon,
  PinIcon as HugePinIcon,
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
  TextClearIcon as HugeTextClearIcon,
  NeuralNetworkIcon as HugeNeuralNetworkIcon,
  Alert02Icon as HugeAlert02Icon,
  Alert01Icon as HugeAlert01Icon,
  TableIcon as HugeTableIcon,
  GridTableIcon as HugeGridTableIcon,
  MaskTheater02Icon as HugeMaskTheater02Icon,
  ChevronDownIcon as HugeChevronDownIcon,
  ChevronRightIcon as HugeChevronRightIcon,
  ArrowExpand01Icon as HugeArrowExpand01Icon,
  RulerIcon as HugeRulerIcon,
  TextUnderlineIcon as HugeTextUnderlineIcon,
  Eraser01Icon as HugeEraser01Icon,
  EraserIcon as HugeEraserIcon,
  TextIcon as HugeTextIcon,
  FullScreenIcon as HugeFullScreenIcon,
  Cursor02Icon as HugeCursor02Icon,
  UndoIcon as HugeUndoIcon,
  RedoIcon as HugeRedoIcon,
  PaintBoardIcon as HugePaintBoardIcon,
  InformationCircleIcon as HugeInformationCircleIcon,
  BulbIcon as HugeBulbIcon,
  AlertDiamondIcon as HugeAlertDiamondIcon,
  QuoteUpIcon as HugeQuoteUpIcon,
  Bug01Icon as HugeBug01Icon,
  TerminalIcon as HugeTerminalIcon,
  Grid02Icon as HugeGrid02Icon,
  LockIcon as HugeLockIcon,
  GroupIcon as HugeGroupIcon,
  AlignStartVerticalIcon as HugeAlignStartVerticalIcon,
  AlignLeftIcon as HugeAlignLeftIcon,
  AlignHorizontalCenterIcon as HugeAlignHorizontalCenterIcon,
  AlignRightIcon as HugeAlignRightIcon,
  AlignTopIcon as HugeAlignTopIcon,
  AlignVerticalCenterIcon as HugeAlignVerticalCenterIcon,
  AlignBottomIcon as HugeAlignBottomIcon,
  AlignHorizontalJustifyStartIcon as HugeAlignHorizontalJustifyStartIcon,
  AlignVerticalJustifyStartIcon as HugeAlignVerticalJustifyStartIcon,
  Grid2X2Icon as HugeGrid2X2Icon,
  DistributeHorizontalCenterIcon as HugeDistributeHorizontalCenterIcon,
  DistributeVerticalCenterIcon as HugeDistributeVerticalCenterIcon,
  AlignHorizontalJustifyCenterIcon as HugeAlignHorizontalJustifyCenterIcon,
  AlignVerticalJustifyCenterIcon as HugeAlignVerticalJustifyCenterIcon,
  UngroupIcon as HugeUngroupIcon,
  Moon02Icon as HugeMoon02Icon,
  Sun02Icon as HugeSun02Icon,
  ComputerIcon as HugeComputerIcon,
  FitToScreenIcon as HugeFitToScreenIcon,
  PrinterIcon as HugePrinterIcon,
  Presentation01Icon as HugePresentation01Icon,
} from '@hugeicons/core-free-icons';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
  [key: string]: any;
}

export const NoetherLogoIcon = React.memo<IconProps>(({ size = 20, className = '', ...props }) => {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const isDefaultAccent = !accentColor || accentColor.toLowerCase() === '#eb584d';

  if (isDefaultAccent) {
    return (
      <img
        src="/noether-icon.png"
        width={size}
        height={size}
        className={className}
        alt="Noether"
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
        src="/noether-icon-mono.png"
        width={size}
        height={size}
        alt="Noether"
        draggable={false}
        style={{ display: 'block', width: size, height: size }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'var(--noether-accent, ' + accentColor + ')',
          mixBlendMode: 'overlay',
          WebkitMaskImage: 'url(/noether-icon-mono.png)',
          maskImage: 'url(/noether-icon-mono.png)',
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

export const NoetherSimpleLogoIcon = React.memo<IconProps>(({ size = 20, className = '', ...props }) => {
  return (
    <img
      src="/noether-icon-simple.png"
      width={size}
      height={size}
      className={className}
      alt="Noether"
      draggable={false}
      {...(props as any)}
    />
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
export const ArrowRight02Icon = createIcon(HugeArrowRight02Icon);
export const ArrowDown01Icon = createIcon(HugeArrowDown01Icon);
export const ArrowUp01Icon = createIcon(HugeArrowUp01Icon);
export const ChevronRightIcon = createIcon(HugeChevronRightIcon);
export const ChevronDownIcon = createIcon(HugeChevronDownIcon);
export const BookOpen01Icon = createIcon(HugeBookOpen01Icon);
export const BookOpen02Icon = createIcon(HugeBookOpen02Icon);
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
export const TerminalIcon = createIcon(HugeTerminalIcon);
export const HelpCircleIcon = createIcon(HugeHelpCircleIcon);
export const Settings02Icon = createIcon(HugeSettings02Icon);
export const Database01Icon = createIcon(HugeDatabase01Icon);
export const DatabaseIcon = createIcon(HugeDatabaseIcon);
export const DatabaseSync01Icon = createIcon(HugeDatabaseSync01Icon);
export const ArrowUpDownIcon = createIcon(HugeArrowUpDownIcon);
export const GitForkIcon = createIcon(HugeGitForkIcon);
export const NeuralNetworkIcon = createIcon(HugeNeuralNetworkIcon);
export const DashboardSquare01Icon = createIcon(HugeDashboardSquare01Icon);
export const DashboardSquareAddIcon = createIcon(HugeDashboardSquareAddIcon);
export const Layout01Icon = createIcon(HugeLayout01Icon);
export const LayoutLeftIcon = createIcon(HugeLayoutLeftIcon);
export const LayoutRightIcon = createIcon(HugeLayoutRightIcon);
export const LayoutAlignLeftIcon = createIcon(HugeLayoutAlignLeftIcon);
export const LayoutAlignRightIcon = createIcon(HugeLayoutAlignRightIcon);
export const Edit02Icon = createIcon(HugeEdit02Icon);
export const PencilEdit02Icon = createIcon(HugePencilEdit02Icon);
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
export const Minimize01Icon = Minimize2Icon;
export const PlayIcon = createIcon(HugePlayIcon);
export const PauseIcon = createIcon(HugePauseIcon);
export const RotateCcwIcon = createIcon(HugeRotateCcwIcon);
export const HistoryIcon = createIcon(HugeHistoryIcon);
export const PaletteIcon = createIcon(HugePaletteIcon);
export const MonitorIcon = createIcon(HugeMonitorIcon);
export const ComputerIcon = createIcon(HugeComputerIcon);
export const Moon02Icon = createIcon(HugeMoon02Icon);
export const Sun02Icon = createIcon(HugeSun02Icon);
export const KeyIcon = createIcon(HugeKey01Icon);
export const GlobeIcon = createIcon(HugeGlobeIcon);
export const GlobeOffIcon = createIcon(HugeGlobeOffIcon);
export const InternetIcon = createIcon(HugeInternetIcon);
export const NoInternetIcon = createIcon(HugeGlobeOffIcon);
export const PuzzleIcon = createIcon(HugePuzzleIcon);
export const PuzzlePieceIcon = PuzzleIcon;
export const ShieldIcon = createIcon(HugeShield01Icon);
export const LayersIcon = createIcon(HugeLayers01Icon);
export const StickyNote02Icon = createIcon(HugeStickyNote02Icon);
export const StickyNote03Icon = createIcon(HugeStickyNote03Icon);
export const FileEmpty01Icon = createIcon(HugeFileEmpty01Icon);
export const FileEmpty02Icon = createIcon(HugeFileEmpty02Icon);
export const FileImageIcon = createIcon(HugeFileImageIcon);
export const UserIcon = createIcon(HugeUserIcon);

export const EyedropperIcon = createIcon(HugeColorPickerIcon);
export const SplitRightIcon = createIcon(HugeSquareSplitHorizontalIcon);
export const SplitDownIcon = createIcon(HugeSquareSplitVerticalIcon);
export const Eraser01Icon = createIcon(HugeEraser01Icon);
export const EraserIcon = createIcon(HugeEraserIcon);
export const TextIcon = createIcon(HugeTextIcon);
export const FullscreenIcon = createIcon(HugeFullScreenIcon);
export const FullScreenIcon = FullscreenIcon;
export const Cursor02Icon = createIcon(HugeCursor02Icon);
export const PaintBoardIcon = createIcon(HugePaintBoardIcon);
export const UndoIcon = createIcon(HugeUndoIcon);
export const RedoIcon = createIcon(HugeRedoIcon);
export const OpenInWindowIcon = createIcon(HugeAppWindowIcon);
export const PlusCircleIcon = createIcon(HugeAddCircleIcon);
export const MoveFileIcon = createIcon(HugeFolderTransferIcon);
export const SearchReplaceIcon = createIcon(HugeSearchReplaceIcon);
export const ReplaceIcon = createIcon(HugeReplaceIcon);
export const Store01Icon = createIcon(HugeStore01Icon);
export const ShoppingBag01Icon = createIcon(HugeShoppingBag01Icon);
export const ZoomInIcon = createIcon(HugeZoomInIcon);
export const ZoomOutIcon = createIcon(HugeZoomOutIcon);
export const ZoomIcon = createIcon(HugeZoomIcon);
export const SearchAddIcon = createIcon(HugeSearchAddIcon);
export const SearchMinusIcon = createIcon(HugeSearchMinusIcon);
export const CenterFocusIcon = createIcon(HugeCenterFocusIcon);
export const FitToScreenIcon = createIcon(HugeFitToScreenIcon);
export const PrinterIcon = createIcon(HugePrinterIcon);
export const Presentation01Icon = createIcon(HugePresentation01Icon);
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
export const Link04Icon = createIcon(HugeLink04Icon);
export const PinIcon = createIcon(HugePinIcon);
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
export const TextClearIcon = createIcon(HugeTextClearIcon);
export const TableIcon = createIcon(HugeTableIcon);
export const GridTableIcon = createIcon(HugeGridTableIcon);
export const MaskTheater02Icon = createIcon(HugeMaskTheater02Icon);
export const ArrowExpand01Icon = createIcon(HugeArrowExpand01Icon);
export const ArrowExpandIcon = ArrowExpand01Icon;
export const ArrowExpand02Icon = ArrowExpand01Icon;
export const RulerIcon = createIcon(HugeRulerIcon);
export const TextUnderlineIcon = createIcon(HugeTextUnderlineIcon);
export const InformationCircleIcon = createIcon(HugeInformationCircleIcon);
export const BulbIcon = createIcon(HugeBulbIcon);
export const AlertDiamondIcon = createIcon(HugeAlertDiamondIcon);
export const QuoteUpIcon = createIcon(HugeQuoteUpIcon);
export const Bug01Icon = createIcon(HugeBug01Icon);
export const Grid02Icon = createIcon(HugeGrid02Icon);
export const LockIcon = createIcon(HugeLockIcon);
export const Lock01Icon = LockIcon;
export const GroupIcon = createIcon(HugeGroupIcon);
export const AlignStartVerticalIcon = createIcon(HugeAlignStartVerticalIcon);
export const AlignLeftIcon = createIcon(HugeAlignLeftIcon);
export const AlignHorizontalCenterIcon = createIcon(HugeAlignHorizontalCenterIcon);
export const AlignRightIcon = createIcon(HugeAlignRightIcon);
export const AlignTopIcon = createIcon(HugeAlignTopIcon);
export const AlignVerticalCenterIcon = createIcon(HugeAlignVerticalCenterIcon);
export const AlignBottomIcon = createIcon(HugeAlignBottomIcon);
export const AlignHorizontalJustifyStartIcon = createIcon(HugeAlignHorizontalJustifyStartIcon);
export const AlignVerticalJustifyStartIcon = createIcon(HugeAlignVerticalJustifyStartIcon);
export const Grid2X2Icon = createIcon(HugeGrid2X2Icon);
export const DistributeHorizontalCenterIcon = createIcon(HugeDistributeHorizontalCenterIcon);
export const DistributeVerticalCenterIcon = createIcon(HugeDistributeVerticalCenterIcon);
export const AlignHorizontalJustifyCenterIcon = createIcon(HugeAlignHorizontalJustifyCenterIcon);
export const AlignVerticalJustifyCenterIcon = createIcon(HugeAlignVerticalJustifyCenterIcon);
export const UngroupIcon = createIcon(HugeUngroupIcon);

// Export Huge Icon definitions for standalone SVG rendering (ProseMirror widgets, canvas, tooltips)
export {
  HugeInformationCircleIcon,
  HugeBulbIcon,
  HugeAlert01Icon,
  HugeAlert02Icon,
  HugeAlertDiamondIcon,
  HugeQuoteUpIcon,
  HugeQuoteDownIcon,
  HugeBug01Icon,
  HugeHelpCircleIcon,
  HugeCheckmarkCircle02Icon,
  HugeCheckmarkSquare02Icon,
  HugeCancelCircleIcon,
  HugeCodeIcon,
  HugeFile01Icon,
  HugeStickyNote02Icon,
  HugeBookOpen02Icon,
};

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

/**
 * Discord Community Icon
 */
export const DiscordIcon = React.memo<IconProps>(({
  size = 18,
  className = '',
  color = 'currentColor',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    className={className}
    {...props}
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
));

/**
 * GitHub Icon
 */
export const GithubIcon = React.memo<IconProps>(({
  size = 18,
  className = '',
  color = 'currentColor',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    className={className}
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
));



