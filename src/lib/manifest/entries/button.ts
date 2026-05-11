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
};
