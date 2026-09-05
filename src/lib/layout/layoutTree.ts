import { TabItem } from '@/types';

export type PaneId = string;

export interface PaneModel {
  id: PaneId;
  tabs: TabItem[];
  activeTabId: string | null;
  activeDocumentId?: string | null;
  tabHistory?: string[];
}

export type LayoutNode =
  | {
      type: 'pane';
      id: PaneId;
      flex?: number;
    }
  | {
      type: 'split';
      id: string;
      direction: 'horizontal' | 'vertical';
      children: LayoutNode[];
      flex?: number;
    };

export function createInitialLayoutTree(mainPaneId = 'main'): LayoutNode {
  return {
    type: 'pane',
    id: mainPaneId,
    flex: 1,
  };
}

export function getAllPaneIds(node: LayoutNode): PaneId[] {
  if (node.type === 'pane') {
    return [node.id];
  }
  return node.children.flatMap(getAllPaneIds);
}

export function findPaneNode(
  node: LayoutNode,
  paneId: PaneId
): { node: LayoutNode; parent: LayoutNode | null; index: number } | null {
  if (node.type === 'pane') {
    if (node.id === paneId) {
      return { node, parent: null, index: 0 };
    }
    return null;
  }

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type === 'pane' && child.id === paneId) {
      return { node: child, parent: node, index: i };
    }
    const found = findPaneNode(child, paneId);
    if (found) {
      if (!found.parent) {
        found.parent = node;
        found.index = i;
      }
      return found;
    }
  }

  return null;
}

export function splitNode(
  root: LayoutNode,
  targetPaneId: PaneId,
  direction: 'horizontal' | 'vertical',
  newPaneId: PaneId
): LayoutNode {
  if (root.type === 'pane') {
    if (root.id === targetPaneId) {
      return {
        type: 'split',
        id: `split-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        direction,
        flex: root.flex || 1,
        children: [
          { type: 'pane', id: targetPaneId, flex: 1 },
          { type: 'pane', id: newPaneId, flex: 1 },
        ],
      };
    }
    return root;
  }

  let matched = false;
  const newChildren: LayoutNode[] = [];

  for (const child of root.children) {
    if (child.type === 'pane' && child.id === targetPaneId) {
      matched = true;
      if (root.direction === direction) {
        newChildren.push({ type: 'pane', id: targetPaneId, flex: 1 });
        newChildren.push({ type: 'pane', id: newPaneId, flex: 1 });
      } else {
        newChildren.push({
          type: 'split',
          id: `split-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          direction,
          flex: child.flex || 1,
          children: [
            { type: 'pane', id: targetPaneId, flex: 1 },
            { type: 'pane', id: newPaneId, flex: 1 },
          ],
        });
      }
    } else if (child.type === 'split') {
      newChildren.push(splitNode(child, targetPaneId, direction, newPaneId));
    } else {
      newChildren.push(child);
    }
  }

  return {
    ...root,
    children: newChildren,
  };
}

export function removePaneNode(root: LayoutNode, paneId: PaneId): LayoutNode | null {
  if (root.type === 'pane') {
    return root.id === paneId ? null : root;
  }

  const newChildren: LayoutNode[] = [];
  for (const child of root.children) {
    const updated = removePaneNode(child, paneId);
    if (updated) {
      newChildren.push(updated);
    }
  }

  if (newChildren.length === 0) {
    return null;
  }

  if (newChildren.length === 1) {
    return newChildren[0];
  }

  return {
    ...root,
    children: newChildren,
  };
}

export interface TopRowLeaf {
  id: PaneId;
  flex?: number;
}

export function getTopRowLeaves(root: LayoutNode): TopRowLeaf[] {
  if (root.type === 'pane') {
    return [{ id: root.id, flex: root.flex || 1 }];
  }
  if (root.direction === 'horizontal') {
    return root.children.flatMap((child) => getTopRowLeaves(child));
  }
  // Vertical split: only the first child row touches the top
  if (root.children.length > 0) {
    return getTopRowLeaves(root.children[0]);
  }
  return [];
}

export function getTopRowLeafIds(root: LayoutNode): PaneId[] {
  return getTopRowLeaves(root).map((l) => l.id);
}
