// Manifest entry for the seismograph widget (console telemetry pack, 2026-06-13).
// Updated 2026-07-08 (docs): description trimmed under 200 chars (manifest.test limit).
import type { WidgetManifestEntry } from '../index.js';

export const seismographEntry: WidgetManifestEntry = {
  type: 'seismograph',
  category: 'data',
  staticSafe: false,
  description:
    'Scrolling live signal trace on a canvas via a rAF ring-buffer. `line` = oscilloscope trace, `bars` = histogram. Has a ● LIVE/REC indicator + readout. Paused on tab-hide; static under reduced-motion.',
  props: {
    variant: { type: '"line" | "bars"', required: false, description: 'line = oscilloscope trace, bars = histogram. Default line.' },
    live: { type: 'boolean', required: false, description: 'Animate live. When false, paints a single static frame. Default true.' },
    color: { type: 'string', required: false, description: 'Trace color. Default the primary token. Pass a CSS var or hex.' },
    label: { type: 'string', required: false, description: 'Caption (e.g. "GATE EVENTS · CH 01").' },
    readout: { type: 'string', required: false, description: 'Right-side readout (e.g. "12 evt/min").' },
    indicator: { type: 'boolean', required: false, description: 'Show the ● LIVE/REC pill. Defaults to the value of `live`.' },
    indicatorLabel: { type: 'string', required: false, description: 'Indicator text. Default "LIVE".' },
    height: { type: 'number', required: false, description: 'Canvas height in px. Default 96.' },
    samples: { type: 'number', required: false, description: 'Ring-buffer length. Default 160.' },
    seed: { type: 'number[]', required: false, description: 'Optional seed values (oldest → newest) to pre-fill the buffer.' },
  },
  example: {
    type: 'seismograph',
    props: { variant: 'line', live: true, color: '#2E6BFF', label: 'GATE EVENTS · CH 01', readout: '12 evt/min', indicatorLabel: 'LIVE' },
  },
};
