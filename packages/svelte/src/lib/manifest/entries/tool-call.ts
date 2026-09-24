// @file manifest/entries/tool-call.ts
// @description NEW (AI-native tier, 2026-06-24). Manifest entry for the
//   tool-call widget — an agent tool-invocation card with status, args, result.
import type { WidgetManifestEntry } from '../index.js';

export const toolCallEntry: WidgetManifestEntry = {
  type: 'tool-call',
  category: 'ai',
  description:
    'An agent tool-invocation card: tool name + icon, status badge (pending|running|success|error), collapsible args (JSON) and result. Collapsed on success, auto-expanded on error.',
  props: {
    name: { type: 'string', required: false, description: 'Tool name, e.g. "search_web".' },
    status: { type: 'string', required: false, description: "Invocation status: 'pending' | 'running' | 'success' | 'error'." },
    args: { type: 'object', required: false, description: 'Invocation arguments — rendered as formatted JSON.' },
    result: { type: 'any', required: false, description: 'Tool output. String → code/markdown; object → JSON.' },
    resultMarkdown: { type: 'boolean', required: false, description: 'Render a string result as markdown instead of a code block.' },
    durationMs: { type: 'number', required: false, description: 'Call duration in ms — shown as a compact label.' },
    time: { type: 'string', required: false, description: 'Relative time label, e.g. "2s ago". Display-only.' },
    error: { type: 'string', required: false, description: 'Error message — shown when status is "error".' },
    open: { type: 'boolean', required: false, description: 'Force the body open/closed. Omit to use the status-derived default.' },
  },
  example: {
    type: 'tool-call',
    props: {
      name: 'search_web',
      status: 'success',
      args: { query: 'ripple widget catalog' },
      result: 'Found 3 results.',
      durationMs: 420,
    },
  },
};
