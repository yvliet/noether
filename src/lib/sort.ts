import { DocumentItem } from '@/types';

export type FileSortOrder =
  | 'alphabetical'
  | 'alphabetical-reverse'
  | 'byModifiedTime'
  | 'byModifiedTimeReverse'
  | 'byCreatedTime'
  | 'byCreatedTimeReverse';

export interface SortOption<T = string> {
  id: T;
  label: string;
  group?: number;
}

export const FILE_SORT_OPTIONS: SortOption<FileSortOrder>[] = [
  { id: 'alphabetical', label: 'File name (A to Z)', group: 1 },
  { id: 'alphabetical-reverse', label: 'File name (Z to A)', group: 1 },
  { id: 'byModifiedTime', label: 'Modified time (new to old)', group: 2 },
  { id: 'byModifiedTimeReverse', label: 'Modified time (old to new)', group: 2 },
  { id: 'byCreatedTime', label: 'Created time (new to old)', group: 3 },
  { id: 'byCreatedTimeReverse', label: 'Created time (old to new)', group: 3 },
];

/**
 * Standard document sorting adhering to folder-first prioritization
 * and timestamp/alphabetical order.
 */
export function sortDocuments(docs: DocumentItem[], sortOrder: FileSortOrder): DocumentItem[] {
  return [...docs].sort((a, b) => {
    if (a.is_folder !== b.is_folder) return b.is_folder - a.is_folder;
    const aTitle = a._sortTitle !== undefined ? a._sortTitle : a.title;
    const bTitle = b._sortTitle !== undefined ? b._sortTitle : b.title;
    switch (sortOrder) {
      case 'alphabetical':
        return aTitle.localeCompare(bTitle);
      case 'alphabetical-reverse':
        return bTitle.localeCompare(aTitle);
      case 'byModifiedTime':
        return (b.updated_at || 0) - (a.updated_at || 0);
      case 'byModifiedTimeReverse':
        return (a.updated_at || 0) - (b.updated_at || 0);
      case 'byCreatedTime':
        return (b.created_at || 0) - (a.created_at || 0);
      case 'byCreatedTimeReverse':
        return (a.created_at || 0) - (b.created_at || 0);
      default:
        return aTitle.localeCompare(bTitle);
    }
  });
}
