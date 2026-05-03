import type { WidgetManifestEntry } from '../index.js';

export const separatorEntry: WidgetManifestEntry = {
  type: 'separator',
  category: 'layout',
  description: 'Visual divider line (horizontal or vertical) between content sections.',
  props: {
    orientation: { type: '"horizontal" | "vertical"', required: false, description: 'Direction. Default "horizontal".' },
  },
  example: {
    type: 'separator',
    props: { orientation: 'horizontal' },
  },
};
