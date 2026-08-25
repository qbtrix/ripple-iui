import type { WidgetManifestEntry } from '../index.js';

export const citationEntry: WidgetManifestEntry = {
  type: 'citation',
  category: 'research',
  description: 'Citation pill — inline reference to a source with optional superscript number.',
  props: {
    source: { type: 'string', required: true, description: 'Publisher name.' },
    color: { type: 'string', required: false, description: 'Accent color.' },
    favicon: { type: 'string', required: false, description: 'Favicon URL override.' },
    number: { type: 'number', required: false, description: 'Superscript citation number.' },
    url: { type: 'string', required: false, description: 'Link URL.' },
  },
  example: { type: 'citation', props: { source: 'Bloomberg', number: 1, url: 'https://bloomberg.com/article' } },
};
