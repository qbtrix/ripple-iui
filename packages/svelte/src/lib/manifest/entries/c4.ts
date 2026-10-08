import type { WidgetManifestEntry } from '../index.js';

export const c4Entry: WidgetManifestEntry = {
  type: 'c4',
  category: 'data',
  description: 'C4 architecture diagram (Context / Container / Component / Code) with ELK auto-layout, drill-down, live status rings and an optional in-place zoom down to code.',
  props: {
    diagram: {
      type: '{ title: string; level: "context" | "container" | "component" | "code"; description?: string; elements: Array<{ id: string; name: string; kind?: "person" | "system" | "container" | "component" | "code"; type?: string; description?: string; technology?: string; external?: boolean; drillable?: boolean; children?: Element[]; code?: { startLine: number; before: string[]; after?: string[]; changed?: [number, number]; language?: string } }>; relationships: Array<{ from: string; to: string; label?: string; technology?: string; style?: "sync" | "async" | "event" }> }',
      required: true,
      description: 'C4 diagram definition. `kind` sets the shape; without it the shape is inferred from the fields present. type "database" or "queue" draws those shapes. An empty title hides the header.',
    },
    status: {
      type: 'Record<string, "changing" | "changed" | "landed" | "drift" | "failed" | "planned">',
      required: false,
      description: 'Live state per element id, drawn as a ring and listed in the legend. "planned" is a dashed blueprint for something not built yet.',
    },
    markers: {
      type: 'Record<string, Array<{ id: string; label: string; color: string }>>',
      required: false,
      description: 'Dots per element id: who or what is working there. color is any CSS colour or var(--token).',
    },
    focusId: { type: 'string', required: false, description: 'Element the camera frames while follow is true.' },
    follow: { type: 'boolean', required: false, description: 'Keep the camera on focusId.' },
    selectedId: { type: 'string', required: false, description: 'Controlled selection. Leave unset to let clicks select.' },
    expanded: {
      type: 'string[]',
      required: false,
      description: 'Element ids drawn open on one canvas (semantic zoom). Passing it, even empty, turns the mode on; a code element with `code` opens as a code panel.',
    },
    scopeId: { type: 'string', required: false, description: 'Semantic zoom: the element being looked inside; everything outside it is ghosted.' },
  },
  example: {
    type: 'c4',
    props: {
      diagram: {
        title: 'E-Banking System',
        level: 'context',
        description: 'System context for the e-banking platform.',
        elements: [
          { id: 'user', name: 'User', kind: 'person', description: 'A customer.' },
          { id: 'system', name: 'E-Banking System', kind: 'system', description: 'Account management.' },
          { id: 'bank', name: 'Bank', kind: 'system', external: true, description: 'Upstream banking system.' },
        ],
        relationships: [
          { from: 'user', to: 'system', label: 'Uses' },
          { from: 'system', to: 'bank', label: 'API calls' },
        ],
      },
    },
  },
};
