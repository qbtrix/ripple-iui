import type { WidgetManifestEntry } from '../index.js';

export const buttonEntry: WidgetManifestEntry = {
  type: 'button',
  category: 'input',
  description:
    'Button with variant, size, loading. In a flow step, buttons that emit flow.next or flow.submit with value.selection render as choice cards; give each an icon and a description.',
  props: {
    label: { type: 'string', required: false, description: 'Button text.' },
    variant: { type: '"default" | "secondary" | "outline" | "ghost" | "link" | "destructive"', required: false, description: 'Style variant.' },
    size: { type: '"sm" | "md" | "lg" | "icon"', required: false, description: 'Button size.' },
    disabled: { type: 'boolean', required: false, description: 'Disable interaction.' },
    loading: { type: 'boolean', required: false, description: 'Show spinner and disable.' },
    type: { type: '"button" | "submit" | "reset"', required: false, description: 'HTML button type.' },
    icon: {
      type: '"work" | "school" | "creative" | "gaming" | "everyday" | "travel" | "light" | "home" | "budget" | "mid" | "premium" | "power" | "food" | "veg" | "meat" | "fish" | "sweet" | "coffee" | "drinks" | "culture" | "outdoors" | "relax" | "shopping" | "morning" | "afternoon" | "evening" | "night" | "solo" | "couple" | "family" | "group" | "days" | "quick"',
      required: false,
      description: 'Flow choice cards only: the tile icon. Any other name is ignored; without one the icon is guessed from the label, else none.',
    },
    description: { type: 'string', required: false, description: 'Flow choice cards only: a one-line hint under the label.' },
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
