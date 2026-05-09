import type { WidgetManifestEntry } from '../index.js';

export const buttonEntry: WidgetManifestEntry = {
  type: 'button',
  category: 'input',
  description: 'Button with variant, size, and loading states. Wire to actions via on_click.',
  props: {
    label: { type: 'string', required: false, description: 'Button text.' },
    variant: { type: '"default" | "secondary" | "outline" | "ghost" | "link" | "destructive"', required: false, description: 'Style variant.' },
    size: { type: '"sm" | "md" | "lg" | "icon"', required: false, description: 'Button size.' },
    disabled: { type: 'boolean', required: false, description: 'Disable interaction.' },
    loading: { type: 'boolean', required: false, description: 'Show spinner and disable.' },
    type: { type: '"button" | "submit" | "reset"', required: false, description: 'HTML button type.' },
  },
  events: {
    on_click: { type: 'EventAction', required: false, description: 'Action fired on click.' },
  },
  example: { type: 'button', props: { label: 'Save changes', variant: 'default', size: 'md', type: 'submit' } },
  pocket: {
    state: { saving: false, savedCount: 0 },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px', align: 'start' },
      children: [
        {
          type: 'button',
          props: { label: '{state.saving ? "Saving…" : "Save changes"}', loading: '{state.saving}' },
          on_click: {
            action: 'flow',
            steps: [
              { action: 'set', target: 'saving', value: true },
              { action: 'delay', ms: 600 },
              { action: 'set', target: 'saving', value: false },
              { action: 'set', target: 'savedCount', value: '{state.savedCount + 1}' },
              { action: 'toast', message: 'Saved', variant: 'success' },
            ],
          },
        },
        { type: 'text', props: { text: 'Saved {state.savedCount} times' } },
      ],
    },
  },
};
