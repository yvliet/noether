/**
 * @module CanvasPluginTypes
 * @description
 * Domain models and data structures for the Infinite Canvas extension.
 * Kept strictly within the Canvas plugin directory to prevent type leakage into Noether native core.
 */

export interface CanvasNode {
  id: string;
  board_id: string;
  type: 'note' | 'text' | 'link';
  x: number;
  y: number;
  width: number;
  height: number;
  document_id?: string;
  text_content?: string;
  color?: string; // hex or color badge
  url?: string;
}

export type CanvasNodeSide = 'top' | 'right' | 'bottom' | 'left';

export type CanvasEdgeDirection = 'nondirectional' | 'unidirectional' | 'bidirectional';

export interface CanvasEdge {
  id: string;
  board_id: string;
  from_node_id: string;
  from_side?: CanvasNodeSide;
  to_node_id: string;
  to_side?: CanvasNodeSide;
  label?: string;
  color?: string;
  direction?: CanvasEdgeDirection;
}
