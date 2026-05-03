import type { WidgetManifestEntry } from '../index.js';

export const markdownEntry: WidgetManifestEntry = {
  type: 'markdown',
  category: 'display',
  description: 'Render markdown with GFM support (tables, strikethrough, autolinks, task lists).',
  props: {
    content: { type: 'string', required: false, description: 'Markdown source.' },
    text: { type: 'string', required: false, description: 'Alias for content.' },
    gfm: { type: 'boolean', required: false, description: 'Enable GitHub-Flavored Markdown. Default true.' },
  },
  example: { type: 'markdown', props: { content: '# Release notes\n\n- Added two-way bind for inputs\n- Fixed `oninput` event\n\n> See PR #26 for details.' } },
};
