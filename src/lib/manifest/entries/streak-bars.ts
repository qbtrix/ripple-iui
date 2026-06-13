// Manifest entry for the streak-bars widget (console telemetry pack, 2026-06-13).
import type { WidgetManifestEntry } from '../index.js';

export const streakBarsEntry: WidgetManifestEntry = {
  type: 'streak-bars',
  category: 'display',
  staticSafe: true,
  description:
    'A row of discrete segments colored per a values[] array (or a simple filled-count streak). Drives the amber "clean run" indicator. Pure CSS, SSR-safe.',
  props: {
    values: { type: 'Array<number | { intensity?: number; color?: string; on?: boolean }>', required: false, description: 'Explicit per-segment values/objects.' },
    count: { type: 'number', required: false, description: 'When `values` omitted, number of segments. Default 14.' },
    filled: { type: 'number', required: false, description: 'When using `count`, how many leading segments are lit. Default = count.' },
    color: { type: 'string', required: false, description: 'Base segment color. Default the accent (amber) token.' },
    height: { type: 'number', required: false, description: 'Segment height in px. Default 14.' },
    gap: { type: 'number', required: false, description: 'Gap in px. Default 3.' },
  },
  example: {
    type: 'streak-bars',
    props: { count: 12, filled: 12, color: '#E8852B' },
  },
};
