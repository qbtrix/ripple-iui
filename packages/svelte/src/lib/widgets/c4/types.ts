// C4 Model diagram widget types — the data model for all 4 C4 levels, the
// SvelteFlow node payload, and the optional live-state shapes (status, crew
// markers) a host passes to show work happening on the map.
//
// Every live field is optional: a diagram without `kind`, `drillable`,
// `status` or `markers` renders exactly as it did before they existed.

/** The C4 abstraction an element is. When absent, the shape is inferred from
 *  which fields are present (see getNodeType) — the legacy behaviour. */
export type C4Kind = 'person' | 'system' | 'container' | 'component' | 'code';

/** Live state of an element. `changing` is the only one that moves (a calm
 *  pulse); the rest are static treatments. */
export type C4Status = 'changing' | 'changed' | 'landed' | 'drift' | 'failed';

/** A small dot on a node: who (or what) is there right now. `color` is any CSS
 *  colour, including a `var(--…)` token. */
export interface C4Marker {
  id: string;
  label: string;
  color: string;
}

/** An excerpt of a code element's file, shown in-map when the element is
 *  expanded (semantic zoom). Line numbers are the file's own. */
export interface C4Code {
  /** Line number of `before[0]` (or of `after[0]` for a new file). */
  startLine: number;
  /** The lines as they are, or were before the change. Empty for a new file. */
  before: string[];
  /** The replacement for `changed`, or the whole new file. Its presence turns
   *  on the Before/After toggle. */
  after?: string[];
  /** Inclusive [first, last] line numbers of `before` that `after` replaces. */
  changed?: [number, number];
  /** Highlighter hint (any truthy value colours the code). */
  language?: string;
}

/** One aggregated connection as a badge or chip shows it: the text, and the
 *  relationships behind it (names, not ids) for its hover list. */
export interface C4PortView {
  text: string;
  items: { from: string; to: string; label?: string }[];
}

/** Fields every element may carry on top of its own shape. */
interface C4ElementBase {
  /** Explicit C4 kind; overrides shape inference. */
  kind?: C4Kind;
  /** Show the drill affordance and route clicks to `ondrilldown`, even when
   *  the children are not part of this diagram. */
  drillable?: boolean;
  /** Nested elements of the next level down, any kind. In semantic zoom (the
   *  `expanded` prop) they are drawn inside this element when it is expanded;
   *  `containers` and `components` count as children too. */
  children?: C4Element[];
  /** For a `code` element: the excerpt its expanded panel shows. */
  code?: C4Code;
}

export interface C4Person extends C4ElementBase {
  id: string;
  name: string;
  description?: string;
  external?: boolean;
  tags?: string[];
}

export interface C4System extends C4ElementBase {
  id: string;
  name: string;
  description?: string;
  technology?: string;
  external?: boolean;
  /** Nested inside this element's boundary. With `kind`, any lower level can
   *  nest here (a container's components, a component's code). */
  containers?: C4Container[];
  tags?: string[];
}

export interface C4Container extends C4ElementBase {
  id: string;
  name: string;
  description?: string;
  technology?: string;
  external?: boolean;
  type?: 'webapp' | 'api' | 'database' | 'queue' | 'filesystem' | 'mobile' | 'desktop';
  components?: C4Component[];
  kb_article?: string;
  tags?: string[];
}

export interface C4Component extends C4ElementBase {
  id: string;
  name: string;
  description?: string;
  technology?: string;
  external?: boolean;
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
  /** Explicit C4 kind, when the element set one */
  kind?: C4Kind;
  /** Semantic zoom: chips on the scope boundary for crossings drawn further out. */
  ports?: C4PortView[];
  /** Semantic zoom: the excerpt an expanded code element's panel shows. */
  code?: C4Code;
  /** Original C4 element for click handlers */
  element: C4Element;
  /** Callback when element is clicked */
  onclick?: (element: C4Element) => void;
  /** Callback when drilldown is triggered */
  ondrilldown?: (element: C4Element, level: string) => void;
  /** Current diagram level — used to compute next level on drilldown */
  diagramLevel: 'context' | 'container' | 'component' | 'code';
}
