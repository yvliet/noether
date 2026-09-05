import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  File01Icon as HugeFile01Icon,
  Folder01Icon as HugeFolder01Icon,
  FolderOpenIcon as HugeFolderOpenIcon,
  Search01Icon as HugeSearch01Icon,
  Cancel01Icon as HugeCancel01Icon,
  Download01Icon as HugeDownload01Icon,
  Upload01Icon as HugeUpload01Icon,
  CheckIcon as HugeCheckIcon,
  BookOpen01Icon as HugeBookOpen01Icon,
  Store01Icon as HugeStore01Icon,
  ArrowUp01Icon as HugeArrowUp01Icon,
  ArrowDown01Icon as HugeArrowDown01Icon,
  ArrowLeft01Icon as HugeArrowLeft01Icon,
  ArrowRight01Icon as HugeArrowRight01Icon,
  Copy01Icon as HugeCopy01Icon,
  ExternalLinkIcon as HugeExternalLinkIcon,
  SparklesIcon as HugeSparklesIcon,
  Brain02Icon as HugeBrain02Icon,
  StickyNote02Icon as HugeStickyNote02Icon,
  Tag01Icon as HugeTag01Icon,
  Link01Icon as HugeLink01Icon,
  Link04Icon as HugeLink04Icon,
  Alert02Icon as HugeAlert02Icon,
  Alert01Icon as HugeAlert01Icon,
  PackageIcon as HugePackageIcon,
  PuzzleIcon as HugePuzzleIcon,
  CodeIcon as HugeCodeIcon,
  CheckmarkCircle02Icon as HugeCheckmarkCircle02Icon,
  CancelCircleIcon as HugeCancelCircleIcon,
  HelpCircleIcon as HugeHelpCircleIcon,
  SlidersHorizontalIcon as HugeSlidersHorizontalIcon,
  Menu01Icon as HugeMenu01Icon,
  SidebarLeft01Icon as HugeSidebarLeft01Icon,
  GitForkIcon as HugeGitForkIcon,
  ChevronDownIcon as HugeChevronDownIcon,
  ChevronRightIcon as HugeChevronRightIcon,
  Layers01Icon as HugeLayers01Icon,
  Settings02Icon as HugeSettings02Icon,
  Bookmark01Icon as HugeBookmark01Icon,
  Maximize01Icon as HugeMaximize01Icon,
  CenterFocusIcon as HugeCenterFocusIcon,
  InformationCircleIcon as HugeInformationCircleIcon,
  BulbIcon as HugeBulbIcon,
  AlertDiamondIcon as HugeAlertDiamondIcon,
  QuoteUpIcon as HugeQuoteUpIcon,
  Sun01Icon as HugeSun01Icon,
  Moon02Icon as HugeMoon02Icon,
} from '@hugeicons/core-free-icons';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
  [key: string]: any;
}

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
export const Folder01Icon = createIcon(HugeFolder01Icon);
export const FolderOpenIcon = createIcon(HugeFolderOpenIcon);
export const Search01Icon = createIcon(HugeSearch01Icon);
export const Cancel01Icon = createIcon(HugeCancel01Icon);
export const Download01Icon = createIcon(HugeDownload01Icon);
export const Upload01Icon = createIcon(HugeUpload01Icon);
export const CheckIcon = createIcon(HugeCheckIcon);
export const BookOpen01Icon = createIcon(HugeBookOpen01Icon);
export const Store01Icon = createIcon(HugeStore01Icon);
export const ArrowUp01Icon = createIcon(HugeArrowUp01Icon);
export const ArrowDown01Icon = createIcon(HugeArrowDown01Icon);
export const ArrowLeft01Icon = createIcon(HugeArrowLeft01Icon);
export const ArrowRight01Icon = createIcon(HugeArrowRight01Icon);
export const ChevronDownIcon = createIcon(HugeChevronDownIcon);
export const ChevronRightIcon = createIcon(HugeChevronRightIcon);
export const Copy01Icon = createIcon(HugeCopy01Icon);
export const ExternalLinkIcon = createIcon(HugeExternalLinkIcon);
export const SparklesIcon = createIcon(HugeSparklesIcon);
export const Brain02Icon = createIcon(HugeBrain02Icon);
export const StickyNote02Icon = createIcon(HugeStickyNote02Icon);
export const Tag01Icon = createIcon(HugeTag01Icon);
export const Link01Icon = createIcon(HugeLink01Icon);
export const Link04Icon = createIcon(HugeLink04Icon);
export const Alert02Icon = createIcon(HugeAlert02Icon);
export const AlertTriangleIcon = createIcon(HugeAlert01Icon);
export const PackageIcon = createIcon(HugePackageIcon);
export const PuzzleIcon = createIcon(HugePuzzleIcon);
export const CodeIcon = createIcon(HugeCodeIcon);
export const CheckmarkCircle02Icon = createIcon(HugeCheckmarkCircle02Icon);
export const CancelCircleIcon = createIcon(HugeCancelCircleIcon);
export const HelpCircleIcon = createIcon(HugeHelpCircleIcon);
export const SlidersHorizontalIcon = createIcon(HugeSlidersHorizontalIcon);
export const Menu01Icon = createIcon(HugeMenu01Icon);
export const SidebarLeft01Icon = createIcon(HugeSidebarLeft01Icon);
export const GitForkIcon = createIcon(HugeGitForkIcon);
export const Layers01Icon = createIcon(HugeLayers01Icon);
export const Settings02Icon = createIcon(HugeSettings02Icon);
export const Bookmark01Icon = createIcon(HugeBookmark01Icon);
export const Maximize01Icon = createIcon(HugeMaximize01Icon);
export const CenterFocusIcon = createIcon(HugeCenterFocusIcon);
export const InformationCircleIcon = createIcon(HugeInformationCircleIcon);
export const BulbIcon = createIcon(HugeBulbIcon);
export const AlertDiamondIcon = createIcon(HugeAlertDiamondIcon);
export const QuoteUpIcon = createIcon(HugeQuoteUpIcon);
export const QuoteIcon = QuoteUpIcon;
export const Sun01Icon = createIcon(HugeSun01Icon);
export const Moon02Icon = createIcon(HugeMoon02Icon);

export const FlintLogoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="./flint-icon.png"
        width={size}
        height={size}
        alt="Flint"
        className="shrink-0"
      />
    </div>
  );
};
