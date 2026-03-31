// Auto-layout utility for workflow nodes — BFS-based left-to-right positioning
const H_SPACING = 200;
const V_SPACING = 80;
/**
 * Compute positions for nodes that don't have explicit positions.
 * Uses BFS from root nodes (nodes with no incoming edges) to assign
 * depth-based x coordinates and index-based y coordinates.
 */
export function autoLayout(nodes, edges) {
    const positions = new Map();
    if (nodes.length === 0)
        return positions;
    // Build adjacency and incoming-edge sets
    const children = new Map();
    const incoming = new Set();
    for (const node of nodes) {
        children.set(node.id, []);
    }
    for (const edge of edges) {
        const list = children.get(edge.from);
        if (list)
            list.push(edge.to);
        incoming.add(edge.to);
    }
    // Find root nodes (no incoming edges)
    const roots = nodes.filter((n) => !incoming.has(n.id)).map((n) => n.id);
    // If no roots found (cycle), start from first node
    if (roots.length === 0 && nodes.length > 0) {
        roots.push(nodes[0].id);
    }
    // BFS to assign depth levels
    const depth = new Map();
    const queue = [...roots];
    for (const r of roots) {
        depth.set(r, 0);
    }
    while (queue.length > 0) {
        const current = queue.shift();
        const currentDepth = depth.get(current);
        const kids = children.get(current) ?? [];
        for (const kid of kids) {
            const existingDepth = depth.get(kid);
            // Always take the maximum depth (longest path) for better layout
            if (existingDepth === undefined || currentDepth + 1 > existingDepth) {
                depth.set(kid, currentDepth + 1);
                queue.push(kid);
            }
        }
    }
    // Handle disconnected nodes — assign them to depth 0
    for (const node of nodes) {
        if (!depth.has(node.id)) {
            depth.set(node.id, 0);
        }
    }
    // Group nodes by depth level
    const levels = new Map();
    for (const [nodeId, d] of depth) {
        const list = levels.get(d) ?? [];
        list.push(nodeId);
        levels.set(d, list);
    }
    // Assign positions: x based on depth, y based on index within level
    for (const [d, nodeIds] of levels) {
        // Center the nodes vertically around y=0
        const totalHeight = (nodeIds.length - 1) * V_SPACING;
        const startY = -totalHeight / 2;
        for (let i = 0; i < nodeIds.length; i++) {
            positions.set(nodeIds[i], {
                x: d * H_SPACING,
                y: startY + i * V_SPACING,
            });
        }
    }
    return positions;
}
