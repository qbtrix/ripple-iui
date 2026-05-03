import type { WidgetManifestEntry } from '../index.js';

export const bulkActionBarEntry: WidgetManifestEntry = {
  type: 'bulk-action-bar',
  category: 'vertical',
  description: 'Context bar that appears when items are selected. Shows selection count + bulk action buttons.',
  props: {
    selectedCount: { type: 'number', required: true, description: 'Number of selected items (bar shows when > 0).' },
    noun: { type: 'string', required: false, description: 'Singular noun for selected items. Default "item".' },
    actions: { type: 'Array<{ id: string; label: string; icon?: string; variant?: "default" | "destructive" | "outline"; disabled?: boolean }>', required: true, description: 'Bulk action buttons.' },
    position: { type: '"inline" | "sticky-bottom"', required: false, description: 'Layout anchor.' },
  },
  example: {
    type: 'bulk-action-bar',
    props: {
      selectedCount: 5,
      noun: 'user',
      position: 'sticky-bottom',
      actions: [
        { id: 'assign', label: 'Assign role', icon: 'user-check' },
        { id: 'email', label: 'Send email', icon: 'mail' },
        { id: 'delete', label: 'Delete', icon: 'trash-2', variant: 'destructive' },
      ],
    },
  },
};
