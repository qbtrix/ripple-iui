// @file manifest/entries/todo-list.ts
// @description Manifest entry for the `todo-list` widget.
// @created 2026-05-31 — composite consumer widgets migration (ocean-flow port).
import type { WidgetManifestEntry } from '../index.js';

export const todoListEntry: WidgetManifestEntry = {
  type: 'todo-list',
  category: 'interactive',
  description:
    'Editable todo list: add, toggle, delete, and filter tasks. Two-way binds an array of {id,text,done} items via the default value/onchange surface.',
  props: {
    bind: { type: 'string', required: false, description: 'Two-way state path holding the item array, e.g. "{state.tasks}".' },
    value: { type: '{id,text,done}[]', required: false, description: 'Items when not bound.' },
    title: { type: 'string', required: false, description: 'Heading text. Default "Todo List".' },
    placeholder: { type: 'string', required: false, description: 'Add-input placeholder.' },
  },
  events: {
    on_change: { type: 'EventAction', required: false, description: 'Fired with the new item array when items change.' },
  },
  example: {
    type: 'todo-list',
    props: { title: 'My Tasks' },
    bind: 'state.tasks',
  },
  pocket: {
    state: {
      tasks: [
        { id: 't-1', text: 'Draft the proposal', done: false },
        { id: 't-2', text: 'Review the budget', done: true },
      ],
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'todo-list', props: { title: 'My Tasks' }, bind: 'state.tasks' },
      ],
    },
  },
};
