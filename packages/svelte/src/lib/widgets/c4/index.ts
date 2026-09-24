// C4 Model diagram widget — exports component, types, and layout utilities
// Modified: 2026-04-07 — Updated exports for SvelteFlow + ELK rewrite

export { default as C4Diagram } from './C4Diagram.svelte';
export { computeElkLayout, getNodeType, isGroupNode } from './elk-layout.js';
export type {
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
