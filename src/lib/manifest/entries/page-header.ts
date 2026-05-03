import type { WidgetManifestEntry } from '../index.js';

export const pageHeaderEntry: WidgetManifestEntry = {
  type: 'page-header',
  category: 'layout',
  description: 'Page or section header with title, subtitle, eyebrow text, and right-aligned actions.',
  props: {
    title: { type: 'string', required: true, description: 'Header title.' },
    subtitle: { type: 'string', required: false, description: 'Subtitle text.' },
    eyebrow: { type: 'string', required: false, description: 'Small uppercase eyebrow above title.' },
  },
  example: {
    type: 'page-header',
    props: { title: 'Q2 Performance', subtitle: 'Apr 1 — Jun 30', eyebrow: 'Sales' },
  },
};
