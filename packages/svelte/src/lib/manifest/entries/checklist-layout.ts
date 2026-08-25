import type { WidgetManifestEntry } from '../index.js';

export const checklistLayoutEntry: WidgetManifestEntry = {
  type: 'checklist-layout',
  category: 'composite',
  description:
    'Gated checklist with owners, due dates, attachments, and blocked dependencies. Distinct from `steps` (visual indicator only). Use for onboarding, audits, QA gates.',
  props: {
    title: { type: 'string', required: false, description: 'Checklist title.' },
    description: { type: 'string', required: false, description: 'Checklist description.' },
    items: {
      type: 'Array<{ id: string; label: string; description?: string; state?: "pending" | "in-progress" | "done" | "blocked" | "skipped"; owner?: { id?: string; name: string; avatar?: string }; due?: string; overdue?: boolean; blockedBy?: string[]; attachments?: { name: string; url?: string }[]; actions?: EventAction | EventAction[]; toggleActions?: EventAction | EventAction[] }>',
      required: true,
      description:
        'Checklist items. Click row → `actions`; click checkbox → `toggleActions`. Two-way bind the array with `bind: "state.checklist"` (default `value`/`onchange` surface) so toggles persist reactively through state — toggling flips the item state optimistically and `toggleActions` still fires as a side-effect hook (API / audit). Blocked items (state `blocked` or non-empty `blockedBy`) cannot be marked done.',
    },
    groupBy: { type: '"none" | "state" | "owner"', required: false, description: 'Group items into sections. Default "none".' },
    showProgress: { type: 'boolean', required: false, description: 'Show the auto-computed progress bar in the header. Default true.' },
    progress: { type: 'number', required: false, description: 'Override the auto-computed progress (0–100).' },
    emptyText: { type: 'string', required: false, description: 'Text shown when items is empty.' },
  },
  example: {
    type: 'checklist-layout',
    props: {
      title: 'Customer onboarding',
      description: 'Tasks required before going live.',
      groupBy: 'state',
      items: [
        { id: 'sso', label: 'Configure SSO', state: 'done', owner: { name: 'Alex Liu' }, due: 'May 1' },
        { id: 'data', label: 'Import historical data', state: 'in-progress', owner: { name: 'Sam Patel' }, due: 'May 8', attachments: [{ name: 'data.csv' }] },
        { id: 'roles', label: 'Map user roles', state: 'pending', owner: { name: 'Jess Tan' }, due: 'May 10' },
        { id: 'training', label: 'Run admin training', state: 'blocked', blockedBy: ['roles'], due: 'May 14' },
        { id: 'review', label: 'Final QA review', state: 'pending', due: 'May 16', overdue: false },
      ],
    },
  },
};
