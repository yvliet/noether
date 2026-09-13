export type PortalSection = 'help' | 'docs';

export interface DocNode {
  id: string;
  title: string;
  slug: string;
  isFolder?: boolean;
  content?: string;
  children?: DocNode[];
  level?: number;
  badge?: string;
  category?: string;
  order?: number;
  aliases?: string[];
  portal?: PortalSection;
}

export interface TableOfContentItem {
  id: string;
  text: string;
  level: number;
}

