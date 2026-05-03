import type { WidgetManifestEntry } from '../index.js';

export const mentionEntry: WidgetManifestEntry = {
  type: 'mention',
  category: 'display',
  description: 'Inline @-mention pill with optional hover card showing profile details.',
  props: {
    name: { type: 'string', required: true, description: 'Username (@ added automatically).' },
    displayName: { type: 'string', required: false, description: 'Full name shown in hover card.' },
    avatar: { type: 'string', required: false, description: 'Avatar URL.' },
    role: { type: 'string', required: false, description: 'User role in hover card.' },
    bio: { type: 'string', required: false, description: 'Bio text in hover card.' },
    href: { type: 'string', required: false, description: 'Profile link URL.' },
    plain: { type: 'boolean', required: false, description: 'Skip hover card; render plain pill only.' },
  },
  example: { type: 'mention', props: { name: 'alice', displayName: 'Alice Chen', role: 'Product Designer', href: 'https://example.com/alice' } },
};
