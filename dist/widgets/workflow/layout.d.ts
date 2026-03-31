import type { WorkflowNodeData, WorkflowEdgeData } from './types.js';
/**
 * Compute positions for nodes that don't have explicit positions.
 * Uses BFS from root nodes (nodes with no incoming edges) to assign
 * depth-based x coordinates and index-based y coordinates.
 */
export declare function autoLayout(nodes: WorkflowNodeData[], edges: WorkflowEdgeData[]): Map<string, {
    x: number;
    y: number;
}>;
