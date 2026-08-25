import type { WidgetManifestEntry } from '../index.js';

export const avatarEntry: WidgetManifestEntry = {
  type: 'avatar',
  category: 'display',
  description: 'Circular avatar with image fallback to initials.',
  props: {
    src: { type: 'string', required: false, description: 'Image source URL.' },
    alt: { type: 'string', required: false, description: 'Alt text.' },
    fallback: { type: 'string', required: false, description: 'Fallback initials shown when image is missing.' },
  },
  example: { type: 'avatar', props: { src: 'https://example.com/user.jpg', alt: 'Jane Doe', fallback: 'JD' } },
};
