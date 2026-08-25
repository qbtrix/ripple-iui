import type { WidgetManifestEntry } from '../index.js';

export const switchEntry: WidgetManifestEntry = {
  type: 'switch',
  category: 'input',
  description: 'Toggle switch with optional label.',
  props: {
    label: { type: 'string', required: false, description: 'Label shown next to switch.' },
    bind: { type: 'string', required: false, description: 'Two-way state path, e.g. "{state.enabled}".' },
    checked: { type: 'boolean', required: false, description: 'On state.' },
    disabled: { type: 'boolean', required: false, description: 'Disable switch.' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired on toggle.' },
  },
  example: { type: 'switch', props: { label: 'Enable notifications', bind: '{state.notificationsEnabled}' } },
  pocket: {
    state: { notificationsEnabled: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'switch', props: { label: 'Enable notifications' }, bind: 'state.notificationsEnabled' },
        {
          type: 'alert',
          show: '{state.notificationsEnabled}',
          props: { variant: 'info', title: 'Notifications on', description: 'You will receive desktop alerts.' },
        },
      ],
    },
  },
};
