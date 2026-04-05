// C4 Model diagram widget — exports component, types, and layout utilities
// Created: C4 diagram widget registration for Ripple UI library

export { default as C4Diagram } from './C4Diagram.svelte';
export { autoLayout } from './layout.js';
export type {
  C4Person,
  C4System,
  C4Container,
  C4Component,
  C4Relationship,
  C4Element,
  C4Diagram as C4DiagramData,
  LayoutNode,
} from './types.js';
