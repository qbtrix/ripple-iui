import type { WidgetManifestEntry } from '../index.js';

export const workflowEntry: WidgetManifestEntry = {
  type: 'workflow',
  category: 'data',
  description: 'Interactive node-based workflow diagram with auto-layout, pan/zoom, and minimap.',
  props: {
    nodes: { type: 'Array<{ id: string; type?: string; label: string; icon?: string; status?: string; position?: { x: number; y: number } }>', required: true, description: 'Workflow nodes.' },
    edges: { type: 'Array<{ from: string; to: string; label?: string; animated?: boolean }>', required: true, description: 'Edges connecting nodes.' },
    title: { type: 'string', required: false, description: 'Title shown above canvas.' },
    interactive: { type: 'boolean', required: false, description: 'Enable pan/zoom/drag. Default true.' },
    minimap: { type: 'boolean', required: false, description: 'Show minimap.' },
    fitView: { type: 'boolean', required: false, description: 'Auto-fit nodes on render. Default true.' },
  },
  example: {
    type: 'workflow',
    props: {
      title: 'Payment Flow',
      interactive: true,
      minimap: true,
      nodes: [
        { id: '1', type: 'trigger', label: 'Start', icon: 'play', status: 'idle' },
        { id: '2', type: 'action', label: 'Process Payment', icon: 'credit-card', status: 'idle' },
        { id: '3', type: 'condition', label: 'Approved?', icon: 'check', status: 'idle' },
      ],
      edges: [
        { from: '1', to: '2' },
        { from: '2', to: '3' },
      ],
    },
  },
};
