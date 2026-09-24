import type { WidgetManifestEntry } from '../index.js';

export const emptyStateEntry: WidgetManifestEntry = {
  type: 'empty-state',
  category: 'display',
  description: 'Empty state with icon (inbox/search/file/error), title, and description.',
  props: {
    title: { type: 'string', required: true, description: 'Title text.' },
    description: { type: 'string', required: false, description: 'Description text.' },
    icon: { type: '"inbox" | "search" | "file" | "error"', required: false, description: 'Icon preset.' },
  },
  example: { type: 'empty-state', props: { title: 'No results', description: 'Try adjusting your search filters', icon: 'search' } },
};
