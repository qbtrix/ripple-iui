// C4 Model diagram widget — the component, its data and live-state types, and
// the layout utilities.

export { default as C4Diagram } from './C4Diagram.svelte';
export { computeElkLayout, getNodeType, isGroupNode } from './elk-layout.js';
export type {
  C4Kind,
  C4Status,
  C4Marker,
  C4Person,
  C4System,
  C4Container,
  C4Component,
  C4Relationship,
  C4Element,
  C4Diagram as C4DiagramData,
  C4NodeData,
  LayoutNode,
} from './types.js';
