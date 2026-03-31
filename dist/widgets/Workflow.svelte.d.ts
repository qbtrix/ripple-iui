import '@xyflow/svelte/dist/style.css';
import type { WorkflowNodeData, WorkflowEdgeData } from './workflow/types.js';
interface Props {
    nodes?: WorkflowNodeData[];
    edges?: WorkflowEdgeData[];
    title?: string;
    interactive?: boolean;
    minimap?: boolean;
    fitView?: boolean;
    class?: string;
}
declare const Workflow: import("svelte").Component<Props, {}, "">;
type Workflow = ReturnType<typeof Workflow>;
export default Workflow;
