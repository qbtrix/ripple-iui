import type { WidgetManifestEntry } from '../index.js';

export const c4Entry: WidgetManifestEntry = {
  type: 'c4',
  category: 'data',
  description: 'C4 architecture diagram (Context / Container / Component / Code) with ELK auto-layout and drill-down.',
  props: {
    diagram: { type: '{ title: string; level: "context" | "container" | "component" | "code"; description?: string; elements: Array<{ id: string; name: string; type: string; description?: string; external?: boolean }>; relationships: Array<{ from: string; to: string; label?: string }> }', required: true, description: 'C4 diagram definition.' },
  },
  example: {
    type: 'c4',
    props: {
      diagram: {
        title: 'E-Banking System',
        level: 'context',
        description: 'System context for the e-banking platform.',
        elements: [
          { id: 'user', name: 'User', type: 'person', description: 'A customer.' },
          { id: 'system', name: 'E-Banking System', type: 'system', description: 'Account management.' },
          { id: 'bank', name: 'Bank', type: 'system', external: true, description: 'Upstream banking system.' },
        ],
        relationships: [
          { from: 'user', to: 'system', label: 'Uses' },
          { from: 'system', to: 'bank', label: 'API calls' },
        ],
      },
    },
  },
};
