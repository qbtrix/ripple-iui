import type { WidgetManifestEntry } from '../index.js';

export const colorPickerEntry: WidgetManifestEntry = {
  type: 'color-picker',
  category: 'input',
  description: 'Color picker with preset palette and free-form hex input.',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path for hex color.' },
    value: { type: 'string', required: false, description: 'Hex color string.' },
    presets: { type: 'string[]', required: false, description: 'Preset hex colors.' },
    showInput: { type: 'boolean', required: false, description: 'Show hex text input.' },
    disabled: { type: 'boolean', required: false, description: 'Disable picker.' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired on color change.' },
  },
  example: { type: 'color-picker', props: { label: 'Theme color', value: '#3b82f6', showInput: true, bind: '{state.themeColor}' } },
  pocket: {
    state: { themeColor: '#3b82f6' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'color-picker', props: { label: 'Theme color', showInput: true, presets: ['#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444'] }, bind: 'state.themeColor' },
        {
          type: 'card',
          style: { 'background-color': '{state.themeColor}', height: '48px' },
          props: { padding: 'sm' },
          children: [
            { type: 'text', props: { text: 'Preview: {state.themeColor}' } },
          ],
        },
      ],
    },
  },
};
