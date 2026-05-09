import type { ActionSpec } from './index.js';

/**
 * Grammar reference for every `EventAction` variant the dispatcher accepts.
 * Source-of-truth: `src/lib/schema/event-handler.ts`. Drift-tested in
 * `manifest.test.ts` — every `example` here must parse against the
 * live `EventHandler` zod schema.
 */
export const manifestActions: Record<string, ActionSpec> = {
  set: {
    description: "Assign `value` to the state path `target`. The most common action — use it to update any state field.",
    shape: {
      action: '"set"',
      target: 'string — state path, e.g. "modalOpen" or "user.name"',
      'value?': 'any — value to assign. Supports {state.x} expressions.',
    },
    example: { action: 'set', target: 'modalOpen', value: false },
  },

  toggle: {
    description: "Flip a boolean target, or toggle membership of `value` in an array target.",
    shape: {
      action: '"toggle"',
      target: 'string — state path. If boolean, value is inverted; if array, `value` is added or removed.',
      'value?': 'any — when target is an array, the membership toggle key.',
    },
    example: { action: 'toggle', target: 'expanded' },
  },

  push: {
    description: "Append `value` to the array at `target`. Creates the array if undefined.",
    shape: {
      action: '"push"',
      target: 'string — state path to an array.',
      'value?': 'any — item to append.',
    },
    example: { action: 'push', target: 'todos', value: { id: 1, text: 'New task', done: false } },
  },

  remove: {
    description: "Remove an item from the array at `target` — by `value` (equality match) or by `index`.",
    shape: {
      action: '"remove"',
      target: 'string — state path to an array.',
      'value?': 'any — first matching item is removed.',
      'index?': 'number — remove by position instead.',
    },
    example: { action: 'remove', target: 'todos', index: 0 },
  },
};
