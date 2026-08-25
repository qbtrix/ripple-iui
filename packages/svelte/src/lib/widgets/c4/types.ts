// C4 Model diagram widget types — data model for all 4 C4 levels
// Modified: 2026-04-07 — Extended with kb_article, tags fields; added SvelteFlow-compatible node data types

export interface C4Person {
  id: string;
  name: string;
  description?: string;
  external?: boolean;
  tags?: string[];
}

export interface C4System {
  id: string;
  name: string;
  description?: string;
  technology?: string;
  external?: boolean;
  containers?: C4Container[];
  tags?: string[];
}

export interface C4Container {
  id: string;
  name: string;
  description?: string;
  technology?: string;
  type?: 'webapp' | 'api' | 'database' | 'queue' | 'filesystem' | 'mobile' | 'desktop';
  components?: C4Component[];
  kb_article?: string;
  tags?: string[];
}

export interface C4Component {
  id: string;
  name: string;
  description?: string;
  technology?: string;
  type?: 'service' | 'controller' | 'repository' | 'model' | 'middleware';
  kb_article?: string;
  tags?: string[];
}

export interface C4Relationship {
  from: string;
  to: string;
  label?: string;
  technology?: string;
  style?: 'sync' | 'async' | 'event';
}

export type C4Element = C4Person | C4System | C4Container | C4Component;

export interface C4Diagram {
  level: 'context' | 'container' | 'component' | 'code';
  title: string;
  description?: string;
  elements: C4Element[];
  relationships: C4Relationship[];
}

/** Internal layout position computed by the layout engine */
export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Node data payload passed into each SvelteFlow custom node component.
 * These are set on node.data when converting C4Diagram → SvelteFlow nodes.
 */
export interface C4NodeData {
  /** Display name */
  name: string;
  /** Subtitle / description text */
  description?: string;
  /** Technology badge text, e.g. "PostgreSQL" */
  technology?: string;
  /** Whether the element is an external actor/system */
  external?: boolean;
  /** Container/component sub-type (database, queue, webapp, …) */
  subtype?: string;
  /** True when element has drillable children */
  drillable?: boolean;
  /** Link to wiki / KB article */
  kb_article?: string;
  /** Tags for filtering */
  tags?: string[];
  /** Original C4 element for click handlers */
  element: C4Element;
  /** Callback when element is clicked */
  onclick?: (element: C4Element) => void;
  /** Callback when drilldown is triggered */
  ondrilldown?: (element: C4Element, level: string) => void;
  /** Current diagram level — used to compute next level on drilldown */
  diagramLevel: 'context' | 'container' | 'component' | 'code';
}
