// C4 Model diagram widget types — data model for all 4 C4 levels
// Created: C4 diagram widget for Ripple UI library

export interface C4Person {
  id: string;
  name: string;
  description?: string;
  external?: boolean;
}

export interface C4System {
  id: string;
  name: string;
  description?: string;
  technology?: string;
  external?: boolean;
  containers?: C4Container[];
}

export interface C4Container {
  id: string;
  name: string;
  description?: string;
  technology?: string;
  type?: 'webapp' | 'api' | 'database' | 'queue' | 'filesystem' | 'mobile' | 'desktop';
  components?: C4Component[];
}

export interface C4Component {
  id: string;
  name: string;
  description?: string;
  technology?: string;
  type?: 'service' | 'controller' | 'repository' | 'model' | 'middleware';
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
