import { DocumentItem } from '@/types';

export interface PdfOutlineItem {
  id: string;
  title: string;
  pageNumber: number;
  dest?: any;
  items: PdfOutlineItem[];
}

export type PdfSidebarMode = 'thumbnails' | 'outline';

export type PdfZoomMode = 'custom' | 'fit-width' | 'fit-page';

export interface PdfPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface PdfViewerProps {
  documentId?: string;
  tabId?: string;
  doc?: DocumentItem | null;
  filePath?: string;
  app?: any;
  className?: string;
  isSidebar?: boolean;
  embedded?: boolean;
}
