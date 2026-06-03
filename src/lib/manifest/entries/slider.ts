import type { WidgetManifestEntry } from '../index.js';

export const sliderEntry: WidgetManifestEntry = {
  type: 'slider',
  category: 'input',
  description: 'Range slider with optional label and value display.',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path, e.g. "{state.volume}".' },
    value: { type: 'number', required: false, description: 'Current value.' },
    min: { type: 'number', required: false, description: 'Minimum. Default 0.' },
    max: { type: 'number', required: false, description: 'Maximum. Default 100.' },
    step: { type: 'number', required: false, description: 'Step increment. Default 1.' },
    disabled: { type: 'boolean', required: false, description: 'Disable slider.' },
    showValue: { type: 'boolean', required: false, description: 'Show numeric value badge.' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired on value change.' },
  },
  example: { type: 'slider', props: { label: 'Volume', min: 0, max: 100, step: 1, bind: '{state.volume}', showValue: true } },
  pocket: {
    state: { volume: 50 },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'slider', props: { label: 'Volume', min: 0, max: 100, step: 1 }, bind: 'state.volume' },
        { type: 'text', props: { text: 'Volume: {state.volume}%' } },
      ],
    },
  },
};
