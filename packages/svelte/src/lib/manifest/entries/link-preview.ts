import type { WidgetManifestEntry } from '../index.js';

export const linkPreviewEntry: WidgetManifestEntry = {
  type: 'link-preview',
  category: 'display',
  description: 'Rich link card with title, description, image, and favicon.',
  props: {
    url: { type: 'string', required: true, description: 'Link URL.' },
    title: { type: 'string', required: false, description: 'Page title.' },
    description: { type: 'string', required: false, description: 'Page description.' },
    image: { type: 'string', required: false, description: 'Preview image URL.' },
    domain: { type: 'string', required: false, description: 'Custom domain label.' },
    favicon: { type: 'string', required: false, description: 'Favicon URL.' },
    layout: { type: '"horizontal" | "vertical"', required: false, description: 'Image position.' },
    newTab: { type: 'boolean', required: false, description: 'Open in new tab. Default true.' },
  },
  example: { type: 'link-preview', props: { url: 'https://svelte.dev', title: 'Svelte', description: 'Cybernetically enhanced web apps.', domain: 'svelte.dev', layout: 'horizontal' } },
};
