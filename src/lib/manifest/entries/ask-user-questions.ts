import type { WidgetManifestEntry } from '../index.js';

export const askUserQuestionsEntry: WidgetManifestEntry = {
  type: 'ask-user-questions',
  category: 'composite',
  description:
    'Stepped multi-choice question flow with numbered options (1-9 shortcuts), single/multi-select, optional "Other" free-text, and skip/back. On complete, fires completeActions with a human-readable answer summary as the event value.',
  props: {
    questions: {
      type: 'Array<{ title: string; options: Array<{ title: string; description?: string }>; multiSelect?: boolean; allowOther?: boolean; otherPlaceholder?: string; skippable?: boolean; nextLabel?: string; layout?: "inline" | "stacked" }>',
      required: true,
      description:
        'Ordered questions. Each needs `title` + `options` (each option `title`, optional `description`). `multiSelect` shows a Continue button (single-select auto-advances). `allowOther` adds a free-text row. `layout` "stacked" puts description below title.',
    },
    currentIndex: {
      type: 'number',
      required: false,
      description: 'Bound active question index. Use top-level `bind` to two-way bind to a state path.',
    },
    answers: {
      type: 'Record<string, { questionId: string; selectedTitles: string[]; otherText?: string; skipped?: boolean }>',
      required: false,
      description: 'Bound answers map keyed by question id. Use top-level `bind` to persist answers to state.',
    },
    skipLabel: { type: 'string', required: false, description: 'Skip button label. Default "Skip".' },
    completeActions: {
      type: 'EventAction | EventAction[]',
      required: false,
      description:
        'Dispatched when the final question is answered. The formatted answer summary is passed as the event value — pair with `{ action: "emit", target: "chat.send" }` to send it as the next chat message (no explicit value needed).',
    },
    skipActions: {
      type: 'EventAction | EventAction[]',
      required: false,
      description: 'Dispatched when a question is skipped. Event value is the skipped question id.',
    },
    changeActions: {
      type: 'EventAction | EventAction[]',
      required: false,
      description: 'Dispatched on every answer mutation. Event value is the full answers map.',
    },
  },
  example: {
    type: 'ask-user-questions',
    props: {
      questions: [
        {
          title: 'Which coffee?',
          options: [
            { title: 'Espresso' },
            { title: 'Latte', description: 'Steamed milk' },
            { title: 'Cold brew' },
          ],
        },
        {
          title: 'Pick any toppings',
          multiSelect: true,
          allowOther: true,
          layout: 'stacked',
          options: [{ title: 'Cinnamon' }, { title: 'Vanilla syrup' }],
        },
      ],
      completeActions: { action: 'emit', target: 'chat.send' },
    },
  },
  pocket: {
    state: { coffeeIndex: 0, coffeeAnswers: {} },
    ui: {
      type: 'ask-user-questions',
      bind: 'state.coffeeIndex',
      props: {
        questions: [
          {
            title: 'Which coffee?',
            options: [{ title: 'Espresso' }, { title: 'Latte' }, { title: 'Cold brew' }],
          },
          {
            title: 'How many?',
            options: [{ title: 'One' }, { title: 'Two' }, { title: 'A whole pot' }],
          },
        ],
        completeActions: [{ action: 'toast', message: 'Order placed', variant: 'success' }],
      },
    },
  },
};
