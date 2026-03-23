import type { UINode } from '../schema/index.js';
interface Props {
    /** The UI node to render */
    node: UINode;
    /** Additional context variables (from loops) */
    loopContext?: Record<string, unknown>;
}
declare const NodeRenderer: import("svelte").Component<Props, {}, "">;
type NodeRenderer = ReturnType<typeof NodeRenderer>;
export default NodeRenderer;
