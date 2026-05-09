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

  api: {
    description: "Host-delegated HTTP call. The host performs the request; the response is written to `response_key` (if given) and `on_success` runs. On failure `on_error` runs and the error is exposed at state path `_flow_error`.",
    shape: {
      action: '"api"',
      url: 'string — endpoint. Supports {state.x} interpolation.',
      'method?': '"GET" | "POST" | "PUT" | "DELETE" | "PATCH" — default GET',
      'body?': 'object — request body. Values support {state.x} expressions.',
      'headers?': 'Record<string, string>',
      'response_key?': 'string — state path to write the response into.',
      'on_success?': 'EventHandler[] — runs after a successful response.',
      'on_error?': 'EventHandler[] — runs on host-reported failure.',
    },
    example: {
      action: 'api',
      method: 'POST',
      url: '/api/todos',
      body: { text: '{state.draft}' },
      response_key: 'newTodo',
      on_success: [
        { action: 'push', target: 'todos', value: '{state.newTodo}' },
        { action: 'set', target: 'draft', value: '' },
        { action: 'toast', message: 'Added', variant: 'success' },
      ],
      on_error: [
        { action: 'toast', message: 'Could not save', variant: 'error' },
      ],
    },
  },

  flow: {
    description: "Run a list of handlers sequentially. If any step throws `FlowAbortError` (e.g. failed `validate`), `on_error` runs.",
    shape: {
      action: '"flow"',
      steps: 'EventHandler[] — sequential handlers.',
      'on_error?': 'EventHandler[] — runs on FlowAbortError.',
    },
    example: {
      action: 'flow',
      steps: [
        { action: 'set', target: 'saving', value: true },
        { action: 'delay', ms: 400 },
        { action: 'set', target: 'saving', value: false },
        { action: 'toast', message: 'Done', variant: 'success' },
      ],
    },
  },

  branch: {
    description: "Evaluate `if` and run `then` or `else`. The condition is a Ripple expression string (e.g. \"state.count > 5\").",
    shape: {
      action: '"branch"',
      if: 'string — Ripple expression evaluated as boolean.',
      then: 'EventHandler[] — runs when truthy.',
      'else?': 'EventHandler[] — runs when falsy.',
    },
    example: {
      action: 'branch',
      if: 'state.user.role == "admin"',
      then: [{ action: 'navigate', url: '/admin' }],
      else: [{ action: 'toast', message: 'Admins only', variant: 'warning' }],
    },
  },

  confirm: {
    description: "Show the ConfirmDialog, suspend the flow, and run `on_confirm` or `on_cancel` based on the user's choice.",
    shape: {
      action: '"confirm"',
      message: 'string — body shown in the dialog.',
      'title?': 'string',
      'confirm_label?': 'string — default "Confirm".',
      'cancel_label?': 'string — default "Cancel".',
      on_confirm: 'EventHandler[]',
      'on_cancel?': 'EventHandler[]',
    },
    example: {
      action: 'confirm',
      title: 'Delete project?',
      message: 'This cannot be undone.',
      confirm_label: 'Delete',
      on_confirm: [
        { action: 'api', method: 'DELETE', url: '/api/projects/{state.projectId}' },
        { action: 'navigate', url: '/projects' },
      ],
    },
  },

  validate: {
    description: "If `condition` is falsy, show a toast and abort the enclosing flow (FlowAbortError). Silent on pass.",
    shape: {
      action: '"validate"',
      condition: 'string — Ripple expression. Falsy aborts the flow.',
      message: 'string — toast shown on failure.',
      'variant?': '"default" | "success" | "error" | "warning" | "info"',
    },
    example: {
      action: 'validate',
      condition: 'state.email != ""',
      message: 'Email required',
      variant: 'error',
    },
  },

  delay: {
    description: "Pause the flow for the given number of milliseconds. Useful for optimistic-UI demos and animations.",
    shape: {
      action: '"delay"',
      ms: 'number — non-negative.',
    },
    example: { action: 'delay', ms: 300 },
  },

  invoke: {
    description: "Call a registered widget method by widget id. Used for imperative actions on widgets that expose them (e.g. focusing an input).",
    shape: {
      action: '"invoke"',
      target: 'string — widget id.',
      method: 'string — registered method name.',
      'args?': 'any[]',
    },
    example: { action: 'invoke', target: 'searchInput', method: 'focus' },
  },
};
