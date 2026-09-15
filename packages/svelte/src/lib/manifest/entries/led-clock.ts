// Manifest entry for the led-clock widget (console telemetry pack, 2026-06-13).
import type { WidgetManifestEntry } from '../index.js';

export const ledClockEntry: WidgetManifestEntry = {
  type: 'led-clock',
  category: 'display',
  staticSafe: true,
  description:
    'Dot-matrix LED readout. Renders digits/letters as a 5×7 lit-dot grid (unlit cells show as faint ghost dots). Live HH:MM clock when `time` is set; optional dim sub-readout (ms ticker).',
  props: {
    value: { type: 'string | number', required: false, description: 'Static text/number to render. Ignored when `time` is true.' },
    time: { type: 'boolean', required: false, description: 'Render a live clock that ticks every second.' },
    seconds: { type: 'boolean', required: false, description: 'Include seconds in the live clock (HH:MM:SS).' },
    sub: { type: 'string | number', required: false, description: 'Small dim sub-readout to the right of the matrix.' },
    subTick: { type: 'boolean', required: false, description: 'Auto-tick the sub-readout 00..99 (the ms counter).' },
    label: { type: 'string', required: false, description: 'Caption below the matrix.' },
    accent: { type: 'string', required: false, description: 'Lit-dot color. Default the foreground token. Pass a CSS var or hex.' },
    dot: { type: 'number', required: false, description: 'Dot diameter in px — drives overall size. Default 6.' },
  },
  example: {
    type: 'led-clock',
    props: { time: true, subTick: true, sub: '00', label: 'LOCAL TIME · NEW YORK', accent: '#EDEAE3', dot: 7 },
  },
};
