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

  open: {
    description: "Set the target state path to `true`. Idiomatic shortcut for opening a modal or dialog whose `value` is bound to that path.",
    shape: {
      action: '"open"',
      target: 'string — state path that controls the modal/dialog open state.',
    },
    example: { action: 'open', target: 'confirmDeleteOpen' },
  },

  navigate: {
    description: "Host-delegated URL change. The host's `onEvent` callback performs the navigation.",
    shape: {
      action: '"navigate"',
      url: 'string — destination URL. Supports {state.x} interpolation.',
    },
    example: { action: 'navigate', url: '/projects/{state.selectedId}' },
  },

  toast: {
    description: "Show a toast notification. Use after `set` / `api` to give the user feedback.",
    shape: {
      action: '"toast"',
      message: 'string — toast body. Supports {state.x} interpolation.',
      'variant?': '"default" | "success" | "error" | "warning" | "info"',
    },
    example: { action: 'toast', message: 'Saved', variant: 'success' },
  },

  emit: {
    description: "Emit a custom event up to the host. Use to hand control back to the host pipeline (e.g. \"submit complete, take it from here\").",
    shape: {
      action: '"emit"',
      'target?': 'string — event name.',
      'value?': 'any — event payload.',
    },
    example: { action: 'emit', target: 'submitted', value: '{state.formData}' },
  },

  pin: {
    description: "Host-delegated bookmark/pin operation. The host implements the persistence.",
    shape: {
      action: '"pin"',
      'target?': 'string — what is being pinned.',
      'value?': 'any — payload describing the pinned item.',
    },
    example: { action: 'pin', target: 'project', value: '{state.projectId}' },
  },

  unpin: {
    description: "Inverse of `pin`. Host-delegated bookmark removal.",
    shape: {
      action: '"unpin"',
      'target?': 'string — what is being unpinned.',
      'value?': 'any',
    },
    example: { action: 'unpin', target: 'project', value: '{state.projectId}' },
  },
};
