// @file manifest/entries/approval-gate.ts
// @description NEW (AI-native tier, 2026-06-24). Manifest entry for the
//   approval-gate widget — the human-in-the-loop approve/deny/diff-review
//   organism. Composes Diff + ToolCall in its body; persists its decision.
import type { WidgetManifestEntry } from '../index.js';

export const approvalGateEntry: WidgetManifestEntry = {
  type: 'approval-gate',
  category: 'ai',
  // NB: ai-category.test.ts enforces description.length < 200.
  description:
    'Human-in-the-loop approval card: shows a proposed agent action with a risk badge, an optional diff and tool-call list, and Approve/Deny/Edit controls that resolve and persist the decision.',
  props: {
    title: { type: 'string', required: false, description: 'The proposed action, e.g. "Update 3 customer records".' },
    summary: { type: 'string', required: false, description: 'Optional one-line summary under the title.' },
    risk: { type: 'string', required: false, description: "Risk level: 'low' | 'medium' | 'high'. Drives the badge + tone." },
    decision: { type: 'string', required: false, description: "Decision state: 'pending' | 'approved' | 'denied'. Bind to persist it." },
    actionId: { type: 'string', required: false, description: 'Identifier for the proposed action, passed back to the host callbacks.' },
    diff: { type: 'object', required: false, description: 'Before/after payload ({ before, after, mode, layout, title }) rendered with the Diff widget.' },
    changes: { type: 'object', required: false, description: 'Alias for `diff`.' },
    toolCalls: { type: 'array', required: false, description: 'Proposed tool calls — each rendered with the ToolCall widget.' },
    body: { type: 'string', required: false, description: 'Markdown body shown alongside the structured parts.' },
    decidedBy: { type: 'string', required: false, description: 'Who decided — shown in the resolved stamp ("Approved by Ada").' },
    disabled: { type: 'boolean', required: false, description: 'Disable the controls (e.g. while the host persists the decision).' },
  },
  example: {
    type: 'approval-gate',
    props: {
      title: 'Update 3 customer records',
      summary: 'Agent proposes changing the tier for 3 accounts.',
      risk: 'high',
      actionId: 'act_482',
      diff: { before: 'tier: free\nseats: 5', after: 'tier: pro\nseats: 5', title: 'accounts.yaml' },
    },
  },
};
