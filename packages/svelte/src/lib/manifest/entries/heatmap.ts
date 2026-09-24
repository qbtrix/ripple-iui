import type { WidgetManifestEntry } from '../index.js';

export const heatmapEntry: WidgetManifestEntry = {
  type: 'heatmap',
  category: 'data',
  description: 'Matrix heatmap of intensity across x/y categories. Use for correlation, activity calendars.',
  props: {
    cells: { type: 'Array<{ x: string | number; y: string | number; value: number }>', required: true, description: 'Cell data.' },
    xLabels: { type: '(string | number)[]', required: false, description: 'Explicit x-axis labels.' },
    yLabels: { type: '(string | number)[]', required: false, description: 'Explicit y-axis labels.' },
    height: { type: 'number', required: false, description: 'Height in px. Default 280.' },
    title: { type: 'string', required: false, description: 'Chart title.' },
    colorRange: { type: '[string, string]', required: false, description: 'Low-to-high gradient. Default ["#dbeafe", "#1d4ed8"].' },
    showLabels: { type: 'boolean', required: false, description: 'Show cell value labels.' },
  },
  example: {
    type: 'heatmap',
    props: {
      title: 'Engagement Matrix',
      cells: [
        { x: 'Mon', y: 'Week 1', value: 12 },
        { x: 'Tue', y: 'Week 1', value: 18 },
        { x: 'Mon', y: 'Week 2', value: 22 },
        { x: 'Tue', y: 'Week 2', value: 25 },
      ],
    },
  },
};
