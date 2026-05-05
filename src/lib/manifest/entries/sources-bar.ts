import type { WidgetManifestEntry } from '../index.js';

export const sourcesBarEntry: WidgetManifestEntry = {
  type: 'sources-bar',
  category: 'research',
  description: 'Horizontal bar with stacked source favicons, count label, and share/copy actions.',
  props: {
    sources: { type: 'Array<{ name: string; color?: string; favicon?: string; url?: string }>', required: true, description: 'Source list.' },
    count: { type: 'number', required: false, description: 'Override displayed count.' },
    label: { type: 'string', required: false, description: 'Label text. Default "sources".' },
    share: { type: 'boolean', required: false, description: 'Show share action.' },
    copy: { type: 'boolean', required: false, description: 'Show copy action.' },
  },
  example: {
    type: 'sources-bar',
    props: {
      sources: [
        { name: 'Reuters', url: 'https://reuters.com' },
        { name: 'AP News', url: 'https://apnews.com' },
        { name: 'Wall Street Journal', url: 'https://wsj.com' },
      ],
      share: true,
      copy: true,
    },
  },
};
