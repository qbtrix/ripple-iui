// @file manifest/entries/timer.ts
// @description Manifest entry for the `timer` widget.
// @created 2026-05-31 — composite consumer widgets migration (ocean-flow port).
import type { WidgetManifestEntry } from '../index.js';

export const timerEntry: WidgetManifestEntry = {
  type: 'timer',
  category: 'interactive',
  description:
    'Pomodoro-style countdown timer with start, pause, reset, a progress bar, and duration presets. Fires on_complete when it reaches zero.',
  props: {
    duration: { type: 'number', required: false, description: 'Duration in minutes. Default 25.' },
    label: { type: 'string', required: false, description: 'Label above the countdown.' },
    presets: { type: 'number[]', required: false, description: 'Quick-pick durations in minutes. Default [5,15,25,45].' },
  },
  events: {
    on_complete: { type: 'EventAction', required: false, description: 'Fired when the countdown reaches zero.' },
  },
  example: {
    type: 'timer',
    props: { duration: 25, label: 'Focus Timer', presets: [5, 15, 25, 45] },
  },
};
