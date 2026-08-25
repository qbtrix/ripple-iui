// Workflow widget types — input data formats for the Workflow widget

export type WorkflowNodeType = 'trigger' | 'action' | 'condition' | 'approval' | 'connector' | 'output';

export type WorkflowNodeStatus = 'idle' | 'running' | 'success' | 'error' | 'waiting';

export interface WorkflowNodeData {
  id: string;
  type: WorkflowNodeType;
  label: string;
  icon?: string;
  tool?: string;
  status?: WorkflowNodeStatus;
  position?: { x: number; y: number };
}

export interface WorkflowEdgeData {
  from: string;
  to: string;
  label?: string;
  animated?: boolean;
}
