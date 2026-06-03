import type { WidgetManifestEntry } from '../index.js';

export const timePickerEntry: WidgetManifestEntry = {
  type: 'time-picker',
  category: 'input',
  description: 'Time input with optional seconds and 12-hour format.',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path for time string (HH:MM).' },
    value: { type: 'string | null', required: false, description: 'Time as HH:MM or HH:MM:SS.' },
    showSeconds: { type: 'boolean', required: false, description: 'Show seconds input.' },
    use12Hour: { type: 'boolean', required: false, description: 'Use 12-hour format with AM/PM.' },
    disabled: { type: 'boolean', required: false, description: 'Disable picker.' },
    step: { type: 'number', required: false, description: 'Minute step increment. Default 1.' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired on time change.' },
  },
  example: { type: 'time-picker', props: { label: 'Meeting time', use12Hour: true, step: 15, bind: '{state.meetingTime}' } },
  pocket: {
    state: { meetingTime: '09:30' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'time-picker', props: { label: 'Meeting time', use12Hour: true, step: 15 }, bind: 'state.meetingTime' },
        { type: 'text', props: { text: 'Reminder set for {state.meetingTime}' } },
      ],
    },
  },
};
