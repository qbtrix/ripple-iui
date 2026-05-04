import type { WidgetManifestEntry } from '../index.js';

export const appShellEntry: WidgetManifestEntry = {
  type: 'app-shell',
  category: 'layout',
  description: 'App layout container with optional topbar and sidebar slots plus main content. Use with sidebar.',
  props: {},
  example: {
    type: 'app-shell',
    props: {},
    children: [
      { type: 'text', props: { text: 'Main app content' } },
    ],
  },
};
