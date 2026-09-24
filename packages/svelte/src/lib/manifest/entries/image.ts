import type { WidgetManifestEntry } from '../index.js';

export const imageEntry: WidgetManifestEntry = {
  type: 'image',
  category: 'display',
  description: 'Image with object-fit, rounding, and width/height controls.',
  props: {
    src: { type: 'string', required: false, description: 'Image source URL.' },
    alt: { type: 'string', required: false, description: 'Alt text.' },
    width: { type: 'number | string', required: false, description: 'Width (px or CSS value).' },
    height: { type: 'number | string', required: false, description: 'Height (px or CSS value).' },
    fit: { type: '"contain" | "cover" | "fill" | "none" | "scale-down"', required: false, description: 'CSS object-fit value.' },
    rounded: { type: '"none" | "sm" | "md" | "lg" | "xl" | "full"', required: false, description: 'Border radius preset.' },
  },
  example: { type: 'image', props: { src: 'https://example.com/photo.jpg', alt: 'Scenic view', width: 200, height: 150, fit: 'cover', rounded: 'md' } },
};
