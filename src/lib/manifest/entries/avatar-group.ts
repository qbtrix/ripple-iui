import type { WidgetManifestEntry } from '../index.js';

export const avatarGroupEntry: WidgetManifestEntry = {
  type: 'avatar-group',
  category: 'composite',
  description: 'Group of avatar badges with overflow count. Shows up to `max` faces, then a "+N" pill.',
  props: {
    users: { type: 'Array<{ src?: string; alt?: string; fallback?: string }>', required: true, description: 'Avatars to display.' },
    max: { type: 'number', required: false, description: 'Max avatars before overflow. Default 4.' },
    size: { type: '"sm" | "md" | "lg"', required: false, description: 'Avatar size.' },
  },
  example: {
    type: 'avatar-group',
    props: {
      max: 3,
      size: 'md',
      users: [
        { src: 'https://example.com/avatar1.jpg', alt: 'Alice' },
        { src: 'https://example.com/avatar2.jpg', alt: 'Bob' },
        { fallback: 'CD', alt: 'Charlie' },
        { fallback: 'EF', alt: 'Eve' },
      ],
    },
  },
};
