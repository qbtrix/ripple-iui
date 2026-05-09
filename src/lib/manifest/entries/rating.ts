import type { WidgetManifestEntry } from '../index.js';

export const ratingEntry: WidgetManifestEntry = {
  type: 'rating',
  category: 'input',
  description: 'Star rating widget.',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path, e.g. "{state.rating}".' },
    value: { type: 'number', required: false, description: 'Current rating.' },
    max: { type: 'number', required: false, description: 'Maximum stars. Default 5.' },
    size: { type: '"sm" | "md" | "lg"', required: false, description: 'Star size.' },
    disabled: { type: 'boolean', required: false, description: 'Disable rating.' },
    showValue: { type: 'boolean', required: false, description: 'Show numeric value.' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired on rating change.' },
  },
  example: { type: 'rating', props: { label: 'Rate this product', max: 5, bind: '{state.productRating}', showValue: true } },
  pocket: {
    state: { productRating: 0, submitted: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'rating', props: { label: 'Rate this product', max: 5, showValue: true }, bind: 'state.productRating' },
        { type: 'text', props: { text: 'You rated: {state.productRating}/5' } },
        {
          type: 'button',
          props: { label: 'Submit rating', disabled: '{state.productRating == 0}' },
          on_click: [
            { action: 'set', target: 'submitted', value: true },
            { action: 'toast', message: 'Thanks for the {state.productRating}-star rating!', variant: 'success' },
          ],
        },
      ],
    },
  },
};
