// C4 Model diagram widget — the component, its data, live-state and semantic
// zoom types, the layout utilities, and the tree helpers hosts share with it
// (index an element tree, walk to an id, compose a code excerpt's side).

export { default as C4Diagram } from './C4Diagram.svelte';
export { computeElkLayout, getNodeType, isGroupNode } from './elk-layout.js';
export { childrenOf, indexTree, pathTo, codeView } from './semantic.js';
export type { C4Tree, CodeSide, CodeView } from './semantic.js';
export type {
  C4Kind,
  C4Status,
  C4Marker,
  C4Code,
  C4PortView,
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
